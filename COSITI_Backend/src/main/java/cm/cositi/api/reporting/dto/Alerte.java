package cm.cositi.api.reporting.dto;

/**
 * Point nécessitant attention, affiché sur les dashboards qui le demandent (UC-PCA-06, UC-DG-08,
 * UC-DGA-11, UC-GC-16).
 *
 * <p>{@code niveau} vaut {@code INFO}, {@code ATTENTION} ou {@code CRITIQUE}. {@code chemin} pointe l'écran
 * qui permet de traiter l'alerte, ou reste nul si aucun écran ne le fait encore — un lien mort serait pire
 * qu'une absence de lien.</p>
 */
public record Alerte(String code, String niveau, String libelle, long nombre, String chemin) {
}
