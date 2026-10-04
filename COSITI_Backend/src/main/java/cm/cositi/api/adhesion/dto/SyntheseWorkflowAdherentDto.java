package cm.cositi.api.adhesion.dto;

/** Vue d'ensemble du parcours d'un adhérent (§6 {@code workflow-summary}) : activation, frais, contrôle DGA. */
public record SyntheseWorkflowAdherentDto(
        StatutActivationDto activation,
        FraisAdhesionAdherentDto fraisAdhesion,
        ControleDgaDto controleCourant,
        boolean demandeModificationOuverte
) {
}
