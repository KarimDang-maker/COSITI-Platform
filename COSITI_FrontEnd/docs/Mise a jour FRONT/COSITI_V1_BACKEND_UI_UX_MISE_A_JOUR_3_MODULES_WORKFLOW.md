# COSITI V1 — DOCUMENT CONSOLIDÉ

> Ce document reprend la mise à jour Backend du workflow de validation/correction des trois premiers modules et l'étend avec une spécification UI/UX détaillée. Les endpoints proposés restent à confronter à `/api/v1/openapi`, qui demeure le contrat d'autorité.

# COSITI V1 — Mise à jour des 3 premiers modules
## Spécifications Backend + UI/UX détaillées du workflow de contrôle, validation, correction et traçabilité

**Version : 1.0**  
**Périmètre :** Adhérents · Agents de terrain · Cotisations  
**Nature :** spécification fonctionnelle et technique pour implémentation Frontend + Backend  
**Principe central :** `Proposition → Justification → Vérification → Validation → Application → Traçabilité`

---

# 1. Objet du document

Cette mise à jour introduit dans les trois premiers modules de COSITI un mécanisme de **Maker–Checker / Maker–Reviewer** permettant de contrôler les créations, modifications, validations, rejets et corrections.

Le principe est le suivant :

1. un utilisateur habilité prépare ou propose une donnée ;
2. la donnée reste dans un état contrôlé tant qu'elle n'est pas validée ;
3. le demandeur ne peut pas valider sa propre proposition ;
4. un utilisateur disposant de l'autorité métier appropriée vérifie la proposition ;
5. il peut :
   - approuver ;
   - rejeter ;
   - demander une correction ou des informations complémentaires ;
6. une donnée déjà validée ne peut plus être modifiée directement si elle est soumise au contrôle ;
7. toute modification ultérieure passe par une **Demande de modification** ;
8. la valeur officielle reste inchangée tant que la modification n'est pas approuvée ;
9. chaque étape est enregistrée dans une piste d'audit permanente.

> **Règle importante :** le Frontend facilite le workflow mais ne constitue jamais l'autorité de sécurité. Toutes les permissions, transitions, contrôles métier, restrictions de modification et validations doivent être réappliqués côté Backend.

---

# 2. Périmètre des trois modules

| Module | Fonction principale | Workflow concerné |
|---|---|---|
| Adhérents | Création et gestion du dossier adhérent | Création, validation, correction, modification contrôlée |
| Agents de terrain | Gestion des profils et affectations des agents | Création, validation, changement de profil/statut |
| Cotisations | Enregistrement et contrôle des opérations de cotisation | Saisie, validation financière, rejet, correction contrôlée |

Les autres modules COSITI ne sont pas modifiés par ce document sauf pour les mécanismes transversaux nécessaires : audit, notifications, autorisations, concurrence, idempotence et workflow de validation.

---

# 3. Règle d'autorité du Backend

Le Backend doit considérer le navigateur comme un environnement non fiable.

Une règle d'interface telle que :

```text
"Le bouton Modifier est masqué pour cet utilisateur"
```

ne constitue pas une protection.

Le Backend doit refuser une opération même si l'utilisateur :

- appelle directement l'API ;
- modifie le payload ;
- modifie l'ID d'un objet ;
- réutilise une ancienne requête HTTP ;
- contourne l'interface ;
- tente de modifier une donnée déjà soumise ;
- tente d'approuver sa propre demande ;
- tente d'utiliser une autorité qu'il ne possède pas.

### Exemple

Le Frontend peut afficher :

```text
Cette donnée est en attente de validation.
Modification directe désactivée.
```

Mais le Backend doit également imposer :

```text
PUT /api/v1/adherents/{id}
→ 409 ou 403 selon le cas
→ motif : DOSSIER_PENDING_VALIDATION
```

---

# 4. Modèle global du workflow

## 4.1 Création

```text
Brouillon
   ↓
Préparation par le Maker
   ↓
Soumission
   ↓
En attente de validation
   ↓
┌───────────────┬──────────────────┬─────────────────────┐
│ Approuvée     │ Rejetée          │ Correction demandée │
└───────┬───────┴──────────────────┴──────────┬──────────┘
        ↓                                      ↓
   Donnée officielle                    Retour au Maker
                                               ↓
                                      Correction / complément
                                               ↓
                                           Resoumission
```

## 4.2 Modification d'une donnée déjà validée

```text
Donnée officielle
       ↓
Demande de modification
       ↓
Valeur actuelle protégée
       +
Nouvelle valeur proposée
       +
Motif obligatoire
       +
Justificatifs éventuels
       ↓
En attente de validation
       ↓
┌───────────────┬──────────────────┬─────────────────────┐
│ Approuvée     │ Rejetée          │ Informations        │
│               │                  │ complémentaires     │
└───────┬───────┴──────────────────┴──────────┬──────────┘
        ↓                                      ↓
Application atomique                     Retour demandeur
        ↓
Nouvelle valeur officielle
        ↓
Audit permanent
```

---

# 5. Statuts métier

Les statuts exacts doivent rester alignés avec le contrat `/api/v1/openapi`. Les valeurs ci-dessous constituent la cible fonctionnelle.

## 5.1 Statuts d'une demande de validation

```text
BROUILLON
EN_ATTENTE_VALIDATION
CORRECTION_DEMANDEE
APPROUVEE
REJETEE
ANNULEE
```

## 5.2 Statuts d'une demande de modification

```text
BROUILLON
EN_ATTENTE_VALIDATION
INFORMATIONS_DEMANDEES
APPROUVEE
REJETEE
ANNULEE
```

## 5.3 Règles

| Statut | Maker peut modifier | Maker peut soumettre | Reviewer peut décider |
|---|---:|---:|---:|
| Brouillon | Oui | Oui | Non |
| En attente | Non | Non | Oui |
| Correction demandée | Oui | Oui | Non |
| Informations demandées | Oui | Oui | Non |
| Approuvée | Non | Non | Non |
| Rejetée | Non, sauf nouveau processus | Non | Non |
| Annulée | Non | Non | Non |

---

# 6. Modèle Backend cible

## 6.1 Entités principales

### `validation_request`

Objet représentant une demande de contrôle.

Champs recommandés :

```text
id
request_type
module
aggregate_type
aggregate_id
requested_by
reviewed_by
status
reason
submitted_at
reviewed_at
created_at
updated_at
version
```

### `validation_request_item`

Permet de représenter précisément les modifications.

