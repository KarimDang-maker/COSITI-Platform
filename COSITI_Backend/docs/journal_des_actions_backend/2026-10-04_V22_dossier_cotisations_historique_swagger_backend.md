# Journal — Dossier adhérent, cotisations réparties, historiques et corrections Swagger (backend V22)

| | |
|---|---|
| **Date** | 04/10/2026 |
| **Branche** | `feature_root` (non commité) |
| **Source** | `docs/Mise a jour des modules/COSITI_V1_PROMPT_DEVELOPPEMENT_BACKEND_NOUVELLES_SPECIFICITES.md` + `COSITI_FrontEnd/docs/Mise a jour FRONT/COSITI_V1_REGLES_MODULES_01_02_03.md` (règles des 3 modules) |
| **Migration** | `V22__dossier_cotisations_historique_adherent.sql` — **appliquée** sur `cositi_db` (dev) au redémarrage de l'API |
| **Statut** | **416 tests verts / 416** (unitaires + intégration sur PostgreSQL réel). API redémarrée sur le port 8082 avec ce code ; recette Swagger faite (§6). |

---

## 1. Audit avant codage (prompt §4) — matrice des écarts

| Fonction | Existait | À modifier | À créer | Endpoint avant | Risque |
|---|---|---|---|---|---|
| Vue dossier complète | En morceaux (`/{id}`, `/dossier`, `/coordonnees`, `/professionnel`, `/resume-cotisations`) | — | Vue composée | 5 appels | Faible (lecture) |
| Coordonnées WhatsApp / e-mail | Non | Entité, DTO, workflow | 2 colonnes | — | Faible |
| Pack à la création | Obligatoire (`packId`, adhésion ouverte) | Création | — | `POST /adherents` | **Moyen** : le calcul des droits exige une adhésion |
| Recherche par matricule | Oui (`/adherents/matricule/{m}`) | Normalisation casse | Contexte de saisie | idem | Faible |
| Répartition SS / Épargne à la saisie | Non (calculée à la validation seulement) | Paiement, affectation, workflow | 4 colonnes + règle | `POST /paiements` | **Élevé** (financier) |
| Minimum Épargne 300 | Non | — | Paramètre | — | Moyen |
| Idempotence | Clé + UNIQUE | Conflit de requête, concurrence | Empreinte, verrou | `POST /paiements` | **Élevé** |
| Comptes / cumuls backend | Partiel, calculé dans le contrôleur, limité aux 200 dernières cotisations | Oui | Service dédié | `/resume-cotisations` | Moyen |
| Historique général / financier | Un journal brut non paginé, audit technique inclus | Conservé (obsolète) | 2 historiques | `/{id}/historique` | Moyen (fuite DGA/DAF) |
| Filtres temporels | Non | — | Jour/semaine/mois/année/période | — | Faible |
| Swagger | UI blanche, contrat hors `/api/v1/openapi`, 500 sur période illisible | Sécurité, config | — | `/v3/api-docs` | Faible |

---

## 2. Endpoint Swagger — erreurs trouvées et corrigées

Recette faite contre l'API réelle (jetons des 8 rôles, toutes les routes GET, corps invalides sur toutes les écritures).

