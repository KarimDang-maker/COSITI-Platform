# JALONS_PROJET_COSITI — Découpage en jalons V1

**Version : 1.1 — 21 septembre 2026**

Référentiel unique des jalons du projet COSITI V1. Les deux `AGENTS.md` pointent vers ce fichier et constituent les points d'entrée pour le développement.

## Navigation

| Fichier | Rôle |
|---|---|
| [`Roles des acteurs.md`](Roles%20des%20acteurs.md) | **Source de vérité fonctionnelle** — fait foi en cas d'écart |
| [`SUIVI_EXECUTION.md`](SUIVI_EXECUTION.md) | Avancement réel, mis à jour à chaque livraison |
| [`../COSITI_Backend/AGENTS.md`](../COSITI_Backend/AGENTS.md) | Point d'entrée agent backend |
| [`../COSITI_Backend/ARCHITECTURE_BACKEND_COSITI_V1.md`](../COSITI_Backend/ARCHITECTURE_BACKEND_COSITI_V1.md) | Prompt d'architecture backend |
| [`../COSITI_Backend/docs/`](../COSITI_Backend/docs/) | Détails techniques backend (BDD, API, sécurité, dépendances) |
| [`../COSITI_FrontEnd/AGENTS.md`](../COSITI_FrontEnd/AGENTS.md) | Point d'entrée agent frontend |
| [`../COSITI_FrontEnd/PROMPT_ARCHITECTURE_FRONTEND_COSITI_V1.md`](../COSITI_FrontEnd/PROMPT_ARCHITECTURE_FRONTEND_COSITI_V1.md) | Prompt d'architecture frontend |
| [`../COSITI_FrontEnd/docs/`](../COSITI_FrontEnd/docs/) | Détails techniques frontend (Design System) |
| [`../COSITI_FrontEnd/COSITI_branding_pack/COSITI_charte_graphique.md`](../COSITI_FrontEnd/COSITI_branding_pack/COSITI_charte_graphique.md) | Charte graphique — fait foi sur la marque |

La source de vérité fonctionnelle reste **[`Roles des acteurs.md`](Roles%20des%20acteurs.md)**. En cas d'écart entre ce fichier et un pack technique, `Roles des acteurs.md` fait foi.

## Méthode

- Méthode agile : **chaque jalon est un prototype complet et testable**, pas une tranche technique isolée.
- Chaque jalon touche le backend, le frontend, et **livre ses propres tests backend et frontend séparés** (pas de jalon "test" à part — voir `§ Critère de passage`).
- `SUIVI_EXECUTION.md` (même dossier) est mis à jour à chaque avancée réelle dans le code — pas en avance, pas en intention.
- Un jalon n'ouvre pas le suivant tant que son critère de passage n'est pas rempli.

## Critère de passage d'un jalon

Un jalon n'est considéré terminé que si :
- les fonctionnalités prévues sont terminées ;
- le contrat API est documenté et l'endpoint est réel (aucun endpoint fictif) ;
- le modèle de données est cohérent et la migration Flyway est validée ;
- les permissions backend sont testées (rôle autorisé → 200, rôle non autorisé → 403, périmètre étranger → 403) ;
- les erreurs métier sont testées ;
- le frontend est connecté à l'API réelle, sans règle métier dupliquée côté React ;
- l'audit est vérifié pour les opérations concernées ;
- les tests backend **et** frontend sont verts, scénario nominal et scénario d'échec exécutés ;
- aucune fonctionnalité hors périmètre V1 n'a été ajoutée (voir `Roles des acteurs.md §16`).

## Table des jalons

