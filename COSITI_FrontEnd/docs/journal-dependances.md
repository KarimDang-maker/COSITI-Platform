# Journal des dépendances — COSITI FrontEnd

Registre des dépendances npm ajoutées, dans l'ordre où la procédure de
`docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` a été appliquée. Une ligne par lot
d'installation, jamais réécrite a posteriori — une dépendance retirée reçoit
une nouvelle ligne « retrait », elle ne disparaît pas du journal.

## 22/09/2026 — Reliquat de J0 : couche Tailwind/shadcn + outillage de test

Vérification (`npm view <paquet> version license time.modified`) : toutes les
dépendances ci-dessous sont sous licence MIT ou Apache-2.0, publiées ou mises
à jour dans les jours précédant l'installation (aucune dépendance abandonnée),
dépôt source public. `npm audit` après installation : **0 vulnérabilité**.
`osv-scanner` et `npm audit signatures` non exécutés (indisponibles dans
l'environnement local de cette session, voir
`docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md §1.4`) — à exécuter en CI avant
toute mise en production.

| Paquet | Version installée | Rôle | Verdict |
|---|---|---|---|
| `tailwindcss` | ^4.3.3 | Moteur de style | Installé |
| `@tailwindcss/vite` | ^4.3.3 | Intégration Vite | Installé |
| `class-variance-authority` | ^0.7.1 | Variantes de composants | Installé |
| `clsx` | ^2.1.1 | Fusion de classes | Installé |
| `tailwind-merge` | ^3.7.0 | Fusion de classes Tailwind (résolution de conflits) | Installé |
| `lucide-react` | ^1.47.0 | Icônes | Installé |
| `react-router` | ^8.4.0 | Routage (API unifiée, ex-"react-router-dom") | Installé |
| `@tanstack/react-query` | ^5.103.2 | Cache et synchronisation des données serveur | Installé |
| `react-hook-form` | ^7.88.0 | Formulaires | Installé |
| `zod` | ^4.6.5 | Schémas de validation | Installé |
| `@hookform/resolvers` | ^5.9.1 | Pont React Hook Form ↔ Zod | Installé |
| `@tanstack/react-table` | ^9.2.4 | Rendu de tableaux (tri/pagination **serveur**, voir `05_DEPENDANCES_CHAINE_LOGICIELLE.md §4`) | Installé |
| `recharts` | ^3.10.1 | Graphiques (préparé pour J9, aucun graphique livré en J1–J4) | Installé |
| `shadcn` (CLI) | ^4.21.0 | Génération des primitives `src/components/ui/` | Installé en `devDependencies`, usage ponctuel |
| `vitest` | ^5.0.1 | Exécuteur de tests | Installé |
| `@vitest/coverage-v8` | ^5.0.1 | Couverture de tests | Installé |
| `jsdom` | ^30.1.0 | Environnement DOM pour Vitest | Installé |
| `@testing-library/react` | ^16.3.3 | Rendu et requêtes de test | Installé |
| `@testing-library/user-event` | ^14.6.7 | Interactions utilisateur simulées | Installé |
| `@testing-library/jest-dom` | ^7.0.1 | Matchers DOM (`toBeInTheDocument`, etc.) | Installé |
| `msw` | ^2.15.0 | Simulation de l'API dans les tests (mode Node, pas de Service Worker navigateur) | Installé — script d'installation (`msw init`) **non exécuté**, voir note ci-dessous |

**Retrait immédiat, dans le même lot** : la CLI `shadcn` a installé de son
propre chef trois paquets non demandés lors de `shadcn add` :
- `cn` (^0.3.2) — package publié par l'équipe shadcn, redondant avec
  `src/lib/utils.ts` déjà spécifié par `docs/02_DESIGN_SYSTEM.md §15.3`.
  **Désinstallé** ; tous les imports générés (`from "cn"`) ont été recâblés
  vers `@/lib/utils` dans le même lot, avec commentaire `/* COSITI: … */` en
  tête de chaque fichier modifié (contrat de `src/components/ui/README.md`).
- `next-themes` (^0.4.6) — bascule de thème clair/sombre. **Désinstallé** :
  `docs/02_DESIGN_SYSTEM.md §2` et `§17` excluent tout mode sombre en V1.
  `src/components/ui/sonner.tsx` a été réécrit pour un thème figé `"light"`.
