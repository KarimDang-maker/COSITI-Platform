package cm.cositi.api.droits.dto;

import cm.cositi.api.droits.service.StatutRegularite;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Réponse de {@code GET /droits/adherents/{id}} (docs/03_SPECIFICATIONS_API.md §5). {@code avertissements} est
 * une liste de messages, pas un type dédié inventé (cohérent avec {@code ReponsePaginee.avertissements()}).
 */
public record SituationDroitsDto(
        UUID adherentId,
        String matricule,
        LocalDate couvertJusquAu,
        int joursCouvertsTotal,
        int joursRetard,
        BigDecimal cumulCotise,
        BigDecimal soldeAvantSeuil,
        StatutRegularite statut,
        boolean eligibleCnps,
        List<String> avertissements
) {
}
