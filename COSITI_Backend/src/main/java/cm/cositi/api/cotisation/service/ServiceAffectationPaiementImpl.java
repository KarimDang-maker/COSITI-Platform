package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.PreferenceAllocationAdherent;
import cm.cositi.api.adherent.repository.PreferenceAllocationAdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.util.ValidationAllocation;
import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.cotisation.dto.LigneAffectationDto;
import cm.cositi.api.cotisation.entite.AffectationPaiement;
import cm.cositi.api.cotisation.entite.ComposanteAffectation;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.RecommandationAllocationPaiement;
import cm.cositi.api.cotisation.repository.AffectationPaiementRepository;
import cm.cositi.api.cotisation.repository.ComposanteAffectationRepository;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.cotisation.repository.RecommandationAllocationPaiementRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Ventile un paiement validé entre les deux comptes métier de l'adhérent — Sécurité Sociale (composante
 * {@code CNPS}) et Épargne (composante {@code EPARGNE}) — selon {@code REPARTITION_VERSEMENT}, désormais
 * validé par la COSITI (correctif COSITI V1 §7-§8, {@code Conception/SUIVI_EXECUTION.md}) : 700 FCFA minimum
 * vers la Sécurité Sociale, le reste vers l'Épargne, sauf préférence d'allocation enregistrée par l'adhérent
 * ou recommandation structurée de paiement (montant &gt; 1000 FCFA).
 */
@Service
public class ServiceAffectationPaiementImpl implements ServiceAffectationPaiement {

    private static final String CLE_PARAMETRE_MINIMUM_SECURITE_SOCIALE = "MONTANT_MINIMUM_SECURITE_SOCIALE";
    static final String CODE_COMPOSANTE_SECURITE_SOCIALE = "CNPS";
    static final String CODE_COMPOSANTE_EPARGNE = "EPARGNE";
    private static final String REGLE_RECOMMANDATION = "RECOMMANDATION_STRUCTUREE_ADHERENT";
    private static final String REGLE_PREFERENCE = "PREFERENCE_ALLOCATION_ADHERENT";
    private static final String REGLE_DEFAUT = "SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE";
    private static final String REGLE_MANUELLE = "MANUEL";

    private final AffectationPaiementRepository affectationRepository;
    private final PaiementRepository paiementRepository;
    private final ComposanteAffectationRepository composanteRepository;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;
    private final RecommandationAllocationPaiementRepository recommandationRepository;
    private final PreferenceAllocationAdherentRepository preferenceAllocationRepository;

