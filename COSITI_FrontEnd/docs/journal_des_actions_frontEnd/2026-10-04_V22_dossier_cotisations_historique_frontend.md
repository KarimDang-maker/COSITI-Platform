# Journal — Dossier adhérent, cotisations réparties, historiques et accès Gestionnaire (frontend V22)

| | |
|---|---|
| **Date** | 04/10/2026 |
| **Branche** | `feature_root` (non commité) |
| **Source** | `docs/Mise a jour FRONT/COSITI_V1_PROMPT_DEVELOPPEMENT_FRONTEND_NOUVELLES_SPECIFICITES.md` + `COSITI_V1_REGLES_MODULES_01_02_03.md` |
| **Intégration** | Contrat backend V22 : `COSITI_Backend/docs/journal_des_actions_backend/2026-10-04_V22_dossier_cotisations_historique_swagger_backend.md` (§5 endpoints, §8 « À répercuter côté frontend »), DTO relus dans le code Java |
| **Statut** | `tsc` vert, oxlint sans nouvel avertissement, build vert. Tests : voir §6. |

---

## 1. Audit avant codage (prompt §3) — matrice

| Écran / composant | Existait | À modifier | À créer | API utilisée | Risque |
|---|---|---|---|---|---|
| Fiche adhérent (`FicheAdherent`) | Oui (onglets) | Bouton « Historique », identité (CNI, CNPS), comptes | Carte « Comptes » | `/adherents/{id}`, `/synthese-cotisations` | Faible |
| Coordonnées (`CarteCoordonnees`) | Oui | WhatsApp, e-mail (lecture + édition) | — | `GET/PUT /coordonnees` | **Élevé** : voir défaut F1 |
| Modification d'identité (`PUT /adherents/{id}`) | Oui | Renvoyer WhatsApp / e-mail | — | `PUT /adherents/{id}` | **Élevé** : défaut F1 |
| Création (`NouvelAdherent`) | Oui, pack obligatoire | Retrait du pack ; WhatsApp, e-mail | — | `POST /adherents` | Moyen |
| Saisie de cotisation (`NouveauPaiement`) | Oui, liste déroulante des 200 premiers adhérents | Refonte | Recherche par matricule, répartition, pack, récapitulatif | `GET /paiements/contexte-adherent`, `POST /paiements` | **Élevé** (financier) |
| Détail / correction d'une cotisation | Oui | Répartition enregistrée, correction de la répartition | — | `PaiementDto`, `POST /corriger` | Moyen |
| Historique (`OngletHistorique`) | Journal brut non paginé, filtré dans le navigateur | Refonte | Général / financier, période, ordre, pagination | `/historique-general`, `/historique-financier` | Moyen |
| Navigation, routes | « DAF » et « Contrôle DGA » visibles au Gestionnaire | Filtrage par permissions | Garde `unePermissionParmi` déjà présente (V21) | — | Moyen |
| Centre de validation | « À traiter » pour tous | Visible seulement avec un droit de décision | — | `/demandes-validation/en-attente` | Faible |
| Workflow (champs de demande) | Oui | WhatsApp, e-mail ; répartition d'une correction | — | demandes de modification / correction | Faible |

---

## 2. Défauts frontend découverts et corrigés

