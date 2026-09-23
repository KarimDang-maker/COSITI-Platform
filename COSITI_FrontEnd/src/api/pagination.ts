/**
 * Enveloppe de liste commune à tous les endpoints paginés
 * (`03_SPECIFICATIONS_API.md §1`). `avertissements` porte les règles `[V]`
 * en jeu sur la liste entière — toujours affiché, jamais ignoré
 * (`docs/02_DESIGN_SYSTEM.md §10`).
 */
export interface EnveloppeListe<T> {
  readonly contenu: readonly T[];
  readonly page: number;
  readonly taille: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly avertissements: readonly string[];
}
