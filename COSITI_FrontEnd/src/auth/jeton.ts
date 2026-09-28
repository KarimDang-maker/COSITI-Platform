/**
 * COSITI — Jeton d'accès en mémoire.
 *
 * RÈGLE ABSOLUE (`AGENTS.md` règle 3) : le jeton d'accès ne vit **jamais**
 * dans `localStorage` ni `sessionStorage`, qui sont lisibles par tout script
 * injecté (XSS). Il vit en mémoire JS, se perd donc à chaque rechargement de
 * page — c'est voulu : le rafraîchissement au démarrage se fait via le jeton
 * de rafraîchissement porté par un cookie `HttpOnly` (voir `api/client.ts`
 * `rafraichir()` et `auth/ContexteAuth.tsx`, qui appelle `/auth/rafraichir`
 * une fois au montage).
 *
 * Ce module ne connaît rien de React : il expose un petit registre
 * d'écouteurs pour que `ContexteAuth` puisse réagir à une perte de session
 * déclenchée depuis la couche réseau (401 sans rafraîchissement possible).
 */

type Jeton = string | null;
type Ecouteur = () => void;

let jetonAcces: Jeton = null;
const ecouteurs = new Set<Ecouteur>();

/** Définit le jeton d'accès courant (après connexion ou rafraîchissement). */
export function definirJetonAcces(jeton: Jeton): void {
  jetonAcces = jeton;
  for (const ecouteur of ecouteurs) ecouteur();
}

/** Lu uniquement par `api/client.ts` pour construire l'en-tête `Authorization`. */
export function obtenirJetonAcces(): Jeton {
  return jetonAcces;
}

/** Déconnexion, échec de rafraîchissement, ou changement de mot de passe forcé. */
export function effacerJetonAcces(): void {
  definirJetonAcces(null);
}

/** S'abonner aux changements de jeton (ex. mise à jour de l'état React). Renvoie le désabonnement. */
export function surChangementJeton(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur);
  return () => ecouteurs.delete(ecouteur);
}

/** Nom de l'évènement DOM émis quand la session est perdue côté réseau (401 non rattrapable). */
export const EVENEMENT_SESSION_EXPIREE = "cositi:session-expiree";

/** Émis par `api/client.ts` — jamais par un composant directement. */
export function emettreSessionExpiree(): void {
  window.dispatchEvent(new CustomEvent(EVENEMENT_SESSION_EXPIREE));
}
