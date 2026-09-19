# AGENTS.md — API COSITI (Spring Boot)

Fichier lu en premier par tout agent de code intervenant sur ce dépôt. Les détails sont dans `docs/`. Les règles transverses au projet (rôles V1, méthode de sprint, marqueurs [C]/[A]/[V], périmètre exclu) sont dans `CLAUDE.md` à la racine du monorepo — à lire avant celui-ci si ce n'est pas déjà fait.

## 1. Le projet en trois phrases

COSITI COOP-CA est une coopérative camerounaise qui sert d'intermédiaire entre des travailleurs du secteur informel et l'assurance volontaire de la CNPS. Cette API est le cœur d'un système d'information qui remplace des carnets papier et des classeurs Excel, et qui doit rendre traçable la chaîne complète adhésion → cotisation → droits → déclaration CNPS. **On manipule de l'argent réel et des données personnelles sensibles : la traçabilité et la sécurité priment sur la vitesse de livraison.**

Chiffre à garder en tête : sur 172 adhérents, 115 n'ont jamais cotisé. Le taux d'activation est l'indicateur central de toute la plateforme.

## 2. Règles absolues

1. **Ne jamais coder en dur une règle marquée [V]** dans `docs/`. Ces règles ne sont pas validées par la COSITI. Elles vivent dans la table `parametre`, jamais dans une constante Java.
2. **Un paiement est rattaché à un adhérent par identifiant, jamais par nom.** C'est la faiblesse n°1 du système actuel — ne pas la reproduire.
3. **Aucune suppression physique** d'adhérent, de paiement, de document ou de dossier. Archivage logique avec auteur et motif.
4. **Toute autorisation est vérifiée côté serveur**, y compris le périmètre de données (un agent ne voit que son portefeuille, un chef d'agents celui de son équipe). Le frontend masque, il ne protège pas.
5. **Séparation des responsabilités** : l'utilisateur qui saisit ou encaisse ne peut pas valider sa propre opération, à aucun des trois niveaux de la chaîne (agent → chef des agents de terrain → DAF). À vérifier dans le service, pas seulement dans le contrôleur.
6. **Toute opération financière est transactionnelle et journalisée.** Création du paiement + affectation + mise à jour des droits + écriture d'audit forment une seule transaction.
7. **Aucune dépendance ajoutée sans passer la procédure de `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`.** Pas d'exception, même pour un utilitaire trivial.
8. **Aucun secret dans le code ni dans Git.** Variables d'environnement uniquement. `gitleaks` tourne en CI.
9. **Si une information manque, demander — ne pas inventer une règle métier.** Écrire `TODO [V] : question` et signaler.
10. **Le rôle V1 est un des huit rôles définis dans `CLAUDE.md`.** Aucun rôle supprimé (`TELECONSEILLER`, `MARKETING`, `RESP_ZONE`, `RESP_CNPS`) n'est recréé sous quelque forme que ce soit, y compris comme simple libellé d'affichage.
11. **Aucune API n'est inventée pour les besoins listés « contrat à définir/valider »** (désignation du Chef des agents de terrain, attribution d'objectifs, confirmation hiérarchique d'une collecte, remise interne caisse/coffre, signalement d'incohérence — voir `docs/03_SPECIFICATIONS_API.md` §10). Une proposition de contrat peut être rédigée, mais pas codée sans validation explicite.
12. **Aucun connecteur de paiement externe, aucun compte bancaire ni Mobile Money géré depuis la plateforme.** COSITI enregistre des données de paiement, elle n'exécute aucune transaction financière. Voir le périmètre exclu dans `CLAUDE.md`.

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
- La CI doit être verte : compilation, tests, `osv-scanner`, `dependency-check`, `spotbugs` + `find-sec-bugs`, `gitleaks`.

## 5. Sprints (détail dans `CLAUDE.md` et `COSITI_PLAN_SPRINT_V1.md`)

Le séquencement de référence est désormais celui de `COSITI_PLAN_SPRINT_V1.md` (S00 à S12), qui remplace les jalons J1-J12 de `JALONS_PROJET_COSITI.md`.

| Sprint | Contenu backend principal |
|---|---|
| S00 | Cadrage, architecture, base, RBAC — socle technique |
| S01 | Authentification + RBAC serveur |
| S02 | Référentiel adhérents + détection de doublons |
| S03 | Zones, agents, portefeuilles, désignation du Chef des agents de terrain |
| S04 | Paiements/collectes (donnée, jamais de mouvement de fonds) |
| S05 | Contrôle DAF et confirmation hiérarchique des collectes |
| S06 | Droits et régularité |
| S07 | CNPS et documents |
| S08 | Relances et notifications |
| S09 | Tableaux de bord par rôle |
| S10 | Rapports, exports, audit |
| S11 | Administration et durcissement sécurité |
| S12 | Recette E2E et stabilisation |

Un sprint backend n'est déclaré terminé que si son API est documentée, ses permissions vérifiées côté serveur, ses tests passent et son scénario nominal est exécuté — voir les critères de passage dans `CLAUDE.md`. S04 et au-delà peuvent démarrer, mais ne doivent pas figer les règles [V] tant que le DAF n'a pas répondu.

## 6. Documents de référence

| Fichier | Contenu |
|---|---|
| `docs/01_SCHEMA_BDD.md` | Schéma PostgreSQL complet, contraintes, index |
| `docs/02_CLASSES_ET_METHODES.md` | Packages, entités, services, signatures de méthodes |
| `docs/03_SPECIFICATIONS_API.md` | Endpoints REST, formats, erreurs, pagination |
| `docs/04_SECURITE.md` | Authentification, RBAC, chiffrement, OWASP, audit |
| `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` | Procédure de vérification des dépendances |
