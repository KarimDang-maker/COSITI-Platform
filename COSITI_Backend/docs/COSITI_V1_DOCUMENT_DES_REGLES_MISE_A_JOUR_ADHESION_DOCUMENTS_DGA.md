# COSITI V1 --- DOCUMENT DES RÈGLES

## Mise à jour : création, activation, frais d'adhésion, contrôle documentaire DGA et checklist des pièces

**Version : 2.0 --- 02 octobre 2026**\
**Périmètre :** Adhérents · Agent de terrain · Gestionnaire des comptes
· DGA · Documents · Frais d'adhésion · Validation documentaire · Audit ·
Notifications · Reporting · Sécurité

------------------------------------------------------------------------

## 1. Objet

Ce document constitue le référentiel des règles à appliquer pour la
nouvelle logique COSITI concernant :

-   création d'un adhérent ;
-   frais d'adhésion de 1 000 FCFA ;
-   activation par le Gestionnaire ;
-   soumission à la DGA ;
-   contrôle du document physique par rapport aux données numériques ;
-   checklist des pièces à fournir ;
-   correction et resoumission ;
-   audit ;
-   Backend ;
-   Frontend ;
-   UI/UX ;
-   fonctionnalités transversales.

La chaîne de référence est :

``` text
Agent terrain
    ↓
Collecte informations + pièces + 1 000 FCFA
    ↓
Gestionnaire
    ↓
Création
    ↓
Contrôles initiaux
    ↓
Activation
    ↓
Soumission DGA
    ↓
Contrôle documentaire
    ↓
Validation / Correction / Rejet
    ↓
Audit
```

------------------------------------------------------------------------

## 2. Analyse des règles existantes

Les documents COSITI disponibles confirment plusieurs principes :
référentiel unique, identifiant stable de l'adhérent, association des
documents aux dossiers, contrôle des permissions côté serveur,
traçabilité des opérations sensibles et gestion des pièces manquantes.
fileciteturn29file0 fileciteturn28file1

Les documents historiques contiennent cependant des rôles et
responsabilités qui ne correspondent plus entièrement au modèle COSITI
V1 actuellement retenu. La présente version applique donc la gouvernance
la plus récente :

-   Agent terrain : collecte et opérations autorisées ;
-   Gestionnaire : création et activation ;
-   DGA : contrôle documentaire ;
-   DAF : contrôle/validation financière selon sa matrice ;
-   PCA, DG et Super Administrateur : responsabilités définies par la
    matrice globale existante.

Les règles non validées doivent rester **À VALIDER** et ne doivent pas
être inventées par le développeur. Cette prudence est déjà prévue dans
la documentation fonctionnelle V1. fileciteturn29file2

------------------------------------------------------------------------

## 3. Priorité des sources

En cas de contradiction :

1.  décision métier la plus récente et explicitement validée ;
2.  présent document ;
3.  cahier des charges V1 ;
4.  spécifications techniques ;
5.  ancienne application.

L'ancienne application est une source de compréhension, jamais
l'autorité fonctionnelle.

------------------------------------------------------------------------

# 4. Règles de création et d'activation

## R4.1 --- Création

Seul le **Gestionnaire des comptes** crée officiellement l'adhérent dans
le référentiel selon la règle actuelle.

L'Agent terrain collecte les informations et les pièces, mais ne réalise
pas l'activation définitive.

## R4.2 --- Activation

Le Gestionnaire active l'adhérent lorsque les préconditions métier sont
satisfaites.

Après activation :

``` text
Compte = ACTIF
Contrôle documentaire = EN_ATTENTE_DGA
```

L'activation et la validation documentaire sont donc deux états
différents.

## R4.3 --- Soumission DGA

Après activation, le dossier est transmis à la file de contrôle DGA.

La soumission doit être auditée.

------------------------------------------------------------------------

# 5. Règles des statuts

## Statut du compte

``` text
BROUILLON
ACTIF
INACTIF
DESACTIVE
```

## Statut documentaire

``` text
NON_SOUMIS
EN_ATTENTE_DGA
EN_VERIFICATION
CORRECTION_DEMANDEE
VALIDE
REJETE
```