| # | Défaut | Conséquence | Correction |
|---|---|---|---|
| **F1** | `PUT /adherents/{id}` et `PUT /adherents/{id}/coordonnees` **remplacent chaque champ** ; depuis V22 ils portent `whatsapp` et `email`, que le frontend n'envoyait pas | Modifier l'identité ou les coordonnées d'un adhérent **effaçait silencieusement son WhatsApp et son e-mail** | Types `CorpsModificationAdherent` / `CorpsModificationCoordonnees` rendus exhaustifs (le compilateur l'a signalé) ; `corpsModificationDepuisFiche` et le formulaire de coordonnées renvoient les deux champs ; test de non-régression |
| F2 | La saisie de cotisation proposait une liste des **200 premiers** adhérents | Un adhérent au-delà du 200ᵉ ne pouvait pas recevoir de cotisation depuis cet écran | Recherche par matricule côté serveur (`/paiements/contexte-adherent`) |
| F3 | Une clé `Idempotency-Key` unique par montage de l'écran | Une saisie corrigée après une erreur réseau, renvoyée avec la même clé, aurait reçu **409 `IDEMPOTENCY_KEY_CONFLIT`** (V22) | Une clé par saisie : conservée pour un nouvel essai identique, renouvelée si la saisie change |
| F4 | L'historique filtrait la réponse **dans le navigateur** et chargeait tout le journal | Contraire au prompt §21-22 ; lent sur un dossier ancien | Filtres et pagination serveur |
| F5 | Les entrées « DAF » (`PAIEMENT:LIRE`) et « Contrôle DGA » (`CONTROLE_DGA:LIRE`) s'affichaient au Gestionnaire, et les routes l'acceptaient | Accès à des écrans de contrôle qui ne lui appartiennent pas (prompt §24-25) | Voir §3.6 |
| F6 | Le fil d'Ariane du contrôle DGA ramenait le Gestionnaire vers la file DGA | Lien vers un écran refusé | Retour vers l'onglet Adhésion du dossier pour qui n'a pas accès à la file |

---

## 3. Ce qui a été implémenté

### 3.1 Dossier adhérent (prompt §4 à §10)

- **En-tête** : nom, matricule (copie), statut, et un bouton **« Historique »** qui ouvre l'onglet correspondant. Les
  actions restent celles autorisées par les permissions et l'état du dossier.
- **Identité** : ajout du numéro CNI et du numéro CNPS, lus dans la fiche.
- **Coordonnées** : WhatsApp et e-mail en lecture et en édition. Contrôle de forme de l'e-mail : le serveur reste
  l'autorité (`@Email`).
- **Informations professionnelles, état du dossier** : déjà présents (activité, association, pack, complétion,
  pièces) ; ils ne sont pas dupliqués.
- **Comptes Sécurité Sociale et Épargne** (`CarteComptes`, `GET /adherents/{id}/synthese-cotisations`,
  `PAIEMENT:LIRE`) :
  - deux blocs distincts : solde validé, part en attente de contrôle, nombre d'opérations, dernière opération ;
  - total validé, en attente, pack (ou « à choisir à la prochaine cotisation »), ancienne affectation
    « Coopérative » si elle existe ;
  - progression vers le seuil CNPS (taux et reste du serveur) ;
  - avertissements serveur ;
  - **aucun solde recalculé** à partir d'une liste de cotisations ;
  - actions « Détail des cotisations » et « Enregistrer une cotisation » (`PAIEMENT:CREER`, matricule pré-rempli) ;
  - états chargement / erreur (avec « Réessayer »).

### 3.2 Création sans pack (prompt §11)

- Sélecteur, schéma Zod, défaut et envoi du pack **supprimés**. La confirmation précise : « Le pack de cotisation
  sera choisi lors de la première cotisation de l'adhérent ».
- WhatsApp et e-mail ajoutés à l'étape « Identité et contact ».

### 3.3 Enregistrement d'une cotisation (prompt §12 à §16)

- **Étape 1, recherche par matricule** :
  - champ « Matricule COSITI » ;
  - états recherche / introuvable (404) / erreur ;
  - le matricule est normalisé et validé **par le serveur** ;
  - résumé de l'adhérent (nom, matricule, statuts, zone, pack) ;
  - blocages serveur (`cotisable = false`, `motifsBlocage`) affichés, sans saisie possible.
- **Étape 2, formulaire** :
  - date, montant total, **Sécurité Sociale**, **Épargne**, pack si `packRequis`, mode, référence, agent encaisseur ;
  - le schéma Zod est construit avec les **minimums renvoyés par le serveur** (700 / 300, `epargneFacultative`) :
    aucun seuil n'est codé dans l'écran.
