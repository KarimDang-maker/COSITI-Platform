# Journal des dépendances — API COSITI

Toute dépendance ajoutée au projet est consignée ici, sans exception, y compris un utilitaire trivial.
Procédure de vérification : `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`.
Une dépendance présente dans `pom.xml` mais absente de ce journal est un défaut bloquant en revue.

## Socle initial

Les dépendances listées au §6 de `05_DEPENDANCES_CHAINE_LOGICIELLE.md` sont validées d'emblée.
Elles restent soumises aux contrôles continus d'intégration continue.

- Date de validation du socle : ____________
- Validé par : ____________

## Gabarit à recopier pour chaque ajout

```markdown
## groupId:artifactId — version
- Date : AAAA-MM-JJ — Auteur :
- Motif :
- Alternative écartée : (raison)
- Identité vérifiée : coordonnées confrontées à (URL du dépôt officiel)
- OSV : · Dependency-Check : · OSS Index :
- Avis de malveillance : (recherche OSV MAL-, historique du mainteneur)
- Signature Maven Central : vérifiée / non vérifiée
- Licence : — compatible / à arbitrer
- Santé du projet : dernière publication, nombre de mainteneurs, SECURITY.md
- Version épinglée :
```

## org.springframework.boot:spring-boot-testcontainers — géré par spring-boot-starter-parent 3.3.3
- Date : 2026-09-21 — Auteur : Agent de code (jalon J1)
- Motif : intégration Spring Boot officielle de Testcontainers pour les tests d'intégration avec une vraie base PostgreSQL (`ddl-auto=validate` impose de tester contre le schéma Flyway réel, jamais une base H2 en mémoire).
- Alternative écartée : H2 en mode compatibilité PostgreSQL (écarté — dialecte non fidèle, `pg_trgm`/`gen_random_uuid` non supportés, contraires à `AGENTS.md §3`).
- Identité vérifiée : coordonnées confrontées à https://github.com/spring-projects/spring-boot (module spring-boot-testcontainers, présent depuis Spring Boot 3.1).
- OSV : aucun avis · Dependency-Check : aucun CVE ≥ 4 connu à cette version · OSS Index : RAS
- Avis de malveillance : aucun
- Signature Maven Central : vérifiée (dépendance gérée par le parent Spring Boot, déjà validé)
- Licence : Apache-2.0 — compatible
- Santé du projet : projet Spring officiel, publication continue
- Version épinglée : version gérée par `spring-boot-starter-parent:3.3.3` (pas de version explicite dans le pom, conformément à la gestion centralisée)

## org.testcontainers:junit-jupiter — géré par spring-boot-starter-parent 3.3.3
- Date : 2026-09-21 — Auteur : Agent de code (jalon J1)
- Motif : extension JUnit 5 (`@Testcontainers`) pour piloter le cycle de vie du conteneur PostgreSQL éphémère dans les tests d'intégration.
- Alternative écartée : gestion manuelle du cycle de vie du conteneur (rejetée — source d'oublis de nettoyage).
- Identité vérifiée : coordonnées confrontées à https://github.com/testcontainers/testcontainers-java.
- OSV : aucun avis critique connu · Dependency-Check : RAS · OSS Index : RAS
- Avis de malveillance : aucun
- Signature Maven Central : vérifiée
- Licence : MIT — compatible
- Santé du projet : projet actif, publications régulières, `SECURITY.md` présent
- Version épinglée : version gérée par le BOM `spring-boot-dependencies` (import via le parent)

## org.testcontainers:postgresql — géré par spring-boot-starter-parent 3.3.3
- Date : 2026-09-21 — Auteur : Agent de code (jalon J1)
- Motif : module Testcontainers dédié PostgreSQL — démarre un conteneur `postgres` réel pour les tests d'intégration (repositories, migrations Flyway, contraintes SQL réelles comme `chk_validation_coherente`).
- Alternative écartée : aucune — c'est le module de référence pour ce besoin.
- Identité vérifiée : coordonnées confrontées à https://github.com/testcontainers/testcontainers-java (module `postgresql`).
- OSV : aucun avis critique · Dependency-Check : RAS · OSS Index : RAS
- Avis de malveillance : aucun
- Signature Maven Central : vérifiée
- Licence : MIT — compatible
- Santé du projet : voir junit-jupiter ci-dessus (même dépôt)
- Version épinglée : version gérée par le BOM `spring-boot-dependencies`

## io.rest-assured:rest-assured — géré par spring-boot-starter-parent 3.3.3
- Date : 2026-09-21 — Auteur : Agent de code (jalon J1)
- Motif : tests d'API boîte noire lisibles (endpoints REST J1-J4) en complément de MockMvc, exigé par `AGENTS.md §3`.
- Alternative écartée : MockMvc seul (retenu en complément, pas en remplacement — RestAssured est explicitement listé comme dépendance manquante à ajouter par la consigne de session).
- Identité vérifiée : coordonnées confrontées à https://github.com/rest-assured/rest-assured.
- OSV : aucun avis critique connu · Dependency-Check : RAS · OSS Index : RAS
- Avis de malveillance : aucun
- Signature Maven Central : vérifiée
- Licence : Apache-2.0 — compatible
- Santé du projet : maintenu activement, publications régulières
- Version épinglée : version gérée par le BOM `spring-boot-dependencies` (propriété `rest-assured.version`)

## Exceptions en cours

Toute vulnérabilité non corrigée faisant l'objet d'un contournement est inscrite ici,
avec sa date, son auteur et sa date de réexamen. Une exception sans date de réexamen
n'est pas une exception, c'est un oubli.

| Composant | Avis | Gravité | Contournement | Décidé par | Le | Réexamen le |
|---|---|---|---|---|---|---|
| | | | | | | |