```text
id
validation_request_id
field_name
field_label
data_type
old_value
proposed_value
change_type
reason
```

`old_value` et `proposed_value` peuvent utiliser JSONB lorsque le type de données l'exige, mais les champs critiques ne doivent pas être transformés en un simple blob JSON impossible à contrôler.

### `validation_request_document`

```text
id
validation_request_id
document_id
document_type
uploaded_by
created_at
```

### `validation_request_decision`

```text
id
validation_request_id
decision
decided_by
reason
comment
created_at
```

### Audit

Les événements d'audit doivent être immuables.

Ils doivent au minimum permettre de retrouver :

```text
acteur
rôle
date/heure
action
module
objet concerné
ancienne valeur
nouvelle valeur proposée/appliquée
motif
décision
documents associés
correlation_id
```

Les données sensibles ne doivent pas être journalisées inutilement en clair.

---

# 7. Règle de concurrence

Chaque agrégat soumis au workflow doit être protégé contre les modifications concurrentes.

Approche recommandée :

```text
@Version
```

ou mécanisme équivalent.

Exemple :

```text
version = 8
```

Le Frontend envoie :

```text
expectedVersion = 8
```

Si la donnée est passée à :

```text
version = 9
```

le Backend refuse l'opération et demande au client de recharger l'état courant.

Objectif :

- éviter l'écrasement silencieux ;
- éviter qu'une validation s'applique sur une donnée devenue obsolète ;
- conserver la cohérence de l'audit.

---

# 8. API transversale du workflow

> **Important :** les routes ci-dessous sont des routes cibles. `/api/v1/openapi` reste la source d'autorité. Une route absente du contrat doit être ajoutée ou adaptée avant implémentation.

| Méthode | Endpoint cible | Fonction |
|---|---|---|
| POST | `/api/v1/validation-requests` | Créer une demande |
| GET | `/api/v1/validation-requests` | Lister les demandes autorisées |
| GET | `/api/v1/validation-requests/{id}` | Détail |
| POST | `/api/v1/validation-requests/{id}/submit` | Soumettre |
| POST | `/api/v1/validation-requests/{id}/approve` | Approuver |
| POST | `/api/v1/validation-requests/{id}/reject` | Rejeter |
| POST | `/api/v1/validation-requests/{id}/request-correction` | Demander correction |
| POST | `/api/v1/validation-requests/{id}/resubmit` | Resoumettre |
| POST | `/api/v1/validation-requests/{id}/cancel` | Annuler |
| GET | `/api/v1/validation-requests/{id}/items` | Voir les changements |
| GET | `/api/v1/validation-requests/{id}/decisions` | Voir les décisions |
| GET | `/api/v1/validation-requests/{id}/documents` | Voir les justificatifs |
| GET | `/api/v1/validation-requests/pending` | Voir les demandes à traiter |

---

# 9. Backend — Module Adhérents

## 9.1 Fonctionnalités à maintenir

Le module conserve notamment :

- création d'adhérent ;
- vérification de doublon ;
- génération de référence ;
- consultation ;
- profil ;
- documents ;
- historique ;
- affectation à un agent ;
- informations professionnelles ;
- coordonnées ;
- dossier ;
- progression ;
- cumul des cotisations ;
- seuil CNPS ;
- éligibilité ;
- export.

La mise à jour ajoute le contrôle hiérarchique et la protection des données validées.

## 9.2 Méthodes Backend supplémentaires

```text
submitAdherentForValidation(id, command)
getAdherentValidationStatus(id)
getAdherentValidationHistory(id)
createAdherentChangeRequest(id, command)
listAdherentChangeRequests(id, query)
getAdherentChangeRequest(id, requestId)
approveAdherentValidation(requestId, command)
rejectAdherentValidation(requestId, command)
requestAdherentCorrection(requestId, command)
resubmitAdherent(requestId, command)
applyApprovedAdherentChange(requestId)
```

## 9.3 Endpoints cibles

```http
POST /api/v1/adherents/{id}/submit
GET  /api/v1/adherents/{id}/validation-status
GET  /api/v1/adherents/{id}/validation-history

POST /api/v1/adherents/{id}/change-requests
GET  /api/v1/adherents/{id}/change-requests
GET  /api/v1/adherents/{id}/change-requests/{requestId}
```

Décisions :

```http
POST /api/v1/validation-requests/{requestId}/approve
POST /api/v1/validation-requests/{requestId}/reject
POST /api/v1/validation-requests/{requestId}/request-correction
POST /api/v1/validation-requests/{requestId}/resubmit
```

## 9.4 Règles métier

### Création

Le Gestionnaire prépare le dossier.

Pendant `BROUILLON` :

- modification autorisée au demandeur ;
- documents ajoutables ;
- contrôles de cohérence actifs ;
- vérification de doublons active.

Après soumission :

```text
EN_ATTENTE_VALIDATION
```

le dossier devient protégé contre la modification directe par son créateur.

### Approbation

Une approbation doit :

1. vérifier que la demande est encore en attente ;
2. vérifier l'autorité du validateur ;
3. vérifier que le validateur est différent du demandeur ;
4. vérifier la version de l'agrégat ;
5. exécuter les règles métier ;
6. appliquer les changements dans une transaction ;
7. enregistrer la décision ;
8. écrire l'audit ;
9. générer les notifications ;
10. publier les événements après commit.

---

# 10. UI/UX — Module Adhérents

## 10.1 Écran liste

La liste doit permettre de distinguer immédiatement :

- dossiers en brouillon ;
- dossiers en attente ;
- dossiers avec correction demandée ;
- dossiers validés ;
- dossiers rejetés.

### Colonnes recommandées

| Colonne | Utilité |
|---|---|
| Référence | Identifiant métier |
| Nom complet | Identification |
| Téléphone | Contact |
| Agent | Responsable |
| Statut dossier | Workflow |
| Statut validation | Contrôle |
| Complétion | Progression |
| Dernière modification | Traçabilité |
| Action | Consulter / traiter |

### Filtres

- statut dossier ;
- statut validation ;
- agent ;
- période ;
- complétion ;
- seuil CNPS ;
- recherche texte ;
- matricule ;
- téléphone.

### UX

Le statut ne doit pas être communiqué uniquement par la couleur.

Exemple :

```text
EN ATTENTE DE VALIDATION
```

avec une icône et un texte explicite.

---

# 11. UI/UX — Création d'un adhérent

Le formulaire doit être organisé par sections.

## Section A — Identité

- nom ;
- prénom ;
- date de naissance ;
- sexe si prévu par le modèle ;
- pièce d'identité ;
- numéro de pièce.

