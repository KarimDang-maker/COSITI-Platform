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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * {@code REPARTITION_VERSEMENT} est marqué {@code [V]} (non validé) dans {@code parametre} — l'implémentation
 * applique donc systématiquement l'affectation unique par défaut vers {@code COOPERATIVE} et journalise un
 * avertissement, conformément à docs/02_CLASSES_ET_METHODES.md §4. Aucune ventilation CNPS/Épargne réelle
 * n'est inventée tant que le DAF n'a pas tranché.
 */
@Service
public class ServiceAffectationPaiementImpl implements ServiceAffectationPaiement {

    private static final Logger LOG = LoggerFactory.getLogger(ServiceAffectationPaiementImpl.class);
    private static final String CLE_PARAMETRE_REPARTITION = "REPARTITION_VERSEMENT";
    private static final String CODE_COMPOSANTE_DEFAUT = "COOPERATIVE";
    private static final String REGLE_DEFAUT = "PAR_DEFAUT_COOPERATIVE_NON_VALIDEE";
    private static final String REGLE_MANUELLE = "MANUEL";

    private final AffectationPaiementRepository affectationRepository;
    private final PaiementRepository paiementRepository;
    private final ComposanteAffectationRepository composanteRepository;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;

    public ServiceAffectationPaiementImpl(AffectationPaiementRepository affectationRepository,
                                           PaiementRepository paiementRepository,
                                           ComposanteAffectationRepository composanteRepository,
                                           ServiceParametre serviceParametre, ServiceAudit serviceAudit) {
        this.affectationRepository = affectationRepository;
        this.paiementRepository = paiementRepository;
        this.composanteRepository = composanteRepository;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
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

        boolean regleValidee = serviceParametre.estValide(CLE_PARAMETRE_REPARTITION);
        String avertissement = null;
        if (!regleValidee) {
            avertissement = "Règle de répartition du versement (REPARTITION_VERSEMENT) non validée par le DAF — "
                    + "affectation unique appliquée vers COOPERATIVE, sans ventilation CNPS/Épargne.";
            LOG.warn(avertissement);
        }

        ComposanteAffectation composanteDefaut = composanteRepository.findByCode(CODE_COMPOSANTE_DEFAUT)
                .orElseThrow(() -> new IllegalStateException("Composante COOPERATIVE introuvable — seed V3 incomplet."));

        AffectationPaiement affectation = new AffectationPaiement(paiementId, composanteDefaut.getId(),
                paiement.getMontant(), REGLE_DEFAUT, auteur.getIdentifiant());
        // saveAndFlush (pas seulement save) : ServiceCalculDroitsImpl.imputer, appelé juste après par
        // ServicePaiementImpl.valider dans la même transaction, lit cette ligne via une requête JDBC directe
        // (jointure affectation_paiement/paiement) plutôt que via le contexte de persistance Hibernate — sans
        // flush immédiat, l'INSERT ne serait pas encore visible et l'imputation échouerait (AFFECTATION_INTROUVABLE).
        affectation = affectationRepository.saveAndFlush(affectation);

        serviceAudit.tracer(TypeOperation.AFFECTATION_CREATION, "affectation_paiement", affectation.getId(),
                null, AffectationDto.depuis(affectation), avertissement);

        return List.of(AffectationDto.depuis(affectation));
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
        return affectationRepository.findByPaiementId(paiementId).stream()
                .map(AffectationDto::depuis)
                .collect(Collectors.toList());
    }
}
