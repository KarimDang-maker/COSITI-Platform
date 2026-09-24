# COSITI — CHECKLIST BACKEND & FRONTEND
## Gestionnaire des comptes — Dossiers CNPS / PVID / Risques professionnels — V2

**Document :** `FONCTIONALITE_GestComtes_V2_BACK_FRONT_CHECKLIST.md`  
**Périmètre :** Gestionnaire des comptes COSITI uniquement  
**Modules :** Dossiers CNPS, PVID, Risques professionnels  
**Objectif :** transformer les maquettes fournies en fonctionnalités réellement développées, sécurisées, persistées et auditées.

---

# 1. RÈGLE FONDAMENTALE

Toutes les actions réalisées dans COSITI doivent être traçables lorsqu'elles constituent une opération métier, documentaire, financière, administrative ou de consult ation sensible.

Le frontend ne doit jamais être l'autorité de sécurité.

```text
Utilisateur
   ↓
Frontend — affichage selon permissions
   ↓
API REST /api/v1
   ↓
Spring Security / RBAC
   ↓
Service métier
   ↓
Transaction / PostgreSQL
   ↓
Audit
```

Une permission affichée dans le frontend n'accorde aucun droit supplémentaire.

Une action interdite doit être refusée par le backend même si un utilisateur appelle directement l'endpoint.

---

# 2. PÉRIMÈTRE DU GESTIONNAIRE

Le Gestionnaire des comptes doit pouvoir, selon ses permissions effectives :

- consulter les dossiers CNPS de son périmètre ;
- consulter les rubriques CNPS ;
- consulter les offres PVID et Risques professionnels ;
- rechercher les dossiers ;
- filtrer les dossiers ;
- consulter les pièces attendues ;
- consulter les pièces reçues ;
- identifier les pièces manquantes ;
- consulter le statut du dossier ;
- suivre les dates de dépôt et de transmission ;
- suivre les relances ;
- consulter les observations autorisées ;
- constituer/compléter un dossier lorsque le contrat et les permissions l'autorisent ;
- ajouter une pièce lorsque le contrat et les permissions l'autorisent ;
- changer un statut uniquement si cette transition lui est autorisée ;
- transmettre un dossier uniquement si cette action lui est autorisée ;
- exporter les données CNPS uniquement si la permission correspondante existe.

**Important :** les maquettes montrent parfois des éléments en lecture seule. Elles ne doivent pas être interprétées comme une autorisation d'écriture.

---

# 3. LÉGENDE DU DOCUMENT

| Marqueur | Signification |
|---|---|
| ✅ CONTRACTÉ | Endpoint déjà présent dans `03_SPECIFICATIONS_API.md` |
| ⚠️ À VALIDER | Besoin fonctionnel identifié mais contrat API incomplet/ambigu |
| ❌ À SPÉCIFIER | Aucun endpoint existant dans le contrat fourni |
| FRONT | Travail frontend |
| BACK | Travail backend |
| AUDIT | Journalisation obligatoire à prévoir/valider |
| TEST | Test automatisé ou recette à réaliser |

**Règle :** aucun endpoint marqué ⚠️ ou ❌ ne doit être inventé par le développeur sans validation du contrat API.

---

# 4. RÉFÉRENCE API EXISTANTE

Base API :

```text
/api/v1
```

Documentation :

```text
/api/v1/openapi
```

Les endpoints CNPS actuellement contractés sont :

| Méthode | Endpoint | Fonction |
|---|---|---|
| GET | `/cnps/dossiers` | Lister les dossiers |
| POST | `/cnps/dossiers` | Créer un dossier |
| GET | `/cnps/dossiers/{id}` | Consulter un dossier |
| POST | `/cnps/dossiers/{id}/pieces` | Ajouter une pièce |
| POST | `/cnps/dossiers/{id}/statut` | Changer le statut |
| GET | `/cnps/dossiers/{id}/pieces-manquantes` | Lister les pièces manquantes |
| GET | `/cnps/eligibles-non-immatricules` | Identifier les éligibles |
| GET | `/cnps/declarations` | Lister les déclarations |
| POST | `/cnps/declarations` | Créer une déclaration |
| POST | `/cnps/declarations/{id}/transmettre` | Transmettre une déclaration |
| GET | `/cnps/declarations/a-produire?periode=YYYY-MM` | Déclarations à produire |
| POST | `/documents` | Stocker un document |
| GET | `/documents/{id}` | Lire un document |
| GET | `/documents/{id}/metadonnees` | Lire ses métadonnées |
| POST | `/documents/{id}/statut` | Changer le statut documentaire |
| GET | `/relances` | Lister les relances |
| POST | `/relances` | Créer une relance |
| POST | `/relances/{id}/resultat` | Enregistrer le résultat |
| GET | `/notifications` | Consulter les notifications |
| POST | `/notifications/{id}/lue` | Marquer une notification lue |
| GET | `/tableaux-de-bord/cnps` | Données du dashboard CNPS |
| POST | `/exports/cnps` | Générer un export CNPS |
| GET | `/exports/{id}` | Suivre/récupérer un export |
| GET | `/audit` | Consulter le journal d'audit |

---

# 5. MATRICE GLOBALE DES FONCTIONNALITÉS À DÉVELOPPER

