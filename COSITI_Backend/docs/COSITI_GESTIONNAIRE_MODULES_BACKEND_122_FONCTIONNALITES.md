# COSITI V1 — Spécification Backend Critique
## Gestion des adhérents · Agents de terrain · Cotisations · Transversal

> **Périmètre :** backend COSITI V1, principalement pour le Gestionnaire des comptes.  
> **Principe :** chaque fonctionnalité ci-dessous est critique et doit être implémentée, persistée, sécurisée, testée et auditée.

## Règles générales

- Le backend est l'autorité pour RBAC, périmètres, validations, calculs et transitions d'état.
- Vérifier l'OpenAPI et le code existant avant de créer une route. Réutiliser une route existante si elle couvre déjà le besoin.
- Les routes proposées sont des cibles fonctionnelles : adapter leur nom aux conventions réelles du projet.
- Ne pas inventer une règle métier absente du contrat. Les points marqués `[À VALIDER]` doivent être confirmés.
- Toute mutation importante est transactionnelle et journalisée.
- Les références métier sont générées côté backend.
- Les calculs critiques ne doivent pas avoir le frontend comme source de vérité.
- Les changements DB passent par Flyway.
- Les opérations financières sensibles respectent la séparation des responsabilités.
- Chaque fonctionnalité doit avoir des tests adaptés.

---

# 1. Gestion des adhérents — 35 fonctionnalités