Ne pas fusionner les deux axes.

------------------------------------------------------------------------

# 6. Règles de séparation des responsabilités

Le principe de séparation entre saisie/collecte et validation est
cohérent avec les documents V1. fileciteturn29file0

  Action                     Responsable principal
  -------------------------- -----------------------
  Collecte terrain           Agent terrain
  Collecte des pièces        Agent terrain
  Enregistrement officiel    Gestionnaire
  Activation                 Gestionnaire
  Contrôle documentaire      DGA
  Validation financière      DAF selon matrice
  Audit global               Profils habilités
  Administration technique   Super Administrateur

Une personne ne doit pas pouvoir s'auto-approuver lorsque la séparation
des tâches l'interdit.

------------------------------------------------------------------------

# 7. Règles du frais d'adhésion

Chaque nouvel adhérent enregistré est associé à un frais d'adhésion de :

``` text
1 000 FCFA
```

Le montant doit être une configuration Backend :

``` text
ADHESION_FEE_AMOUNT = 1000
ADHESION_FEE_CURRENCY = XAF
```

Il ne doit pas être codé en dur dans plusieurs composants Frontend.

### Méthode

``` text
getCurrentAdhesionFee()
```

### Endpoint cible

``` http
GET /api/v1/adhesion-fees/config
```

------------------------------------------------------------------------

# 8. Calcul des frais attendus

La règle demandée est :

``` text
Nombre d’adhérents distincts soumis à la DGA
×
1 000 FCFA
=
Montant théorique attendu
```

Exemple :

``` text
25 dossiers soumis
× 1 000
= 25 000 FCFA
```

Le montant attendu n'est pas automatiquement un montant encaissé.

Le système distingue :

``` text
montant attendu
montant enregistré
écart
```

------------------------------------------------------------------------

# 9. Règle anti-double comptage

Une resoumission ne crée pas un nouveau frais.

Exemple :

``` text
ADH-001
→ soumis
→ correction demandée
→ corrigé
→ resoumis
```

reste :

``` text
1 adhérent × 1 000 = 1 000 FCFA
```

Le calcul doit s'appuyer sur `adherent_id`, et non sur le nombre de
demandes de validation.

Une contrainte d'unicité doit empêcher un second frais d'adhésion pour
le même adhérent lorsque la règle métier est « un seul frais par
adhérent ».

------------------------------------------------------------------------

# 10. Règles de rapprochement

Le système doit calculer :

``` text
Écart =
Montant enregistré
-
Montant attendu
```

Exemple :

``` text
Attendu :      100 000 FCFA
Enregistré :    98 000 FCFA
Écart :         -2 000 FCFA
```

Un écart doit pouvoir être signalé comme anomalie.

Le système ne doit pas inventer une procédure de remboursement ou de
sanction : ces règles doivent être validées par le métier.

------------------------------------------------------------------------

# 11. Données du frais

Entité recommandée :

``` text
adherent_registration_fee
```

Champs :

``` text
id
adherent_id
agent_id
amount
currency
fee_type
status
reference
recorded_at
recorded_by
validated_at
validated_by
created_at
updated_at
version
```

Méthodes :

``` text
recordRegistrationFee()
getRegistrationFee()
calculateExpectedAdhesionFees()
calculateAgentExpectedFees()
calculatePeriodExpectedFees()
getFeeReconciliation()
flagFeeAnomaly()
```

Endpoints cibles :

``` http
POST /api/v1/adherents/{id}/registration-fee
GET  /api/v1/adhesion-fees
GET  /api/v1/adhesion-fees/summary
GET  /api/v1/adhesion-fees/agents/{agentId}/summary
GET  /api/v1/adhesion-fees/reconciliation
```

Ces routes sont à confronter au contrat `/api/v1/openapi`.

------------------------------------------------------------------------

# 12. Règle fondamentale sur les documents justificatifs

Lorsqu'une information du système est censée être justifiée par une
pièce, le système doit pouvoir représenter :

