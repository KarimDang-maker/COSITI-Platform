package cm.cositi.api.droits.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.Pack;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.droits.dto.PeriodeDroitsDto;
import cm.cositi.api.droits.dto.SituationDroitsDto;
import cm.cositi.api.droits.entite.PeriodeDroits;
import cm.cositi.api.droits.entite.StatutPeriode;
import cm.cositi.api.droits.repository.PeriodeDroitsRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Module le plus critique du projet (docs/02_CLASSES_ET_METHODES.md §5) — voir {@code ServiceCalculDroits}
 * pour les principes obligatoires. Utilise {@link JdbcTemplate} pour lire {@code affectation_paiement}/
 * {@code paiement} (module {@code cotisation}) plutôt que d'importer ses entités/repositories JPA : le module
 * {@code cotisation} dépend déjà de {@code ServiceCalculDroits} (appel dans {@code ServicePaiementImpl.valider}),
 * une dépendance Java dans l'autre sens créerait un cycle de paquetages.
 */
@Service
public class ServiceCalculDroitsImpl implements ServiceCalculDroits {

    private static final Logger LOG = LoggerFactory.getLogger(ServiceCalculDroitsImpl.class);
    private static final String CLE_PARAMETRE_SURPAIEMENT = "TRAITEMENT_SURPAIEMENT";

    private final PeriodeDroitsRepository periodeDroitsRepository;
    private final AdherentRepository adherentRepository;
    private final AdhesionRepository adhesionRepository;
    private final PackRepository packRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ServiceParametre serviceParametre;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;

    public ServiceCalculDroitsImpl(PeriodeDroitsRepository periodeDroitsRepository, AdherentRepository adherentRepository,
                                    AdhesionRepository adhesionRepository, PackRepository packRepository,
                                    JdbcTemplate jdbcTemplate, ServiceParametre serviceParametre,
                                    ServicePerimetreDonnees perimetre, ServiceAudit serviceAudit) {
        this.periodeDroitsRepository = periodeDroitsRepository;
        this.adherentRepository = adherentRepository;
        this.adhesionRepository = adhesionRepository;
        this.packRepository = packRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.serviceParametre = serviceParametre;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
    }

    @Override
    @Transactional
    public List<PeriodeDroitsDto> imputer(UUID affectationPaiementId) {
        Map<String, Object> ligne;
        try {
            ligne = jdbcTemplate.queryForMap("""
                    SELECT ap.montant AS montant, p.adherent_id AS adherent_id
                    FROM affectation_paiement ap JOIN paiement p ON p.id = ap.paiement_id
                    WHERE ap.id = ?
                    """, affectationPaiementId);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            throw new ExceptionRessourceIntrouvable("AFFECTATION_INTROUVABLE", "Affectation de paiement introuvable.");
        }
        BigDecimal montant = (BigDecimal) ligne.get("montant");
        UUID adherentId = (UUID) ligne.get("adherent_id");

        return imputerInterne(adherentId, montant, affectationPaiementId, "SYSTEME");
    }

