# 04 — Sécurité applicative (backend)

Ce document est contraignant. Une exigence non satisfaite bloque la mise en production, pas seulement la revue de code.

## 1. Cadre de référence

| Référentiel | Usage dans le projet |
|---|---|
| OWASP Top 10 (2021) | Grille de revue obligatoire à chaque PR touchant à l'authentification, aux données personnelles ou à l'argent |
| OWASP API Security Top 10 (2023) | Référence principale — l'API est la surface d'attaque réelle |
| OWASP ASVS niveau 2 | Niveau cible pour une application manipulant des flux financiers |
| OWASP Cheat Sheets (JWT, Password Storage, Logging, File Upload) | Référence d'implémentation |
| NIST SP 800-63B | Politique de mots de passe |
| CIS Benchmarks (PostgreSQL, Docker) | Durcissement de l'infrastructure |

**Cadre légal camerounais [V — à faire confirmer par un juriste avant la mise en production]** : la loi n° 2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité au Cameroun, et les attributions de l'ANTIC, s'appliquent au traitement. Il faut faire vérifier par un conseil juridique local : le régime applicable aux données personnelles collectées (CNI, actes de naissance, données de cotisation), les obligations de confidentialité attachées aux données transmises à la CNPS, et la durée légale de conservation des pièces comptables et sociales. Ne pas improviser sur ce point : le formulaire d'adhésion doit porter une mention d'information dont la rédaction relève du conseil juridique, pas de l'équipe technique.

## 2. Authentification

| Exigence | Mise en œuvre |
|---|---|
| Stockage des mots de passe | Argon2id (paramètres OWASP) ou BCrypt coût ≥ 12. Jamais de MD5, SHA-1, SHA-256 nu |
| Politique de mot de passe | Longueur minimale 12, pas de complexité imposée arbitrairement, rejet par liste de mots de passe compromis (NIST SP 800-63B) |
| Codes universels | **Interdits.** Le prototype existant utilisait `0000`/`1111` affichés en clair : ne jamais reproduire, sous aucun prétexte, même en développement |
| Comptes de test | Aucun compte par défaut en base. Le premier administrateur est créé par une commande d'amorçage exigeant un mot de passe fourni |
| Verrouillage | 5 échecs → verrouillage temporaire exponentiel, journalisé |
| MFA | TOTP obligatoire pour `PCA`, `DG`, `DGA`, `DAF`, `ADMIN_SYSTEME` (accès à des données globales ou financières consolidées) ; recommandé pour `GESTIONNAIRE_COMPTES` et `CHEF_AGENTS_TERRAIN` [A] |
| Jeton d'accès | JWT signé, durée 15 minutes, algorithme RS256 ou ES256. **`alg: none` et HS256 avec clé faible explicitement refusés** |
| Jeton de rafraîchissement | Opaque, stocké haché en base, rotation à chaque usage, détection de réutilisation → révocation de toute la famille de jetons |
| Contenu du JWT | `sub`, `iat`, `exp`, `jti`, rôles. **Aucune donnée personnelle**, aucun secret |
| Révocation | Liste de `jti` révoqués en cache, consultée par le filtre |
| Sessions | Sans état côté serveur (`SessionCreationPolicy.STATELESS`) |

## 3. Autorisation

Trois niveaux, tous obligatoires — l'un ne remplace pas l'autre.

1. **Niveau route** — `SecurityFilterChain` : aucune route n'est publique par défaut. Liste blanche explicite (`/auth/connexion`, `/auth/rafraichir`, santé interne).
2. **Niveau méthode** — `@PreAuthorize("hasAuthority('PAIEMENT:VALIDER')")` sur les méthodes de service, pas seulement sur les contrôleurs.
3. **Niveau donnée** — `ServicePerimetreDonnees`, appelé pour toute lecture unitaire et toute liste. C'est la protection contre l'accès indirect à un objet (un agent qui demande l'adhérent d'un autre portefeuille en devinant un identifiant).