| ID | Fonctionnalité | Endpoint principal | Backend | Frontend | Audit |
|---|---|---|---|---|---|
| CNPS-01 | Dashboard CNPS | `GET /tableaux-de-bord/cnps` | ☐ | ☐ | Consultation sensible |
| CNPS-02 | Liste dossiers | `GET /cnps/dossiers` | ☐ | ☐ | ☐ |
| CNPS-03 | Recherche dossier | `GET /cnps/dossiers` avec filtres | ☐ | ☐ | ☐ |
| CNPS-04 | Filtres | `GET /cnps/dossiers` avec paramètres | ☐ | ☐ | ☐ |
| CNPS-05 | Consultation dossier | `GET /cnps/dossiers/{id}` | ☐ | ☐ | AUDIT |
| CNPS-06 | Pièces manquantes | `GET /cnps/dossiers/{id}/pieces-manquantes` | ☐ | ☐ | AUDIT consultation |
| CNPS-07 | Ajout pièce | `POST /cnps/dossiers/{id}/pieces` | ☐ | ☐ | AUDIT |
| CNPS-08 | Stockage document | `POST /documents` | ☐ | ☐ | AUDIT |
| CNPS-09 | Consultation document | `GET /documents/{id}` | ☐ | ☐ | AUDIT |
| CNPS-10 | Statut pièce | `POST /documents/{id}/statut` | ☐ | ☐ | AUDIT |
| CNPS-11 | Statut dossier | `POST /cnps/dossiers/{id}/statut` | ☐ | ☐ | AUDIT |
| CNPS-12 | Création dossier | `POST /cnps/dossiers` | ☐ | ☐ | AUDIT |
| CNPS-13 | Déclaration CNPS | `/cnps/declarations` | ☐ | ☐ | AUDIT |
| CNPS-14 | Transmission | `POST /cnps/declarations/{id}/transmettre` | ☐ | ☐ | AUDIT |
| CNPS-15 | Relance | `/relances` | ☐ | ☐ | AUDIT |
| CNPS-16 | Journal dossier | `GET /audit` filtré | ☐ | ☐ | AUDIT |
| CNPS-17 | Export Excel | `POST /exports/cnps` | ☐ | ☐ | AUDIT |
| PVID-01 | Rubrique PVID | dashboard CNPS / API à valider | ☐ | ☐ | ☐ |
| PVID-02 | Toutes les offres | API à valider | ⚠️ | ☐ | ☐ |
| PVID-03 | Pension vieillesse | API à valider | ⚠️ | ☐ | ☐ |
| PVID-04 | Allocation unique vieillesse | API à valider | ⚠️ | ☐ | ☐ |
| PVID-05 | Invalidité prématurée | API à valider | ⚠️ | ☐ | ☐ |
| PVID-06 | Réversion/capital décès | API à valider | ⚠️ | ☐ | ☐ |
| RP-01 | Rubrique RP | dashboard CNPS / API à valider | ☐ | ☐ | ☐ |
| RP-02 | Toutes les offres | API à valider | ⚠️ | ☐ | ☐ |
| RP-03 | Accident travail/trajet | API à valider | ⚠️ | ☐ | ☐ |
| RP-04 | Maladie professionnelle | API à valider | ⚠️ | ☐ | ☐ |
| RP-05 | Soins médicaux | API à valider | ⚠️ | ☐ | ☐ |
| RP-06 | Rente incapacité/survivants | API à valider | ⚠️ | ☐ | ☐ |

---

# 6. FONCTIONNALITÉ CNPS-01 — DASHBOARD CNPS

## Objectif

Afficher les indicateurs du Gestionnaire :

- nombre de dossiers Prestations Familiales ;
- nombre de dossiers Risques Professionnels ;
- nombre de dossiers PVID ;
- total global ;
- éventuellement répartition par offre ;
- indicateurs de complétude documentaire si exposés par le backend.

## Endpoint

```http
GET /api/v1/tableaux-de-bord/cnps
```

**Statut : ✅ CONTRACTÉ**

## Backend — méthodes métier

Responsabilité recommandée :

```text
calculerIndicateursCnps()
chargerDashboardCnps()
calculerRepartitionParRubrique()
calculerRepartitionParOffre()
```

Ne pas recalculer les KPI métier uniquement dans React.

## Frontend

- créer `CnpsDashboard` ;
- charger les données avec TanStack Query ;
- afficher les quatre cartes ;
- gérer loading/error/empty ;
- cliquer sur une carte pour modifier les critères de liste ;
- invalider/recharger après mutation CNPS.

## Audit

La consultation du dashboard peut être auditée si COSITI classe cette donnée comme consultation sensible.

Ne pas générer un événement d'audit pour chaque rendu React.

L'événement doit correspondre à une vraie requête/consultation métier côté serveur lorsque la politique d'audit l'exige.

---

# 7. CNPS-02 — LISTE DES DOSSIERS

## Endpoint

```http
GET /api/v1/cnps/dossiers
```

**Statut : ✅ CONTRACTÉ**

## Paramètres à utiliser

Le contrat détaillé des filtres CNPS n'est pas entièrement défini dans le fichier API.

Le frontend doit utiliser uniquement les paramètres réellement présents dans OpenAPI.

Besoins fonctionnels observés :

```text
rubrique
offre
statut
recherche
certificatScolarite
page
taille
tri
```

**Attention :** les noms exacts de paramètres doivent être récupérés dans `/api/v1/openapi`. Ne pas inventer les noms côté frontend.

## Backend

Méthodes métier :

```text
listerDossiersCnps()
rechercherDossiersCnps()
filtrerDossiersCnps()
appliquerPerimetreGestionnaire()
```

Repository :

```text
findDossiersAvecFiltres(...)
```

## Contrôles

Le backend doit vérifier :

- utilisateur authentifié ;
- rôle/permissions ;
- périmètre de données ;
- pagination maximale 200 ;
- filtres autorisés ;
- absence d'accès à des données hors périmètre.

---

# 8. CNPS-03 — RECHERCHE PAR MATRICULE / ADHÉRENT / N° CNPS

## Endpoint

```http
GET /api/v1/cnps/dossiers
```

**Statut : ⚠️ PARAMÈTRE À CONFIRMER**

La maquette montre :

```text
Rechercher par Matricule, Adhérent, N° CNPS...
```

Le contrat fourni ne précise pas explicitement le paramètre de recherche de `/cnps/dossiers`.

## Backend

```text
rechercherDossiersCnps(String recherche, CriteresCnps criteres)
```

La recherche doit être faite côté backend.

Ne pas charger tous les dossiers puis filtrer avec JavaScript.

## Frontend

- champ de recherche ;
- debounce raisonnable ;
- query TanStack Query ;
- conservation des autres filtres ;
- reset propre ;
- pagination cohérente.

---

# 9. CNPS-04 — FILTRAGE PAR RUBRIQUE ET OFFRE

## Besoin

Permettre :

```text
Tous les dossiers
   ↓
PVID
   ↓
Offre PVID
```

ou :

```text
Tous les dossiers
   ↓
Risques professionnels
   ↓
Offre RP
```

## API

Le endpoint source reste :

```http
GET /api/v1/cnps/dossiers
```

Mais les paramètres exacts rubrique/offre ne sont pas définis dans le contrat fourni.

**Statut : ⚠️ À VALIDER**

## Backend

Ne pas créer immédiatement plusieurs endpoints :

```text
/cnps/dossiers/pvid
/cnps/dossiers/rp
```