    public ServiceAffectationPaiementImpl(AffectationPaiementRepository affectationRepository,
                                           PaiementRepository paiementRepository,
                                           ComposanteAffectationRepository composanteRepository,
                                           ServiceParametre serviceParametre, ServiceAudit serviceAudit,
                                           RecommandationAllocationPaiementRepository recommandationRepository,
                                           PreferenceAllocationAdherentRepository preferenceAllocationRepository) {
        this.affectationRepository = affectationRepository;
        this.paiementRepository = paiementRepository;
        this.composanteRepository = composanteRepository;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
        this.recommandationRepository = recommandationRepository;
        this.preferenceAllocationRepository = preferenceAllocationRepository;
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:AFFECTER')")
    @Transactional
    public List<AffectationDto> affecter(UUID paiementId, Utilisateur auteur) {
        List<AffectationPaiement> existantes = affectationRepository.findByPaiementId(paiementId);
        if (!existantes.isEmpty()) {
            return versDto(existantes);
        }

        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("PAIEMENT_INTROUVABLE", "Paiement introuvable."));

        BigDecimal minimumSecuriteSociale = serviceParametre.decimal(CLE_PARAMETRE_MINIMUM_SECURITE_SOCIALE);
        Repartition repartition = determinerRepartition(paiement, minimumSecuriteSociale);
        ValidationAllocation.verifier(paiement.getMontant(), repartition.securiteSociale(), repartition.epargne(),
                minimumSecuriteSociale);

        ComposanteAffectation composanteSecuriteSociale = composanteRepository.findByCode(CODE_COMPOSANTE_SECURITE_SOCIALE)
                .orElseThrow(() -> new IllegalStateException("Composante CNPS introuvable — seed V3 incomplet."));

        List<AffectationPaiement> nouvelles = new ArrayList<>();
        // saveAndFlush (pas seulement save) : ServiceCalculDroitsImpl.imputer, appelé juste après par
        // ServicePaiementImpl.valider dans la même transaction, lit cette ligne via une requête JDBC directe
        // (jointure affectation_paiement/paiement) plutôt que via le contexte de persistance Hibernate — sans
        // flush immédiat, l'INSERT ne serait pas encore visible et l'imputation échouerait (AFFECTATION_INTROUVABLE).
        nouvelles.add(affectationRepository.saveAndFlush(new AffectationPaiement(paiementId,
                composanteSecuriteSociale.getId(), repartition.securiteSociale(), repartition.regle(), auteur.getIdentifiant())));

        // §7 exemple pack 700 : 0 FCFA vers Épargne — la contrainte montant > 0 sur affectation_paiement
        // interdit d'inventer une ligne à zéro, donc aucune ligne Épargne n'est créée dans ce cas.
        if (repartition.epargne().signum() > 0) {
            ComposanteAffectation composanteEpargne = composanteRepository.findByCode(CODE_COMPOSANTE_EPARGNE)
                    .orElseThrow(() -> new IllegalStateException("Composante EPARGNE introuvable — seed V3 incomplet."));
            nouvelles.add(affectationRepository.saveAndFlush(new AffectationPaiement(paiementId,
                    composanteEpargne.getId(), repartition.epargne(), repartition.regle(), auteur.getIdentifiant())));
        }

        for (AffectationPaiement affectation : nouvelles) {
            serviceAudit.tracer(TypeOperation.AFFECTATION_CREATION, "affectation_paiement", affectation.getId(),
                    null, AffectationDto.depuis(affectation), repartition.regle());
        }

        return versDto(nouvelles);
    }

    private record Repartition(BigDecimal securiteSociale, BigDecimal epargne, String regle) {
    }

    /**
     * Ordre de priorité (§7-§8) : 1) recommandation structurée recueillie par l'agent pour ce paiement précis ;
     * 2) préférence d'allocation du dossier adhérent, uniquement si son montant de référence correspond
     * exactement au montant payé (sinon la proportion n'aurait pas de sens et inventerait une règle de mise à
     * l'échelle non spécifiée) ; 3) répartition par défaut (plancher 700 FCFA puis Épargne).
     */
    private Repartition determinerRepartition(Paiement paiement, BigDecimal minimumSecuriteSociale) {
        var recommandation = recommandationRepository.findByPaiementId(paiement.getId());
        if (recommandation.isPresent()) {
            RecommandationAllocationPaiement r = recommandation.get();
            return new Repartition(r.getAllocationSecuriteSociale(), r.getAllocationEpargne(), REGLE_RECOMMANDATION);
        }

        var preference = preferenceAllocationRepository.findByAdherentIdAndActifTrue(paiement.getAdherentId());
        if (preference.isPresent()) {
            PreferenceAllocationAdherent p = preference.get();
            if (p.getMontantReference().compareTo(paiement.getMontant()) == 0) {
                return new Repartition(p.getAllocationSecuriteSociale(), p.getAllocationEpargne(), REGLE_PREFERENCE);
            }
        }

        BigDecimal[] defaut = ValidationAllocation.repartitionParDefaut(paiement.getMontant(), minimumSecuriteSociale);
        return new Repartition(defaut[0], defaut[1], REGLE_DEFAUT);
    }

    private List<AffectationDto> versDto(List<AffectationPaiement> affectations) {
        Map<UUID, String> codes = composanteRepository.findAllById(
                        affectations.stream().map(AffectationPaiement::getComposanteId).distinct().collect(Collectors.toList()))
                .stream().collect(Collectors.toMap(ComposanteAffectation::getId, ComposanteAffectation::getCode));
        return affectations.stream()
                .map(a -> AffectationDto.depuis(a, codes.get(a.getComposanteId())))
                .collect(Collectors.toList());
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

        return versDto(nouvelles);
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
        return versDto(affectationRepository.findByPaiementId(paiementId));
    }
}