``` text
Information
↓
Document attendu
↓
Document fourni ?
↓
Document vérifié ?
↓
Correspondance ?
```

Une donnée saisie n'est pas automatiquement considérée comme vérifiée.

------------------------------------------------------------------------

# 13. Contrôle physique par la DGA

La DGA doit comparer :

``` text
Valeur numérique COSITI
↕
Valeur observée sur le document physique
```

Le système enregistre la décision humaine de la DGA.

Il ne faut pas présenter l'OCR ou une reconnaissance automatique comme
une validation humaine.

------------------------------------------------------------------------

# 14. Résultats possibles d'une vérification

Pour chaque information :

``` text
CORRESPOND
NON_CORRESPOND
NON_VERIFIABLE
DOCUMENT_MANQUANT
NON_LISIBLE
NON_APPLICABLE
```

Un commentaire est obligatoire pour :

``` text
NON_CORRESPOND
NON_VERIFIABLE
DOCUMENT_MANQUANT
NON_LISIBLE
```

------------------------------------------------------------------------

# 15. Règle de correction

Lorsqu'une anomalie est trouvée :

``` text
DGA
 ↓
Anomalie
 ↓
Motif
 ↓
Demande de correction
 ↓
Gestionnaire
 ↓
Correction
 ↓
Resoumission
 ↓
Nouvelle vérification
```

La DGA ne doit pas modifier silencieusement la valeur officielle.

------------------------------------------------------------------------

# 16. Règle de modification après validation

Une donnée déjà validée ne doit pas être modifiée directement.

Une modification doit conserver :

``` text
ancienne valeur
nouvelle valeur proposée
auteur
date
motif
document justificatif
décision
```

Si la nouvelle valeur est justifiée par une pièce, le champ repasse en
contrôle.

------------------------------------------------------------------------

# 17. Checklist générale des pièces à fournir

> **Statut : À VALIDER PAR COSITI.**\
> La liste ci-dessous définit la structure fonctionnelle de la
> checklist. Une pièce ne doit devenir bloquante que lorsque COSITI a
> officiellement confirmé qu'elle est obligatoire.

## A. Identité

-   [ ] Pièce d'identité officielle
-   [ ] Nom conforme
-   [ ] Prénom(s) conformes
-   [ ] Date de naissance conforme
-   [ ] Numéro de pièce conforme
-   [ ] Lieu de naissance si requis
-   [ ] Nationalité si requise
-   [ ] Photo si requise
-   [ ] Document lisible
-   [ ] Document valide lorsque la durée de validité s'applique
-   [ ] Document associé au bon adhérent

## B. Coordonnées / résidence

-   [ ] Téléphone principal
-   [ ] Téléphone secondaire si applicable
-   [ ] Adresse
-   [ ] Ville/localité
-   [ ] Quartier
-   [ ] Email si requis
-   [ ] Justificatif de résidence si requis

## C. Activité professionnelle

-   [ ] Activité déclarée
-   [ ] Catégorie d'activité
-   [ ] Localisation de l'activité
-   [ ] Adresse de l'activité
-   [ ] Preuve d'activité si requise
-   [ ] Autorisation/licence si l'activité l'exige
-   [ ] Document professionnel complémentaire si requis

## D. CNPS

-   [ ] Numéro CNPS si disponible
-   [ ] Document CNPS si disponible/requis
-   [ ] Pièces exigées par la procédure concernée
-   [ ] Informations nécessaires au dossier CNPS

La documentation existante confirme que les pièces CNPS doivent être
suivies, mais que les règles exactes d'intégration/procédure ne doivent
pas être inventées. fileciteturn29file9

## E. Adhésion COSITI

-   [ ] Formulaire/dossier d'adhésion
-   [ ] Agent terrain identifié
-   [ ] Date d'adhésion
-   [ ] Référence/matricule COSITI
-   [ ] Zone/périmètre
-   [ ] Pack lorsque applicable
-   [ ] Frais d'adhésion 1 000 FCFA enregistré
-   [ ] Référence du frais
-   [ ] Justificatif du frais si le processus l'exige

------------------------------------------------------------------------