Le contrat actuel privilégie un endpoint de collection filtrable.

Méthodes :

```text
filtrerParRubrique()
filtrerParOffre()
```

---

# 10. PVID — MODÈLE FONCTIONNEL

Les maquettes fournissent quatre offres individuelles et une vue « Toutes les offres ».

## Offres observées

1. Pension de Vieillesse Normale
2. Allocation Unique de Vieillesse
3. Pension d'Invalidité Prématurée
4. Pension de Réversion & Capital Décès

## Attention

Les maquettes donnent les libellés, descriptions, délais et pièces.

Le contrat API fourni ne définit pas encore explicitement un endpoint de catalogue :

```text
GET /cnps/rubriques
GET /cnps/offres
```

Ces endpoints ne doivent donc pas être inventés.

**Décision à prendre :**

- soit les offres/rubriques sont un référentiel métier renvoyé par `/tableaux-de-bord/cnps` ;
- soit elles doivent être ajoutées au contrat API ;
- soit elles sont gérées dans un référentiel backend existant à identifier.

---

# 11. PVID-01 — PENSION DE VIEILLESSE NORMALE

## Fonction

Afficher :

- nom ;
- description ;
- nombre de dossiers ;
- délai ;
- mode de calcul ;
- pièces requises ;
- dossiers correspondants.

## Dossiers

```http
GET /api/v1/cnps/dossiers
```

avec filtre d'offre lorsque le contrat le permet.

## Détail d'un dossier

```http
GET /api/v1/cnps/dossiers/{id}
```

## Pièces manquantes

```http
GET /api/v1/cnps/dossiers/{id}/pieces-manquantes
```

## Backend

```text
chargerDossiersPensionVieillesse()
chargerPiecesRequises()
identifierPiecesManquantes()
```

Les règles de calcul de pension ne doivent pas être implémentées dans le frontend.

---

# 12. PVID-02 — ALLOCATION UNIQUE DE VIEILLESSE

Même architecture :

```http
GET /cnps/dossiers
GET /cnps/dossiers/{id}
GET /cnps/dossiers/{id}/pieces-manquantes
```

## Backend

```text
chargerDossiersAllocationUnique()
identifierPiecesManquantes()
```

Les informations de la maquette telles que le délai de 30 jours et le mode de versement doivent être considérées comme des données/règles métier à valider avant de devenir des constantes frontend.

---

# 13. PVID-03 — PENSION D'INVALIDITÉ PRÉMATURÉE

Endpoints contractés utilisables :

```http
GET /cnps/dossiers
GET /cnps/dossiers/{id}
GET /cnps/dossiers/{id}/pieces-manquantes
POST /cnps/dossiers/{id}/pieces
```

## Backend

```text
chargerDossiersInvalidite()
identifierPiecesManquantes()
ajouterPieceDossier()
```

Le rapport médical et les documents sensibles doivent être protégés par les contrôles de permission et de confidentialité applicables.

---

# 14. PVID-04 — RÉVERSION & CAPITAL DÉCÈS

Endpoints :

```http
GET /cnps/dossiers
GET /cnps/dossiers/{id}
GET /cnps/dossiers/{id}/pieces-manquantes
POST /cnps/dossiers/{id}/pieces
```

## Audit obligatoire pour les actions sensibles

Exemples :

```text
DOSSIER_CNPS_CONSULTE
PIECE_CNPS_AJOUTEE
DOCUMENT_CONSULTE
STATUT_DOSSIER_MODIFIE
```

Les codes exacts d'événements doivent être centralisés dans le backend.

---

# 15. RISQUES PROFESSIONNELS — MODÈLE

Offres observées :

1. Accident du Travail & Trajet
2. Maladie Professionnelle
3. Prise en Charge des Soins Médicaux, Pharmaceutiques & Prothèses
4. Rente d'Incapacité Permanente ou de Survivants
5. Toutes les offres

Même principe :

```text
Rubrique RP
   ↓
Offre
   ↓
Détail offre
   ↓
Pièces requises
   ↓
Liste dossiers
   ↓
Dossier
```

---

# 16. RP-01 — ACCIDENT DU TRAVAIL & TRAJET

Endpoints contractés :

```http
GET /cnps/dossiers
GET /cnps/dossiers/{id}
GET /cnps/dossiers/{id}/pieces-manquantes
POST /cnps/dossiers/{id}/pieces
```

Documents :

```http
POST /documents
GET /documents/{id}
GET /documents/{id}/metadonnees
POST /documents/{id}/statut
```

## Backend

```text
chargerDossiersAccidentTravail()
ajouterPieceDossier()
verifierPiecesAccident()
```

---

# 17. RP-02 — MALADIE PROFESSIONNELLE

Endpoints :

```http
GET /cnps/dossiers
GET /cnps/dossiers/{id}
GET /cnps/dossiers/{id}/pieces-manquantes
POST /cnps/dossiers/{id}/pieces
```

Backend :

```text
chargerDossiersMaladieProfessionnelle()
verifierPiecesMaladieProfessionnelle()
```

---

# 18. RP-03 — SOINS MÉDICAUX / PHARMACEUTIQUES / PROTHÈSES

Endpoints :

```http
GET /cnps/dossiers
GET /cnps/dossiers/{id}
GET /cnps/dossiers/{id}/pieces-manquantes
POST /cnps/dossiers/{id}/pieces
```

Documents :

```http
POST /documents
GET /documents/{id}
GET /documents/{id}/metadonnees
POST /documents/{id}/statut
```

Backend :

```text
chargerDossiersSoins()
verifierJustificatifs()
ajouterPieceDossier()
```

---

# 19. RP-04 — RENTE D'INCAPACITÉ PERMANENTE / SURVIVANTS

Endpoints :

```http
GET /cnps/dossiers
GET /cnps/dossiers/{id}
GET /cnps/dossiers/{id}/pieces-manquantes
POST /cnps/dossiers/{id}/pieces
```

Backend :

```text
chargerDossiersRente()
verifierPiecesRente()
```

Toute règle de calcul du taux d'incapacité doit rester côté backend et ne doit pas être déduite par le frontend.

---

# 20. CNPS-05 — CONSULTATION D'UN DOSSIER

## Endpoint

```http
GET /api/v1/cnps/dossiers/{id}
```

**Statut : ✅ CONTRACTÉ**

## Backend

```text
chargerDossierCnps(UUID id)
verifierAccesDossier(UUID id, Utilisateur utilisateur)
```

