package cm.cositi.api.reporting.dto;

import java.util.List;

/**
 * Tableau de bord du Super Administrateur (Roles des acteurs.md §10) : utilisateurs, sécurité, audit,
 * paramètres, état technique.
 *
 * <p>Ne contient <b>aucune donnée métier nominative</b> : le Super Administrateur n'a pas d'accès métier
 * courant (docs/04_SECURITE.md §3). Ce sont des compteurs techniques et de sécurité, pas des adhérents ni
 * des montants.</p>
 *
 * <p>{@code parametresNonValides} est le nombre de règles encore marquées `[V]` dans la table
 * {@code parametre} : c'est la dette fonctionnelle du projet, visible là où elle peut être traitée.</p>
 */
public record TableauBordSuperAdminDto(
        List<IndicateurCle> indicateurs,
        long utilisateursActifs,
        long utilisateursVerrouilles,
        long connexionsEchoueesDernieres24h,
        long parametresNonValides,
        long evenementsAuditDernieres24h,
        List<Alerte> alertes,
        List<String> avertissements
) {
}
