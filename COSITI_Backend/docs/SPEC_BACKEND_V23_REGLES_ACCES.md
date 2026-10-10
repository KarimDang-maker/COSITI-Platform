# Spécification backend V23 — Règles réputées validées, formulaire adhérent allégé, centres de validation, finances au DAF

Fichier à remettre à l'agent backend. **Implémenté le 05/10/2026** — journal : `docs/journal_des_actions_backend/2026-10-05_V23_recette_3_modules_backend.md`. Il rend **côté serveur** ce que le frontend applique déjà depuis le 05/10/2026
(journal frontend `COSITI_FrontEnd/docs/journal_des_actions_frontEnd/2026-10-05_V23_regles_acces_frontend.md`).
Le serveur reste l'autorité : tant que ces points ne sont pas livrés, le frontend masque mais l'API autorise encore.

Une migration : **`V23__regles_validees_acces_roles.sql`** (additive, aucune suppression de donnée).

---

## 1. Règles en attente de validation → réputées validées

Décision COSITI : toutes les règles en attente sont valides. **Les règles documentaires (pièces à fournir) sont
conservées.**

- [x] `UPDATE parametre SET statut_validation = 'C' WHERE statut_validation IN ('V', 'A');` (avec `modifie_le`,
  `modifie_par = 'migration V23'`) et une ligne d'audit `REGLE_VALIDATION`, motif « Décision COSITI 05/10/2026 ».
- [x] `UPDATE exigence_documentaire SET statut_validation = 'C' WHERE statut_validation <> 'C';`
  - **Effet à connaître** : une pièce `OBLIGATOIRE` confirmée devient **bloquante** pour l'activation (règle V21
    §17). Si une pièce ne doit pas bloquer, passer son `niveau` à `CONDITIONNELLE` ou `OPTIONNELLE` dans la même
    migration.
- [x] Ne plus émettre les avertissements « règle non validée / provisoire / à confirmer » :
  - dans les enveloppes de liste ;
  - dans les DTO (`avertissements`) ;
  - dans les tableaux de bord : `parametresNonValides` vaudra 0 ;
  - dans `ConfigurationFraisAdhesionDto.regleValidee` : toujours `true`.
- [x] `GET /regles/en-attente` peut rester (il renverra une liste vide).
- [x] `PUT /regles/exigences/{id}` reste utilisé par le frontend (« Matrice documentaire »).

## 2. Dossier adhérent : géolocalisation, validité de la CNI

- [x] `latitude` / `longitude` :
  - retirées de `CreationAdherentDto`, `ModificationAdherentDto`, `ModifierCoordonneesDto`,
    `CompleterProfilAdherentDto` et des réponses (`AdherentDetailDto`, `CoordonneesAdherentDto`) ;
  - **colonnes conservées** en base, rien n'est effacé ;
  - le frontend renvoie encore la valeur lue dans les `PUT` : l'ignorer.
- [x] Retirer `GEOLOCALISATION` du paramètre `CHAMPS_COMPLETION_ADHERENT`.
- [x] Retirer `latitude` / `longitude` des champs du workflow de modification (`AdaptateurWorkflowAdherent`).
- [x] `POST /documents` : pour `type = CNI`, ignorer `valideDu` / `valideJusquau`.
  - `document.estExpire` ne s'applique plus à la CNI.
  - L'exigence de la CNI ne demande aucune date de validité.

## 3. Formulaire de création : plus de zone ni de localisation

Le frontend n'envoie plus `zoneId` ni `localisation` (`quartier` et `ville` restent).

- [x] `CreationAdherentDto` : retirer `@NotNull zoneId` et `@NotBlank localisation`, en gardant les champs pour un
  appelant qui les enverrait encore.
- [x] `VerifierDoublonDto.zoneId` : facultatif. Sans zone, la similarité se cherche sur tout le périmètre du
  demandeur.
- [x] Migration : `ALTER TABLE adherent ALTER COLUMN zone_id DROP NOT NULL;` et
  `ALTER TABLE adherent ALTER COLUMN localisation DROP NOT NULL;`.