## Frontend

Composant :

```text
CnpsDossierDetails
```

Sections :

```text
Identité
Rubrique
Offre
Statut
Pièces
Dates
Observations
Relances
Journal
```

---

# 21. CNPS-06 — PIÈCES MANQUANTES

## Endpoint

```http
GET /api/v1/cnps/dossiers/{id}/pieces-manquantes
```

**Statut : ✅ CONTRACTÉ**

## Backend

```text
identifierPiecesManquantes(UUID dossierId)
```

Le calcul doit comparer :

```text
Pièces requises par l'offre
        VS
Pièces réellement reçues/valides
```

Le frontend ne doit pas maintenir sa propre liste de pièces obligatoires si celle-ci est métier et susceptible d'évoluer.

---

# 22. CNPS-07 — AJOUT D'UNE PIÈCE AU DOSSIER

## Endpoint

```http
POST /api/v1/cnps/dossiers/{id}/pieces
```

**Statut : ✅ CONTRACTÉ**

## Backend

```text
ajouterPieceDossier(...)
verifierTypePiece(...)
verifierPermission(...)
associerDocumentAuDossier(...)
journaliserAjoutPiece(...)
```

## Contrôles

- permission Gestionnaire ;
- dossier accessible ;
- type de pièce autorisé ;
- taille ;
- type MIME ;
- signature binaire ;
- antivirus si prévu par l'infrastructure ;
- transaction cohérente ;
- audit.

---

# 23. CNPS-08 — STOCKAGE SÉCURISÉ DU DOCUMENT

## Endpoint

```http
POST /api/v1/documents
```

**Statut : ✅ CONTRACTÉ**

Format :

```text
multipart/form-data
```

## Règles

Aucune URL publique.

Aucun stockage d'un document métier dans :

```text
localStorage
sessionStorage
```

Le téléchargement passe par :

```http
GET /documents/{id}
```

et reste soumis à l'autorisation.

---

# 24. CNPS-09 — CONSULTATION D'UNE PIÈCE

## Endpoint

```http
GET /api/v1/documents/{id}
```

**Statut : ✅ CONTRACTÉ**

La spécification API précise que la consultation est journalisée.

## Backend

```text
lireDocument(UUID id)
verifierAccesDocument(...)
journaliserConsultationDocument(...)
```

## Audit

Exemple :

```text
DOCUMENT_CONSULTE
```

avec :

- utilisateur ;
- document ;
- dossier ;
- date/heure ;
- résultat ;
- trace/corrélation.

---

# 25. CNPS-10 — STATUT D'UNE PIÈCE

## Endpoint

```http
POST /api/v1/documents/{id}/statut
```

**Statut : ✅ CONTRACTÉ**

Exemples de responsabilités métier :

```text
changerStatutDocument()
verifierTransitionStatutDocument()
```

Les valeurs exactes des statuts doivent provenir du modèle backend/OpenAPI.

---

# 26. CNPS-11 — STATUT DU DOSSIER

## Endpoint

```http
POST /api/v1/cnps/dossiers/{id}/statut
```

**Statut : ✅ CONTRACTÉ**

## Backend

```text
changerStatutDossier()
verifierTransitionStatutDossier()
```

## Audit

Obligatoire.

L'événement doit contenir au minimum :

- utilisateur ;
- dossier ;
- statut précédent ;
- nouveau statut ;
- date/heure ;
- motif si requis ;
- résultat.

---

# 27. CNPS-12 — CRÉATION D'UN DOSSIER

## Endpoint

```http
POST /api/v1/cnps/dossiers
```

**Statut : ✅ CONTRACTÉ**

Mais la permission exacte du Gestionnaire doit être confirmée par la matrice RBAC.

## Backend

```text
creerDossierCnps()
verifierDossierEligible()
initialiserPiecesRequises()
journaliserCreationDossier()
```

## Audit

```text
DOSSIER_CNPS_CREE
```

---

# 28. CNPS-13 — DÉCLARATION CNPS

## Endpoints

```http
GET /api/v1/cnps/declarations
POST /api/v1/cnps/declarations
```

**Statut : ✅ CONTRACTÉ**

## Backend

```text
listerDeclarations()
creerDeclaration()
```

La relation entre `dossier`, `declaration` et `transmission` doit être respectée.

---

# 29. CNPS-14 — TRANSMISSION À LA CNPS

## Endpoint

```http
POST /api/v1/cnps/declarations/{id}/transmettre
```

**Statut : ✅ CONTRACTÉ**

## Backend

```text
transmettreDeclaration()
verifierDeclarationTransmissible()
journaliserTransmission()
```

## Audit

```text
DECLARATION_CNPS_TRANSMISE
```

La date de transmission doit provenir du serveur.

---

# 30. CNPS-15 — RELANCES

## Endpoints

```http
GET /api/v1/relances
POST /api/v1/relances
POST /api/v1/relances/{id}/resultat
```

**Statut : ✅ CONTRACTÉ**

## Backend

```text
creerRelance()
listerRelances()
enregistrerResultatRelance()
```

Le résultat d'une relance doit être structuré et non uniquement du texte libre.

---

# 31. CNPS-16 — JOURNAL D'ACTIVITÉ D'UN DOSSIER

La maquette affiche un journal directement dans le dossier.

Le contrat API fourni ne contient pas :

```http
GET /cnps/dossiers/{id}/journal
```

Il contient en revanche :

```http
GET /audit
```

avec filtres :

- entité ;
- entité id ;
- utilisateur ;
- type ;
- période.

## Décision recommandée à valider

Utiliser :

```http
GET /api/v1/audit
```

avec :

```text
entité = DOSSIER_CNPS
entitéId = {id}
```

si ce filtre est effectivement supporté par OpenAPI.

**Statut : ⚠️ À CONFIRMER**

Ne pas créer un endpoint de journal dédié tant que l'équipe n'a pas décidé si `/audit` constitue la source officielle du journal d'activité.

---

# 32. AUDIT — ÉVÉNEMENTS À PRÉVOIR POUR CE MODULE

La journalisation doit être faite côté backend.

## Création

```text
DOSSIER_CNPS_CREE
```

## Consultation sensible

```text
DOSSIER_CNPS_CONSULTE
DOCUMENT_CONSULTE
```

## Documents

```text
PIECE_CNPS_AJOUTEE
DOCUMENT_STATUT_MODIFIE
```

