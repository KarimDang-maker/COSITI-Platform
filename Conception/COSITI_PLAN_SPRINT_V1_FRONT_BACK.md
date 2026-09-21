# COSITI --- PLAN DE SPRINT V1 RÉVISÉ

## Frontend + Backend + API + Base de données + Tests + Sécurité

**Version : 20/09/2026**

> Ce document approfondit le plan de sprint V1 en croisant les
> architectures Frontend et Backend, les spécifications d'écrans, le
> contrat REST, les règles de sécurité et les contraintes métier COSITI.

------------------------------------------------------------------------

# 1. Principes directeurs

COSITI V1 est un **back-office interne**.

La plateforme : - centralise les adhérents ; - enregistre les paiements
et collectes ; - organise zones, agents et portefeuilles ; - calcule et
expose les droits ; - suit les dossiers CNPS ; - gère documents et
relances ; - fournit dashboards, rapports, exports et audit ; -
administre utilisateurs et permissions.

La plateforme **n'exécute aucun mouvement financier externe**.

Sont exclus en V1 : - API Orange Money ; - API MTN MoMo ; - API Wave ; -
API bancaire ; - paiement en ligne ; - transfert de fonds ; - gestion de
comptes bancaires ou Mobile Money ; - dépôt en microfinance.

Les moyens de paiement sont uniquement des **données enregistrées**.

------------------------------------------------------------------------

# 2. Rôles V1

1.  PCA
2.  DG
3.  DGA
4.  DAF
5.  Gestionnaire des comptes
6.  Chef des agents de terrain
7.  Agent de terrain
8.  Super Administrateur

Ne pas recréer : - Téléconseiller ; - Marketing autonome ; - Responsable
de zone autonome ; - Responsable CNPS autonome.

## Chef des agents de terrain

Ce n'est pas un rôle « Responsable de zone ». C'est un Agent de terrain
auquel sont accordées des responsabilités de supervision.

Il peut, selon son périmètre : - superviser les agents ; - suivre les
portefeuilles ; - suivre la charge ; - affecter des portefeuilles ; -
suivre les objectifs lorsqu'ils sont validés.

Le DGA peut désigner un Agent comme Chef, mais le contrat API
correspondant doit être validé avant codage.

## Gestionnaire des comptes

Il porte notamment : - le suivi des adhérents ; - le suivi CNPS ; - les
dossiers et pièces ; - l'immatriculation ; - les déclarations ; - la
situation des adhérents.

## PCA

Le PCA dispose d'une vision globale de l'activité. Le terme « temps réel
» doit être techniquement défini ; ne pas inventer WebSocket/SSE sans
décision explicite.

------------------------------------------------------------------------

# 3. Méthode commune à chaque sprint

Chaque sprint suit :

``` text
Besoin métier
  ↓
Règles métier
  ↓
Modèle de données
  ↓
Contrat API
  ↓
Backend
  ↓
Frontend
  ↓
Tests
  ↓
RBAC + sécurité
  ↓
Audit
  ↓
Recette E2E
```

Avant de coder : 1. lire les documents concernés ; 2. rechercher
l'existant ; 3. identifier acteurs et permissions ; 4. identifier
données ; 5. identifier \[C\], \[A\], \[V\] ; 6. vérifier le contrat
REST ; 7. définir les erreurs ; 8. seulement ensuite développer.

**Un endpoint non documenté ne doit jamais être inventé pour faciliter
le frontend.**

------------------------------------------------------------------------

# 4. Architecture technique cible

## Backend

Architecture de type Clean + Hexagonal / Ports & Adapters :

``` text
presentation
    ↓
application
    ↓
domain
    ↓
ports
    ↓
infrastructure
```

Structure :

``` text
src/main/java/.../
├── configuration/
├── presentation/
│   ├── controller/
│   ├── dto/request/
│   ├── dto/response/
│   ├── mapper/
│   └── validator/
├── application/
│   ├── usecase/
│   ├── service/
│   └── port/
│       ├── input/
│       └── output/
├── domain/
│   ├── model/
│   ├── service/
│   ├── rule/
│   ├── exception/
│   └── event/
├── infrastructure/
│   ├── persistence/
│   │   ├── entity/
│   │   ├── repository/
│   │   ├── adapter/
│   │   └── mapper/
│   ├── storage/
│   └── external/
├── security/
└── shared/
    ├── exception/
    ├── response/
    ├── pagination/
    └── audit/
```

Le Domain ne dépend pas de Spring MVC, JPA, PostgreSQL ou HTTP.

## Frontend

``` text
src/
├── app/
├── api/
├── auth/
├── fonctionnalites/
│   ├── tableau-de-bord/
│   ├── adherents/
│   ├── cotisations/
│   ├── droits/
│   ├── cnps/
│   ├── daf/
│   ├── organisation/
│   ├── relances/
│   ├── documents/
│   ├── rapports/
│   ├── administration/
│   └── audit/
├── composants/
├── lib/
├── styles/
└── types/
```

