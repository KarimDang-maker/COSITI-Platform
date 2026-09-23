# COSITI — Pack de documentation pour les agents de code

Version 1.0 — 16/09/2026

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
- `JALONS_PROJET_COSITI.md` — jalons J1 à J12
- `memory.md` — état à jour du projet

## Conventions de lecture communes aux deux packs

| Marqueur | Sens |
|---|---|
| **[C]** | Confirmé par la COSITI — peut être implémenté tel quel |
| **[A]** | À analyser — proposition technique, à confirmer par le chef de projet |
| **[V]** | À valider par la COSITI (DAF ou direction) — **ne jamais figer en dur dans le code** |

Tout ce qui porte **[V]** doit être implémenté comme paramètre configurable en base ou en configuration, jamais comme constante. Le point bloquant principal reste la décomposition d'un versement (part CNPS / coopérative / épargne).

## Choix techniques

Les stacks indiquées dans les deux packs (Java 21 / Spring Boot 3.3 / PostgreSQL 16 côté API, React 19 / TypeScript / Vite côté web) sont des recommandations marquées **[A]**. Elles doivent être confirmées une fois avant le jalon J1 ; ensuite elles deviennent des contraintes fermes pour les agents.
