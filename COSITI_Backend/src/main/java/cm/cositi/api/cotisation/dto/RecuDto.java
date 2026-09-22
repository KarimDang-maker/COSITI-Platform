package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record RecuDto(UUID paiementId, String numeroRecu, UUID adherentId, BigDecimal montant,
                       LocalDate datePaiement, String modePaiement, StatutPaiement statut) {
    public static RecuDto depuis(Paiement p) {
        return new RecuDto(p.getId(), p.getNumeroRecu(), p.getAdherentId(), p.getMontant(), p.getDatePaiement(),
                p.getModePaiement(), p.getStatut());
    }
}