# 18. Matrice documentaire obligatoire

Le système doit utiliser une matrice centralisée :

  ---------------------------------------------------------------------------
  Information     Document                   Obligatoire     Vérification DGA
  --------------- ----------------- -------------------- --------------------
  Nom             Pièce d'identité             À valider                  Oui

  Prénom          Pièce d'identité             À valider                  Oui

  Date naissance  Pièce d'identité             À valider                  Oui
                  / autre pièce                          
                  validée                                

  N° identité     Pièce d'identité             À valider                  Oui

  Adresse         Justificatif de              À valider            Si requis
                  résidence                              

  Activité        Pièce                        À valider           Si requise
                  professionnelle                        

  CNPS            Pièce CNPS                Conditionnel        Si applicable

  Adhésion        Formulaire                   À valider                  Oui

  Frais           Justificatif           Selon processus            Si requis
  ---------------------------------------------------------------------------

La règle doit être paramétrable et centralisée.

------------------------------------------------------------------------

# 19. Checklist dynamique

La checklist doit être calculée à partir de :

``` text
Profil adhérent
+
Type d’activité
+
Informations déclarées
+
Procédure concernée
+
Règles documentaires actives
=
Checklist requise
```

Une pièce peut être :

``` text
OBLIGATOIRE
CONDITIONNELLE
OPTIONNELLE
NON_APPLICABLE
```

Il ne faut pas imposer la même liste à tous les adhérents si les besoins
documentaires diffèrent.

------------------------------------------------------------------------

# 20. Statuts d'une pièce

``` text
REQUIS
NON_FOURNI
FOURNI
EN_VERIFICATION
VALIDE
NON_CONFORME
ILLISIBLE
EXPIRE
REMPLACE
NON_APPLICABLE
```

------------------------------------------------------------------------

# 21. Métadonnées d'un document

Le Backend doit conserver au minimum :

``` text
id
adherent_id
document_type
file_reference
file_name
mime_type
size
uploaded_by
uploaded_at
status
version
valid_from
valid_until
verified_by
verified_at
verification_comment
```

Les champs de validité sont conditionnels selon le type de document.

------------------------------------------------------------------------

# 22. Versionnement des documents

Un document remplacé ne doit pas écraser son historique.

``` text
CNI v1
 ↓
remplacement
 ↓
CNI v2
```

Conserver :

``` text
version
auteur
date
motif
statut
```

La version active doit être clairement identifiable.

------------------------------------------------------------------------

# 23. Lien document ↔ information

Un document doit pouvoir indiquer les informations qu'il justifie.

Exemple :

``` text
CNI
 ├── nom
 ├── prénom
 ├── date de naissance
 └── numéro de pièce
```

Une même information peut exceptionnellement avoir plusieurs
justificatifs, avec une source principale identifiée.

------------------------------------------------------------------------

# 24. Document présent ≠ donnée vérifiée

Un fichier peut être présent mais ne pas justifier la donnée.

Exemple :

``` text
Document : fourni
Champ : date de naissance
Résultat : NON_VERIFIABLE
```

La présence du fichier ne suffit donc pas à rendre la donnée fiable.

------------------------------------------------------------------------

# 25. Checklist « dossier prêt à activer »

``` text
[ ] Identité complète
[ ] Doublon contrôlé
[ ] Coordonnées complètes
[ ] Informations professionnelles complètes
[ ] Pièces obligatoires présentes selon la checklist
[ ] Documents lisibles
[ ] Frais = 1 000 FCFA enregistré
[ ] Agent terrain identifié
[ ] Aucun blocage métier
```

Le Backend décide si l'activation est réellement autorisée.

------------------------------------------------------------------------

# 26. Checklist « dossier prêt pour DGA »

``` text
[ ] Compte activé
[ ] Checklist documentaire générée
[ ] Pièces requises présentes
[ ] Documents accessibles à la DGA
[ ] Frais enregistré
[ ] Référence adhérent générée
[ ] Soumission auditée
```

------------------------------------------------------------------------

# 27. Checklist « dossier validable par DGA »

