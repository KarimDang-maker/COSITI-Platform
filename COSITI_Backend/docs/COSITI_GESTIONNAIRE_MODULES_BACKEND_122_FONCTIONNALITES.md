# COSITI V1 — Spécification Backend Critique
## Gestion des adhérents · Agents de terrain · Cotisations · Transversal

> **Périmètre :** backend COSITI V1, principalement pour le Gestionnaire des comptes.  
> **Principe :** chaque fonctionnalité ci-dessous est critique et doit être implémentée, persistée, sécurisée, testée et auditée.

> **État au 02/10/2026 :** les 96 fonctionnalités des trois modules sont implémentées (§6). Depuis le 01/10/2026,
> les trois modules sont en plus soumis au **workflow de correction, validation et traçabilité** (migration
> `V19__workflow_validation_3_modules.sql`, spécification `COSITI_V1_BACKEND_MISE_A_JOUR_3_MODULES_WORKFLOW.md`) :
> une donnée validée ne se modifie plus directement, elle passe par une demande approuvée par un autre utilisateur
> habilité. Les tableaux §1 à §3 restent la **spécification cible d'origine** ; les écarts introduits par le workflow
> sont signalés sous chaque tableau (« Mise à jour workflow ») et récapitulés en §4 bis.
>
> **Depuis le 02/10/2026 (V20)**, l'entrée d'un adhérent est un processus complet
> (`COSITI_V1_SPECIFICATION_COMPLETE_FRAIS_ADHESION_ACTIVATION_CONTROLE_DGA.md`) : frais d'adhésion de 1 000 FCFA
> rattaché à l'adhérent et à l'agent collecteur, **création et activation par le Gestionnaire des comptes**,
> transmission automatique au **contrôle documentaire DGA** (comparaison donnée COSITI / document physique, information
> par information), puis rapprochement « dossiers distincts soumis × 1 000 FCFA » avec le montant enregistré. Voir
> « Mise à jour V20 » sous le §1 et le §4 ter.

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

**Mise à jour workflow (V19, 01/10/2026)** — le dossier adhérent a désormais un statut de validation (`statutValidation`), distinct du statut métier :

| # | Fonctionnalité | Comportement actuel |
|---:|---|---|
| 9 | Créer un adhérent | Le dossier naît en `BROUILLON`. Depuis V20, il devient officiel par l'activation du Gestionnaire puis le contrôle documentaire DGA (voir ci-dessous) ; `POST /adherents/{id}/soumettre` (validation générique V19) renvoie 409 `ADHERENT_VALIDATION_PAR_CONTROLE_DGA`. |
| 13 | Modifier le profil | `PUT /adherents/{id}` est autorisé en `BROUILLON`, `CORRECTION_DEMANDEE` ou `REJETE`. Il renvoie 409 `ADHERENT_EN_VALIDATION` pendant l'examen et 409 `ADHERENT_MODIFICATION_PAR_DEMANDE` une fois le dossier validé. La `version` transmise est maintenant vérifiée. |
| 16 | Compléter un dossier | Sur un dossier validé, `PATCH /adherents/{id}/profil` ne remplit plus que les champs vides ; remplacer une valeur existante passe par une demande de modification. |
| 30, 32 | Modifier informations professionnelles / coordonnées | Mêmes règles que #13. |
| 33 | Changer statut | `POST /adherents/{id}/statut` est refusé sur un dossier validé : le statut se change par demande de modification (champ `statut`). |
| 10 | Vérifier les doublons | Recontrôle à l'approbation du dossier ou d'une modification de l'identité ; 409 sauf `ignorerDoublons=true` (décision tracée). |
| 21 | Historique | Complété par `GET /adherents/{id}/historique-validation` et `GET /adherents/{id}/statut-validation`. |
| — | Modification officielle | Nouvelle route `POST\|GET /adherents/{id}/demandes-modification` (+ `/{demandeId}`), avec ancienne et nouvelle valeur par champ. |

Le changement de pack (`POST /adherents/{id}/pack`) et l'affectation de portefeuille gardent leurs circuits dédiés `[A]`.

**Mise à jour V20 (02/10/2026) — frais d'adhésion, activation et contrôle DGA.** Le compte (`statut`, ex. `ACTIF`), le dossier (`statutValidation`) et le contrôle documentaire (`statutControleDga`, ex. `EN_ATTENTE_DGA`) sont trois états distincts, tous exposés dans `AdherentDetailDto` :

| # | Fonctionnalité | Comportement actuel |
|---:|---|---|
| 9 | Créer un adhérent | Création par le Gestionnaire (inchangée), puis enregistrement du frais d'adhésion (`POST /adherents/{id}/frais-adhesion`) et activation (`POST /adherents/{id}/activer`). |
| 17 | État du dossier | Complété par `GET /adherents/{id}/activation` (conditions avant activation), `GET /adherents/{id}/statut-activation` et `GET /adherents/{id}/synthese-workflow`. |
| 33 | Changer statut | Le passage `PREINSCRIT` → `ACTIF` par `POST /adherents/{id}/statut` est refusé (409 `ADHERENT_ACTIVATION_PAR_ROUTE_DEDIEE`) : l'activation est un processus, pas un changement de statut. |
| 18–20 | Documents | Les pièces exigées (`DOCUMENTS_ADHERENT_OBLIGATOIRES`) conditionnent l'activation si `ACTIVATION_EXIGE_DOCUMENTS` (`[V]`) est vrai, puis sont contrôlées une à une par la DGA. |
| 13, 16, 30, 32 | Modifications | Dossier verrouillé pendant le contrôle DGA ; modifiable directement après une correction demandée par la DGA, puis retransmis (`POST /adherents/{id}/soumettre-dga`). |

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

