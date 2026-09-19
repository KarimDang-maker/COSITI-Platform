# AGENTS.md — Interface web COSITI (React)

Fichier lu en premier par tout agent de code intervenant sur ce dépôt. Les détails sont dans `docs/`. Les règles transverses au projet (rôles V1, méthode de sprint, marqueurs [C]/[A]/[V], périmètre exclu) sont dans `CLAUDE.md` à la racine du monorepo — à lire avant celui-ci si ce n'est pas déjà fait.

## 1. Le projet en trois phrases

COSITI COOP-CA est une coopérative camerounaise qui sert d'intermédiaire entre des travailleurs du secteur informel et l'assurance volontaire de la CNPS. Cette interface est le **back-office interne** de la coopérative, pour huit rôles : PCA, DG, DGA, DAF, Gestionnaire des comptes, Chef des agents de terrain, Agent de terrain, Super Administrateur. Elle remplace des carnets papier et des classeurs Excel, et remplace aussi le prototype React existant (`src/` à la racine du dépôt), qui reste une démonstration à un ancien modèle de rôles et ne doit pas servir de référence d'architecture pour la V1.

Une partie des utilisateurs n'est pas à l'aise avec le numérique. **La fiabilité de la saisie prime sur l'esthétique** : on préfère une interface sobre qui empêche une erreur de montant à une interface élégante qui la laisse passer.

## 2. Règles absolues

1. **Le frontend ne protège rien.** Il masque les actions non autorisées pour le confort, mais toute autorisation est décidée par l'API. Ne jamais supposer qu'un contrôle client suffit, ne jamais désactiver un appel serveur « puisque le bouton est caché ».
2. **Aucune règle métier dupliquée côté client.** Calcul des droits, répartition d'un versement, seuils d'éligibilité, statut de régularité : tout vient de l'API. Le client affiche, il ne calcule pas.
3. **Aucun jeton dans `localStorage` ni `sessionStorage`.** Voir `docs/04_SECURITE.md`.
4. **Aucun `dangerouslySetInnerHTML`** sans dérogation écrite et sans assainissement explicite.
5. **Aucune dépendance ajoutée sans passer la procédure de `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`.** L'écosystème npm est la principale surface d'attaque de ce dépôt.
6. **`@types/react` et `@types/react-dom` sont obligatoires dans `package.json`.** Leur absence dans le prototype existant typait tous les imports React en `any` et masquait dix bugs réels. `tsc --noEmit` doit être vert et significatif.
7. **TypeScript en mode strict.** `strict: true`, `noUncheckedIndexedAccess: true`, aucun `any` implicite, aucun `@ts-ignore` sans commentaire justifiant et daté.
8. **Aucun secret, aucune clé d'API dans le code ni dans les variables `VITE_*`** — tout ce qui est préfixé `VITE_` est public dans le bundle.
9. **Si une information manque, demander — ne pas inventer un écran ni une règle.**
10. **Le rôle affiché est un des huit rôles définis dans `CLAUDE.md`.** Aucun rôle supprimé (`Téléconseiller`, `Marketing`, `Responsable de zone`, `Responsable CNPS`) n'apparaît dans un composant, un libellé, une donnée de démonstration ou un contrôle `if (role === …)`.
11. **Aucun écran ni action n'est construit pour les besoins listés « contrat à définir/valider »** (désignation du Chef des agents de terrain, attribution d'objectifs, confirmation hiérarchique d'une collecte, remise interne caisse/coffre, signalement d'incohérence — voir `docs/03_SPECIFICATIONS_ECRANS.md`). Une maquette peut être proposée, pas branchée sur une API qui n'existe pas.
12. **Aucun flux de paiement réel, aucun connecteur Orange Money/MTN MoMo/Wave/carte bancaire.** L'interface saisit des données de paiement déjà survenues sur le terrain ; elle ne déclenche jamais de transaction.

## 3. Stack

| Élément | Choix | Statut |
|---|---|---|
| Bibliothèque | React 19 | [A] |
| Langage | TypeScript 5.x, mode strict | [A] |
| Build | Vite 5 | [A] |
| Routage | React Router 6 | [A] |
| Données serveur | TanStack Query 5 | [A] |
| Formulaires | React Hook Form + Zod | [A] |
| Style | Tailwind CSS avec jetons maison (voir `docs/02_DESIGN_SYSTEM.md`) | [A] |
| Tables | TanStack Table | [A] |
| Graphiques | Recharts | [A] |
| Tests | Vitest, Testing Library, MSW, Playwright (parcours critiques) | [A] |
| Qualité | ESLint (règles `jsx-a11y`, `react-hooks`, `security`), Prettier | [A] |

Pas de bibliothèque de composants lourde imposée. Les composants de base sont écrits dans `src/composants/ui/` selon le système de design.

## 4. Organisation du travail

- Une branche par jalon, une PR par lot fonctionnel.
- Chaque écran livré avec : ses états de chargement, d'erreur et vide, ses tests de rendu et d'interaction principale, et sa vérification d'accessibilité au clavier.
- Commits conventionnels (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `sec:`).
- CI verte obligatoire : `tsc --noEmit`, ESLint, Vitest, `osv-scanner`, `npm audit signatures`, `gitleaks`, build de production.

## 5. Périmètre

**Dans la V1** : le back-office interne complet (12 menus, 15 écrans — voir `docs/03_SPECIFICATIONS_ECRANS.md`).

**Hors V1, prévu V2** : espace membre en libre-service, portail association, application mobile agent avec mode hors ligne. Ces usages consommeront la même API. Ne rien construire pour eux aujourd'hui, mais ne rien construire qui les empêche : pas de logique métier dans les composants, une couche d'accès API isolée et réutilisable.

## 6. Documents de référence

| Fichier | Contenu |
|---|---|
| `docs/01_ARCHITECTURE.md` | Arborescence, couches, état, conventions de composants |
| `docs/02_DESIGN_SYSTEM.md` | Jetons, typographie, couleurs, composants de base |
| `docs/03_SPECIFICATIONS_ECRANS.md` | Écran par écran : contenu, actions, états, permissions |
| `docs/04_SECURITE.md` | Jetons, XSS, CSP, permissions, données sensibles |
| `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` | Procédure de vérification des paquets npm |

Le contrat d'API fait foi : `GET /api/v1/openapi` (springdoc). En cas d'écart entre ce pack et l'API réelle, signaler — ne pas contourner côté client.
