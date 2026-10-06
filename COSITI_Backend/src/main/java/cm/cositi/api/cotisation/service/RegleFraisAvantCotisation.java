package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adhesion.entite.FraisAdhesion;
import cm.cositi.api.adhesion.entite.StatutFraisAdhesion;
import cm.cositi.api.adhesion.repository.FraisAdhesionRepository;
import cm.cositi.api.adhesion.service.ServiceFraisAdhesion;
import cm.cositi.api.commun.exception.ExceptionMetier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.Optional;

/**
 * V23 §5 (décision COSITI du 05/10/2026) : le DAF valide l'encaissement du frais d'adhésion avant toute cotisation.
 *
 * <p>Bloqué : frais enregistré mais non {@code VALIDE} ({@code ENREGISTRE}, {@code ANOMALIE}), ou adhérent
 * {@code PREINSCRIT} sans frais. Non bloqué : adhérent antérieur au frais d'adhésion (aucun frais, déjà activé) —
 * sinon il ne pourrait plus jamais cotiser.</p>
 */
@Component
public class RegleFraisAvantCotisation {

    static final String CODE = "COTISATION_FRAIS_ADHESION_NON_VALIDE";

    private final FraisAdhesionRepository fraisRepository;
    private final ServiceFraisAdhesion serviceFraisAdhesion;

    public RegleFraisAvantCotisation(FraisAdhesionRepository fraisRepository, ServiceFraisAdhesion serviceFraisAdhesion) {
        this.fraisRepository = fraisRepository;
        this.serviceFraisAdhesion = serviceFraisAdhesion;
    }

    /** Motif du blocage, vide si la cotisation est permise. */
    public Optional<String> motifBlocage(Adherent adherent) {
        Optional<FraisAdhesion> frais = fraisRepository.findByAdherentIdAndTypeFrais(adherent.getId(),
                FraisAdhesion.TYPE_ADHESION);
        boolean bloque = frais.map(f -> f.getStatut() != StatutFraisAdhesion.VALIDE)
                .orElse(adherent.getStatut() == StatutAdherent.PREINSCRIT);
        if (!bloque) {
            return Optional.empty();
        }
        return Optional.of("Le frais d'adhésion de " + montant() + " FCFA doit être validé par le DAF avant toute "
                + "cotisation.");
    }

    /** Lève 409 {@code COTISATION_FRAIS_ADHESION_NON_VALIDE} si la cotisation n'est pas permise. */
    public void exiger(Adherent adherent) {
        motifBlocage(adherent).ifPresent(motif -> {
            throw new ExceptionMetier(CODE, motif, HttpStatus.CONFLICT);
        });
    }

    private String montant() {
        BigDecimal montant = serviceFraisAdhesion.montantUnitaire();
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.FRANCE);
        return format.format(montant).replace(' ', ' ').replace(' ', ' ');
    }
}
