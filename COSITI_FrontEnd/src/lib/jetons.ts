/**
 * COSITI — Lecture des jetons CSS depuis JavaScript.
 *
 * Recharts pose ses couleurs en attributs SVG (`fill`, `stroke`), qui ne
 * résolvent pas `var(--…)`. Plutôt que de recopier un HEX dans un composant —
 * interdit par `docs/02_DESIGN_SYSTEM.md §1` —, on lit la valeur calculée du
 * jeton au moment du rendu : `src/styles/tokens.css` reste la seule source.
 */

/** Jetons de graphique déclarés dans `tokens.css §5`. */
export type JetonGraphique =
  | "--graphique-serie-1"
  | "--graphique-serie-2"
  | "--graphique-serie-3"
  | "--graphique-grille"
  | "--graphique-axe"
  | "--graphique-survol"
  | "--bordure";

/**
 * Valeur calculée d'un jeton. Hors navigateur (tests jsdom sans feuille de
 * style), renvoie `currentColor` : le graphique se dessine, sans couleur
 * inventée.
 */
export function lireJeton(nom: JetonGraphique): string {
  if (typeof window === "undefined" || typeof document === "undefined") return "currentColor";
  const valeur = getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
  return valeur || "currentColor";
}

/**
 * Valeur calculée de n'importe quelle variable de `tokens.css` — réservé au
 * catalogue du design system, qui affiche les valeurs réelles plutôt que d'en
 * recopier. Chaîne vide hors navigateur.
 */
export function lireVariableCss(nom: `--${string}`): string {
  if (typeof window === "undefined" || typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
}

/** Les trois séries autorisées, dans l'ordre d'attribution. */
export function couleursSeries(): readonly [string, string, string] {
  return [lireJeton("--graphique-serie-1"), lireJeton("--graphique-serie-2"), lireJeton("--graphique-serie-3")];
}
