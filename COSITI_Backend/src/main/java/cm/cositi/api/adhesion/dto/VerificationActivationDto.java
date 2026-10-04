package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.entite.StatutControleDga;

import java.util.List;
import java.util.UUID;

/**
 * Vérification avant activation (§11) : chaque condition est calculée par le backend, avec son caractère bloquant.
 *
 * @param activable {@code true} si aucune condition bloquante n'échoue
 */
public record VerificationActivationDto(
        UUID adherentId,
        String matricule,
        StatutAdherent statut,
        StatutControleDga statutControleDga,
        boolean dejaActive,
        boolean activable,
        List<Condition> conditions,
        List<String> avertissements
) {
    /**
     * @param code      IDENTITE, STATUT, DOUBLON, DOCUMENTS, FRAIS_ADHESION
     * @param bloquant  {@code true} si l'échec de cette condition empêche l'activation
     */
    public record Condition(String code, String libelle, boolean satisfaite, boolean bloquant, String detail) {
    }
}