``` text
[ ] Tous les documents requis vérifiés
[ ] Tous les champs justificatifs contrôlés
[ ] Aucune anomalie bloquante
[ ] Tous les résultats enregistrés
[ ] Commentaires présents pour les anomalies
[ ] DGA autorisée
[ ] Décision enregistrée
```

------------------------------------------------------------------------

# 28. Écran DGA --- checklist de contrôle

L'interface doit présenter une checklist structurée :

``` text
DOSSIER ADHÉRENT

☐ IDENTITÉ
   ├─ ☐ Pièce d’identité
   ├─ ☐ Nom
   ├─ ☐ Prénom
   ├─ ☐ Date de naissance
   └─ ☐ Numéro

☐ COORDONNÉES
   ├─ ☐ Adresse
   └─ ☐ Téléphone

☐ ACTIVITÉ
   ├─ ☐ Activité
   └─ ☐ Justificatif professionnel

☐ CNPS
   └─ ☐ Pièces applicables

☐ ADHÉSION
   ├─ ☐ Formulaire
   └─ ☐ Frais d’adhésion
```

Chaque élément doit afficher :

``` text
statut
document
valeur numérique
valeur physique
résultat
commentaire
```

------------------------------------------------------------------------

# 29. UI --- comparaison document / donnée

Exemple :

``` text
┌──────────────────────┬──────────────────────┐
│ DONNÉE COSITI        │ DOCUMENT PHYSIQUE    │
├──────────────────────┼──────────────────────┤
│ Nom : MBOG           │ MBOG                 │
│ Prénom : Paul        │ Paul                 │
│ Né le : 01/01/1990   │ 01/01/1990           │
│ N° : 123456          │ 123456               │
└──────────────────────┴──────────────────────┘

[Correspond]
[Ne correspond pas]
[Non vérifiable]
```

------------------------------------------------------------------------

# 30. UX --- anomalie

Si la valeur diffère :

``` text
ANOMALIE DOCUMENTAIRE

Champ :
Date de naissance

Valeur COSITI :
01/01/1990

Valeur document :
01/01/1989

Motif obligatoire :
[_____________________]

[Enregistrer l’anomalie]
```

------------------------------------------------------------------------

# 31. UX --- document manquant

``` text
DOCUMENT MANQUANT

Pièce :
Pièce d’identité

Information concernée :
Identité

Action :
Ajouter le document

[Ajouter la pièce]
```

------------------------------------------------------------------------

# 32. UX --- décision DGA

Avant validation :

``` text
CONTRÔLE DGA

Documents requis : 8
Documents fournis : 8
Documents vérifiés : 8
Anomalies : 0

[VALIDER]
[DEMANDER CORRECTION]
[REJETER]
```

Le bouton `VALIDER` doit être bloqué tant que les conditions métier ne
sont pas satisfaites.

------------------------------------------------------------------------

# 33. UX --- historique

Timeline :

``` text
10:42 Gestionnaire
Adhérent activé

11:03 Système
Dossier soumis DGA

11:20 DGA
Contrôle commencé

11:24 DGA
CNI conforme

11:28 DGA
Date de naissance non conforme

11:35 DGA
Correction demandée
```

------------------------------------------------------------------------

# 34. UI --- frais d'adhésion

Le dossier doit afficher :

``` text
FRAIS D’ADHÉSION

Montant : 1 000 FCFA
Collecté par : Agent X
Date : ...
Statut : ENREGISTRÉ
Référence : FAD-...
```

------------------------------------------------------------------------

# 35. UI --- calcul des frais

Pour un tableau de bord :

``` text
DOSSIERS SOUMIS : 125

FRAIS UNITAIRES : 1 000 FCFA

MONTANT ATTENDU :
125 000 FCFA

MONTANT ENREGISTRÉ :
123 000 FCFA

ÉCART :
-2 000 FCFA
```

Le Frontend affiche la réponse Backend ; il ne constitue pas la source
du calcul.

------------------------------------------------------------------------

# 36. Endpoints cibles

## Adhérents