## Dossier

```text
STATUT_DOSSIER_CNPS_MODIFIE
```

## Déclaration

```text
DECLARATION_CNPS_CREEE
DECLARATION_CNPS_TRANSMISE
```

## Relance

```text
RELANCE_CNPS_CREEE
RESULTAT_RELANCE_CNPS_ENREGISTRE
```

## Export

```text
EXPORT_CNPS_GENERE
```

**Ces codes sont proposés comme nomenclature fonctionnelle. Ils doivent être alignés avec le catalogue d'événements d'audit déjà présent dans COSITI avant implémentation.**

---

# 33. STRUCTURE MINIMALE D'UN ÉVÉNEMENT D'AUDIT

Pour une action métier sensible, conserver au minimum :

```text
id
dateHeure
utilisateurId
utilisateurNom / référence
role
action/type
entite
entiteId
resultat
adresse IP si politique validée
X-Trace-Id / correlationId
ancienEtat si modification
nouvelEtat si modification
motif si requis
```

Ne pas journaliser inutilement des données personnelles ou le contenu brut d'un document.

---

# 34. EXPORT EXCEL

## Endpoint

```http
POST /api/v1/exports/cnps
```

**Statut : ✅ CONTRACTÉ**

Puis :

```http
GET /api/v1/exports/{id}
```

## Backend

```text
genererExportCnps()
suivreExport()
```

## Audit

L'export doit être journalisé avec :

- utilisateur ;
- rôle ;
- type d'export ;
- filtres ;
- date/heure ;
- résultat ;
- identifiant d'export.

---

# 35. RÈGLE DE VISIBILITÉ DU GESTIONNAIRE

Le Gestionnaire ne doit pas recevoir de données appartenant à des périmètres auxquels il n'a pas accès.

Cela doit être contrôlé :

```text
Controller
   ↓
Service
   ↓
Permission
   ↓
Périmètre
   ↓
Repository query
```

Le frontend ne doit pas recevoir la totalité des dossiers pour ensuite cacher certaines lignes.

---

# 36. CHECKLIST BACKEND — SOCLE

## Sécurité

- [ ] Authentification active.
- [ ] `GET /auth/moi` renvoie les permissions effectives.
- [ ] Permission CNPS vérifiée côté backend.
- [ ] Périmètre du Gestionnaire vérifié côté backend.
- [ ] Aucun accès direct possible par simple manipulation de l'URL.
- [ ] Aucun document public.
- [ ] Téléchargement document contrôlé.
- [ ] Audit activé.
- [ ] `X-Trace-Id` propagé.
- [ ] Erreurs métier en français.
- [ ] Pagination limitée à 200.

## Données

- [ ] Dossier CNPS persisté PostgreSQL.
- [ ] Rubrique persistée ou référentiel backend clairement défini.
- [ ] Offre persistée ou référentiel backend clairement défini.
- [ ] Pièces liées au dossier.
- [ ] Documents liés de façon sécurisée.
- [ ] Statut dossier persisté.
- [ ] Date dépôt persistée.
- [ ] Date transmission persistée.
- [ ] Relances persistées.
- [ ] Observations persistées si le contrat les prévoit.

---

# 37. CHECKLIST BACKEND — DOSSIERS CNPS

- [ ] `GET /cnps/dossiers`
- [ ] Pagination
- [ ] Recherche
- [ ] Filtre rubrique
- [ ] Filtre offre
- [ ] Filtre statut
- [ ] Filtre pièces/certificats si contracté
- [ ] Tri
- [ ] Périmètre Gestionnaire
- [ ] `GET /cnps/dossiers/{id}`
- [ ] `POST /cnps/dossiers`
- [ ] `POST /cnps/dossiers/{id}/pieces`
- [ ] `GET /cnps/dossiers/{id}/pieces-manquantes`
- [ ] `POST /cnps/dossiers/{id}/statut`
- [ ] Tests 200/400/403/404/409
- [ ] Tests de concurrence si nécessaire
- [ ] Audit des mutations

---

# 38. CHECKLIST BACKEND — DOCUMENTS

- [ ] `POST /documents`
- [ ] Validation multipart
- [ ] Validation taille
- [ ] Validation type
- [ ] Contrôle signature binaire
- [ ] Stockage sécurisé
- [ ] Association au dossier
- [ ] `GET /documents/{id}`
- [ ] `GET /documents/{id}/metadonnees`
- [ ] Contrôle d'accès à chaque lecture
- [ ] `POST /documents/{id}/statut`
- [ ] Audit consultation
- [ ] Audit modification de statut
- [ ] Aucun lien public permanent

---

# 39. CHECKLIST BACKEND — DÉCLARATIONS / TRANSMISSION

- [ ] `GET /cnps/declarations`
- [ ] `POST /cnps/declarations`
- [ ] `POST /cnps/declarations/{id}/transmettre`
- [ ] Validation de l'état préalable
- [ ] Validation de la complétude si nécessaire
- [ ] Date de transmission serveur
- [ ] Audit création
- [ ] Audit transmission
- [ ] Test de double transmission
- [ ] Test permission

---

# 40. CHECKLIST BACKEND — RELANCES

- [ ] `GET /relances`
- [ ] `POST /relances`
- [ ] `POST /relances/{id}/resultat`
- [ ] Relance liée au dossier/adhérent
- [ ] Date de relance
- [ ] Résultat structuré
- [ ] Prochaine action si applicable
- [ ] Audit création
- [ ] Audit résultat
- [ ] Notification si règle métier applicable

---

# 41. CHECKLIST BACKEND — AUDIT

- [ ] Identifier toutes les opérations CNPS sensibles.
- [ ] Définir les codes d'événement.
- [ ] Implémenter l'audit dans le service métier.
- [ ] Ne pas dépendre d'un appel frontend pour journaliser.
- [ ] Enregistrer l'utilisateur.
- [ ] Enregistrer le rôle.
- [ ] Enregistrer l'entité.
- [ ] Enregistrer l'identifiant de l'entité.
- [ ] Enregistrer date/heure serveur.
- [ ] Enregistrer résultat.
- [ ] Enregistrer ancien/nouvel état pour les changements.
- [ ] Enregistrer motif lorsque requis.
- [ ] Conserver `X-Trace-Id`.
- [ ] Vérifier que l'audit est transactionnel avec la mutation lorsque requis.
- [ ] Tester qu'une action réalisée directement via HTTP est quand même auditée.
- [ ] Aucun endpoint de suppression/purge de l'audit.

