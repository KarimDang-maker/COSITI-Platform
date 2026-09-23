# AGENTS.md — API COSITI (Spring Boot)

Fichier lu en premier par tout agent de code intervenant sur ce dépôt. Les détails sont dans `docs/`.

## 1. Le projet en trois phrases

COSITI COOP-CA est une coopérative camerounaise qui sert d'intermédiaire entre des travailleurs du secteur informel et l'assurance volontaire de la CNPS. Cette API est le cœur d'un système d'information qui remplace des carnets papier et des classeurs Excel, et qui doit rendre traçable la chaîne complète adhésion → cotisation → droits → déclaration CNPS. **On manipule de l'argent réel et des données personnelles sensibles : la traçabilité et la sécurité priment sur la vitesse de livraison.**

Chiffre à garder en tête : sur 172 adhérents, 115 n'ont jamais cotisé. Le taux d'activation est l'indicateur central de toute la plateforme.

## 2. Règles absolues

1. **Ne jamais coder en dur une règle marquée [V]** dans `docs/`. Ces règles ne sont pas validées par la COSITI. Elles vivent dans la table `parametre`, jamais dans une constante Java.
2. **Un paiement est rattaché à un adhérent par identifiant, jamais par nom.** C'est la faiblesse n°1 du système actuel — ne pas la reproduire.
3. **Aucune suppression physique** d'adhérent, de paiement, de document ou de dossier. Archivage logique avec auteur et motif.
4. **Toute autorisation est vérifiée côté serveur**, y compris le périmètre de données (un agent ne voit que son portefeuille). Le frontend masque, il ne protège pas.
5. **Séparation des responsabilités** : l'utilisateur qui saisit ou encaisse ne peut pas valider sa propre opération. À vérifier dans le service, pas seulement dans le contrôleur.
6. **Toute opération financière est transactionnelle et journalisée.** Création du paiement + affectation + mise à jour des droits + écriture d'audit forment une seule transaction.
7. **Aucune dépendance ajoutée sans passer la procédure de `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`.** Pas d'exception, même pour un utilitaire trivial.
8. **Aucun secret dans le code ni dans Git.** Variables d'environnement uniquement. `gitleaks` tourne en CI.
9. **Si une information manque, demander — ne pas inventer une règle métier.** Écrire `TODO [V] : question` et signaler.

## 3. Stack

| Élément | Choix | Statut |
|---|---|---|
| Langage | Java 21 (LTS) | [A] |
| Framework | Spring Boot 3.3.x | [A] |
| Sécurité | Spring Security 6 + JWT | [A] |
| Persistance | Spring Data JPA / Hibernate 6 | [A] |
| Base | PostgreSQL 16 | [A] |
| Migrations | Flyway (versionnées, jamais `ddl-auto: update`) | [A] |
| Validation | Bean Validation (Jakarta) | [A] |
| Mapping DTO | MapStruct | [A] |
| Documentation API | springdoc-openapi (OpenAPI 3) | [A] |
| Tests | JUnit 5, Mockito, Testcontainers, RestAssured | [A] |
| Build | Maven | [A] |
| Conteneur | Docker, image distroless ou eclipse-temurin slim | [A] |

`spring.jpa.hibernate.ddl-auto` est fixé à `validate` dans tous les environnements. Le schéma n'est modifié que par Flyway.

## 4. Organisation du travail

- Une branche par jalon, une PR par lot fonctionnel cohérent.
- Aucune PR sans tests. Couverture minimale sur les services métier : calcul des droits, affectation des paiements, contrôle de doublon, RBAC.
- Commits conventionnels (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `sec:`).
- La CI doit être verte : `.github/workflows/ci.yml` (livré au jalon J12) exécute compilation, tests, `npm audit`, `npm audit signatures`, `gitleaks` sur tout l'historique, `osv-scanner` et la recette E2E. `spotbugs` + `find-sec-bugs` et `dependency-check` restent à ajouter au workflow : les plugins Maven correspondants ne sont pas encore déclarés dans le `pom.xml` — signalé dans `../SUIVI_EXECUTION.md` plutôt qu'annoncé comme fait.

## 5. Jalons (détail dans `../JALONS_PROJET_COSITI.md`)