## Section B — Coordonnées

- téléphone ;
- email ;
- adresse ;
- localisation.

## Section C — Informations professionnelles

- activité ;
- secteur ;
- profession ;
- informations demandées par le modèle métier.

## Section D — Informations administratives

- agent responsable ;
- statut ;
- informations d'affiliation.

## Section E — Informations financières

- pack ;
- allocation Sécurité Sociale ;
- allocation Épargne ;
- règles de calcul applicables.

## Section F — Documents

- pièce d'identité ;
- justificatifs requis ;
- autres documents.

---

# 12. UX du formulaire de création

Le formulaire doit afficher une progression claire.

Exemple :

```text
1. Identité
2. Contact
3. Profession
4. Administratif
5. Financier
6. Documents
7. Vérification
8. Soumission
```

Avant soumission :

```text
┌──────────────────────────────────────────┐
│ Vérification du dossier                  │
├──────────────────────────────────────────┤
│ ✓ Informations obligatoires complètes    │
│ ✓ Aucun doublon détecté                  │
│ ✓ Documents requis présents              │
│ ✓ Informations financières cohérentes    │
│                                          │
│ [Enregistrer brouillon] [Soumettre]      │
└──────────────────────────────────────────┘
```

La soumission doit demander une confirmation.

Exemple :

```text
Soumettre le dossier ?

Après soumission, vous ne pourrez plus modifier
directement les informations jusqu'à la décision
du validateur.

[Annuler] [Soumettre pour validation]
```

---

# 13. UX — Dossier en attente

Une fois soumis, l'écran doit devenir principalement consultatif.

Afficher une bannière :

```text
Dossier en attente de validation

Soumis par : Gestionnaire X
Date : 01/10/2026 09:42
Validateur attendu : rôle autorisé

Les modifications directes sont temporairement désactivées.
```

Le bouton :

```text
Modifier
```

est remplacé par :

```text
Demander une modification
```

uniquement si la règle métier autorise le demandeur à créer cette demande.

---

# 14. UI/UX — Vue du validateur

Le validateur doit disposer d'un écran spécialisé.

## Structure

```text
┌─────────────────────────────────────────────────────────┐
│ DOSSIER À VALIDER                                       │
├─────────────────────────────────────────────────────────┤
│ Référence : ADH-000123                                  │
│ Statut : EN ATTENTE DE VALIDATION                       │
│ Demandeur : Gestionnaire X                              │
│ Date : 01/10/2026 09:42                                │
├─────────────────────────────────────────────────────────┤
│ IDENTITÉ                                                 │
│ Nom       │ Valeur proposée │ Source │ Contrôle         │
│ ...       │ ...             │ ...    │ ✓               │
├─────────────────────────────────────────────────────────┤
│ DOCUMENTS                                                │
│ [Voir document] [Voir document]                          │
├─────────────────────────────────────────────────────────┤
│ HISTORIQUE                                               │
│ ...                                                     │
├─────────────────────────────────────────────────────────┤
│ [Demander correction] [Rejeter] [Approuver]             │
└─────────────────────────────────────────────────────────┘
```

---

# 15. UX — Comparaison avant/après

Pour une demande de modification :

```text
Champ : Téléphone

Valeur actuelle
+237 6XX XX XX XX

Nouvelle valeur proposée
+237 6YY YY YY YY

Motif
Le numéro précédent n'est plus utilisé.

Justificatif
[Document.pdf]

Demandeur
Gestionnaire X

Date
01/10/2026 10:15
```

La valeur actuelle doit rester clairement distinguée de la valeur proposée.

### Règle UX fondamentale

Ne jamais donner l'impression que la nouvelle valeur est déjà officielle.

Utiliser les libellés :

```text
Valeur officielle actuelle
Valeur proposée
```

et non :

```text
Ancienne valeur
Nouvelle valeur
```

lorsque la décision n'est pas encore prise.

---

# 16. UX — Demande de correction

Lorsqu'un validateur demande une correction :

```text
Demande de correction

Motif obligatoire :
[________________________________]

Informations à corriger :
☑ Téléphone
☑ Adresse

Commentaire :
[________________________________]

[Annuler] [Envoyer la demande]
```

Le demandeur reçoit :

```text
Correction demandée

Le dossier ADH-000123 nécessite une correction.

Motif :
Le numéro de téléphone doit être vérifié.

[Ouvrir le dossier]
```

---

# 17. UX — Historique de validation

Afficher une timeline :

```text
01/10 09:42
Gestionnaire X
Dossier créé

01/10 10:15
Gestionnaire X
Dossier soumis

01/10 11:03
DGA Y
Correction demandée

01/10 11:27
Gestionnaire X
Correction effectuée

01/10 11:40
Gestionnaire X
Dossier resoumis

01/10 12:05
DGA Y
Dossier approuvé
```

L'historique est consultatif et ne doit pas être modifiable depuis l'interface.

---

# 18. Backend — Module Agents de terrain

## 18.1 Méthodes supplémentaires

```text
submitFieldAgentForValidation(id, command)
getFieldAgentValidationStatus(id)
getFieldAgentValidationHistory(id)
createFieldAgentChangeRequest(id, command)
listFieldAgentChangeRequests(id, query)
getFieldAgentChangeRequest(id, requestId)
createFieldAgentStatusChangeRequest(id, command)
```

## 18.2 Endpoints cibles

```http
POST /api/v1/agents-terrain/{id}/submit
GET  /api/v1/agents-terrain/{id}/validation-status
GET  /api/v1/agents-terrain/{id}/validation-history

POST /api/v1/agents-terrain/{id}/change-requests
GET  /api/v1/agents-terrain/{id}/change-requests
GET  /api/v1/agents-terrain/{id}/change-requests/{requestId}

POST /api/v1/agents-terrain/{id}/status-change-requests
GET  /api/v1/agents-terrain/{id}/status-change-requests
```

## 18.3 Règles

Les modifications sensibles du profil agent doivent suivre le workflow approprié.

Le Backend doit contrôler :

- qui crée l'agent ;
- qui peut modifier le profil ;
- qui peut modifier son statut ;
- qui peut affecter un adhérent ;
- qui peut réaffecter un adhérent ;
- qui peut valider la demande ;
- qui ne peut pas valider sa propre demande.

Les droits DGA/PCA doivent rester conformes à la matrice métier déjà définie. Il ne faut pas fusionner automatiquement les permissions générales du PCA avec les permissions opérationnelles du DGA.

