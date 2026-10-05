package cm.cositi.api.cotisation.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.cotisation.dto.LigneAffectationDto;
import cm.cositi.api.cotisation.entite.AffectationPaiement;
import cm.cositi.api.cotisation.entite.ComposanteAffectation;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.repository.AffectationPaiementRepository;
import cm.cositi.api.cotisation.repository.ComposanteAffectationRepository;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Applique la règle confirmée {@code REPARTITION_VERSEMENT} (statut {@code C} depuis V14) : à chaque paiement, au
 * moins {@code MONTANT_MINIMUM_SECURITE_SOCIALE} (700 FCFA) vers la composante Sécurité sociale ({@code CNPS}), le
 * reste vers l'Épargne — sauf recommandation structurée de paiement (montant &gt; 1 000 FCFA) ou préférence
 * d'allocation de l'adhérent. Sécurité sociale + Épargne égale toujours le montant ; une allocation où la Sécurité
 * sociale descend sous le minimum est refusée.
 */
@Service
public class ServiceAffectationPaiementImpl implements ServiceAffectationPaiement {

    private static final Logger LOG = LoggerFactory.getLogger(ServiceAffectationPaiementImpl.class);
    static final String CLE_PARAMETRE_REPARTITION = "REPARTITION_VERSEMENT";
    static final String CLE_MINIMUM_SECURITE_SOCIALE = "MONTANT_MINIMUM_SECURITE_SOCIALE";
    static final String CODE_SECURITE_SOCIALE = "CNPS";
    static final String CODE_EPARGNE = "EPARGNE";
    /** Seuil au-delà duquel une recommandation structurée du membre est prise en compte (règle confirmée). */
    private static final BigDecimal SEUIL_RECOMMANDATION = new BigDecimal("1000");
    static final String REGLE_DEFAUT = "SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE";
    static final String REGLE_PREFERENCE = "PREFERENCE_ADHERENT";
    static final String REGLE_RECOMMANDATION = "RECOMMANDATION_PAIEMENT";
    /** Règle des affectations produites avant l'application de la répartition confirmée (historique). */
    static final String REGLE_ANCIENNE_COOPERATIVE = "PAR_DEFAUT_COOPERATIVE_NON_VALIDEE";
    private static final String REGLE_MANUELLE = "MANUEL";
    /** Préfixe des affectations issues de la répartition enregistrée avec la cotisation (suivi de l'origine). */
    static final String REGLE_ENREGISTREE = "REPARTITION_COTISATION";

    private final AffectationPaiementRepository affectationRepository;
    private final PaiementRepository paiementRepository;
    private final ComposanteAffectationRepository composanteRepository;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;
    private final JdbcTemplate jdbcTemplate;
    private final RegleRepartitionCotisation regleRepartition;

    public ServiceAffectationPaiementImpl(AffectationPaiementRepository affectationRepository,
                                           PaiementRepository paiementRepository,
                                           ComposanteAffectationRepository composanteRepository,
                                           ServiceParametre serviceParametre, ServiceAudit serviceAudit,
                                           JdbcTemplate jdbcTemplate, RegleRepartitionCotisation regleRepartition) {
        this.affectationRepository = affectationRepository;
        this.paiementRepository = paiementRepository;
        this.composanteRepository = composanteRepository;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
        this.jdbcTemplate = jdbcTemplate;
        this.regleRepartition = regleRepartition;
    }

    /** Répartition retenue pour un paiement. */
    record Repartition(BigDecimal securiteSociale, BigDecimal epargne, String regle) {
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:AFFECTER')")
    @Transactional
    public List<AffectationDto> affecter(UUID paiementId, Utilisateur auteur) {
        List<AffectationPaiement> existantes = affectationRepository.findByPaiementId(paiementId);
        if (!existantes.isEmpty()) {
            return existantes.stream().map(AffectationDto::depuis).collect(Collectors.toList());
        }

        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("PAIEMENT_INTROUVABLE", "Paiement introuvable."));
        Repartition repartition = calculerRepartition(paiement);

        List<AffectationPaiement> creees = new ArrayList<>();
        if (repartition.securiteSociale().signum() > 0) {
            creees.add(affectationRepository.saveAndFlush(new AffectationPaiement(paiementId,
                    composante(CODE_SECURITE_SOCIALE).getId(), repartition.securiteSociale(), repartition.regle(),
                    auteur.getIdentifiant())));
        }
        if (repartition.epargne().signum() > 0) {
            creees.add(affectationRepository.saveAndFlush(new AffectationPaiement(paiementId,
                    composante(CODE_EPARGNE).getId(), repartition.epargne(), repartition.regle(),
                    auteur.getIdentifiant())));
        }
        // saveAndFlush (pas seulement save) : ServiceCalculDroitsImpl.imputerPaiement, appelé juste après par
        // ServicePaiementImpl.valider dans la même transaction, lit ces lignes par une requête JDBC directe — sans
        // flush immédiat, les INSERT ne seraient pas encore visibles.
        List<AffectationDto> resultat = creees.stream().map(AffectationDto::depuis).toList();
        serviceAudit.tracer(TypeOperation.AFFECTATION_CREATION, "paiement", paiementId, null, resultat,
                "Répartition " + repartition.regle() + " : Sécurité sociale " + repartition.securiteSociale()
                        + " FCFA, Épargne " + repartition.epargne() + " FCFA");
        return resultat;
    }

