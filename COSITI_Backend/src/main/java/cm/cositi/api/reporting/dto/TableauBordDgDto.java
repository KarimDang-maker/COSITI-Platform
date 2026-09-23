package cm.cositi.api.reporting.dto;

import java.util.List;

/** Tableau de bord du DG (Roles des acteurs.md §4) : pilotage général, avec le suivi des retards. */
public record TableauBordDgDto(
        List<IndicateurCle> indicateurs,
        List<LigneZone> zones,
        List<Alerte> alertes,
        long adherentsEnRetard,
        List<String> avertissements
) {
}
