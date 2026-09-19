package cm.cositi.api.adherent.dto;

public record CritereDoublonDto(
    String telephonePrincipal,
    String numeroCni,
    String nom,
    String prenoms,
    java.util.UUID zoneId
) {}