| # | Fonctionnalité | Méthode backend | Endpoint | Développement / règle |
|---:|---|---|---|---|
| 1 | Lister les adhérents autorisés | `listAdherents()` | `GET /api/v1/adherents` | Pagination, tri, filtres, contrôle du périmètre. |
| 2 | Rechercher par nom/prénom | `searchAdherents(criteria)` | `GET /api/v1/adherents?search=` | Recherche backend paginée. |
| 3 | Rechercher par matricule | `findByMatricule(matricule)` | `GET /api/v1/adherents/{matricule}` | Vérifier existence et autorisation. |
| 4 | Rechercher par téléphone | `searchByPhone(phone)` | `GET /api/v1/adherents?phone=` | Normaliser puis rechercher côté serveur. |
| 5 | Filtrer par statut | `filterByStatus(status)` | `GET /api/v1/adherents?status=` | Whitelist des statuts. |
| 6 | Filtrer par agent | `filterByAgent(agentId)` | `GET /api/v1/adherents?agentId=` | Vérifier le périmètre de l'agent. |
| 7 | Filtrer par complétion | `filterByCompletion(range)` | `GET /api/v1/adherents?completion=` | Utiliser la règle de complétion serveur. |
| 8 | Pagination et tri | `paginateAndSort(query)` | `GET /api/v1/adherents?page=&size=&sort=` | Limite de taille et champs triables autorisés. |
| 9 | Créer un adhérent | `createAdherent(command)` | `POST /api/v1/adherents` | Validation, doublons, référence automatique, transaction. |
| 10 | Vérifier les doublons | `checkDuplicate(data)` | `POST /api/v1/adherents/duplicate-check` | Détecter les doublons avant création. |
| 11 | Générer la référence adhérent | `generateAdherentReference()` | Inclus dans `POST /adherents` | Génération atomique côté backend. |
| 12 | Consulter le détail | `getAdherent(id)` | `GET /api/v1/adherents/{id}` | DTO sécurisé selon rôle/périmètre. |
| 13 | Modifier le profil | `updateAdherent(id, command)` | `PUT /api/v1/adherents/{id}` | Champs autorisés, validation, concurrence. |
| 14 | Calculer le taux de complétion | `calculateCompletion(id)` | `GET /api/v1/adherents/{id}/completion` | Une seule formule métier côté service. |
| 15 | Retourner les champs manquants | `getMissingFields(id)` | `GET /api/v1/adherents/{id}/missing-fields` | Déterminer les informations obligatoires absentes. |
| 16 | Compléter un dossier | `completeProfile(id, command)` | `PATCH /api/v1/adherents/{id}/profile` | Valider les champs puis recalculer la complétion. |
| 17 | Consulter l'état du dossier | `getDossierStatus(id)` | `GET /api/v1/adherents/{id}/dossier` | Statut et progression. |
| 18 | Identifier les documents manquants | `getMissingDocuments(id)` | `GET /api/v1/adherents/{id}/documents/missing` | Vérifier les pièces requises. |
| 19 | Consulter les documents | `listAdherentDocuments(id)` | `GET /api/v1/adherents/{id}/documents` | Accès authentifié. |
| 20 | Ajouter une pièce | `attachDocument(id, document)` | `POST /api/v1/adherents/{id}/documents` | Vérifier type et rattachement. |
| 21 | Consulter l'historique | `getAdherentHistory(id)` | `GET /api/v1/adherents/{id}/history` | Historique métier autorisé. |
| 22 | Consulter l'agent responsable | `getAssignedAgent(id)` | `GET /api/v1/adherents/{id}/agent` | Affectation active. |
| 23 | Affecter à un agent | `assignAgent(id, agentId)` | `POST /api/v1/adherents/{id}/agent` | Vérifier agent actif et périmètre. |
| 24 | Modifier l'affectation | `changeAgent(id, agentId, reason)` | `PUT /api/v1/adherents/{id}/agent` | Clôturer l'ancienne affectation et créer la nouvelle. |
| 25 | Voir les adhérents proches du quota CNPS | `findNearCnpsThreshold(criteria)` | `GET /api/v1/adherents/cnps/near-threshold` | Basé sur les cotisations éligibles. |
| 26 | Identifier les adhérents à 15 000 FCFA | `findEligibleForPreRegistration()` | `GET /api/v1/adherents/cnps/eligible` | Éligibilité calculée côté serveur. |
| 27 | Calculer l'éligibilité pré-immatriculation | `getPreRegistrationEligibility(id)` | `GET /api/v1/adherents/{id}/cnps/pre-registration` | Appliquer les règles validées. |
| 28 | Consulter le cumul des cotisations | `getContributionSummary(id)` | `GET /api/v1/adherents/{id}/contribution-summary` | Total validé, attente, reste, progression. |
| 29 | Consulter informations professionnelles | `getProfessionalProfile(id)` | `GET /api/v1/adherents/{id}/professional` | DTO selon permissions. |
| 30 | Modifier informations professionnelles | `updateProfessionalProfile(id, command)` | `PUT /api/v1/adherents/{id}/professional` | Validation métier + audit. |
| 31 | Consulter coordonnées | `getContactProfile(id)` | `GET /api/v1/adherents/{id}/contact` | Contrôle d'accès. |
| 32 | Modifier coordonnées | `updateContactProfile(id, command)` | `PUT /api/v1/adherents/{id}/contact` | Validation email/téléphone + audit. |
| 33 | Changer statut du dossier | `changeDossierStatus(id,status,reason)` | `POST /api/v1/adherents/{id}/dossier/status` | Machine d'état et transitions autorisées. |
| 34 | Exporter la liste autorisée | `exportAdherents(criteria)` | `POST /api/v1/exports/adherents` | Contrôle périmètre + audit de l'export. |
| 35 | Publier le changement d'adhérent | `publishAdherentChangedEvent(event)` | Interne / SSE-WebSocket si retenu | Publication après commit pour actualisation temps réel. |

**Audit :** création, modification, affectation, changement de statut, ajout de document et export doivent être journalisés avec acteur, date, ressource et avant/après lorsque pertinent.

---

# 2. Gestion des agents de terrain — 25 fonctionnalités

