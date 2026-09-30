# 04 — Sécurité frontend COSITI

Version 1.0 — 22/09/2026. Reconstitué au jalon **J1** (`AGENTS.md §7`). Ce
document décrit ce que le frontend fait réellement en matière de sécurité, et
rappelle sans relâche ce qu'il ne fait **jamais** : décider d'une
autorisation. `AGENTS.md` règle 1 fait foi en cas de doute.

## 1. Principe directeur

**Le frontend masque, il ne protège pas.** Tout contrôle client (garde de
route, masquage de bouton, désactivation de champ) est une commodité
d'affichage. L'autorisation réelle est décidée par l'API à chaque requête,
systématiquement. Aucun code de ce dépôt ne doit laisser penser le contraire
— y compris dans un commentaire ou un nom de fonction (`estAutorise`,
`peutModifier`… sont des pièges : ils appellent au raisonnement inverse).

## 2. Jetons

| Jeton | Portée | Stockage |
|---|---|---|
| Jeton d'accès (court) | Autorisation des requêtes API (`Authorization: Bearer …`) | **Mémoire JavaScript uniquement** (`src/auth/jeton.ts`) — jamais `localStorage`, jamais `sessionStorage`, jamais un cookie lisible en JS |
| Jeton de rafraîchissement | Rotation du jeton d'accès (`POST /auth/rafraichir`) | Cookie `HttpOnly`, `Secure`, `SameSite` strict côté serveur — le frontend ne le lit ni ne le manipule jamais, il compte sur `credentials: "include"` |

Conséquence assumée : un rechargement de page perd le jeton d'accès en
mémoire. `AuthProvider` (`src/auth/ContexteAuth.tsx`) rattrape ce cas au
montage par un appel silencieux à `POST /auth/rafraichir` ; s'il échoue,
l'utilisateur retombe sur l'écran de connexion. C'est le compromis attendu
d'un stockage en mémoire (`AGENTS.md` règle 3) : la surface XSS ne peut pas
exfiltrer un jeton qu'elle ne peut pas lire.

## 3. XSS

- Aucun `dangerouslySetInnerHTML` dans le code applicatif (`AGENTS.md` règle
  4). Si un écran futur en a besoin (ex. un contenu enrichi provenant de
  l'API), il passe par une dérogation écrite ici, avec la bibliothèque
  d'assainissement utilisée et son verrou de version.
- Toute donnée provenant de l'API est rendue par React (échappement
  automatique du JSX) — jamais construite en chaîne HTML.
- Le message d'erreur unique de l'écran de connexion (`AGENTS.md` §
  spécification J1) réduit aussi la surface d'énumération de comptes, un
  problème adjacent à l'injection mais du même registre défensif.

## 4. CSRF

Le jeton d'accès en mémoire, envoyé en en-tête `Authorization` (jamais en
cookie), rend une requête API illisible et donc impossible à rejouer par un
site tiers via un formulaire ou une image forgée : sans accès au jeton, un
site tiers ne peut pas construire l'en-tête. Le cookie de rafraîchissement,
lui, doit être `SameSite=Strict` ou `Lax` côté serveur — **hors du périmètre
frontend**, à vérifier dans la configuration backend (`COSITI_Backend`).

## 5. CSP (Content-Security-Policy)

`[A]` — aucune CSP explicite n'est encore posée dans `index.html` ni dans une
configuration de serveur statique de production ; ce dépôt ne contient pas
la configuration du serveur qui servira le build (`vite build`). À faire
avant mise en production, hors périmètre de J1–J4 :
- `default-src 'self'`
- `img-src 'self' data:` (le pack de marque est servi en asset buildé, pas de
  domaine externe)
- `connect-src` limité au(x) domaine(s) réel(s) de l'API COSITI
- pas de `'unsafe-inline'` sur `script-src`

## 6. Permissions et périmètre de données

- `GET /auth/moi` renvoie la liste des permissions effectives ; c'est la
  **seule** source consultée par `usePermission`/`aLaPermission`. Aucune
  table de correspondance rôle → permission n'existe côté frontend
  (`AGENTS.md` règle 1 et règle 2).
- Le périmètre de données (ex. « l'agent ne voit que son portefeuille ») est
  imposé par l'API, qui filtre les réponses de `GET /adherents`,
  `GET /paiements`, etc. L'écran n'ajoute et ne retire aucun filtre côté
  client au nom d'un périmètre supposé.
- Une réponse `403` en cours de session (permission révoquée après la
  connexion, ou périmètre étranger) est transmise telle quelle
  (`ErreurApi`) à l'écran, qui l'affiche — elle n'est jamais interprétée
  comme un bug client à contourner.

## 7. Dépendances

Voir `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` (procédure) et
`docs/journal-dependances.md` (registre). Rappel : l'écosystème npm est la
principale surface d'attaque de ce dépôt (`AGENTS.md` règle 5).

## 8. Secrets et variables `VITE_*`

Aucun secret, aucune clé d'API dans le code ni dans une variable `VITE_*` —
tout ce qui commence par `VITE_` est public dans le bundle final
(`AGENTS.md` règle 8). `VITE_API_BASE_URL` (lu par `src/api/client.ts`) ne
contient qu'une URL de base, jamais un identifiant secret.

## 9. Ce qui reste à durcir (jalon J11)

- CSP effective en production (§5).
- Revue `osv-scanner` / `npm audit signatures` en CI (non exécutables dans
  l'environnement de développement de cette session, voir
  `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md §1.4`).
- Verrouillage de compte après échecs répétés : déjà porté par l'API
  (`03_SPECIFICATIONS_API.md §12`, `CONNEXION_ECHEC`) ; le frontend affiche
  déjà le message `429` de façon générique (§3), rien de plus n'est requis
  côté client.
- Avis juridique camerounais sur la conservation des données (`[V]`, voir
  `Conception/SUIVI_EXECUTION.md`).

## 10. Entretien de ce document

Toute décision de sécurité, tout jeton ajouté, toute CSP effective se reporte
ici **dans le même lot de travail** que le code correspondant
(`AGENTS.md §8`).
