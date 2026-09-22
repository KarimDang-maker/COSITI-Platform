package cm.cositi.api.adherent.service;

import java.util.UUID;

public record CritereDoublon(String telephonePrincipal, String numeroCni, String nomComplet, UUID zoneId) {
}