---

# 19. UI/UX — Module Agents de terrain

## 19.1 Liste des agents

Colonnes :

- nom ;
- identifiant ;
- téléphone ;
- zone/périmètre ;
- statut ;
- nombre d'adhérents ;
- dernière activité ;
- statut de validation ;
- actions.

Filtres :

- actif/inactif ;
- zone ;
- statut validation ;
- charge ;
- recherche.

## 19.2 Profil agent

Sections :

```text
Informations personnelles
Informations professionnelles
Affectation
Portefeuille
Statut
Historique
Demandes de modification
```

## 19.3 Modification protégée

Si le profil est validé :

```text
Profil validé

Les données sensibles de ce profil sont protégées.
Pour modifier une information contrôlée, créez une
demande de modification.

[Demander une modification]
```

---

# 20. UI/UX — Création d'un agent

Le formulaire doit afficher :

```text
Informations personnelles
Informations professionnelles
Affectation
Documents
Vérification
Soumission
```

Avant soumission :

```text
✓ Profil complet
✓ Informations obligatoires présentes
✓ Documents requis présents
✓ Aucun conflit détecté
```

Après soumission :

```text
Statut : EN ATTENTE DE VALIDATION
```

Les champs concernés sont verrouillés.

---

# 21. UI/UX — Changement de statut agent

Un changement de statut ne doit pas être traité comme une simple modification visuelle.

Exemple :

```text
Demande de changement de statut

Statut actuel :
ACTIF

Statut proposé :
INACTIF

Motif obligatoire :
[________________________________]

Justificatif :
[Ajouter un document]

[Annuler] [Soumettre]
```

Le statut officiel reste `ACTIF` jusqu'à la validation.

---

# 22. Backend — Module Cotisations

Ce module possède un niveau de contrôle renforcé car il manipule des données financières.

## 22.1 Méthodes supplémentaires

```text
submitContributionForValidation(id)
getContributionValidationStatus(id)
getContributionValidationHistory(id)
createContributionChangeRequest(id, command)
listContributionChangeRequests(id, query)
getContributionChangeRequest(id, requestId)
approveContribution(id, command)
rejectContribution(id, command)
requestContributionCorrection(id, command)
applyApprovedContributionChange(requestId)
```

## 22.2 Endpoints cibles

```http
POST /api/v1/cotisations/{id}/submit
GET  /api/v1/cotisations/{id}/validation-status
GET  /api/v1/cotisations/{id}/validation-history

POST /api/v1/cotisations/{id}/change-requests
GET  /api/v1/cotisations/{id}/change-requests
GET  /api/v1/cotisations/{id}/change-requests/{requestId}

POST /api/v1/cotisations/{id}/validate
POST /api/v1/cotisations/{id}/reject
POST /api/v1/cotisations/{id}/request-correction
```

---

# 23. Règles financières à conserver

## 23.1 Allocation

Pour une cotisation :

```text
Sécurité Sociale >= 700 FCFA
Sécurité Sociale + Épargne = montant total
```

### Pack 700

```text
Sécurité Sociale = 700
Épargne = 0
```

### Pack 1000 par défaut

```text
Sécurité Sociale = 700
Épargne = 300
```

Pour un montant supérieur à 1000 FCFA, l'allocation doit respecter les règles métier autorisées.

## 23.2 Seuil CNPS

Le Backend doit continuer à calculer :

```text
cumul des cotisations
reste jusqu'au seuil de 15 000 FCFA
progression
éligibilité
```

Le Frontend ne doit jamais devenir la source de vérité de ces calculs.

---

# 24. UI/UX — Module Cotisations

## 24.1 Liste

Colonnes :

- référence transaction ;
- adhérent ;
- montant ;
- sécurité sociale ;
- épargne ;
- agent ;
- date ;
- statut ;
- statut validation ;
- action.

## 24.2 Formulaire de saisie

Le formulaire doit distinguer clairement :

```text
Montant total
Allocation Sécurité Sociale
Allocation Épargne
```

Calcul affiché :

```text
700 + 300 = 1 000 FCFA
```

Contrôle immédiat :

```text
✓ Allocation équilibrée
```

ou :

```text
Erreur :
La somme des allocations doit être égale au montant total.
```

Le contrôle UI est informatif ; le Backend refait le contrôle.

---

# 25. UX — Cotisation à valider

Une cotisation soumise doit afficher :

```text
COTISATION EN ATTENTE DE VALIDATION

Référence : COT-000456
Adhérent : ADH-000123
Montant : 1 000 FCFA
Sécurité Sociale : 700 FCFA
Épargne : 300 FCFA
Agent : Agent X
Saisie : 01/10/2026 10:25

[Voir adhérent]
[Voir historique]
[Rejeter]
[Demander correction]
[Valider]
```

---

# 26. UX — Validation financière

Avant validation, afficher un écran de synthèse.

```text
┌─────────────────────────────────────────────┐
│ CONFIRMATION DE VALIDATION                  │
├─────────────────────────────────────────────┤
│ Montant : 1 000 FCFA                       │
│ Sécurité Sociale : 700 FCFA                │
│ Épargne : 300 FCFA                         │
│                                             │
│ Adhérent : ADH-000123                       │
│ Agent : Agent X                             │
│                                             │
│ ✓ Référence unique                         │
│ ✓ Adhérent valide                           │
│ ✓ Allocation cohérente                      │
│ ✓ Aucune incohérence détectée              │
│                                             │
│ [Annuler] [Confirmer la validation]         │
└─────────────────────────────────────────────┘
```

La confirmation doit être explicite.

---

# 27. UX — Correction d'une cotisation

Une correction doit présenter :

```text
Valeur officielle actuelle
Montant : 1 000 FCFA

Valeur proposée
Montant : 1 500 FCFA

Motif :
Erreur de saisie lors de l'enregistrement initial.

Justificatif :
[document]

Demandeur :
Agent/Gestionnaire X

Date :
01/10/2026
```

La modification n'est appliquée qu'après autorisation du rôle financier compétent.

---

# 28. DAF et séparation des responsabilités

La logique financière doit respecter la séparation des tâches :

```text
Saisie opérationnelle
       ↓
À VALIDER
       ↓
DAF
       ↓
Validation financière
       ↓
Donnée financière validée
```

Le Gestionnaire peut enregistrer une opération selon les droits définis, mais ne doit pas devenir l'autorité finale de validation financière si cette responsabilité appartient au DAF.

Le Backend doit empêcher toute tentative de contournement.

---

