# Analyse de la plateforme COSITI — Endpoints par module

> Généré le 2026-09-29 par analyse statique du code source (`src/main/java/cm/cositi/api`).
> Base technique : Spring Boot 3.3.3, Java 21, Spring Security (JWT + cookie de rafraîchissement HttpOnly), Spring Data JPA.
> Toutes les routes sont préfixées par `/api/v1`.

## Vue d'ensemble

La plateforme COSITI (COOP-CA, Cameroun) est organisée en **17 modules métier** sous `cm.cositi.api`, chacun suivant globalement le motif `controleur / dto / entite / repository / service`. Un module `commun` porte les briques transverses (réponses paginées, exceptions, validation), et `config`/`securite` portent l'authentification JWT et la configuration Spring Security.

| Module | Contrôleur(s) | Racine(s) de route |
|---|---|---|
| Adhérents | `ControleurAdherent`, `ControleurActivite`, `ControleurPack` | `/adherents`, `/activites`, `/packs` |
| Administration | `ControleurAdministration` | `/administration` |
| Audit | `ControleurAudit` | `/audit` |
| CNPS | `ControleurCnps` | `/cnps` |
| Comptes rendus | `ControleurCompteRendu` | `/comptes-rendus` |
| Cotisation | `ControleurPaiement`, `ControleurRemiseCaisse` | `/paiements`, `/remises-caisse` |
| DAF | `ControleurRapportDaf` | `/daf/rapports` |
| Documents | `ControleurDocument` | `/documents` |
| Droits & régularité | `ControleurDroits` | `/droits` |
| Notifications | `ControleurNotification` | `/notifications` |
| Organisation | `ControleurAgent`, `ControleurPortefeuille`, `ControleurZone` | `/agents`, `/portefeuilles`, `/zones` |
| Relances | `ControleurRelance` | `/relances`, `/campagnes-relance`, `/adherents/{id}/relances` |
| Reporting | `ControleurTableauBord`, `ControleurExport` | `/tableaux-de-bord`, `/exports` |
| Sécurité | `ControleurAuthentification` | `/auth` |

Note de sécurité : la plupart des contrôleurs délèguent le contrôle d'accès (rôles/permissions, périmètre de données) à la couche service via `@AuthenticationPrincipal Utilisateur`. Seul `ControleurAudit` porte une annotation `@PreAuthorize` explicite au niveau du contrôleur.

---

## 1. Module Adhérents (`cm.cositi.api.adherent`)

