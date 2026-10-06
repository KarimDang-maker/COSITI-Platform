# 03 — Spécifications de l'API REST

Base : `/api/v1`. Format : JSON, UTF-8. Documentation générée par springdoc-openapi, exposée sur `/api/v1/openapi` (protégée hors développement).

## 1. Conventions

| Sujet | Règle |
|---|---|
| Versionnement | Préfixe d'URL `/v1`. Une rupture de contrat impose `/v2`, jamais une modification en place |
| Identifiants | UUID en chemin. Le matricule est un critère de recherche, pas une clé d'URL |
| Pagination | `?page=0&taille=25&tri=nom,asc` — taille maximale 200 |
| Filtres | Paramètres de requête nommés, jamais de filtre libre injecté en SQL |
| Dates | ISO 8601 (`2026-09-16`, `2026-09-16T10:12:33Z`) |
| Montants | Nombre décimal, deux décimales, sans séparateur de milliers |
| Idempotence | En-tête `Idempotency-Key` obligatoire sur `POST /paiements` |
| Corrélation | En-tête `X-Trace-Id` accepté et propagé, généré si absent |
| Langue | Messages d'erreur en français |

### Enveloppe de liste
```json
{ "contenu": [ ... ], "page": 0, "taille": 25,
  "totalElements": 172, "totalPages": 7, "avertissements": [] }
```

## 2. Authentification

| Méthode | Chemin | Description |
|---|---|---|
| POST | `/auth/connexion` | Identifiant + mot de passe → jeton d'accès (court) + jeton de rafraîchissement |
| POST | `/auth/rafraichir` | Rotation du jeton de rafraîchissement |
| POST | `/auth/deconnexion` | Révoque le jeton de rafraîchissement courant |
| POST | `/auth/mot-de-passe/changer` | Changement par l'utilisateur connecté |
| GET | `/auth/moi` | Profil, rôles, permissions effectives, périmètre de données |

`GET /auth/moi` alimente l'affichage conditionnel côté frontend. Il renvoie la liste des codes de permission, jamais un booléen par écran.

## 3. Adhérents

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/adherents` | `ADHERENT:LIRE` |
| POST | `/adherents` | `ADHERENT:CREER` |
| GET | `/adherents/{id}` | `ADHERENT:LIRE` |
| PUT | `/adherents/{id}` | `ADHERENT:MODIFIER` |
| POST | `/adherents/{id}/archiver` | `ADHERENT:ARCHIVER` |
| POST | `/adherents/{id}/statut` | `ADHERENT:CHANGER_STATUT` |
| POST | `/adherents/verifier-doublon` | `ADHERENT:CREER` |
| GET | `/adherents/{id}/situation` | `DROITS:LIRE` |
| GET | `/adherents/{id}/paiements` | `PAIEMENT:LIRE` |
| POST | `/adherents/{id}/pack` | `ADHERENT:MODIFIER` |
| GET | `/adherents/{id}/ayants-droit` · POST · DELETE | `ADHERENT:MODIFIER` |

Filtres de `GET /adherents` : `recherche` (matricule, nom, téléphone, CNI), `zoneId`, `agentId`, `activiteId`, `statut`, `packId`, `associationId`, `sansAgentReferent`, `dateAdhesionDu`, `dateAdhesionAu`.

`GET /adherents` renvoie un **résumé** par ligne, pas la fiche complète :
`id`, `matricule`, `nomComplet`, `telephonePrincipal`, `zoneId`, `zoneLibelle`,
`dateAdhesion`, `statut`. `GET /adherents/{id}` renvoie la fiche entière, dont
`nom` et `prenoms` séparés. **Les deux formes sont distinctes** : les confondre
côté client faisait afficher un tiret dans trois colonnes de la liste (corrigé
au jalon J12, où `zoneLibelle` et `dateAdhesion` ont été ajoutés au résumé).

`POST /adherents/verifier-doublon` est appelé avant la soumission du formulaire. Réponse :
```json
{ "candidats": [ { "adherentId": "…", "matricule": "COSITI-00042",
  "nomComplet": "…", "telephone": "6•• ••• 937", "scoreSimilarite": 92,
  "motifCorrespondance": "Téléphone principal identique" } ] }