| # | Erreur | Cause | Correction |
|---|---|---|---|
| S1 | **Swagger UI blanche dans le navigateur** (le serveur répondait pourtant 200) | La CSP de l'API `default-src 'none'` s'appliquait aussi à `/swagger-ui/**` : le navigateur bloquait scripts et feuilles de style | Chaîne de sécurité dédiée (`SecurityConfig.chaineDocumentation`, `@Order(1)`) : CSP limitée à `'self'` (+ `'unsafe-inline'` pour les seuls styles), correspondance Ant (indépendante de Spring MVC) |
| S2 | Contrat absent de `/api/v1/openapi` (source de vérité du prompt et de `docs/03_SPECIFICATIONS_API.md`) | `springdoc.api-docs.path=/v3/api-docs` | `springdoc.api-docs.path=/api/v1/openapi` ; YAML sur `/api/v1/openapi.yaml` (renvoyait 401) |
| S3 | Documentation publique en production (la spec dit « protégée hors développement ») | Routes en `permitAll` dans tous les profils | `cositi.openapi.acces-public` : `true` en dev, `false` en prod (jeton exigé) ; `springdoc.swagger-ui.enabled=false` en prod |
| S4 | **500** sur `GET /agents/{id}/charge?periode=1` et `/cotisations-resume` | `YearMonth.parse` non intercepté | `GestionnaireExceptions` : `DateTimeParseException` → **400 `FORMAT_DATE_INVALIDE`** ; format documenté (`AAAA-MM`) |
| S5 | `Idempotency-Key` documenté « obligatoire » mais `required: false` dans le contrat | Annotation | `@Parameter(required = true)` |

Après correction : 181 routes, aucune référence de schéma cassée, **aucun 500** sur toutes les routes GET pour les 8 rôles, aucun 500 sur corps invalides.

---

## 3. Ce qui a été implémenté

### 3.1 Dossier adhérent (prompt §5, règles module 1)

- **`GET /api/v1/adherents/{id}/dossier-complet`** : identité, informations professionnelles (libellés activité / association), coordonnées, état du dossier (statuts, complétion, documents manquants), comptes Sécurité sociale et Épargne, cumuls, nombre d'événements des deux historiques. Compose les services existants (chacun garde ses contrôles) ; sans `PAIEMENT:LIRE`, la section financière est omise avec un avertissement.
- **WhatsApp et e-mail** (V22, colonnes `whatsapp`, `email` + contrainte de format) dans la création, la modification, la complétion, `PUT /coordonnees`, `AdherentDetailDto`, `CoordonneesAdherentDto` et le workflow de modification (§9). E-mail normalisé en minuscules.

### 3.2 Suppression du pack à la création (prompt §6)

- `CreationAdherentDto.packId` supprimé ; la création n'ouvre plus d'adhésion. Un ancien client qui envoie encore `packId` n'est pas rejeté (propriété ignorée).
- **Le pack se choisit à la première cotisation** : `POST /paiements` accepte `packId`, **obligatoire tant que l'adhérent n'a pas d'adhésion ouverte** (`COTISATION_PACK_REQUIS`). L'adhésion est ouverte à la date d'adhésion, tracée `ADHERENT_CHANGEMENT_PACK`. Un pack différent du pack courant est refusé (`COTISATION_PACK_DIFFERENT`) : le changement garde sa route `POST /adherents/{id}/pack`.
- Anciens dossiers : adhésions conservées telles quelles.

### 3.3 Cotisations (prompt §7 à §11, règles module 2)