# 29. UI/UX — Centre de validation

Un écran transversal peut être utilisé par les rôles autorisés.

## Onglets

```text
À traiter
Corrections demandées
Informations demandées
Traitées
Historique
```

## Carte de demande

```text
ADH-000123
Création d'adhérent

Demandé par : Gestionnaire X
Date : 01/10/2026 09:42
Statut : En attente

[Ouvrir]
```

Pour les cotisations :

```text
COT-000456
Validation financière

Montant : 1 000 FCFA
Demandé par : Gestionnaire X
Date : 01/10/2026 10:25

[Ouvrir]
```

---

# 30. UX — Filtrage des demandes

Filtres recommandés :

- module ;
- type de demande ;
- statut ;
- demandeur ;
- validateur ;
- période ;
- priorité métier si elle existe ;
- référence.

La recherche doit être paginée côté Backend.

---

# 31. UX — Actions de validation

Chaque action critique doit être explicitement différenciée.

### Approuver

```text
Approuver la demande

Cette action rendra la proposition officielle.

[Annuler] [Approuver]
```

### Rejeter

```text
Rejeter la demande

Motif obligatoire :
[________________________]

[Annuler] [Rejeter]
```

### Demander correction

```text
Demander une correction

Expliquez précisément les informations
à corriger ou compléter.

[________________________]

[Annuler] [Envoyer]
```

---

# 32. Notifications UI/UX

Le système doit notifier les utilisateurs concernés.

## Exemple

Après soumission :

```text
Votre demande a été soumise.
Référence : VR-000123
Statut : En attente de validation.
```

Après correction :

```text
Une correction est demandée sur le dossier ADH-000123.
```

Après approbation :

```text
Le dossier ADH-000123 a été approuvé.
```

Après rejet :

```text
La demande VR-000123 a été rejetée.
Motif : ...
```

Les notifications doivent être accessibles depuis une zone dédiée.

---

# 33. Realtime

La liste des adhérents, agents ou demandes de validation doit refléter rapidement les changements.

Approche recommandée :

1. action Backend ;
2. transaction DB ;
3. commit ;
4. événement ;
5. invalidation/refetch TanStack Query ;
6. mise à jour UI.

WebSocket/SSE n'est nécessaire que si le besoin de temps réel justifie sa complexité.

Le Frontend ne doit pas simuler un succès avant la confirmation Backend.

---

# 34. États UI obligatoires

Pour chaque écran, prévoir :

```text
Loading
Success
Empty
Error
Forbidden
Unauthorized
Conflict
Validation error
Pending validation
Correction requested
Rejected
Approved
```

## Exemple Empty State

```text
Aucune demande en attente

Il n'y a actuellement aucune demande
correspondant aux filtres sélectionnés.
```

## Exemple Error State

```text
Impossible de charger les demandes.

[Réessayer]
```

## Exemple Conflict

```text
Cette donnée a été modifiée entre-temps.

Rechargez les informations avant de continuer.

[Recharger]
```

---

# 35. Gestion des erreurs Backend → UX

Le Backend doit retourner des erreurs structurées.

Exemples de codes métier :

```text
VALIDATION_REQUEST_NOT_FOUND
VALIDATION_REQUEST_ALREADY_DECIDED
VALIDATION_REQUEST_SELF_APPROVAL
INVALID_VALIDATOR_ROLE
AGGREGATE_VERSION_CONFLICT
AGGREGATE_LOCKED_FOR_VALIDATION
DIRECT_MODIFICATION_FORBIDDEN
CHANGE_REQUEST_NOT_ALLOWED
INVALID_FINANCIAL_ALLOCATION
DUPLICATE_ADHERENT
REQUIRED_DOCUMENT_MISSING
```

Le Frontend traduit ces codes en messages compréhensibles.

Ne jamais afficher uniquement :

```text
500 Internal Server Error
```

à l'utilisateur final.

---

# 36. Architecture Frontend recommandée

```text
src/
├── app/
├── auth/
├── components/
│   ├── workflow/
│   │   ├── ValidationStatusBadge
│   │   ├── ValidationTimeline
│   │   ├── ValidationRequestCard
│   │   ├── ValidationDecisionModal
│   │   ├── ChangeRequestForm
│   │   ├── ChangeComparison
│   │   └── WorkflowBanner
│   ├── adherents/
│   ├── agents-terrain/
│   └── cotisations/
├── features/
│   ├── adherents/
│   ├── agents-terrain/
│   ├── cotisations/
│   └── validation/
├── hooks/
├── services/
├── schemas/
├── types/
└── routes/
```

---

# 37. Composants UI/UX à créer

## Transversaux

```text
ValidationStatusBadge
ValidationStatusBanner
ValidationTimeline
ValidationRequestCard
ValidationRequestDetails
ValidationDecisionPanel
ApprovalConfirmationModal
RejectionModal
CorrectionRequestModal
ChangeRequestForm
ChangeComparisonTable
SupportingDocuments
AuditTimeline
VersionConflictDialog
ForbiddenActionMessage
PendingState
```

## Adhérents

```text
AdherentWorkflowHeader
AdherentValidationSummary
AdherentChangeRequestPanel
AdherentProfileComparison
AdherentDocumentVerification
```

## Agents

```text
FieldAgentWorkflowHeader
FieldAgentValidationSummary
FieldAgentChangeRequestPanel
AgentStatusChangeDialog
AgentAssignmentReview
```

## Cotisations

```text
ContributionWorkflowHeader
ContributionValidationSummary
ContributionAllocationBreakdown
ContributionChangeRequestPanel
FinancialValidationModal
```

---

# 38. Formulaires et validation Frontend

Utiliser :

```text
React Hook Form
+
Zod
```

pour les validations locales.

Exemples :

```text
motif requis pour rejet
motif requis pour modification sensible
montant > 0
allocation valide
email valide
téléphone valide
document obligatoire
```

Mais :

> Zod ne remplace jamais Bean Validation et les contrôles métier Backend.

---

# 39. TanStack Query

Chaque ressource doit avoir une clé de cache stable.

Exemple :

```text
['adherents']
['adherent', adherentId]
['adherent-validation', adherentId]
['adherent-change-requests', adherentId]

['agents-terrain']
['agent-terrain', agentId]
['agent-validation', agentId]

['cotisations']
['cotisation', contributionId]
['cotisation-validation', contributionId]

['validation-requests', filters]
```

Après une validation :

```text
invalidateQueries(adherent)
invalidateQueries(validationRequests)
invalidateQueries(history)
```

