# COSITI V1 — SPÉCIFICATION BACKEND
## Implémentation du workflow de correction, validation et traçabilité sur les 3 premiers modules

**Version :** 1.0  
**Date :** 01/10/2026  
**Périmètre :** Adhérents, Agents de terrain, Cotisations

---

# 1. Objectif

Ce document décrit les développements **backend supplémentaires** nécessaires pour intégrer le nouveau mécanisme de :

- création contrôlée ;
- soumission ;
- verrouillage ;
- demande de correction ;
- demande de modification ;
- contrôle hiérarchique ;
- approbation ;
- rejet ;
- demande d'informations complémentaires ;
- application atomique ;
- versionnement ;
- séparation des tâches ;
- audit permanent ;
- notifications ;
- idempotence ;
- contrôle de concurrence.

Le principe est d'étendre les trois modules existants, sans les réécrire.

---

# 2. Modules concernés

| Module | Fonction | Mise à jour backend |
|---|---|---|
| Adhérents | Gestion des dossiers adhérents | Création contrôlée, validation du dossier, modifications officielles par demande |
| Agents de terrain | Gestion des agents | Validation des profils, modifications contrôlées, changements de statut contrôlés |
| Cotisations | Contributions et contrôle financier | Soumission, validation DAF, corrections contrôlées, rapprochement et audit |

Le mécanisme de workflow doit être construit comme un **socle transversal réutilisable**, mais son intégration immédiate est limitée à ces trois modules.

---

# 3. Architecture backend cible

```text
Controller
    ↓
Authentication / RBAC / Data Scope
    ↓
Application Service
    ↓
Workflow / Policy Service
    ↓
Domain Validation
    ↓
Transaction + Optimistic Locking
    ↓
Repository
    ↓
Audit
    ↓
AFTER_COMMIT Event
```

Le frontend ne décide jamais si une opération est autorisée. Le backend reste l'autorité.

---

# 4. Cycle général

## Création

```text
CREATE
 ↓
BROUILLON
 ↓
CONTRÔLES
 ↓
SUBMIT
 ↓
EN_ATTENTE_VALIDATION
```

## Décision

```text
EN_ATTENTE_VALIDATION
 ├── APPROUVEE → APPLICATION → OFFICIELLE
 ├── REJETEE → FIN
 └── CORRECTION_DEMANDEE → CORRECTION → RESOUMISSION
```

## Modification d'une donnée officielle

```text
DONNÉE OFFICIELLE
       ↓
DEMANDE DE MODIFICATION
       ↓
OLD VALUE + PROPOSED VALUE
       ↓
JUSTIFICATION
       ↓
EN_ATTENTE_VALIDATION
       ↓
CONTRÔLE
       ↓
APPROBATION
       ↓
APPLICATION ATOMIQUE
       ↓
VERSION N+1
       ↓
AUDIT
```

---

# 5. États backend

| Enum | Description |
|---|---|
| `BROUILLON` | Demande non soumise |
| `EN_ATTENTE_VALIDATION` | Demande soumise |
| `CORRECTION_DEMANDEE` | Complément demandé |
| `APPROUVEE` | Demande approuvée |
| `REJETEE` | Demande rejetée |
| `ANNULEE` | Demande annulée si autorisée |

Le statut du workflow ne doit pas être confondu avec le statut métier de l'entité.

---

# 6. Nouvelles entités backend

## 6.1 `ValidationRequest`

| Champ | Fonction |
|---|---|
| `id` | Identifiant |
| `reference` | Référence unique |
| `entityType` | Type d'entité |
| `entityId` | ID entité |
| `operationType` | Opération |
| `status` | État |
| `requestedBy` | Demandeur |
| `requestedAt` | Date |
| `reviewedBy` | Validateur |
| `reviewedAt` | Date décision |
| `reason` | Motif |
| `reviewerComment` | Commentaire |
| `baseVersion` | Version source |
| `createdAt` | Création |
| `updatedAt` | Mise à jour |

## 6.2 `ValidationRequestItem`

Permet de conserver les changements champ par champ :

| Champ | Fonction |
|---|---|
| `requestId` | Demande |
| `fieldName` | Champ |
| `dataType` | Type |
| `oldValue` | Valeur officielle |
| `proposedValue` | Valeur proposée |
| `changeReason` | Motif |

