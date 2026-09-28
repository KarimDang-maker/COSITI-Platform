package cm.cositi.api.reporting.dto;

import java.util.List;

/**
 * Tableau de bord de la DGA (Roles des acteurs.md §5) : pilotage opérationnel.
 *
 * <p>{@code objectifsTermes} est vide en V1 : les objectifs terrain sont marqués `[A]` (« confirmation du
 * besoin ») dans `Roles des acteurs.md §14`. Le champ existe pour que le contrat n'ait pas à changer quand
 * ils seront confirmés, mais rien n'est calculé à partir d'une règle non validée.</p>
 */
public record TableauBordDgaDto(
        List<IndicateurCle> indicateurs,
        List<LigneZone> zones,
        List<LigneAgent> agents,
        List<Alerte> alertes,
        long comptesRendusConsolidesRecus,
        List<String> objectifsTermes,
        List<String> avertissements
) {
}