| # | Fonctionnalité | Méthode backend | Endpoint | Développement / règle |
|---:|---|---|---|---|
| 1 | Lister les agents | `listFieldAgents()` | `GET /api/v1/agents-terrain` | Pagination, filtres et périmètre. |
| 2 | Rechercher un agent | `searchFieldAgents(criteria)` | `GET /api/v1/agents-terrain?search=` | Recherche nom, matricule, téléphone selon contrat. |
| 3 | Consulter profil agent | `getFieldAgent(id)` | `GET /api/v1/agents-terrain/{id}` | DTO sécurisé. |
| 4 | Créer profil agent | `createFieldAgent(command)` | `POST /api/v1/agents-terrain` | Vérifier rôle du créateur et données obligatoires. |
| 5 | Modifier profil agent | `updateFieldAgent(id,command)` | `PUT /api/v1/agents-terrain/{id}` | Validation et droits. |
| 6 | Activer/désactiver agent | `changeAgentStatus(id,status)` | `POST /api/v1/agents-terrain/{id}/status` | Transition contrôlée et audit. |
| 7 | Consulter activité récente | `getAgentActivity(id,period)` | `GET /api/v1/agents-terrain/{id}/activity` | Agréger activités autorisées. |
| 8 | Compter adhérents suivis | `countAssignedAdherents(id)` | `GET /api/v1/agents-terrain/{id}/portfolio/summary` | Affectations actives. |
| 9 | Lister portefeuille | `getAgentPortfolio(id,query)` | `GET /api/v1/agents-terrain/{id}/portfolio` | Pagination + périmètre. |
| 10 | Compter dossiers complets | `countCompleteDossiers(id)` | `GET /api/v1/agents-terrain/{id}/portfolio/summary` | Même règle de complétion que le module adhérent. |
| 11 | Compter dossiers incomplets | `countIncompleteDossiers(id)` | `GET /api/v1/agents-terrain/{id}/portfolio/summary` | Filtrage serveur. |
| 12 | Suivre proches du quota | `getNearThresholdPortfolio(id)` | `GET /api/v1/agents-terrain/{id}/portfolio/cnps/near-threshold` | Cumul éligible uniquement. |
| 13 | Suivre quota atteint | `getEligiblePortfolio(id)` | `GET /api/v1/agents-terrain/{id}/portfolio/cnps/eligible` | Règle 15 000 FCFA [à confirmer]. |
| 14 | Compter cotisations agent | `countAgentContributions(id,period)` | `GET /api/v1/agents-terrain/{id}/contributions/summary` | Séparer les statuts. |
| 15 | Calculer montant cotisations | `sumAgentContributions(id,period)` | Même endpoint | Enregistré, validé, attente. |
| 16 | Affecter un adhérent | `assignAdherent(agentId,adherentId)` | `POST /api/v1/agents-terrain/{id}/portfolio` | Vérifier droits et conflit d'affectation. |
| 17 | Retirer une affectation | `unassignAdherent(agentId,adherentId,reason)` | `DELETE /api/v1/agents-terrain/{id}/portfolio/{adherentId}` | Privilégier clôture logique. |
| 18 | Réaffecter un adhérent | `reassignAdherent(adherentId,newAgentId,reason)` | `PUT /api/v1/adherents/{id}/agent` | Transaction atomique. |
| 19 | Répartition des portefeuilles | `getPortfolioDistribution()` | `GET /api/v1/agents-terrain/portfolio/distribution` | Agrégation par agent. |
| 20 | Suivre charge portefeuille | `getAgentWorkload(id)` | `GET /api/v1/agents-terrain/{id}/workload` | Indicateurs opérationnels, pas de score arbitraire. |
| 21 | Filtrer agents par statut | `filterAgents(status)` | `GET /api/v1/agents-terrain?status=` | Statuts validés uniquement. |
| 22 | Consulter dernière activité | `getLastActivity(id)` | `GET /api/v1/agents-terrain/{id}/activity/last` | Dernière action métier autorisée. |
| 23 | Consulter opérations agent | `listAgentOperations(id,query)` | `GET /api/v1/agents-terrain/{id}/operations` | Opérations selon périmètre. |
| 24 | Historiser changement portefeuille | `recordPortfolioChange(command)` | Interne | Ancien agent, nouvel agent, auteur, date, motif. |
| 25 | Publier changement activité agent | `publishAgentActivityEvent(event)` | Interne / SSE-WebSocket | Publication après commit. |

