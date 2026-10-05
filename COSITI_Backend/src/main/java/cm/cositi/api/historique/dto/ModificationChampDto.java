package cm.cositi.api.historique.dto;

/** Un champ modifié : valeurs avant / après, ou {@code "***"} pour une donnée personnelle sensible. */
public record ModificationChampDto(String champ, Object avant, Object apres, boolean masque) {
}
