# 01 — Schéma de la base de données

PostgreSQL 16. Toutes les tables sont créées par migrations Flyway (`V1__socle.sql`, `V2__adherents.sql`, …). `ddl-auto: validate` uniquement.

## Conventions générales

| Règle | Détail |
|---|---|
| Nommage | `snake_case`, tables au singulier, en français (le métier est en français) |
| Clé primaire | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` — jamais un entier séquentiel exposé |
| Identifiant métier | Champ séparé, stable et lisible (`matricule`, `numero_recu`) — ne jamais confondre avec la PK |
| Horodatage | `cree_le`, `cree_par`, `modifie_le`, `modifie_par` sur toute table métier |
| Archivage | `archive BOOLEAN NOT NULL DEFAULT false`, `archive_le`, `archive_par`, `motif_archivage` — aucune suppression physique |
| Concurrence | `version BIGINT NOT NULL DEFAULT 0` (verrou optimiste JPA) sur adhérent, paiement, dossier CNPS |
| Montants | `NUMERIC(14,2)` — jamais `float` ni `double` |
| Devise | XAF implicite, pas de champ devise en V1 |
| Dates | `DATE` pour les dates métier, `TIMESTAMPTZ` pour les horodatages techniques |
| Énumérations | Table de référence si la liste évolue côté métier, sinon `VARCHAR` + contrainte `CHECK` |

Extension requise : `pgcrypto` (pour `gen_random_uuid()`).

## 1. Socle sécurité et paramétrage

### `utilisateur`
| Colonne | Type | Contraintes |
|---|---|---|
| id | UUID | PK |
| identifiant | VARCHAR(80) | UNIQUE NOT NULL |
| email | VARCHAR(160) | UNIQUE, nullable |
| mot_de_passe_hash | VARCHAR(255) | NOT NULL (BCrypt coût 12 ou Argon2id) |
| nom_complet | VARCHAR(160) | NOT NULL |
| telephone | VARCHAR(20) | nullable |
| actif | BOOLEAN | NOT NULL DEFAULT true |
| doit_changer_mot_de_passe | BOOLEAN | NOT NULL DEFAULT true |
| tentatives_echouees | SMALLINT | NOT NULL DEFAULT 0 |
| verrouille_jusqu_a | TIMESTAMPTZ | nullable |
| derniere_connexion_le | TIMESTAMPTZ | nullable |
| mfa_active | BOOLEAN | NOT NULL DEFAULT false |
| mfa_secret_chiffre | BYTEA | nullable |
| agent_id | UUID | FK → agent(id), nullable (un utilisateur peut être un agent de terrain) |

Index : `idx_utilisateur_identifiant`, `idx_utilisateur_actif`.

### `role`
`id` UUID PK · `code` VARCHAR(50) UNIQUE NOT NULL · `libelle` VARCHAR(120) NOT NULL · `description` TEXT · `systeme` BOOLEAN (rôle non supprimable).

Codes attendus en V1, exhaustifs — voir `CLAUDE.md` pour la matrice complète : `PCA`, `DG`, `DGA`, `DAF`, `GESTIONNAIRE_COMPTE`, `CHEF_AGENT_TERRAIN`, `AGENT_TERRAIN`, `SUPER_ADMIN`.

`CHEF_AGENT_TERRAIN` n'est pas un rôle hiérarchique séparé au sens métier : c'est un `AGENT_TERRAIN` auquel des permissions de supervision supplémentaires sont attribuées (`utilisateur_role` porte alors les deux lignes, ou le rôle `CHEF_AGENT_TERRAIN` inclut par construction toutes les permissions de `AGENT_TERRAIN` — à trancher en `02_CLASSES_ET_METHODES.md`). L'entité `agent` reste unique ; seule la table `role_permission` distingue les deux.

Rôles définitivement supprimés, à ne recréer sous aucune forme : `RESP_CNPS`, `RESP_ZONE`, `TELECONSEILLER`, `MARKETING`. `ADMIN_SYSTEME` est renommé `SUPER_ADMIN` dans le modèle V1.

### `permission`
`id` UUID PK · `code` VARCHAR(80) UNIQUE NOT NULL · `module` VARCHAR(40) NOT NULL · `libelle` VARCHAR(160).

Format du code : `MODULE:ACTION` — ex. `ADHERENT:CREER`, `PAIEMENT:VALIDER`, `CNPS:TRANSMETTRE`, `AUDIT:CONSULTER`, `EXPORT:ADHERENT`.

### `role_permission`
`role_id` UUID FK · `permission_id` UUID FK · PK composite.

### `utilisateur_role`
`utilisateur_id` UUID FK · `role_id` UUID FK · PK composite · `attribue_le`, `attribue_par`.

### `parametre`
Toutes les règles [V] vivent ici. Aucune constante métier dans le code Java.

| Colonne | Type | Détail |
|---|---|---|
| id | UUID | PK |
| cle | VARCHAR(80) | UNIQUE NOT NULL |
| valeur | TEXT | NOT NULL |
| type_valeur | VARCHAR(20) | `ENTIER`, `DECIMAL`, `BOOLEEN`, `TEXTE`, `JSON` |
| libelle | VARCHAR(200) | NOT NULL |
| modifiable_par_role | VARCHAR(50) | rôle minimal requis pour modifier |
| statut_validation | VARCHAR(10) | `C`, `A`, `V` — un paramètre `V` déclenche un avertissement à l'usage |

Clés initiales : `MONTANT_INSCRIPTION` (1000, C) · `SEUIL_CNPS_PACK_700` (10500, C) · `SEUIL_CNPS_PACK_1000` (15000, C) · `DELAI_RETARD_JOURS` (V) · `REGLE_QUINZE_DU_MOIS` (V) · `TRAITEMENT_SURPAIEMENT` (V) · `REPARTITION_VERSEMENT` (JSON, V) · `TAUX_CNPS` (0.084, C, information).

### `journal_audit`
| Colonne | Type | Détail |
|---|---|---|
| id | UUID | PK |
| horodatage | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| utilisateur_id | UUID | FK, nullable (opération système) |
| utilisateur_identifiant | VARCHAR(80) | dénormalisé, conservé même si le compte est supprimé |
| type_operation | VARCHAR(60) | NOT NULL — voir nomenclature §7 |
| entite | VARCHAR(60) | NOT NULL |
| entite_id | UUID | nullable |
| valeurs_avant | JSONB | nullable, champs sensibles masqués |
| valeurs_apres | JSONB | nullable |
| motif | TEXT | obligatoire pour annulation et correction |
| adresse_ip | INET | |
| user_agent | VARCHAR(255) | |
| resultat | VARCHAR(20) | `SUCCES`, `REFUS`, `ERREUR` |

Table en **append only** : aucun `UPDATE`, aucun `DELETE` autorisé (révoquer les droits au niveau PostgreSQL pour le rôle applicatif). Index : `(entite, entite_id)`, `(utilisateur_id, horodatage)`, `(horodatage DESC)`.

## 2. Organisation terrain

### `zone`
`id` UUID PK · `code` VARCHAR(20) UNIQUE NOT NULL · `libelle` VARCHAR(120) NOT NULL · `ville` VARCHAR(80) · `region` VARCHAR(80) · `zone_parente_id` UUID FK (hiérarchie optionnelle) · `active` BOOLEAN · champs d'audit.

### `agent`
| Colonne | Type | Détail |
|---|---|---|
| id | UUID | PK |
| code_agent | VARCHAR(20) | UNIQUE NOT NULL |
| nom_complet | VARCHAR(160) | NOT NULL |
| telephone | VARCHAR(20) | NOT NULL |
| zone_id | UUID | FK → zone |
| utilisateur_id | UUID | FK → utilisateur, nullable |
| objectif_collecte_mensuel | NUMERIC(14,2) | nullable |
| actif | BOOLEAN | NOT NULL DEFAULT true |

**[A — contrat à valider avant codage, voir `03_SPECIFICATIONS_API.md` §10]** La désignation d'un agent comme `CHEF_AGENT_TERRAIN` (par le DGA) et le lien de supervision chef → agents supervisés ne sont pas encore modélisés ici. Deux pistes possibles, à arbitrer avec le chef de projet avant d'écrire la migration : (a) un champ `chef_agent_id UUID FK → agent, nullable` sur `agent`, la supervision suivant alors l'affectation individuelle ; (b) une supervision par zone, le chef héritant de tous les agents de sa `zone_id`. Ne pas choisir par défaut côté code — les deux changent la sémantique du périmètre de données (`ServicePerimetreDonnees`).

### `affectation_portefeuille`
Historise le lien adhérent ↔ agent. **Ne jamais écraser l'agent courant sans clore l'affectation précédente** — transférer un portefeuille, c'est transférer une relation financière.

`id` UUID PK · `adherent_id` UUID FK NOT NULL · `agent_id` UUID FK NOT NULL · `date_debut` DATE NOT NULL · `date_fin` DATE nullable · `motif` VARCHAR(200) · `auteur_id` UUID FK → utilisateur.

Contrainte : une seule affectation ouverte (`date_fin IS NULL`) par adhérent — index unique partiel `UNIQUE (adherent_id) WHERE date_fin IS NULL`.

## 3. Adhérents

### `activite` (référentiel)
`id` UUID PK · `code` VARCHAR(30) UNIQUE · `libelle` VARCHAR(120) · `categorie` VARCHAR(60).

Valeurs initiales : transporteur, bayam-sellam, restauration/tourne-dos, événementiel, petit commerce, petit métier, autre.

### `association`
`id` UUID PK · `code` VARCHAR(20) UNIQUE · `nom` VARCHAR(160) NOT NULL · `type` VARCHAR(60) · `contact_nom` VARCHAR(160) · `contact_telephone` VARCHAR(20) · `zone_id` UUID FK · `date_convention` DATE · `active` BOOLEAN.

### `pack`
`id` UUID PK · `code` VARCHAR(20) UNIQUE (`PACK_700`, `PACK_1000`) · `libelle` VARCHAR(80) · `montant_journalier` NUMERIC(14,2) NOT NULL · `montant_mensuel_equivalent` NUMERIC(14,2) · `seuil_eligibilite_cnps` NUMERIC(14,2) NOT NULL · `actif` BOOLEAN.

Le seuil est porté par le pack, pas par une constante globale : 10 500 F pour le pack 700, 15 000 F pour le pack 1000.

### `adherent`
| Colonne | Type | Contraintes |
|---|---|---|
| id | UUID | PK |
| matricule | VARCHAR(20) | UNIQUE NOT NULL — format `COSITI-0000N`, immuable |
| nom | VARCHAR(100) | NOT NULL |
| prenoms | VARCHAR(140) | nullable |
| date_naissance | DATE | CHECK < CURRENT_DATE |
| sexe | VARCHAR(1) | `M`/`F`, nullable |
| telephone_principal | VARCHAR(20) | NOT NULL, CHECK format Cameroun |
| telephone_secondaire | VARCHAR(20) | nullable, même CHECK |
| numero_cni | VARCHAR(30) | nullable, UNIQUE partiel `WHERE numero_cni IS NOT NULL AND archive = false` |
| numero_cnps | VARCHAR(30) | nullable, UNIQUE partiel |
| activite_id | UUID | FK → activite, NOT NULL |
| zone_id | UUID | FK → zone, NOT NULL |
| association_id | UUID | FK → association, nullable |
| localisation | VARCHAR(200) | NOT NULL |
| quartier | VARCHAR(100) | |
| ville | VARCHAR(80) | |
| latitude / longitude | NUMERIC(9,6) | nullable, avec consentement |
| date_adhesion | DATE | NOT NULL |
| statut | VARCHAR(20) | `PREINSCRIT`, `ACTIF`, `EN_RETARD`, `INACTIF`, `REACTIVE`, `RADIE` |
| inscription_payee | BOOLEAN | NOT NULL DEFAULT false |
| consentement_donnees_le | TIMESTAMPTZ | nullable — trace du consentement à la collecte |
| version | BIGINT | verrou optimiste |

Index : `matricule` (unique), `telephone_principal`, `(nom, prenoms)` avec `pg_trgm` pour la recherche floue, `(zone_id, statut)`, `(statut)`.

**Aucun champ `agent_nom` dénormalisé ne fait autorité** : l'agent référent se lit dans `affectation_portefeuille`. Un champ de cache est toléré pour l'affichage mais doit être recalculé, jamais saisi.

### `ayant_droit`
`id` UUID PK · `adherent_id` UUID FK NOT NULL · `type_lien` VARCHAR(20) (`ENFANT`, `CONJOINT`) · `nom` · `prenoms` · `date_naissance` DATE · `acte_naissance_document_id` UUID FK → document.

### `adhesion`
Historise pack et statut dans le temps.
`id` UUID PK · `adherent_id` UUID FK · `pack_id` UUID FK · `date_debut` DATE NOT NULL · `date_fin` DATE nullable · `motif_changement` VARCHAR(200) · `auteur_id` UUID FK.

Index unique partiel : une seule adhésion ouverte par adhérent.

## 4. Financier

### `composante_affectation` (référentiel)
Destinations possibles d'une part de versement. **Table de référence justement parce que la règle n'est pas validée.**

`id` UUID PK · `code` VARCHAR(30) UNIQUE (`CNPS`, `COOPERATIVE`, `EPARGNE`, `FRAIS_GESTION`) · `libelle` · `nature` VARCHAR(20) (`PRODUIT`, `DETTE_ADHERENT`, `REVERSEMENT_TIERS`) · `actif`.

### `paiement`
| Colonne | Type | Contraintes |
|---|---|---|
| id | UUID | PK |
| adherent_id | UUID | FK NOT NULL — **jamais de paiement orphelin** |
| numero_recu | VARCHAR(20) | UNIQUE NOT NULL |
| date_paiement | DATE | NOT NULL, CHECK ≤ CURRENT_DATE et ≥ date_adhesion |
| montant | NUMERIC(14,2) | NOT NULL CHECK > 0 |
| mode_paiement | VARCHAR(20) | NOT NULL CHECK IN (`ESPECES`,`ORANGE_MONEY`,`MTN_MOMO`,`VIREMENT`) |
| reference_transaction | VARCHAR(60) | conditionnellement obligatoire (voir contrainte) |
| type_paiement | VARCHAR(20) | `INSCRIPTION`, `COTISATION` |
| agent_encaisseur_id | UUID | FK → agent, nullable (paiement au siège) |
| statut | VARCHAR(20) | `BROUILLON`, `A_CONTROLER`, `VALIDE`, `RAPPROCHE`, `ANNULE` — voir extension [A] ci-dessous |
| valide_par | UUID | FK → utilisateur, nullable |
| valide_le | TIMESTAMPTZ | nullable |
| motif_annulation | TEXT | nullable |
| remise_caisse_id | UUID | FK → remise_caisse, nullable |
| cle_idempotence | VARCHAR(80) | UNIQUE, nullable — protège contre le double envoi |
| version | BIGINT | verrou optimiste |

Contraintes structurantes :

```sql
CONSTRAINT chk_reference_mobile_money CHECK (
  mode_paiement NOT IN ('ORANGE_MONEY','MTN_MOMO')
  OR (reference_transaction IS NOT NULL AND length(trim(reference_transaction)) > 0)
),
CONSTRAINT chk_validation_coherente CHECK (
  (statut <> 'VALIDE') OR (valide_par IS NOT NULL AND valide_le IS NOT NULL)
),
CONSTRAINT chk_annulation_motivee CHECK (
  (statut <> 'ANNULE') OR (motif_annulation IS NOT NULL)
)
```

La séparation des responsabilités (`valide_par <> cree_par`) est vérifiée dans le service, pas par une contrainte SQL — le message d'erreur doit être métier.

Index : `(adherent_id, date_paiement DESC)`, `(statut)`, `(mode_paiement, date_paiement)`, `reference_transaction`, `(agent_encaisseur_id, date_paiement)`.

**[A — contrat à valider avant codage, voir `03_SPECIFICATIONS_API.md` §10]** Le modèle de rôles V1 introduit une chaîne à trois niveaux (Agent de terrain → Chef des agents de terrain → DAF) au lieu de deux (créateur → validateur). L'ancien scénario de versement bancaire est supprimé : le DAF ne fait jamais de dépôt en microfinance depuis la plateforme, il contrôle des données déjà saisies. Deux évolutions de schéma sont pressenties, mais ne doivent pas être codées avant validation du contrat :
- des colonnes `confirme_par_chef_id UUID FK → utilisateur, nullable` et `confirme_le TIMESTAMPTZ, nullable` pour tracer la confirmation hiérarchique, distincte de la validation DAF ;
- une valeur de statut supplémentaire pour l'incohérence signalée par le DAF (par exemple `INCOHERENCE`), avec un motif obligatoire, sans que cela n'ouvre un canal de suppression ou de mouvement de fonds.

Tant que ce contrat n'est pas validé, l'implémentation par défaut reste le cycle actuel (`A_CONTROLER` → `VALIDE`/`ANNULE`) avec un avertissement explicite indiquant que la confirmation hiérarchique n'est pas encore tracée en base.

### `affectation_paiement`
`id` UUID PK · `paiement_id` UUID FK NOT NULL · `composante_id` UUID FK NOT NULL · `montant` NUMERIC(14,2) NOT NULL CHECK > 0 · `regle_appliquee` VARCHAR(80) (trace de la règle de paramétrage utilisée).

Invariant applicatif : `SUM(affectation_paiement.montant) = paiement.montant` pour tout paiement validé. À vérifier dans le service et par un contrôle de cohérence nocturne.

### `periode_droits`
Persiste ce que le versement achète. **Ne jamais se contenter de recalculer à l'affichage** — c'est l'erreur du prototype existant.

| Colonne | Type | Détail |
|---|---|---|
| id | UUID | PK |
| adherent_id | UUID | FK NOT NULL |
| date_debut | DATE | NOT NULL |
| date_fin | DATE | NOT NULL, CHECK ≥ date_debut |
| jours_couverts | INTEGER | NOT NULL CHECK > 0 |
| montant_impute | NUMERIC(14,2) | NOT NULL |
| pack_id | UUID | FK — le pack en vigueur sur la période |
| statut | VARCHAR(20) | `COUVERTE`, `PARTIELLE` |
| source_affectation_id | UUID | FK → affectation_paiement |

Index : `(adherent_id, date_debut)`, `(adherent_id, date_fin DESC)`.

### `remise_caisse`
`id` UUID PK · `agent_id` UUID FK NOT NULL · `date_remise` DATE NOT NULL · `montant_declare` NUMERIC(14,2) NOT NULL · `montant_recu` NUMERIC(14,2) nullable · `ecart` NUMERIC(14,2) généré · `statut` VARCHAR(20) (`DECLAREE`, `RECUE`, `EN_ECART`, `CLOTUREE`) · `recu_par` UUID FK → utilisateur · `commentaire` TEXT.

Règle : un agent ne valide jamais sa propre remise. `remise_caisse` trace une **opération interne de contrôle** (caisse/coffre-fort COSITI) — ce n'est en aucun cas un versement bancaire ou un dépôt en microfinance, exclu du périmètre V1.

### `mouvement_tresorerie` (P1, périmètre à confirmer avec le DAF)
`id` UUID PK · `date_mouvement` DATE · `sens` VARCHAR(10) (`ENTREE`,`SORTIE`) · `categorie` VARCHAR(60) · `montant` NUMERIC(14,2) · `mode` VARCHAR(20) · `reference` VARCHAR(60) · `paiement_id` UUID FK nullable (lien avec la cotisation d'origine, clé du rapprochement) · `justificatif_document_id` UUID FK · `statut` VARCHAR(20) · `valide_par` UUID FK.

Ne pas développer au-delà de la traçabilité de base tant que le DAF n'a pas spécifié le module. Aucun sens `SORTIE` de cette table ne peut représenter un virement, un dépôt en microfinance ou un mouvement Mobile Money exécuté par la plateforme — voir le périmètre exclu dans `CLAUDE.md`.

## 5. CNPS

### `dossier_cnps`
`id` UUID PK · `adherent_id` UUID FK UNIQUE NOT NULL · `numero_immatriculation` VARCHAR(30) nullable · `date_immatriculation` DATE nullable · `revenu_mensuel_declare` NUMERIC(14,2) nullable **[V — assiette non validée]** · `statut` VARCHAR(20) (`BROUILLON`,`INCOMPLET`,`PRET`,`TRANSMIS`,`TRAITE`,`REJETE`) · `motif_rejet` TEXT · `version` BIGINT.

### `piece_dossier_cnps`
`id` UUID PK · `dossier_id` UUID FK · `type_piece` VARCHAR(60) · `document_id` UUID FK → document nullable · `statut` VARCHAR(20) (`ATTENDUE`,`FOURNIE`,`VALIDEE`,`REJETEE`) · `obligatoire` BOOLEAN.

### `declaration_cnps`
`id` UUID PK · `dossier_id` UUID FK · `periode_mois` DATE (premier jour du mois) · `montant_declare` NUMERIC(14,2) · `statut` VARCHAR(20) · `date_transmission` DATE · `accuse_document_id` UUID FK.

Contrainte : `UNIQUE (dossier_id, periode_mois)`. Une déclaration se construit à partir des `periode_droits` du mois, pas d'un cumul global.

### `historique_dossier_cnps`
`id` · `dossier_id` FK · `statut_avant` · `statut_apres` · `auteur_id` · `horodatage` · `commentaire`.

## 6. Documents, relances, notifications

### `document`
| Colonne | Type | Détail |
|---|---|---|
| id | UUID | PK |
| type_document | VARCHAR(40) | `CNI`, `ACTE_NAISSANCE`, `PREUVE_PAIEMENT`, `ACCUSE_CNPS`, `AUTRE` |
| nom_fichier_original | VARCHAR(255) | assaini, jamais utilisé comme chemin |
| chemin_stockage | VARCHAR(500) | nom généré (UUID), hors racine web |
| type_mime | VARCHAR(100) | validé par signature binaire, pas par extension |
| taille_octets | BIGINT | CHECK ≤ limite configurée |
| empreinte_sha256 | CHAR(64) | NOT NULL — détection de doublon et d'altération |
| chiffre | BOOLEAN | NOT NULL DEFAULT true pour les pièces d'identité |
| adherent_id / dossier_id / paiement_id | UUID | FK nullable, au moins un renseigné |
| statut | VARCHAR(20) | `AJOUTE`,`VERIFIE`,`REJETE`,`ARCHIVE` |
| analyse_antivirus | VARCHAR(20) | `EN_ATTENTE`,`PROPRE`,`INFECTE` |

### `campagne_relance`
`id` · `libelle` · `critere` JSONB (retard > N jours, jamais cotisé, zone…) · `date_debut` · `date_fin` · `statut` · `cree_par`.

### `relance`
`id` · `adherent_id` FK · `campagne_id` FK nullable · `responsable_utilisateur_id` FK · `canal` VARCHAR(20) (`APPEL`,`SMS`,`WHATSAPP`,`VISITE`) · `date_contact` TIMESTAMPTZ · `resultat` VARCHAR(30) (`PROMESSE`,`PAIEMENT`,`INJOIGNABLE`,`REFUS`,`DEMENAGE`,`ABSENT`) · `prochaine_action_le` DATE · `commentaire` TEXT.

La liste des résultats est fermée : c'est elle qui rend la relance mesurable.

### `notification`
`id` · `destinataire_utilisateur_id` FK · `type` VARCHAR(40) · `titre` · `corps` · `entite` / `entite_id` · `lue` BOOLEAN · `cree_le`.

### `element_agenda` (P2 — CRM de partenariats de direction)
`id` · `type` (`RENDEZ_VOUS`,`ECHEANCE`,`NOTE`) · `titre` · `date_debut` · `date_fin` · `partenaire` VARCHAR(160) · `statut` · `proprietaire_utilisateur_id` FK.

**Ne pas confondre avec un futur agenda opérationnel de descentes terrain** — ce sont deux objets métier distincts, avec des utilisateurs différents.

## 7. Nomenclature des types d'opération d'audit

Reprise et étendue de l'inventaire de l'application existante (33 types). Format `ENTITE_ACTION` :

`ADHERENT_CREATION`, `ADHERENT_MODIFICATION`, `ADHERENT_ARCHIVAGE`, `ADHERENT_CHANGEMENT_STATUT`, `ADHERENT_DOUBLON_IGNORE`, `PORTEFEUILLE_AFFECTATION`, `PORTEFEUILLE_TRANSFERT`, `AGENT_DESIGNATION_CHEF`, `AGENT_ATTRIBUTION_OBJECTIF`, `PAIEMENT_CREATION`, `PAIEMENT_VALIDATION`, `PAIEMENT_CONFIRMATION_HIERARCHIQUE`, `PAIEMENT_SIGNALEMENT_INCOHERENCE`, `PAIEMENT_CORRECTION`, `PAIEMENT_ANNULATION`, `PAIEMENT_RAPPROCHEMENT`, `AFFECTATION_CREATION`, `DROITS_RECALCUL`, `REMISE_CAISSE_DECLARATION`, `REMISE_CAISSE_RECEPTION`, `REMISE_CAISSE_ECART`, `CNPS_DOSSIER_CREATION`, `CNPS_PIECE_AJOUT`, `CNPS_CHANGEMENT_STATUT`, `CNPS_DECLARATION_TRANSMISE`, `DOCUMENT_TELEVERSEMENT`, `DOCUMENT_CONSULTATION`, `DOCUMENT_SUPPRESSION_LOGIQUE`, `RELANCE_ENREGISTREMENT`, `UTILISATEUR_CREATION`, `UTILISATEUR_DESACTIVATION`, `ROLE_MODIFICATION`, `PERMISSION_MODIFICATION`, `PARAMETRE_MODIFICATION`, `CONNEXION_SUCCES`, `CONNEXION_ECHEC`, `EXPORT_SENSIBLE`, `ACCES_REFUSE`, `MIGRATION_IMPORT`.

`AGENT_DESIGNATION_CHEF`, `AGENT_ATTRIBUTION_OBJECTIF`, `PAIEMENT_CONFIRMATION_HIERARCHIQUE` et `PAIEMENT_SIGNALEMENT_INCOHERENCE` anticipent les contrats [A] de `03_SPECIFICATIONS_API.md` §10 : les types d'opération sont réservés dans la nomenclature, mais l'implémentation qui les déclenche attend la validation du contrat correspondant.

## 8. Vues et contrôles de cohérence

Vues matérialisées rafraîchies périodiquement (pour le tableau de bord) :

- `vue_situation_adherent` — matricule, nom, pack, cumul cotisé, dernière période couverte, jours de retard, statut de régularité, agent référent.
- `vue_taux_activation` — par zone, par agent, par mois.
- `vue_collecte_mensuelle` — montant par mode de paiement, par zone, par mois.

Contrôles de cohérence à exécuter chaque nuit et à exposer dans un rapport d'anomalies :

| Contrôle | Attendu |
|---|---|
| Paiement sans affectation | 0 pour les paiements validés |
| Somme des affectations ≠ montant du paiement | 0 |
| Paiement mobile money sans référence | 0 |
| Adhérent sans affectation de portefeuille ouverte | 0 |
| Périodes de droits chevauchantes pour un même adhérent | 0 |
| Déclaration CNPS antérieure à la date d'adhésion | 0 |
| Doublons potentiels non traités (téléphone/CNI identiques) | file de traitement |

## 9. Migration du classeur existant

Table technique `migration_correspondance` : `source` VARCHAR(60) · `cle_source` VARCHAR(200) (nom en texte libre du classeur) · `entite_cible` VARCHAR(40) · `id_cible` UUID · `action` VARCHAR(20) (`IMPORTE`,`FUSIONNE`,`ECARTE`) · `commentaire`.

Elle sert à produire le rapport de migration signé, ligne par ligne. Anomalies connues à traiter : noms en texte libre, homonymes, paiements orphelins, dates invalides (`10/06/20236`, `148/06/2026`, un paiement daté 2027), déclarations antérieures à l'adhésion, vocabulaire de paiement non normalisé, aucune période couverte.

Arbitrage à obtenir du DAF avant l'import : reprendre les cumuls comme solde d'ouverture, ou reconstituer les périodes depuis les carnets papier pour les 57 cotisants actifs.