## 6.3 `ValidationRequestDocument`

| Champ | Fonction |
|---|---|
| `requestId` | Demande |
| `documentId` | Document sécurisé |
| `documentType` | Type |
| `required` | Obligatoire ou non |
| `uploadedBy` | Déposant |
| `uploadedAt` | Date |

## 6.4 `ValidationRequestDecision`

| Champ | Fonction |
|---|---|
| `requestId` | Demande |
| `decision` | APPROVE / REJECT / REQUEST_CORRECTION |
| `decidedBy` | Décideur |
| `decidedAt` | Date |
| `comment` | Motif |

---

# 7. Services transversaux à ajouter

| Service | Méthodes | Fonction |
|---|---|---|
| `ValidationRequestService` | `create`, `submit`, `approve`, `reject`, `requestCorrection`, `resubmit`, `cancel` | Cycle de validation |
| `ValidationPolicyService` | `resolveValidator`, `canApprove`, `canRequestCorrection` | Autorité |
| `ValidationComparisonService` | `compare`, `buildSnapshot` | Avant/après |
| `ValidationDocumentService` | `attach`, `list`, `validateRequiredDocuments` | Justificatifs |
| `ValidationConcurrencyService` | `validateBaseVersion` | Concurrence |
| `ValidationIdempotencyService` | `check`, `register` | Double exécution |
| `AuditService` | `record` | Traçabilité |
| `NotificationService` | `notifyValidator`, `notifyRequester` | Notifications |
| `DomainEventService` | `publishAfterCommit` | Événements |

## Méthodes principales de `ValidationRequestService`

| Méthode | Fonction |
|---|---|
| `createValidationRequest()` | Créer |
| `getValidationRequest()` | Consulter |
| `listValidationRequests()` | Lister |
| `listPendingValidationRequests()` | File de validation |
| `submitValidationRequest()` | Soumettre |
| `approveValidationRequest()` | Approuver |
| `rejectValidationRequest()` | Rejeter |
| `requestCorrection()` | Demander correction |
| `resubmitValidationRequest()` | Resoumettre |
| `cancelValidationRequest()` | Annuler |
| `validateTransition()` | Vérifier transition |
| `validateRequesterNotReviewer()` | Empêcher auto-validation |
| `validateEntityState()` | Vérifier état |
| `validateRequiredDocuments()` | Vérifier pièces |
| `applyApprovedChanges()` | Appliquer |
| `createDecision()` | Enregistrer décision |

---

# 8. Endpoints backend transversaux

> Les endpoints ci-dessous sont des **contrats proposés à vérifier avec `/api/v1/openapi`**. Aucun endpoint ne doit être inventé s'il existe déjà sous une autre forme.

| HTTP | Endpoint proposé | Méthode backend | Fonction |
|---|---|---|---|
| POST | `/api/v1/validation-requests` | `createValidationRequest()` | Créer |
| GET | `/api/v1/validation-requests` | `listValidationRequests()` | Lister |
| GET | `/api/v1/validation-requests/{id}` | `getValidationRequest()` | Détail |
| POST | `/api/v1/validation-requests/{id}/submit` | `submitValidationRequest()` | Soumettre |
| POST | `/api/v1/validation-requests/{id}/approve` | `approveValidationRequest()` | Approuver |
| POST | `/api/v1/validation-requests/{id}/reject` | `rejectValidationRequest()` | Rejeter |
| POST | `/api/v1/validation-requests/{id}/request-correction` | `requestCorrection()` | Demander correction |
| POST | `/api/v1/validation-requests/{id}/resubmit` | `resubmitValidationRequest()` | Resoumettre |
| POST | `/api/v1/validation-requests/{id}/cancel` | `cancelValidationRequest()` | Annuler |
| GET | `/api/v1/validation-requests/{id}/items` | `listValidationItems()` | Champs concernés |
| GET | `/api/v1/validation-requests/{id}/decisions` | `listDecisions()` | Décisions |
| GET | `/api/v1/validation-requests/{id}/documents` | `listDocuments()` | Justificatifs |
| POST | `/api/v1/validation-requests/{id}/documents` | `attachDocument()` | Ajouter justificatif |
| GET | `/api/v1/validation-requests/pending` | `listPendingValidations()` | File de validation |

---

# 9. MODULE 1 — ADHÉRENTS

