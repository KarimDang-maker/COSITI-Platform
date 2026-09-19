package cm.cositi.api.cotisation;

import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.util.Montants;
import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ServiceAffectationPaiementImpl implements ServiceAffectationPaiement {

    private static final Logger log = LoggerFactory.getLogger(ServiceAffectationPaiementImpl.class);

    private final PaiementRepository paiementRepository;
    private final ComposanteAffectationRepository composanteAffectationRepository;
    private final AffectationPaiementRepository affectationPaiementRepository;
    private final ServiceParametre serviceParametre;

    public ServiceAffectationPaiementImpl(
            PaiementRepository paiementRepository,
            ComposanteAffectationRepository composanteAffectationRepository,
            AffectationPaiementRepository affectationPaiementRepository,
            ServiceParametre serviceParametre) {
        this.paiementRepository = paiementRepository;
        this.composanteAffectationRepository = composanteAffectationRepository;
        this.affectationPaiementRepository = affectationPaiementRepository;
        this.serviceParametre = serviceParametre;
    }

    @Override
    public List<AffectationDto> affecter(UUID paiementId, Utilisateur auteur) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Paiement", paiementId));

        // Suppression d'éventuelles affectations antérieures (idempotence / recalcul)
        List<AffectationPaiement> existantes = affectationPaiementRepository.findByPaiementId(paiementId);
        affectationPaiementRepository.deleteAll(existantes);

        List<AffectationPaiement> nouvellesAffectations = new ArrayList<>();

        // Règle [V] : Tant que la règle de ventilation n'est pas arbitrée par le DAF,
        // affectation intégrale à COOPERATIVE avec avertissement consigné.
        log.warn("AVERTISSEMENT [V] : Règle de ventilation REPARTITION_VERSEMENT en statut [V]. Affectation unique appliquée.");

        ComposanteAffectation composante = composanteAffectationRepository.findByCode("COOPERATIVE")
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Composante COOPERATIVE"));

        AffectationPaiement affectation = new AffectationPaiement();
        affectation.setPaiement(paiement);
        affectation.setComposante(composante);
        affectation.setMontant(paiement.getMontant());
        affectation.setRegleAppliquee("PAR_DEFAUT_COOPERATIVE_REGLE_V");
        affectation.setCreePar(auteur.getIdentifiant());

        nouvellesAffectations.add(affectationPaiementRepository.save(affectation));

        // Contrôle de l'invariant financier
        verifierInvariant(paiementId);

        return nouvellesAffectations.stream().map(a -> new AffectationDto(
                a.getId(),
                a.getComposante().getCode(),
                a.getComposante().getLibelle(),
                a.getMontant(),
                a.getRegleAppliquee()
        )).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public void verifierInvariant(UUID paiementId) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Paiement", paiementId));

        BigDecimal sommeAffectations = affectationPaiementRepository.findByPaiementId(paiementId)
                .stream()
                .map(AffectationPaiement::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (!Montants.estEgal(paiement.getMontant(), sommeAffectations)) {
            throw new ExceptionMetier("INVARIANT_FINANCIER_VIOLE",
                    String.format("La somme des affectations (%s) ne correspond pas au montant du paiement (%s).",
                            sommeAffectations, paiement.getMontant()));
        }
    }
}