**Mise à jour workflow (V19, 01/10/2026)** — le profil d'agent a un statut de validation et une version (verrouillage optimiste). Routes servies sous `/api/v1/agents` :

| # | Fonctionnalité | Comportement actuel |
|---:|---|---|
| 4 | Créer profil agent | Créé par la DGA en `BROUILLON`, soumis par `POST /agents/{id}/soumettre`, validé par un autre utilisateur portant `AGENT:VALIDER` (DG ou DGA). |
| 5 | Modifier profil agent | `PUT /agents/{id}` est refusé (409) sur un profil validé ou en cours d'examen ; il faut passer par `POST\|GET /agents/{id}/demandes-modification` (nom, téléphone, zone, objectif). |
| 6 | Activer/désactiver agent | `POST /agents/{id}/statut` est refusé sur un profil validé ; il faut passer par `POST\|GET /agents/{id}/demandes-changement-statut`. La désactivation reste logique ; l'approbation signale un agent qui supervise une équipe en tant que Chef. |
| 7, 22, 23 | Activité / historique | Complétés par `GET /agents/{id}/historique-validation` et `GET /agents/{id}/statut-validation`. |

La désignation du Chef et les mouvements de portefeuille gardent leurs circuits dédiés, déjà audités `[A]`.

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

**Mise à jour workflow (V19, 01/10/2026)** — routes servies sous `/api/v1/paiements` :

| # | Fonctionnalité | Comportement actuel |
|---:|---|---|
| 19 | Corriger opération autorisée | `POST /paiements/{id}/corriger` est réservé aux brouillons. Une cotisation soumise ou validée se corrige par `POST\|GET /paiements/{id}/demandes-correction` (montant, date, mode, référence), approuvée par le DAF seul. |
| 16, 17 | Valider / rejeter | Inchangés, mais bloqués (409 `PAIEMENT_DEMANDE_CORRECTION_EN_COURS`) tant qu'une demande de correction est ouverte ; il en va de même pour `soumettre`, `signaler-incoherence` et `annuler`. |
| 20 à 26 | Cumul, progression, seuil | Une correction approuvée sur une cotisation validée refait l'affectation et recalcule les droits dans la même transaction : le cumul et la progression CNPS sont à jour dès l'approbation. |
| 31 | Écart caisse | L'approbation signale un bilan de caisse déjà validé dont la date est touchée par la correction. |
| 18 | Historique statuts | Complété par `GET /paiements/{id}/historique-validation` et `GET /paiements/{id}/statut-validation`. |

Correspondance avec les routes cibles du workflow : `submit` = `/soumettre`, `validate` = `/valider`, `reject` = `/rejeter`, `request-correction` = `/signaler-incoherence` (DAF), toutes existantes. Une correction sur une cotisation à répartition manuelle est refusée tant que la répartition n'est pas refaite `[A]`.

**Mise à jour V20 (02/10/2026)** — #9 : un paiement de type `INSCRIPTION` est refusé (409 `PAIEMENT_INSCRIPTION_PAR_FRAIS_ADHESION`). Le frais d'adhésion a son propre enregistrement (§4 ter) : le saisir aussi comme cotisation le compterait deux fois et lui ferait acheter des droits. Aucun paiement `INSCRIPTION` n'existait en base.

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

# 4 bis. Workflow de correction, validation et traçabilité (socle transversal, V19)

Détail complet : `COSITI_V1_BACKEND_MISE_A_JOUR_3_MODULES_WORKFLOW.md` (§27 checklist, §27 bis correspondance des routes).

| Fonctionnalité | Endpoint réel | Règle |
|---|---|---|
| Créer une demande | `POST /api/v1/demandes-validation` | Opération, entité, motif, propositions champ par champ ; `soumettre=true` pour créer et soumettre en un appel. |
| Lister / file de validation | `GET /api/v1/demandes-validation`, `GET /api/v1/demandes-validation/en-attente` | Visibilité par permission de lecture et périmètre ; la file ne montre jamais ses propres demandes. |
| Consulter | `GET /api/v1/demandes-validation/{id}` (+ `/elements`, `/decisions`, `/justificatifs`) | Ancienne et nouvelle valeur, journal des transitions, justificatifs. |
| Soumettre / resoumettre / annuler | `POST …/{id}/soumettre`, `/resoumettre`, `/annuler` | Réservé à l'auteur de la demande. |
| Approuver | `POST …/{id}/approuver` | Application atomique dans la même transaction ; 409 si la donnée a changé depuis la demande. |
| Rejeter / demander correction | `POST …/{id}/rejeter`, `/demander-correction` | Motif obligatoire (400 sinon). |
| Joindre un justificatif | `POST …/{id}/justificatifs` | Document déjà téléversé, du même dossier ; types exigés par le paramètre `[V]` `WORKFLOW_JUSTIFICATIFS_OBLIGATOIRES`. |