```
Le téléphone est partiellement masqué : l'agent doit pouvoir reconnaître un doublon, pas récupérer une base de contacts.

`POST /adherents` renvoie `201` avec l'en-tête `Location`. En cas de doublon détecté et non confirmé, `409` avec le code `ADHERENT_DOUBLON_POTENTIEL` et la liste des candidats ; le client renvoie alors `confirmationDoublonIgnore: true`, ce qui est journalisé.

## 4. Cotisations

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/paiements` | `PAIEMENT:LIRE` |
| POST | `/paiements` | `PAIEMENT:CREER` |
| GET | `/paiements/{id}` | `PAIEMENT:LIRE` |
| POST | `/paiements/{id}/valider` | `PAIEMENT:VALIDER` |
| POST | `/paiements/{id}/corriger` | `PAIEMENT:CORRIGER` |
| POST | `/paiements/{id}/annuler` | `PAIEMENT:ANNULER` |
| GET | `/paiements/{id}/recu` | `PAIEMENT:LIRE` |
| GET | `/paiements/{id}/affectations` | `PAIEMENT:LIRE` |
| POST | `/paiements/{id}/affectations` | `PAIEMENT:AFFECTER` |
| POST | `/paiements/{id}/confirmer-chef?motif=` | `PAIEMENT:CONFIRMER_CHEF` `[A]` — réservé `CHEF_AGENT_TERRAIN`, dans le périmètre de l'agent encaisseur, motif facultatif en paramètre de requête (jamais en corps JSON, pour ne pas imposer de `Content-Type` quand il n'y a rien à transmettre), audité (`PAIEMENT_CONFIRMATION_CHEF`, UC-CHEF-10) |
| POST | `/paiements/{id}/signaler-incoherence` | `PAIEMENT:SIGNALER_INCOHERENCE` `[A]` — réservé `DAF`, motif obligatoire, transition vers `INCOHERENCE`, audité (`PAIEMENT_SIGNALEMENT_INCOHERENCE`, UC-DAF-05) |
| POST | `/paiements/rapprochement` | `PAIEMENT:RAPPROCHER` (P1) |

`[A]` (jalon J5, `Roles des acteurs.md §14`) : contrat non confirmé, à valider avant codage — même convention que `designer-chef` en J3. `GET /paiements?statut=A_CONTROLER` (filtre générique déjà documenté) sert d'écran de triage DAF, aucun endpoint dédié n'est ajouté. Le rapprochement mobile money (`POST /paiements/rapprochement`) reste explicitement hors périmètre de J5 (P1, non implémenté).

Corps de `POST /paiements` :
```json
{ "adherentId": "…", "datePaiement": "2026-09-16", "montant": 5000.00,
  "modePaiement": "ORANGE_MONEY", "referenceTransaction": "OM260916.1042.C12345",
  "typePaiement": "COTISATION", "agentEncaisseurId": "…", "documentPreuveId": null }
```

Erreurs métier spécifiques :