- [ ] **À décider, ne pas inventer** : quand un adhérent reçoit-il une zone ? *(05/10/2026 : non tranché ; toutes les règles listées tolèrent `null`, et `GET /portefeuilles/sans-agent` sans zone liste ces adhérents pour qu'ils puissent être affectés.)*
  - Proposition : celle de l'agent, à la première affectation de portefeuille.
  - Les règles qui lisent `adherent.zone_id` doivent tolérer `null` :
    - périmètre de l'Agent et du Chef ;
    - proches du seuil CNPS par zone ;
    - export par zone ;
    - tableaux de bord par zone.

## 4. Centres de validation

| Rôle | Centre de validation | Ce qu'il valide |
|---|---|---|
| Gestionnaire des comptes | **Aucun** | — (il propose ; il ne décide plus) |
| PCA | **Aucun** | — |
| DG | Identique à la DGA | Tout ce que valide la DGA |
| DGA | Oui | Modifications d'adhérent, profils d'agents, contrôle documentaire |
| DAF | Oui, **toutes les validations financières** | Cotisations, corrections de cotisation, frais d'adhésion, bilans de caisse |

- [x] Retirer `ADHERENT:VALIDER` au rôle `GESTIONNAIRE_COMPTE`.
- [x] Le donner au rôle `DG`.
  - `ServicePolitiqueValidation.rolesValidateurs` lit les permissions : les notifications « à valider » suivent
    toutes seules.
- [x] Donner au rôle `DG` toutes les permissions DGA qu'il n'a pas encore :
  - `CONTROLE_DGA:LIRE`, `CONTROLE_DGA:EFFECTUER` ;
  - `FRAIS_ADHESION:SIGNALER`, `DOCUMENT:LIRE` ;
  - `ORGANISATION:GERER`, `ORGANISATION:DESIGNER_CHEF` si la COSITI le confirme.
- [x] Notifications adressées à la DGA → adressées aussi au DG. Remplacer `List.of("DGA")` par `List.of("DGA", "DG")`
  dans :
  - `ServiceActivationAdherentImpl` (contrôle à traiter) ;
  - `AdaptateurWorkflowAdherent` (recontrôle) ;
  - tout autre `notifierRoles(List.of("DGA"), …)`.
- [x] PCA : aucune permission `*:VALIDER` ni `CONTROLE_DGA:EFFECTUER`. Il garde `REGLE:VALIDER`, qui sert à modifier
  la matrice documentaire.
- [x] DAF : vérifier `PAIEMENT:VALIDER`, `FRAIS_ADHESION:VALIDER` et `BILAN_CAISSE:VALIDER`.
  - Notifications financières (`BILAN_CAISSE_*`, `FRAIS_ADHESION_*`, `REMISE_CAISSE_ECART`, corrections de
    cotisation) : au DAF.
  - Ne plus notifier le Gestionnaire d'une décision de bilan.
- [x] `GET /demandes-validation/en-attente` : vide pour un rôle sans permission de décision. C'est déjà le cas une fois
  les permissions modifiées.

## 5. Frais d'adhésion validé par le DAF avant toute cotisation

Pour chaque nouvelle adhésion, le DAF valide l'encaissement des 1 000 FCFA. Tant que ce n'est pas fait, aucune
cotisation ne peut être enregistrée pour l'adhérent.

- [x] `ServicePaiementImpl.enregistrer` (et la soumission d'un brouillon) refuse la cotisation par **409
  `COTISATION_FRAIS_ADHESION_NON_VALIDE`** dans deux cas :
  - le frais d'adhésion de l'adhérent existe et n'est pas `VALIDE` ;
  - l'adhérent est `PREINSCRIT` sans frais.
  - Message : « Le frais d'adhésion de 1 000 FCFA doit être validé par le DAF avant toute cotisation. »
- [x] `GET /paiements/contexte-adherent` : dans les mêmes cas, `cotisable = false` et le motif dans `motifsBlocage`.
- [x] **Adhérents antérieurs au frais d'adhésion** (aucun frais enregistré, déjà actifs) : non bloqués. Le frontend
  applique la même exception.
- [x] Tests : refus sans frais, refus avec frais `ENREGISTRE` ou `ANOMALIE`, accepté avec frais `VALIDE`, ancien
  adhérent non bloqué, contexte `cotisable = false`.

## 6. Rubrique Finances exclusive au DAF

Le frontend réserve au DAF (`PAIEMENT:VALIDER`) :

- le journal des cotisations (`/cotisations`) ;
- les frais d'adhésion (`/frais-adhesion`) ;
- le bilan de caisse (`/bilans-caisse`) ;
- la file DAF (`/daf`).

Le Gestionnaire garde la **saisie** d'une cotisation (`/cotisations/nouveau`), le détail de la cotisation qu'il
vient de saisir et les comptes de la fiche adhérent.

- [x] Créer la permission `FINANCES:CONSULTER`, accordée au **DAF seul**. Elle est exigée sur :
  - `GET /paiements` (journal et filtres), `GET /paiements/statistiques/quotidiennes`,
    `GET /paiements/bilan-journalier` ;
  - `GET /frais-adhesion` (liste, synthèses, rapprochement) ;
  - `GET /bilans-caisse`, `POST /bilans-caisse` (saisie de la caisse physique : à confirmer, voir D-20) ;
  - `GET /rapports-daf` (lecture DG / DGA / PCA à trancher).
- [x] Laisser `PAIEMENT:LIRE` aux autres rôles pour `GET /paiements/{id}`, `/adherents/{id}/synthese-cotisations`,
  `/resume-cotisations`, `/historique-financier` et `/frais-adhesion/agents/{id}/synthese`.
- [x] Tableaux de bord PCA / DG / DGA / Gestionnaire : retirer les indicateurs qui renvoient vers ces écrans, ou les
  garder en lecture sans lien. Le frontend n'y affiche plus de lien.

## 7. Rubrique Terrain masquée pour le DAF

- [ ] Facultatif : retirer `ORGANISATION:LIRE` et `COMPTE_RENDU:LIRE` au rôle DAF. *(05/10/2026 : non fait — la file DAF et la section « Remises de caisse » lisent le référentiel des agents.)*
  - Le frontend masque déjà la rubrique pour tout porteur de `PAIEMENT:VALIDER`.
  - Vérifier avant que les écrans du DAF n'ont pas besoin du référentiel des agents : filtre « agent encaisseur » de
    la file DAF.

---

## Checklist de recette backend

- [x] `mvn test` vert.
- [x] Gestionnaire :
  - `GET /demandes-validation/en-attente` vide ;
  - `POST /demandes-validation/{id}/approuver` en 403 ;
  - `GET /paiements` en 403 ;
  - `POST /paiements` accepté pour un adhérent dont le frais est validé.
- [x] DG : approuve une modification d'adhérent ; démarre et termine un contrôle DGA ; reçoit les notifications de la
  DGA.
- [x] PCA : aucune décision possible (403 partout).
- [x] DAF : valide cotisations, frais et bilans ; reçoit toutes les notifications financières.
- [x] Création d'un adhérent sans `zoneId` ni `localisation` : 201.
- [x] `parametre` : aucun `V` / `A` ; plus aucun avertissement « non validé » dans les réponses.