``` http
POST /api/v1/adherents
GET  /api/v1/adherents/{id}
POST /api/v1/adherents/{id}/activate
POST /api/v1/adherents/{id}/submit-to-dga
GET  /api/v1/adherents/{id}/workflow-summary
```

## Frais

``` http
GET  /api/v1/adhesion-fees/config
POST /api/v1/adherents/{id}/registration-fee
GET  /api/v1/adhesion-fees
GET  /api/v1/adhesion-fees/summary
GET  /api/v1/adhesion-fees/agents/{agentId}/summary
GET  /api/v1/adhesion-fees/reconciliation
```

## Documents

``` http
GET  /api/v1/adherents/{id}/documents
POST /api/v1/adherents/{id}/documents
GET  /api/v1/documents/{id}
```

## DGA

``` http
GET  /api/v1/dga/document-verifications
GET  /api/v1/adherents/{id}/document-verification
POST /api/v1/adherents/{id}/document-verification/start
POST /api/v1/document-verifications/{id}/fields/{fieldId}/verify
POST /api/v1/document-verifications/{id}/request-correction
POST /api/v1/document-verifications/{id}/complete
```

Ces endpoints sont des **cibles fonctionnelles**. `/api/v1/openapi`
reste la source de vérité.

------------------------------------------------------------------------

# 37. Services Backend

``` text
AdherentService
AdherentActivationService
AdhesionFeeService
DocumentRequirementService
DocumentService
DocumentVerificationService
AdherentWorkflowService
AuditService
NotificationService
ReconciliationService
```

Méthodes importantes :

``` text
createAdherent()
checkDuplicate()
getDocumentChecklist()
recordRegistrationFee()
calculateExpectedAdhesionFees()
calculateAgentExpectedFees()
calculatePeriodExpectedFees()
activateAdherent()
submitToDga()
verifyDocumentField()
requestCorrection()
applyCorrection()
resubmitToDga()
completeVerification()
getWorkflowSummary()
calculateReconciliation()
flagAnomaly()
```

------------------------------------------------------------------------

# 38. Modèle `document_requirements`

Créer une règle centralisée de type :

``` text
id
document_type
information_field
required
condition
verification_required
effective_from
effective_until
active
```

Exemple :

``` text
document_type = CNI
information_field = nom
required = true
verification_required = true
```

Le Frontend récupère cette configuration au lieu de dupliquer les
règles.

------------------------------------------------------------------------

# 39. Tables Backend recommandées

``` text
adherents
adherent_documents
document_types
document_requirements
document_verifications
document_verification_items
adherent_registration_fees
validation_requests
validation_request_items
audit_events
notifications
outbox_events
```

------------------------------------------------------------------------

# 40. Sécurité des documents

Les documents privés ne doivent pas être exposés par une URL publique
permanente.

L'accès doit être authentifié et autorisé.

Le Backend contrôle :

``` text
utilisateur
+
rôle
+
périmètre
+
adhérent
+
type de document
```

Ne jamais mettre dans les logs :

-   document complet ;
-   CNI complète ;
-   mot de passe ;
-   token ;
-   secrets.

------------------------------------------------------------------------

# 41. Idempotence et concurrence

Les actions sensibles doivent être idempotentes :

``` text
activation
enregistrement frais
soumission
validation
finalisation
```

Une double action ne doit pas créer deux frais ou deux soumissions.

Les entités critiques doivent utiliser une version :

``` text
version
```

En cas de conflit :

``` text
409 CONFLICT
```

Le Frontend affiche :

``` text
Le dossier a été modifié par un autre utilisateur.

[Recharger]
```

------------------------------------------------------------------------

# 42. Audit

Tracer au minimum :

``` text
création
activation
enregistrement frais
soumission DGA
ouverture contrôle
vérification document
anomalie
correction
resoumission
validation
rejet
remplacement document
export
consultation sensible si requise
```

Chaque événement doit permettre de retrouver :

``` text
acteur
rôle
date/heure
dossier
opération
ancienne valeur
nouvelle valeur
motif
document concerné
résultat
correlation_id
```

L'audit est immuable.

------------------------------------------------------------------------