Règles : - une seule instance HTTP dans `api/client.ts` ; - aucun
`fetch` direct dans les fonctionnalités ; - TanStack Query pour les
données serveur ; - React Hook Form + Zod pour les formulaires ; -
Context uniquement pour session/permissions ; - `useState` pour l'état
local ; - filtres dans `useSearchParams` ; - pas de Redux ; - TypeScript
strict ; - aucun `any` ; - pas de React.FC ; - pas de règles métier dans
React.

------------------------------------------------------------------------

# 5. S00 --- Socle, architecture et contrat

## Objectif

Figer le socle technique avant les modules métier.

## Backend

Développer : - Java 21 ; - Spring Boot ; - PostgreSQL ; - Flyway ; -
validation ; - Security ; - OpenAPI ; - Actuator ; - profils
dev/test/prod ; - gestion d'erreurs ; - `X-Trace-Id`.

Configurer :

``` text
ddl-auto = validate
```

Le schéma évolue uniquement avec Flyway.

Préparer : - UUID ; - timestamps ; - index ; - contraintes ; -
optimistic locking si nécessaire ; - conventions API.

## Frontend

Initialiser : - React ; - TypeScript strict ; - Vite ; - React Router
; - TanStack Query ; - RHF ; - Zod ; - Tailwind ; - Vitest ; -
Playwright ; - ESLint.

Créer les dossiers de l'architecture cible.

## API

Convention :

``` text
/api/v1
```

Préparer : - JSON UTF-8 ; - pagination ; - filtres nommés ; - dates ISO
; - montants décimaux ; - erreurs françaises ; - `X-Trace-Id` ; -
`Idempotency-Key` pour paiement.

## DONE

Backend et frontend compilent, démarrent, la DB migre et le contrat de
base est documenté.

------------------------------------------------------------------------

# 6. S01 --- Authentification + RBAC

## API

``` text
POST /auth/connexion
POST /auth/rafraichir
POST /auth/deconnexion
POST /auth/mot-de-passe/changer
GET  /auth/moi
```

## Backend

Responsabilités : - authentifier ; - vérifier mot de passe ; - créer JWT
; - rafraîchir ; - révoquer refresh token ; - charger utilisateur ; -
charger permissions ; - calculer périmètre.

Sécurité : - Argon2id ou BCrypt \>= 12 ; - mot de passe \>= 12 ; - aucun
compte par défaut ; - verrouillage après échecs ; - JWT court ; -
refresh opaque, haché, rotatif ; - TOTP obligatoire pour les profils
sensibles selon le document sécurité ; - aucun secret dans le dépôt.

## Frontend

Créer : - `/connexion` ; - `ContexteAuth` ; - `useAuth` ; -
`usePermission` ; - gestion du token mémoire ; - route protégée ; -
navigation par permission.

Ne jamais stocker le token dans `localStorage` ou `sessionStorage`.

`GET /auth/moi` fournit : - utilisateur ; - rôles ; - permissions ; -
périmètre.

Le frontend masque ; **le backend autorise**.

## Tests

-   login ;
-   mauvais mot de passe ;
-   verrouillage ;
-   refresh ;
-   logout ;
-   401 ;
-   403 ;
-   permissions ;
-   périmètre.

## DONE

Un compte fourni par l'administration peut se connecter et accéder
uniquement à son périmètre.

------------------------------------------------------------------------

# 7. S02 --- Adhérents

## API

``` text
GET    /adherents
POST   /adherents
GET    /adherents/{id}
PUT    /adherents/{id}

POST   /adherents/verifier-doublon
POST   /adherents/{id}/archiver
POST   /adherents/{id}/statut
POST   /adherents/{id}/pack

GET    /adherents/{id}/situation
GET    /adherents/{id}/paiements
GET    /adherents/{id}/ayants-droit
POST   /adherents/{id}/ayants-droit
DELETE /adherents/{id}/ayants-droit
```

## Backend

Domain : - Adherent ; - Statut ; - Pack ; - Activité ; - rattachement
organisationnel ; - ayant droit.

Use cases :

``` text
creerAdherent
modifierAdherent
verifierDoublons
changerStatut
archiver
affecterPack
consulterSituation
```

Persistence : - entités ; - repositories ; - adapters ; - mappers ; -
contraintes d'unicité ; - migration.

## Frontend

Routes :

``` text
/adherents
/adherents/nouveau
/adherents/:id
```

Composants : - tableau ; - recherche ; - filtres ; - formulaire ; -
contrôle doublon ; - fiche ; - historique ; - situation ; - paiements
; - CNPS ; - documents.

