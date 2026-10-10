package cm.cositi.api.adherent.dto;

import java.util.UUID;

/** Une activité du référentiel (table `activite`, alimentée par la migration V2). */
public record ActiviteDto(UUID id, String code, String libelle, String categorie) {
}