# 43. Notifications

Après activation :

``` text
Gestionnaire
→ notification DGA
```

Après correction demandée :

``` text
DGA
→ notification Gestionnaire
```

Après validation/rejet :

``` text
DGA
→ notification Gestionnaire
```

Les événements externes doivent être publiés après commit, idéalement
via Outbox.

------------------------------------------------------------------------

# 44. Checklist de recette Backend

-   [ ] montant unitaire 1 000 ;
-   [ ] configuration ;
-   [ ] un seul frais par adhérent ;
-   [ ] calcul par période ;
-   [ ] calcul par agent ;
-   [ ] calcul global ;
-   [ ] rapprochement ;
-   [ ] doublon ;
-   [ ] activation ;
-   [ ] soumission DGA ;
-   [ ] vérification champ ;
-   [ ] anomalie ;
-   [ ] correction ;
-   [ ] resoumission ;
-   [ ] validation ;
-   [ ] rejet ;
-   [ ] audit ;
-   [ ] permissions ;
-   [ ] idempotence ;
-   [ ] concurrence ;
-   [ ] accès document.

------------------------------------------------------------------------

# 45. Checklist de recette Frontend

-   [ ] formulaire adhérent ;
-   [ ] checklist dynamique ;
-   [ ] pièces manquantes ;
-   [ ] statut des pièces ;
-   [ ] frais 1 000 FCFA ;
-   [ ] activation ;
-   [ ] confirmation ;
-   [ ] file DGA ;
-   [ ] comparaison ;
-   [ ] anomalie ;
-   [ ] correction ;
-   [ ] décision ;
-   [ ] historique ;
-   [ ] notifications ;
-   [ ] loading ;
-   [ ] empty ;
-   [ ] error ;
-   [ ] forbidden ;
-   [ ] conflict ;
-   [ ] double clic bloqué.

------------------------------------------------------------------------

# 46. Fonctionnalités transversales

## Authentification

-   connexion ;
-   refresh sécurisé ;
-   déconnexion.

## Autorisation

-   RBAC ;
-   data scope ;
-   permissions Backend.

## Documents

-   dépôt ;
-   consultation ;
-   versionnement ;
-   vérification ;
-   contrôle d'accès.

## Audit

-   événements immuables ;
-   historique ;
-   exports autorisés.

## Notifications

-   in-app ;
-   email selon configuration.

## Recherche

-   pagination ;
-   tri ;
-   filtres ;
-   recherche.

## Observabilité

-   correlation ID ;
-   logs structurés ;
-   métriques ;
-   erreurs.

------------------------------------------------------------------------

# 47. Règles UI/UX transversales

Chaque écran doit gérer :

``` text
Loading
Success
Empty
Error
Forbidden
Conflict
Pending
Correction requested
Approved
Rejected
Anomaly
```

Les statuts ne doivent pas être représentés uniquement par une couleur.

Utiliser également du texte :

``` text
✓ VALIDÉ
⏳ EN ATTENTE
! ANOMALIE
× REJETÉ
— NON APPLICABLE
```

Les actions destructives ou sensibles doivent avoir une confirmation.

Les boutons doivent être désactivés pendant l'appel pour éviter les
doubles soumissions.

------------------------------------------------------------------------

# 48. Règle de performance

Le Backend calcule les agrégats.

Incorrect :

``` text
GET tous les adhérents
→ Frontend compte
→ Frontend × 1 000
```

Correct :

``` text
GET /api/v1/adhesion-fees/summary
→ Backend
→ agrégation
→ Frontend
```

------------------------------------------------------------------------

# 49. Migrations

Les changements de schéma doivent passer par Flyway :

``` text
configuration frais
adherent_registration_fee
document_requirements
document_verifications
document_verification_items
audit extensions
outbox
index
constraints
```

Ne pas utiliser `ddl-auto=create` pour gérer le schéma de production.

------------------------------------------------------------------------

# 50. Points métier restant à valider

La structure est définie, mais ces points ne doivent pas être inventés :