Filtres URL :

``` text
recherche
zoneId
agentId
activiteId
statut
packId
associationId
sansAgentReferent
dateAdhesionDu
dateAdhesionAu
```

## Doublon

Le contrôle est effectué avant soumission.

Le téléphone retourné doit rester partiellement masqué.

Si l'utilisateur poursuit malgré un candidat, la décision doit être
traçable côté serveur.

## Tests

-   création ;
-   doublon ;
-   matricule ;
-   modification ;
-   archivage ;
-   statut ;
-   pack ;
-   ayants droit ;
-   pagination ;
-   filtres ;
-   IDOR ;
-   périmètre.

## DONE

``` text
Création → doublon → matricule → fiche → consultation
```

------------------------------------------------------------------------

# 8. S03 --- Organisation terrain

## API

``` text
GET/POST/PUT /zones
GET/POST/PUT /zones/{id}
GET/POST/PUT /agents
GET/POST/PUT /agents/{id}

GET  /agents/{id}/portefeuille
GET  /agents/{id}/charge?periode=YYYY-MM

POST /portefeuilles/affecter
POST /portefeuilles/transferer
GET  /portefeuilles/sans-agent?zoneId=...

POST /agents/{id}/designer-chef       [A]
POST /agents/{id}/remplacer-chef      [A]
GET  /agents/chef                     [A]
GET  /agents/{id}/historique-chef     [A]
```

## Contrats à valider

Proposition de contrat dans `COSITI_API_docs/docs/03_SPECIFICATIONS_API.md §6`
pour : - désigner/remplacer un Chef ; - attribuer un objectif (aucune
proposition, besoin non confirmé).

Avant codage : 1. cas d'utilisation ; 2. request ; 3. response ; 4.
permission ; 5. audit ; 6. validation.

## Backend

Responsabilités :

``` text
creerZone
modifierZone
creerAgent
creerAgentParDga (DGA-F01, audité AGENT_CREATION_PAR_DGA)
modifierAgent
affecterPortefeuille
transfererPortefeuille
consulterCharge
listerSansAgent
designerChefTerrain [à valider] (DGA-F03, audité AGENT_DESIGNATION_CHEF)
remplacerChefTerrain [à valider] (DGA-F04, audité AGENT_REMPLACEMENT_CHEF)
attribuerObjectif [à valider]
```

## Frontend

`/organisation`

Vues : - zones ; - agents ; - portefeuilles ; - charge ; - affectations
; - supervision.

## Tests

-   zones ;
-   agents ;
-   portefeuille ;
-   transfert avec motif ;
-   périmètre ;
-   supervision ;
-   Chef/Agent/DGA.

------------------------------------------------------------------------

# 9. S04 --- Paiements et collectes

## API

``` text
GET  /paiements
POST /paiements
GET  /paiements/{id}

POST /paiements/{id}/valider
POST /paiements/{id}/corriger
POST /paiements/{id}/annuler

GET  /paiements/{id}/recu
GET  /paiements/{id}/affectations
POST /paiements/{id}/affectations
```

## Moyens

Les moyens sont enregistrés comme données : - espèces ; - Orange Money
; - MTN MoMo ; - Wave ; - virement ; - chèque ; - autres valeurs
validées.

Aucune API opérateur en V1.

## Backend

Responsabilités :

``` text
enregistrerPaiement
verifierDonneesPaiement
validerPaiement
corrigerPaiement
annulerPaiement
genererDonneesRecu
```

Contraintes : - `Idempotency-Key` obligatoire ; - référence obligatoire
lorsque la règle l'exige ; - créateur ≠ validateur ; - correction =
motif ; - annulation = motif ; - aucune suppression physique.

Les opérations paiement + affectation + droits + audit doivent rester
cohérentes transactionnellement lorsque le contrat le prévoit.

## Frontend

Routes :

``` text
/cotisations
/cotisations/nouveau
/cotisations/:id
```

Le formulaire contient : - adhérent ; - date ; - montant ; - moyen ; -
référence ; - collecteur ; - justificatif ; - type.

Créer l'Idempotency-Key au montage.

Après création :

``` text
À CONTRÔLER
```

Aucune soumission financière par simple touche Entrée.

## Tests critiques

``` text
montant invalide
date incohérente
adhérent archivé
référence manquante
double Idempotency-Key
auto-validation
double validation
correction sans motif
annulation sans motif
```

## DONE

Un agent saisit une collecte réelle ; COSITI enregistre l'information ;
aucun mouvement financier externe n'est déclenché.

------------------------------------------------------------------------

# 10. S05 --- Contrôle DAF

## Objectif

Contrôler les données de collecte selon le processus réel.

