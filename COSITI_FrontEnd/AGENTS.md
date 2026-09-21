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

La codebase précédente a été supprimée (commit `c2ee38d`) : le frontend repart
d'un gabarit Vite vierge, pour une reconstruction écran par écran.

| Existe aujourd'hui | Reste à faire |
|---|---|
| Design system complet : jetons, teintes, statuts, formatage, contrats de composants | Installer la couche Tailwind + shadcn (`docs/02_DESIGN_SYSTEM.md` §15) |
| `src/components/ui/` et `src/components/cositi/` avec leurs contrats | Écrire les primitives et les composants métier |
| `components.json` (config shadcn) | Couche d'accès API, authentification, routage, gardes de permission |
| | Reconstituer les documents `01`, `03`, `04`, `05` du pack (§6) |

Convention d'arborescence en vigueur, en attendant la réécriture de
`docs/01_ARCHITECTURE.md` : `src/components/ui/` pour les primitives shadcn
(régénérables par la CLI, noms en anglais) et `src/components/cositi/` pour les
composants métier (écrits à la main, noms en français). Chaque dossier porte
son contrat dans son `README.md`.

## 4. Stack

| Élément | Choix | Statut |
|---|---|---|
| Bibliothèque | React 19 | installé |
| Langage | TypeScript 6.x, mode strict | installé |
| Build | Vite 8 | installé |
| Qualité | oxlint | installé |
| Style | Tailwind CSS v4 + jetons maison (`docs/02_DESIGN_SYSTEM.md`) | [A] |
| Composants de base | shadcn/ui + CVA, adaptés aux jetons COSITI | [A] |
| Icônes | lucide-react | [A] |
| Routage | React Router | [A] |
| Données serveur | TanStack Query | [A] |
| Formulaires | React Hook Form + Zod | [A] |
| Tables | TanStack Table | [A] |
| Graphiques | Recharts | [A] |
| Tests | Vitest, Testing Library, MSW, Playwright (parcours critiques) | [A] |

Tout ce qui est marqué **[A]** passe la procédure de vérification des paquets
et est consigné dans `docs/journal-dependances.md` **avant** installation.

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
| `docs/01_ARCHITECTURE.md` | Arborescence, couches, état, conventions de composants | à reconstituer |
| `docs/03_SPECIFICATIONS_ECRANS.md` | Écran par écran : contenu, actions, états, permissions | à reconstituer |
| `docs/04_SECURITE.md` | Jetons, XSS, CSP, permissions, données sensibles | à reconstituer |
| `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` | Procédure de vérification des paquets npm | à reconstituer |
| `docs/journal-dependances.md` | Journal des dépendances vérifiées | à reconstituer |
| `COSITI_branding_pack/COSITI_charte_graphique.md` | **Charte graphique — fait foi sur la marque** | présent |
| `../Conception/Roles des acteurs.md` | **Référentiel fonctionnel des 8 acteurs V1 — fait foi en cas d'écart avec ce pack** | présent |
| `../Conception/JALONS_PROJET_COSITI.md` | Détail des jalons et critère de passage | présent |
| `../Conception/SUIVI_EXECUTION.md` | Avancement réel, à mettre à jour à chaque livraison | présent |
| `../COSITI_Backend/docs/03_SPECIFICATIONS_API.md` | Endpoints, formats, erreurs, pagination | présent |

Les documents marqués « à reconstituer » ont été supprimés avec l'ancienne
codebase. Tant qu'ils n'existent pas, ne pas inventer leur contenu : appliquer
la règle 10.

Le contrat d'API fait foi : `GET /api/v1/openapi` (springdoc). En cas d'écart
entre ce pack et l'API réelle, signaler — ne pas contourner côté client.

## 8. Entretien de ce fichier

Toute nouvelle règle d'architecture, toute dépendance validée, toute convention
actée se reporte ici **dans le même lot de travail** que le code correspondant.
Un `AGENTS.md` qui décrit un état passé fait prendre de mauvaises décisions
avec assurance.
