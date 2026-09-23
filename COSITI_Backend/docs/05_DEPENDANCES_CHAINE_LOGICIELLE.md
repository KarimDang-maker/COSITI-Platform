# 05 — Dépendances et chaîne logicielle (backend)

Objet : garantir qu'aucune bibliothèque vulnérable, abandonnée, usurpée ou malveillante n'entre dans le produit. Cette procédure est obligatoire pour **toute** dépendance ajoutée, y compris transitive, y compris pour un utilitaire trivial.

## 1. Pourquoi cette exigence est particulière ici

Le prototype existant déclarait trois dépendances jamais importées (`@google/genai`, `express`, `dotenv`) et omettait `@types/react`, ce qui neutralisait silencieusement la vérification de types. Autrement dit : personne ne savait ce qui entrait réellement dans le produit. Sur une plateforme qui manipule de l'argent et des pièces d'identité, une dépendance non maîtrisée est un accès direct à la base.

## 2. Procédure d'ajout d'une dépendance

Aucune dépendance n'est ajoutée sans avoir passé les huit points ci-dessous. Le résultat est consigné dans `docs/journal-dependances.md` (nom, version, motif, date, résultat de chaque point, auteur).

**1. Justifier le besoin.** Est-ce déjà couvert par Spring Boot, la bibliothèque standard Java 21, ou une dépendance déjà présente ? La réponse est souvent oui. Une dépendance de moins est une surface d'attaque de moins.

**2. Vérifier l'identité exacte du paquet.** Coordonnées Maven complètes `groupId:artifactId`, confrontées à la documentation officielle du projet et au dépôt source officiel. C'est le contrôle anti-usurpation : un `groupId` proche mais différent de l'officiel est le vecteur classique. Ne jamais copier des coordonnées depuis un billet de blog, un forum ou une réponse d'IA sans les confronter à la source officielle du projet.

**3. Vérifier la santé du projet.** Dernière publication, fréquence des correctifs, nombre de mainteneurs, existence d'une politique de sécurité (`SECURITY.md`), historique de réponse aux avis. Une bibliothèque sans publication depuis deux ans sur un composant de sécurité est disqualifiée.

**4. Interroger les bases de vulnérabilités.** Avant l'ajout, pas après :
- **OSV** (osv.dev) — agrège les avis, couvre Maven. `osv-scanner --lockfile=pom.xml`.
- **GitHub Advisory Database** — via Dependabot activé sur le dépôt.
- **NVD** — via OWASP Dependency-Check.
- **Sonatype OSS Index** — complémentaire sur l'écosystème Maven.

**5. Vérifier l'absence de signalement de malveillance.** Distinct du point précédent : une bibliothèque peut être exempte de CVE et malveillante. Rechercher le paquet dans les bases d'avis de paquets malveillants (OSV référence des avis `MAL-`), vérifier qu'il n'a pas fait l'objet d'une prise de contrôle de compte mainteneur signalée, et se méfier d'une version publiée hors du rythme habituel du projet.

**6. Vérifier la signature.** Maven Central impose la signature GPG des artefacts publiés. Activer la vérification des sommes de contrôle et des signatures dans la configuration Maven ; un artefact dont la signature ne peut pas être vérifiée n'est pas installé.

**7. Vérifier la licence.** Compatible avec l'usage de la COSITI. Les licences à réciprocité forte sur du code lié statiquement sont à faire arbitrer avant intégration.

**8. Épingler la version.** Version exacte, jamais de plage ni de `LATEST`/`RELEASE`. La montée de version est un acte délibéré, jamais un effet de bord d'un build.

## 3. Configuration Maven obligatoire

Dans `pom.xml`, quatre mécanismes :

**Vérification des sommes de contrôle et des signatures** — `settings.xml` avec `checksumPolicy=fail`, et vérification des signatures des artefacts téléchargés.

**Gestion centralisée des versions** — toutes les versions dans `<dependencyManagement>` ou des propriétés. Aucune version écrite en ligne dans une `<dependency>`.

**`maven-enforcer-plugin`** — règles à activer :
- `requireReleaseDeps` : aucune dépendance `SNAPSHOT` en production.
- `bannedDependencies` : bloque explicitement les bibliothèques connues comme problématiques (`commons-collections:commons-collections` ≤ 3.2.1, `log4j:log4j` 1.x, `org.apache.logging.log4j:log4j-core` < 2.17.1, `com.fasterxml.jackson.core:jackson-databind` < 2.13).
- `dependencyConvergence` : bloque les conflits de version transitive silencieux.
- `requireMavenVersion`, `requireJavaVersion`.

**`owasp dependency-check-maven`** — `failBuildOnCVSS` fixé à 7. Une vulnérabilité de score ≥ 7 casse le build.