- **Aide à la répartition** :
  - affichage en direct du total, de la somme répartie et du **reste à répartir** ;
  - messages explicites : « …Sécurité Sociale doit être au minimum de 700 FCFA », « …Épargne doit être au minimum de
    300 FCFA », « La répartition doit correspondre au montant total de la cotisation ».
- **Récapitulatif avant envoi** :
  - adhérent, matricule, total, Sécurité Sociale, Épargne, date, mode, pack ;
  - bouton désactivé pendant l'envoi ; un double clic n'envoie qu'une requête (testé).
- Contrôle de doublon serveur conservé, après le récapitulatif.
- **Statut** : le message de succès donne le **statut renvoyé par le serveur** (« À contrôler », « Brouillon »…),
  jamais « Validée » parce que la requête a abouti. La fiche de la cotisation s'ouvre ensuite.
- Erreurs serveur : placées sur le champ concerné (`montantSecuriteSociale`, `montantEpargne`, `packId`…), sinon dans
  un bandeau « Cotisation non enregistrée ».
- **Détail d'une cotisation** : répartition enregistrée (Sécurité Sociale, Épargne), aussi dans le rappel des
  confirmations. La carte « Répartition du versement » (affectations comptabilisées) reste réservée aux cotisations
  validées.
- **Correction** :
  - une cotisation répartie se corrige avec sa répartition ;
  - revue avant / après ;
  - la répartition accompagne toute correction du montant (`COTISATION_REPARTITION_REQUISE` évité) ;
  - les demandes de correction du workflow proposent aussi ces deux champs.

### 3.4 Historiques (prompt §17 à §23)

- **Deux onglets distincts** : « Historique général » (`/historique-general`) et « Historique financier »
  (`/historique-financier`, visible avec `PAIEMENT:LIRE` ou `FRAIS_ADHESION:LIRE`).
- **Filtres envoyés au serveur** :
  - période : toute la période / jour / semaine / mois / année, avec une date de référence ;
  - ordre : récentes ou anciennes d'abord ;
  - **pagination serveur** (20 par page, total affiché).
- Chaque ligne donne :
  - l'action (libellé métier du serveur), la date et l'heure ;
  - la référence métier (n° de reçu, FAD-…) ;
  - l'acteur et ses rôles ;
  - le résultat s'il n'est pas un succès, le motif ;
  - le contexte (montants mis en forme) et les modifications avant / après ;
  - les données sensibles **masquées par le serveur** affichées « modifié (donnée protégée) ».
- **États** :
  - chargement ;
  - vide : « Aucune action enregistrée pour cette journée / semaine / … » ;
  - erreur, avec « Réessayer » ;
  - **403** : « Historique non accessible », aucun contenu affiché ;
  - données partielles : « le système » si aucun acteur, et rien d'inventé.
- Les événements internes DGA / DAF / CNPS sont retirés **par le serveur** selon le rôle (journal backend §3.6).
  L'ancien `GET /historique` (obsolète) n'est plus appelé par la fiche.

### 3.5 Hooks, types, invalidation (prompt §27, §28, §31)

- `src/api/dossierAdherent.ts` : types stricts de `DossierCompletAdherentDto`, `SyntheseCotisationsAdherentDto`,
  `EvenementHistoriqueDto`, des filtres et des catégories ; fonctions `obtenirDossierComplet`,
  `obtenirSyntheseCotisations`, `listerHistorique`.
- `src/api/paiements.ts` : `ContexteCotisation`, `obtenirContexteCotisation`, champs de répartition et de pack (saisie,
  correction, `PaiementDto`), `OrigineRepartition`.
- `src/api/adherents.ts` : `whatsapp`, `email` sur la fiche, les coordonnées, la création, la modification et la
  complétion ; plus de `packId` à la création.
- Hooks :
  - `useDossierComplet`, `useSyntheseCotisationsAdherent`, `useHistoriqueDossier` (sous `["adherents", "detail", id]`) ;
  - `useContexteCotisation`.
