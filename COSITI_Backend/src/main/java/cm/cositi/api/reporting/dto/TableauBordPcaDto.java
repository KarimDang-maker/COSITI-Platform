package cm.cositi.api.reporting.dto;

import java.util.List;

/**
 * Tableau de bord du PCA (Roles des acteurs.md §3) : supervision globale et réception des rapports DAF.
 * Lecture seule — le PCA ne déclenche aucune opération depuis son dashboard.
 */
public record TableauBordPcaDto(
        List<IndicateurCle> indicateurs,
        List<LigneZone> zones,
        List<Alerte> alertes,
        long rapportsDafDisponibles,
        List<String> avertissements
) {
}