### `ControleurAdherent` — `/api/v1/adherents`

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| GET | `/adherents` | Recherche paginée d'adhérents | Query : `recherche`, `zoneId`, `activiteId`, `statut`, `packId`, `associationId`, `dateAdhesionDu`, `dateAdhesionAu`, `page`, `taille` (max 200) |
| POST | `/adherents` | Créer un adhérent | Corps : `CreationAdherentDto` — retourne `201 Created` + `Location` |
| POST | `/adherents/verifier-doublon` | Rechercher des doublons potentiels avant création | Corps : `VerifierDoublonDto` (téléphone, CNI, nom complet, zone) |
| GET | `/adherents/{id}` | Consulter le détail d'un adhérent | Path : `id` |
| PUT | `/adherents/{id}` | Modifier un adhérent | Corps : `ModificationAdherentDto` |
| POST | `/adherents/{id}/archiver` | Archiver un adhérent | Corps : `ArchiverDto` (motif) — `204 No Content` |
| POST | `/adherents/{id}/statut` | Changer le statut d'un adhérent | Corps : `ChangerStatutDto` (statut, motif) — `204 No Content` |
| POST | `/adherents/{id}/pack` | Changer le pack de cotisation | Corps : `ChangerPackDto` (packId, date d'effet) |

Gestion d'erreur spécifique : `ExceptionDoublonPotentiel` → réponse `409` avec la liste des candidats doublons.

### `ControleurActivite` — `/api/v1/activites`

| Méthode | Chemin | Description |
|---|---|---|
| GET | `/activites` | Référentiel des activités (lecture seule, 7 lignes fixes, triées par libellé, sans pagination) |

### `ControleurPack` — `/api/v1/packs`

| Méthode | Chemin | Description |
|---|---|---|
| GET | `/packs` | Référentiel des packs de cotisation (lecture seule, tous les packs y compris inactifs, triés par montant journalier) |

---

## 2. Module Administration (`cm.cositi.api.administration`)

### `ControleurAdministration` — `/api/v1/administration`

Aucune route de suppression (un compte se désactive, il ne s'efface pas) ; aucune route de création de rôle (les 8 rôles V1 sont fermés).

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| GET | `/administration/utilisateurs` | Liste paginée des comptes | Query : `recherche`, `actif`, `page`, `taille` |
| GET | `/administration/utilisateurs/{id}` | Détail d'un compte | Path : `id` |
| POST | `/administration/utilisateurs` | Créer un compte utilisateur | Corps : `CreationUtilisateurDto` — retourne le mot de passe initial (une seule fois) |
| PUT | `/administration/utilisateurs/{id}` | Modifier un compte | Corps : `ModificationUtilisateurDto` |
| POST | `/administration/utilisateurs/{id}/activation` | Activer/désactiver un compte | Corps : `ChangementActivationDto` |
| POST | `/administration/utilisateurs/{id}/roles` | Changer les rôles d'un utilisateur | Corps : `ChangementRolesDto` |
| POST | `/administration/utilisateurs/{id}/mot-de-passe/reinitialiser` | Réinitialiser le mot de passe | — retourne un nouveau mot de passe initial |
| GET | `/administration/roles` | Lister les rôles disponibles (référentiel fermé) | — |
| GET | `/administration/parametres` | Lister les paramètres système | — |
| PUT | `/administration/parametres/{cle}` | Modifier un paramètre système | Path : `cle` — Corps : `ModificationParametreDto` |

---

## 3. Module Audit (`cm.cositi.api.audit`)

### `ControleurAudit`

| Méthode | Chemin | Permission | Description | Paramètres |
|---|---|---|---|---|
| GET | `/api/v1/audit` | `AUDIT:CONSULTER` | Journal d'audit paginé, lecture seule (aucune écriture/purge exposée) | Query : `entite`, `entiteId`, `utilisateurId`, `type` (`TypeOperation`), `depuis`, `jusqua` (Instant), `page`, `taille` |

---

## 4. Module CNPS (`cm.cositi.api.cnps`)

### `ControleurCnps` — `/api/v1/cnps`

#### Dossiers

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| GET | `/cnps/dossiers` | Lister les dossiers CNPS (ou consulter par adhérent) | Query : `statut`, `adherentId`, `page`, `taille` |
| POST | `/cnps/dossiers` | Ouvrir un dossier CNPS | Query : `adherentId` — `201 Created` |
| GET | `/cnps/dossiers/{id}` | Consulter un dossier | Path : `id` |
| POST | `/cnps/dossiers/{id}/pieces` | Ajouter une pièce au dossier | Corps : `AjoutPieceDto` (documentId, typePiece) |
| POST | `/cnps/dossiers/{id}/statut` | Changer le statut du dossier | Corps : `ChangementStatutDossierDto` (statut, commentaire) |
| GET | `/cnps/dossiers/{id}/pieces-manquantes` | Lister les pièces manquantes | Path : `id` |
| GET | `/cnps/eligibles-non-immatricules` | Adhérents éligibles CNPS non encore immatriculés | Query : `zoneId` (optionnel) |

#### Déclarations

| Méthode | Chemin | Description | Paramètres |
|---|---|---|---|
| POST | `/cnps/declarations` | Préparer une déclaration pour une période | Query : `dossierId`, `periode` (format `AAAA-MM`) — `201 Created` |
| GET | `/cnps/declarations` | Lister les déclarations d'un dossier | Query : `dossierId` |
| GET | `/cnps/declarations/a-produire` | Déclarations à produire pour une période | Query : `periode` |
| POST | `/cnps/declarations/{id}/transmettre` | Transmettre une déclaration | Path : `id` — Query optionnel : `accuseDocumentId` |

---

## 5. Module Comptes rendus (`cm.cositi.api.compterendu`)

### `ControleurCompteRendu` — `/api/v1/comptes-rendus`

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| GET | `/comptes-rendus` | Lister les comptes rendus | Query : `type` (`TypeCompteRendu`), `statut`, `recus`, `page`, `taille` |
| GET | `/comptes-rendus/{id}` | Consulter un compte rendu | Path : `id` |
| POST | `/comptes-rendus` | Produire un compte rendu | Corps : `CreationCompteRenduDto` — `201 Created` |
| PUT | `/comptes-rendus/{id}` | Modifier un brouillon avant transmission | Corps : `CreationCompteRenduDto` |
| POST | `/comptes-rendus/{id}/transmettre` | Transmettre (destinataire déduit du type) | — |
| POST | `/comptes-rendus/{id}/controler` | Contrôler un compte rendu reçu | Corps optionnel : `ControleCompteRenduDto` (observation) |
| POST | `/comptes-rendus/consolider` | Consolider plusieurs comptes rendus | Corps : `ConsolidationDto` — `201 Created` |

---

## 6. Module Cotisation (`cm.cositi.api.cotisation`)

### `ControleurPaiement` — `/api/v1/paiements`

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| GET | `/paiements` | Journal des paiements | Query : `adherentId`, `statut`, `modePaiement`, `dateDu`, `dateAu`, `page`, `taille` |
| POST | `/paiements` | Enregistrer un paiement | En-tête **obligatoire** `Idempotency-Key` ; Corps : `EnregistrementPaiementDto` — `201` ou `200` si rejoué |
| GET | `/paiements/{id}` | Consulter un paiement | Path : `id` |
| POST | `/paiements/{id}/valider` | Valider un paiement | — |
| POST | `/paiements/{id}/corriger` | Corriger un paiement | Corps : `CorrectionPaiementDto` |
| POST | `/paiements/{id}/annuler` | Annuler un paiement | Corps : `AnnulerPaiementDto` — `204 No Content` |
| POST | `/paiements/{id}/confirmer-chef` | Confirmation par le chef d'agents | Query optionnel : `motif` |
| POST | `/paiements/{id}/signaler-incoherence` | Signaler une incohérence (DAF) | Corps : `SignalerIncoherenceDto` (motif) |
| GET | `/paiements/{id}/recu` | Générer le reçu | Path : `id` |
| GET | `/paiements/{id}/affectations` | Lister les affectations du paiement | Path : `id` |
| POST | `/paiements/{id}/affectations` | Affecter manuellement un paiement | Corps : `AffecterManuelDto` (lignes) |

### `ControleurRemiseCaisse` — `/api/v1/remises-caisse`

| Méthode | Chemin | Description | Corps |
|---|---|---|---|
| POST | `/remises-caisse` | Déclarer une remise de caisse | `DeclarerRemiseCaisseDto` (agentId, paiementIds) — `201 Created` |
| POST | `/remises-caisse/{id}/receptionner` | Réceptionner une remise de caisse | `ReceptionnerRemiseCaisseDto` (montantRecu) |

---

## 7. Module DAF (`cm.cositi.api.daf`)

### `ControleurRapportDaf` — `/api/v1/daf/rapports`

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| GET | `/daf/rapports` | Lister les rapports DAF | Query : `statut`, `page`, `taille` |
| GET | `/daf/rapports/{id}` | Consulter un rapport | Path : `id` |
| POST | `/daf/rapports` | Produire un rapport | Corps : `ProductionRapportDto` — `201 Created` |
| POST | `/daf/rapports/{id}/transmettre` | Transmettre le rapport au PCA | — |

---

## 8. Module Documents (`cm.cositi.api.document`)

### `ControleurDocument` — `/api/v1/documents`

Aucune URL publique ni lien signé permanent : tout accès au contenu passe par `GET /documents/{id}` avec contrôle d'accès et journalisation.

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| POST | `/documents` (multipart) | Téléverser un document | `multipart/form-data` : partie `fichier`, Query : `type` (`TypeDocument`), `adherentId`, `paiementId` — `201 Created` |
| GET | `/documents/{id}` | Télécharger le contenu (binaire, `Cache-Control: no-store`) | Path : `id` |
| GET | `/documents/{id}/metadonnees` | Consulter les métadonnées | Path : `id` |
| POST | `/documents/{id}/statut` | Changer le statut d'un document | Corps : `ChangementStatutDocumentDto` (statut, motif) |
| GET | `/documents` | Lister les documents rattachés à un adhérent ou un paiement (pas de liste globale) | Query : `adherentId` ou `paiementId` |

---

## 9. Module Droits & régularité (`cm.cositi.api.droits`)

### `ControleurDroits` — `/api/v1/droits`

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| GET | `/droits/adherents/{id}` | Situation de droits d'un adhérent à une date | Path : `id` — Query : `au` (défaut : date du jour) |
| GET | `/droits/adherents/{id}/periodes` | Historique des périodes de droits | Path : `id` |
| POST | `/droits/adherents/{id}/recalculer` | Recalculer les droits d'un adhérent | Corps : `RecalculerDroitsDto` (motif) — `204 No Content` |
| GET | `/droits/retardataires` | Liste paginée des adhérents en retard | Query : `zoneId`, `agentId`, `joursRetardMin`, `packId`, `page`, `taille` |

---

## 10. Module Notifications (`cm.cositi.api.notification`)

### `ControleurNotification` — `/api/v1/notifications`

Aucun endpoint de création (une notification résulte toujours d'une opération métier) et aucune permission dédiée : chacun n'accède qu'à ses propres notifications.

| Méthode | Chemin | Description | Paramètres |
|---|---|---|---|
| GET | `/notifications` | Mes notifications | Query : `seulementNonLues`, `page`, `taille` |
| GET | `/notifications/non-lues/compte` | Compter mes notifications non lues | — |
| POST | `/notifications/{id}/lue` | Marquer une notification comme lue | Path : `id` |

---

## 11. Module Organisation (`cm.cositi.api.organisation`)

### `ControleurAgent` — `/api/v1/agents`

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| GET | `/agents` | Lister tous les agents | — |
| GET | `/agents/{id}` | Consulter un agent | Path : `id` |
| POST | `/agents` | Créer un agent (par la DGA) | Corps : `CreationAgentDto` — `201 Created` |
| GET | `/agents/{id}/portefeuille` | Portefeuille d'adhérents d'un agent | Path : `id` |
| GET | `/agents/{id}/charge` | Charge de travail d'un agent sur une période | Query : `periode` (format `YearMonth`) |
| POST | `/agents/{id}/designer-chef` | Désigner un chef d'agents | Corps : `DesignerChefDto` (motif) |
| POST | `/agents/{id}/remplacer-chef` | Remplacer le chef d'agents | Corps : `DesignerChefDto` (motif) |
| GET | `/agents/chef` | Chef courant d'une zone | Query : `zoneId` |
| GET | `/agents/{id}/historique-chef` | Historique des désignations de chef | Path : `id` |

### `ControleurPortefeuille` — `/api/v1/portefeuilles`

| Méthode | Chemin | Description | Corps / Paramètres |
|---|---|---|---|
| POST | `/portefeuilles/affecter` | Affecter un adhérent à un agent | `AffecterPortefeuilleDto` (adherentId, agentId, motif) — `204 No Content` |
| POST | `/portefeuilles/transferer` | Transférer en lot des adhérents vers un nouvel agent | `TransfererPortefeuilleDto` (adherentIds, nouvelAgentId, motif) — `204 No Content` |
| GET | `/portefeuilles/sans-agent` | Adhérents sans agent référent dans une zone | Query : `zoneId` |

### `ControleurZone` — `/api/v1/zones`

| Méthode | Chemin | Description | Corps |
|---|---|---|---|
| GET | `/zones` | Lister les zones | — |
| GET | `/zones/{id}` | Consulter une zone | Path : `id` |
| POST | `/zones` | Créer une zone | `CreationZoneDto` — `201 Created` |
| PUT | `/zones/{id}` | Modifier une zone | `CreationZoneDto` |

---

## 12. Module Relances (`cm.cositi.api.relance`)

### `ControleurRelance` — `/api/v1`

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| GET | `/relances` | Lister les relances | Query : `campagneId`, `page`, `taille` |
| GET | `/adherents/{adherentId}/relances` | Relances d'un adhérent | Path : `adherentId` |
| POST | `/relances` | Enregistrer un contact et son résultat en une seule opération | Corps : `CreationRelanceDto` — `201 Created` |
| GET | `/campagnes-relance` | Lister les campagnes de relance | Query : `statut` (`StatutCampagne`), `page`, `taille` |
| POST | `/campagnes-relance` | Créer une campagne de relance | Corps : `CreationCampagneDto` — `201 Created` |
| POST | `/campagnes-relance/{id}/statut` | Changer le statut d'une campagne | Path : `id` — Query : `statut` |

---

## 13. Module Reporting (`cm.cositi.api.reporting`)

### `ControleurTableauBord` — `/api/v1/tableaux-de-bord`

Exactement six routes, une par rôle destinataire ; chacune porte sa propre permission (accès `403` pour tout autre rôle).

| Méthode | Chemin | Rôle destinataire | Paramètres |
|---|---|---|---|
| GET | `/tableaux-de-bord/pca` | PCA | Query : `du`, `au`, `zoneId` |
| GET | `/tableaux-de-bord/dg` | DG | Query : `du`, `au`, `zoneId` |
| GET | `/tableaux-de-bord/dga` | DGA | Query : `du`, `au`, `zoneId` |
| GET | `/tableaux-de-bord/daf` | DAF | Query : `du`, `au`, `zoneId` |
| GET | `/tableaux-de-bord/gestionnaire` | Gestionnaire | Query : `du`, `au`, `zoneId` |
| GET | `/tableaux-de-bord/super-admin` | Super admin | Query : `du`, `au` |

### `ControleurExport` — `/api/v1/exports`

Export **synchrone** (retourne directement le fichier CSV, encodé UTF-8 avec BOM, séparateur `;`) ; refusé au-delà d'un seuil de lignes (`EXPORT_SEUIL_LIGNES`). Fichier produit en mémoire, jamais écrit sur disque.

| Méthode | Chemin | Description | Paramètres |
|---|---|---|---|
| POST | `/exports/adherents` | Exporter les adhérents en CSV | Query : `zoneId`, `statut` |
| POST | `/exports/paiements` | Exporter les paiements en CSV | Query : `du`, `au` (ISO date), `statut` |
| POST | `/exports/cnps` | Exporter les dossiers CNPS en CSV | Query : `statut` |

---

## 14. Module Sécurité (`cm.cositi.api.securite`)

### `ControleurAuthentification` — `/api/v1/auth`

Le jeton d'accès est renvoyé en JSON ; le jeton de rafraîchissement ne transite **jamais** en JSON — il est posé/lu exclusivement via un cookie `HttpOnly`, `Secure`, `SameSite=Strict`, scope `/api/v1/auth`.

| Méthode | Chemin | Description | Paramètres / Corps |
|---|---|---|---|
| POST | `/auth/connexion` | Authentification (login/mot de passe) | Corps : `ConnexionDto` (identifiant, motDePasse) — pose le cookie de rafraîchissement |
| POST | `/auth/rafraichir` | Rafraîchir le jeton d'accès | Cookie : `jetonRafraichissement` |
| POST | `/auth/deconnexion` | Déconnexion, révocation de session | Cookie : `jetonRafraichissement` — `204 No Content`, expire le cookie |
| POST | `/auth/mot-de-passe/changer` | Changer son mot de passe | Corps : `ChangerMotDePasseDto` — révoque toutes les sessions, `204 No Content` |
| GET | `/auth/moi` | Profil de l'utilisateur connecté | — |

---

## Résumé chiffré

- **17 modules métier**, **20 contrôleurs**, **~90 endpoints REST**.
- Conventions constantes observées dans le code :
  - Pagination : `page` (défaut 0), `taille` (défaut 25, plafonné à 200), réponse `ReponsePaginee<T>`.
  - Corps facultatif jamais utilisé pour les actions sans données (`@RequestBody(required = false)` évité) : un paramètre de requête optionnel est préféré, car un corps JSON optionnel provoque une erreur 500 dès qu'un client fixe un `Content-Type` sans envoyer de corps.
  - Idempotence : `POST /paiements` exige l'en-tête `Idempotency-Key`.
  - Aucune suppression physique de données sensibles (comptes, adhérents) : uniquement des changements de statut/archivage.
