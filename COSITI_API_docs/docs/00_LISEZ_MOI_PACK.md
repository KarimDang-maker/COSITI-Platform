# COSITI — Pack de documentation pour les agents de code

Version 1.1 — 19/09/2026 — mise à jour du modèle de rôles V1 (PCA, SUPER_ADMIN, GESTIONNAIRE_COMPTE, CHEF_AGENT_TERRAIN) et alignement sur `COSITI_PLAN_SPRINT_V1.md`.

Le fichier `CLAUDE.md` à la racine du dépôt regroupe les règles transverses (rôles V1, méthode de sprint, marqueurs [C]/[A]/[V], périmètre exclu). Ce pack en est la traduction technique côté backend ; en cas de doute, `CLAUDE.md` fait foi sur l'organisation du travail, ce pack fait foi sur le détail technique.

Ce pack contient tout ce qu'un agent de code doit avoir en contexte pour travailler sur la plateforme COSITI. Il est découpé en **deux ensembles indépendants** : un agent travaille sur le backend, un autre sur le frontend, sans avoir besoin de lire le pack de l'autre.

## Où déposer les fichiers

```
cositi-api/                     (dépôt backend)
├── AGENTS.md                   ← backend/AGENTS.md
└── docs/
    ├── 01_SCHEMA_BDD.md
    ├── 02_CLASSES_ET_METHODES.md
    ├── 03_SPECIFICATIONS_API.md
    ├── 04_SECURITE.md
    └── 05_DEPENDANCES_CHAINE_LOGICIELLE.md

cositi-web/                     (dépôt frontend)
├── AGENTS.md                   ← frontend/AGENTS.md
└── docs/
    ├── 01_ARCHITECTURE.md
    ├── 02_DESIGN_SYSTEM.md
    ├── 03_SPECIFICATIONS_ECRANS.md
    ├── 04_SECURITE.md
    └── 05_DEPENDANCES_CHAINE_LOGICIELLE.md
```

`AGENTS.md` va à la racine du dépôt : c'est le fichier que l'agent lit en premier. Il renvoie vers `docs/` pour le détail.

## Documents amont (à conserver dans le Drive, pas dans le dépôt)

Ce pack est une traduction technique des documents fonctionnels validés. En cas de contradiction, **le cahier des charges fonctionnel fait foi** :

- `Cahier_des_Charges_Fonctionnel_COSITI.docx` — référence fonctionnelle V1→V4
- `COSITI_Aditif_Cahier_des_Charges_V1_Fonctionnalites_Acteurs.docx`
- `COSITI_V1_Diagrammes_Cas_Utilisation_Flux.docx`
- `Note_Conceptuelle_COSITI.docx`
- `COSITI_Analyse_Fonctionnelle_Complete.docx`
- `COSITI_PLAN_SPRINT_V1.md` — feuille de route de sprint S00 à S12, **remplace** les jalons J1-J12 ci-dessous comme séquencement de référence
- `DOCUMENTATION_SYSTEME_COSITI_V1_ROLES_ET_FONCTIONNALITES.md` — référence des 8 rôles V1 et de la matrice RBAC, **remplace** tout modèle de rôles antérieur (prototype React inclus)
- `JALONS_PROJET_COSITI.md` — jalons J1 à J12 (historique, superseded par `COSITI_PLAN_SPRINT_V1.md`)
- `memory.md` — état à jour du projet

**Rôles V1 (huit, exhaustifs)** : `PCA`, `DG`, `DGA`, `DAF`, `GESTIONNAIRE_COMPTE`, `CHEF_AGENT_TERRAIN`, `AGENT_TERRAIN`, `SUPER_ADMIN`. Les rôles `TELECONSEILLER`, `MARKETING`, `RESP_ZONE`, `RESP_CNPS` (présents dans une version antérieure de ce pack et dans le prototype React existant) sont **supprimés** : ne pas les recréer, ne pas les laisser traîner dans une migration ou un enum. Le Chef des agents de terrain est un Agent de terrain avec des privilèges de supervision ajoutés — pas une entité hiérarchique séparée.

## Conventions de lecture communes aux deux packs

| Marqueur | Sens |
|---|---|
| **[C]** | Confirmé par la COSITI — peut être implémenté tel quel |
| **[A]** | À analyser — proposition technique, à confirmer par le chef de projet |
| **[V]** | À valider par la COSITI (DAF ou direction) — **ne jamais figer en dur dans le code** |

Tout ce qui porte **[V]** doit être implémenté comme paramètre configurable en base ou en configuration, jamais comme constante. Le point bloquant principal reste la décomposition d'un versement (part CNPS / coopérative / épargne).

## Choix techniques

Les stacks indiquées dans les deux packs (Java 21 / Spring Boot 3.3 / PostgreSQL 16 côté API, React 19 / TypeScript / Vite côté web) sont des recommandations marquées **[A]**. Elles doivent être confirmées une fois avant le jalon J1 ; ensuite elles deviennent des contraintes fermes pour les agents.