**Garanties :**
- **Séparation des tâches :** le demandeur ne décide jamais de sa demande (403, contrainte SQL).
- **Politique de validation :** elle repose sur des permissions, sans test de rôle supérieur.
- **Concurrence :** une seule demande ouverte par donnée (409), version de base vérifiée et verrou `FOR UPDATE` à l'approbation.
- **Idempotence :** `cleIdempotence` ou en-tête `Idempotency-Key` ; un rejeu renvoie l'état courant.
- **Audit :** chaque transition est auditée avec l'acteur, ses rôles, l'avant/après, le motif et `X-Trace-Id`.
- **Notifications :** envoyées après commit, dans une transaction séparée.

---

# 4 ter. Frais d'adhésion, activation et contrôle documentaire DGA (V20)

Spécification : `COSITI_V1_SPECIFICATION_COMPLETE_FRAIS_ADHESION_ACTIVATION_CONTROLE_DGA.md` (partie « Mise à jour métier »).
Migration : `V20__frais_adhesion_activation_controle_dga.sql`. Package : `cm.cositi.api.adhesion`.

```text
Agent (collecte + 1 000 FCFA) → Gestionnaire : création, frais, activation → compte ACTIF + EN_ATTENTE_DGA
→ DGA : contrôle information par information → VALIDE | correction (nouveau tour) | rejet
Parallèlement : dossiers distincts soumis × 1 000 FCFA = attendu ; attendu vs enregistré = écart signalé
```

| Fonctionnalité (méthode de la spécification) | Endpoint réel | Règle |
|---|---|---|
| Montant courant (`getCurrentAdhesionFee`) | `GET /api/v1/frais-adhesion/configuration` | Paramètre `MONTANT_INSCRIPTION` (1 000, statut confirmé) — jamais dupliqué côté frontend. |
| Enregistrer le frais (`createRegistrationFee`) | `POST /api/v1/adherents/{id}/frais-adhesion` | Agent collecteur obligatoire ; montant attendu figé depuis le paramètre ; montant reçu saisi (écart constaté, jamais corrigé) ; référence `FAD-NNNNNN` ; un seul frais par adhérent (`UNIQUE`, 409) ; clé d'idempotence rejouée → même frais (200). |
| Frais du dossier (`getRegistrationFee`) | `GET /api/v1/adherents/{id}/frais-adhesion` | Montant requis + frais enregistré. |
| Lister / détail (`listRegistrationFees`) | `GET /api/v1/frais-adhesion`, `GET /api/v1/frais-adhesion/{id}` | Filtres statut, agent, période, écarts ; pagination serveur. |
| Valider l'encaissement | `POST /api/v1/frais-adhesion/{id}/valider` | DAF `[A]`, jamais l'auteur de l'enregistrement (403 + contrainte SQL) ; refusé si anomalie ouverte. |
| Anomalie (`flagFeeAnomaly` / `resolveFeeAnomaly`) | `POST /api/v1/frais-adhesion/{id}/anomalie`, `POST …/{id}/resoudre-anomalie` | Motif obligatoire ; résolution motivée, montant corrigé tracé avant/après ; DAF et auteur notifiés. |
| Synthèses (`getDaily/Period/AgentAdhesionFeeSummary`) | `GET /api/v1/frais-adhesion/synthese`, `GET /api/v1/frais-adhesion/agents/{agentId}/synthese` | Agrégation SQL par jour et par statut. |
| Rapprochement (`calculateDgaSubmissionExpectedFees`, `calculateFeeVariance`, `getFeeReconciliation`) | `GET /api/v1/frais-adhesion/rapprochement?du&au&agentId` | **Dossiers distincts** (clé : adhérent, première transmission — jamais le nombre de tours) × montant unitaire = attendu ; enregistré = somme des frais de ces dossiers ; écart = enregistré − attendu ; détail « N dossiers × 1 000 FCFA = … » ; lignes en écart (sans frais, montant différent, anomalie) ; frais hors soumission signalés à part. |
| Vérification avant activation | `GET /api/v1/adherents/{id}/activation` | Conditions calculées : statut, identité, demande en cours, doublon, documents (V21 : checklist — seules les pièces `OBLIGATOIRE` **confirmées** bloquent), frais (`ACTIVATION_EXIGE_FRAIS_ADHESION`, `C` depuis V21). |
| Activer (`activateAdherent`) | `POST /api/v1/adherents/{id}/activer` | `ADHERENT:ACTIVER` (Gestionnaire) ; conditions bloquantes (400), doublon (409 sauf `ignorerDoublons`), version (409) ; idempotent ; compte `ACTIF` + transmission automatique à la DGA. |
| État / synthèse (`getActivationStatus`, `workflow-summary`) | `GET /api/v1/adherents/{id}/statut-activation`, `GET /api/v1/adherents/{id}/synthese-workflow` | Compte, dossier, contrôle DGA, frais, contrôle courant. |
| Transmettre à la DGA (`submitAdherentToDga`) | `POST /api/v1/adherents/{id}/soumettre-dga` | Retransmission après correction (nouveau tour) ; idempotent si un contrôle est déjà ouvert. |
| File DGA | `GET /api/v1/controles-dga` | Référence, adhérent, agent collecteur, gestionnaire, dates, documents / vérifiés / anomalies, statut ; filtres statut, agent, période, anomalie. |
| Contrôle (`getDocumentVerification`, historique) | `GET /api/v1/controles-dga/{id}`, `GET /api/v1/adherents/{id}/controle-dga`, `GET /api/v1/adherents/{id}/controles-dga`, `GET /api/v1/controles-dga/{id}/journal` | Valeur COSITI figée à la transmission face à la valeur du document ; tours clos jamais modifiés. |
| Démarrer (`startDocumentVerification`) | `POST /api/v1/controles-dga/{id}/demarrer` | `CONTROLE_DGA:EFFECTUER` (DGA) ; jamais par celui qui a activé ou transmis le dossier (403). |
| Vérifier une information (`verifyDocumentField`) | `POST /api/v1/controles-dga/{id}/champs/{champId}/verifier` | `CORRESPOND`, `NON_APPLICABLE` (V21, sans motif), `NON_CORRESPOND` (valeur lue + motif obligatoires), `NON_VERIFIABLE`, `NON_LISIBLE`, `DOCUMENT_MANQUANT` (motif obligatoire) ; version facultative (409). |
| Constat sur un document (`verifyDocument`) | `POST /api/v1/controles-dga/{id}/documents/{documentId}/verifier` | Document manquant ou illisible, appliqué à toutes ses informations. |
| Décider (`completeDocumentVerification`, `requestDocumentCorrection`) | `POST /api/v1/controles-dga/{id}/terminer` | `VALIDER` seulement si tout est vérifié et sans anomalie (409 sinon) → dossier officiel ; `DEMANDER_CORRECTION` / `REJETER` motivés ; idempotent avec la même clé. |
| Synthèse DGA (`getDgaSubmissionSummary`, `getDgaVerificationSummary`) | `GET /api/v1/controles-dga/synthese` | Dossiers distincts soumis, resoumissions, états, anomalies. |