## Fonctionnalités concernées

- création du dossier ;
- complétion ;
- soumission ;
- validation ;
- documents ;
- identité ;
- coordonnées ;
- données professionnelles ;
- données administratives ;
- affectation ;
- statut ;
- données liées au parcours CNPS ;
- demande de modification d'une donnée officielle.

## Méthodes supplémentaires

| Méthode | Fonction |
|---|---|
| `submitAdherentForValidation()` | Soumettre dossier |
| `validateAdherentCompleteness()` | Vérifier complétude |
| `validateAdherentConsistency()` | Vérifier cohérence |
| `checkAdherentDuplicateBeforeApproval()` | Recontrôler doublons |
| `getAdherentValidationStatus()` | État validation |
| `getAdherentValidationHistory()` | Historique |
| `createAdherentChangeRequest()` | Demande modification |
| `compareAdherentData()` | Avant/après |
| `approveAdherentChangeRequest()` | Appliquer après approbation |
| `rejectAdherentChangeRequest()` | Rejeter |
| `requestAdherentCorrection()` | Demander correction |
| `resubmitAdherentChangeRequest()` | Resoumettre |
| `applyAdherentChangeSet()` | Application transactionnelle |
| `validateAdherentVersion()` | Locking |
| `auditAdherentDecision()` | Audit |

## Endpoints proposés

| HTTP | Endpoint | Méthode | Fonction |
|---|---|---|---|
| POST | `/api/v1/adherents/{id}/submit` | `submitAdherentForValidation()` | Soumission |
| GET | `/api/v1/adherents/{id}/validation-status` | `getAdherentValidationStatus()` | État |
| GET | `/api/v1/adherents/{id}/validation-history` | `getAdherentValidationHistory()` | Historique |
| POST | `/api/v1/adherents/{id}/change-requests` | `createAdherentChangeRequest()` | Modification |
| GET | `/api/v1/adherents/{id}/change-requests` | `listAdherentChangeRequests()` | Liste |
| GET | `/api/v1/adherents/{id}/change-requests/{requestId}` | `getAdherentChangeRequest()` | Détail |

### Règle importante

Après validation, un `PUT/PATCH` direct ne doit pas permettre au demandeur de modifier les champs protégés.

Le backend doit refuser le contournement et imposer la demande de modification.

---

# 10. MODULE 2 — AGENTS DE TERRAIN

## Fonctionnalités concernées

- création ;
- validation du profil ;
- modification ;
- activation ;
- désactivation ;
- historique ;
- changements sensibles d'affectation.

## Méthodes supplémentaires

| Méthode | Fonction |
|---|---|
| `submitAgentForValidation()` | Soumission |
| `validateAgentProfile()` | Contrôle |
| `getAgentValidationStatus()` | État |
| `getAgentValidationHistory()` | Historique |
| `createAgentChangeRequest()` | Modification |
| `compareAgentData()` | Avant/après |
| `approveAgentChangeRequest()` | Approbation |
| `rejectAgentChangeRequest()` | Rejet |
| `requestAgentCorrection()` | Correction |
| `applyAgentChangeSet()` | Application |
| `requestAgentStatusChange()` | Demande statut |
| `approveAgentStatusChange()` | Validation statut |
| `validateAgentVersion()` | Concurrence |
| `auditAgentDecision()` | Audit |

## Endpoints proposés

| HTTP | Endpoint | Méthode | Fonction |
|---|---|---|---|
| POST | `/api/v1/agents-terrain/{id}/submit` | `submitAgentForValidation()` | Soumission |
| GET | `/api/v1/agents-terrain/{id}/validation-status` | `getAgentValidationStatus()` | État |
| GET | `/api/v1/agents-terrain/{id}/validation-history` | `getAgentValidationHistory()` | Historique |
| POST | `/api/v1/agents-terrain/{id}/change-requests` | `createAgentChangeRequest()` | Modification |
| GET | `/api/v1/agents-terrain/{id}/change-requests` | `listAgentChangeRequests()` | Historique |
| POST | `/api/v1/agents-terrain/{id}/status-change-requests` | `requestAgentStatusChange()` | Changement statut |
| GET | `/api/v1/agents-terrain/{id}/status-change-requests` | `listAgentStatusChangeRequests()` | Historique |

### Règle