``` text
Paiement réel
 ↓
Agent
 ↓
Saisie
 ↓
Chef
 ↓
Confirmation / contrôle
 ↓
DAF
 ↓
Contrôle
 ↓
Confirmé / Incohérence
```

## API

Réutiliser prioritairement :

``` text
GET /paiements
GET /paiements/{id}
POST /paiements/{id}/valider
POST /paiements/rapprochement
```

Le rapprochement doit être aligné sur le contrat REST réel.

## À spécifier avant développement

-   confirmation hiérarchique ;
-   statut d'incohérence ;
-   commentaire ;
-   preuve ;
-   éventuelle remise interne ;
-   réception éventuelle.

Ne pas réintroduire un scénario de dépôt en microfinance.

Une remise interne caisse/coffre, si retenue, est une **opération
interne de contrôle**, pas un mouvement bancaire.

## Frontend

Vue DAF : - paiements à contrôler ; - filtres ; - agent ; - montant ; -
référence ; - date ; - statut ; - justificatif ; - incohérence.

## Tests

-   saisi ;
-   contrôle ;
-   confirmation ;
-   incohérence ;
-   auto-validation interdite ;
-   audit.

------------------------------------------------------------------------

# 11. S06 --- Droits et régularité

## API

``` text
GET  /droits/adherents/{id}
GET  /droits/adherents/{id}/periodes
POST /droits/adherents/{id}/recalculer
GET  /droits/retardataires
```

## Backend

Responsabilités :

``` text
calculerSituation
calculerPeriodes
determinerRegularite
identifierRetard
recalculerSituation
```

Les périodes sont persistées.

Le calcul est serveur.

Le frontend ne recalcule jamais les droits.

Le recalcul est : - autorisé uniquement aux profils habilités ; - motivé
; - audité.

## Règles \[V\]

Ne pas figer : - décomposition CNPS/cooperative/épargne ; - reliquat ; -
seuils sensibles ; - règles financières non validées.

## Frontend

`/droits` + bloc dans fiche adhérent.

Afficher les valeurs API : - couvert jusqu'au ; - jours couverts ; -
jours de retard ; - cumul cotisé ; - solde ; - statut ; - éligibilité
CNPS ; - avertissements.

## Tests

-   calcul ;
-   retard ;
-   périodes ;
-   recalcul ;
-   annulation d'un paiement ;
-   cohérence ;
-   audit.

------------------------------------------------------------------------

# 12. S07 --- CNPS + Documents

## API CNPS

``` text
GET/POST /cnps/dossiers
GET/POST /cnps/dossiers/{id}
POST     /cnps/dossiers/{id}/pieces
POST     /cnps/dossiers/{id}/statut
GET      /cnps/dossiers/{id}/pieces-manquantes
GET      /cnps/eligibles-non-immatricules
GET/POST /cnps/declarations
POST     /cnps/declarations/{id}/transmettre
GET      /cnps/declarations/a-produire
```

## API documents

``` text
POST /documents
GET  /documents/{id}
GET  /documents/{id}/metadonnees
POST /documents/{id}/statut
```

## Backend

CNPS :

``` text
ouvrirDossier
ajouterPiece
changerStatutDossier
identifierPiecesManquantes
eligiblesNonImmatricules
preparerDeclaration
marquerTransmise
aProduire
```

Aucune intégration directe CNPS en V1.

Documents : - stockage sécurisé ; - métadonnées ; - contrôle d'accès à
chaque lecture ; - consultation journalisée ; - aucune URL publique
permanente.

## Frontend

Routes :

``` text
/cnps
/documents
```

Créer : - dossier ; - pièces ; - pièces manquantes ; - déclarations ; -
bibliothèque ; - upload ; - consultation ; - statut.

Le backend reste autoritaire sur : - type ; - taille ; - contenu ; -
accès ; - statut.

## Tests

-   dossier ;
-   pièce ;
-   pièce manquante ;
-   déclaration ;
-   transmission ;
-   upload ;
-   téléchargement interdit ;
-   audit document.

------------------------------------------------------------------------

# 13. S08 --- Relances + Notifications + Comptes rendus

## API

``` text
GET  /relances
POST /relances
POST /relances/{id}/resultat

GET  /campagnes-relance
POST /campagnes-relance

GET  /notifications
POST /notifications/{id}/lue
```

## API — comptes rendus `[A]` (contrat à valider avant codage, voir `COSITI_API_docs/docs/03_SPECIFICATIONS_API.md §9`)

``` text
POST /comptes-rendus
GET  /comptes-rendus
POST /comptes-rendus/{id}/controler
POST /comptes-rendus/consolider
POST /comptes-rendus/{id}/transmettre
```

## Backend

Responsabilités :

``` text
creerRelance
enregistrerResultat
creerCampagne
listerRetardataires
```

