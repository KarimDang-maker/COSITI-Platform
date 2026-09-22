# AGENTS.md — Interface web COSITI (React)

Fichier lu en premier par tout agent de code intervenant sur ce dépôt. Les
détails sont dans `docs/`.

## 1. Le projet en trois phrases

COSITI COOP-CA est une coopérative camerounaise qui sert d'intermédiaire entre
des travailleurs du secteur informel et l'assurance volontaire de la CNPS.
Cette interface est le **back-office interne** de la coopérative, utilisé par
les 8 acteurs V1 définis dans `../Conception/Roles des acteurs.md` : PCA, DG,
DGA, DAF, Gestionnaire des comptes, Chef des agents de terrain, Agent de
terrain, Super Administrateur. Elle remplace des carnets papier et des
classeurs Excel.

Il n'existe **aucun rôle Téléconseiller, Marketing autonome, Responsable de
zone autonome ou Responsable CNPS autonome en V1** (`Roles des acteurs.md` §16,
hors périmètre) : ne jamais recréer un écran ou une donnée conditionnée par un
de ces rôles.

Une partie des utilisateurs n'est pas à l'aise avec le numérique. **La
fiabilité de la saisie prime sur l'esthétique** : on préfère une interface
sobre qui empêche une erreur de montant à une interface élégante qui la laisse
passer.

## 2. Règles absolues

1. **Le frontend ne protège rien.** Il masque les actions non autorisées pour
   le confort, mais toute autorisation est décidée par l'API. Ne jamais
   supposer qu'un contrôle client suffit, ne jamais désactiver un appel serveur
   « puisque le bouton est caché ».
2. **Aucune règle métier dupliquée côté client.** Calcul des droits,
   répartition d'un versement, seuils d'éligibilité, statut de régularité :
   tout vient de l'API. Le client affiche, il ne calcule pas.
3. **Aucun jeton dans `localStorage` ni `sessionStorage`.** Jeton d'accès en
   mémoire, rafraîchissement par cookie `HttpOnly`.
4. **Aucun `dangerouslySetInnerHTML`** sans dérogation écrite et sans
   assainissement explicite.
5. **Aucune dépendance ajoutée sans passer la procédure de
   `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`.** L'écosystème npm est la
   principale surface d'attaque de ce dépôt.
6. **`@types/react` et `@types/react-dom` sont obligatoires dans
   `package.json`.** Leur absence dans le prototype existant typait tous les
   imports React en `any` et masquait dix bugs réels.
7. **TypeScript en mode strict.** `strict: true`,
   `noUncheckedIndexedAccess: true`, aucun `any` implicite, aucun `@ts-ignore`
   sans commentaire justifiant et daté. `npm run build` doit être vert et
   significatif.
8. **Aucun secret, aucune clé d'API dans le code ni dans les variables
   `VITE_*`** — tout ce qui est préfixé `VITE_` est public dans le bundle.
9. **Aucune valeur de style en dur.** Couleurs, tailles, rayons et espacements
   viennent de `src/styles/tokens.css` ; statuts de `src/lib/statuts.ts` ;
   montants, dates et matricules de `src/lib/format.ts`. Voir
   `docs/02_DESIGN_SYSTEM.md`, qui fait foi sur tout ce qui est visible.
10. **Si une information manque, demander — ne pas inventer un écran ni une
    règle.** Écrire `TODO [V] : question` et signaler.

## 3. État du dépôt

La codebase précédente a été supprimée (commit `c2ee38d`) : le frontend est
reconstruit jalon par jalon. Voir `Conception/SUIVI_EXECUTION.md` pour l'état
réel, jalon par jalon, et le détail des tests.

| Existe aujourd'hui | Reste à faire |
|---|---|
| Design system complet : jetons, teintes, statuts, formatage, contrats de composants | Dashboards (J9), CNPS (J7), relances/comptes rendus (J8) et jalons suivants |
| Tailwind v4 + shadcn/ui + CVA branchés sur les jetons COSITI | Playwright (parcours E2E critiques) — non installé faute de temps, voir `SUIVI_EXECUTION.md` |
| `api/client.ts`, `auth/`, `app/` (routage + garde de route) | CSP effective en production (`docs/04_SECURITE.md §5`, J11) |
| J1 (auth), J2 (adhérents), J3 (organisation terrain), J4 (cotisations) — frontend et backend, voir `SUIVI_EXECUTION.md` | Contrats `[A]` de `03_SPECIFICATIONS_API.md §6` (désignation du Chef) à confirmer formellement par la COSITI ; champ `creePar` manquant sur `PaiementDto` (J4, voir décisions) |
| `docs/01`, `02`, `03`, `04`, `05` et `journal-dependances.md` — tous présents | |

