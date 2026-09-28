package cm.cositi.api.reporting.dto;

import java.util.List;

/**
 * Tableau de bord du Gestionnaire des comptes (Roles des acteurs.md §7) : adhérents, CNPS et remontées
 * terrain. Reprend ce que couvrait l'ancienne méthode `cnps()` du pack — la CNPS est un domaine du
 * Gestionnaire, pas un rôle séparé (docs/02_CLASSES_ET_METHODES.md §8).
 */
public record TableauBordGestionnaireDto(
        List<IndicateurCle> indicateurs,
        long dossiersCnpsIncomplets,
        long eligiblesNonImmatricules,
        long declarationsAProduire,
        long comptesRendusAControler,
        long adherentsEnRetard,
        List<Alerte> alertes,
        List<String> avertissements
) {
}