**Audit :** création, modification, activation/désactivation, affectation, réaffectation, retrait d'affectation et opérations sensibles doivent être journalisés.

---

# 3. Gestion des cotisations — 36 fonctionnalités

| # | Fonctionnalité | Méthode backend | Endpoint | Développement / règle |
|---:|---|---|---|---|
| 1 | Lister cotisations | `listContributions(query)` | `GET /api/v1/cotisations` | Pagination, tri, filtres, périmètre. |
| 2 | Rechercher par adhérent | `findByAdherent(adherentId)` | `GET /api/v1/adherents/{id}/cotisations` | Historique paginé. |
| 3 | Rechercher par matricule | `findByAdherentMatricule(matricule)` | `GET /api/v1/cotisations?adherentMatricule=` | Recherche backend. |
| 4 | Rechercher par agent | `findByAgent(agentId)` | `GET /api/v1/cotisations?agentId=` | Contrôle du périmètre. |
| 5 | Rechercher par référence | `findByReference(reference)` | `GET /api/v1/cotisations/{reference}` | Référence unique. |
| 6 | Filtrer par statut | `filterByStatus(status)` | `GET /api/v1/cotisations?status=` | Transitions autorisées. |
| 7 | Filtrer par période | `filterByPeriod(from,to)` | `GET /api/v1/cotisations?from=&to=` | Contrôle dates/timezone. |
| 8 | Consulter détail | `getContribution(id)` | `GET /api/v1/cotisations/{id}` | DTO sécurisé. |
| 9 | Enregistrer cotisation | `createContribution(command)` | `POST /api/v1/cotisations` | Adhérent, montant, agent, référence, transaction. |
| 10 | Générer référence transaction | `generateContributionReference()` | Inclus dans POST | Génération unique serveur. |
| 11 | Contrôler montant | `validateAmount(amount)` | Inclus POST/validation | Montant positif et règles validées. |
| 12 | Contrôler adhérent | `validateAdherentEligibility(id)` | Inclus création | Existence et droits. |
| 13 | Contrôler doublon | `detectDuplicate(command)` | `POST /api/v1/cotisations/duplicate-check` | Déduplication métier. |
| 14 | Soumettre à validation | `submitForValidation(id)` | `POST /api/v1/cotisations/{id}/submit` | Transition contrôlée et verrouillage des champs sensibles. |
| 15 | Lister à valider | `listPendingValidation(query)` | `GET /api/v1/cotisations?status=A_VALIDER` | Permissions strictes. |
| 16 | Valider cotisation | `validateContribution(id,command)` | `POST /api/v1/cotisations/{id}/validate` | Rôle autorisé, état courant, idempotence. |
| 17 | Rejeter cotisation | `rejectContribution(id,reason)` | `POST /api/v1/cotisations/{id}/reject` | Motif obligatoire. |
| 18 | Historique statuts | `getStatusHistory(id)` | `GET /api/v1/cotisations/{id}/status-history` | Chronologie complète. |
| 19 | Corriger opération autorisée | `correctContribution(id,command)` | `PATCH /api/v1/cotisations/{id}` | Droits stricts, justification et audit avant/après. |
| 20 | Total validé adhérent | `getValidatedTotal(adherentId)` | `GET /api/v1/adherents/{id}/contribution-summary` | Somme des opérations éligibles. |
| 21 | Total en attente | `getPendingTotal(adherentId)` | Même endpoint | Somme des opérations à valider. |
| 22 | Reste vers 15 000 | `calculateRemainingToCnpsThreshold(id)` | Même endpoint | `max(seuil-total,0)` ; seuil [à confirmer]. |
| 23 | Progression vers seuil | `calculateCnpsProgress(id)` | Même endpoint | Pourcentage serveur. |
| 24 | Seuil atteint | `hasReachedCnpsThreshold(id)` | `GET /api/v1/adherents/{id}/cnps/eligibility` | Basé sur cumul éligible. |
| 25 | Adhérents proches seuil | `findNearThreshold(criteria)` | `GET /api/v1/cotisations/cnps/near-threshold` | Définition de proximité [à confirmer]. |
| 26 | Résumé cotisations adhérent | `getContributionSummary(id)` | `GET /api/v1/adherents/{id}/contribution-summary` | Totaux, dernière opération, progression. |
| 27 | Statistiques quotidiennes | `getDailyContributionStats(date)` | `GET /api/v1/cotisations/statistics/daily` | Nombre et montants par statut. |
| 28 | Statistiques par agent | `getAgentContributionStats(agentId,period)` | `GET /api/v1/agents-terrain/{id}/contributions/summary` | Agrégation période/statut. |
| 29 | Bilan journalier | `buildDailyCashReport(date)` | `GET /api/v1/cotisations/daily-report` | Total numérique selon workflow. |
| 30 | Enregistrer montant physique | `recordPhysicalCash(date,amount)` | `POST /api/v1/cotisations/daily-reconciliation` | Contrôle rôle + unicité du bilan. |
| 31 | Calculer écart caisse | `calculateCashDifference(date)` | `GET /api/v1/cotisations/daily-reconciliation/{date}` | Physique moins numérique selon définition validée. |
| 32 | Valider bilan DAF | `validateDailyReconciliation(date,command)` | `POST /api/v1/cotisations/daily-reconciliation/{date}/validate` | DAF uniquement selon règle métier. |
| 33 | Signaler anomalie bilan | `flagDailyReconciliation(date,reason)` | `POST /api/v1/cotisations/daily-reconciliation/{date}/issue` | Motif obligatoire + audit/notification. |
| 34 | Exporter cotisations | `exportContributions(query)` | `POST /api/v1/exports/cotisations` | Export contrôlé et audité. |
| 35 | Protéger mutations par idempotence | `executeIdempotent(command,key)` | POST sensibles | Empêcher double création/validation. |
| 36 | Publier changement cotisation | `publishContributionChangedEvent(event)` | Interne / SSE-WebSocket | Publication après commit. |