**`cyclonedx-maven-plugin`** — génère un SBOM (CycloneDX) à chaque construction. Le SBOM de chaque version livrée est archivé : c'est ce qui permettra, le jour où une vulnérabilité est publiée, de répondre en quelques minutes à « sommes-nous concernés ? ».

## 4. Contrôles en intégration continue

| Contrôle | Commande | Fréquence | Blocage |
|---|---|---|---|
| Vulnérabilités connues | `osv-scanner --lockfile=pom.xml` | Chaque PR | Critique ou élevée |
| Vulnérabilités NVD | `mvn dependency-check:check` | Chaque PR + hebdomadaire | CVSS ≥ 7 |
| Convergence et interdictions | `mvn enforcer:enforce` | Chaque PR | Toute violation |
| Arbre de dépendances | `mvn dependency:tree` archivé | Chaque version | — |
| Dépendances inutilisées et manquantes | `mvn dependency:analyze` | Chaque PR | Dépendance déclarée non utilisée, ou utilisée non déclarée |
| SBOM | `mvn cyclonedx:makeAggregateBom` | Chaque version | Échec de génération |
| Image conteneur | `trivy image --severity HIGH,CRITICAL` | Chaque version | Critique |
| Secrets | `gitleaks detect --no-git` + historique | Chaque PR | Toute détection |
| Mises à jour | Dependabot ou Renovate, regroupées | Hebdomadaire | — |

Le point « dépendance déclarée non utilisée » est volontairement bloquant : c'est exactement le défaut relevé dans le prototype existant.

## 5. Traitement d'une vulnérabilité découverte

| Gravité | Délai de correction | Action |
|---|---|---|
| Critique | 48 h | Correctif ou contournement immédiat, livraison en urgence |
| Élevée | 7 jours | Montée de version planifiée |
| Moyenne | Prochain cycle | À intégrer dans la version suivante |
| Faible | Suivi | Consigné, traité lors d'une montée de version groupée |

Si aucun correctif amont n'existe : évaluer l'exploitabilité réelle dans notre contexte (le composant est-il atteignable depuis une entrée utilisateur ?), documenter la décision dans `docs/journal-dependances.md`, mettre en place un contournement applicatif, et rouvrir le sujet à chaque cycle. Une exception non datée et non signée n'est pas une exception, c'est un oubli.

## 6. Dépendances autorisées d'emblée

Socle validé, ne nécessitant pas de nouvelle procédure (mais soumis aux mêmes contrôles continus) :

`spring-boot-starter-web`, `spring-boot-starter-security`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-boot-starter-actuator`, `spring-boot-starter-cache`, `postgresql`, `flyway-core` + `flyway-database-postgresql`, `mapstruct` + `mapstruct-processor`, `springdoc-openapi-starter-webmvc-ui`, `jjwt` ou `nimbus-jose-jwt` (au choix, un seul), `bucket4j` (limitation de débit), `caffeine`, `logstash-logback-encoder`, `spring-boot-starter-test`, `testcontainers` (postgresql, junit-jupiter), `rest-assured`, `archunit`.

Lombok est optionnel et à trancher une fois pour toutes [A] : il réduit le code répétitif mais ajoute un traitement d'annotations au build. Si retenu, son usage est limité à `@Getter`, `@Setter`, `@Builder`, `@RequiredArgsConstructor` — jamais `@Data` sur une entité JPA (`equals`/`hashCode` générés cassent l'identité Hibernate).

## 7. Interdits explicites

- Toute dépendance ajoutée sans ligne dans `docs/journal-dependances.md`.
- Toute version en plage, `SNAPSHOT`, `LATEST` ou `RELEASE` en production.
- Tout dépôt Maven autre que Maven Central sans validation explicite du responsable technique.
- Toute bibliothèque de cryptographie maison ou peu connue : on utilise JCA, Spring Security, ou Bouncy Castle. **On n'écrit jamais de primitive cryptographique.**
- Toute dépendance dont la fonction est couverte par le socle ci-dessus.
- Toute désactivation d'un contrôle de CI pour « débloquer » une livraison sans exception écrite et datée.

## 8. Journal des dépendances — format

```markdown
## org.example:bibliotheque — 2.4.1
- Date : 2026-09-20 — Auteur : …
- Motif : …
- Alternative écartée : … (raison)
- Identité vérifiée : coordonnées confrontées à https://… (dépôt officiel)
- OSV : aucun avis · Dependency-Check : aucun CVE ≥ 4 · OSS Index : RAS
- Avis de malveillance : aucun (recherche OSV MAL-, historique du mainteneur)
- Signature Maven Central : vérifiée
- Licence : Apache-2.0 — compatible
- Santé du projet : dernière publication 2026-08, 4 mainteneurs, SECURITY.md présent
- Version épinglée : 2.4.1
```
