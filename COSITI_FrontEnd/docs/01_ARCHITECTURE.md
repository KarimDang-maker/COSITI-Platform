# 01 — Architecture frontend COSITI

Version 1.0 — 22/09/2026. Reconstitué au jalon **J1** (`AGENTS.md §7`), tenu à
jour à chaque jalon suivant dans le même lot de travail que le code
(`AGENTS.md §8`). Ce document décrit l'arborescence réelle et les règles de
couches ; il ne décrit jamais un état futur ou souhaité.

## 1. Arborescence

```
src/
├── api/                  Couche d'accès réseau — instance HTTP unique
│   ├── client.ts          GET/POST/PUT/DELETE, intercepteurs 401/403/409/429
│   ├── erreurs.ts         Forme normalisée ErreurApi + ErreurApiException
│   ├── adherents.ts        Appels + types du domaine « Adhérents » (J2)
│   ├── organisation.ts      Appels + types « Organisation terrain » (J3)
│   └── paiements.ts        Appels + types « Cotisations » (J4)
├── auth/                 Session et permissions
│   ├── jeton.ts            Jeton d'accès en mémoire, jamais localStorage/sessionStorage
│   ├── types.ts             Utilisateur, CodeRole, CodePermission
│   └── ContexteAuth.tsx     AuthProvider, useAuth, usePermission
├── app/                  Coquille applicative et routage
│   ├── App.tsx              Fournisseurs globaux (React Query, Auth, Tooltip, Router)
│   ├── routes.tsx           Déclaration des routes, jalon par jalon
│   └── GardeRoute.tsx        Garde de route (session + permission)
├── ecrans/               Un dossier par domaine fonctionnel, un fichier par écran
│   ├── AccesNonAutorise.tsx
│   ├── connexion/           EcranConnexion, EcranChangerMotDePasse (J1)
│   ├── adherents/           Liste, fiche, nouvel adhérent (J2)
│   ├── organisation/        Zones, agents, portefeuilles, actions DGA (J3)
│   └── cotisations/         Journal, nouveau paiement, détail (J4)
├── components/
│   ├── ui/                 Primitives shadcn — voir `src/components/ui/README.md`
│   └── cositi/              Composants métier — voir `src/components/cositi/README.md`
├── hooks/                Hooks React Query par domaine (`useAdherents`, `usePaiements`, …)
├── lib/                  `utils.ts` (cn), `format.ts`, `statuts.ts` — existants avant J1, ne pas dupliquer
├── styles/               `tokens.css`, `globals.css` — existants avant J1
└── test/                 Infrastructure de test
    ├── setup.ts             jest-dom, cycle de vie du serveur MSW
    ├── rendu.tsx            `rendreAvecProviders` — rendu avec les vrais fournisseurs
    └── msw/                 `serveur.ts` + un `handlers.<domaine>.ts` par domaine + `donnees.ts`
```

## 2. Couches et règles de dépendance

```
ecrans/  →  hooks/  →  api/  →  (fetch, une seule fois : api/client.ts)
  │            │
  └────────────┴──→ components/cositi/  →  components/ui/
```

- `api/*.ts` ne connaît que le contrat HTTP : types de requête/réponse, appels
  via `client`. Aucun JSX, aucune règle d'affichage.
- `hooks/*.ts` encapsule React Query (`useQuery`/`useMutation`) autour de
  `api/*.ts`. Un écran n'appelle jamais `client` directement.
- `ecrans/*` compose des `hooks/` et des `components/cositi/`. Un écran ne
  calcule aucune règle métier (droits, ventilation, permission) — il affiche
  ce que l'API a renvoyé, y compris ses `avertissements`.
- `components/cositi/*` ne fait aucun appel réseau (contrat de
  `src/components/cositi/README.md`) : il reçoit des données en props.
- `components/ui/*` ne connaît rien du métier COSITI (contrat de
  `src/components/ui/README.md`).
