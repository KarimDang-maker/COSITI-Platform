# Journal — Réduction des règles en attente de validation (backend V21)

| | |
|---|---|
| **Date** | 02/10/2026 |
| **Branche** | `feature_root` |
| **Source analysée** | `COSITI_Backend/docs/COSITI_V1_DOCUMENT_DES_REGLES_MISE_A_JOUR_ADHESION_DOCUMENTS_DGA.md` (v2.0) |
| **Inventaire de départ** | `Conception/REGLES_EN_ATTENTE_DE_VALIDATION.md` |
| **Migration** | `V21__regles_documentaires_reduction_regles_en_attente.sql` |
| **Statut** | Code compilé, **247 tests unitaires verts**. V21 testée sur la base de développement dans une transaction annulée. **Pas encore appliquée** (voir §6). |

---

## 1. Objectif et principe

La demande : implémenter côté backend tout ce qui permet de **réduire les règles en attente de validation**.

AGENTS.md interdit d'inventer une règle métier. Le travail a donc suivi trois voies, sans décider à la place de la COSITI :

1. **Appliquer ce qui est déjà confirmé** (statut `C`) mais n'était pas codé. C'était le cas de la répartition 700 FCFA Sécurité sociale / Épargne.
2. **Appliquer ce que le document v2.0 tranche explicitement** :
   - frais d'adhésion obligatoire (§7, §25) ;
   - statuts de pièces (§20) ;
   - versionnement (§22) ;
   - lien document ↔ information (§23) ;
   - recontrôle après modification (§16) ;
   - identifiant de corrélation (§42, §46) ;
   - « seule une pièce obligatoire confirmée bloque » (§17).
3. **Rendre les règles restantes décidables sans développement** :
   - une route de validation tracée (`V`/`A` → `C`) ;
   - une matrice documentaire paramétrable (§38) ;
   - des paramètres `[V]` pour les points encore ouverts, dont la valeur par défaut reproduit le comportement actuel.

Les 14 points du §50 « Points métier restant à valider » **restent `V`** : la structure les accueille, mais leur valeur n'a pas été inventée.

---

## 2. Ce qui a été fait

### 2.1 Répartition des versements — règle confirmée enfin appliquée (inventaire §6.1, critique)

- **Avant :**
  - `ServiceAffectationPaiementImpl.affecter` affectait **100 % à « Coopérative »**, avec un avertissement « règle non validée ».
  - Or `REPARTITION_VERSEMENT` est `C` depuis V14.
- **Maintenant**, l'ordre de priorité est le suivant :
  1. la recommandation de paiement (`recommandation_allocation_paiement`, montant > 1 000 FCFA) ;
  2. sinon la préférence de l'adhérent (`preference_allocation_adherent`, sur le même montant) ;
  3. sinon la règle par défaut : `MONTANT_MINIMUM_SECURITE_SOCIALE` (700) vers `CNPS` et le reste vers `EPARGNE`.
- **Garde-fous :**
  - une recommandation ou une préférence est appliquée seulement si Sécurité sociale ≥ 700 et Sécurité sociale + Épargne = montant ;
  - un paiement < 700 FCFA donne **409** `PAIEMENT_MONTANT_INFERIEUR_MINIMUM_SECURITE_SOCIALE` ;
  - l'affectation manuelle n'accepte que `CNPS` / `EPARGNE` et refuse une Sécurité sociale < 700 :
    - `AFFECTATION_COMPOSANTE_NON_AUTORISEE` ;
    - `AFFECTATION_SECURITE_SOCIALE_INSUFFISANTE`.
- **Droits :** la répartition en deux lignes ne doit pas réduire les droits. `ServiceCalculDroits.imputerPaiement(paiementId)` impute la **somme** des composantes listées dans le nouveau paramètre `[V]` `DROITS_COMPOSANTES_IMPUTABLES`.
  - Sa valeur par défaut, `CNPS,EPARGNE,COOPERATIVE`, conserve l'imputation du montant entier.
  - `ServicePaiementImpl.valider` appelle `affecter` puis `imputerPaiement`.