Le résultat doit être structuré : - résultat ; - date ; - commentaire
éventuel ; - prochaine action éventuelle.

Chaîne hiérarchique terrain (`Roles des acteurs.md §12.1`) : Agent de
terrain produit un compte rendu → Gestionnaire des comptes contrôle et
consolide → transmission à la DGA. Chaque étape est auditée
(`COMPTE_RENDU_CREATION`, `COMPTE_RENDU_CONSOLIDATION`,
`COMPTE_RENDU_TRANSMISSION`).

## Frontend

`/relances`

Vues : - à faire ; - résultats ; - campagnes ; - historique.

`/comptes-rendus` (E18) : vue Agent (produire), vue Chef (examiner son
équipe), vue Gestionnaire (recevoir/contrôler/consolider/transmettre),
vue DGA (consulter les comptes rendus consolidés reçus).

## Tests

-   création ;
-   résultat ;
-   campagne ;
-   périmètre ;
-   notifications ;
-   exploitation dans dashboard ;
-   compte rendu : production, contrôle, consolidation, transmission,
    périmètre par rôle.

------------------------------------------------------------------------

# 14. S09 --- Dashboards par rôle

**Six dashboards exclusivement** (`Roles des acteurs.md §2` et `§11`) : PCA, DG, DGA, DAF, Gestionnaire des comptes, Super Administrateur. **Le Chef des agents de terrain et l'Agent de terrain n'ont pas de dashboard dédié** (`Roles des acteurs.md §16`, hors périmètre) : ils travaillent via les écrans métier (organisation, portefeuille, relances), jamais via une route `/tableaux-de-bord/*`.

## Sources API

``` text
GET /tableaux-de-bord/pca
GET /tableaux-de-bord/dg
GET /tableaux-de-bord/dga
GET /tableaux-de-bord/daf
GET /tableaux-de-bord/gestionnaire
GET /tableaux-de-bord/super-admin
```

Ne pas multiplier les endpoints sans besoin. Le contenu qui figurait plus bas sous « Chef Terrain » et « Agent Terrain » est couvert par les écrans métier (E12, portefeuille, relances), pas par un dashboard.

## PCA

-   activité globale ;
-   adhérents ;
-   collecte enregistrée ;
-   zones ;
-   agents ;
-   CNPS ;
-   alertes ;
-   évolution ;
-   indicateurs clés.

## DG

-   pilotage global ;
-   adhérents ;
-   collecte ;
-   retards ;
-   CNPS ;
-   alertes ;
-   évolution.

## DGA

-   activité ;
-   organisation ;
-   zones ;
-   agents ;
-   objectifs validés ;
-   retards ;
-   collecte.

## DAF

-   collecte par mode ;
-   paiements à contrôler ;
-   incohérences ;
-   références ;
-   contrôles.

## Gestionnaire

-   adhérents ;
-   éligibles CNPS ;
-   dossiers incomplets ;
-   déclarations ;
-   retards.

## Super Admin

-   utilisateurs ;
-   rôles ;
-   paramètres ;
-   audit ;
-   sécurité.

## Frontend

Créer des widgets réutilisables :

``` text
KpiCard
AlerteDashboard
TableauIndicateurs
GraphiqueEvolution
WidgetRetards
WidgetActivite
WidgetCnps
WidgetPaiements
```

Les widgets affichent les données de l'API et ne calculent pas les
règles métier.

## Temps réel

V1 : - chargement initial ; - invalidation ; - rafraîchissement
contrôlé.

WebSocket/SSE uniquement après décision.

------------------------------------------------------------------------

# 15. S10 --- Rapports + Exports + Audit

## API

``` text
POST /exports/adherents
POST /exports/paiements
POST /exports/cnps
GET  /exports/{id}

GET /audit
GET /controles-coherence/dernier-rapport
```

## Backend

Responsabilités :

``` text
genererExport
verifierAutorisationExport
journaliserExport
rechercherAudit
genererRapportCoherence
```

Les gros exports peuvent être asynchrones si le contrat le prévoit.

## Audit

Tracer notamment : - actions sensibles ; - paiements ; - validations ; -
corrections ; - annulations ; - recalculs ; - documents ; - exports ; -
administration ; - changements de rôles.

Audit en lecture seule.

## Frontend

Routes :

``` text
/rapports
/audit
```

Fonctions : - filtres ; - pagination ; - détail ; - export selon
permission.

## Tests

-   export autorisé ;
-   export interdit ;
-   journalisation ;
-   recherche ;
-   pagination ;
-   absence de fuite.

------------------------------------------------------------------------

# 16. S11 --- Administration + Durcissement sécurité

## API

``` text
GET/POST/PUT /administration/utilisateurs
GET/POST/PUT /administration/roles
GET/POST/PUT /administration/parametres
```

## Backend

