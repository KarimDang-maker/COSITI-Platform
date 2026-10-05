# Journal — Réduction des règles en attente de validation (frontend V21) et correction des alertes

| | |
|---|---|
| **Date** | 02/10/2026 |
| **Branche** | `feature_root` |
| **Sources analysées** | `COSITI_V1_SPECIFICATION_COMPLETE_FRAIS_ADHESION_ACTIVATION_CONTROLE_DGA.md` ; journal backend `2026-10-02_V21_reduction_regles_en_attente_backend.md` (§3 « Routes à intégrer », §4 « Frontend — à faire ») ; `Conception/REGLES_EN_ATTENTE_DE_VALIDATION.md` |
| **Contrat** | routes réelles du backend V21, relues dans les contrôleurs et DTO (`ControleurRegle`, `ControleurAdhesionAdherent`, `ControleurDocument`, `ControleurAssociation`, `ChecklistDocumentaireDto`, `ExigenceDocumentaireDto`, `ControleDgaDto`, `DocumentDto`, `AuditLigneDto`) |
| **Statut** | Livré. `tsc` vert, oxlint sans nouvel avertissement, build vert. Tests : voir §6. |

---

## 1. Objectif et principe

La demande comporte deux volets.

1. **Réduire au maximum les règles en attente de validation** en implémentant côté frontend (UI et UX) tout ce que le
   backend V21 rend possible.
2. **Corriger le système d'alerte des trois premiers modules** (adhérents, agents, cotisations) :
   - une personne notifiée voit la notification apparaître **immédiatement** ;
   - elle peut **répondre directement** en cliquant dessus ;
   - le clic l'amène **directement sur la page concernée**.

`AGENTS.md` interdit d'inventer une règle métier et de dupliquer une règle côté client. Le frontend ne réduit donc pas
les règles en attente en les tranchant à la place de la COSITI. Il agit de trois façons :

- il **rend chaque règle décidable depuis l'application**, grâce à l'écran « Règles à valider » du PCA. Confirmer une
  règle n'exige plus de migration Flyway ;
- il **branche ce que V21 tranche déjà**, en affichant ce que le serveur calcule :
  - la matrice documentaire ;
  - la checklist de l'adhérent ;
  - le versionnement des pièces ;
  - le résultat `NON_APPLICABLE` ;
  - les champs `validable` / `blocages` ;
  - la répartition 700 FCFA / Épargne ;
  - les associations ;
- il **lève les `TODO [V]` d'interface** devenus sans objet. L'association n'est plus « à renseigner depuis la
  fiche ». La liste locale des pièces obligatoires est remplacée par la matrice.

---

## 2. Défauts constatés sur les alertes (avant correction)