- Après une écriture sur une cotisation : invalidation des paiements, bilans, **adhérents** (fiche, comptes,
  historiques), droits, organisation et, nouveau, **CNPS** (le cumul peut changer l'éligibilité). Le flux temps réel
  (`paiement` → `adherents`) couvre les autres utilisateurs.

### 3.6 Accès du Gestionnaire (prompt §24 à §26)

- **« DAF »** (navigation et route `/daf`) : réservé au DAF (`PAIEMENT:VALIDER`) et à la direction
  (`RAPPORT_DAF:LIRE`) ; le Gestionnaire, qui porte `PAIEMENT:LIRE` pour ses propres saisies, n'y a plus accès.
- **« Contrôle DGA »** (navigation et route `/controles-dga`) :
  - réservé à `CONTROLE_DGA:LIRE` **et** à `CONTROLE_DGA:EFFECTUER` (DGA) ou `RAPPORT_DAF:LIRE` (PCA, DG) ;
  - le Gestionnaire garde l'accès au contrôle de **ses** dossiers depuis l'onglet Adhésion et les notifications
    (`/controles-dga/:id`, autorisé par le serveur), pour répondre à une correction demandée.
- **« À traiter »** (centre de validation) : affiché seulement à qui détient un droit de décision (`ADHERENT:VALIDER`,
  `AGENT:VALIDER`, `PAIEMENT:VALIDER`) ; sinon l'écran s'ouvre sur « Mes demandes ».
  - Le Gestionnaire **garde** cet onglet : il décide encore des demandes de **modification** d'adhérent (V19,
    `ADHERENT:VALIDER` inchangé en V22).
  - Le workflow supprimé (validation générique du dossier adhérent) n'y produit plus de demande depuis V20.
- Recherché aussi : menus, fils d'Ariane, raccourcis, tableau de bord Gestionnaire (aucun lien DAF / DGA), liens
  directs. Le tableau de bord DAF garde ses liens vers `/daf`.

---

## 4. Endpoints consommés

| Méthode | Route | Usage |
|---|---|---|
| GET | `/api/v1/paiements/contexte-adherent?matricule=` | Recherche et contexte de saisie |
| POST | `/api/v1/paiements` (+ `montantSecuriteSociale`, `montantEpargne`, `packId`, `Idempotency-Key`) | Enregistrement d'une cotisation |
| POST | `/api/v1/paiements/{id}/corriger` (+ répartition) | Correction d'un brouillon |
| GET | `/api/v1/adherents/{id}/synthese-cotisations` | Comptes et cumuls |
| GET | `/api/v1/adherents/{id}/historique-general`, `/historique-financier` | Historiques |
| POST | `/api/v1/adherents` (sans `packId`, + `whatsapp`, `email`) | Création |
| PUT | `/api/v1/adherents/{id}`, `/{id}/coordonnees` (+ `whatsapp`, `email`) | Modification |
| GET | `/api/v1/adherents/{id}/dossier-complet` | Typé et disponible (`useDossierComplet`) ; la fiche garde ses lectures par section, déjà existantes et testées |

---

## 5. Checklist de développement

### Réalisé

- [x] Audit et matrice (§1).
- [x] Dossier :
  - [x] en-tête avec bouton « Historique » ;
  - [x] identité ;
  - [x] coordonnées avec WhatsApp et e-mail ;
  - [x] informations professionnelles ;
  - [x] état ;
  - [x] comptes Sécurité Sociale / Épargne lus du backend.
- [x] Création sans pack (sélecteur, Zod, défaut, payload, récapitulatif).
- [x] Cotisation :
  - [x] recherche par matricule ;
  - [x] résumé de l'adhérent ;
  - [x] répartition avec aide en direct ;
  - [x] minimums lus du serveur ;
  - [x] pack à la première cotisation ;
  - [x] récapitulatif ;
  - [x] protection contre le double clic ;
  - [x] statut serveur ;
  - [x] une clé d'idempotence par saisie.