La désactivation doit être logique, auditée et, lorsqu'elle relève du workflow, passer par une demande de changement de statut.

---

# 11. MODULE 3 — COTISATIONS

## Fonctionnalités concernées

- création/saisie ;
- soumission ;
- validation ;
- rejet ;
- correction ;
- cumul ;
- progression ;
- seuil CNPS ;
- rapprochement ;
- différence de caisse ;
- validation du rapprochement ;
- audit.

## Méthodes supplémentaires

| Méthode | Fonction |
|---|---|
| `validateContributionInput()` | Contrôle initial |
| `submitContributionForValidation()` | Soumission |
| `getContributionValidationStatus()` | État |
| `getContributionValidationHistory()` | Historique |
| `createContributionChangeRequest()` | Correction |
| `compareContributionValues()` | Avant/après |
| `approveContributionChangeRequest()` | Approbation |
| `rejectContributionChangeRequest()` | Rejet |
| `requestContributionCorrection()` | Complément |
| `validateFinancialPermission()` | Contrôle DAF |
| `validateContributionVersion()` | Concurrence |
| `applyContributionChangeSet()` | Application |
| `recalculateContributionSummary()` | Recalcul cumul |
| `recalculateCnpsProgress()` | Recalcul progression |
| `revalidateContributionInvariants()` | Règles métier |
| `auditContributionDecision()` | Audit |

## Endpoints proposés

| HTTP | Endpoint | Méthode | Fonction |
|---|---|---|---|
| POST | `/api/v1/cotisations/{id}/submit` | `submitContributionForValidation()` | Soumission |
| GET | `/api/v1/cotisations/{id}/validation-status` | `getContributionValidationStatus()` | État |
| GET | `/api/v1/cotisations/{id}/validation-history` | `getContributionValidationHistory()` | Historique |
| POST | `/api/v1/cotisations/{id}/change-requests` | `createContributionChangeRequest()` | Correction |
| GET | `/api/v1/cotisations/{id}/change-requests` | `listContributionChangeRequests()` | Historique |
| POST | `/api/v1/cotisations/{id}/validate` | `validateContribution()` | Validation DAF |
| POST | `/api/v1/cotisations/{id}/reject` | `rejectContribution()` | Rejet |
| POST | `/api/v1/cotisations/{id}/request-correction` | `requestContributionCorrection()` | Correction |

---

# 12. COTISATIONS — APPLICATION D'UNE CORRECTION

Toute correction financière approuvée doit suivre une transaction unique :

```text
BEGIN TRANSACTION
1. Lock cotisation
2. Vérifier version
3. Vérifier permission DAF
4. Vérifier ancienne valeur
5. Vérifier nouvelle valeur
6. Vérifier montant
7. Vérifier adhérent
8. Vérifier référence
9. Revalider les invariants
10. Appliquer
11. Incrémenter version
12. Recalculer cumul
13. Recalculer progression CNPS
14. Recalculer indicateurs concernés
15. Enregistrer décision
16. Enregistrer audit
COMMIT
↓
AFTER_COMMIT EVENT
↓
NOTIFICATION
```

Aucune modification financière ne doit être appliquée partiellement.

---

# 13. RÈGLES FINANCIÈRES À REVALIDER

| Contrôle | Objectif |
|---|---|
| Montant | Validité du montant |
| Adhérent | Existence et statut |
| Référence | Unicité |
| Version | Absence de conflit |
| Allocation | Cohérence Sécurité Sociale / Épargne |
| Cumul | Recalcul |
| Seuil CNPS | Progression correcte |
| Rapprochement | Cohérence avec données journalières |
| Idempotence | Pas de double application |

Les règles financières métier existantes restent la référence.

---

# 14. CONTROLLERS À AJOUTER OU ÉTENDRE

| Controller | Responsabilités nouvelles |
|---|---|
| `ValidationRequestController` | Création, soumission, approbation, rejet, correction, resoumission |
| `AdherentController` | Submit, validation status, history, change request |
| `FieldAgentController` | Submit, validation status, history, change request, status request |
| `ContributionController` | Submit, validation, rejet, correction, history |

---

# 15. DTO À AJOUTER

## `CreateValidationRequestCommand`

```text
entityType
entityId
operationType
reason
items[]
documentIds[]
baseVersion
```