---

# 42. CHECKLIST FRONTEND — STRUCTURE

Créer/identifier les composants :

- [ ] `CnpsDashboard`
- [ ] `CnpsCategoryCard`
- [ ] `CnpsCategorySection`
- [ ] `CnpsOfferCard`
- [ ] `CnpsOfferDetails`
- [ ] `CnpsSearchFilters`
- [ ] `CnpsDossierTable`
- [ ] `CnpsDossierDetails`
- [ ] `CnpsDocumentChecklist`
- [ ] `CnpsFollowUpPanel`
- [ ] `CnpsActivityJournal`
- [ ] `CnpsEmptyState`
- [ ] `CnpsExportButton`

Ne pas dupliquer quatre fois le même composant pour les offres PVID/RP.

---

# 43. CHECKLIST FRONTEND — ROUTING

- [ ] Route Dossiers CNPS accessible au Gestionnaire.
- [ ] Route protégée.
- [ ] Permission vérifiée avant affichage.
- [ ] Sidebar conforme au rôle.
- [ ] Aucun menu DAF/DGA/DG/PCA visible dans le contexte Gestionnaire.
- [ ] Aucun accès à une route interdite simplement par URL.
- [ ] Les guards frontend restent une couche UX et non une couche de sécurité.

---

# 44. CHECKLIST FRONTEND — DASHBOARD CNPS

- [ ] Charger `/tableaux-de-bord/cnps`.
- [ ] Afficher Prestations Familiales.
- [ ] Afficher Risques Professionnels.
- [ ] Afficher PVID.
- [ ] Afficher Tous les dossiers.
- [ ] Afficher les compteurs backend.
- [ ] État actif visuel.
- [ ] Sélection d'une rubrique.
- [ ] Sélection d'une offre.
- [ ] Retour à Toutes les offres.
- [ ] Loading state.
- [ ] Error state.
- [ ] Empty state.

---

# 45. CHECKLIST FRONTEND — RECHERCHE / FILTRES

- [ ] Recherche matricule.
- [ ] Recherche adhérent.
- [ ] Recherche N° CNPS.
- [ ] Filtre statut.
- [ ] Filtre rubrique.
- [ ] Filtre offre.
- [ ] Filtre certificat de scolarité si supporté.
- [ ] Pagination.
- [ ] Reset filtres.
- [ ] Conservation des critères lors de la pagination.
- [ ] Pas de filtrage métier local de la totalité des données.
- [ ] Les paramètres correspondent exactement à OpenAPI.

---

# 46. CHECKLIST FRONTEND — DOSSIER

- [ ] Ouverture du dossier.
- [ ] Identifiant.
- [ ] Adhérent.
- [ ] Matricule CNPS.
- [ ] Rubrique.
- [ ] Offre.
- [ ] Statut.
- [ ] Nombre de personnes à charge si présent dans l'API.
- [ ] Pièces requises.
- [ ] Pièces reçues.
- [ ] Pièces manquantes.
- [ ] Progression documentaire.
- [ ] Date dépôt.
- [ ] Date transmission.
- [ ] Prochaine relance.
- [ ] Observations.
- [ ] Journal d'activité.
- [ ] Actions selon permissions.

---

# 47. CHECKLIST FRONTEND — PIÈCES

- [ ] Liste des pièces obligatoires.
- [ ] Statut de chaque pièce.
- [ ] Date de réception.
- [ ] Référence/note si disponible.
- [ ] Indication pièce manquante.
- [ ] Ajout de pièce si autorisé.
- [ ] Consultation document si autorisée.
- [ ] Rejet/validation si autorisé.
- [ ] Confirmation avant opération sensible.
- [ ] Désactivation du bouton pendant l'appel.
- [ ] Gestion des erreurs 403/409.
- [ ] Rafraîchissement des données après succès.

---

# 48. CHECKLIST FRONTEND — AUDIT / JOURNAL

Le Gestionnaire ne doit pas obtenir le journal global de toute la plateforme.

S'il est autorisé à consulter l'historique opérationnel d'un dossier :

- [ ] Charger uniquement les événements autorisés.
- [ ] Filtrer par dossier.
- [ ] Afficher utilisateur/action/date.
- [ ] Ne pas afficher les événements d'autres domaines auxquels le Gestionnaire n'a pas accès.
- [ ] Ne pas permettre suppression/modification.
- [ ] Ne pas afficher de données sensibles inutiles.

Le journal global `/audit` reste soumis aux permissions d'audit COSITI.

---

# 49. CHECKLIST FRONTEND — EXPORT

- [ ] Bouton Export Excel affiché uniquement si permission.
- [ ] Envoi des filtres actuels si le contrat le permet.
- [ ] Appel `POST /exports/cnps`.
- [ ] Affichage de l'état de génération.
- [ ] Appel `GET /exports/{id}`.
- [ ] Téléchargement seulement lorsque disponible.
- [ ] Gestion de l'échec.
- [ ] Aucun export local construit à partir d'une liste partielle.
- [ ] L'export est auditée côté backend.

---

# 50. TANSTACK QUERY — QUERIES À PRÉVOIR

Exemples de clés fonctionnelles :

```text
['cnps-dashboard']
['cnps-dossiers', criteres]
['cnps-dossier', dossierId]
['cnps-pieces-manquantes', dossierId]
['cnps-audit', dossierId]
['relances', criteres]
['export', exportId]
```

Les noms peuvent être adaptés aux conventions déjà présentes dans le projet.

Après mutation :

```text
invalidateQueries(['cnps-dossiers'])
invalidateQueries(['cnps-dossier', dossierId])
invalidateQueries(['cnps-pieces-manquantes', dossierId])
invalidateQueries(['cnps-dashboard'])
```

Ne pas utiliser de données statiques pour masquer une absence de backend.

---

# 51. FORMULAIRES FRONTEND

Pour les opérations d'écriture :

- React Hook Form ;
- Zod ;
- types générés/alignés sur OpenAPI ;
- messages d'erreur fonctionnels ;
- aucun calcul métier sensible dupliqué ;
- aucune décision d'autorisation dans le schéma frontend.

---

# 52. TESTS BACKEND — RBAC

Tester au minimum :