    /**
     * Répartition enregistrée avec la cotisation (V22) ; pour une cotisation antérieure qui n'en porte pas :
     * recommandation (paiement &gt; 1 000 FCFA), sinon préférence de l'adhérent, sinon règle par défaut.
     */
    Repartition calculerRepartition(Paiement paiement) {
        BigDecimal minimum = serviceParametre.decimal(CLE_MINIMUM_SECURITE_SOCIALE);
        BigDecimal montant = paiement.getMontant();
        if (paiement.possedeRepartition()) {
            // Revalidée au moment de l'affectation : les seuils ont pu changer depuis la saisie, et un montant
            // définitivement comptabilisé ne doit jamais enfreindre la règle en vigueur.
            regleRepartition.valider(montant, paiement.getMontantSecuriteSociale(), paiement.getMontantEpargne());
            return new Repartition(paiement.getMontantSecuriteSociale(), paiement.getMontantEpargne(),
                    REGLE_ENREGISTREE + "_" + paiement.getOrigineRepartition().name());
        }
        if (montant.compareTo(minimum) < 0) {
            throw new ExceptionConflit("PAIEMENT_MONTANT_INFERIEUR_MINIMUM_SECURITE_SOCIALE",
                    "Le paiement (" + montant + " FCFA) est inférieur au minimum de " + minimum
                            + " FCFA affecté à la Sécurité sociale à chaque paiement : la répartition est impossible.");
        }
        if (montant.compareTo(SEUIL_RECOMMANDATION) > 0) {
            Optional<Repartition> recommandation = lire(
                    "SELECT allocation_securite_sociale, allocation_epargne FROM recommandation_allocation_paiement "
                            + "WHERE paiement_id = ?", REGLE_RECOMMANDATION, paiement.getId());
            Optional<Repartition> valide = recommandation.filter(r -> estValide(r, montant, minimum));
            if (valide.isPresent()) {
                return valide.get();
            }
            recommandation.ifPresent(r -> LOG.warn("Recommandation d'allocation ignorée pour le paiement {} : somme ou "
                    + "minimum Sécurité sociale incohérents.", paiement.getId()));
        }
        // Préférence : appliquée telle quelle quand elle porte sur le montant du paiement ; pour un autre montant, la
        // règle ne dit pas comment l'adapter — la règle par défaut s'applique alors (aucune proportion inventée).
        Optional<Repartition> preference = lire(
                "SELECT allocation_securite_sociale, allocation_epargne FROM preference_allocation_adherent "
                        + "WHERE adherent_id = ? AND actif = true AND montant_reference = ?", REGLE_PREFERENCE,
                paiement.getAdherentId(), montant);
        if (preference.isPresent() && estValide(preference.get(), montant, minimum)) {
            return preference.get();
        }
        return new Repartition(minimum, montant.subtract(minimum), REGLE_DEFAUT);
    }

    private Optional<Repartition> lire(String sql, String regle, Object... parametres) {
        List<Repartition> lignes = jdbcTemplate.query(sql, (rs, i) -> new Repartition(
                rs.getBigDecimal("allocation_securite_sociale"), rs.getBigDecimal("allocation_epargne"), regle), parametres);
        return lignes.stream().findFirst();
    }

    private static boolean estValide(Repartition r, BigDecimal montant, BigDecimal minimum) {
        return r.securiteSociale().compareTo(minimum) >= 0 && r.epargne().signum() >= 0
                && r.securiteSociale().add(r.epargne()).compareTo(montant) == 0;
    }

    private ComposanteAffectation composante(String code) {
        return composanteRepository.findByCode(code)
                .orElseThrow(() -> new IllegalStateException("Composante " + code + " introuvable — seed V3 incomplet."));
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:AFFECTER')")
    @Transactional
    public List<AffectationDto> affecterManuellement(UUID paiementId, List<LigneAffectationDto> lignes, Utilisateur auteur) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("PAIEMENT_INTROUVABLE", "Paiement introuvable."));