Convention d'arborescence en vigueur (voir `docs/01_ARCHITECTURE.md` pour le
détail complet) : `src/components/ui/` pour les primitives shadcn
(régénérables par la CLI, noms en anglais) et `src/components/cositi/` pour les
composants métier (écrits à la main, noms en français). Chaque dossier porte
son contrat dans son `README.md`. `src/api/`, `src/auth/`, `src/app/`,
`src/ecrans/<domaine>/`, `src/hooks/` et `src/test/` complètent l'arborescence
depuis J1.

## 4. Stack

| Élément | Choix | Statut |
|---|---|---|
| Bibliothèque | React 19 | installé |
| Langage | TypeScript 6.x, mode strict | installé |
| Build | Vite 8 | installé |
| Qualité | oxlint | installé |
| Style | Tailwind CSS v4 + jetons maison (`docs/02_DESIGN_SYSTEM.md`) | installé (J1) |
| Composants de base | shadcn/ui + CVA, adaptés aux jetons COSITI | installé (J1) |
| Icônes | lucide-react | installé (J1) |
| Routage | React Router | installé (J1) |
| Données serveur | TanStack Query | installé (J1) |
| Formulaires | React Hook Form + Zod | installé (J1) |
| Tables | TanStack Table | installé (J1) |
| Graphiques | Recharts | installé (J1), aucun graphique livré avant J9 |
| Tests | Vitest, Testing Library, MSW | installés (J1) |
| Tests E2E | Playwright (parcours critiques) | **non installé** — voir `Conception/SUIVI_EXECUTION.md` |

Toute dépendance passe la procédure de `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`
et est consignée dans `docs/journal-dependances.md` **avant** installation.

## 5. Organisation du travail

- Une branche par jalon, une PR par lot fonctionnel.
- Chaque écran livré avec : ses états de chargement, d'erreur et vide, ses
  tests de rendu et d'interaction principale, et sa vérification
  d'accessibilité au clavier.
- Commits conventionnels (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`,
  `sec:`).
- CI verte obligatoire : `tsc`, oxlint, tests, `osv-scanner`,
  `npm audit signatures`, `gitleaks`, build de production.

## 6. Périmètre

**Dans la V1** : le back-office interne complet (voir
`docs/03_SPECIFICATIONS_ECRANS.md`). Six tableaux de bord exclusivement : PCA,
DG, DGA, DAF, Gestionnaire des comptes, Super Administrateur. Le Chef des
agents de terrain et l'Agent de terrain n'ont **pas** de tableau de bord dédié.

**Hors V1, prévu V2** : espace membre en libre-service, portail association,
application mobile agent avec mode hors ligne. Ces usages consommeront la même
API. Ne rien construire pour eux aujourd'hui, mais ne rien construire qui les
empêche : pas de logique métier dans les composants, une couche d'accès API
isolée et réutilisable.

## 7. Documents de référence

| Fichier | Contenu | Statut |
|---|---|---|
| `docs/02_DESIGN_SYSTEM.md` | Jetons, couleurs, typographie, composants, accessibilité | **présent** |
| `docs/01_ARCHITECTURE.md` | Arborescence, couches, état, conventions de composants | **présent** (reconstitué J1, tenu à jour à chaque jalon) |
| `docs/03_SPECIFICATIONS_ECRANS.md` | Écran par écran : contenu, actions, états, permissions | **présent** (reconstitué à partir de J1, un jalon à la fois) |
| `docs/04_SECURITE.md` | Jetons, XSS, CSP, permissions, données sensibles | **présent** (reconstitué J1) |
| `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` | Procédure de vérification des paquets npm | **présent** (reconstitué J1) |
| `docs/journal-dependances.md` | Journal des dépendances vérifiées | **présent** (reconstitué J1) |
| `COSITI_branding_pack/COSITI_charte_graphique.md` | **Charte graphique — fait foi sur la marque** | présent |
| `../Conception/Roles des acteurs.md` | **Référentiel fonctionnel des 8 acteurs V1 — fait foi en cas d'écart avec ce pack** | présent |
| `../Conception/JALONS_PROJET_COSITI.md` | Détail des jalons et critère de passage | présent |
| `../Conception/SUIVI_EXECUTION.md` | Avancement réel, à mettre à jour à chaque livraison | présent |
| `../COSITI_Backend/docs/03_SPECIFICATIONS_API.md` | Endpoints, formats, erreurs, pagination | présent |

Tous les documents sont désormais présents. `docs/03_SPECIFICATIONS_ECRANS.md`
reste étendu écran par écran, dans le même lot de travail que l'écran livré —
ne jamais y décrire un écran non encore construit. Pour tout contenu qui
manquerait encore à un document, appliquer la règle 10 (`TODO [V]`, signaler,
ne pas inventer).

Le contrat d'API fait foi : `GET /api/v1/openapi` (springdoc). En cas d'écart
entre ce pack et l'API réelle, signaler — ne pas contourner côté client.

## 8. Entretien de ce fichier

Toute nouvelle règle d'architecture, toute dépendance validée, toute convention
actée se reporte ici **dans le même lot de travail** que le code correspondant.
Un `AGENTS.md` qui décrit un état passé fait prendre de mauvaises décisions
avec assurance.