## `ValidationRequestItemCommand`

```text
fieldName
proposedValue
changeReason
```

## `ValidationDecisionCommand`

```text
comment
idempotencyKey
```

## `ValidationRequestResponse`

```text
id
reference
entityType
entityId
operationType
status
requestedBy
requestedAt
reviewedBy
reviewedAt
reason
reviewerComment
baseVersion
items[]
documents[]
```

Les DTO réels doivent respecter les conventions déjà utilisées par COSITI.

---

# 16. REPOSITORIES

```text
ValidationRequestRepository
ValidationRequestItemRepository
ValidationRequestDocumentRepository
ValidationRequestDecisionRepository
```

Méthodes minimales :

| Repository | Méthodes |
|---|---|
| `ValidationRequestRepository` | `findById`, `findByReference`, `findPending`, `findByEntity`, `existsOpenRequest` |
| `ValidationRequestItemRepository` | `findByRequestId` |
| `ValidationRequestDocumentRepository` | `findByRequestId`, `existsRequiredDocument` |
| `ValidationRequestDecisionRepository` | `findByRequestId` |

---

# 17. TRANSACTIONS ET CONCURRENCE

Les opérations suivantes doivent être transactionnelles :

```text
approveValidationRequest()
rejectValidationRequest()
requestCorrection()
applyApprovedChanges()
approveAdherentChangeRequest()
approveAgentChangeRequest()
approveContributionChangeRequest()
```

Le versionnement doit empêcher :

```text
Version 7
  ↓
Demande A
  ↓
Modification B → Version 8
  ↓
Demande A approuvée
```

Résultat :

```text
409 CONFLICT
```

Le validateur doit revoir les données actuelles.

---

# 18. IDEMPOTENCE

Les actions critiques doivent être idempotentes :

- soumission ;
- approbation ;
- rejet ;
- demande de correction ;
- resoumission ;
- validation financière.

Un double clic ou une répétition réseau ne doit jamais provoquer une double application.

---

# 19. SÉPARATION DES TÂCHES

Le backend doit vérifier :

```text
requestedBy != reviewedBy
```

Exemple :

```text
Gestionnaire
  ↓
crée une demande
  ↓
tente d'approuver
  ↓
403 FORBIDDEN
```

Pour les cotisations :

```text
SAISIE
  ↓
À VALIDER
  ↓
CONTRÔLE
  ↓
DAF
  ↓
VALIDATION
```

Le DAF reste l'acteur de validation financière finale conformément aux règles COSITI.

---

# 20. POLITIQUE DE VALIDATION

Ne pas coder une règle générique du type :

```text
if role == SUPERIOR
```

La politique doit être déterminée par :

```text
module
+
operationType
+
état
+
périmètre
+
permission
```

Exemple :

| Domaine | Opération | Validateur |
|---|---|---|
| Cotisations | Validation financière | DAF |
| Adhérents | Validation dossier | Rôle habilité selon matrice RBAC |
| Agents | Validation profil/statut | Rôle habilité selon matrice RBAC |

Les droits exacts doivent être alignés sur la matrice RBAC existante.

---

# 21. AUDIT

Chaque événement suivant doit être audité :

| Action | Audit |
|---|---|
| Création demande | Oui |
| Soumission | Oui |
| Correction demandée | Oui |
| Resoumission | Oui |
| Approbation | Oui |
| Rejet | Oui |
| Application | Oui |
| Ajout justificatif | Oui |
| Changement statut | Oui |
| Validation financière | Oui |

L'audit doit contenir au minimum :

```text
actorId
actorRole
action
entityType
entityId
requestId
timestamp
oldValue / snapshot si nécessaire
proposedValue / snapshot si nécessaire
reason
decision
correlationId
```

Ne pas écrire dans les logs techniques des secrets ou des données sensibles inutiles.

---

# 22. NOTIFICATIONS

| Événement | Destinataire |
|---|---|
| Demande soumise | Validateur habilité |
| Correction demandée | Demandeur |
| Rejet | Demandeur |
| Approbation | Demandeur |
| Resoumission | Validateur |
| Application | Acteurs autorisés concernés |

Les notifications ne doivent pas compromettre la transaction principale.

---

# 23. ÉVÉNEMENTS DE DOMAINE

Exemples :