| Jalon | Objectif | Acteurs concernés | Tests requis |
|---|---|---|---|
| **J0** | Socle : projet Spring Boot + React, PostgreSQL/Flyway, CI, contrat OpenAPI initial | — | Smoke test back + front, pipeline CI vert |
| **J1** | Authentification + RBAC serveur (rôles, permissions, périmètre de données) | Super Administrateur (amorçage) | Tests d'autorisation par rôle (back), parcours connexion/déconnexion (front) |
| **J2** | Référentiel adhérents : création, détection de doublon, fiche, recherche | Agent de terrain, Gestionnaire des comptes | Tests unitaires doublon/matricule (back), tests de formulaire et d'états (front) |
| **J3** | Organisation terrain : zones, agents, portefeuilles, **ajout d'un Agent par la DGA**, **désignation du Chef** (historisée) | DGA, Chef des agents de terrain, Agent de terrain | Tests RBAC + historisation (back), tests d'écran organisation (front) |
| **J4** | Cotisations : enregistrement de paiement, référence de transaction, séparation saisie/validation | Agent de terrain, Gestionnaire des comptes | Tests métier financiers (back), tests de formulaire de paiement + idempotence (front) |
| **J5** | Contrôle DAF : vérification, confirmation, signalement d'incohérence | DAF | Tests de séparation des responsabilités (back), tests de la vue DAF (front) |
| **J6** | Droits et régularité : calcul et persistance des périodes, statut de retard | (transverse, alimente tous les dashboards) | Tests de calcul (back, couverture la plus forte), tests d'affichage situation/retards (front) |
| **J7** | CNPS + documents : dossier, pièces, déclaration, stockage sécurisé | Gestionnaire des comptes | Tests de transitions de statut (back), tests d'upload/consultation journalisée (front) |
| **J8** | Relances, notifications, **compte rendu terrain → Gestionnaire → DGA** (consolidation, transmission) | Agent de terrain, Chef, Gestionnaire des comptes, DGA | Tests de workflow (back), tests de file de relance + comptes rendus (front) |
| **J9** | Dashboards par rôle — **strictement les 6 dashboards officiels** : PCA, DG, DGA, DAF, Gestionnaire des comptes, Super Administrateur | PCA, DG, DGA, DAF, Gestionnaire, Super Admin | Tests de périmètre par dashboard (back), tests de rendu des widgets (front) |
| **J10** | Rapports, exports, audit | PCA (rapports DAF), DAF (production), tous (périmètre) | Tests de traçabilité et d'export journalisé (back), tests de génération/téléchargement (front) |
| **J11** | Administration + durcissement sécurité (OWASP, CI sécurité) | Super Administrateur | Suite de sécurité complète back (05_SECURITE) + front (checklist 04_SECURITE) |
| **J12** | Recette E2E, stabilisation, pilote | tous | Parcours E2E obligatoires (`REC-H01` à `REC-H15` de `Roles des acteurs.md §15`) |

## Points d'attention transverses (valables à tout jalon)

1. **Rôles fermés** : seuls `PCA, DG, DGA, DAF, GESTIONNAIRE_COMPTES, CHEF_AGENTS_TERRAIN, AGENT_TERRAIN, ADMIN_SYSTEME` existent en V1. Ne jamais recréer `Téléconseiller`, `Marketing`, `Responsable de zone` ou `Responsable CNPS` (hors périmètre, `Roles des acteurs.md §16`).
2. **Dashboards fermés** : 6 dashboards, jamais un pour le Chef ni pour l'Agent de terrain.
3. **Le Chef des agents de terrain n'est pas un rôle organisationnel autonome** : c'est un Agent de terrain désigné par la DGA, avec des responsabilités de supervision. La désignation doit être une action explicite, auditée, et son remplacement doit conserver l'historique.
4. Les API listées en `Roles des acteurs.md §14` (ajout d'agent, désignation du Chef, compte rendu, consolidation, transmission au DGA, rapport DAF au PCA, historique des responsabilités) sont marquées `[A]` dans les packs techniques : elles doivent être confirmées avant codage, pas inventées.
5. Aucun endpoint non confirmé, aucune règle financière inventée. En cas de doute, marquer `[V]` et demander — jamais coder en dur.
