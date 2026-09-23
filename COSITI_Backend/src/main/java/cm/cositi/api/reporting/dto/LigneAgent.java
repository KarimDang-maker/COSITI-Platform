package cm.cositi.api.reporting.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Activité d'un agent de terrain sur la période.
 *
 * <p>{@code nbAdherentsPortefeuille} vient des affectations ouvertes, {@code montantCollecte} des paiements
 * qu'il a saisis sur la période — pas de ses comptes rendus déclarés, qui sont une autre source et peuvent
 * en différer.</p>
 */
public record LigneAgent(
        UUID agentId,
        String codeAgent,
        String nomComplet,
        String zoneLibelle,
        long nbAdherentsPortefeuille,
        long nbPaiementsSaisis,
        BigDecimal montantCollecte
) {
}