### 2.2 Matrice documentaire centralisée (§17 à §24, §38)

- **Nouvelle table `exigence_documentaire`.** Pour chaque pièce ou information justifiée, elle donne :
  - la rubrique ;
  - le niveau `OBLIGATOIRE` / `CONDITIONNELLE` / `OPTIONNELLE` / `NON_APPLICABLE` ;
  - la condition ;
  - si la DGA la contrôle ;
  - le statut de validation `C` / `A` / `V` ;
  - la période d'effet.
- **14 lignes initiales**, toutes au statut **`V`**. Elles reprennent la checklist §17 :
  - CNI et 4 informations (nom, prénoms, date de naissance, n° CNI) ;
  - acte de naissance ;
  - justificatif de résidence ;
  - pièce professionnelle ;
  - pièce et numéro CNPS ;
  - formulaire d'adhésion ;
  - justificatif du frais.
- **Remplace 3 paramètres `[V]`**, supprimés par V21 :
  - `DOCUMENTS_ADHERENT_OBLIGATOIRES` (R-10) ;
  - `CONTROLE_DGA_CHAMPS_PAR_DOCUMENT` (R-08) ;
  - `ACTIVATION_EXIGE_DOCUMENTS` (R-02).
- **Règle §17 appliquée :** une pièce **bloque l'activation seulement si elle est `OBLIGATOIRE` et confirmée `C`**. Une pièce obligatoire non confirmée est **signalée**, sans bloquer.
  - Les 14 lignes étant `V`, **les pièces ne bloquent plus l'activation** tant que la COSITI n'en a pas confirmé.
- **Nouveaux types de document :**
  - `JUSTIFICATIF_RESIDENCE` ;
  - `PIECE_PROFESSIONNELLE` ;
  - `PIECE_CNPS` ;
  - `FORMULAIRE_ADHESION`.
- **Checklist dynamique** `GET /adherents/{id}/checklist-documentaire` :
  - statut de chaque pièce selon §20 :
    - `REQUIS`, `NON_FOURNI`, `FOURNI`, `EN_VERIFICATION`, `VALIDE`, `NON_CONFORME`, `ILLISIBLE`, `EXPIRE`, `REMPLACE`, `NON_APPLICABLE` ;
  - dernier résultat DGA pour chaque information ;
  - compteurs, `pretPourActivation` et avertissements.

### 2.3 Documents : versionnement, validité, vérification (§21, §22)

- **Nouvelles colonnes `document` :**
  - `version_document`, `remplace_document_id`, `motif_remplacement` ;
  - `valide_du`, `valide_jusquau` ;
  - `verifie_par`, `verifie_le`, `commentaire_verification`.
- **Contraintes :** période cohérente ; remplacement toujours motivé.
- **Remplacement d'une pièce :**
  - via `POST /documents` avec `remplaceDocumentId` et `motifRemplacement` ;
  - l'ancienne version doit être la version active, de même type et de même rattachement ;
  - elle passe au statut **`REMPLACE`**, est conservée (jamais supprimée) et tracée `DOCUMENT_REMPLACEMENT`.
- **Expiration :** `valideJusquau` dépassée → pièce `EXPIRE` dans la checklist.
- **Validation DGA :** le dossier validé marque ses pièces vérifiées (`verifie_par` / `verifie_le`), avec l'audit `DOCUMENT_VERIFICATION_DGA`.

### 2.4 Contrôle documentaire DGA (§13, §14, §16, §23)

- Le contrôle s'ouvre **depuis la matrice** :
  - pièces contrôlées par la DGA : les obligatoires toujours, les autres si elles sont fournies ;
  - pour chaque pièce, les informations qu'elle justifie (`exigence_id` conservé sur chaque ligne).