**Correspondance avec les 17 exigences de la spécification (§27) :**

| # | Exigence | Garantie backend |
|---:|---|---|
| 1 | Adhérent identifié de manière unique | Matricule généré + UUID ; doublons recontrôlés à l'activation. |
| 2 | Frais associé à l'adhérent | `frais_adhesion.adherent_id`, `UNIQUE (adherent_id, type_frais)`. |
| 3 | Agent collecteur connu | `frais_adhesion.agent_id NOT NULL`, agent existant et non archivé. |
| 4 | Le Gestionnaire crée et active | `ADHERENT:ACTIVER` réservé au Gestionnaire ; activation par `/statut` refusée. |
| 5 | Transmission au contrôle DGA | Automatique à l'activation ; retransmission tracée par tour. |
| 6 | La DGA vérifie les documents | `CONTROLE_DGA:EFFECTUER` (DGA), document par document. |
| 7 | Chaque information contrôlée traçable | `controle_dga_champ` (valeurs, décision, auteur, date) + audit `CONTROLE_DGA_CHAMP_VERIFIE`. |
| 8 | Anomalies explicites | Statut de correspondance, motif obligatoire (contrainte SQL), validation bloquée. |
| 9 | Corrections traçables | Nouveau tour par retransmission, tours précédents immuables ; correction du frais tracée avant/après. |
| 10 | Dossiers soumis sans double comptage | Comptage sur `adherent.premiere_soumission_dga_le`, jamais réécrite. |
| 11 | Montant théorique calculé côté backend | `GET /frais-adhesion/rapprochement`, agrégation SQL. |
| 12 | Rapproché du montant enregistré | Somme des `montant_recu` des dossiers soumis. |
| 13 | Écarts détectés | Écart global + lignes en écart typées ; jamais corrigé automatiquement. |
| 14 | Actions critiques auditées | 11 nouveaux types d'audit (frais, activation, transmission, contrôle), rôles et `X-Trace-Id` inclus. |
| 15 | Permissions imposées côté backend | `@PreAuthorize` + séparation des tâches dans les services et en base. |
| 16 | Le frontend n'est jamais source de vérité | Montant, conditions, compteurs et calculs fournis par l'API. |
| 17 | OpenAPI de référence | 3 contrôleurs annotés (tags « Adhésion — … »), visibles dans `/v3/api-docs`. |

---

# 4 quater. Matrice documentaire et réduction des règles en attente (V21)

- **Source :** `COSITI_V1_DOCUMENT_DES_REGLES_MISE_A_JOUR_ADHESION_DOCUMENTS_DGA.md` (v2.0).
- **Migration :** `V21__regles_documentaires_reduction_regles_en_attente.sql`.
- **Journal détaillé :** `COSITI_FrontEnd/journal_des_actions_frontEnd/2026-10-02_V21_reduction_regles_en_attente_backend.md`.