| Code | Statut | Déclencheur |
|---|---|---|
| `PAIEMENT_REFERENCE_MANQUANTE` | 400 | Mode mobile money sans référence |
| `PAIEMENT_MONTANT_INVALIDE` | 400 | Montant ≤ 0 |
| `PAIEMENT_DATE_INCOHERENTE` | 400 | Antérieure à l'adhésion ou future |
| `PAIEMENT_ADHERENT_ARCHIVE` | 409 | Adhérent archivé |
| `PAIEMENT_AUTO_VALIDATION_INTERDITE` | 403 | Le validateur est le créateur |
| `PAIEMENT_DEJA_VALIDE` | 409 | Transition interdite |
| `PAIEMENT_MOTIF_REQUIS` | 400 | Annulation, correction ou signalement d'incohérence sans motif |
| `PAIEMENT_TRANSITION_INTERDITE` | 409 | Validation d'un paiement `INCOHERENCE` ou `ANNULE` ; signalement/confirmation sur un paiement déjà `ANNULE`/`VALIDE`/`RAPPROCHE` |
| `PAIEMENT_CONFIRMATION_RESERVEE_CHEF` | 403 | Confirmation hiérarchique par un utilisateur sans rôle `CHEF_AGENT_TERRAIN` |
| `PAIEMENT_HORS_PERIMETRE_CHEF` | 403 | L'agent encaisseur n'appartient pas à l'équipe du Chef |
| `PAIEMENT_AGENT_ENCAISSEUR_MANQUANT` | 400 | Confirmation hiérarchique impossible sans agent encaisseur renseigné |
| `PAIEMENT_DEJA_CONFIRME_CHEF` | 409 | Deuxième confirmation hiérarchique sur le même paiement |
| `PAIEMENT_SIGNALEMENT_RESERVE_DAF` | 403 | Signalement d'incohérence par un utilisateur sans rôle `DAF` |
| `PAIEMENT_DEJA_INCOHERENT` | 409 | Paiement déjà signalé incohérent |

`POST /paiements/{id}/annuler` ne supprime rien : le paiement passe en `ANNULE`, les périodes de droits issues de ses affectations sont invalidées et recalculées dans la même transaction.