- `@types/react-router` (^5.1.20, installé manuellement par erreur en même
  temps que l'outillage de test) — paquet de typage historique pour
  React Router v5, obsolète et redondant avec les types natifs livrés par
  `react-router` v8. **Désinstallé**.

**Conservés** (installés par `shadcn add`, légitimes) :
- `radix-ui` (^1.6.7) — primitives accessibles sous-jacentes des composants
  `ui/` (dialog, dropdown, popover, tabs, tooltip…).
- `sonner` (^2.0.8) — notifications transitoires (`ui/sonner.tsx`), usage
  documenté dans `src/components/ui/README.md`.

**Note `allow-scripts`** : l'environnement d'installation bloque par défaut
les scripts d'installation (`npm warn allow-scripts … msw@2.15.0`). Le script
d'installation de `msw` sert uniquement à copier un fichier de Service Worker
pour l'interception réseau **dans un navigateur** ; cette session n'utilise
`msw` qu'en mode Node (`msw/node`, voir `src/test/msw/serveur.ts`) pour les
tests Vitest, où ce fichier n'est d'aucune utilité. Le script n'a donc **pas**
été approuvé. À revoir si un usage navigateur de MSW (ex. Storybook) est
introduit plus tard.

**Playwright** — non installé à cette date, faute de temps. Installé au
jalon J12 : voir l'entrée du 23/09/2026 ci-dessous.

## 23/09/2026 — J12 : installation de Playwright (tests E2E)

Procédure de `05_DEPENDANCES_CHAINE_LOGICIELLE.md §1` suivie **avant**
installation, dans l'ordre :

1. **Nécessité** — oui : `AGENTS.md §4` liste Playwright comme choix E2E du
   projet (statut « non installé » depuis J0), et le jalon J12 exige les
   parcours de recette `REC-H01` à `REC-H15` de `Roles des acteurs.md §15`.
   Ce n'est pas une installation « au cas où » : c'est le critère de passage
   du jalon.
2. **Réputation et maintenance** — `@playwright/test@1.63.0`, éditeur
   Microsoft, licence **Apache-2.0** (compatible), dépôt public
   `github.com/microsoft/playwright`, publications continues.
3. **Empreinte** — `npm install --dry-run` : **3 paquets ajoutés**
   (`@playwright/test`, `playwright`, `playwright-core`), tous du même
   éditeur. Aucune chaîne transitive tierce — empreinte proportionnée au
   besoin.
4. **Vulnérabilités** — `npm audit` après installation réelle : voir la
   ligne de résultat ci-dessous. `osv-scanner` et `npm audit signatures`
   restent des contrôles **CI uniquement**, comme le rappelle `§1.4`, et sont
   désormais exécutés par le workflow ajouté à ce jalon.
5. **Secrets** — aucun jeton ni URL interne ajouté ; les identifiants des
   comptes de démonstration utilisés par les tests E2E viennent de variables
   d'environnement, jamais du dépôt.
6. **Consignation** — la présente entrée, écrite avant le code des tests.
7. **`@types/*`** — sans objet : Playwright expose ses propres types.

**Navigateurs** : seul **Chromium** est téléchargé
(`npx playwright install chromium`). Les trois moteurs auraient représenté
environ 1 Go pour un poste dont le disque est déjà à 97 % d'occupation, et la
V1 est un back-office interne dont le parc n'est pas connu : lancer la
recette sur un moteur unique et documenté vaut mieux que sur trois moteurs
partiellement vérifiés. Firefox et WebKit restent à ajouter en CI si la
COSITI confirme un besoin multi-navigateur.

## 22/09/2026 — J2 : rétrogradation de `@tanstack/react-table`

`@tanstack/react-table@^9.2.4` (installé au reliquat de J0, ligne ci-dessus)
s'est révélé être une réécriture majeure de l'API au moment de l'écrire
réellement dans `src/components/cositi/tableau-donnees.tsx` : plus de
`useReactTable`/`getCoreRowModel` exportés (remplacés par
`createTableHook`/`createCoreRowModel` et un système de « features »
composables), publiée le 28/08/2026 — trop récente et trop peu documentée
pour l'utiliser de façon fiable dans le temps imparti à ce jalon.
**Rétrogradé vers `@tanstack/react-table@8.21.3`** (dernière version majeure
8.x, API stable et documentée : `useReactTable`, `getCoreRowModel`,
`ColumnDef<T>`, `flexRender`). `npm audit` après changement : 0
vulnérabilité. Décision à revisiter si une v9 stabilisée et documentée
apparaît, hors périmètre de cette session.

## Entretien de ce document

Toute dépendance ajoutée, mise à jour en version majeure, ou retirée reçoit
une nouvelle ligne ici **dans le même lot de travail** que le code qui en
dépend (`AGENTS.md §8`).
