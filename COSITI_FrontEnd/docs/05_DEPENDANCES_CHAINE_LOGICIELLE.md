# 05 — Dépendances et chaîne logicielle

Version 1.0 — 21/09/2026

Ce document définit la procédure obligatoire avant d'ajouter **toute**
dépendance npm au projet (`AGENTS.md` règle 5). Il a été reconstitué au début
du reliquat de J0, conformément à `AGENTS.md §7`. Tant qu'une dépendance n'a
pas suivi cette procédure, elle ne s'installe pas — y compris celles listées
dans `docs/02_DESIGN_SYSTEM.md §15` et `AGENTS.md §4`, marquées `[A]`.

L'écosystème npm est la principale surface d'attaque de ce dépôt (`AGENTS.md`
règle 5) : une dépendance de plus est une chaîne de confiance de plus, pas
seulement une fonctionnalité de plus.

## 1. Procédure de vérification (avant `npm install`)

Pour chaque paquet candidat, dans cet ordre :

1. **Nécessité** — le paquet répond-il à un besoin déjà écrit dans
   `AGENTS.md §4` (tableau Stack) ou dans un jalon de
   `Conception/JALONS_PROJET_COSITI.md` ? Si non, ne pas l'ajouter : ouvrir la
   question plutôt que d'installer « au cas où ».
2. **Réputation et maintenance** — `npm view <paquet>` : date de dernière
   publication, nombre de mainteneurs, présence d'un dépôt source public,
   licence compatible (MIT/Apache-2.0/BSD attendues ; toute autre licence est
   signalée avant installation).
3. **Empreinte de la chaîne de dépendances** — `npm install --dry-run` puis
   lecture du nombre de paquets ajoutés (transitifs compris). Un paquet qui
   entraîne une chaîne disproportionnée par rapport au besoin est signalé.
4. **Vulnérabilités connues** — `npm audit` (registre npm) après installation
   réelle dans une branche de travail. En CI (`AGENTS.md §5`), `osv-scanner`
   et `npm audit signatures` complètent ce contrôle avec une base plus large
   et la vérification de provenance des paquets ; ces deux outils ne sont pas
   disponibles dans cet environnement de développement local et restent donc
   des contrôles **CI uniquement** — ne jamais les considérer comme faits
   parce que `npm audit` est vert.
5. **Secrets** — `gitleaks` tourne en CI sur toute la chaîne modifiée
   (`package.json`, `package-lock.json` compris). Aucune clé, jeton ou URL
   interne n'est ajoutée dans ces fichiers.
6. **Consignation** — le résultat (paquet, version, verdict, date, lien vers
   la ligne de `npm audit`) est ajouté à `docs/journal-dependances.md` **avant**
   que le code qui en dépend soit écrit, dans le même lot de travail
   (`AGENTS.md §8`).
7. **`@types/*`** — toute dépendance runtime sans typage natif reçoit son
   paquet `@types/*` dans `devDependencies` dans le même commit (règle 6 de
   `AGENTS.md`, qui a déjà coûté cher une fois sur `@types/react`).

## 2. Critères de refus

- Paquet non maintenu depuis plus de 24 mois sans alternative documentée.
- Paquet à mainteneur unique pour une brique critique (auth, réseau,
  validation) sans alternative sérieuse — signaler, ne pas bloquer
  automatiquement un choix déjà arrêté dans `AGENTS.md §4` (ex. Zod), mais le
  noter dans le journal.
- Vulnérabilité `npm audit` de sévérité `high` ou `critical` sans correctif
  disponible.
- Dépendance qui duplique une brique déjà choisie (ex. une deuxième
  bibliothèque de formulaires) sans décision explicite de remplacement.

## 3. Dépendances déjà actées (`AGENTS.md §4`)

Le tableau ci-dessous est la liste fermée pour J0–J4. Toute dépendance hors de
cette liste, à ce stade du projet, repasse par la procédure du §1 avant
d'être ajoutée — y compris une dépendance transitive optionnelle qu'on
déciderait d'ajouter en direct (ex. `@hookform/resolvers`).

| Paquet | Rôle | Statut avant installation |
|---|---|---|
| `tailwindcss`, `@tailwindcss/vite` | Moteur de style, branché sur `tokens.css` | `[A]` → voir journal |
| `class-variance-authority` (CVA) | Variantes de composants (`buttonVariants`, etc.) | `[A]` → voir journal |
| `clsx`, `tailwind-merge` | Fusion de classes (`cn()` dans `src/lib/utils.ts`) | `[A]` → voir journal |
| `lucide-react` | Icônes | `[A]` → voir journal |
| `shadcn` (CLI, `devDependencies`, usage ponctuel) | Génération des primitives `src/components/ui/` | `[A]` → voir journal |
| `react-router` (v7, API dite "React Router") | Routage, garde de route | `[A]` → voir journal |
| `@tanstack/react-query` | Cache et synchronisation des données serveur | `[A]` → voir journal |
| `react-hook-form` | Gestion de formulaires | `[A]` → voir journal |
| `zod` | Schémas de validation, alignés sur les messages d'erreur API | `[A]` → voir journal |
| `@hookform/resolvers` | Pont React Hook Form ↔ Zod | `[A]` → voir journal |
| `@tanstack/react-table` | Tri/pagination d'affichage des tableaux (le tri/pagination réel restent **serveur**, voir §4 du présent document) | `[A]` → voir journal |
| `recharts` | Graphiques des tableaux de bord (J9+, préparé dès J0) | `[A]` → voir journal |
| `vitest`, `@vitest/coverage-v8` | Exécuteur de tests, couverture | `[A]` → voir journal |
| `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Tests de rendu et d'interaction | `[A]` → voir journal |
| `msw` | Simulation de l'API dans les tests, jamais de suppositions sur un backend qui tourne | `[A]` → voir journal |
| `jsdom` | Environnement DOM pour Vitest | `[A]` → voir journal |
| `playwright` / `@playwright/test` | Parcours critiques E2E (connexion, création adhérent avec doublon) | `[A]` — **non installé cette session**, faute de temps ; voir `journal-dependances.md` et `Conception/SUIVI_EXECUTION.md` |

## 4. Note sur `@tanstack/react-table` et le tri/pagination serveur

`docs/02_DESIGN_SYSTEM.md §9.1` impose un tri et une pagination **serveur**
pour `TableauDonnees` (`?page=&taille=&tri=`). `@tanstack/react-table` est
utilisé en mode « géré manuellement » (`manualPagination: true`,
`manualSorting: true`) : la bibliothèque ne fait que rendre les colonnes et
exposer les gestionnaires de clic d'en-tête, elle ne recalcule ni ne
retrie rien côté client. Ne jamais activer son tri interne : cela dupliquerait
une règle métier côté client (ordre des adhérents en retard, par exemple),
ce qu'interdit `AGENTS.md` règle 2.

## 5. Entretien de ce document

Toute dépendance ajoutée après J4, tout changement de version majeure, toute
dépendance retirée se documente ici et dans `docs/journal-dependances.md`
**dans le même lot de travail** que le code correspondant (`AGENTS.md §8`).