### 4 bis. Dossier, cotisations réparties et historiques (V22, 04/10/2026)

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/paiements/contexte-adherent?matricule=` | `PAIEMENT:CREER` + périmètre — identité de contrôle, pack courant ou à choisir, minimums en vigueur, motifs de blocage |
| GET | `/adherents/{id}/dossier-complet` | `ADHERENT:LIRE` + périmètre (sections financières si `PAIEMENT:LIRE`) |
| GET | `/adherents/{id}/synthese-cotisations` | `PAIEMENT:LIRE` + périmètre — comptes Sécurité sociale / Épargne, validé / en attente, reste avant seuil, progression |
| GET | `/adherents/{id}/historique-general` | `ADHERENT:LIRE` + périmètre |
| GET | `/adherents/{id}/historique-financier` | `ADHERENT:LIRE` + (`PAIEMENT:LIRE` ou `FRAIS_ADHESION:LIRE`) + périmètre |

- `POST /adherents` n'attend plus de `packId` (ignoré s'il est encore envoyé). Le pack est choisi à la **première
  cotisation** : `POST /paiements` porte `packId`, obligatoire tant que l'adhérent n'a pas d'adhésion ouverte.
- `POST /paiements` porte `montantSecuriteSociale` et `montantEpargne` : leur somme égale `montant`, Sécurité sociale
  ≥ `MONTANT_MINIMUM_SECURITE_SOCIALE` (700), Épargne ≥ `MONTANT_MINIMUM_EPARGNE` (300) lorsqu'elle est alimentée.
  Sans répartition, le serveur applique la préférence de l'adhérent ou la règle par défaut et la renvoie
  (`origineRepartition = PROPOSITION_SERVEUR`). Aucun plafond n'est appliqué (non défini).
- Historiques : `periode` (`JOUR`, `SEMAINE`, `MOIS`, `ANNEE`) avec `date` de référence, ou `du` / `au` inclus ;
  `type` (répétable), `module`, `page`, `taille` (≤ 200), `direction`. Bornes calculées en `Africa/Douala`,
  intervalle `[début, fin[`. Les opérations internes DGA (`CONTROLE_DGA:LIRE`), CNPS (`CNPS:LIRE`) et DAF
  (`RAPPORT_DAF:LIRE`) n'apparaissent qu'aux porteurs de la permission ; l'audit technique n'y figure jamais.
- `GET /adherents/{id}/historique` (journal brut, non paginé) est **obsolète** et conservé pour compatibilité.

| Code | Statut | Déclencheur |
|---|---|---|
| `COTISATION_REPARTITION_INCOHERENTE` | 400 | Sécurité sociale + Épargne ≠ montant |
| `COTISATION_REPARTITION_INCOMPLETE` | 400 | Un seul des deux montants fourni |
| `COTISATION_REPARTITION_REQUISE` | 400 | Montant corrigé sans nouvelle répartition sur une cotisation répartie par le Gestionnaire |
| `COTISATION_SECURITE_SOCIALE_INSUFFISANTE` | 400 | Sécurité sociale < minimum |
| `COTISATION_EPARGNE_INSUFFISANTE` | 400 | Épargne alimentée < minimum (ou nulle si `EPARGNE_FACULTATIVE_PAR_COTISATION = false`) |
| `COTISATION_MONTANT_INSUFFISANT` | 400 | Montant total < minimum Sécurité sociale |
| `COTISATION_PACK_REQUIS` / `COTISATION_PACK_INVALIDE` | 400 | Première cotisation sans pack / pack inconnu ou inactif |
| `COTISATION_PACK_DIFFERENT` | 409 | Pack différent du pack courant (changement : `POST /adherents/{id}/pack`) |
| `COTISATION_STATUT_ADHERENT_INCOMPATIBLE` | 409 | Statut listé dans `COTISATION_STATUTS_ADHERENT_REFUSES` |
| `IDEMPOTENCY_KEY_CONFLIT` | 409 | Clé déjà utilisée pour une autre requête |
| `ADHERENT_MATRICULE_INVALIDE` | 400 | Matricule hors format `COSITI-00001` |
| `HISTORIQUE_FINANCIER_INACCESSIBLE` | 403 | Lecture de l'historique financier sans permission financière |
| `HISTORIQUE_PERIODE_INVALIDE` / `HISTORIQUE_FILTRE_AMBIGU` / `HISTORIQUE_MODULE_INCONNU` | 400 | Filtres incohérents |
| `FORMAT_DATE_INVALIDE` | 400 | Date ou période illisible (`periode=1`) — renvoyait 500 auparavant |

### 4 ter. V23 et recette des 3 modules (05/10/2026)

**Accès (V23, décision COSITI du 05/10/2026)** — migration `V23__regles_validees_acces_roles.sql` :

- Toutes les règles `V` / `A` passent à `C` (paramètres et exigences documentaires). Plus aucun rappel « règle non
  validée » dans les réponses.
- `ADHERENT:VALIDER` est retirée au Gestionnaire et accordée au DG. Le DG reçoit aussi `CONTROLE_DGA:*`,
  `FRAIS_ADHESION:SIGNALER` et les notifications adressées à la DGA.
- Le PCA n'a plus aucune permission `*:VALIDER` (il garde `REGLE:VALIDER`).
- `FINANCES:CONSULTER` (DAF seul) est exigée sur :
  - `GET /paiements`, `/paiements/statistiques/quotidiennes`, `/paiements/bilan-journalier` ;
  - `GET /frais-adhesion`, `/frais-adhesion/synthese`, `/frais-adhesion/rapprochement` ;
  - `GET /bilans-caisse`, `/bilans-caisse/{date}` ;
  - `GET /remises-caisse`.

**Dossier et création** :

- `zoneId`, `localisation` facultatifs à la création ; `latitude` / `longitude` retirées des DTO (colonnes
  conservées).
- `VerifierDoublonDto.zoneId` facultatif : sans zone, la similarité de nom couvre tous les adhérents.
- CNI : aucune date de validité (`valideDu` / `valideJusquau` ignorées, jamais expirée).
- `GET /portefeuilles/sans-agent` : `zoneId` facultatif. Sans zone, la route liste tous les adhérents sans agent, y
  compris ceux créés sans zone.

**Zones** :

- `POST` / `PUT /zones` : `ORGANISATION:GERER_ZONES` (Gestionnaire, DGA) ou `ORGANISATION:GERER`.
- Ville et région sont enregistrées à la modification ; le code ne se modifie pas.
- Création et modification sont auditées (`ZONE_CREATION`, `ZONE_MODIFICATION`).

**Cotisations** :

- Une cotisation est refusée en 409 `COTISATION_FRAIS_ADHESION_NON_VALIDE` (saisie et soumission d'un brouillon) :
  - si le frais d'adhésion existe sans être `VALIDE` ;
  - si l'adhérent est `PREINSCRIT` sans frais.
  Un dossier antérieur au frais (aucun frais, déjà actif) n'est pas bloqué. `GET /paiements/contexte-adherent`
  renvoie alors `cotisable = false` avec le motif.
- Un agent de terrain qui saisit sans `agentEncaisseurId` en devient l'encaisseur.
- `POST /paiements/{id}/affectations` (ré-affectation manuelle) :
  - applique la même règle qu'à la saisie, minimum Épargne compris ;
  - met à jour la répartition affichée sur la cotisation.
- `GET /paiements/{id}/recu` ajoute, en champs additifs :
  - `adherentMatricule`, `adherentNom` ;
  - `montantSecuriteSociale`, `montantEpargne` ;
  - `referenceTransaction`, `typePaiement` ;
  - `enregistrePar`, `enregistreLe`, `editeLe`.

**Remises de caisse** :

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/remises-caisse?statut=&agentId=&page=&taille=` | `FINANCES:CONSULTER` |
| GET | `/remises-caisse/{id}` | `PAIEMENT:LIRE` |
| GET | `/remises-caisse/a-remettre?agentId=` | `PAIEMENT:CREER` — cotisations de l'agent ni remises, ni annulées, ni rejetées, ni en brouillon |
| POST | `/remises-caisse` | `PAIEMENT:CREER` — notifie la DAF |
| POST | `/remises-caisse/{id}/receptionner` | `PAIEMENT:VALIDER` — une seule réception |

`RemiseCaisseDto` ajoute `dateRemise`, `recuLe`, `creeLe` et `nombrePaiements`.

| Code | Statut | Déclencheur |
|---|---|---|
| `COTISATION_FRAIS_ADHESION_NON_VALIDE` | 409 | Frais d'adhésion non validé par la DAF |
| `REMISE_PAIEMENT_AUTRE_AGENT` | 400 | Cotisation encaissée par un autre agent |
| `REMISE_PAIEMENT_DEJA_REMIS` | 409 | Cotisation déjà incluse dans une remise |
| `REMISE_PAIEMENT_NON_ENCAISSE` | 409 | Cotisation annulée, rejetée ou en brouillon |
| `REMISE_CAISSE_DEJA_RECEPTIONNEE` | 409 | Seconde réception |
| `REMISE_MONTANT_INVALIDE` | 400 | Montant reçu négatif ou absent |
| `ZONE_CODE_NON_MODIFIABLE` | 400 | Code de zone changé à la modification |
| `DOCUMENT_ILLISIBLE` | 400 | Fichier transmis illisible (corrompu, bloqué par l'antivirus) — renvoyait 500 |

## 5. Droits et régularité

| Méthode | Chemin | Description |
|---|---|---|
| GET | `/droits/adherents/{id}` | Situation à une date de référence (`?au=2026-09-16`) |
| GET | `/droits/adherents/{id}/periodes` | Historique des périodes de droits |
| POST | `/droits/adherents/{id}/recalculer` | Réservé `DAF`, `ADMIN_SYSTEME`, motif obligatoire |
| GET | `/droits/retardataires` | Filtres : zone, agent, jours de retard minimum, pack |

Réponse de situation :
```json
{ "matricule":"COSITI-00013", "pack":"PACK_700",
  "couvertJusquAu":"2026-09-02", "joursCouvertsTotal":90, "joursRetard":14,
  "cumulCotise":63000.00, "soldeAvantSeuil":0.00,
  "statut":"EN_RETARD", "eligibleCnps":true,
  "avertissements":["Reliquat de 400 F non imputé — règle de traitement non validée."] }
```

## 6. Organisation terrain

| Méthode | Chemin |
|---|---|
| GET / POST / PUT | `/zones`, `/zones/{id}` |
| GET | `/activites` — référentiel en lecture seule (jalon J12) |
| GET / POST / PUT | `/agents`, `/agents/{id}` |
| GET | `/agents/{id}/portefeuille` |
| GET | `/agents/{id}/charge?periode=2026-09` |
| POST | `/portefeuilles/affecter` |
| POST | `/portefeuilles/transferer` (unitaire ou lot, motif obligatoire) |
| GET | `/portefeuilles/sans-agent?zoneId=…` |
| GET / POST | `/remises-caisse`, `/remises-caisse/{id}/receptionner` |
| POST | `/agents/{id}/designer-chef` `[A]` — réservé `DGA`, motif obligatoire, audité (`DGA-F03`) |

**`GET /activites`** renvoie les sept activités insérées par la migration `V2`
(`id`, `code`, `libelle`, `categorie`), triées par libellé, sans pagination.
Aucune écriture n'est exposée : le référentiel vient de la COSITI.

Ajouté au jalon J12 : `CreationAdherentDto.activiteId` est un UUID **obligatoire**,
et aucun appel ne permettait d'en connaître les valeurs. L'écran de création
demandait donc un code en texte libre que l'API refusait systématiquement —
**aucun adhérent ne pouvait être enregistré par l'interface**.
| POST | `/agents/{id}/remplacer-chef` `[A]` — réservé `DGA`, motif obligatoire, audité (`DGA-F04`) |
| GET | `/agents/chef?zoneId=…` `[A]` — Chef courant du périmètre |
| GET | `/agents/{id}/historique-chef` `[A]` — historique des désignations/remplacements |

`[A]` : contrat non confirmé, à valider avant codage (jalon J3, `../Roles des acteurs.md §14`). `POST /agents` reste la création générique ; la création par la DGA (`DGA-F01`) utilise le même endpoint avec vérification côté service que l'auteur porte le rôle `DGA` et journalisation `AGENT_CREATION_PAR_DGA`.

## 7. CNPS

| Méthode | Chemin |
|---|---|
| GET / POST | `/cnps/dossiers`, `/cnps/dossiers/{id}` |
| POST | `/cnps/dossiers/{id}/pieces` |
| POST | `/cnps/dossiers/{id}/statut` |
| GET | `/cnps/dossiers/{id}/pieces-manquantes` |
| GET | `/cnps/eligibles-non-immatricules` |
| GET / POST | `/cnps/declarations`, `/cnps/declarations/{id}/transmettre` |
| GET | `/cnps/declarations/a-produire?periode=2026-09` |

## 8. Documents

| Méthode | Chemin | Note |
|---|---|---|
| POST | `/documents` | `multipart/form-data`, contrôle de signature binaire |
| GET | `/documents/{id}` | Flux binaire, consultation journalisée |
| GET | `/documents/{id}/metadonnees` | Sans le contenu |
| POST | `/documents/{id}/statut` | Vérification, rejet, archivage |

Aucune URL publique, aucun lien signé permanent. Le contrôle d'accès est fait à chaque téléchargement.

## 9. Comptes rendus et rapport DAF `[A]`

Contrat non confirmé, à valider avant codage. Structure la chaîne hiérarchique terrain (`../Roles des acteurs.md §12.1`, jalon J8) et le flux DAF → PCA (`§12.3`, jalon J5/J10).

| Méthode | Chemin | Note |
|---|---|---|
| POST | `/comptes-rendus` | Agent de terrain → Gestionnaire des comptes |
| GET | `/comptes-rendus` | Filtres : auteur, destinataire, période, statut, périmètre du demandeur |
| POST | `/comptes-rendus/{id}/controler` | Gestionnaire des comptes |
| POST | `/comptes-rendus/consolider` | Corps : liste d'ids sources — Gestionnaire des comptes → DGA |
| POST | `/comptes-rendus/{id}/transmettre` | Rend le compte rendu consolidé visible à la DGA |
| POST | `/daf/rapports` | DAF produit un rapport |
| POST | `/daf/rapports/{id}/transmettre` | DAF → PCA |
| GET | `/daf/rapports` | Lecture réservée `DAF`, `PCA` selon droits |

## 10. Relances, notifications, reporting, administration

| Méthode | Chemin |
|---|---|
| GET / POST | `/relances`, `/relances/{id}/resultat` |
| GET / POST | `/campagnes-relance` |
| GET | `/notifications`, POST `/notifications/{id}/lue` |
| GET | `/tableaux-de-bord/pca` · `/dg` · `/dga` · `/daf` · `/gestionnaire` · `/super-admin` — **6 dashboards exclusivement**, aucun pour le Chef ni l'Agent de terrain |
| POST | `/exports/adherents` · `/exports/paiements` · `/exports/cnps` (asynchrone au-delà du seuil) |
| GET | `/exports/{id}` (état et récupération) |
| GET / POST / PUT | `/administration/utilisateurs`, `/administration/roles`, `/administration/parametres` |
| GET | `/audit` (filtres : entité, entité id, utilisateur, type, période) |
| GET | `/controles-coherence/dernier-rapport` |

`/audit` est en lecture seule : aucune méthode d'écriture ni de purge n'est exposée, quel que soit le rôle.

## 10 bis. Temps réel

| Méthode | Chemin |
|---|---|
| GET | `/temps-reel/flux` — `text/event-stream`, authentifié par l'en-tête `Authorization` (jamais de jeton dans l'URL) |

Événements : `connecte` à l'ouverture, puis `changement` `{domaine, id, adherentId, typeChangement, horodatage}` avec
`domaine` ∈ `adherent`, `agent`, `paiement`, `bilan_caisse`, `workflow`, `adhesion`. Diffusés **après commit**
uniquement, et seulement aux abonnés qui portent une permission de lecture du domaine. Aucun contenu métier : le
client relit la ressource par sa route ordinaire, qui applique permissions et périmètre. Le flux se ferme après
10 minutes (`cositi.temps-reel.duree-flux-ms`) et doit être rouvert avec un jeton valide ; commentaire de battement
toutes les 25 s ; au plus 5 flux par utilisateur (le plus ancien est fermé).

Événement `notification` (V21) : chaque notification déposée (`ServiceNotification`) est poussée **après commit** à
son **seul destinataire**, avec son contenu (`NotificationDto` : `id`, `type`, `titre`, `corps`, `entite`, `entiteId`,
`lue`, `creeLe`) — elle lui appartient. Le client l'affiche aussitôt et ouvre l'écran de l'objet notifié. Un
destinataire nominatif n'est jamais re-notifié par son rôle (`notifierRolesSauf`).

`GET /paiements/{id}/affectations` (V21) : chaque ligne porte aussi `composanteCode` et `composanteLibelle`.

## 11. Santé et exploitation

| Chemin | Accès |
|---|---|
| `/actuator/health/liveness`, `/readiness` | Public en interne uniquement |
| `/actuator/info`, `/metrics`, `/prometheus` | Authentifié, rôle `ADMIN_SYSTEME` |
| Tous les autres endpoints Actuator | Désactivés |

## 12. Limites de débit

| Périmètre | Limite indicative [A] |
|---|---|
| `/auth/connexion` | 5 tentatives / 15 min / identifiant, 20 / 15 min / IP |
| Écriture (`POST`, `PUT`) | 60 / min / utilisateur |
| Lecture | 300 / min / utilisateur |
| Export | 5 / heure / utilisateur |

Dépassement : `429` avec `Retry-After`. Les échecs d'authentification répétés verrouillent temporairement le compte et sont journalisés (`CONNEXION_ECHEC`).
