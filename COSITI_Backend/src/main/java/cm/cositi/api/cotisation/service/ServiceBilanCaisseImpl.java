package cm.cositi.api.cotisation.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.BilanJournalierDto;
import cm.cositi.api.cotisation.dto.RapprochementCaisseDto;
import cm.cositi.api.cotisation.dto.StatistiquesQuotidiennesDto.AgregatDto;
import cm.cositi.api.cotisation.entite.BilanCaisseJournalier;
import cm.cositi.api.cotisation.entite.StatutBilanCaisse;
import cm.cositi.api.cotisation.repository.BilanCaisseJournalierRepository;
import cm.cositi.api.notification.ServiceNotification;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ServiceBilanCaisseImpl implements ServiceBilanCaisse {

    static final String PARAM_MODES = "BILAN_CAISSE_MODES_NUMERIQUE";
    static final String PARAM_STATUTS = "BILAN_CAISSE_STATUTS_INCLUS";

    /** Un brouillon, un paiement annulé ou rejeté n'a jamais été encaissé au sens de la plateforme. */
    private static final Set<String> STATUTS_NON_ENREGISTRES = Set.of("BROUILLON", "ANNULE", "REJETE");

    private final BilanCaisseJournalierRepository repository;
    private final JdbcTemplate jdbcTemplate;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;
    private final ServiceNotification serviceNotification;
    private final ApplicationEventPublisher evenements;

    public ServiceBilanCaisseImpl(BilanCaisseJournalierRepository repository, JdbcTemplate jdbcTemplate,
                                  ServiceParametre serviceParametre, ServiceAudit serviceAudit,
                                  ServiceNotification serviceNotification, ApplicationEventPublisher evenements) {
        this.repository = repository;
        this.jdbcTemplate = jdbcTemplate;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
        this.serviceNotification = serviceNotification;
        this.evenements = evenements;
    }

    @Override
    @PreAuthorize("hasAuthority('BILAN_CAISSE:LIRE')")
    public BilanJournalierDto bilanJournalier(LocalDate date, Utilisateur demandeur) {
        LocalDate jour = date != null ? date : LocalDate.now();
        CalculNumerique calcul = calculer(jour);
        RapprochementCaisseDto rapprochement = repository.findByDateBilan(jour)
                .map(b -> RapprochementCaisseDto.depuis(b, calcul.montantNumerique()))
                .orElse(null);
        return new BilanJournalierDto(jour, calcul.nombreEnregistres(), calcul.montantEnregistre(),
                calcul.montantNumerique(), calcul.nombreNumerique(), calcul.parMode(), calcul.modes(),
                calcul.statuts(), rapprochement, avertissements());
    }

    @Override
    @PreAuthorize("hasAuthority('BILAN_CAISSE:SAISIR')")
    @Transactional
    public RapprochementCaisseDto saisirCaissePhysique(LocalDate date, BigDecimal montantPhysique, String commentaire,
                                                       Utilisateur auteur) {
        if (date == null) {
            throw new ExceptionValidation("BILAN_CAISSE_DATE_REQUISE", "La date du bilan est obligatoire.", "date");
        }
        if (date.isAfter(LocalDate.now())) {
            throw new ExceptionValidation("BILAN_CAISSE_DATE_FUTURE",
                    "Un bilan de caisse ne peut pas porter sur une date future.", "date");
        }
        if (montantPhysique == null || montantPhysique.signum() < 0) {
            throw new ExceptionValidation("BILAN_CAISSE_MONTANT_INVALIDE",
                    "Le montant physique doit être positif ou nul.", "montantPhysique");
        }

        CalculNumerique calcul = calculer(date);
        var existant = repository.findByDateBilan(date);
        BilanCaisseJournalier bilan;
        RapprochementCaisseDto avant = null;
        if (existant.isPresent()) {
            bilan = existant.get();
            if (bilan.getStatut() != StatutBilanCaisse.ANOMALIE) {
                // #30 — unicité du bilan : un bilan saisi ou validé ne se ressaisit pas.
                throw new ExceptionConflit("BILAN_CAISSE_DEJA_SAISI",
                        "Le bilan de caisse du " + date + " est déjà saisi (statut " + bilan.getStatut() + ").");
            }
            avant = RapprochementCaisseDto.depuis(bilan, null);
            bilan.saisir(calcul.montantNumerique(), calcul.nombreNumerique(), montantPhysique, commentaire, auteur.getId());
        } else {
            bilan = new BilanCaisseJournalier(date, calcul.montantNumerique(), calcul.nombreNumerique(),
                    montantPhysique, commentaire, auteur.getId());
        }
        bilan = repository.saveAndFlush(bilan);

        RapprochementCaisseDto dto = RapprochementCaisseDto.depuis(bilan, calcul.montantNumerique());
        serviceAudit.tracer(TypeOperation.BILAN_CAISSE_SAISIE, "bilan_caisse", bilan.getId(), avant, dto,
                avant != null ? "Nouvelle saisie après anomalie" : null);

        if (bilan.getEcart().signum() != 0) {
            serviceNotification.notifierRoles(List.of("DAF"), "BILAN_CAISSE_ECART",
                    "Écart sur le bilan de caisse du " + date,
                    "Le bilan de caisse du " + date + " présente un écart de " + bilan.getEcart()
                            + " FCFA (physique " + bilan.getMontantPhysique() + " / numérique "
                            + bilan.getMontantNumerique() + ").",
                    "bilan_caisse", bilan.getId());
        }
        publier(bilan, "SAISIE");
        return dto;
    }

    @Override
    @PreAuthorize("hasAuthority('BILAN_CAISSE:LIRE')")
    public RapprochementCaisseDto rapprochement(LocalDate date, Utilisateur demandeur) {
        BilanCaisseJournalier bilan = charger(date);
        return RapprochementCaisseDto.depuis(bilan, calculer(date).montantNumerique());
    }

    @Override
    @PreAuthorize("hasAuthority('BILAN_CAISSE:LIRE')")
    public ReponsePaginee<RapprochementCaisseDto> lister(LocalDate du, LocalDate au, StatutBilanCaisse statut,
                                                         Pageable pageable, Utilisateur demandeur) {
        Specification<BilanCaisseJournalier> spec = Specification.where(null);
        if (du != null) {
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("dateBilan"), du));
        }
        if (au != null) {
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("dateBilan"), au));
        }
        if (statut != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("statut"), statut));
        }
        // Liste : montant numérique actuel non recalculé ligne à ligne (une requête par jour) — le détail
        // (#31) le fait ; l'écart figé à la saisie reste la référence.
        return ReponsePaginee.depuis(repository.findAll(spec, pageable).map(b -> RapprochementCaisseDto.depuis(b, null)),
                avertissements());
    }

    @Override
    @PreAuthorize("hasAuthority('BILAN_CAISSE:VALIDER')")
    @Transactional
    public RapprochementCaisseDto valider(LocalDate date, String commentaire, Long versionAttendue, Utilisateur daf) {
        BilanCaisseJournalier bilan = chargerPourDecision(date, versionAttendue, daf);
        if (bilan.getStatut() == StatutBilanCaisse.VALIDE) {
            throw new ExceptionConflit("BILAN_CAISSE_DEJA_VALIDE", "Ce bilan de caisse est déjà validé.");
        }
        if (bilan.getStatut() == StatutBilanCaisse.ANOMALIE) {
            throw new ExceptionConflit("BILAN_CAISSE_TRANSITION_INTERDITE",
                    "Un bilan en anomalie doit d'abord être ressaisi avant validation.");
        }

        RapprochementCaisseDto avant = RapprochementCaisseDto.depuis(bilan, null);
        bilan.valider(daf.getId(), commentaire);
        bilan = repository.saveAndFlush(bilan);

        RapprochementCaisseDto dto = RapprochementCaisseDto.depuis(bilan, calculer(date).montantNumerique());
        serviceAudit.tracer(TypeOperation.BILAN_CAISSE_VALIDATION, "bilan_caisse", bilan.getId(), avant, dto, commentaire);
        // V23 §4 : la validation d'un bilan (décision financière du DAF) n'est plus notifiée au Gestionnaire.
        // L'anomalie, elle, reste notifiée à l'auteur de la saisie : il doit recompter et ressaisir la caisse.
        publier(bilan, "VALIDATION");
        return dto;
    }

    @Override
    @PreAuthorize("hasAuthority('BILAN_CAISSE:VALIDER')")
    @Transactional
    public RapprochementCaisseDto signalerAnomalie(LocalDate date, String motif, Utilisateur daf) {
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("BILAN_CAISSE_MOTIF_REQUIS", "Le motif de l'anomalie est obligatoire.", "motif");
        }
        BilanCaisseJournalier bilan = chargerPourDecision(date, null, daf);
        if (bilan.getStatut() == StatutBilanCaisse.ANOMALIE) {
            throw new ExceptionConflit("BILAN_CAISSE_DEJA_EN_ANOMALIE", "Une anomalie est déjà signalée sur ce bilan.");
        }
        if (bilan.getStatut() == StatutBilanCaisse.VALIDE) {
            throw new ExceptionConflit("BILAN_CAISSE_TRANSITION_INTERDITE",
                    "Un bilan validé est définitif, aucune anomalie ne peut plus y être signalée.");
        }

        RapprochementCaisseDto avant = RapprochementCaisseDto.depuis(bilan, null);
        bilan.signalerAnomalie(daf.getId(), motif.trim());
        bilan = repository.saveAndFlush(bilan);

        RapprochementCaisseDto dto = RapprochementCaisseDto.depuis(bilan, calculer(date).montantNumerique());
        serviceAudit.tracer(TypeOperation.BILAN_CAISSE_ANOMALIE, "bilan_caisse", bilan.getId(), avant, dto, motif.trim());
        serviceNotification.notifier(bilan.getSaisiPar(), "BILAN_CAISSE_ANOMALIE",
                "Anomalie sur le bilan de caisse du " + date,
                "Le DAF a signalé une anomalie : " + motif.trim() + ". La caisse doit être recomptée et ressaisie.",
                "bilan_caisse", bilan.getId());
        publier(bilan, "ANOMALIE");
        return dto;
    }

    /** Contrôles communs aux décisions DAF : rôle, existence, concurrence optimiste, séparation des tâches. */
    private BilanCaisseJournalier chargerPourDecision(LocalDate date, Long versionAttendue, Utilisateur daf) {
        if (!daf.possedeRole("DAF")) {
            throw new ExceptionAutorisation("BILAN_CAISSE_DECISION_RESERVEE_DAF",
                    "Seul le DAF peut valider un bilan de caisse ou y signaler une anomalie.");
        }
        BilanCaisseJournalier bilan = charger(date);
        if (versionAttendue != null && !versionAttendue.equals(bilan.getVersion())) {
            throw new ExceptionConflit("BILAN_CAISSE_VERSION_OBSOLETE",
                    "Ce bilan a été modifié depuis votre lecture. Rechargez-le avant de décider.");
        }
        if (daf.getId().equals(bilan.getSaisiPar())) {
            throw new ExceptionMetier("BILAN_CAISSE_AUTO_VALIDATION_INTERDITE",
                    "Vous ne pouvez pas décider d'un bilan de caisse que vous avez vous-même saisi.", HttpStatus.FORBIDDEN);
        }
        return bilan;
    }

    private BilanCaisseJournalier charger(LocalDate date) {
        if (date == null) {
            throw new ExceptionValidation("BILAN_CAISSE_DATE_REQUISE", "La date du bilan est obligatoire.", "date");
        }
        return repository.findByDateBilan(date).orElseThrow(() -> new ExceptionRessourceIntrouvable(
                "BILAN_CAISSE_INTROUVABLE", "Aucun bilan de caisse n'a été saisi pour le " + date + "."));
    }

    /** Agrégat de la journée, sur toute la coopérative : le bilan de caisse n'a pas de périmètre partiel. */
    CalculNumerique calculer(LocalDate date) {
        List<String> modes = liste(PARAM_MODES);
        List<String> statuts = liste(PARAM_STATUTS);

        Map<String, AgregatDto> parMode = new LinkedHashMap<>();
        long[] nombreEnregistres = {0};
        BigDecimal[] montantEnregistre = {BigDecimal.ZERO};
        int[] nombreNumerique = {0};
        BigDecimal[] montantNumerique = {BigDecimal.ZERO};

        jdbcTemplate.query("""
                        SELECT mode_paiement, statut, COUNT(*) AS nombre, COALESCE(SUM(montant), 0) AS montant
                        FROM paiement
                        WHERE date_paiement = ? AND archive = false
                        GROUP BY mode_paiement, statut
                        """,
                rs -> {
                    String mode = rs.getString("mode_paiement");
                    String statut = rs.getString("statut");
                    long nombre = rs.getLong("nombre");
                    BigDecimal montant = rs.getBigDecimal("montant");
                    if (!STATUTS_NON_ENREGISTRES.contains(statut)) {
                        nombreEnregistres[0] += nombre;
                        montantEnregistre[0] = montantEnregistre[0].add(montant);
                        parMode.merge(mode, new AgregatDto(nombre, montant),
                                (a, b) -> new AgregatDto(a.nombre() + b.nombre(), a.montant().add(b.montant())));
                    }
                    if (modes.contains(mode) && statuts.contains(statut)) {
                        nombreNumerique[0] += (int) nombre;
                        montantNumerique[0] = montantNumerique[0].add(montant);
                    }
                },
                date);

        return new CalculNumerique(nombreEnregistres[0], montantEnregistre[0], nombreNumerique[0],
                montantNumerique[0], parMode, modes, statuts);
    }

    private List<String> liste(String cle) {
        return Arrays.stream(serviceParametre.texte(cle).split(","))
                .map(String::trim).filter(v -> !v.isEmpty()).map(String::toUpperCase).toList();
    }

    private List<String> avertissements() {
        List<String> avertissements = new ArrayList<>();
        if (!serviceParametre.estValide(PARAM_MODES) || !serviceParametre.estValide(PARAM_STATUTS)) {
            avertissements.add("Définition du montant numérique du bilan de caisse non validée par la COSITI "
                    + "(paramètres " + PARAM_MODES + " / " + PARAM_STATUTS + ").");
        }
        return avertissements;
    }

    private void publier(BilanCaisseJournalier bilan, String typeChangement) {
        evenements.publishEvent(PaiementModifieEvent.bilan(bilan.getId(), bilan.getDateBilan(), typeChangement,
                bilan.getStatut().name()));
    }

    record CalculNumerique(long nombreEnregistres, BigDecimal montantEnregistre, int nombreNumerique,
                           BigDecimal montantNumerique, Map<String, AgregatDto> parMode, List<String> modes,
                           List<String> statuts) {
    }
}