- **Nouveau résultat `NON_APPLICABLE`** : ni anomalie, ni motif exigé. Tous les autres résultats sauf `CORRESPOND` exigent un commentaire (contrainte SQL `chk_controle_champ_anomalie_motivee`).
- **Statut adhérent `EN_COURS` renommé `EN_VERIFICATION`** (vocabulaire §5). Les lignes existantes sont migrées.
- `ControleDgaDto` expose `validable` et `blocages`. Le frontend n'a plus à recalculer si la décision VALIDER est possible.
- **Recontrôle (§16) :** quand une modification approuvée d'un dossier **déjà validé** touche une information justifiée par une pièce (nom, date de naissance, n° CNI…) :
  - le dossier repasse en contrôle DGA (nouveau tour) ;
  - l'opération est tracée `CONTROLE_DGA_RECONTROLE` ;
  - la DGA est notifiée.

### 2.5 Validation des règles depuis l'application (inventaire §6.4)

- **Avant :** passer une règle de `V` à `C` exigeait une migration Flyway.
- **Maintenant :** une route dédiée, avec la permission **`REGLE:VALIDER`**, accordée au **PCA** (`[A]`, modifiable dans `role_permission`).
  - Le motif est obligatoire : c'est la référence de la décision COSITI.
  - La valeur ne change pas.
  - La décision est tracée `REGLE_VALIDATION`.
  - La route est idempotente.
- Les exigences documentaires se modifient (niveau, condition, contrôle DGA, période, verrou optimiste) et se confirment de la même façon, avec l'audit `EXIGENCE_DOCUMENTAIRE_MODIFICATION`.

### 2.6 Autres points levés

