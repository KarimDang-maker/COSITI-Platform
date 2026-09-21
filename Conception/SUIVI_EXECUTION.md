# SUIVI_EXECUTION — Avancement du projet COSITI V1

Ce fichier est mis à jour par l'agent de code **à chaque avancée réelle** dans le code (pas en avance, pas en intention). Une ligne par jalon, complétée au fil de l'eau. Voir `JALONS_PROJET_COSITI.md` pour le contenu et le critère de passage de chaque jalon.

## Comment mettre à jour ce fichier

1. Au début d'un jalon : passer son statut à `En cours`, renseigner la date de début.
2. À chaque sous-tâche significative livrée (endpoint, écran, migration) : ajouter une ligne dans `Journal détaillé`.
3. Quand le critère de passage du jalon est rempli (voir `JALONS_PROJET_COSITI.md`) : passer le statut à `Terminé`, cocher les tests, renseigner la date de fin.
4. Ne jamais marquer `Terminé` un jalon dont les tests backend ou frontend ne sont pas verts.

## Tableau d'avancement

| Jalon | Statut | Date début | Date fin | Tests backend | Tests frontend | Notes |
|---|---|---|---|---|---|---|
| J0 — Socle | Non démarré | — | — | ☐ | ☐ | |
| J1 — Auth + RBAC | Non démarré | — | — | ☐ | ☐ | |
| J2 — Adhérents | Non démarré | — | — | ☐ | ☐ | |
| J3 — Organisation terrain (DGA/Chef) | Non démarré | — | — | ☐ | ☐ | |
| J4 — Cotisations | Non démarré | — | — | ☐ | ☐ | |
| J5 — Contrôle DAF | Non démarré | — | — | ☐ | ☐ | |
| J6 — Droits et régularité | Non démarré | — | — | ☐ | ☐ | |
| J7 — CNPS + documents | Non démarré | — | — | ☐ | ☐ | |
| J8 — Relances + comptes rendus | Non démarré | — | — | ☐ | ☐ | |
| J9 — Dashboards par rôle | Non démarré | — | — | ☐ | ☐ | |
| J10 — Rapports, exports, audit | Non démarré | — | — | ☐ | ☐ | |
| J11 — Administration + sécurité | Non démarré | — | — | ☐ | ☐ | |
| J12 — Recette E2E + pilote | Non démarré | — | — | ☐ | ☐ | |

## Décisions [A]/[V] en attente

Liste des points marqués `[A]` ou `[V]` dans les packs techniques qui bloquent ou limitent un jalon, à faire confirmer par la COSITI avant de coder la version définitive.

| Point | Jalon concerné | Statut |
|---|---|---|
| Règle de répartition d'un versement (`REPARTITION_VERSEMENT`) | J4 | `[V]` non validé |
| Délai de bascule en retard (`DELAI_RETARD_JOURS`) | J6 | `[V]` non validé |
| Traitement du reliquat non imputé | J6 | `[V]` non validé |
| Assiette CNPS (`revenu_mensuel_declare`) | J7 | `[V]` non validé |
| Contrat API — ajout d'un Agent par la DGA | J3 | `[A]` à valider |
| Contrat API — désignation / remplacement du Chef | J3 | `[A]` à valider |
| Contrat API — compte rendu terrain, consolidation, transmission à la DGA | J8 | `[A]` à valider |
| Contrat API — production et transmission du rapport DAF au PCA | J5 / J10 | `[A]` à valider |
| Objectifs terrain (confirmation du besoin) | J3 / J9 | `[A]` à confirmer |
| Cadre légal camerounais (loi cybersécurité, conservation des données) | J11 | `[V]` — avis juridique requis |

## Journal détaillé

_(vide — à compléter au fil des jalons)_