1.  type exact de pièce d'identité accepté ;
2.  caractère obligatoire de l'acte de naissance ;
3.  caractère obligatoire du justificatif de domicile ;
4.  liste exacte des justificatifs professionnels ;
5.  liste réglementaire exacte des pièces CNPS ;
6.  durée de validité des documents ;
7.  procédure de remboursement des 1 000 FCFA en cas de rejet ;
8.  responsable de validation financière définitive du frais ;
9.  procédure physique de remise des 1 000 FCFA ;
10. nécessité d'un reçu physique ;
11. durée de conservation des documents ;
12. politique d'archivage/destruction ;
13. seuils exacts de blocage ;
14. pièces obligatoires par catégorie d'activité.

Ces éléments doivent rester **À VALIDER** tant qu'une décision métier
formelle n'a pas été prise.

------------------------------------------------------------------------

# 51. Règle finale de développement

Ne jamais déduire une règle métier simplement parce qu'elle semble
logique.

La chaîne obligatoire est :

``` text
Règle validée
      ↓
Documentation
      ↓
Backend
      ↓
OpenAPI
      ↓
Frontend
      ↓
Tests
```

Le Backend est l'autorité d'exécution.

Le Frontend présente et guide.

La base de données conserve l'état officiel.

Les documents constituent les justificatifs.

La DGA constitue l'autorité de contrôle documentaire selon cette mise à
jour.

L'audit constitue la preuve historique.

------------------------------------------------------------------------

# 52. Definition of Done globale

-   [ ] création par Gestionnaire ;
-   [ ] activation par Gestionnaire ;
-   [ ] frais de 1 000 FCFA ;
-   [ ] calcul des frais attendus ;
-   [ ] anti-double comptage ;
-   [ ] rapprochement ;
-   [ ] checklist documentaire ;
-   [ ] pièces obligatoires paramétrables ;
-   [ ] pièces conditionnelles paramétrables ;
-   [ ] liaison champ/document ;
-   [ ] contrôle DGA ;
-   [ ] comparaison physique/numérique ;
-   [ ] anomalies ;
-   [ ] correction ;
-   [ ] resoumission ;
-   [ ] validation ;
-   [ ] rejet ;
-   [ ] versionnement documents ;
-   [ ] audit ;
-   [ ] notifications ;
-   [ ] sécurité ;
-   [ ] idempotence ;
-   [ ] concurrence ;
-   [ ] tests Backend ;
-   [ ] tests Frontend ;
-   [ ] tests E2E ;
-   [ ] OpenAPI synchronisée.

------------------------------------------------------------------------

# 53. Chaîne finale de référence

``` text
AGENT TERRAIN
    │
    ├── informations
    ├── pièces
    └── 1 000 FCFA
          │
          ▼
GESTIONNAIRE
    │
    ├── contrôle doublon
    ├── création
    ├── checklist
    ├── frais
    └── activation
          │
          ▼
ADHÉRENT ACTIF
          │
          ▼
SOUMISSION DGA
          │
          ▼
CONTRÔLE DOCUMENTAIRE
          │
          ├── conforme ───────► VALIDÉ
          │
          ├── anomalie ───────► CORRECTION
          │                         │
          │                         ▼
          │                    RESOUMISSION
          │
          └── non conforme ───► REJET

EN PARALLÈLE

Nombre d’adhérents soumis
          ×
      1 000 FCFA
          =
Montant attendu
          │
          ▼
Montant enregistré
          │
          ▼
Rapprochement
          │
          ▼
Écart / anomalie
          │
          ▼
AUDIT
```

------------------------------------------------------------------------

## 54. Statut du présent document

Cette version remplace les règles précédentes **uniquement pour les
sujets couverts par cette mise à jour** :

-   création d'adhérent ;
-   activation ;
-   frais d'adhésion ;
-   contrôle documentaire DGA ;
-   checklist documentaire ;
-   pièces justificatives ;
-   correction documentaire ;
-   resoumission ;
-   calcul des frais liés aux dossiers soumis.

Les autres règles COSITI V1 restent applicables lorsqu'elles ne sont pas
contradictoires avec ce document.
