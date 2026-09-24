package cm.cositi.api.cnps.dto;

import cm.cositi.api.cnps.entite.HistoriqueDossierPrestationCnps;
import cm.cositi.api.cnps.entite.StatutDossierPrestationCnps;

import java.time.Instant;
import java.util.UUID;

/**
 * Ligne du « journal d'activité du dossier » (RAPORT_V1 §32 du contrat CNPS V2) — jamais une lecture de
 * {@code journal_audit} (réservé {@code AUDIT:CONSULTER}, PCA/Super Administrateur) : cette vue est scopée
 * au seul dossier consulté, exposée par {@code CNPS:LIRE}.
 */
public record HistoriqueDossierPrestationCnpsDto(
        UUID id,
        StatutDossierPrestationCnps statutAvant,
        StatutDossierPrestationCnps statutApres,
        UUID auteurId,
        Instant horodatage,
        String commentaire
) {
    public static HistoriqueDossierPrestationCnpsDto depuis(HistoriqueDossierPrestationCnps h) {
        return new HistoriqueDossierPrestationCnpsDto(h.getId(), h.getStatutAvant(), h.getStatutApres(),
                h.getAuteurId(), h.getHorodatage(), h.getCommentaire());
    }
}