| Jalon | Contenu |
|---|---|
| J0 | Socle : projet, base, Flyway, CI, contrat OpenAPI initial |
| J1 | Authentification, RBAC serveur |
| J2 | Référentiel adhérents + détection de doublons |
| J3 | Zones, agents, portefeuilles, ajout d'agent par la DGA, désignation du Chef |
| J4 | Cotisations : paiement, référence de transaction, affectation |
| J5 | Contrôle DAF |
| J6 | Droits et régularité |
| J7 | CNPS, documents |
| J8 | Relances, notifications, comptes rendus terrain → Gestionnaire → DGA |
| J9 | Tableaux de bord par rôle (les 6 dashboards V1 uniquement) |
| J10 | Rapports, exports, journal d'audit |
| J11 | Administration, durcissement sécurité |
| J12 | Recette E2E, stabilisation, pilote |

Chaque jalon est un prototype complet et testable (backend + frontend), avec son propre critère de passage — voir `../JALONS_PROJET_COSITI.md`. Le suivi d'avancement se fait dans `../SUIVI_EXECUTION.md`, à mettre à jour à chaque avancée réelle dans le code.

**État au 23/09/2026 : les jalons J0 à J12 sont livrés.** Ce qui reste est consigné en décisions `[A]`/`[V]` dans `../SUIVI_EXECUTION.md` — notamment les règles métier non validées par la COSITI (répartition d'un versement, seuil de retard, assiette CNPS, composition d'un dossier), le MFA non implémenté, et les contrats `[A]` livrés mais non formellement validés (ajout d'agent, désignation du Chef, comptes rendus, rapport DAF). **Aucune de ces règles n'est figée en constante dans le code** : elles vivent toutes dans la table `parametre` et sont signalées à l'écran tant qu'elles portent le statut `V`.

### Exécuter les tests

| Contexte | Commande |
|---|---|
| Poste de développement (sans Docker) | `outils/dev/tests-backend.ps1` — recrée `cositi_db_test` sur le PostgreSQL portable et lance la suite |
| CI, ou poste avec Docker | `./mvnw verify` — les tests d'intégration démarrent leur PostgreSQL par Testcontainers |
| Recette E2E (pile complète) | `outils/dev/e2e.ps1 -MotDePasseDemo '<mot de passe démo>'` |

`ConfigurationTestsIntegration` bascule entre les deux modes selon la présence de la propriété `cositi.test.db.url` : aucun code de test ne change.

> **`outils/dev/` n'est pas versionné** (`.gitignore`). Ces scripts portent le mot de passe du cluster PostgreSQL local, et la règle absolue n° 8 interdit tout secret dans Git : chaque poste garde donc les siens. Un clone neuf ne les aura pas. Ce qu'ils font tient en trois étapes reproductibles à la main : recréer une base vierge (`cositi_db_test` ou `cositi_db_e2e`), lancer `mvn test -Dcositi.test.db.url=…` ou démarrer le jar avec `--spring.datasource.url=… --server.port=8083`, puis `npx playwright test` pour la recette. **La CI ne dépend pas de ces scripts** : `.github/workflows/ci.yml` lance l'API et les tests directement.

## 6. Documents de référence

| Fichier | Contenu |
|---|---|
| `docs/01_SCHEMA_BDD.md` | Schéma PostgreSQL complet, contraintes, index |
| `docs/02_CLASSES_ET_METHODES.md` | Packages, entités, services, signatures de méthodes |
| `docs/03_SPECIFICATIONS_API.md` | Endpoints REST, formats, erreurs, pagination |
| `docs/04_SECURITE.md` | Authentification, RBAC, chiffrement, OWASP, audit |
| `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` | Procédure de vérification des dépendances |
| `../Roles des acteurs.md` | **Référentiel fonctionnel des 8 acteurs V1 et de leur chaîne hiérarchique — fait foi en cas d'écart avec ce pack** |
| `../JALONS_PROJET_COSITI.md` | Détail des jalons et critère de passage |

## 7. Les 8 acteurs V1 — rappel

`PCA`, `DG`, `DGA`, `DAF`, `Gestionnaire des comptes`, `Chef des agents de terrain`, `Agent de terrain`, `Super Administrateur`. Aucun autre rôle (pas de Téléconseiller, Marketing, Responsable de zone ou Responsable CNPS — hors périmètre V1). Seuls `PCA, DG, DGA, DAF, Gestionnaire des comptes, Super Administrateur` ont un dashboard dédié. Détail complet dans `../Roles des acteurs.md`.