- [x] Détail, correction et demande de correction avec répartition.
- [x] Historiques général et financier : période, ordre, pagination serveur ; états vide / erreur / 403.
- [x] Accès Gestionnaire : DAF et file DGA retirés (navigation, routes, fil d'Ariane) ; « À traiter » réservé aux
  décideurs.
- [x] Défauts F1 à F6 corrigés.
- [x] Simulacres MSW :
  - [x] `handlers.v22.ts` (contexte, synthèse, dossier complet, historiques) ;
  - [x] `POST /paiements` : répartition, pack et conflit d'idempotence ;
  - [x] WhatsApp et e-mail sur les fixtures.
- [x] Tests :
  - [x] `DossierV22.test.tsx` (12) ;
  - [x] saisie de cotisation réécrite (`ModuleCotisations.test.tsx`, 10 cas dont 6 nouveaux) ;
  - [x] `NouveauPaiement.test.tsx`, `NouvelAdherent.test.tsx` (création sans pack, WhatsApp / e-mail) ;
  - [x] `FicheAdherent.test.tsx` (historique, non-régression F1).

### Non fait / à confirmer

- [ ] **Tests d'intégration UI / API contre l'API réelle** (prompt §35) : la recette Playwright (`e2e/`) n'a pas été
  étendue à V22 dans ce lot. Le parcours est couvert par les tests de composants sur simulacres, alignés sur le
  contrat V22.
- [ ] **À CONFIRMER** — restreindre côté serveur la file `GET /controles-dga` au Gestionnaire. Il porte toujours
  `CONTROLE_DGA:LIRE`, donc l'API lui rend la file entière. Le frontend la masque, mais ce n'est pas une protection
  (règle 1).
- [ ] **À CONFIRMER** — `EPARGNE_FACULTATIVE_PAR_COTISATION` `[V]` : l'écran applique la valeur renvoyée par le
  serveur (Épargne 0 acceptée tant qu'elle vaut `true`).
- [ ] **À CONFIRMER** — plafonds Sécurité Sociale / Épargne : aucun n'est appliqué (non définis, règle de
  non-invention).
- [ ] **À CONFIRMER** — `GET /dossier-complet` remplacerait les cinq lectures de la fiche en une seule ; ce n'est pas
  basculé dans ce lot, pour ne pas toucher aux onglets existants.

---

## 6. Vérifications

- `npx tsc -b` : vert. `npx oxlint src` : aucun nouvel avertissement. `npm run build` : vert.
- Vitest : **217/217 tests verts** (29 fichiers), suite complète.
- Instabilité de test corrigée : un `Select` Radix ouvert à la souris juste après un autre test restait fermé sous
  jsdom ; le test l'ouvre désormais au clavier (Entrée), ce qui vérifie aussi l'accès sans souris.

---

## 7. Fichiers

**Nouveaux** :

- `src/api/dossierAdherent.ts`
- `src/ecrans/adherents/fiche/CarteComptes.tsx`
- `src/ecrans/adherents/DossierV22.test.tsx`
- `src/test/msw/handlers.v22.ts`

**Modifiés** :

- API : `src/api/{adherents, paiements}.ts`
- Hooks : `src/hooks/{useAdherents, usePaiements}.ts`
- Application : `src/app/routes.tsx`, `src/components/cositi/navigation-laterale.tsx`
- Écrans :
  - `src/ecrans/adherents/{FicheAdherent, NouvelAdherent, schemas}` ;
  - `src/ecrans/adherents/fiche/{CarteCoordonnees, OngletHistorique}` ;
  - `src/ecrans/cotisations/{NouveauPaiement, DetailPaiement, DialogueCorrigerPaiement}` ;
  - `src/ecrans/adhesion/EcranControleDga`, `src/ecrans/workflow/{EcranCentreValidation, champsWorkflow}`
- Tests :
  - `FicheAdherent.test`, `NouvelAdherent.test`, `NouveauPaiement.test`, `ModuleCotisations.test` ;
  - `src/test/msw/{serveur, handlers.adherents, handlers.paiements}.ts`

**Aucune dépendance ajoutée. Aucune donnée stockée dans le navigateur. Aucun calcul financier côté client** (seule
l'aide de saisie additionne les deux montants saisis pour afficher le reste à répartir).
