package cm.cositi.api.cotisation.dto;

import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * {@code provisoire} (RAPORT_V1.md §6.2 point 8) : {@code true} tant que le paiement n'est pas
 * {@code VALIDE}/{@code RAPPROCHE} — le reçu devient définitif au moment de la validation par le DAF,
 * jamais avant. Le champ évite au frontend de dupliquer cette règle métier à partir du statut brut.
 */
public record RecuDto(UUID paiementId, String numeroRecu, UUID adherentId, BigDecimal montant,
                       LocalDate datePaiement, String modePaiement, StatutPaiement statut, boolean provisoire) {
    public static RecuDto depuis(Paiement p) {
        boolean provisoire = p.getStatut() != StatutPaiement.VALIDE && p.getStatut() != StatutPaiement.RAPPROCHE;
        return new RecuDto(p.getId(), p.getNumeroRecu(), p.getAdherentId(), p.getMontant(), p.getDatePaiement(),
                p.getModePaiement(), p.getStatut(), provisoire);
    }
}