Ne pas modifier artificiellement le cache comme si la validation avait réussi avant la réponse du serveur.

---

# 40. Protection des boutons

Le Frontend peut utiliser les permissions pour améliorer l'UX.

Exemple :

```text
canSubmit
canApprove
canReject
canRequestCorrection
canCreateChangeRequest
canViewValidationHistory
```

Mais chaque permission doit être confirmée par le Backend.

---

# 41. Matrice UX des actions

| Action | Maker | Reviewer autorisé | DAF |
|---|---:|---:|---:|
| Créer brouillon | Oui selon module | Selon droits | Selon droits |
| Modifier brouillon | Oui | Selon droits | Selon droits |
| Soumettre | Oui | Selon droits | Selon droits |
| Approuver adhérent | Non pour sa propre demande | Selon matrice | Selon matrice |
| Rejeter adhérent | Non pour sa propre demande | Selon matrice | Selon matrice |
| Demander correction | Non pour sa propre demande | Oui | Selon matrice |
| Modifier directement donnée validée | Non si workflow requis | Non | Selon domaine |
| Demander modification | Oui si autorisé | Oui si autorisé | Oui si autorisé |
| Valider cotisation | Non si demandeur | Selon autorité financière | Oui, responsabilité financière |
| Export audit global | Non | Non | Non sauf droit spécifique | 

La matrice finale doit être alignée avec les rôles COSITI validés et `/api/v1/openapi`.

---

# 42. Règle UX essentielle : ne jamais masquer silencieusement un problème

Si l'utilisateur n'a pas le droit de réaliser une action, afficher une information compréhensible lorsque cela est pertinent :

```text
Action non disponible

Cette opération nécessite une validation par
un utilisateur disposant de l'autorité correspondante.
```

Si une donnée est verrouillée :

```text
Donnée protégée

Cette information est actuellement soumise au workflow
de validation et ne peut pas être modifiée directement.
```

---

# 43. Documents justificatifs

Pour toute modification nécessitant un justificatif :

1. upload ;
2. contrôle du type ;
3. contrôle de taille ;
4. stockage sécurisé ;
5. association à la demande ;
6. accès authentifié ;
7. audit de consultation si requis ;
8. conservation selon politique métier.

Le Frontend ne doit jamais exposer directement un chemin de stockage privé.

---

# 44. Audit UI

L'utilisateur autorisé doit pouvoir consulter :

```text
Action
Acteur
Rôle
Date
Objet
Ancienne valeur
Valeur proposée
Valeur appliquée
Motif
Décision
Document
```

Exemple :

```text
01/10/2026 12:05
DGA Y

APPROBATION

Dossier : ADH-000123

Décision :
Approuvé

Motif :
Dossier vérifié et conforme.

Demandeur :
Gestionnaire X
```

L'historique ne doit pas proposer de bouton :

```text
Modifier
Supprimer
```

---

# 45. Backend — Services à implémenter

## Workflow

```text
ValidationRequestService
ValidationDecisionService
ValidationAuthorizationService
ValidationPolicyService
ValidationApplicationService
ValidationHistoryService
ChangeRequestService
```

## Audit

```text
AuditService
AuditEventFactory
AuditQueryService
```

## Notifications

```text
NotificationService
EmailNotificationService
```

## Concurrence

```text
ConcurrencyService
IdempotencyService
```

---

# 46. Transactions Backend

Une approbation doit être atomique.

Exemple conceptuel :

```text
BEGIN TRANSACTION

1. Charger validation_request
2. Vérifier statut
3. Vérifier rôle
4. Vérifier self-approval
5. Vérifier version
6. Vérifier règles métier
7. Appliquer changement
8. Incrémenter version
9. Enregistrer décision
10. Enregistrer audit
11. Enregistrer événements/outbox

COMMIT

Après commit :
→ notification
→ publication événement
→ invalidation/refetch côté Frontend
```

Une erreur avant commit doit empêcher l'application partielle.

---

# 47. Idempotence

Les actions critiques doivent être idempotentes.

Exemples :

```text
approve
reject
submit
resubmit
```

Une double soumission ne doit pas :

- créer deux validations ;
- appliquer deux fois une modification ;
- enregistrer deux cotisations ;
- provoquer deux effets financiers.

---

# 48. Tests Backend obligatoires

## Workflow

- création brouillon ;
- soumission ;
- verrouillage ;
- approbation ;
- rejet ;
- demande correction ;
- resoumission ;
- annulation ;
- self-approval refusée ;
- rôle insuffisant refusé ;
- demande déjà traitée refusée.

## Concurrence

- version obsolète ;
- double validation ;
- double soumission ;
- modification concurrente.

## Sécurité

- accès horizontal interdit ;
- accès vertical interdit ;
- changement d'ID ;
- tentative de modification directe ;
- endpoint appelé sans permission.

## Cotisations

- montant invalide ;
- allocation incorrecte ;
- sécurité sociale < 700 ;
- somme allocations ≠ montant ;
- validation DAF ;
- correction financière contrôlée.

---

# 49. Tests Frontend obligatoires

## États

Tester :

```text
loading
empty
success
error
forbidden
conflict
pending
correction requested
approved
rejected
```

## Workflow

Tester :

```text
Créer → Brouillon
Brouillon → Soumission
Soumission → Verrouillage
Correction → Modification
Modification → Resoumission
Validation → Lecture seule
```

## Actions critiques

Tester que :

- la confirmation s'affiche ;
- le bouton est désactivé pendant l'appel ;
- le double clic ne provoque pas deux requêtes ;
- le message Backend est correctement présenté ;
- le cache est invalidé après succès.

---

# 50. Definition of Done — Backend

Une fonctionnalité de workflow est considérée terminée uniquement si :

- [ ] Entité métier définie ;
- [ ] Migration Flyway créée ;
- [ ] Repository créé ;
- [ ] Service métier créé ;
- [ ] Authorization implémentée ;
- [ ] Bean Validation implémentée ;
- [ ] Transaction implémentée ;
- [ ] Optimistic locking implémenté ;
- [ ] Idempotence traitée ;
- [ ] Audit implémenté ;
- [ ] Notifications traitées ;
- [ ] Tests unitaires ;
- [ ] Tests intégration ;
- [ ] Tests sécurité ;
- [ ] OpenAPI mis à jour ;
- [ ] Aucun endpoint existant ne permet de contourner le workflow.

---

# 51. Definition of Done — Frontend