Créer les responsabilités :

``` text
creerUtilisateur
modifierUtilisateur
activerUtilisateur
desactiverUtilisateur
attribuerRole
gererPermissions
gererParametres
```

Le Super Admin ne reçoit pas automatiquement un privilège financier.

## Frontend

`/administration`

Sous-modules : - utilisateurs ; - rôles ; - paramètres ; - sécurité.

## Contrôles frontend

-   aucun token localStorage/sessionStorage ;
-   aucun secret ;
-   pas de `dangerouslySetInnerHTML` sans dérogation et assainissement ;
-   pas de `eval` ;
-   pas de `new Function` ;
-   pas de scripts tiers ;
-   pas de CDN tiers ;
-   validation des URL ;
-   CSP ;
-   HTTPS ;
-   pas de PII dans les logs navigateur.

## Contrôles backend

-   RBAC serveur ;
-   IDOR/BAC ;
-   validation serveur ;
-   rate limiting ;
-   CORS ;
-   headers ;
-   uploads ;
-   JWT ;
-   refresh token ;
-   secrets ;
-   audit ;
-   dépendances.

## CI

Frontend :

``` text
tsc
ESLint
Vitest
Playwright
OSV/npm audit
gitleaks
build
bundle budget
```

Backend :

``` text
tests
Testcontainers
RestAssured
ArchUnit
OSV
gitleaks
SpotBugs / FindSecBugs
```

------------------------------------------------------------------------

# 17. S12 --- Recette E2E + Stabilisation

## Parcours obligatoires

  ID       Parcours
  -------- --------------------------------------------------
  REC-01   Connexion
  REC-02   Création adhérent
  REC-03   Doublon potentiel
  REC-04   Zone + agent + portefeuille
  REC-05   Paiement espèces
  REC-06   Paiement Mobile Money comme donnée
  REC-07   Paiement invalide
  REC-08   Auto-validation interdite
  REC-09   Contrôle DAF
  REC-10   Correction avec motif
  REC-11   Annulation + recalcul droits
  REC-12   Situation droits
  REC-13   Éligibilité CNPS
  REC-14   Pièce CNPS
  REC-15   Relance
  REC-16   Désignation Chef après contrat validé
  REC-17   Objectif après contrat validé
  REC-18   Dashboard PCA
  REC-19   Dashboard DAF
  REC-20   Export + audit
  REC-21   Document privé
  REC-22   Super Admin sans privilège financier automatique

## DONE

Tous les parcours nominaux et les principaux refus de sécurité passent.

------------------------------------------------------------------------

# 18. MATRICE GLOBALE DES SPRINTS

  -------------------------------------------------------------------------------------------------------------
  Sprint      Backend           Frontend                 API             DB                      Tests
  ----------- ----------------- ------------------------ --------------- ----------------------- --------------
  S00         Socle             Socle                    Contrat global  Migration               Smoke

  S01         Auth/RBAC         Connexion/session        Auth            utilisateurs/sessions   Sécurité

  S02         Adhérents         Liste/formulaire/fiche   Adhérents       adhérents               Métier/E2E

  S03         Organisation      Zones/agents             Organisation    zones/agents            RBAC

  S04         Paiements         Journal/formulaire       Paiements       paiements               Finance métier

  S05         Contrôle DAF      Vue DAF                  Contrôle        états validés           Séparation

  S06         Droits            Situation/retards        Droits          périodes                Calcul

  S07         CNPS/docs         Dossiers/documents       CNPS/docs       dossiers/docs           Sécurité

  S08         Relances          Relances/notifications   Relances        relances                Workflow

  S09         Dashboards        Dashboards rôles         Dashboard       agrégats si nécessaires Périmètre

  S10         Reporting/audit   Rapports/audit           Exports/audit   journal                 Traçabilité

  S11         Admin/security    Administration           Admin           paramètres              Durcissement

  S12         Stabilisation     Recette                  Contrat final   intégrité               E2E
  -------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 19. MATRICE API V1

## Auth

``` text
POST /auth/connexion
POST /auth/rafraichir
POST /auth/deconnexion
POST /auth/mot-de-passe/changer
GET  /auth/moi
```

## Adhérents

``` text
GET    /adherents
POST   /adherents
GET    /adherents/{id}
PUT    /adherents/{id}
POST   /adherents/verifier-doublon
POST   /adherents/{id}/archiver
POST   /adherents/{id}/statut
POST   /adherents/{id}/pack
GET    /adherents/{id}/situation
GET    /adherents/{id}/paiements
GET    /adherents/{id}/ayants-droit
POST   /adherents/{id}/ayants-droit
DELETE /adherents/{id}/ayants-droit
```

## Organisation