```java
@PreAuthorize("hasAuthority('ADHERENT:LIRE')")
public AdherentDetailDto consulter(UUID id, Utilisateur demandeur) {
    perimetre.verifierAccesAdherent(demandeur, id);   // jamais facultatif
    ...
}
```

Séparation des responsabilités, vérifiée dans le service :
- Le créateur d'un paiement ne peut pas le valider.
- L'agent d'une remise de caisse ne peut pas la réceptionner.
- L'administrateur système n'a pas d'accès métier courant aux données nominatives ; ses accès exceptionnels sont journalisés et notifiés.

Tests obligatoires : pour chaque endpoint, un test « rôle autorisé → 200 » et un test « rôle non autorisé → 403 ». Pour chaque endpoint portant un identifiant, un test « périmètre étranger → 403 ». Une route non couverte par ces tests est considérée comme non livrable.

## 4. Protection des données

| Donnée | Traitement |
|---|---|
| Mot de passe | Haché, jamais déchiffrable, jamais journalisé |
| CNI, actes de naissance | Chiffrés au repos (AES-256-GCM, clé en gestionnaire de secrets, rotation prévue) |
| Numéro de téléphone | En clair en base (nécessaire au métier), **masqué dans les réponses de recherche de doublon et dans les journaux** |
| Secret MFA | Chiffré en base |
| Sauvegardes | Chiffrées, restauration testée réellement au moins une fois avant la mise en production |
| Exports | Journalisés, limités par le périmètre du demandeur, jamais de fichier laissé sur disque après téléchargement |

Annotation maison `@DonneeSensible` sur les champs concernés : le sérialiseur d'audit et l'appender de logs la respectent. Un champ sensible qui apparaît en clair dans un log est un incident, pas un détail.

## 5. Entrées, requêtes et injections

| Risque | Mesure |
|---|---|
| Injection SQL | JPA avec paramètres liés uniquement. Aucune concaténation de chaîne dans une requête, y compris pour un `ORDER BY` — le tri passe par une liste blanche de colonnes |
| Injection dans les recherches | `pg_trgm` via requête paramétrée, jamais d'interpolation du terme de recherche |
| Validation | Bean Validation sur tous les DTO d'entrée. Validation aussi côté service, car un service peut être appelé hors contrôleur |
| Affectation de masse | **Les entités JPA ne sont jamais exposées ni liées directement à une requête HTTP.** DTO d'entrée dédiés, champs explicites |
| Désérialisation | Jackson configuré avec `FAIL_ON_UNKNOWN_PROPERTIES = true`, typage polymorphe désactivé |
| Téléversement | Taille limitée, type vérifié par signature binaire, nom régénéré, analyse antivirus, stockage hors racine web |
| SSRF | Aucun appel sortant piloté par une URL fournie par l'utilisateur. Les intégrations externes futures passent par une liste blanche de domaines |
| XXE | Traitement XML désactivé ; si un jour nécessaire, parseurs durcis |
| Journalisation | Pas de concaténation de saisie utilisateur dans les logs sans neutralisation des retours à la ligne |

## 6. Configuration Spring Security

Points structurants attendus dans `SecurityConfig` :

- `csrf` : désactivé **uniquement** parce que l'API est sans état et authentifiée par en-tête `Authorization`. Si un jour un cookie de session est introduit, la protection CSRF redevient obligatoire.
- `cors` : liste blanche d'origines par environnement, jamais `*`, `allowCredentials` cohérent avec le mode d'authentification retenu.
- En-têtes de réponse : `Strict-Transport-Security` (HSTS, `max-age` ≥ 1 an), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'` sur les réponses de l'API, `Cache-Control: no-store` sur toute réponse contenant des données personnelles.
- `exceptionHandling` : `401` et `403` renvoyés en JSON normalisé, sans divulguer si un identifiant existe.
- TLS obligatoire de bout en bout ; HTTP redirigé, jamais servi.
- `server.error.include-stacktrace: never`, `include-message: never` en production.
- Bannières et versions masquées (`server.server-header` retiré).

## 7. Robustesse des opérations financières