| Réf. inventaire | Action |
|---|---|
| R-01 `ACTIVATION_EXIGE_FRAIS_ADHESION` | Passé à **`C`** : le document v2.0 (§7, §25) l'exige pour tout nouvel adhérent. |
| D-04 (saisie par l'Agent) | **Confirmé par le document §R4.1** : seul le Gestionnaire crée l'adhérent, l'Agent collecte. Aucun changement de code. |
| D-06 (référentiel des associations) | Lecture exposée : `GET /api/v1/associations`. Qui tient le référentiel reste à décider, donc **aucune route d'écriture**. |
| D-14 (visibilité des agents) | Nouveau paramètre `[V]` `ORGANISATION_PERIMETRE_AGENTS` :<br>• `TOUS` (défaut = comportement actuel) ;<br>• `SOI_ET_SUPERVISES` : l'Agent ne voit que lui-même, le Chef lui-même et les agents qu'il supervise (« le Chef supervise les agents de son périmètre », *Rôles des acteurs*) ;<br>• directions et Gestionnaire voient toujours tout.<br>Hors périmètre → 403 `AGENT_HORS_PERIMETRE`. |
| §42 / §46 Corrélation | `FiltreCorrelation` : reprend `X-Correlation-Id` (ou `X-Trace-Id`, déjà envoyé par `src/api/client.ts`), en génère un sinon, le renvoie dans les deux en-têtes. Il est placé dans les logs (MDC), dans `journal_audit.correlation_id` (et `AuditLigneDto.correlationId`) et dans le `traceId` des erreurs. |

---

## 3. Routes à intégrer dans le frontend

| Méthode | Route | Permission | Usage frontend |
|---|---|---|---|
| GET | `/api/v1/adherents/{id}/checklist-documentaire` | `ADHERENT:LIRE` + périmètre | Onglet documents / adhésion : statut par pièce, information et compteurs. Remplace le calcul local des pièces manquantes. |
| GET | `/api/v1/exigences-documentaires?enVigueur=true` | authentifié | Formulaire de téléversement (types proposés, caractère obligatoire, bloquant) — **ne pas dupliquer la matrice côté front**. |
| POST | `/api/v1/documents` (+ `valideDu`, `valideJusquau`, `remplaceDocumentId`, `motifRemplacement`) | `DOCUMENT:TELEVERSER` | Bouton « Remplacer cette pièce » (motif obligatoire) ; saisie de la validité. |
| GET | `/api/v1/regles/en-attente` | `ADMINISTRATION:LIRE` ou `REGLE:VALIDER` | Écran « Règles à valider » : paramètres `V`/`A` et exigences non confirmées. |
| POST | `/api/v1/regles/parametres/{cle}/valider` `{motif}` | `REGLE:VALIDER` (PCA) | Confirmer un paramètre. |
| PUT | `/api/v1/regles/exigences/{id}` | `REGLE:VALIDER` | Modifier une exigence (niveau, condition, DGA, période, `version`). |
| POST | `/api/v1/regles/exigences/{id}/valider` `{motif}` | `REGLE:VALIDER` | Confirmer une exigence (une pièce obligatoire confirmée devient bloquante). |
| GET | `/api/v1/associations` | `ADHERENT:LIRE` | Liste déroulante « Association » de la fiche adhérent. |

**Changements de contrat à répercuter :**

- `StatutControleDga` : `EN_COURS` → **`EN_VERIFICATION`**.
  - **Déjà fait** dans `src/api/adhesion.ts`, `src/lib/statuts.ts` et `src/test/msw/handlers.adhesion.ts`. `tsc` passe.
  - `StatutControle`, le statut d'un *tour* de contrôle, garde `EN_COURS`.
- `StatutCorrespondance` : nouvelle valeur `NON_APPLICABLE`, sans motif obligatoire.
- `StatutDocument` : nouvelle valeur `REMPLACE`.
- `TypeDocument` : 4 nouvelles valeurs (§2.2).
- `DocumentDto` gagne 9 champs :
  - `versionDocument`, `remplaceDocumentId`, `motifRemplacement` ;
  - `valideDu`, `valideJusquau`, `expire` ;
  - `verifiePar`, `verifieLe`, `commentaireVerification`.
- `ControleDgaDto` gagne `validable` et `blocages`.
- `AuditLigneDto` gagne `correlationId`.
- Les affectations d'un paiement validé ont désormais **2 lignes** (Sécurité sociale + Épargne), avec la règle `SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE`.
- Le commentaire `src/api/adherents.ts:301`, qui cite `DOCUMENTS_ADHERENT_OBLIGATOIRES`, est obsolète : la liste vient maintenant de la matrice.

---

## 4. Checklist de développement

### Backend — réalisé

- [x] Migration V21 : table `exigence_documentaire` (14 exigences `V`), colonnes `document`, contraintes DGA, `correlation_id`, paramètres, permission `REGLE:VALIDER`.
- [x] Suppression des paramètres remplacés par la matrice (R-02, R-08, R-10).
- [x] `ACTIVATION_EXIGE_FRAIS_ADHESION` → `C`.
- [x] Répartition 700 FCFA Sécurité sociale / reste Épargne (recommandation → préférence → défaut), refus < 700, affectation manuelle encadrée.
- [x] Imputation des droits par paiement (`imputerPaiement`) + paramètre `DROITS_COMPOSANTES_IMPUTABLES` `[V]`.
- [x] Entités et services : `ExigenceDocumentaire`, `NiveauExigence`, `StatutPiece`, `ServiceExigenceDocumentaire` (matrice, checklist, modification, confirmation).
- [x] Documents : 4 types, statut `REMPLACE`, versionnement motivé, validité / expiration, vérification DGA.
- [x] Contrôle DGA piloté par la matrice, `NON_APPLICABLE`, `EN_VERIFICATION`, `validable` / `blocages`, documents marqués vérifiés.
- [x] Activation : pièces bloquantes = obligatoires **et** confirmées ; les autres sont signalées.
- [x] Recontrôle DGA après modification d'une information justifiée (§16).
- [x] Service et contrôleur `regle` : inventaire, validation de paramètre, modification / confirmation d'exigence.
- [x] Route checklist documentaire.
- [x] Référentiel associations en lecture.
- [x] Périmètre de lecture des agents paramétrable (`ORGANISATION_PERIMETRE_AGENTS`).
- [x] Identifiant de corrélation de bout en bout (filtre, MDC, audit, erreurs, motif de log).
- [x] Nouveaux types d'audit :
  - `DOCUMENT_REMPLACEMENT` ;
  - `DOCUMENT_VERIFICATION_DGA` ;
  - `REGLE_VALIDATION` ;
  - `EXIGENCE_DOCUMENTAIRE_MODIFICATION` ;
  - `CONTROLE_DGA_RECONTROLE`.

### Tests — réalisé

- [x] Tests existants adaptés aux nouvelles signatures : affectation, adhérent, activation, contrôle DGA, agents.
- [x] Nouveaux tests :
  - répartition (défaut, minimum exact, < 700, préférence, recommandation, recommandation invalide) ;
  - affectation manuelle (composante interdite, Sécurité sociale insuffisante) ;
  - activation (pièce non confirmée signalée, pièce non conforme bloquante) ;
  - DGA (`NON_APPLICABLE` sans motif, `NON_LISIBLE` avec motif, ouverture depuis la matrice) ;
  - `FiltreCorrelationTest` (3) ;
  - `ServiceRegleImplTest` (4) ;
  - périmètre agents (4).
- [x] Suite unitaire complète : **247 tests, 0 échec**.
- [x] V21 exécutée sur la base de développement **dans une transaction annulée** :
  - 14 exigences créées ;
  - paramètres attendus présents ;
  - aucun conflit de contrainte avec les données existantes.
- [ ] Tests d'intégration (Testcontainers) : non exécutés, **Docker absent** du poste.
- [ ] Recette manuelle Swagger après application de V21 (voir §6).

### Frontend — réalisé le 02/10/2026 (voir `2026-10-02_V21_reduction_regles_en_attente_frontend.md`)

- [x] Renommer `EN_COURS` → `EN_VERIFICATION` pour `StatutControleDga` (fait, `tsc` OK).
- [x] Afficher la checklist documentaire (`/checklist-documentaire`) dans la fiche adhérent et l'écran d'activation.
- [x] Téléversement : types issus de `/exigences-documentaires`, validité, remplacement motivé, badge « version n ».
- [x] Écran DGA (sauf l'exigence liée : `exigenceId` absent de `ControleDgaDto.Champ`) :
  - résultat `NON_APPLICABLE` ;
  - utiliser `validable` / `blocages` au lieu d'un calcul local ;
  - afficher l'exigence liée.
- [x] Écran « Règles à valider » (PCA) : liste, confirmation avec motif, modification d'une exigence.
- [x] Liste déroulante des associations.
- [x] Détail paiement : afficher les deux lignes Sécurité sociale / Épargne.
- [x] Afficher `correlationId` dans le journal d'audit ; `X-Trace-Id` (déjà envoyé) suffit — `X-Correlation-Id` n'est pas dans la liste CORS.

---

## 5. Ce qui reste en attente de validation COSITI (non inventé)

| Point | Où il vit | Comment le valider |
|---|---|---|
| Les 14 exigences documentaires (§50 points 1 à 5, 14 : type de pièce d'identité, acte de naissance, domicile, pièces professionnelles, pièces CNPS, par catégorie d'activité) | `exigence_documentaire` (`V`) | `PUT` puis `POST /regles/exigences/{id}/valider` |
| Durée de validité des documents (§50.6) | `document.valide_du` / `valide_jusquau` (saisis par pièce) | Décision de durée par type, puis exigence ou paramètre |
| `DROITS_COMPOSANTES_IMPUTABLES` | `parametre` (`V`) | `POST /regles/parametres/DROITS_COMPOSANTES_IMPUTABLES/valider` |
| `ORGANISATION_PERIMETRE_AGENTS` (D-14) | `parametre` (`V`) | Valeur via l'administration, puis validation |
| Remboursement, remise physique, reçu, validateur financier du frais (§50.7 à §50.10) | Non modélisés | Décision métier préalable |
| Conservation, archivage / destruction (§50.11, §50.12) | Non modélisés | Avis juridique (S-07) |
| Seuils exacts de blocage (§50.13) | Matrice : niveau + statut `C` | Confirmer les exigences concernées |
| Autres paramètres `[V]` de l'inventaire : R-03 à R-07, R-09, R-11 à R-14 | `parametre` | Désormais validables par la route `/regles/parametres/{cle}/valider` |

---

## 6. Déploiement et points d'attention

1. **V21 n'est pas encore appliquée.** L'instance lancée depuis IntelliJ sur le port 8082 tourne avec l'ancien code. Je ne l'ai pas arrêtée, et je n'ai pas migré la base sous elle : l'ancien code lit des paramètres que V21 supprime et ne connaît pas le statut `EN_VERIFICATION`.
   - **Il faut redémarrer l'API depuis ce code** : Flyway appliquera V21 au démarrage.
2. **Changements de comportement visibles après V21 :**
   - les pièces **ne bloquent plus l'activation** tant qu'aucune exigence obligatoire n'est confirmée (§17) ; elles restent signalées ;
   - un paiement validé est réparti en **700 FCFA Sécurité sociale + reste Épargne** ;
   - un paiement < 700 FCFA ne peut plus être validé (409). La base en contient un seul : **REC-000164** (500 FCFA, ancienne affectation « Coopérative »).
3. **Affectations historiques :** les affectations « Coopérative » déjà créées ne sont pas recalculées automatiquement (opération financière : à décider). `reaffecterApresCorrection` les recalcule à la prochaine correction approuvée.
4. **Aucune nouvelle dépendance.** Aucun secret ajouté. Aucune suppression physique : un document remplacé reste en base avec le statut `REMPLACE`.

---

## 7. Fichiers touchés

**Backend — nouveaux fichiers :**

- `db/migration/V21__regles_documentaires_reduction_regles_en_attente.sql`
- `adhesion/entite/{ExigenceDocumentaire, NiveauExigence, StatutPiece}.java`
- `adhesion/repository/ExigenceDocumentaireRepository.java`
- `adhesion/dto/{ExigenceDocumentaireDto, ModificationExigenceDto, ChecklistDocumentaireDto}.java`
- `adhesion/service/ServiceExigenceDocumentaire(.java, Impl.java)`
- `regle/{controleur/ControleurRegle, service/ServiceRegle(Impl), dto/RegleEnAttenteDto, dto/SyntheseReglesDto, dto/ValidationRegleDto}.java`
- `adherent/{controleur/ControleurAssociation, dto/AssociationDto}.java`
- `document/dto/OptionsTeleversementDto.java`
- `commun/correlation/FiltreCorrelation.java`
- Tests : `FiltreCorrelationTest`, `ServiceRegleImplTest`

**Backend — fichiers modifiés :**

- Cotisation : `ServiceAffectationPaiementImpl`, `ServicePaiementImpl`
- Droits : `ServiceCalculDroits(Impl)`
- Documents :
  - `Document`, `DocumentDto`, `TypeDocument`, `StatutDocument` ;
  - `ServiceStockageDocument(Impl)`, `ControleurDocument`
- Adhésion :
  - `ServiceControleDgaImpl`, `ServiceActivationAdherentImpl` ;
  - `ControleDgaDocument`, `ControleDgaChamp`, `ControleDgaDto` ;
  - `StatutCorrespondance`, `ControleurAdhesionAdherent`
- Adhérent : `StatutControleDga`, `ServiceAdherentImpl`, `AdaptateurWorkflowAdherent`, `Association`
- Organisation et paramètres : `ServiceAgentImpl`, `Parametre`
- Audit : `TypeOperation`, `JournalAudit`, `AuditLigneDto`, `ContexteAudit`
- Commun et workflow : `GestionnaireExceptions`, `ServiceDemandeValidationImpl`
- `application.properties`
- Tests adaptés : affectation, adhérent, activation, contrôle DGA, agents

**Frontend — fichiers modifiés :**

- `src/api/adhesion.ts`
- `src/lib/statuts.ts`
- `src/test/msw/handlers.adhesion.ts`
