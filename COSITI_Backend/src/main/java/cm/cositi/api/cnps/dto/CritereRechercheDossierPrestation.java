package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.StatutDossierPrestationCnps;

import java.util.UUID;

/**
 * Filtres de {@code GET /cnps/dossiers-prestation} (§7/§9 du contrat CNPS V2) : rubrique, offre, statut,
 * recherche (matricule/adhérent/n° CNPS). {@code certificatScolarite} reste hors périmètre de cette vague —
 * aucune colonne ne le porte encore, signalé plutôt qu'inventé (voir SUIVI_EXECUTION.md).
 */
public record CritereRechercheDossierPrestation(
        String rubrique,
        UUID offreId,
        StatutDossierPrestationCnps statut,
        String recherche
) {
}