```text
ValidationRequestSubmitted
ValidationRequestApproved
ValidationRequestRejected
ValidationCorrectionRequested
AdherentChanged
FieldAgentChanged
ContributionValidated
ContributionCorrected
```

Publication :

```text
COMMIT
  ↓
AFTER_COMMIT
  ↓
EVENT
```

Ne pas publier un événement de succès avant le commit.

---

# 24. PROTECTION DES ENDPOINTS EXISTANTS

Le travail ne consiste pas seulement à créer de nouveaux endpoints.

Il faut rechercher tous les endpoints actuels permettant :

```text
PUT /adherents/{id}
PATCH /adherents/{id}
PUT /agents-terrain/{id}
POST /agents-terrain/{id}/status
PATCH /cotisations/{id}
POST /cotisations/{id}/validate
```

Puis déterminer pour chacun :

```text
DIRECTEMENT AUTORISÉ
OU
WORKFLOW OBLIGATOIRE
```

Un ancien endpoint qui permet de contourner la validation doit être sécurisé.

---

# 25. GESTION DES ERREURS

| Situation | HTTP attendu |
|---|---|
| Non authentifié | 401 |
| Permission insuffisante | 403 |
| Entité inexistante | 404 |
| Transition invalide | 409 |
| Version obsolète | 409 |
| Demande active en doublon | 409 |
| Données invalides | 400 |
| Justificatif manquant | 400 |
| Motif manquant | 400 |
| Auto-validation | 403 |
| Validation financière non autorisée | 403 |

Le format d'erreur doit rester celui déjà défini dans l'API COSITI.

---

# 26. PLAN D'IMPLÉMENTATION BACKEND

## Phase 1 — Audit du code

1. Lire les trois modules.
2. Identifier controllers.
3. Identifier services.
4. Identifier repositories.
5. Identifier entités.
6. Identifier DTO.
7. Identifier endpoints.
8. Lire `/api/v1/openapi`.
9. Cartographier RBAC.
10. Identifier tous les endpoints de modification directe.

## Phase 2 — Socle workflow

1. Entités.
2. Enums.
3. Migrations Flyway.
4. Repositories.
5. DTO.
6. Workflow Service.
7. Policy Service.
8. Audit.
9. Notifications.
10. Locking.
11. Idempotence.
12. Tests.

## Phase 3 — Adhérents

```text
création
→ soumission
→ validation
→ correction
→ modification officielle
→ audit
```

## Phase 4 — Agents

```text
création
→ validation
→ modification
→ changement statut
→ audit
```

## Phase 5 — Cotisations

```text
saisie
→ soumission
→ contrôle
→ DAF
→ validation
→ correction
→ recalcul
→ rapprochement
→ audit
```

## Phase 6 — Sécurité et tests

```text
RBAC
SoD
Data Scope
Locking
Idempotence
Transactions
Integration tests
Security tests
```

---

# 27. DEFINITION OF DONE BACKEND

> État au 01/10/2026 — implémentation backend livrée (package `cm.cositi.api.workflow` + adaptateurs par module).
> Correspondance des routes et décisions en §27 bis.

## Socle