**Audit :** création, soumission, validation, rejet, correction, bilan et rapprochement doivent être journalisés.

---

# 4. Fonctionnalités transversales — 26 fonctionnalités

| # | Fonctionnalité | Méthode backend | Endpoint | Développement / règle |
|---:|---|---|---|---|
| 1 | Authentification | `authenticate(credentials)` | `POST /api/v1/auth/login` | Identité, état compte, tokens selon architecture. |
| 2 | Autorisation RBAC | `authorize(user,permission)` | Toutes routes protégées | Vérification serveur. |
| 3 | Contrôle du périmètre | `checkDataScope(user,resource)` | Toutes routes métier | Empêcher les accès hors périmètre/hiérarchie. |
| 4 | Gestion centralisée erreurs | `handleDomainException()` | Toutes routes | Réponses API cohérentes. |
| 5 | Validation des entrées | `validateCommand(command)` | Toutes mutations | Bean Validation + règles métier. |
| 6 | Transactions DB | `executeInTransaction(work)` | Mutations | Atomicité et rollback. |
| 7 | Audit des créations | `recordCreateAudit(event)` | Interne | Acteur, ressource, date, résultat. |
| 8 | Audit des modifications | `recordUpdateAudit(before,after)` | Interne | Avant/après si nécessaire. |
| 9 | Audit suppressions/désactivations | `recordDeleteOrDeactivateAudit()` | Interne | Préserver l'historique par désactivation logique si possible. |
| 10 | Audit validations/rejets | `recordDecisionAudit()` | Interne | Décision, motif, acteur, ressource. |
| 11 | Consultation audit | `queryAudit(criteria)` | `GET /api/v1/audit` | Lecture seule ; accès réservé. |
| 12 | Export audit PDF | `exportAuditPdf(criteria)` | `POST /api/v1/audit/export/pdf` | Super Admin uniquement selon règle définie. |
| 13 | Notifications in-app | `createNotification(command)` | `GET /api/v1/notifications` + interne | Créer et stocker les notifications. |
| 14 | Notifications email | `sendBusinessEmail(event)` | Interne | Traitement asynchrone recommandé. |
| 15 | Marquer notification lue | `markNotificationRead(id)` | `POST /api/v1/notifications/{id}/read` | Vérifier propriétaire. |
| 16 | Pagination standardisée | `buildPage(query)` | Listes | Taille maximale et tri sécurisé. |
| 17 | Filtrage sécurisé | `buildSpecification(filters)` | Listes | Whitelist champs/opérateurs. |
| 18 | Idempotence | `checkIdempotency(key)` | POST sensibles | Éviter doublons. |
| 19 | Concurrence optimiste | `checkVersion(entity)` | PUT/PATCH/validation | Empêcher écrasement silencieux. |
| 20 | Références uniques | `generateUniqueReference(type)` | Créations | Génération atomique + contrainte DB. |
| 21 | Correlation ID | `propagateCorrelationId()` | Toutes requêtes | Traçabilité technique de bout en bout. |
| 22 | Intégrité métier | `validateDomainConsistency()` | Mutations | Vérifier relations, statuts et invariants. |
| 23 | Événements après commit | `publishAfterCommit(event)` | Interne | Ne publier qu'après commit. |
| 24 | Mise à jour temps réel | `publishRealtimeUpdate(event)` | Interne/SSE-WebSocket | Sinon invalidation/refetch frontend. |
| 25 | Tests sécurité endpoints | `securityIntegrationTests()` | Tous endpoints protégés | Vérifier 401/403, rôles et périmètres. |
| 26 | Observabilité | `recordOperationalMetric(event)` | Interne | Erreurs critiques, anomalies, temps de réponse. |