    private List<PeriodeDroitsDto> imputerInterne(UUID adherentId, BigDecimal montant, UUID sourceAffectationId,
                                                    String auteurIdentifiant) {
        Adherent adherent = adherentRepository.findById(adherentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
        Adhesion adhesionOuverte = adhesionRepository.findByAdherentIdAndDateFinIsNull(adherentId)
                .orElseThrow(() -> new IllegalStateException(
                        "Aucune adhésion ouverte pour l'adhérent " + adherentId + " — imputation impossible."));
        Pack pack = packRepository.findById(adhesionOuverte.getPackId())
                .orElseThrow(() -> new IllegalStateException("Pack introuvable pour l'adhésion " + adhesionOuverte.getId()));

        LocalDate dateDebut = periodeDroitsRepository
                .findFirstByAdherentIdAndStatutNotOrderByDateFinDesc(adherentId, StatutPeriode.ANNULEE)
                .map(derniere -> derniere.getDateFin().plusDays(1))
                .orElse(adherent.getDateAdhesion());

        int joursCouverts = montant.divide(pack.getMontantJournalier(), 0, RoundingMode.DOWN).intValueExact();
        BigDecimal montantConsomme = pack.getMontantJournalier().multiply(BigDecimal.valueOf(joursCouverts));
        BigDecimal reliquat = montant.subtract(montantConsomme);

        if (reliquat.compareTo(BigDecimal.ZERO) > 0) {
            boolean regleValidee = serviceParametre.estValide(CLE_PARAMETRE_SURPAIEMENT);
            String avertissement = "Reliquat de " + reliquat + " F non imputé pour l'adhérent " + adherentId
                    + " — règle TRAITEMENT_SURPAIEMENT " + (regleValidee ? "validée" : "non validée par le DAF")
                    + " ; le reliquat reste en attente d'un prochain versement, aucune période partielle inventée.";
            LOG.warn(avertissement);
            serviceAudit.tracer(TypeOperation.DROITS_IMPUTATION, "adherent", adherentId, null,
                    Map.of("reliquatNonImpute", reliquat), avertissement);
        }

        if (joursCouverts <= 0) {
            String avertissement = "Montant imputé (" + montant + " F) insuffisant pour couvrir une seule journée "
                    + "du pack " + pack.getCode() + " (" + pack.getMontantJournalier() + " F/jour) — aucune période créée.";
            LOG.warn(avertissement);
            serviceAudit.tracer(TypeOperation.DROITS_IMPUTATION, "adherent", adherentId, null, null, avertissement);
            return List.of();
        }

        LocalDate dateFin = dateDebut.plusDays(joursCouverts - 1L);

        List<PeriodeDroits> chevauchements = periodeDroitsRepository.rechercherChevauchement(adherentId, dateDebut, dateFin);
        if (!chevauchements.isEmpty()) {
            throw new ExceptionConflit("DROITS_CHEVAUCHEMENT_PERIODE",
                    "La nouvelle période de droits (" + dateDebut + " → " + dateFin
                            + ") chevauche une période existante pour cet adhérent.");
        }

        PeriodeDroits periode = new PeriodeDroits(adherentId, dateDebut, dateFin, joursCouverts, montant,
                pack.getId(), sourceAffectationId, auteurIdentifiant);
        periode = periodeDroitsRepository.save(periode);

        serviceAudit.tracer(TypeOperation.DROITS_IMPUTATION, "periode_droits", periode.getId(), null,
                PeriodeDroitsDto.depuis(periode), null);

        return List.of(PeriodeDroitsDto.depuis(periode));
    }

    @Override
    @PreAuthorize("hasAuthority('DROITS:LIRE')")
    public SituationDroitsDto situation(UUID adherentId, LocalDate dateReference, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        Adherent adherent = adherentRepository.findById(adherentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));

        List<PeriodeDroits> periodesActives = periodeDroitsRepository
                .findByAdherentIdAndStatutNotOrderByDateDebutAsc(adherentId, StatutPeriode.ANNULEE);

        List<String> avertissements = new ArrayList<>();
        StatutRegularite statut;
        LocalDate couvertJusquAu = null;
        int joursCouvertsTotal = 0;
        BigDecimal cumulCotise = BigDecimal.ZERO;
        int joursRetard = 0;

        if (periodesActives.isEmpty()) {
            statut = StatutRegularite.JAMAIS_COTISE;
            joursRetard = (int) java.time.temporal.ChronoUnit.DAYS.between(adherent.getDateAdhesion(), dateReference);
            avertissements.add("Aucun paiement validé n'a encore été imputé pour cet adhérent.");
        } else {
            for (PeriodeDroits p : periodesActives) {
                joursCouvertsTotal += p.getJoursCouverts();
                cumulCotise = cumulCotise.add(p.getMontantImpute());
                if (couvertJusquAu == null || p.getDateFin().isAfter(couvertJusquAu)) {
                    couvertJusquAu = p.getDateFin();
                }
            }
            int seuilRetardJours = serviceParametre.entier("DELAI_RETARD_JOURS");
            long retard = java.time.temporal.ChronoUnit.DAYS.between(couvertJusquAu, dateReference);
            joursRetard = (int) Math.max(0, retard);
            if (retard <= 0) {
                statut = StatutRegularite.A_JOUR;
            } else if (retard <= seuilRetardJours) {
                statut = StatutRegularite.PARTIELLEMENT_A_JOUR;
            } else {
                statut = StatutRegularite.EN_RETARD;
            }
        }

        UUID packIdCourant = adhesionRepository.findByAdherentIdAndDateFinIsNull(adherentId)
                .map(Adhesion::getPackId).orElse(null);
        BigDecimal seuilCnps = packIdCourant != null
                ? packRepository.findById(packIdCourant).map(Pack::getSeuilEligibiliteCnps).orElse(null)
                : null;
        boolean eligibleCnps = seuilCnps != null && cumulCotise.compareTo(seuilCnps) >= 0;
        BigDecimal soldeAvantSeuil = seuilCnps == null ? BigDecimal.ZERO
                : seuilCnps.subtract(cumulCotise).max(BigDecimal.ZERO);

        if (!serviceParametre.estValide(CLE_PARAMETRE_SURPAIEMENT)) {
            avertissements.add("Le traitement d'un éventuel reliquat de versement (TRAITEMENT_SURPAIEMENT) "
                    + "n'est pas validé par le DAF — un reliquat récent, s'il existe, reste non imputé.");
        }

        return new SituationDroitsDto(adherentId, adherent.getMatricule(), couvertJusquAu, joursCouvertsTotal,
                joursRetard, cumulCotise, soldeAvantSeuil, statut, eligibleCnps, avertissements);
    }