| Fonctionnalité | Endpoint réel | Règle |
|---|---|---|
| Matrice documentaire (§38) | `GET /api/v1/exigences-documentaires?enVigueur=` | Table `exigence_documentaire` : 14 exigences (pièces et informations justifiées), niveau, contrôle DGA, période d'effet, statut `C`/`A`/`V`. Remplace `DOCUMENTS_ADHERENT_OBLIGATOIRES`, `CONTROLE_DGA_CHAMPS_PAR_DOCUMENT` et `ACTIVATION_EXIGE_DOCUMENTS`. |
| Checklist dynamique (§19, §20, §25) | `GET /api/v1/adherents/{id}/checklist-documentaire` | Statut par pièce : `REQUIS`… `NON_APPLICABLE`. Dernier résultat DGA par information. `pretPourActivation`. |
| Remplacer une pièce (§22) | `POST /api/v1/documents` + `remplaceDocumentId`, `motifRemplacement` | Version active, même type et même rattachement ; ancienne version `REMPLACE` et conservée ; audit `DOCUMENT_REMPLACEMENT`. |
| Validité d'une pièce (§21) | `POST /api/v1/documents` + `valideDu`, `valideJusquau` | Pièce expirée → `EXPIRE` dans la checklist. |
| Recontrôle après modification (§16) | Approbation d'une demande `ADHERENT_MODIFICATION` | Sur un dossier `VALIDE`, une information justifiée modifiée ouvre un nouveau tour DGA (`CONTROLE_DGA_RECONTROLE`). |
| Règles en attente | `GET /api/v1/regles/en-attente` | Paramètres `V`/`A` et exigences non confirmées. |
| Valider un paramètre | `POST /api/v1/regles/parametres/{cle}/valider` | `REGLE:VALIDER` (PCA `[A]`) ; motif obligatoire ; valeur inchangée ; audit `REGLE_VALIDATION`. |
| Modifier / confirmer une exigence | `PUT /api/v1/regles/exigences/{id}`, `POST …/{id}/valider` | Verrou optimiste. Une pièce obligatoire confirmée devient bloquante. |
| Répartition des versements | `POST /api/v1/paiements/{id}/valider` | `REPARTITION_VERSEMENT` (`C`) appliquée : 700 FCFA Sécurité sociale + reste Épargne (ou recommandation, ou préférence) ; < 700 → 409. Droits imputés sur `DROITS_COMPOSANTES_IMPUTABLES` (`[V]`). |
| Référentiel associations | `GET /api/v1/associations` | Lecture seule (`ADHERENT:LIRE`). |
| Périmètre agents | `GET /api/v1/agents`, `GET /api/v1/agents/{id}`, `GET /api/v1/agents/{id}/operations` | `ORGANISATION_PERIMETRE_AGENTS` (`[V]`, `TOUS` par défaut) ; `SOI_ET_SUPERVISES` → 403 `AGENT_HORS_PERIMETRE` hors périmètre. |
| Corrélation (§42, §46) | Toutes les routes | `X-Correlation-Id` / `X-Trace-Id` repris ou généré, renvoyé ; MDC, `journal_audit.correlation_id`, `traceId` des erreurs. |

---

# 5. Matrice synthétique des responsabilités

