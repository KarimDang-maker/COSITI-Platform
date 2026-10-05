package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.OrigineRepartition;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record PaiementDto(
        UUID id,
        UUID adherentId,
        String numeroRecu,
        LocalDate datePaiement,
        BigDecimal montant,
        String modePaiement,
        String referenceTransaction,
        String typePaiement,
        UUID agentEncaisseurId,
        StatutPaiement statut,
        UUID validePar,
        /**
         * Identifiant de connexion de l'auteur de la saisie (valeur d'audit {@code cree_par}, jamais un UUID
         * de compte). Exposé pour permettre au frontend de griser le bouton « Valider » pour son propre auteur
         * (docs/04_SECURITE.md : le frontend masque, il ne protège pas — {@code ServicePaiementImpl.valider}
         * reste la seule autorité qui refuse réellement l'auto-validation, avec ou sans ce champ).
         */
        String creePar,
        UUID confirmeParChefId,
        Instant confirmeLe,
        String motifIncoherence,
        /** Rejet définitif (#17) — renseignés uniquement quand {@code statut == REJETE}. */
        String motifRejet,
        UUID rejetePar,
        Instant rejeteLe,
        Instant creeLe,
        Long version,
        /** Répartition enregistrée avec la cotisation (V22) ; nulle pour une cotisation antérieure non reprise. */
        BigDecimal montantSecuriteSociale,
        BigDecimal montantEpargne,
        OrigineRepartition origineRepartition,
        UUID packId
) {
    public static PaiementDto depuis(Paiement p) {
        return new PaiementDto(p.getId(), p.getAdherentId(), p.getNumeroRecu(), p.getDatePaiement(), p.getMontant(),
                p.getModePaiement(), p.getReferenceTransaction(), p.getTypePaiement(), p.getAgentEncaisseurId(),
                p.getStatut(), p.getValidePar(), p.getCreePar(), p.getConfirmeParChefId(), p.getConfirmeLe(),
                p.getMotifIncoherence(), p.getMotifRejet(), p.getRejetePar(), p.getRejeteLe(), p.getCreeLe(),
                p.getVersion(), p.getMontantSecuriteSociale(), p.getMontantEpargne(), p.getOrigineRepartition(),
                p.getPackId());
    }
}