        BigDecimal somme = lignes.stream().map(LigneAffectationDto::montant).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (somme.compareTo(paiement.getMontant()) != 0) {
            throw new ExceptionValidation("AFFECTATION_MONTANT_INCOHERENT",
                    "La somme des affectations (" + somme + ") doit être égale au montant du paiement ("
                            + paiement.getMontant() + ").");
        }
        // Règle confirmée REPARTITION_VERSEMENT : seules la Sécurité sociale et l'Épargne reçoivent un versement, et la
        // Sécurité sociale ne descend jamais sous le minimum.
        BigDecimal minimum = serviceParametre.decimal(CLE_MINIMUM_SECURITE_SOCIALE);
        BigDecimal securiteSociale = BigDecimal.ZERO;
        for (LigneAffectationDto ligne : lignes) {
            String code = composanteRepository.findById(ligne.composanteId()).map(ComposanteAffectation::getCode)
                    .orElseThrow(() -> new ExceptionValidation("AFFECTATION_COMPOSANTE_INCONNUE",
                            "Composante d'affectation introuvable.", "lignes"));
            if (!CODE_SECURITE_SOCIALE.equals(code) && !CODE_EPARGNE.equals(code)) {
                throw new ExceptionValidation("AFFECTATION_COMPOSANTE_NON_AUTORISEE",
                        "Un versement ne s'affecte qu'à la Sécurité sociale et à l'Épargne (règle REPARTITION_VERSEMENT).",
                        "lignes");
            }
            if (CODE_SECURITE_SOCIALE.equals(code)) {
                securiteSociale = securiteSociale.add(ligne.montant());
            }
        }
        if (securiteSociale.compareTo(minimum) < 0) {
            throw new ExceptionValidation("AFFECTATION_SECURITE_SOCIALE_INSUFFISANTE",
                    "La part Sécurité sociale (" + securiteSociale + " FCFA) ne peut pas être inférieure à " + minimum
                            + " FCFA (règle REPARTITION_VERSEMENT).", "lignes");
        }

        List<AffectationPaiement> existantes = affectationRepository.findByPaiementId(paiementId);
        affectationRepository.deleteAll(existantes);
        affectationRepository.flush();

        List<AffectationPaiement> nouvelles = lignes.stream()
                .map(ligne -> new AffectationPaiement(paiementId, ligne.composanteId(), ligne.montant(),
                        REGLE_MANUELLE, auteur.getIdentifiant()))
                .map(affectationRepository::save)
                .collect(Collectors.toList());

        serviceAudit.tracer(TypeOperation.AFFECTATION_CREATION, "paiement", paiementId, existantes.size(),
                nouvelles.size(), "Ré-affectation manuelle par " + auteur.getIdentifiant());

        return nouvelles.stream().map(AffectationDto::depuis).collect(Collectors.toList());
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:AFFECTER')")
    @Transactional
    public List<AffectationDto> reaffecterApresCorrection(UUID paiementId, Utilisateur auteur) {
        List<AffectationPaiement> existantes = affectationRepository.findByPaiementId(paiementId);
        if (existantes.stream().anyMatch(a -> REGLE_MANUELLE.equals(a.getRegleAppliquee()))) {
            throw new ExceptionConflit("PAIEMENT_AFFECTATION_MANUELLE",
                    "Ce paiement porte une répartition manuelle : refaites-la (POST /paiements/{id}/affectations) "
                            + "avant d'approuver une correction de montant.");
        }
        affectationRepository.deleteAll(existantes);
        affectationRepository.flush();
        List<AffectationDto> nouvelles = affecter(paiementId, auteur);
        serviceAudit.tracer(TypeOperation.AFFECTATION_CREATION, "paiement", paiementId, existantes.size(),
                nouvelles.size(), "Ré-affectation par défaut après correction approuvée");
        return nouvelles;
    }

    @Override
    public void verifierInvariant(UUID paiementId) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("PAIEMENT_INTROUVABLE", "Paiement introuvable."));
        BigDecimal somme = affectationRepository.findByPaiementId(paiementId).stream()
                .map(AffectationPaiement::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (somme.compareTo(paiement.getMontant()) != 0) {
            throw new ExceptionConflit("AFFECTATION_INVARIANT_VIOLE",
                    "La somme des affectations (" + somme + ") ne correspond pas au montant du paiement ("
                            + paiement.getMontant() + ").");
        }
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public List<AffectationDto> lister(UUID paiementId) {
        java.util.Map<UUID, ComposanteAffectation> composantes = composanteRepository.findAll().stream()
                .collect(Collectors.toMap(ComposanteAffectation::getId, c -> c));
        return affectationRepository.findByPaiementId(paiementId).stream()
                .map(a -> AffectationDto.depuis(a, composantes.get(a.getComposanteId())))
                .collect(Collectors.toList());
    }
}