| Domaine | Agent terrain | Gestionnaire | DAF | DGA/DG/PCA | Super Admin |
|---|---|---|---|---|---|
| Collecte terrain | Oui | Contrôle selon périmètre | Non | Supervision selon droits | Administration |
| Création adhérent | Selon workflow | Oui | Non | Selon droits | Administration |
| Complétion dossier | Données autorisées | Oui | Non | Selon droits | Administration |
| Affectation agent | Non | Oui selon organisation | Non | Supervision | Administration |
| Enregistrement cotisation | Oui | Suivi/contrôle selon workflow | Contrôle final | Supervision | Administration |
| Validation ligne par ligne | Non | Non | Oui (`PAIEMENT:VALIDER`, jamais sa propre saisie) | Supervision | Administration |
| Saisie caisse physique (bilan) | Non | Oui `[A]` | Non | Supervision | Non |
| Validation bilan journalier | Non | Non | Oui | Supervision | Administration |
| Demande de modification adhérent | Oui (son périmètre) | Oui | Non | Selon droits | Non |
| Validation dossier / modification adhérent | Non | Oui `[A]` (pas sa propre demande) | Non | DGA `[A]` | Non |
| Demande de modification / statut agent | Non | Non | Non | DGA | Non |
| Validation profil / modification / statut agent | Non | Non | Non | DG, DGA `[A]` (pas sa propre demande) | Non |
| Demande de correction cotisation | Oui (son périmètre) | Oui | Oui | Non | Non |
| Validation correction cotisation | Non | Non | Oui (seul) | Non | Non |
| Collecte du frais d'adhésion (1 000 FCFA) | Oui (agent collecteur enregistré) | Non | Non | Non | Non |
| Enregistrement du frais d'adhésion | Non | Oui | Non | Non | Non |
| Activation de l'adhérent | Non | Oui (seul) | Non | Non | Non |
| Contrôle documentaire et décision | Non | Consultation | Non | DGA (jamais sur un dossier qu'elle a activé ou transmis) ; DG, PCA en lecture | Non |
| Validation de l'encaissement du frais | Non | Non | Oui `[A]` (jamais son propre enregistrement) | Non | Non |
| Signalement d'anomalie sur un frais | Non | Non | Oui | DGA | Non |
| Synthèses et rapprochement des frais | Non | Oui | Oui | DGA, DG, PCA | Non |
| Audit global | Non | Non | Non | PCA selon règle | Oui |
| Export audit PDF | Non | Non | Non | Non | Oui |

> **Point métier à confirmer :** le compte rendu utilise « responsable CNPS » pour la validation ligne par ligne, tandis que le référentiel COSITI utilise le rôle Gestionnaire des comptes. En l'état, la validation ligne par ligne est portée par le DAF (`PAIEMENT:VALIDER`) ; aucun nouveau rôle n'a été créé. Les lignes marquées `[A]` sont des choix techniques à faire confirmer par la COSITI ; elles se règlent dans `role_permission`, sans changement de code.

---

# 6. Ordre d'implémentation

## Module 1 — Adhérents
- [x] Modèle/entité vérifié
- [x] Migration vérifiée (`V17__adherents_completion_documents_cnps.sql` — paramètres `[V]` de complétion/documents/proximité CNPS, aucune nouvelle table)
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

- [x] Workflow V19 (01/10/2026) — création contrôlée (`BROUILLON` → soumission → validation), demandes de modification d'un dossier validé, routes directes protégées (#13, #16, #30, #32, #33), recontrôle des doublons à l'approbation, historique et état de validation
- [x] V20 (02/10/2026) — activation par le Gestionnaire et contrôle documentaire DGA en remplacement de la validation générique du dossier ; activation par `/statut` refusée (voir Module 4)

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

- [x] Workflow V19 (01/10/2026) — profil validé par le DG/la DGA, version de l'agent (verrouillage optimiste), modification et activation/désactivation par demande, routes directes protégées (#5, #6)

> 25/25 fonctionnalités couvertes (4 déjà en place, 5 partielles complétées, 16 ajoutées). Détail et correspondance route-cible → route réelle dans le message de livraison de la session.

## Module 3 — Cotisations
> Routes cibles `/cotisations` servies sous `/api/v1/paiements` (convention réelle depuis J4, déjà consommée par le frontend) ; rapprochement de caisse sous `/api/v1/bilans-caisse/{date}`.

- [x] Modèle transaction (`paiement` inchangé + statut `REJETE`, colonnes de rejet, table `bilan_caisse_journalier` — `V18__cotisations_rejet_bilan_caisse.sql`)
- [x] Référence unique (#10 — numéro de reçu par séquence, déjà en place ; #5 recherche `?reference=` sur numéro de reçu ou référence de transaction)
- [x] Création (#9, #11, #12 déjà en place ; saisie en brouillon `POST /paiements?brouillon=true` ajoutée)
- [x] Contrôles (#13 doublon : `POST /paiements/verifier-doublon` + refus 409 `PAIEMENT_REFERENCE_DEJA_UTILISEE` d'une référence de transaction déjà portée par un paiement actif du même mode — `[A]`)
- [x] Statuts (#14 `POST /paiements/{id}/soumettre` BROUILLON → A_CONTROLER, champs verrouillés ensuite ; #6/#15 filtre `statut` déjà en place)
- [x] Validation (#16 déjà en place ; refuse désormais un brouillon ou un paiement rejeté)
- [x] Rejet (#17 `POST /paiements/{id}/rejeter`, motif obligatoire, jamais par l'auteur de la saisie)
- [x] Historique (#18 `GET /paiements/{id}/historique-statuts`, reconstruit depuis `journal_audit`)
- [x] Liste/recherche (#1 tri whitelisté `tri`/`direction` ; #3 `adherentMatricule` ; #4 `agentId` exposé ; #2/#7/#8 déjà en place)
- [x] Cumul (#20, #21, #26 — `GET /adherents/{id}/resume-cotisations`, déjà en place)
- [x] Progression 15 000 FCFA (#22, #23 — même endpoint ; seuil lu du pack, non codé en dur)
- [x] Pré-immatriculation (#24 `GET /droits/adherents/{id}` ; #25 `GET /cnps/proches-seuil` — déjà en place)
- [x] Statistiques (#27 `GET /paiements/statistiques/quotidiennes` ajouté ; #28 `GET /agents/{id}/cotisations-resume` déjà en place)
- [x] Bilan journalier (#29 `GET /paiements/bilan-journalier` — définition du montant numérique en paramètres `[V]` `BILAN_CAISSE_MODES_NUMERIQUE`/`BILAN_CAISSE_STATUTS_INCLUS`)
- [x] Rapprochement caisse (#30 `POST /bilans-caisse`, un seul bilan par date ; #31 `GET /bilans-caisse/{date}` écart physique − numérique + recalcul à la lecture ; liste `GET /bilans-caisse`)
- [x] Validation DAF (#32 `POST /bilans-caisse/{date}/valider`, DAF seul, jamais sur son propre bilan, concurrence optimiste `version` ; #33 `POST /bilans-caisse/{date}/anomalie`, motif obligatoire + notification)
- [x] Export (#34 `POST /exports/paiements`, déjà en place)
- [x] Idempotence (#35 `Idempotency-Key` sur création déjà en place ; revalidation/re-soumission/re-rejet → 409 ; unicité du bilan par date)
- [x] Événements (#36 `PaiementModifieEvent` publié sur chaque mutation, consommé après commit — temps réel SSE/WebSocket non construit, le frontend invalide/recharge)
- [x] Audit (nouveaux `TypeOperation` : `PAIEMENT_SOUMISSION`, `PAIEMENT_REJET`, `BILAN_CAISSE_SAISIE`, `BILAN_CAISSE_VALIDATION`, `BILAN_CAISSE_ANOMALIE`)
- [x] Tests (unitaires `ServicePaiementImplTest` 17 + nouveau `ServiceBilanCaisseImplTest` 13 ; 151/151 tests unitaires verts ; recette manuelle bout-en-bout sur serveur réel le 2026-09-30)

- [x] Workflow V19 (01/10/2026) — correction contrôlée par demande validée par le DAF (#19), application atomique avec ré-affectation et recalcul des droits, décisions bloquées pendant une correction, bilan validé touché signalé

> 36/36 fonctionnalités couvertes (21 déjà en place, 15 ajoutées ou complétées). Correctif sécurité au passage : `GET /paiements/{id}/recu` ne vérifiait pas le périmètre du demandeur.

- [x] V20 (02/10/2026) — paiement `INSCRIPTION` refusé : le frais d'adhésion a son enregistrement dédié (Module 4)

## Module 4 — Frais d'adhésion, activation et contrôle DGA (V20, 02/10/2026)
> Definition of Done backend de la spécification (§24). Détail des routes en §4 ter.

- [x] Frais d'adhésion configurable à 1 000 FCFA (paramètre `MONTANT_INSCRIPTION`, existant depuis V1)
- [x] Association frais ↔ adhérent ↔ agent collecteur
- [x] Unicité du frais initial (`UNIQUE (adherent_id, type_frais)` + 409 + idempotence)
- [x] Calcul des dossiers distincts soumis à la DGA (clé : adhérent, première transmission)
- [x] Calcul du montant attendu, par période et par agent
- [x] Montant enregistré et rapprochement (écart signalé, lignes en écart, jamais de correction automatique)
- [x] Anomalies de frais (signalement motivé, résolution tracée, validation de l'encaissement par un autre utilisateur)
- [x] Activation par le Gestionnaire (conditions calculées, idempotente, version, doublon)
- [x] Soumission DGA (automatique à l'activation, retransmission par tour, idempotente)
- [x] Contrôle document par document, information par information (5 résultats, motif obligatoire)
- [x] Décision DGA (validation bloquée par une anomalie ou une information non vérifiée ; correction ; rejet)
- [x] Corrections (dossier rouvert, nouveau tour, tours précédents immuables)
- [x] Audit (11 nouveaux types : `FRAIS_ADHESION_*`, `ADHERENT_ACTIVATION`, `ADHERENT_SOUMISSION_DGA`, `CONTROLE_DGA_*`)
- [x] Notifications (DGA à la transmission, Gestionnaire à la correction/rejet/validation, DAF sur écart ou anomalie de frais — après commit)
- [x] Idempotence (frais, activation, transmission, décision DGA)
- [x] Optimistic locking (versions frais, contrôle, information ; verrous `FOR UPDATE` sur l'adhérent et le contrôle)
- [x] Migration Flyway (`V20__frais_adhesion_activation_controle_dga.sql`)
- [x] Tests unitaires (`ServiceFraisAdhesionImplTest` 11, `ServiceActivationAdherentImplTest` 10, `ServiceControleDgaImplTest` 13 — 219/219 au total)
- [ ] Tests d'intégration Testcontainers — **non écrits pour V20** (Docker absent) ; parcours couvert par une recette bout-en-bout sur serveur réel (52 contrôles verts, 02/10/2026)
- [x] Tests sécurité (recette : agent refusé à l'activation et à la file DGA, Gestionnaire refusé au contrôle et à la validation d'encaissement)
- [x] OpenAPI à jour (tags « Adhésion — … »)

> Décisions `[V]`/`[A]` à confirmer (§25 de la spécification) : exigence du frais et des documents à l'activation (`ACTIVATION_EXIGE_FRAIS_ADHESION`, `ACTIVATION_EXIGE_DOCUMENTS`, vrais par défaut) ; informations contrôlées par type de document (`CONTROLE_DGA_CHAMPS_PAR_DOCUMENT`) ; DAF comme validateur de l'encaissement ; suite d'un dossier rejeté (le compte garde son statut, rien n'est inventé) ; bilan de caisse : le frais d'adhésion n'entre pas dans le montant numérique.

## Transversal
- [x] RBAC — `@PreAuthorize` par permission sur chaque service ; politique de validation du workflow portée par les permissions (`ADHERENT:VALIDER`, `AGENT:VALIDER`, `PAIEMENT:VALIDER` + DAF, `BILAN_CAISSE:*`, `ADHERENT:ACTIVER`, `FRAIS_ADHESION:*`, `CONTROLE_DGA:*`)
- [x] Périmètres — `ServicePerimetreDonnees` sur les lectures et les mutations ; visibilité et file de validation filtrées par périmètre ; synthèses de frais réservées au périmètre adhérent global
- [x] Audit — `journal_audit` append-only ; avant/après, motif, décision ; demandes de workflow tracées de la création à l'application ; frais, activation et contrôle DGA tracés avec rôles de l'acteur
- [x] Notifications — in-app (écart de caisse, bilan, demandes soumises/décidées, contrôle DGA, anomalie de frais), envoyées après commit ; **e-mail non construit**
- [x] Idempotence — `Idempotency-Key` sur la création de paiement ; clé d'idempotence sur la création et chaque décision du workflow ; unicité du bilan par date ; frais, activation, transmission et décision DGA
- [x] Concurrence — versions JPA (adhérent, agent, paiement, bilan, demande, frais, contrôle DGA), version de base vérifiée à l'approbation, verrous `FOR UPDATE`
- [x] Erreurs — `GestionnaireExceptions`, format unique, codes métier explicites (400/403/404/409)
- [ ] Correlation ID — **partiel** : `X-Trace-Id` repris dans les réponses d'erreur et l'audit du workflow, sans propagation systématique (filtre/MDC à ajouter)
- [ ] Temps réel — **non construit** : événements de domaine publiés après commit (`AdherentModifieEvent`, `AgentModifieEvent`, `PaiementModifieEvent`, `DemandeValidationEvent`), sans canal SSE/WebSocket ; le frontend invalide et recharge
- [ ] Sécurité — **partiel** : JWT, RBAC serveur, séparation des tâches, limitation de débit et tests 401/403 en place ; `spotbugs`/`find-sec-bugs` et `dependency-check` non branchés (voir `SUIVI_EXECUTION.md`)
- [ ] Observabilité — **non construit** au-delà des journaux applicatifs et d'`actuator/health` (aucune métrique métier)

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

### État au 02/10/2026

| Critère | Adhérents | Agents | Cotisations | Workflow V19 | Frais, activation, DGA (V20) |
|---|---|---|---|---|---|
| Méthode métier, endpoint, validation, permission, périmètre | ✅ | ✅ | ✅ | ✅ | ✅ |
| Persistance, migration Flyway, transaction | ✅ (V17) | ✅ | ✅ (V18) | ✅ (V19) | ✅ (V20) |
| Audit, gestion des erreurs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tests unitaires | ✅ | ✅ | ✅ | ✅ | ✅ (219/219 au total) |
| Tests d'intégration Testcontainers | écrits, non exécutés (Docker absent) | idem | idem | `ControleDafIntegrationTest` adapté, non exécuté | ❌ non écrits |
| Documentation OpenAPI | ✅ | ✅ | ✅ | ✅ (tags « Workflow — … ») | ✅ (tags « Adhésion — … ») |
| Intégration frontend | ✅ (29/09) | ✅ (29/09) | ✅ (30/09) | ❌ à faire | ❌ à faire |
| Test de bout en bout | partiel — exercé par les recettes du 01/10 et du 02/10 | ✅ recette manuelle (29/09) | ✅ recette manuelle (30/09) | ✅ recette manuelle 53/53 (01/10) | ✅ recette manuelle 52/52 (02/10) |

**Intégration frontend restant à faire pour le workflow :**
- Les formulaires de modification d'un adhérent ou d'un agent **validé** reçoivent désormais un 409 : ils doivent créer une demande de modification.
- L'écran de résolution d'incohérence appelait `POST /paiements/{id}/corriger` : il doit passer par `POST /paiements/{id}/demandes-correction`.
- Afficher `statutValidation` et construire la file de validation (`GET /demandes-validation/en-attente`).

**Intégration frontend restant à faire pour V20 :**
- Section « Frais d'adhésion » du dossier, écran de vérification avant activation et bouton « Activer » (le passage à `ACTIF` par le changement de statut est désormais refusé).
- Afficher séparément le compte (`statut`) et le contrôle DGA (`statutControleDga`).
- File DGA, écran de comparaison donnée COSITI / document physique, anomalies, décision, historique des tours.
- Tableau de bord des frais : « N dossiers × 1 000 FCFA = attendu », enregistré, écart (`GET /frais-adhesion/rapprochement`).
- Retirer l'option `INSCRIPTION` du formulaire de paiement si elle y figure.

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

Le socle de workflow (§4 bis) s'ajoute à ce décompte : il n'ajoute pas de fonctionnalité métier, il change la façon dont les trois modules modifient une donnée officielle. Le processus d'adhésion V20 (§4 ter) s'y ajoute aussi : 19 fonctionnalités backend (frais, activation, contrôle DGA, rapprochement), toutes implémentées.

| Statut d'implémentation | Nombre |
|---|---:|
| Adhérents, agents, cotisations — implémentées | **96 / 96** |
| Frais d'adhésion, activation, contrôle DGA (V20) — implémentées | **19 / 19** |
| Transversales — couvertes | **7 / 11** points de la checklist §6 (correlation ID et sécurité partiels ; temps réel et observabilité non construits) |
