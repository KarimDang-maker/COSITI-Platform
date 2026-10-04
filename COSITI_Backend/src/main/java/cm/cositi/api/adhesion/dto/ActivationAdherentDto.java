package cm.cositi.api.adhesion.dto;

/**
 * Activation par le Gestionnaire. Corps facultatif.
 *
 * @param versionBase     version du dossier lue avant activation : 409 si elle a changé (facultative)
 * @param ignorerDoublons activation confirmée malgré des doublons potentiels — décision tracée dans l'audit
 */
public record ActivationAdherentDto(
        Long versionBase,
        boolean ignorerDoublons
) {
}