| # | Défaut | Conséquence |
|---|---|---|
| A1 | `cheminNotification` ne connaissait que `compte_rendu`, `remise_caisse` et `paiement` | Les notifications du workflow (`demande_validation`), du contrôle DGA (`controle_dga`), des frais d'adhésion (`frais_adhesion`) et des bilans de caisse (`bilan_caisse`) ne menaient **nulle part** : on ne pouvait pas y répondre en un clic. |
| A2 | Aucune notification n'était poussée : la cloche se rechargeait toutes les 2 minutes, ou au passage d'un signal workflow / adhésion | La personne notifiée ne voyait rien apparaître ; elle devait ouvrir la cloche au bon moment. |
| A3 | Le Gestionnaire recevait **deux fois** la même notification de décision DGA : une fois nominativement (`destinataireId`), une fois par son rôle | Doublons dans la cloche. |
| A4 | `frais_adhesion` et `bilan_caisse` n'ont pas d'écran propre (un bilan s'ouvre par sa **date**, la notification ne porte que son **identifiant**) | Impossible d'y mener directement sans deviner une URL. |
| A5 | Un Gestionnaire qui ouvrait un contrôle en « correction demandée » ne voyait aucune action | Il ne pouvait pas répondre depuis l'écran ouvert. |

---

## 3. Ce qui a été fait

### 3.1 Alertes et notifications (volet 2)

#### Backend (complément minimal, nécessaire à l'apparition immédiate)

- **`NotificationCreeeEvent`** :
  - `ServiceNotificationImpl.deposer` publie l'évènement à chaque notification enregistrée ;
  - `EcouteurTempsReel.surNotification` l'envoie **après commit** (`fallbackExecution = true`), en message SSE
    `notification`, **au seul destinataire** (`ServiceDiffusionTempsReel.envoyerA`) ;
  - le contenu est envoyé, puisqu'il appartient à la personne qui le reçoit ;
  - une notification annulée par un rollback n'apparaît jamais.
- **`notifierRolesSauf`** : le destinataire nominatif n'est plus re-notifié par son rôle. Corrige A3, dans
  `EcouteurEvenementsAdhesion`.

#### Frontend

- **`api/notifications.ts`** :
  - `cheminNotification` couvre désormais tous les objets émis par le backend : `demande_validation`,
    `controle_dga`, `frais_adhesion`, `paiement`, `bilan_caisse`, `remise_caisse`, `compte_rendu`, `rapport_daf`
    (plus `adherent` et `agent`) ;
  - `libelleActionNotification` donne pour chaque type le verbe de l'action attendue : « Traiter la demande »,
    « Contrôler le dossier », « Corriger le dossier », « Traiter le frais », « Examiner le bilan », « Recompter la
    caisse »… Corrige A1.
- **Flux temps réel** :
  - `api/tempsReel.ts` et `hooks/useTempsReel.ts` lisent les messages `notification` ;
  - à leur arrivée, ils invalident la cloche puis émettent `EVENEMENT_NOTIFICATION_RECUE`.
- **`ecrans/notifications/AlertesNotifications.tsx`**, monté sous le routeur dans `App.tsx` :
  - une **alerte apparaît aussitôt**, visible 15 s ;
  - elle porte le titre, le texte et un **bouton d'action** qui marque la notification lue et **ouvre l'écran
    concerné** ;
  - elle est annoncée aux lecteurs d'écran. Corrige A2.
- **Routes d'ouverture** (`ecrans/notifications/OuverturesNotification.tsx`), qui résolvent l'objet puis redirigent :
  - `/frais-adhesion/:id` → onglet « Adhésion » de l'adhérent, où se trouvent les actions du DAF ;
  - `/bilans-caisse/ouvrir/:id` → `/bilans-caisse?date=…`, date relue dans la liste servie par l'API, jamais déduite
    du texte ;
  - si l'objet est inaccessible, un message est affiché avec un lien de repli. Corrige A4.
- **Cloche** : chaque notification affiche son action (« Traiter la demande → »). Le filet de rechargement passe à
  **30 s quand le flux est coupé** (120 s quand il est connecté).
- **Écran de contrôle DGA** : carte « Correction demandée par la DGA » pour le Gestionnaire (`ADHERENT:ACTIVER`).
  Elle affiche le motif de la DGA et un bouton **« Corriger le dossier et retransmettre »** vers l'onglet Adhésion.
  Corrige A5.

Parcours obtenus :

| Notification | Reçue par | Le clic ouvre | Réponse possible sur place |
|---|---|---|---|
| `DEMANDE_VALIDATION_A_TRAITER` | validateurs (Gestionnaire, DGA, DG, DAF selon le module) | `/validations/:id` | Approuver, rejeter, demander une correction |
| `DEMANDE_VALIDATION_CORRECTION`, `…_REJETEE`, `…_APPROUVEE` | demandeur | `/validations/:id` | Resoumettre, annuler, consulter |
| `CONTROLE_DGA_A_TRAITER` | DGA | `/controles-dga/:id` | Démarrer, vérifier, décider |
| `CONTROLE_DGA_CORRECTION`, `…_REJETE`, `…_VALIDE` | Gestionnaire | `/controles-dga/:id` | « Corriger le dossier et retransmettre » |
| `FRAIS_ADHESION_ECART`, `FRAIS_ADHESION_ANOMALIE` | DAF, auteur | fiche adhérent, onglet Adhésion | Valider, signaler, résoudre |
| `BILAN_CAISSE_ECART`, `…_VALIDE`, `…_ANOMALIE` | DAF, Gestionnaire | `/bilans-caisse?date=` | Valider, signaler, ressaisir |
| `REMISE_CAISSE_ECART` | DAF | `/daf` | File DAF |

### 3.2 Matrice documentaire et checklist (§17 à §24, §38)

- `api/adhesion.ts` :
  - types `NiveauExigence`, `StatutPiece`, `ExigenceDocumentaire`, `ChecklistDocumentaire` ;
  - `obtenirChecklistDocumentaire`, `listerExigencesDocumentaires` ;
  - hooks `useChecklistDocumentaire`, `useExigencesDocumentaires`.
- **`ecrans/adhesion/ChecklistDocumentaire.tsx`** :
  - pour chaque pièce : niveau, statut calculé, « Bloque l'activation », version, validité, contrôle DGA,
    condition ;
  - pour chaque information : valeur COSITI et dernier résultat DGA ;
  - compteurs, `pretPourActivation`, avertissements ;
  - une pièce obligatoire **non confirmée** est signalée « Règle en attente de confirmation par la COSITI : signalée,
    elle ne bloque pas encore » (§17) ;
  - actions « Ajouter cette pièce » et « Remplacer ».
- Elle est intégrée à trois endroits :
  - **onglet Documents** : remplace la liste locale `documents-manquants` ;
  - **onglet Adhésion** : carte « Pièces justificatives », avec un lien « Gérer les pièces » ;
  - **dialogue d'activation** : « Pièces à traiter », en version repliable.
- Nouveaux domaines de statut : `statutPiece`, `niveauExigence`.

### 3.3 Documents : types, validité, remplacement versionné (§21, §22)

- `api/documents.ts` :
  - 4 nouveaux types : justificatif de résidence, pièce professionnelle, pièce CNPS, formulaire d'adhésion ;
  - statut `REMPLACE` ;
  - 9 champs `DocumentDto` (version, remplacement, validité, `expire`, vérification) ;
  - `televerserDocument(…, options)` avec `valideDu`, `valideJusquau`, `remplaceDocumentId`, `motifRemplacement`.
- **Dialogue de téléversement** :
  - types proposés **depuis la matrice en vigueur**, plus « Autre » ; la matrice n'est jamais dupliquée ;
  - rappel du caractère de la pièce choisie : obligatoire, bloquante, règle à confirmer ;
  - dates de validité ;
  - mode **remplacement**, avec motif obligatoire.
- **Tableau des documents** : colonnes « Version » (avec le motif) et « Validité » (badge « Expirée »), bouton
  « Remplacer ». Les versions remplacées restent visibles, grisées.

### 3.4 Contrôle DGA (§13, §14, §16, §23)

- Nouveau résultat **« Non applicable »**, sans motif exigé. Les autres résultats, hors « Correspond », gardent le
  commentaire obligatoire.
- « Valider le dossier » suit **`validable`**. Les **`blocages`** renvoyés par le serveur sont listés sur l'écran et
  dans le dialogue de décision. Le calcul local à partir des compteurs est supprimé.
- Libellés d'audit V21 : `CONTROLE_DGA_RECONTROLE`, `DOCUMENT_REMPLACEMENT`, `DOCUMENT_VERIFICATION_DGA`.

### 3.5 Écran « Règles à valider » (inventaire §6.4)

- `/regles` (`ecrans/regles/EcranRegles.tsx`) :
  - lecture : `ADMINISTRATION:LIRE` **ou** `REGLE:VALIDER` (nouvelle garde `unePermissionParmi`) ;
  - entrée de navigation « Règles à valider » ;
  - indicateurs : paramètres à valider, propositions techniques, exigences à confirmer.
- Onglet **« Règles provisoires »** : bouton « Confirmer » (PCA). Le motif est obligatoire : c'est la référence de la
  décision COSITI. La valeur ne change pas.
- Onglet **« Matrice documentaire »** :
  - colonnes : niveau, contrôle DGA, bloquante, période, statut ;
  - **« Modifier »** (`DialogueModifierExigence`) : niveau, condition, DGA, activation, période, motif, version ;
    un conflit est signalé (`EXIGENCE_VERSION_OBSOLETE`) ;
  - **« Confirmer »** : une pièce obligatoire confirmée devient bloquante, et l'écran le rappelle.
- `api/regles.ts`, `hooks/useRegles.ts`. Une confirmation recharge l'inventaire, la matrice, les checklists et
  l'administration.

### 3.6 Autres points levés

| Réf. | Action frontend |
|---|---|
| D-06 (associations) | `GET /associations` branché : liste déroulante dans « Informations professionnelles » (« Aucune association » possible) et dans « Compléter le dossier » (clé `ASSOCIATION`, qui n'est plus « à renseigner depuis la fiche »). Le nom de l'association est affiché. |
| D-10 (frais à la création) | Sans trancher la règle : après la création, la fiche s'ouvre **sur l'onglet Adhésion** et invite à enregistrer le frais collecté. |
| Répartition 700 / Épargne (R confirmée) | Carte « Répartition du versement » sur une cotisation validée : montants par composante et règle appliquée. Le backend expose désormais `composanteCode` et `composanteLibelle` sur `AffectationDto` (ajout sans rupture) : l'écran ne devine pas quelle ligne est la Sécurité sociale. |
| §42 / §46 corrélation | `correlationId` affiché dans le journal d'audit (colonne « Corrélation »). `X-Trace-Id`, déjà envoyé, est accepté par le backend comme identifiant de corrélation. `X-Correlation-Id` **n'est pas envoyé** : l'en-tête n'est pas dans la liste CORS du backend et casserait la requête préalable. |
| V19 → V20 | Rappel : la soumission générique d'un dossier adhérent reste remplacée par le parcours d'adhésion. |

---

## 4. Checklist de développement

### Alertes — réalisé

- [x] Routage de **toutes** les notifications émises par le backend vers l'écran où agir (A1).
- [x] Libellé d'action par type de notification.
- [x] Poussée nominative après commit (`NotificationCreeeEvent` → SSE `notification`) (A2, backend).
- [x] Alerte immédiate avec bouton d'action, qui marque lue puis navigue (`AlertesNotifications`) (A2).
- [x] Routes d'ouverture `/frais-adhesion/:id` et `/bilans-caisse/ouvrir/:id`, avec message si l'objet est
  inaccessible (A4).
- [x] Suppression du doublon nominatif + rôle (`notifierRolesSauf`) (A3, backend).
- [x] Carte « Corriger le dossier et retransmettre » sur le contrôle DGA (A5).
- [x] Cloche : libellé d'action ; filet de rechargement à 30 s quand le flux est coupé.

### Intégration V21 — réalisé (liste « Frontend — à faire » du journal backend)

- [x] `EN_COURS` → `EN_VERIFICATION` pour `StatutControleDga` (fait par la session backend, vérifié).
- [x] Checklist documentaire dans la fiche (Documents, Adhésion) et dans l'activation.
- [x] Téléversement :
  - [x] types issus de `/exigences-documentaires` ;
  - [x] validité ;
  - [x] remplacement motivé ;
  - [x] version affichée.
- [x] Écran DGA :
  - [x] `NON_APPLICABLE` ;
  - [x] `validable` / `blocages` à la place du calcul local.
- [ ] Écran DGA : afficher l'exigence liée à chaque information. **Non faisable :** `ControleDgaDto.Champ` n'expose
  pas `exigenceId`, alors que le journal backend indique qu'il est conservé en base. À ajouter au DTO.
- [x] Écran « Règles à valider » :
  - [x] liste ;
  - [x] confirmation motivée ;
  - [x] modification d'une exigence.
- [x] Liste déroulante des associations (fiche et complétion).
- [x] Détail paiement : les deux lignes Sécurité sociale / Épargne.
- [x] `correlationId` dans le journal d'audit.
- [x] Envoi `X-Correlation-Id` : non nécessaire, `X-Trace-Id` est accepté (voir §3.6).
- [x] Nouveaux types et statuts de document, libellés d'audit V21.
- [x] Commentaire obsolète `DOCUMENTS_ADHERENT_OBLIGATOIRES` : la liste vient de la matrice ; l'onglet Documents
  n'appelle plus `documents-manquants`.

### Tests — réalisé

- [x] `src/ecrans/regles/ReglesV21.test.tsx` (8 tests) :
  - confirmation d'un paramètre et d'une exigence ;
  - consultation sans droit ;
  - checklist (obligatoire non confirmée signalée) ;
  - remplacement motivé ;
  - association ;
  - DGA `validable` / `blocages` / `NON_APPLICABLE` ;
  - carte de correction du Gestionnaire.
- [x] `src/ecrans/notifications/Notifications.test.tsx` (6 tests) :
  - routage des 8 objets ;
  - libellés d'action ;
  - alerte immédiate → navigation et marquage lu ;
  - ouverture d'un frais et d'un bilan ;
  - objet inaccessible.
- [x] `src/hooks/useTempsReel.test.tsx` (+1) : une notification poussée recharge la cloche et émet l'alerte.
- [x] Tests existants adaptés au nouveau comportement :
  - checklist à la place de la liste de pièces manquantes ;
  - association saisissable ;
  - « Valider » désactivé par les blocages.
- [x] Simulacres MSW :
  - nouveau `handlers.v21.ts` : matrice, checklist, règles, associations, affectations ;
  - `GET /frais-adhesion/:id` ;
  - remplacement motivé dans `POST /documents` ;
  - `validable` / `blocages` et `NON_APPLICABLE` dans le contrôle DGA ;
  - `REGLE:VALIDER` accordée au PCA de test.
- [ ] Tests d'intégration backend (Testcontainers) : non exécutés, **Docker absent**.

---

## 5. Ce qui reste en attente de validation COSITI (non inventé)

Le frontend rend désormais ces points **décidables depuis l'écran « Règles à valider »** ; leur valeur n'a pas été
choisie à la place de la COSITI.

| Point | Où le décider |
|---|---|
| Les 14 exigences documentaires (niveau, condition, contrôle DGA) | `/regles?onglet=matrice` : « Modifier », puis « Confirmer » |
| `DROITS_COMPOSANTES_IMPUTABLES`, `ORGANISATION_PERIMETRE_AGENTS` et les autres paramètres `[V]` | `/regles` : « Confirmer » (la valeur se change dans l'administration) |
| Durée de validité des pièces (§50.6) | Saisie pièce par pièce (« Valable jusqu'au ») en attendant une règle par type |
| D-10 : frais saisi dans le formulaire de création | Ouverture directe de l'onglet Adhésion après création, en attendant la décision |
| D-06 : qui tient le référentiel des associations | Lecture seule : aucune route d'écriture, aucun écran de saisie |
| Remboursement, remise physique, conservation, consentement (§50.7 à §50.12, D-07) | Non modélisés côté backend : rien à afficher |

---

## 6. Vérifications

- `npx tsc -b` : vert.
- `npx oxlint src` : aucun nouvel avertissement (les 9 avertissements restants sont antérieurs).
- `npm run build` : vert.
- Vitest : **199/199 tests verts** (28 fichiers), suite complète.
- Backend : **247 tests unitaires verts** après les compléments (notifications, affectations) ; tests d'intégration
  non exécutés (Docker absent).

---

## 7. Fichiers touchés

**Frontend — nouveaux fichiers :**

- `src/api/regles.ts`, `src/hooks/useRegles.ts`
- `src/ecrans/regles/{EcranRegles, DialogueModifierExigence, ReglesV21.test}.tsx`
- `src/ecrans/adhesion/ChecklistDocumentaire.tsx`
- `src/ecrans/notifications/{AlertesNotifications, OuverturesNotification, Notifications.test}.tsx`
- `src/test/msw/handlers.v21.ts`

**Frontend — fichiers modifiés :**

- API : `api/{adhesion, adherents, documents, notifications, tempsReel, paiements, audit, workflow}.ts`
- Hooks : `hooks/{useAdhesion, useAdherents, useDocuments, useNotifications, usePaiements, useTempsReel}.ts`
- Statuts : `lib/statuts.ts`
- Application : `app/{App, GardeRoute, routes}.tsx`
- Composants : `components/cositi/{dialogue-televerser-document, cloche-notifications, navigation-laterale}.tsx`
- Écrans :
  - `ecrans/adherents/{FicheAdherent, NouvelAdherent, schemas}` ;
  - `ecrans/adherents/fiche/{OngletDocuments, CarteProfessionnel, DialogueCompleterDossier}` ;
  - `ecrans/adhesion/{OngletAdhesion, DialogueActivation, DialoguesControle, EcranControleDga}` ;
  - `ecrans/cotisations/DetailPaiement`, `ecrans/audit/EcranAudit`
- Tests et simulacres :
  - `FicheAdherent.test`, `Adhesion.test`, `useTempsReel.test` ;
  - `test/msw/{serveur, donnees, handlers.adhesion, handlers.cnps}.ts`

**Backend — compléments nécessaires :**

- `notification/{NotificationCreeeEvent (nouveau), ServiceNotification, ServiceNotificationImpl}.java`
- `tempsreel/{ServiceDiffusionTempsReel, EcouteurTempsReel}.java`
- `adhesion/service/EcouteurEvenementsAdhesion.java`
- `cotisation/dto/AffectationDto.java`, `cotisation/service/ServiceAffectationPaiementImpl.java`