---

# 5. Matrice synthétique des responsabilités

| Domaine | Agent terrain | Gestionnaire | DAF | DGA/DG/PCA | Super Admin |
|---|---|---|---|---|---|
| Collecte terrain | Oui | Contrôle selon périmètre | Non | Supervision selon droits | Administration |
| Création adhérent | Selon workflow | Oui | Non | Selon droits | Administration |
| Complétion dossier | Données autorisées | Oui | Non | Selon droits | Administration |
| Affectation agent | Non | Oui selon organisation | Non | Supervision | Administration |
| Enregistrement cotisation | Oui | Suivi/contrôle selon workflow | Contrôle final | Supervision | Administration |
| Validation ligne par ligne | À confirmer | À confirmer selon rôle CNPS | Contrôle final | Supervision | Administration |
| Validation bilan journalier | Non | Non | Oui | Supervision | Administration |
| Audit global | Non | Non | Non | PCA selon règle | Oui |
| Export audit PDF | Non | Non | Non | Non | Oui |

> **Point métier à confirmer :** le compte rendu utilise « responsable CNPS » pour la validation ligne par ligne, tandis que le référentiel COSITI utilise le rôle Gestionnaire des comptes. Ne pas créer un nouveau rôle avant validation.

---

# 6. Ordre d'implémentation