- [x] Workflow implémenté (`ServiceDemandeValidationImpl` : créer, soumettre, approuver, rejeter, demander-correction, resoumettre, annuler ; transitions contrôlées, 409 sinon).
- [x] Migrations Flyway (`V19__workflow_validation_3_modules.sql` : 4 tables, statut de validation adhérent/agent, version agent, permissions, paramètre `[V]` des justificatifs).
- [x] Repositories (sans suppression physique ; verrou pessimiste sur la demande, index unique « une demande ouverte par entité »).
- [x] Services (`ServicePolitiqueValidation`, `ServiceComparaisonValidation`, justificatifs, concurrence et idempotence intégrés au service central).
- [x] DTO (`CreationDemandeValidationDto`, `PropositionChampDto`, `DecisionDemandeDto`, `DemandeValidationDto`…).
- [x] Controllers (`ControleurDemandeValidation` + un contrôleur workflow par module).
- [x] OpenAPI mis à jour (`@Tag`/`@Operation` sur les 4 contrôleurs).
- [x] RBAC (politique par opération + permission ; `ADHERENT:VALIDER`, `AGENT:VALIDER` ajoutées ; DAF exigé pour la validation financière).
- [x] Séparation des tâches (`requestedBy != reviewedBy` dans le service — 403 — et en contrainte SQL).
- [x] Audit (9 types `DEMANDE_VALIDATION_*` + `ADHERENT_VALIDATION_DOSSIER`, `AGENT_VALIDATION_PROFIL` ; acteur, rôles, demande, avant/après, motif, décision, correlationId `X-Trace-Id`).
- [x] Notifications (après commit, transaction séparée : validateurs habilités à la soumission/resoumission, demandeur à la décision).
- [x] Transactions (approbation + application + audit dans une seule transaction).
- [x] Optimistic locking (version de base de la demande + verrou `FOR UPDATE` de l'entité ; 409 `DEMANDE_VERSION_OBSOLETE`).
- [x] Idempotence (`cleIdempotence` en corps ou en-tête `Idempotency-Key` sur création et chaque décision ; rejeu = état courant, jamais de double application).

## Adhérents

- [x] Création contrôlée (nouveau dossier en `BROUILLON`, modifiable directement).
- [x] Soumission (`POST /adherents/{id}/soumettre` ; dossier verrouillé jusqu'à la décision).
- [x] Validation (approbation par `ADHERENT:VALIDER`, recontrôle des doublons, complétude signalée).
- [x] Correction (demande de correction → dossier modifiable → resoumission).
- [x] Modification officielle protégée (`PUT /{id}`, `/coordonnees`, `/professionnel`, `/statut` refusés en 409 sur un dossier validé ; `PATCH /profil` limité aux champs vides ; `POST /{id}/demandes-modification`).
- [x] Historique (`GET /{id}/historique-validation`, `/statut-validation`, `/demandes-modification`).
- [x] Audit.
- [x] Tests (unitaires ; voir `SUIVI_EXECUTION.md`).

## Agents

- [x] Création contrôlée (profil créé par la DGA en `BROUILLON`, `POST /agents/{id}/soumettre`).
- [x] Validation (`AGENT:VALIDER` — DG ou DGA, jamais l'auteur de la demande).
- [x] Modification (`POST /agents/{id}/demandes-modification` ; `PUT /agents/{id}` refusé sur un profil validé).
- [x] Activation/désactivation (`POST /agents/{id}/demandes-changement-statut` ; `POST /agents/{id}/statut` refusé sur un profil validé ; désactivation logique).
- [x] Historique.
- [x] Audit.
- [x] Tests.

## Cotisations

- [x] Saisie (existant, brouillon compris).
- [x] Soumission (existant `POST /paiements/{id}/soumettre`).
- [x] Validation DAF (existant `POST /paiements/{id}/valider` ; bloquée tant qu'une correction est en cours).
- [x] Rejet (existant `POST /paiements/{id}/rejeter`).
- [x] Correction (`POST /paiements/{id}/demandes-correction`, validée par le DAF ; correction directe réservée aux brouillons).
- [x] Recalculs (ré-affectation + recalcul des droits dans la transaction d'approbation ; cumul et progression CNPS relus depuis les périodes).
- [x] Rapprochement (bilan de caisse validé touché par une correction signalé à l'approbation).
- [x] Audit financier (`PAIEMENT_CORRECTION` avant/après + audit de la demande).
- [x] Tests.

# 27 bis. IMPLÉMENTATION RÉALISÉE — CORRESPONDANCE DES ROUTES

| Route proposée | Route réelle |
|---|---|
| `/api/v1/validation-requests` (+ `/{id}`, `/pending`) | `/api/v1/demandes-validation` (+ `/{id}`, `/en-attente`) |
| `…/{id}/submit`, `/approve`, `/reject`, `/request-correction`, `/resubmit`, `/cancel` | `…/{id}/soumettre`, `/approuver`, `/rejeter`, `/demander-correction`, `/resoumettre`, `/annuler` |
| `…/{id}/items`, `/decisions`, `/documents` | `…/{id}/elements`, `/decisions`, `/justificatifs` (GET et POST) |
| `/adherents/{id}/submit`, `/validation-status`, `/validation-history`, `/change-requests` | `/adherents/{id}/soumettre`, `/statut-validation`, `/historique-validation`, `/demandes-modification` |
| `/agents-terrain/{id}/…` (+ `/status-change-requests`) | `/agents/{id}/…` (+ `/demandes-changement-statut`) |
| `/cotisations/{id}/submit`, `/validate`, `/reject` | existants : `/paiements/{id}/soumettre`, `/valider`, `/rejeter` |
| `/cotisations/{id}/request-correction` | existant : `/paiements/{id}/signaler-incoherence` (DAF) |
| `/cotisations/{id}/change-requests`, `/validation-status`, `/validation-history` | `/paiements/{id}/demandes-correction`, `/statut-validation`, `/historique-validation` |

**Décisions `[A]`/`[V]` à faire confirmer par la COSITI :**

- `[A]` Validateurs : `ADHERENT:VALIDER` → Gestionnaire des comptes et DGA ; `AGENT:VALIDER` → DG et DGA. Ajustable en base (`role_permission`) sans changer le code.
- `[A]` Les dossiers adhérents et profils d'agents existants avant V19 sont réputés officiels (`VALIDE`) ; les nouveaux naissent en `BROUILLON`.
- `[A]` Une seule demande ouverte par entité ; une demande ne s'annule que par son auteur.
- `[A]` Un nouvel adhérent non encore validé reste utilisable (paiements, portefeuille) : la validation rend le dossier officiel, elle ne conditionne pas l'activité.
- `[A]` Le changement de pack et l'affectation de portefeuille gardent leurs circuits dédiés (hors workflow générique).
- `[A]` Correction d'une cotisation à répartition manuelle : refusée tant que la répartition n'est pas refaite (`PAIEMENT_AFFECTATION_MANUELLE`).
- `[V]` `WORKFLOW_JUSTIFICATIFS_OBLIGATOIRES` : vide par défaut, aucun justificatif bloquant tant que la liste n'est pas fixée.
- `[V]` La complétude du dossier est signalée au validateur, jamais bloquante (règle `CHAMPS_COMPLETION_ADHERENT` non validée).

---

# 28. RÈGLE D'IMPLÉMENTATION

Avant de créer un endpoint :

```text
EXISTE-T-IL DÉJÀ ?
      ↓
    OUI → PEUT-IL ÊTRE ÉTENDU ?
              ↓
            OUI → ÉTENDRE
            NON → NOUVEL ENDPOINT
```

Avant de créer une méthode :

```text
EXISTE-T-ELLE ?
      ↓
OUI → RÉUTILISER
NON → CRÉER
```

Avant de créer une table :

```text
EXISTE-T-ELLE ?
      ↓
OUI → ÉTENDRE SI POSSIBLE
NON → MIGRATION FLYWAY
```

---

# 29. CONTRAT API

`/api/v1/openapi` reste la référence technique.

Avant toute implémentation, Claude Code doit :

1. analyser OpenAPI ;
2. identifier les endpoints existants ;
3. comparer OpenAPI et code ;
4. identifier les écarts ;
5. réutiliser les contrats existants ;
6. ajouter uniquement les contrats réellement nécessaires ;
7. tester les permissions ;
8. tester les transitions ;
9. tester les cas de concurrence ;
10. mettre à jour la documentation API.

Aucun endpoint proposé dans ce document ne doit être considéré comme existant sans vérification.

---

# 30. RÉSULTAT CIBLE

```text
              BACKEND COSITI
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
   ADHÉRENTS      AGENTS     COTISATIONS
       │            │            │
       └────────────┼────────────┘
                    ↓
          WORKFLOW VALIDATION
                    ↓
        PROPOSITION / DEMANDE
                    ↓
             JUSTIFICATION
                    ↓
              VÉRIFICATION
                    ↓
                DÉCISION
             ┌──────┼──────┐
             ↓      ↓      ↓
          APPROVE REJECT CORRECTION
             ↓             ↓
          APPLY       RESOUMISSION
             ↓             │
          VERSION ←────────┘
             ↓
            AUDIT
             ↓
        AFTER COMMIT EVENT
```

Le backend doit garantir qu'une donnée sensible ne puisse plus être modifiée silencieusement.

Le principe final est :

```text
PROPOSITION
    ↓
JUSTIFICATION
    ↓
VÉRIFICATION
    ↓
VALIDATION
    ↓
APPLICATION
    ↓
VERSION
    ↓
AUDIT
```

Cette architecture constitue le socle à généraliser ensuite aux autres modules COSITI, après validation complète des trois premiers.