| Exigence | Mise en œuvre |
|---|---|
| Atomicité | Paiement + affectation + périodes de droits + audit dans une seule `@Transactional` |
| Idempotence | `Idempotency-Key` sur la création de paiement, contrainte d'unicité en base |
| Concurrence | Verrou optimiste (`@Version`) sur adhérent, paiement, dossier CNPS ; conflit → `409` avec message métier |
| Arithmétique | `BigDecimal` exclusivement, arrondi explicite (`RoundingMode.DOWN` pour les jours couverts), jamais de `double` |
| Invariants | Somme des affectations = montant du paiement, vérifiée en transaction et re-vérifiée par le contrôle nocturne |
| Irréversibilité | Aucune suppression physique, aucune purge d'audit exposée dans l'API |

## 8. Journalisation et détection

À journaliser systématiquement : connexions réussies et échouées, refus d'autorisation, création et validation de paiement, annulation et correction, changement de rôle ou de permission, modification de paramètre, consultation et téléchargement de pièce d'identité, export.

À ne jamais journaliser : mot de passe, jeton, secret MFA, numéro de CNI complet, contenu d'un document.

Alertes à mettre en place [A] : pic d'échecs d'authentification, refus d'autorisation répétés pour un même utilisateur, export volumineux hors horaires habituels, écart de remise de caisse, échec du contrôle de cohérence nocturne.

Format de log structuré (JSON) avec `traceId`, sans données personnelles. Rétention et accès aux logs à définir avec l'exploitant.

## 9. Sécurité de l'infrastructure applicative

- Image Docker basée sur une image minimale, utilisateur non root, système de fichiers en lecture seule sauf répertoire temporaire.
- Aucun secret dans l'image ni dans `application.yml` versionné : variables d'environnement ou gestionnaire de secrets.
- Profils Spring distincts par environnement ; le profil `dev` ne doit jamais pouvoir être activé en production (contrôle au démarrage).
- Base de données : utilisateur applicatif sans droit `SUPERUSER`, sans `DROP`, sans `DELETE` sur `journal_audit`. Migrations exécutées par un utilisateur distinct.
- Connexion base chiffrée (TLS), accès réseau restreint à l'application.
- Sauvegardes chiffrées, testées, avec objectif de perte maximale de données à fixer avec la COSITI [V].

## 10. Contrôles automatisés en intégration continue

| Étape | Outil | Condition de blocage |
|---|---|---|
| Compilation et tests | Maven, JUnit 5, Testcontainers | Échec |
| Analyse statique de sécurité | SpotBugs + plugin `find-sec-bugs` | Nouvelle alerte de niveau haut |
| Analyse de règles | Semgrep (jeu de règles Java/Spring) | Alerte haute |
| Dépendances | `osv-scanner`, OWASP Dependency-Check | Vulnérabilité critique ou élevée — voir `05_DEPENDANCES_CHAINE_LOGICIELLE.md` |
| Secrets | `gitleaks` | Toute détection |
| Image conteneur | `trivy image` | Vulnérabilité critique |
| Couverture | JaCoCo | Seuil non atteint sur les services critiques (droits, paiement, RBAC) |

## 11. Revue de sécurité avant mise en production V1

Liste à cocher, signée par le responsable technique :

- [ ] Aucun compte ni code par défaut en base.
- [ ] Tous les endpoints exigent une authentification, sauf la liste blanche documentée.
- [ ] Chaque endpoint a un test d'autorisation positif et négatif, et un test de périmètre de données.
- [ ] Aucune entité JPA exposée en entrée d'API.
- [ ] Pièces d'identité chiffrées au repos, accès journalisé.
- [ ] Journal d'audit non modifiable, droits `UPDATE`/`DELETE` révoqués en base.
- [ ] Séparation saisie / validation vérifiée par des tests.
- [ ] TLS actif, en-têtes de sécurité présents, messages d'erreur sans trace technique.
- [ ] Sauvegarde restaurée avec succès sur un environnement vierge.
- [ ] SBOM généré et archivé pour la version livrée.
- [ ] Aucun secret dans le dépôt (`gitleaks` vert sur tout l'historique).
- [ ] Aucune règle marquée [V] figée en constante dans le code.