## Module 1 — Adhérents
- [x] Modèle/entité vérifié
- [x] Migration vérifiée (V14__adherents_completion_documents_cnps.sql — paramètres `[V]` de complétion/documents/proximité CNPS, aucune nouvelle table)
- [x] Repository
- [x] Service
- [x] Création
- [x] Référence automatique
- [x] Doublons
- [x] Liste/recherche (+ filtres téléphone/agent/complétion, tri configurable — #3,4,6,7,8)
- [x] Détail (+ recherche par matricule — #3)
- [x] Complétion (#7, #14-17 — formule `[V]` non validée par la COSITI, voir `CHAMPS_COMPLETION_ADHERENT`)
- [x] Documents (#18-20)
- [x] Affectation (#22-24)
- [x] CNPS (#25-27)
- [x] Audit (#21 + 3 nouveaux types d'opération)
- [x] Tests (unitaires `ServiceAdherentImplTest` exécutés et verts ; intégration `AdherentIntegrationTest` écrits sur le même modèle que l'existant, non exécutés dans cet environnement faute de Docker/Testcontainers — à lancer via `mvn test` sur un poste équipé)

> 35/35 fonctionnalités couvertes (15 déjà en place, 20 ajoutées). Détail et correspondance route-cible → route réelle dans le message de livraison de la session du 2026-09-29.

## Module 2 — Agents terrain
- [x] Modèle/entité vérifié (aucune migration nécessaire — tout réutilise des colonnes déjà en base)
- [x] Liste/recherche (+ filtre statut/zone, tri configurable — #1, #2, #21 ; correctif sécurité : `GET /agents` et `/{id}` passent désormais par `ServiceAgent` avec `ORGANISATION:LIRE`, au lieu d'un accès direct au repository sans permission)
- [x] Profil (modification #5, activation/désactivation #6)
- [x] Portefeuille (pagination #9, résumé chiffré + complétion #8/#10/#11, CNPS ciblé #12/#13, retrait #17, distribution globale #19, historique structuré #24)
- [x] Affectation/réaffectation (#16, #18 déjà en place ; #17 retrait ajouté)
- [x] Activité (#7/#22/#23 unifiées sur `GET /agents/{id}/operations`)
- [x] Statistiques (cotisations de l'agent #14/#15 ; correctif du TODO `montantCollecte` toujours à zéro dans `GET /agents/{id}/charge` — #20)
- [x] Audit (nouveaux `TypeOperation` : `AGENT_MODIFICATION`, `AGENT_CHANGEMENT_STATUT`, `PORTEFEUILLE_RETRAIT` ; événement après commit `AgentModifieEvent` — #25)
- [x] Tests (unitaires `ServiceAgentImplTest` + nouveau `ServicePortefeuilleImplTest`, 53/53 verts ; vérification manuelle bout-en-bout sur serveur réel le 2026-09-29)

> 25/25 fonctionnalités couvertes (4 déjà en place, 5 partielles complétées, 16 ajoutées). Détail et correspondance route-cible → route réelle dans le message de livraison de la session.

## Module 3 — Cotisations
- [ ] Modèle transaction
- [ ] Référence unique
- [ ] Création
- [ ] Contrôles
- [ ] Statuts
- [ ] Validation
- [ ] Rejet
- [ ] Historique
- [ ] Cumul
- [ ] Progression 15 000 FCFA
- [ ] Pré-immatriculation
- [ ] Bilan journalier
- [ ] Rapprochement caisse
- [ ] Validation DAF
- [ ] Audit
- [ ] Tests

## Transversal
- [ ] RBAC
- [ ] périmètres
- [ ] audit
- [ ] notifications
- [ ] idempotence
- [ ] concurrence
- [ ] erreurs
- [ ] correlation ID
- [ ] temps réel
- [ ] sécurité
- [ ] observabilité

---

# 7. Definition of Done

Une fonctionnalité n'est terminée que lorsque :

- [ ] méthode métier implémentée ;
- [ ] endpoint implémenté ou endpoint existant réutilisé ;
- [ ] validation backend ;
- [ ] permission backend ;
- [ ] contrôle du périmètre ;
- [ ] persistance PostgreSQL lorsque nécessaire ;
- [ ] migration Flyway lorsque nécessaire ;
- [ ] transaction DB lorsque nécessaire ;
- [ ] audit ;
- [ ] gestion des erreurs ;
- [ ] tests unitaires/intégration ;
- [ ] documentation OpenAPI ;
- [ ] intégration frontend ;
- [ ] test de bout en bout.

### Flux cible

```text
Frontend
  ↓
HTTP API
  ↓
Controller
  ↓
Service métier
  ↓
Validation + RBAC + Scope
  ↓
Repository
  ↓
PostgreSQL
  ↓
Audit
  ↓
Event après commit
  ↓
Réponse API
  ↓
Mise à jour frontend
```

# 8. Total

| Module | Fonctionnalités |
|---|---:|
| Gestion des adhérents | **35** |
| Gestion des agents de terrain | **25** |
| Gestion des cotisations | **36** |
| Fonctionnalités transversales | **26** |
| **TOTAL** | **122** |