``` text
GET/POST/PUT /zones
GET/POST/PUT /zones/{id}
GET/POST/PUT /agents
GET/POST/PUT /agents/{id}
GET          /agents/{id}/portefeuille
GET          /agents/{id}/charge
POST         /portefeuilles/affecter
POST         /portefeuilles/transferer
GET          /portefeuilles/sans-agent
POST         /agents/{id}/designer-chef
POST         /agents/{id}/remplacer-chef
GET          /agents/chef
GET          /agents/{id}/historique-chef
```

À valider avant codage (S03) : - contrat désignation/remplacement du Chef ; - objectifs ; - confirmation hiérarchique. Voir `COSITI_API_docs/docs/03_SPECIFICATIONS_API.md §6`.

## Paiements

``` text
GET  /paiements
POST /paiements
GET  /paiements/{id}
POST /paiements/{id}/valider
POST /paiements/{id}/corriger
POST /paiements/{id}/annuler
GET  /paiements/{id}/recu
GET  /paiements/{id}/affectations
POST /paiements/{id}/affectations
POST /paiements/rapprochement
```

## Droits

``` text
GET  /droits/adherents/{id}
GET  /droits/adherents/{id}/periodes
POST /droits/adherents/{id}/recalculer
GET  /droits/retardataires
```

## CNPS

``` text
GET/POST /cnps/dossiers
GET/POST /cnps/dossiers/{id}
POST     /cnps/dossiers/{id}/pieces
POST     /cnps/dossiers/{id}/statut
GET      /cnps/dossiers/{id}/pieces-manquantes
GET      /cnps/eligibles-non-immatricules
GET/POST /cnps/declarations
POST     /cnps/declarations/{id}/transmettre
GET      /cnps/declarations/a-produire
```

## Documents

``` text
POST /documents
GET  /documents/{id}
GET  /documents/{id}/metadonnees
POST /documents/{id}/statut
```

## Relances

``` text
GET  /relances
POST /relances
POST /relances/{id}/resultat
GET  /campagnes-relance
POST /campagnes-relance
GET  /notifications
POST /notifications/{id}/lue
```

## Dashboards

``` text
GET /tableaux-de-bord/pca
GET /tableaux-de-bord/dg
GET /tableaux-de-bord/dga
GET /tableaux-de-bord/daf
GET /tableaux-de-bord/gestionnaire
GET /tableaux-de-bord/super-admin
```

Six dashboards exclusivement — aucun pour le Chef ni l'Agent de terrain.

## Reporting / Audit

``` text
POST /exports/adherents
POST /exports/paiements
POST /exports/cnps
GET  /exports/{id}
GET  /audit
GET  /controles-coherence/dernier-rapport
```

## Administration

``` text
GET/POST/PUT /administration/utilisateurs
GET/POST/PUT /administration/roles
GET/POST/PUT /administration/parametres
```

------------------------------------------------------------------------

# 20. RESPONSABILITÉS MÉTIER PAR MODULE

  -----------------------------------------------------------------------
  Module                              Responsabilités principales
  ----------------------------------- -----------------------------------
  Auth                                authentifier, rafraîchir,
                                      déconnecter, changer mot de passe,
                                      charger profil

  Adhérents                           vérifier doublons, créer, modifier,
                                      statut, archiver, pack

  Organisation                        zones, agents, affectations,
                                      transferts, Chef, objectifs

  Paiements                           enregistrer, vérifier, valider,
                                      corriger, annuler, reçu

  Contrôle                            contrôler, confirmer, rapprocher,
                                      signaler incohérence

  Droits                              calculer situation, périodes,
                                      régularité, retard, recalcul

  CNPS                                dossier, pièces, statut, éligibles,
                                      déclaration, transmission

  Documents                           téléverser, contrôler accès, lire,
                                      statut

  Relances                            créer, résultat, campagne,
                                      retardataires

  Dashboard                           indicateurs par rôle

  Reporting                           exports, autorisation, suivi

  Audit                               journaliser, rechercher

  Administration                      utilisateurs, rôles, permissions,
                                      paramètres
  -----------------------------------------------------------------------

Ces responsabilités ne signifient pas qu'il faut créer une classe pour
chaque ligne. La structure doit rester simple et justifiée.

------------------------------------------------------------------------

# 21. TESTS OBLIGATOIRES

## Domain

-   invariants ;
-   transitions ;
-   calculs ;
-   règles ;
-   exceptions.

## Application

-   orchestration ;
-   autorisation ;
-   transactions ;
-   audit.

## Persistence

-   mappings ;
-   contraintes ;
-   requêtes ;
-   pagination ;
-   filtres.

## API

Tester au minimum : - 200 ; - 201 ; - 400 ; - 401 ; - 403 ; - 404 ; -
409 ; - 429 ; - erreurs métier ; - pagination ; - permissions.

## Frontend