| Scénario | Résultat attendu |
|---|---|
| Gestionnaire consulte dossier autorisé | 200 |
| Gestionnaire consulte dossier hors périmètre | 403 ou 404 selon stratégie |
| Gestionnaire appelle une mutation interdite | 403 |
| Utilisateur non authentifié | 401 |
| ID inexistant | 404 |
| Statut impossible | 409/400 selon contrat |
| Pièce invalide | 400 |
| Document interdit | 403 |
| Export non autorisé | 403 |

---

# 53. TESTS BACKEND — AUDIT

Pour chaque mutation :

1. effectuer l'appel ;
2. vérifier la réponse ;
3. vérifier la persistance ;
4. vérifier l'événement d'audit ;
5. vérifier utilisateur ;
6. vérifier rôle ;
7. vérifier entité ;
8. vérifier entité ID ;
9. vérifier timestamp ;
10. vérifier résultat ;
11. vérifier ancien/nouvel état lorsque nécessaire.

Test important :

```text
POST direct via HTTP
      ↓
mutation exécutée
      ↓
audit présent
```

Cela démontre que l'audit n'est pas dépendant du frontend.

---

# 54. TESTS FRONTEND — PARCOURS PRINCIPAL

## Parcours 1

```text
Connexion
 ↓
Dashboard Gestionnaire
 ↓
Dossiers CNPS
 ↓
PVID
 ↓
Pension vieillesse
 ↓
Liste
 ↓
Consulter dossier
```

- [ ] Fonctionne.

## Parcours 2

```text
Dossiers CNPS
 ↓
Risques professionnels
 ↓
Accident du travail
 ↓
Dossier
 ↓
Pièces manquantes
```

- [ ] Fonctionne.

## Parcours 3

```text
Dossier
 ↓
Ajouter pièce
 ↓
Validation
 ↓
Persistance
 ↓
Rafraîchissement
 ↓
Audit
```

- [ ] Fonctionne si le Gestionnaire possède cette permission.

---

# 55. TESTS DE NON-RÉGRESSION

- [ ] Le dashboard DAF n'est pas modifié.
- [ ] Le dashboard DGA n'est pas modifié.
- [ ] Le dashboard DG n'est pas modifié.
- [ ] Le dashboard PCA n'est pas modifié.
- [ ] Les permissions existantes ne sont pas élargies.
- [ ] Les endpoints existants ne changent pas de contrat.
- [ ] Aucun endpoint fictif n'est introduit.
- [ ] Aucun calcul financier existant n'est déplacé dans le frontend.
- [ ] Aucun stockage de document non sécurisé n'est introduit.
- [ ] L'audit global reste en lecture seule.

---

# 56. ORDRE RECOMMANDÉ DE DÉVELOPPEMENT

## Phase 1 — Contrat backend

- [ ] Vérifier `/api/v1/openapi`.
- [ ] Vérifier les paramètres de `/cnps/dossiers`.
- [ ] Vérifier les modèles rubrique/offre.
- [ ] Vérifier les permissions Gestionnaire.
- [ ] Vérifier les statuts dossier.
- [ ] Vérifier les statuts document.
- [ ] Vérifier le modèle des pièces.
- [ ] Vérifier le journal `/audit`.
- [ ] Vérifier le contrat d'export.

## Phase 2 — Dashboard

- [ ] `/tableaux-de-bord/cnps`
- [ ] cartes rubriques
- [ ] compteurs
- [ ] sélection rubrique
- [ ] sélection offre

## Phase 3 — Liste

- [ ] `/cnps/dossiers`
- [ ] recherche
- [ ] filtres
- [ ] pagination
- [ ] états UI

## Phase 4 — Détail

- [ ] `/cnps/dossiers/{id}`
- [ ] pièces
- [ ] pièces manquantes
- [ ] dates
- [ ] statut
- [ ] observations

## Phase 5 — Documents

- [ ] upload
- [ ] consultation
- [ ] statut
- [ ] contrôles de sécurité
- [ ] audit

## Phase 6 — Workflow

- [ ] statut dossier
- [ ] déclaration
- [ ] transmission
- [ ] relance

## Phase 7 — Audit

- [ ] événements
- [ ] journal dossier
- [ ] tests d'audit

## Phase 8 — Export

- [ ] génération
- [ ] suivi
- [ ] téléchargement
- [ ] audit

## Phase 9 — Recette

- [ ] RBAC
- [ ] sécurité
- [ ] données
- [ ] UX
- [ ] audit
- [ ] non-régression

---

# 57. TABLEAU DE SUIVI DE DÉVELOPPEMENT

| ID | Fonctionnalité | API | BACK | FRONT | TEST | AUDIT | Recette |
|---|---|---|---:|---:|---:|---:|---:|
| CNPS-01 | Dashboard CNPS | GET dashboard | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-02 | Liste dossiers | GET dossiers | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-03 | Recherche | GET dossiers | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-04 | Filtres | GET dossiers | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-05 | Détail dossier | GET dossier | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-06 | Pièces manquantes | GET pièces | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-07 | Ajout pièce | POST pièces | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-08 | Document | POST documents | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-09 | Lecture document | GET document | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-10 | Statut document | POST statut | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-11 | Statut dossier | POST statut | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-12 | Création dossier | POST dossier | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-13 | Déclaration | GET/POST déclaration | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-14 | Transmission | POST transmettre | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-15 | Relances | GET/POST relances | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-16 | Journal dossier | GET audit | ☐ | ☐ | ☐ | ☐ | ☐ |
| CNPS-17 | Export | POST/GET export | ☐ | ☐ | ☐ | ☐ | ☐ |
| PVID-01 | PVID | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| PVID-02 | Toutes offres | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| PVID-03 | Vieillesse normale | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| PVID-04 | Allocation unique | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| PVID-05 | Invalidité | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| PVID-06 | Réversion/décès | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| RP-01 | RP | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| RP-02 | Toutes offres | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| RP-03 | Accident travail | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| RP-04 | Maladie pro | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| RP-05 | Soins | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |
| RP-06 | Rente | à valider | ☐ | ☐ | ☐ | ☐ | ☐ |

---

# 58. DEFINITION OF DONE — BACKEND

Une fonctionnalité backend est considérée terminée uniquement lorsque :