> État au 01/10/2026 — implémentation frontend livrée, branchée sur les routes **réelles** du backend
> (`/demandes-validation`, `/soumettre`, `/approuver`…, voir §51 bis). Tests frontend : 169 verts, dont 14 dans
> `src/ecrans/workflow/Workflow.test.tsx` ; `tsc -b`, oxlint et build de production verts. Recette E2E contre la
> pile réelle non relancée.

- [x] Écran liste adapté — liste des agents : colonne « Validation » ; centre de validation (§29). **Limite** : la liste des adhérents n'a pas de colonne de validation, `AdherentResumeDto` ne porte pas `statutValidation` (statut visible sur la fiche) — `[A]` ;
- [x] Statuts visibles — `BadgeStatut` `statutValidation`, `statutDemande`, `operationWorkflow`, `actionWorkflow` : libellé toujours écrit, jamais la couleur seule ;
- [x] Formulaire adapté — création en brouillon annoncée, soumission confirmée avec vérification du dossier, formulaire de demande de modification ;
- [x] États loading/empty/error — plus « accès non autorisé », « action non disponible », conflit, en attente, correction demandée, rejeté, approuvé (§34) ;
- [x] Écran validation — `/validations/:id` : demandeur, données, justificatifs, historique, décisions (§14) ;
- [x] Comparaison avant/après — « Valeur officielle actuelle / Valeur proposée », « avant / appliquée » seulement après approbation (§15) ;
- [x] Modal approbation — confirmation explicite, recontrôle des doublons avec approbation « malgré tout » tracée ;
- [x] Modal rejet — motif obligatoire ;
- [x] Demande de correction — motif obligatoire ; resoumission par le demandeur avec valeurs corrigées ;
- [x] Demande de modification — adhérent, agent (profil et statut), cotisation (correction validée par le DAF) ; justificatif facultatif pour adhérent et cotisation ;
- [x] Historique — chronologie de chaque demande et onglet « Validation » des fiches, consultatifs ;
- [x] Notifications — émises par le serveur après commit ; la cloche est rafraîchie après chaque action du workflow ;
- [x] Gestion conflit de version — `versionBase` envoyée, `DEMANDE_VERSION_OBSOLETE` → message et « Recharger » ;
- [x] Permissions UI — boutons selon `GET /auth/moi` et `PERMISSION_DECISION`, désactivés avec explication pour l'auteur d'une demande ; le serveur reste seul juge ;
- [x] TanStack Query — clés `["workflow", …]`, invalidation du domaine concerné après chaque décision, aucune mise à jour optimiste ;
- [x] React Hook Form + Zod — Zod pour les contrôles de forme ; le formulaire de demande (champs dynamiques) est en état contrôlé plutôt qu'en React Hook Form ;
- [x] Aucun `any` ;
- [x] Aucun calcul métier critique uniquement côté Frontend ;
- [x] Aucun stockage d'authentification dans localStorage/sessionStorage.

## 51 bis. Avancement par module — Frontend

### Adhérents

- [x] Statut de validation affiché sur la fiche, bandeau d'état (brouillon, en attente, correction demandée, rejeté, officiel).
- [x] Soumission du dossier (`POST /adherents/{id}/soumettre`) avec vérification : complétion, pièces obligatoires, recontrôle des doublons annoncé.
- [x] Dossier validé : « Modifier l'identité », « Modifier » (coordonnées, professionnel) et « Changer le statut » remplacés par « Demander une modification » / « Demander un changement de statut » (`POST /adherents/{id}/demandes-modification`).
- [x] Dossier en attente : modifications directes masquées, complétion suspendue ; dossier validé : complétion des seuls champs vides (règle serveur).
- [x] Onglet « Validation » (`GET /adherents/{id}/historique-validation`).
- [ ] Colonne et filtre « statut de validation » dans la liste — `[A]` : absents de `AdherentResumeDto` et de `GET /adherents`.

### Agents de terrain

- [x] Colonne « Validation » dans la liste ; badge et bandeau sur la fiche.
- [x] Profil en brouillon : modification directe et soumission (`POST /agents/{id}/soumettre`).
- [x] Profil validé : « Demander une modification » (`/demandes-modification`) et « Demander la désactivation / réactivation » (`/demandes-changement-statut`) ; le statut officiel reste inchangé jusqu'à l'approbation.
- [x] Onglet « Validation ».
- [ ] Justificatif sur une demande d'agent — `[A]` : l'API des documents ne rattache un fichier qu'à un adhérent ou un paiement.

### Cotisations

- [x] Brouillon : modification directe par son auteur (`POST /paiements/{id}/corriger`).
- [x] Cotisation soumise, incohérente ou validée : « Demander une correction » (`POST /paiements/{id}/demandes-correction`), validée par le DAF dans le centre de validation.
- [x] Validation bloquée tant qu'une correction est en cours (bouton désactivé, explication) ; lien « Corrections de cotisations à valider » depuis `/daf`.
- [x] Historique des demandes de correction sur la fiche.
- [ ] Ventilation Sécurité Sociale / Épargne (§24, §25) — `[A]` : `GET /paiements/{id}/affectations` ne renvoie qu'un identifiant de composante, sans libellé ni référentiel, et reste réservé à `PAIEMENT:AFFECTER`.

### Socle

- [x] Centre de validation `/validations` : « À traiter » (jamais ses propres demandes), « Mes demandes », « Toutes les demandes », filtres module / statut / type, pagination serveur.
- [x] Fiche de demande `/validations/:id` : décisions, resoumission, annulation, justificatifs (téléversement puis rattachement), chronologie.
- [x] Idempotence : clé `Idempotency-Key` fixée à l'ouverture de chaque dialogue, boutons désactivés pendant l'appel.
- [x] Correspondance des routes : `validation-requests` → `demandes-validation`, `submit/approve/reject/request-correction/resubmit/cancel` → `soumettre/approuver/rejeter/demander-correction/resoumettre/annuler`, `change-requests` → `demandes-modification` (adhérents, agents) et `demandes-correction` (cotisations), `status-change-requests` → `demandes-changement-statut`, `agents-terrain` → `agents`, `cotisations` → `paiements`.

---

# 52. Flux complet — Adhérent

```text
Gestionnaire
    ↓
Création dossier
    ↓
Brouillon
    ↓
Contrôles
    ↓
Soumission
    ↓
En attente
    ↓
Validateur
    ├── Approuver → dossier officiel
    ├── Rejeter → dossier rejeté
    └── Correction → retour Gestionnaire
                           ↓
                       correction
                           ↓
                       resoumission
```

---

# 53. Flux complet — Agent