- Une seule instance HTTP (`api/client.ts`) : `AGENTS.md` interdit tout
  `fetch` direct ailleurs, y compris dans un hook.

## 3. Session et permissions

- Le jeton d'accès vit en mémoire (`auth/jeton.ts`), jamais dans
  `localStorage` ni `sessionStorage`. Le rafraîchissement passe par un cookie
  `HttpOnly` (`POST /auth/rafraichir`), appelé une fois au montage de
  `AuthProvider` pour reprendre une session après rechargement de page.
- `ContexteAuth.tsx` expose `useAuth()` (session, `connecter`, `deconnecter`,
  `aLaPermission`) et `usePermission(code)` pour un masquage ponctuel dans un
  écran. Aucune permission n'est déduite d'un rôle côté client : la seule
  source est `utilisateur.permissions`, lui-même renvoyé par `GET /auth/moi`.
- `app/GardeRoute.tsx` protège une route : redirection `/connexion` sans
  session, écran « Accès non autorisé » sans la permission déclarée sur la
  route. C'est un confort de navigation, pas une protection — voir
  `docs/04_SECURITE.md`.

## 4. Erreurs API

`api/erreurs.ts` normalise toute réponse en échec vers `ErreurApi` :
`{ code, message, champ?, traceId, avertissements[], statut, details? }`.
`api/client.ts` lève une `ErreurApiException` (implémente `ErreurApi`) sur
toute réponse non `2xx`. `details` porte les champs additionnels d'une
réponse (ex. `candidats` d'un `409 ADHERENT_DOUBLON_POTENTIEL`) : un écran qui
reconnaît un `code` précis peut lire `erreur.details` en le validant lui-même
(le type n'est jamais garanti statiquement, volontairement — la forme vient
du contrat API, pas d'une supposition du client).

## 5. Tests

- **Vitest** + **Testing Library** + **MSW** (interception réseau en mode
  Node, pas de Service Worker navigateur — inutile pour des tests qui ne
  tournent jamais dans un vrai navigateur).
- `src/test/rendu.tsx` fournit `rendreAvecProviders`, qui enveloppe le
  composant testé avec les **vrais** fournisseurs de l'application
  (`QueryClientProvider`, `AuthProvider`, `TooltipProvider`,
  `MemoryRouter`) — jamais un double simplifié qui masquerait une régression
  d'intégration.
- `src/test/msw/serveur.ts` échoue bruyamment (`onUnhandledRequest: "error"`)
  sur toute requête non simulée : aucun test ne suppose qu'un backend réel
  écoute.
- Un test qui a besoin d'un comportement différent du gestionnaire par défaut
  utilise `serveur.use(...)` localement, jamais une modification durable des
  fichiers `handlers.<domaine>.ts` partagés.
- Playwright (parcours E2E critiques) n'est pas installé à l'issue de J1–J4,
  faute de temps dans cette session — voir `Conception/SUIVI_EXECUTION.md`.

## 6. Style

Tailwind CSS v4 branché sur `src/styles/tokens.css` via `src/styles/globals.css`
(`@theme inline`). Aucune valeur de couleur, taille ou rayon en dur dans un
composant — voir `docs/02_DESIGN_SYSTEM.md`, qui fait foi. Aucun mode sombre
en V1 : la variante Tailwind `dark:` est volontairement rebranchée sur une
classe `.dark` qu'aucun composant ne pose jamais (`src/styles/globals.css`),
pour qu'un poste réglé en sombre par son système d'exploitation n'active pas
un thème non conçu.

## 7. Entretien de ce document

Toute nouvelle couche, tout nouveau dossier `ecrans/<domaine>/`, toute
décision d'architecture se reporte ici **dans le même lot de travail** que le
code correspondant (`AGENTS.md §8`). Si une information manque, écrire
`TODO [V]` et signaler — ne pas inventer une convention.