- [ ] Endpoint documenté dans OpenAPI.
- [ ] Permission définie.
- [ ] Contrôle RBAC backend.
- [ ] Contrôle du périmètre Gestionnaire.
- [ ] Validation des données.
- [ ] Service métier implémenté.
- [ ] Persistance PostgreSQL.
- [ ] Transaction correctement définie.
- [ ] Audit implémenté si nécessaire.
- [ ] Erreurs métier définies.
- [ ] Tests unitaires.
- [ ] Tests d'intégration.
- [ ] Test d'accès interdit.
- [ ] Aucun endpoint fictif.
- [ ] Aucune règle métier sensible dans le frontend.
- [ ] Aucun `ddl-auto` ou modification de schéma hors Flyway.

---

# 59. DEFINITION OF DONE — FRONTEND

Une fonctionnalité frontend est considérée terminée lorsque :

- [ ] TypeScript strict.
- [ ] Aucun `any`.
- [ ] API branchée sur le client HTTP unique.
- [ ] TanStack Query utilisé pour les données serveur.
- [ ] RHF + Zod pour les formulaires concernés.
- [ ] Permissions issues de `/auth/moi`.
- [ ] Aucun token dans localStorage/sessionStorage.
- [ ] Loading state.
- [ ] Error state.
- [ ] Empty state.
- [ ] 401/403 correctement gérés.
- [ ] Mutation désactivée pendant l'appel.
- [ ] Invalidation des queries après mutation.
- [ ] Responsive desktop.
- [ ] Accessibilité de base.
- [ ] Aucun faux compteur.
- [ ] Aucun faux statut.
- [ ] Aucun endpoint inventé.

---

# 60. DEFINITION OF DONE — AUDIT

Une fonctionnalité sensible est terminée lorsque :

```text
Action utilisateur
      ↓
API
      ↓
Permission
      ↓
Service métier
      ↓
Transaction
      ├── Persistance
      └── Audit
```

et que les tests prouvent :

- [ ] l'action est autorisée uniquement au bon rôle ;
- [ ] l'action interdite retourne 403 ;
- [ ] la donnée est persistée ;
- [ ] l'audit est créé ;
- [ ] l'auteur est identifié ;
- [ ] la date/heure est enregistrée ;
- [ ] l'entité est identifiée ;
- [ ] le résultat est enregistré ;
- [ ] l'ancien/nouvel état est présent pour les changements ;
- [ ] le Gestionnaire ne peut pas modifier l'audit ;
- [ ] aucune suppression/purge de l'audit n'est exposée.

---

# 61. POINTS BLOQUANTS AVANT CODAGE

Les points suivants doivent être vérifiés dans `/api/v1/openapi` avant de développer les écrans concernés :

1. Paramètres exacts de `GET /cnps/dossiers`.
2. Modèle exact des rubriques.
3. Modèle exact des offres.
4. Comment le backend expose PVID.
5. Comment le backend expose Risques professionnels.
6. Liste officielle des statuts de dossier.
7. Liste officielle des statuts de document.
8. Modèle exact d'une pièce.
9. Permission exacte de création d'un dossier par le Gestionnaire.
10. Permission exacte d'ajout de pièce.
11. Permission exacte de changement de statut.
12. Permission exacte de transmission.
13. Permission d'export CNPS.
14. Filtres disponibles pour `/audit`.
15. Possibilité d'utiliser `/audit` comme journal détaillé d'un dossier.
16. Modèle des relances associées à un dossier CNPS.
17. Modèle des observations administratives.
18. Règles officielles des délais affichés dans les maquettes.
19. Catalogue officiel des pièces obligatoires pour chaque offre.
20. Source officielle des compteurs du dashboard.

---

# 62. RÈGLE POUR LE DÉVELOPPEUR

Ne pas faire :

```text
Maquette
   ↓
Créer immédiatement endpoint fictif
   ↓
Créer frontend
```

Faire :

```text
Maquette
   ↓
Besoin fonctionnel
   ↓
Contrat OpenAPI existant
   ↓
Permission
   ↓
Modèle métier
   ↓
Endpoint
   ↓
Service
   ↓
Persistance
   ↓
Audit
   ↓
Frontend
   ↓
Tests
```

Si l'API existante ne permet pas une fonctionnalité visible dans la maquette :

```text
[À SPÉCIFIER]
```

doit être inscrit dans le backlog au lieu d'inventer un endpoint.

---

# 63. RÉSUMÉ DES ENDPOINTS À UTILISER POUR LA V2

## CNPS

```http
GET    /api/v1/tableaux-de-bord/cnps

GET    /api/v1/cnps/dossiers
POST   /api/v1/cnps/dossiers
GET    /api/v1/cnps/dossiers/{id}
POST   /api/v1/cnps/dossiers/{id}/pieces
POST   /api/v1/cnps/dossiers/{id}/statut
GET    /api/v1/cnps/dossiers/{id}/pieces-manquantes

GET    /api/v1/cnps/declarations
POST   /api/v1/cnps/declarations
POST   /api/v1/cnps/declarations/{id}/transmettre

GET    /api/v1/documents/{id}
GET    /api/v1/documents/{id}/metadonnees
POST   /api/v1/documents
POST   /api/v1/documents/{id}/statut

GET    /api/v1/relances
POST   /api/v1/relances
POST   /api/v1/relances/{id}/resultat

POST   /api/v1/exports/cnps
GET    /api/v1/exports/{id}

GET    /api/v1/audit
```

## Authentification / permissions

```http
GET /api/v1/auth/moi
```

Utilisé pour connaître les permissions effectives du Gestionnaire.

---

# 64. CONCLUSION

Cette V2 ne doit pas être développée comme une simple reproduction graphique des captures.

Le résultat attendu est un véritable module métier du Gestionnaire des comptes :

```text
Dossiers CNPS
      │
      ├── PVID
      │    ├── Vieillesse normale
      │    ├── Allocation unique
      │    ├── Invalidité
      │    └── Réversion / décès
      │
      └── Risques professionnels
           ├── Accident travail / trajet
           ├── Maladie professionnelle
           ├── Soins médicaux
           └── Rente incapacité / survivants
```

avec :

```text
Recherche
   +
Filtres
   +
Dossiers
   +
Pièces
   +
Documents
   +
Statuts
   +
Déclarations
   +
Transmission
   +
Relances
   +
Export
   +
Audit
```

Le principe directeur reste :

**aucune action métier du Gestionnaire ne doit être considérée comme réellement terminée tant que la permission backend, la persistance, le test et la journalisation correspondante ne sont pas validés.**