```text
Création / proposition
        ↓
Brouillon
        ↓
Soumission
        ↓
Validation
        ↓
Approuvé
        ↓
Profil officiel
        ↓
Modification ultérieure
        ↓
Demande de modification
        ↓
Validation
        ↓
Application
```

---

# 54. Flux complet — Cotisation

```text
Saisie opérationnelle
        ↓
Contrôle des règles
        ↓
À VALIDER
        ↓
DAF / autorité financière
        ├── Valider
        ├── Rejeter
        └── Demander correction
```

Pour une cotisation déjà validée :

```text
Donnée officielle
      ↓
Demande de modification
      ↓
Contrôle financier
      ↓
Approbation
      ↓
Application atomique
      ↓
Audit
```

---

# 55. Protection des endpoints existants

Une partie critique de cette mise à jour consiste à auditer les endpoints déjà existants.

Exemple :

```http
PUT /api/v1/adherents/{id}
PATCH /api/v1/adherents/{id}/profile
PUT /api/v1/agents-terrain/{id}
POST /api/v1/cotisations/{id}/validate
```

Pour chaque endpoint, déterminer :

```text
Qui peut l'appeler ?
Dans quel état ?
Pour quel type de donnée ?
Est-ce une modification directe ?
Doit-elle passer par validation ?
```

Un endpoint existant ne doit pas devenir une porte arrière permettant de contourner le workflow.

---

# 56. Documentation OpenAPI

Toutes les nouvelles opérations doivent être documentées :

- request DTO ;
- response DTO ;
- erreurs ;
- permissions ;
- statuts ;
- exemples ;
- règles métier importantes.

Le contrat `/api/v1/openapi` doit être mis à jour avant que le Frontend ne considère les endpoints comme définitifs.

---

# 57. Règles UX générales à ne pas violer

1. Une donnée en attente de validation doit être clairement identifiable.
2. Une donnée proposée ne doit jamais être présentée comme officielle.
3. Une donnée validée doit être visuellement protégée.
4. Les actions critiques nécessitent une confirmation.
5. Les rejets nécessitent un motif.
6. Les demandes de correction nécessitent une explication exploitable.
7. Les modifications sensibles doivent pouvoir présenter les valeurs avant/après.
8. Les erreurs Backend doivent être compréhensibles.
9. Aucun succès ne doit être affiché avant la confirmation du Backend.
10. Les états de chargement doivent empêcher les doubles actions.
11. Les utilisateurs ne doivent pas perdre leurs données en cas d'erreur.
12. L'historique doit être lisible et chronologique.
13. La couleur seule ne doit jamais communiquer un statut.
14. Les documents justificatifs doivent être clairement associés à la demande.
15. Les écrans doivent rester utilisables avec clavier et lecteurs d'écran lorsque possible.
16. Les formulaires longs doivent préserver les données saisies.
17. Les filtres doivent être conservés pendant la navigation lorsque pertinent.
18. Les tables doivent être paginées côté serveur.
19. Les calculs financiers affichés doivent provenir des données Backend.
20. Les actions non autorisées ne doivent jamais être rendues accessibles uniquement par modification du navigateur.

---

# 58. Résultat attendu

Après cette mise à jour, les trois modules doivent fonctionner selon une logique homogène :

```text
┌──────────────────────────────────────────────┐
│                 COSITI V1                    │
├──────────────────────────────────────────────┤
│ ADHÉRENTS                                    │
│ Création → Validation → Modification         │
├──────────────────────────────────────────────┤
│ AGENTS TERRAIN                               │
│ Création → Validation → Modification         │
├──────────────────────────────────────────────┤
│ COTISATIONS                                  │
│ Saisie → Contrôle → Validation financière    │
└──────────────────────────────────────────────┘

                ↓

      WORKFLOW CENTRALISÉ

Proposition
    ↓
Justification
    ↓
Vérification
    ↓
Décision
    ↓
Application
    ↓
Audit
    ↓
Notification
```

---

# 59. Priorité d'implémentation

## Phase 1 — Socle Workflow

1. `validation_request`
2. `validation_request_item`
3. `validation_request_document`
4. `validation_request_decision`
5. statuts
6. authorization
7. audit
8. optimistic locking
9. idempotence

## Phase 2 — Adhérents

1. soumission ;
2. verrouillage ;
3. validation ;
4. correction ;
5. resoumission ;
6. demande de modification ;
7. historique ;
8. UI validation.

## Phase 3 — Agents

1. création contrôlée ;
2. validation ;
3. modification contrôlée ;
4. changement de statut ;
5. historique ;
6. UI validation.

## Phase 4 — Cotisations

1. soumission ;
2. contrôle financier ;
3. validation DAF ;
4. rejet ;
5. correction ;
6. modification contrôlée ;
7. audit financier ;
8. UI financière.

## Phase 5 — Durcissement

1. tests sécurité ;
2. tests concurrence ;
3. tests idempotence ;
4. tests E2E ;
5. audit des anciens endpoints ;
6. documentation OpenAPI ;
7. tests de non-régression.

---

# 60. Point de contrôle avant développement

Avant de coder, l'équipe doit vérifier :

- [ ] matrice exacte des rôles ;
- [ ] autorité exacte de validation de chaque module ;
- [ ] endpoints réellement présents dans `/api/v1/openapi` ;
- [ ] DTO existants ;
- [ ] entités existantes ;
- [ ] migrations existantes ;
- [ ] endpoints directs pouvant contourner le workflow ;
- [ ] politique documentaire ;
- [ ] politique d'audit ;
- [ ] règles financières ;
- [ ] règles de visibilité par périmètre ;
- [ ] règles de notification.

Toute information non confirmée par le contrat fonctionnel ou `/api/v1/openapi` doit être marquée comme **à valider** plutôt que supposée.

---

# 61. Règle finale d'architecture

Le workflow ne doit pas être uniquement un composant d'interface.

La protection doit exister sur toute la chaîne :

```text
UI
 ↓
API
 ↓
Authorization
 ↓
Service métier
 ↓
Validation Policy
 ↓
Transaction
 ↓
Database
 ↓
Audit
 ↓
Event
 ↓
Notification
```

Le Frontend explique et guide.

Le Backend décide et protège.

La base de données conserve l'état officiel.

L'audit conserve la preuve des opérations.

C'est cette séparation qui permet à COSITI d'obtenir un mécanisme de contrôle comparable à une logique **Maker–Checker**, sans permettre au créateur d'une opération de contourner la validation hiérarchique.