- **`GET /api/v1/paiements/contexte-adherent?matricule=`** (`PAIEMENT:CREER` + périmètre) : matricule normalisé et validé (`ADHERENT_MATRICULE_INVALIDE`), 404 si inconnu (matricule `UNIQUE` en base : pas d'ambiguïté), identité de contrôle, pack courant ou à choisir, **minimums en vigueur lus en base**, `cotisable` + motifs de blocage.
- **Répartition enregistrée avec la cotisation** : `montantSecuriteSociale`, `montantEpargne`, `origineRepartition` (`SAISIE` / `PROPOSITION_SERVEUR` / `REPRISE_AFFECTATIONS`), `packId` sur `paiement`.
  - Règle unique `RegleRepartitionCotisation` : total = SS + Épargne ; SS ≥ `MONTANT_MINIMUM_SECURITE_SOCIALE` (700) ; Épargne ≥ `MONTANT_MINIMUM_EPARGNE` (300) quand elle est alimentée ; **aucun plafond** (non défini, signalé).
  - Sans répartition fournie : préférence de l'adhérent, sinon 700 + reste ; la proposition est validée par la même règle et renvoyée.
  - Invariant aussi garanti **en base** (`chk_paiement_repartition_coherente`).
  - À la validation, l'affectation comptabilise **la répartition enregistrée** (revalidée contre les seuils du moment) ; l'ancienne logique reste pour les cotisations antérieures sans répartition.
  - Correction d'un brouillon et demande de correction (workflow DAF) : la répartition se corrige avec le montant ; si le montant change sur une répartition saisie, une nouvelle est exigée (`COTISATION_REPARTITION_REQUISE`).
- **Statuts** : distinction conservée (`BROUILLON`, `A_CONTROLER`, `INCOHERENCE`, `VALIDE`, `RAPPROCHE`, `REJETE`, `ANNULE`) ; rien n'est crédité avant `VALIDE`.
- **Idempotence renforcée** :
  - empreinte SHA-256 de la requête : même clé + même requête → 200 avec la cotisation existante ; même clé + autre requête → **409 `IDEMPOTENCY_KEY_CONFLIT`** ;
  - **soumissions concurrentes** : verrou transactionnel PostgreSQL (`pg_advisory_xact_lock`) sur la clé avant lecture — vérifié avec 4 requêtes simultanées : une seule cotisation créée ;
  - références métier : `numero_recu` (séquence + UNIQUE), `cle_idempotence` UNIQUE, référence de transaction déjà contrôlée.

### 3.4 Comptes et cumuls (prompt §12)

- **`ServiceSyntheseCotisations`** + **`GET /api/v1/adherents/{id}/synthese-cotisations`** (`PAIEMENT:LIRE` + périmètre), agrégations SQL :
  - comptes Sécurité sociale et Épargne : solde validé, part en attente, nombre d'opérations, dernière date ;
  - total, validé, en attente, brouillons, rejets, annulations ;
  - seuil CNPS du pack, cumul imputé, **reste avant seuil**, **taux de progression** (borné, 2 décimales).
- `/resume-cotisations` (existant) ne lit plus seulement les 200 dernières cotisations : montant en attente issu de la synthèse.

### 3.5 Historiques (prompt §13 à §16, règles module 3)

- **`GET /api/v1/adherents/{id}/historique-general`** et **`/historique-financier`**, paginés côté serveur (`page`, `taille` ≤ 200, `direction`), filtres `periode` (`JOUR`, `SEMAINE` ISO, `MOIS`, `ANNEE`) + `date`, ou `du` / `au` inclus, `type` (répétable), `module`.
- Bornes calculées dans le fuseau `Africa/Douala` (`cositi.fuseau-horaire`), intervalle `[début, fin[`.
- Lecture **dérivée du journal d'audit** (une seule trace, pas de double écriture), mais **seuls les événements métier** du `CatalogueEvenementsHistorique` y figurent : connexions, consultations, exports, refus d'accès, jetons, paramètres sont exclus.
- Événements rattachés à l'adhérent via toutes ses entités : dossier, cotisations, affectations, frais d'adhésion, périodes de droits, documents, contrôles DGA, dossiers CNPS (+ pièces), portefeuille, relances, demandes de validation (rangées dans l'historique de leur cible).
- Chaque événement : identifiant, adhérent, acteur, rôles, date/heure, type, catégorie, module, action, résultat, **référence métier** (n° de reçu, FAD-…, référence de demande…), objet, motif, **détails sur liste blanche** (montants, répartition, statut…), **modifications avant/après** — données sensibles (CNI, CNPS, téléphones, WhatsApp, e-mail, date de naissance, GPS) masquées `***`, correlationId.
- `GET /adherents/{id}/historique` (brut) conservé, marqué **obsolète** dans le contrat.

### 3.6 Autorisations (prompt §17, §18)

| Contrôle | Où |
|---|---|
| Permission | `@PreAuthorize` sur chaque service (`ADHERENT:LIRE`, `PAIEMENT:LIRE`, `PAIEMENT:CREER`) |
| Périmètre | `ServicePerimetreDonnees.verifierAccesAdherent` dans chaque service |
| Historique financier | `PAIEMENT:LIRE` ou `FRAIS_ADHESION:LIRE`, sinon 403 `HISTORIQUE_FINANCIER_INACCESSIBLE` |
| Détail du contrôle DGA | `CONTROLE_DGA:LIRE` |
| Dossier CNPS | `CNPS:LIRE` |
| Travail interne DAF (anomalies de frais, rapprochement, recalcul des droits, notes de reliquat) | `RAPPORT_DAF:LIRE` — **le Gestionnaire ne les voit pas** ; un avertissement indique que des opérations sont masquées |

---

## 4. Tests

| Suite | Résultat |
|---|---|
| **Totale (`mvn test`)** | **416 / 416 verts** |
| Nouveaux unitaires | `RegleRepartitionCotisationTest` (19 : 1000=700+300, 1500=700+800, SS<700, Épargne<300, total≠somme, montants négatifs / 3 décimales, Épargne obligatoire, seuils paramétrés, préférence), `PeriodeHistoriqueTest` (6 : bornes jour/semaine/mois/année/personnalisée, fuseau, erreurs), `CatalogueEvenementsHistoriqueTest` (7 : séparation général/financier, audit technique exclu, masquage DAF/DGA/CNPS, masquage des données sensibles), `ServiceSyntheseCotisationsTest` (2), 15 nouveaux cas dans `ServicePaiementImplTest` (répartition, pack, idempotence, concurrence, statut refusé, correction), 2 dans `ServiceAffectationPaiementImplTest`, 2 dans `AdaptateurWorkflowPaiementTest`, création sans pack dans `ServiceAdherentImplTest` |
| Nouveau test d'intégration | `DossierCotisationsHistoriqueIntegrationTest` (4 scénarios de bout en bout : création sans pack, contexte par matricule, refus 400 des répartitions invalides, cotisation en attente non créditée puis validée par la DAF et créditée 700 / 800, affectations = répartition, idempotence répétition / conflit / **concurrence à 4 requêtes**, historiques filtrés et paginés, dossier complet, permissions : Gestionnaire ne valide pas et ne voit pas le recalcul DAF, agent hors périmètre 403 sur dossier / historiques / correction, Super Admin 403, Gestionnaire refusé sur action DGA) |

**Exécution des tests d'intégration sans Docker** : la suite a tourné contre PostgreSQL 16 local, dans un **schéma isolé** créé pour l'occasion (`?currentSchema=cositi_it_v22,public`) puis supprimé — les données de développement n'ont pas été touchées.

**Tests existants corrigés** :
- **Adaptés à V22** : constructeurs (`ServicePaiementImpl`, `ServiceAffectationPaiementImpl`, `AdaptateurWorkflowPaiement`, DTO adhérent) ; helpers d'intégration qui créaient l'adhérent avec un pack (`Cotisation`, `ControleDaf`, `Droits`, `Cnps`) : l'adhésion est ouverte directement ; verrou optimiste (montant + répartition modifiés ensemble).
- **Échecs préexistants** (vérifiés à l'identique sur `HEAD` non modifié, dans une copie de travail séparée — jamais exécutés depuis V21 faute de Docker), réalignés sur le comportement V21 :
  - pièces obligatoires de la matrice (CNI + formulaire) ;
  - 2 affectations SS / Épargne ;
  - portefeuille d'agent paginé ;
  - doublon potentiel par similarité de nom confirmé.

---

## 5. Rapport des endpoints

| Méthode | Route | Nature |
|---|---|---|
| GET | `/api/v1/adherents/{id}/dossier-complet` | **Créé** |
| GET | `/api/v1/adherents/{id}/synthese-cotisations` | **Créé** |
| GET | `/api/v1/adherents/{id}/historique-general` | **Créé** |
| GET | `/api/v1/adherents/{id}/historique-financier` | **Créé** |
| GET | `/api/v1/paiements/contexte-adherent?matricule=` | **Créé** |
| POST | `/api/v1/adherents` | Modifié : plus de `packId` ; `whatsapp`, `email` |
| PUT | `/api/v1/adherents/{id}`, `/{id}/coordonnees` ; PATCH `/{id}/profil` | Modifié : `whatsapp`, `email` |
| GET | `/api/v1/adherents/{id}`, `/{id}/coordonnees` | Modifié : `whatsapp`, `email` |
| GET | `/api/v1/adherents/matricule/{matricule}` | Modifié : insensible à la casse |
| POST | `/api/v1/paiements` | Modifié : `montantSecuriteSociale`, `montantEpargne`, `packId` ; 409 `IDEMPOTENCY_KEY_CONFLIT` |
| POST | `/api/v1/paiements/{id}/corriger` | Modifié : `montantSecuriteSociale`, `montantEpargne` |
| (workflow) | Demandes de correction de cotisation | Champs `montantSecuriteSociale`, `montantEpargne` |
| GET | `PaiementDto` (toutes routes) | Additif : répartition, origine, pack |
| GET | `/api/v1/adherents/{id}/resume-cotisations` | Corrigé (montant en attente complet) |
| GET | `/api/v1/adherents/{id}/historique` | **Obsolète** (conservé) |
| GET | `/api/v1/openapi`, `/api/v1/openapi.yaml` | Contrat déplacé (ancien `/v3/api-docs`) |

---

## 6. Recette réelle (API redémarrée, base de développement)

- Flyway : `Successfully applied 1 migration … now at version v22`.
  - 227 cotisations existantes ont repris leur répartition depuis leurs affectations (`REPRISE_AFFECTATIONS`).
  - Les 7 autres (anciennes affectations « Coopérative », cotisations en attente) restent sans répartition : **rien n'est déduit**.
- Swagger :
  - `/swagger-ui.html` → 302 → `/swagger-ui/index.html` 200 ;
  - scripts 200 ; `/api/v1/openapi` 200 ; `/api/v1/openapi.yaml` 200 ;
  - CSP de la documentation compatible avec Swagger UI.
- 0 erreur 500 sur toutes les routes GET pour les 8 comptes de démonstration ; `periode=1` → 400.
- Sur `COSITI-00001` :
  - comptes à 0 malgré 1 500 FCFA validés : ce versement a été affecté à l'ancienne composante « Coopérative » et ne l'a pas été recalculé (opération financière à décider) ; la synthèse le signale ;
  - historique financier : 8 événements pour le Gestionnaire, 9 pour la DAF (une note interne d'imputation).
- **Non vérifié** : le rendu visuel de Swagger UI dans un navigateur. Les en-têtes et les ressources ont été contrôlés, pas l'affichage. À confirmer en ouvrant `http://localhost:8082/swagger-ui.html`.

---

## 7. Points À CONFIRMER (non inventés)

| Point | Où il vit | Valeur actuelle |
|---|---|---|
| Une cotisation peut-elle ne rien verser à l'Épargne ? (« lorsque la cotisation alimente ce compte ») | `EPARGNE_FACULTATIVE_PAR_COTISATION` `[V]` | `true` (Épargne 0 acceptée, sinon ≥ 300) |
| Statuts d'adhérent interdisant une cotisation (« statut compatible ») | `COTISATION_STATUTS_ADHERENT_REFUSES` `[V]` | vide (seul l'archivage est refusé, comme avant) |
| Plafond Épargne / Sécurité sociale | — | **Aucun** (non défini, avertissement exposé) |
| Seuil CNPS comparé au cumul total imputé ou à la seule part Sécurité sociale | Comportement existant (droits) | Cumul imputé (`DROITS_COMPOSANTES_IMPUTABLES` `[V]`) |
| Choix du pack ouvrant l'adhésion dès la saisie (avant validation) | `ServicePaiementImpl.choisirPack` | `[A]` — ouverte à la saisie, tracée ; une cotisation ensuite rejetée laisse le pack choisi |
| Classement des événements (catégorie, module, visibilité DGA/DAF/CNPS) | `CatalogueEvenementsHistorique` | `[A]` — modifiable en un seul endroit |
| Rôles affichés dans l'historique | — | Rôles **actuels** de l'acteur (le journal n'enregistre pas le rôle au moment de l'action) |
| Recalcul des anciennes affectations « Coopérative » | — | Non fait (décision financière) |

---

## 8. À répercuter côté frontend

- Formulaire de création : retirer le pack ; ajouter WhatsApp et e-mail.
- Saisie de cotisation :
  - `GET /paiements/contexte-adherent?matricule=` avant saisie ;
  - champs Sécurité sociale / Épargne, minimums lus dans la réponse ;
  - sélecteur de pack si `packRequis` ;
  - **une clé `Idempotency-Key` par saisie**, réutilisée telle quelle en cas de nouvel essai.
- Dossier : `GET /dossier-complet` ; comptes via `cotisations.compteSecuriteSociale` / `compteEpargne`.
- Bouton « Historique » : deux onglets `/historique-general` et `/historique-financier`, filtre jour / semaine / mois / année, pagination serveur. Remplace `/historique`.
- Nouveaux codes d'erreur : `docs/03_SPECIFICATIONS_API.md §4 bis`.

---

## 9. Fichiers

**Nouveaux** :
- `db/migration/V22__dossier_cotisations_historique_adherent.sql`
- `cotisation/entite/OrigineRepartition`
- `cotisation/service/{RegleRepartitionCotisation, ServiceSyntheseCotisations(Impl), ServiceContexteCotisation}`
- `cotisation/dto/{SyntheseCotisationsAdherentDto, ContexteCotisationDto}`
- `historique/{CategorieHistorique, VisibiliteEvenement, CatalogueEvenementsHistorique, PeriodeHistorique, ServiceHistoriqueAdherent(Impl), ControleurHistoriqueAdherent}`
- `historique/dto/{EvenementHistoriqueDto, ModificationChampDto, CritereHistorique}`
- `adherent/dto/DossierCompletAdherentDto`, `adherent/service/ServiceDossierCompletAdherent`
- Tests :
  - `RegleRepartitionCotisationTest`, `ServiceSyntheseCotisationsTest` ;
  - `PeriodeHistoriqueTest`, `CatalogueEvenementsHistoriqueTest` ;
  - `DossierCotisationsHistoriqueIntegrationTest`.

**Modifiés** :
- Config : `SecurityConfig`, `application.properties`, `application-prod.properties`.
- Erreurs : `GestionnaireExceptions`.
- Adhérent :
  - `Adherent` ;
  - `CreationAdherentDto`, `ModificationAdherentDto`, `ModifierCoordonneesDto`, `CompleterProfilAdherentDto`, `CoordonneesAdherentDto`, `AdherentDetailDto` ;
  - `ServiceAdherentImpl`, `AdaptateurWorkflowAdherent`, `ControleurAdherent`.
- Cotisation :
  - `Paiement` ;
  - `EnregistrementPaiementDto`, `CorrectionPaiementDto`, `PaiementDto` ;
  - `ServicePaiementImpl`, `ServiceAffectationPaiementImpl`, `AdaptateurWorkflowPaiement`, `ControleurPaiement`.
- Organisation : `ControleurAgent` (documentation de `periode`).
- Documentation : `docs/03_SPECIFICATIONS_API.md` (§4 bis).
- Tests adaptés : listés au §4.

**Aucune dépendance ajoutée. Aucun secret ajouté. Aucune suppression physique de donnée.**