    @Override
    @PreAuthorize("hasAuthority('DROITS:LIRE')")
    public List<PeriodeDroitsDto> periodes(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        return periodeDroitsRepository.findByAdherentIdOrderByDateDebutAsc(adherentId).stream()
                .map(PeriodeDroitsDto::depuis)
                .collect(Collectors.toList());
    }

    @Override
    @PreAuthorize("hasAuthority('DROITS:RECALCULER')")
    @Transactional
    public void recalculer(UUID adherentId, String motif, Utilisateur auteur) {
        if (!auteur.possedeRole("DAF") && !auteur.possedeRole("SUPER_ADMIN")) {
            throw new ExceptionAutorisation("DROITS_RECALCUL_RESERVE",
                    "Seuls le DAF et le Super Administrateur peuvent recalculer les droits d'un adhérent.");
        }
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("DROITS_MOTIF_REQUIS", "Le motif du recalcul est obligatoire.");
        }
        if (!adherentRepository.existsById(adherentId)) {
            throw new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable.");
        }

        List<PeriodeDroits> existantes = periodeDroitsRepository
                .findByAdherentIdAndStatutNotOrderByDateDebutAsc(adherentId, StatutPeriode.ANNULEE);
        for (PeriodeDroits p : existantes) {
            p.annuler();
            periodeDroitsRepository.save(p);
        }

        List<Map<String, Object>> affectationsARejouer = jdbcTemplate.queryForList("""
                SELECT ap.id AS affectation_id, ap.montant AS montant
                FROM affectation_paiement ap
                JOIN paiement p ON p.id = ap.paiement_id
                WHERE p.adherent_id = ? AND p.statut IN ('VALIDE','RAPPROCHE') AND p.archive = false
                ORDER BY p.date_paiement ASC, ap.cree_le ASC
                """, adherentId);

        for (Map<String, Object> ligne : affectationsARejouer) {
            UUID affectationId = (UUID) ligne.get("affectation_id");
            BigDecimal montant = (BigDecimal) ligne.get("montant");
            imputerInterne(adherentId, montant, affectationId, auteur.getIdentifiant());
        }

        serviceAudit.tracer(TypeOperation.DROITS_RECALCUL, "adherent", adherentId, existantes.size(),
                affectationsARejouer.size(), motif);
    }
}