Tester : - composants ; - formulaires ; - Zod ; - hooks ; - permissions
; - loading ; - error ; - empty ; - pagination ; - URL filters.

## E2E

Tester les 22 scénarios de recette.

------------------------------------------------------------------------

# 22. SÉCURITÉ TRANSVERSE

Chaque sprint doit contrôler :

``` text
Authentification
    ↓
Autorisation
    ↓
Périmètre
    ↓
Validation
    ↓
Données
    ↓
Audit
```

## Frontend

Interdits : - token dans localStorage ; - token dans sessionStorage ; -
secrets ; - `eval` ; - `new Function` ; - HTML dangereux ; - CDN tiers
; - logs contenant PII ou données financières.

## Backend

Obligatoire : - RBAC serveur ; - protection IDOR/BAC ; - validation
serveur ; - rate limiting ; - CORS restrictif ; - HTTPS ; - headers ; -
contrôle uploads ; - journalisation métier ; - secrets hors code.

------------------------------------------------------------------------

# 23. `[C]`, `[A]`, `[V]`

`[C]` = confirmé, peut être développé.

`[A]` = à analyser, ne pas considérer automatiquement comme règle
définitive.

`[V]` = à valider par COSITI, ne jamais coder comme constante immuable.

Points sensibles : - décomposition CNPS / coopérative / épargne ; -
reliquat ; - seuils ; - certaines règles DAF ; - Chef terrain ; -
objectifs ; - confirmation hiérarchique ; - éventuelle remise interne.

------------------------------------------------------------------------

# 24. RÈGLE DE PASSAGE D'UN SPRINT AU SUIVANT

Un sprint n'est accepté que si :

-   fonctionnalités prévues terminées ;
-   contrat API documenté ;
-   endpoint réel ;
-   modèle DB cohérent ;
-   migration validée ;
-   permissions backend testées ;
-   erreurs métier testées ;
-   frontend connecté à l'API réelle ;
-   aucune règle métier dupliquée dans React ;
-   audit vérifié ;
-   tests verts ;
-   scénario nominal exécuté ;
-   scénario d'échec exécuté ;
-   aucun endpoint fictif ;
-   aucune fonctionnalité hors périmètre ;
-   aucune intégration de paiement externe.

------------------------------------------------------------------------

# 25. DÉPENDANCES ENTRE SPRINTS

``` text
S00 Socle
  ↓
S01 Auth + RBAC
  ↓
S02 Adhérents
  ↓
S03 Organisation
  ↓
S04 Paiements
  ↓
S05 Contrôle DAF
  ↓
S06 Droits
  ↓
S07 CNPS + Documents
  ↓
S08 Relances
  ↓
S09 Dashboards
  ↓
S10 Reporting + Audit
  ↓
S11 Administration + Sécurité
  ↓
S12 Recette E2E
```

Certaines tâches peuvent être parallélisées après validation des
contrats, mais jamais au prix d'un endpoint inventé ou d'une règle
métier supposée.

------------------------------------------------------------------------

# 26. DEFINITION OF DONE V1

``` text
Compte fourni par le Super Admin
        ↓
Connexion sécurisée
        ↓
Rôle + permissions + périmètre
        ↓
Adhérent
        ↓
Contrôle doublon
        ↓
Matricule
        ↓
Zone + agent + portefeuille
        ↓
Collecte réelle
        ↓
Paiement enregistré
        ↓
Contrôle / confirmation
        ↓
DAF
        ↓
Droits / régularité
        ↓
CNPS
        ↓
Documents
        ↓
Relances
        ↓
Dashboards
        ↓
Rapports / exports
        ↓
Audit
        ↓
Administration
        ↓
Sécurité
        ↓
Recette E2E
```

**Résultat attendu :** un système interne COSITI structuré, sécurisé et
traçable qui centralise la donnée métier et les informations de collecte
sans exécuter de mouvements financiers externes.

------------------------------------------------------------------------

# 27. RÈGLE FINALE POUR LES AGENTS DE CODE

Avant chaque modification :

1.  chercher l'existant ;
2.  lire le contrat API ;
3.  lire le modèle de données ;
4.  vérifier les permissions ;
5.  vérifier les règles métier ;
6.  identifier `[A]` / `[V]` ;
7.  choisir l'implémentation minimale ;
8.  développer le backend ;
9.  tester le backend ;
10. développer le frontend ;
11. tester le frontend ;
12. tester E2E ;
13. vérifier audit ;
14. vérifier sécurité ;
15. documenter.

Ne pas : - inventer un endpoint ; - inventer un rôle ; - inventer une
règle financière ; - déplacer la logique métier dans React ; -
contourner le RBAC ; - stocker les tokens localement ; - ajouter une
intégration externe non prévue ; - créer des abstractions sans
responsabilité réelle.
