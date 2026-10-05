# 03 — Spécifications des écrans (frontend)

Version 1.0 — 22/09/2026. Reconstitué au jalon **J1** (`AGENTS.md §7`),
étendu **dans le même lot de travail que l'écran livré** (`AGENTS.md §8`) —
jamais à l'avance. Un écran non encore construit n'apparaît pas ici.

Source du contenu fonctionnel (rôles, permissions) :
`COSITI_Backend/docs/03_SPECIFICATIONS_API.md` (fait foi sur le contrat) et
`Conception/Roles des acteurs.md` (fait foi sur le fonctionnel). Un écart
entre les deux est signalé, jamais arbitré côté frontend.

---

## J1 — Authentification et coquille applicative

### `/connexion` — `EcranConnexion`

| | |
|---|---|
| Fichier | `src/ecrans/connexion/EcranConnexion.tsx` |
| Accès | Public (aucune session requise) |
| Contrat API | `POST /auth/connexion` (`03_SPECIFICATIONS_API.md §2`) |

Contenu : logo COSITI (variante verticale), champs Identifiant et Mot de
passe, bouton principal unique « Se connecter ».

Comportement :
- Message d'erreur **unique** en cas d'échec — ne distingue jamais un
  identifiant inconnu d'un mot de passe incorrect (contre l'énumération de
  comptes).
- `429` (verrouillage temporaire, `03_SPECIFICATIONS_API.md §12`) affiche un
  message dédié invitant à réessayer plus tard.
- Succès avec `doitChangerMotDePasse: true` → redirection vers
  `/mot-de-passe/changer`, aucun accès à l'application avant ce changement.
- Succès sans changement requis → redirection vers la page d'origine
  (`state.depuis`) si l'utilisateur avait été redirigé par `GardeRoute`,
  sinon `/`.

États : chargement (bouton en état bloquant, libellé « Connexion en cours… »),
erreur (bandeau `Alerte` rouge au-dessus du formulaire). Pas d'état vide
(formulaire toujours affiché).

### `/mot-de-passe/changer` — `EcranChangerMotDePasse`

| | |
|---|---|
| Fichier | `src/ecrans/connexion/EcranChangerMotDePasse.tsx` |
| Accès | Session active requise (`GardeRoute` sans permission particulière) |
| Contrat API | `POST /auth/mot-de-passe/changer` (`03_SPECIFICATIONS_API.md §2`) |

Contenu : mot de passe actuel, nouveau mot de passe, confirmation. Aucune
règle de complexité n'est affirmée côté client (longueur minimale, jeux de
caractères) : c'est une politique de sécurité décidée par l'API
(`AGENTS.md` règle 2) ; seule la concordance de la confirmation est vérifiée
côté client. Toute règle refusée par l'API s'affiche telle quelle.

Succès → rafraîchissement du profil (`GET /auth/moi`, efface
`doitChangerMotDePasse`) puis redirection vers `/`.

### `AccesNonAutorise`

| | |
|---|---|
| Fichier | `src/ecrans/AccesNonAutorise.tsx` |
| Déclenché par | `GardeRoute` quand la session est active mais la permission déclarée sur la route est absente de `utilisateur.permissions` |

Message explicite, sans jargon technique, invitant à contacter le
responsable ou le Super Administrateur. Rappel : ceci est un confort
d'affichage — l'API refuserait de toute façon l'appel sous-jacent en `403`
(`docs/04_SECURITE.md §1`).

### Coquille applicative

| Composant | Rôle |
|---|---|
| `components/cositi/coquille-application.tsx` | Gabarit fixe : navigation latérale + en-tête + contenu (`docs/02_DESIGN_SYSTEM.md §8`) |
| `components/cositi/navigation-laterale.tsx` | Entrées filtrées par permission. Voir note `[V]` ci-dessous pour « Organisation terrain » |
| `components/cositi/entete-application.tsx` | Titre de l'écran courant, menu utilisateur (rôle affiché, changement de mot de passe, déconnexion) |

`TODO [V]` : `03_SPECIFICATIONS_API.md §6` (organisation terrain) ne
documente aucun code de permission par endpoint, contrairement aux adhérents
(§3) et aux paiements (§4). L'entrée de navigation « Organisation terrain »
est donc affichée à tout utilisateur connecté, sans filtre de permission,
en attendant la confirmation du code exact — voir
`Conception/SUIVI_EXECUTION.md`, tableau des décisions en attente.

Recherche globale et notifications ne sont pas construites en J1 : aucun
écran de ce document ne les spécifie encore et `03_SPECIFICATIONS_API.md §10`
(`/notifications`) n'est traité qu'à partir de J8.

---

## J2 — Adhérents

### `/adherents` — `ListeAdherents`

| | |
|---|---|
| Fichier | `src/ecrans/adherents/ListeAdherents.tsx` |
| Accès | `GardeRoute permission="ADHERENT:LIRE"` |
| Contrat API | `GET /adherents`, `GET /adherents/matricule/{matricule}`, `GET /cnps/proches-seuil`, `GET /cnps/eligibles-non-immatricules`, `POST /exports/adherents` |

Module « Gestion des adhérents » (`COSITI_GESTIONNAIRE_FRONTEND_UI_UX_97_FONCTIONNALITES.md §1`,
fonctionnalités #1 à #8, #25, #26, #34).

Filtres synchronisés dans l'URL : `recherche` (nom, prénoms, matricule — #2),
`telephone` (#4), `statut` (#5), `agentId` (#6, `SelectRecherche` alimenté par
`GET /agents`, visible avec `ORGANISATION:LIRE`), `completion` (#7 : plages
traduites en `completionMin`/`completionMax`, l'appartenance à une plage étant
décidée par la formule serveur), `page`, `tri`/`direction` (#8). Recherche et
téléphone sont **temporisés** (300 ms, `useValeurTemporisee`) avant d'atteindre
l'URL et l'API. Chaque filtre actif est affiché en puce, retirable
individuellement.

Tri serveur au clic sur matricule, adhérent, date d'adhésion, statut. Le
paramètre `tri` ne prend que les valeurs de la liste blanche du contrôleur
(`NOM`, `MATRICULE`, `DATE_ADHESION`, `STATUT`) avec `direction=ASC|DESC`.
**Corrigé** : l'écran envoyait `tri=nom,asc`, que le serveur refuse en
`400 ADHERENT_TRI_INVALIDE` — tout clic de tri vidait la liste ; le simulacre
MSW applique désormais la même liste blanche.

Accès direct par matricule (#3) : champ dédié, recherche exacte côté serveur,
ouverture de la fiche ; un matricule inexistant ou hors périmètre donne le
même message (l'API renvoie `404` dans les deux cas).

Onglets, avec `CNPS:LIRE` (`?vue=`) : « Tous les adhérents », « Proches du
seuil CNPS » (#25, bande calculée par le serveur à partir du paramètre `[V]`
`CNPS_SEUIL_PROXIMITE_RATIO`, bandeau d'avertissement affiché), « Éligibles
CNPS » (#26). Barre cumul / seuil = rapport d'affichage entre deux montants
serveur. Ligne activable → fiche.

Export CSV (#34, `EXPORT:ADHERENTS`) : dialogue de confirmation qui rappelle le
critère réellement appliqué (statut) et signale que les autres filtres ne sont
pas pris en charge par `POST /exports/adherents` (seuls `zoneId` et `statut`).

États : squelette de tableau (chargement), bandeau `Alerte` rouge (erreur),
`EtatVide` avec action « Nouvel adhérent » (liste vide), tableau + pied de
pagination avec total réel (« 172 adhérents ») sinon ; pendant un rechargement
la page précédente reste affichée. `avertissements` de l'enveloppe de liste
affichés en `AvertissementRegle` au-dessus du tableau.

Bouton « Nouvel adhérent » visible seulement avec `ADHERENT:CREER`
(Gestionnaire des comptes — retirée à l'Agent de terrain par V14, voir
`SUIVI_EXECUTION.md`).

### `/adherents/nouveau` — `NouvelAdherent`

| | |
|---|---|
| Fichier | `src/ecrans/adherents/NouvelAdherent.tsx` |
| Accès | `GardeRoute permission="ADHERENT:CREER"` |
| Contrat API | `POST /adherents`, `POST /adherents/verifier-doublon` (`03_SPECIFICATIONS_API.md §3`) |

Formulaire en 3 étapes (React Hook Form + Zod, un seul `useForm` pour tout le
formulaire, validation par étape via `trigger()`) :
1. **Identité et contact** : nom, prénoms, date de naissance, sexe, CNI,
   CNPS, téléphone principal (obligatoire), téléphone secondaire.
2. **Rattachement** : zone (`SelectRecherche`, alimenté par `GET /zones`),
   activité (`SelectRecherche`, alimenté par `GET /activites`), localisation,
   quartier, ville, date d'adhésion.
3. **Vérification et confirmation** : récapitulatif (téléphone masqué),
   résultat de `POST /adherents/verifier-doublon` (déclenché au passage de
   l'étape 2 à l'étape 3) affiché en bandeau `attention`
   **non bloquant** — la création reste possible sans action supplémentaire.

Doublon en soumission : si l'API renvoie `409 ADHERENT_DOUBLON_POTENTIEL`
(vérification faite une seconde fois côté serveur au moment d'écrire), un
`DialogueConfirmation` rappelle les candidats et demande une confirmation
explicite ; à la confirmation, le formulaire renvoie
`confirmationDoublonIgnore: true`.

**Résolu au jalon J12** — le champ « Code d'activité » était un texte libre,
faute d'endpoint de référentiel. Or `activiteId` est un **UUID obligatoire**
côté API : la saisie était refusée à chaque tentative et **aucun adhérent ne
pouvait être enregistré par l'interface**. Le défaut échappait aux tests
d'écran, qui simulent l'API ; la recette E2E l'a révélé. `GET /activites`
(lecture seule) est livré et le champ est désormais un `SelectRecherche`.

### `/adherents/:id` — `FicheAdherent`

| | |
|---|---|
| Fichier | `src/ecrans/adherents/FicheAdherent.tsx` |
| Accès | `GardeRoute permission="ADHERENT:LIRE"` |
| Contrat API | `GET/PUT /adherents/{id}` et ses sous-ressources (voir tableau), `POST /portefeuilles/affecter\|transferer`, `GET /documents?adherentId=`, `POST /documents`, `GET /cnps/dossiers?adherentId=`, `POST /cnps/dossiers`, `GET /droits/adherents/{id}[/periodes]` |

Composants : `src/ecrans/adherents/fiche/` (un fichier par bloc ou onglet),
schémas Zod partagés dans `src/ecrans/adherents/schemas.ts`.

**En-tête collant** : nom (`h1`), matricule avec bouton de copie (#11),
`BadgeStatut`, mention « Archivé », actions autorisées. Onglets synchronisés
dans l'URL (`?onglet=`) :

| Onglet | Contenu | Endpoint(s) — fonctionnalité | Visible avec |
|---|---|---|---|
| Profil | État du dossier : statut, informations, pièces, barre de complétion, champs et pièces manquants, avertissements `[V]` | `/dossier` #17, `/completion` #14 | `ADHERENT:LIRE` |
| | Parcours « Compléter le dossier » : ne propose que les champs manquants ; clé non saisissable (association : aucun référentiel exposé) listée à part | `/champs-manquants` #15, `PATCH /profil` #16 | bouton : `ADHERENT:MODIFIER` |
| | Identité (lecture) | `GET /{id}` #12 | |
| | Coordonnées, lecture / édition explicite (erreur serveur localisée, saisie conservée) | `GET/PUT /coordonnees` #31 #32 | édition : `ADHERENT:MODIFIER` |
| | Agent responsable ; affecter (motif facultatif) ou réaffecter (motif obligatoire), étape de confirmation ancien → nouvel agent | `GET /agent` #22, `POST /portefeuilles/affecter` #23, `POST /portefeuilles/transferer` #24 | actions : `ORGANISATION:AFFECTER_PORTEFEUILLE` |
| Professionnel | Activité, numéro CNPS, association, pack courant (lecture seule) ; édition activité / CNPS | `GET/PUT /professionnel` #29 #30 | édition : `ADHERENT:MODIFIER` |
| Cotisations | Résumé : validé, en attente, reste avant seuil, couvert jusqu'au, progression serveur ; situation et périodes de droits ; lien vers le journal | `/resume-cotisations` #28 ; `/droits/adherents/{id}` | résumé : `DROITS:LIRE` + `PAIEMENT:LIRE` |
| CNPS | Éligibilité (serveur) **distincte** de la complétude du dossier ; dossier CNPS existant ou ouverture confirmée | `/resume-cotisations` #27, `/dossier`, `/cnps/dossiers` | onglet : résumé ou `CNPS:LIRE` ; ouverture : `CNPS:GERER` |
| Documents | Pièces obligatoires manquantes (dépôt pré-typé), documents déposés, téléchargement via API, vérification / rejet motivé | `/documents-manquants` #18, `GET /documents` #19, `POST /documents` #20 | `DOCUMENT:LIRE` ; dépôt `DOCUMENT:TELEVERSER` ; décision `DOCUMENT:VERIFIER` |
| Historique | Chronologie : action (`BadgeStatut domaine="operationAdherent"`), date, acteur, motif ; filtre par type d'action sur la réponse reçue | `/historique` #21 | `ADHERENT:LIRE` |

Actions d'en-tête : « Modifier l'identité » (#13, `ADHERENT:MODIFIER` — le
`PUT` remplaçant toute la fiche, les champs non édités sont renvoyés tels que
lus, avec `version`), « Changer le statut » (#33, `ADHERENT:CHANGER_STATUT` :
tous les statuts sauf le courant, motif obligatoire, étape de confirmation ;
le serveur seul refuse une transition, son message est affiché),
« Archiver » (`ADHERENT:ARCHIVER`, motif obligatoire, retour à la liste).

Chaque mutation invalide la fiche entière (toutes ses sous-ressources), les
listes et les domaines dépendants (`cnps`, `documents`) ; une affectation
invalide aussi `organisation`. Aucun calcul métier côté client : complétion,
éligibilité, cumuls, pièces manquantes viennent de l'API.

Temps réel (#35) : `AdherentModifieEvent` est relayé après commit par le flux
SSE `GET /temps-reel/flux` ; la fiche et les listes ouvertes chez les autres
utilisateurs se rechargent (voir « Mise à jour en temps réel » ci-dessous).

Onglet **Adhésion** (V20) : voir « Parcours d'adhésion » ci-dessous. Un dossier
en brouillon n'est plus « soumis pour validation » (`POST /adherents/{id}/soumettre`
refusé, `ADHERENT_VALIDATION_PAR_CONTROLE_DGA`) : le bandeau renvoie vers
l'onglet Adhésion. Le changement de statut ne propose plus « Actif » à un
préinscrit (`ADHERENT_ACTIVATION_PAR_ROUTE_DEDIEE`).

Non construit : changement de pack (`POST /adherents/{id}/pack`) — V15
réserve ce circuit à une proposition Gestionnaire validée par le DAF, que
l'endpoint actuel n'implémente pas (voir `SUIVI_EXECUTION.md`) ; ayants droit.

## J3 — Organisation terrain

### `/organisation` — `EcranOrganisation`

| | |
|---|---|
| Fichier | `src/ecrans/organisation/EcranOrganisation.tsx` |
| Accès | `GardeRoute permission="ORGANISATION:LIRE"` |
| Contrat API | `03_SPECIFICATIONS_API.md §6`, vérifié directement dans le code backend réel (`COSITI_Backend/src/main/java/cm/cositi/api/organisation/`) — le pack ne détaille pas les permissions pour ce domaine |

Permissions utilisées (confirmées dans `COSITI_Backend/.../V5__catalogue_permissions.sql`,
absentes de `03_SPECIFICATIONS_API.md §6`) : `ORGANISATION:LIRE` (consulter),
`ORGANISATION:GERER` (créer un agent), `ORGANISATION:AFFECTER_PORTEFEUILLE`
(affecter/transférer), `ORGANISATION:DESIGNER_CHEF` (désigner/remplacer le
Chef, réservé DGA).

**Section Agents** : tableau (code, nom, téléphone, zone, taille de
portefeuille du mois courant via `GET /agents/{id}/charge`, statut actif).
**Le taux de retard par agent n'est pas construit** : aucun endpoint ne
l'expose encore (calcul de régularité prévu au jalon J6) — colonne
volontairement absente plutôt qu'inventée (`TODO [V]`, voir
`Conception/SUIVI_EXECUTION.md`). Actions par ligne, visibles selon
permission : « Désigner Chef » (`ORGANISATION:DESIGNER_CHEF`), « Portefeuille »
(`ORGANISATION:AFFECTER_PORTEFEUILLE`, ouvre le détail transférable).

**Section Zones** : tableau en lecture seule (code, libellé, ville, région,
statut). Création/modification de zone non construites en J3 (non
mandatées).

**Section Portefeuilles par zone** : sélecteur de zone (`SelectRecherche`),
affiche le Chef actuel de la zone (`GET /agents/chef?zoneId=`, absence
distinguée du chargement) et les adhérents sans agent référent
(`GET /portefeuilles/sans-agent`), avec action « Affecter un agent » par
ligne (`ORGANISATION:AFFECTER_PORTEFEUILLE`).

**Ajouter un agent** (`DialogueAjouterAgent`, DGA-F01) : formulaire
(identifiant de connexion, nom, téléphone, zone, objectif mensuel facultatif).
`POST /agents` renvoie un **mot de passe initial en clair, une seule fois** :
affiché dans un bandeau de succès, jamais consultable ensuite — à transmettre
à l'agent hors de l'application.

**Désigner/remplacer le Chef** (`DialogueDesignerChef`, DGA-F03/DGA-F04) :
l'écran détermine automatiquement s'il s'agit d'une désignation initiale ou
d'un remplacement en interrogeant `GET /agents/chef?zoneId=` pour la zone du
candidat. En cas de remplacement, l'ancien Chef est rappelé explicitement
dans le texte de confirmation. Motif obligatoire dans les deux cas.

**Affectation et transfert de portefeuille** (`DialogueMouvementPortefeuille`) :
affectation d'un adhérent sans agent référent (motif facultatif,
`AffecterPortefeuilleDto`) ou transfert d'un adhérent déjà suivi
(motif **obligatoire**, `TransfererPortefeuilleDto`) — la confirmation
rappelle systématiquement l'adhérent et l'agent cible.

Non construit en J3, hors mandat de la session : création/modification de
zone, transfert en lot (l'API l'accepte, l'écran ne transfère qu'un adhérent
à la fois), historique de désignation du Chef (`GET /agents/{id}/historique-chef`,
appel disponible côté `api/organisation.ts`, pas encore affiché à l'écran).

**Module agents de terrain** : le nom de chaque agent ouvre sa fiche
(`/agents/:id`). `GET /agents` et `GET /agents/{id}/portefeuille` renvoyant
désormais l'enveloppe paginée, le dialogue « Portefeuille » lit la page
maximale (200) ; la consultation paginée complète est sur la fiche agent.

## Module « Gestion des agents de terrain » (25 fonctionnalités)

Référence : `COSITI_GESTIONNAIRE_FRONTEND_UI_UX_97_FONCTIONNALITES.md §2`,
branchée sur les routes **réelles** de `ControleurAgent` et
`ControleurPortefeuille` (le document cite des routes cibles
`/agents-terrain/...` que le backend a gardées sous `/agents/...` et
`/portefeuilles/...`). Composants : `src/ecrans/agents/`, onglets de la fiche
dans `src/ecrans/agents/fiche/`.

**Rupture de contrat absorbée** : `GET /agents` renvoie une enveloppe paginée.
`listerAgents()` (référentiel des sélecteurs : filtre agent de la liste des
adhérents, affectation, saisie de paiement, droits) lit une page de 200 et
renvoie `contenu` ; la liste de l'écran utilise `listerAgentsPagines()`.

### `/agents` — `ListeAgentsTerrain`

| | |
|---|---|
| Fichier | `src/ecrans/agents/ListeAgentsTerrain.tsx`, `VueRepartition.tsx` |
| Accès | `GardeRoute permission="ORGANISATION:LIRE"` — entrée « Agents de terrain » de la navigation |
| Contrat API | `GET /agents`, `GET /agents/portefeuille-distribution`, `GET /zones`, `POST /agents` |

Onglet **Agents** (#1, #2, #21) : recherche serveur temporisée (nom, code,
téléphone), filtres statut (`actif`) et zone, tri serveur sur code, nom, zone
(liste blanche `NOM|CODE_AGENT|ZONE` + `direction`), pagination ; tout est dans
l'URL, chaque filtre actif est une puce retirable. Colonnes : code, agent (nom
+ téléphone, contre les homonymes), zone, adhérents suivis (valeur de la
répartition serveur ; « — » pour un agent inactif, que la répartition
n'inclut pas), statut (`BadgeStatut domaine="agent"`). Ligne → fiche.

Onglet **Répartition des portefeuilles** (#19) : volumes par agent actif, dans
l'ordre serveur (par nom), barre = part du total affiché ; aucun classement.

« Ajouter un agent » (#4, `ORGANISATION:GERER`, DGA) : `DialogueAjouterAgent`
(mot de passe initial affiché une fois) ; à la fermeture, la fiche du nouvel
agent s'ouvre.

### `/agents/:id` — `FicheAgentTerrain`

| | |
|---|---|
| Fichier | `src/ecrans/agents/FicheAgentTerrain.tsx`, `src/ecrans/agents/fiche/` |
| Accès | `GardeRoute permission="ORGANISATION:LIRE"` |

En-tête : nom, code, zone, mention « Chef des agents de la zone »
(`GET /agents/chef`), `BadgeStatut`. Carte Identité : téléphone, zone, objectif
mensuel, lien vers le Chef superviseur. Onglets dans l'URL (`?onglet=`) :

| Onglet | Contenu | Endpoint(s) — fonctionnalité | Visible avec |
|---|---|---|---|
| Synthèse | Adhérents suivis, dossiers complets / incomplets (liens vers `/adherents?agentId=&completion=`) | `/portefeuille/resume` #8 #10 #11 | `ORGANISATION:LIRE` ; liens `ADHERENT:LIRE` |
| | Période (mois) ; paiements, validés, en attente, annulés | `/cotisations-resume?periode=` #14 #15 | `PAIEMENT:LIRE` |
| | Charge : collecte validée / objectif serveur | `/charge?periode=` #20 | |
| | Dernière activité (type, date, auteur) | 1ʳᵉ ligne de `/operations` #22 | |
| Portefeuille | Adhérents affectés, paginé, ligne → fiche adhérent ; affecter (adhérents **sans agent** de la zone, confirmation), réaffecter (agent actuel → nouvel agent, motif obligatoire), retirer (motif obligatoire) | `/portefeuille` #9 ; `POST /portefeuilles/affecter` #16, `/retirer` #17, `/transferer` #18 | actions : `ORGANISATION:AFFECTER_PORTEFEUILLE` |
| CNPS | Proches du seuil, seuil atteint — restreints au portefeuille | `/portefeuille/cnps/proches-seuil` #12, `/eligibles` #13 | `CNPS:LIRE` |
| Activité | Chronologie des opérations ; filtre **par période seulement** (seul filtre de l'API) | `/operations?depuis=&jusqua=` #7 #23 | |
| Historique du portefeuille | Affectations ouvertes et clôturées (début, fin, motif) ; identité relue par `GET /adherents/{id}`, « hors de votre périmètre » sinon | `/portefeuille/historique` #24 | identité : `ADHERENT:LIRE` |

Actions d'en-tête : « Modifier » (#5, `PUT /agents/{id}` : nom, téléphone,
zone, objectif ; erreur serveur localisée au champ), « Désactiver / Réactiver »
(#6, état actuel → cible, motif obligatoire), « Désigner Chef »
(`DialogueDesignerChef`, `ORGANISATION:DESIGNER_CHEF`, masqué si l'agent est
déjà Chef ou inactif). Modification et statut exigent `ORGANISATION:GERER` **et**
le rôle DGA (double verrou serveur).

Toute mutation invalide le domaine `organisation` (liste, fiche, répartition,
sélecteurs) et le domaine `adherents`. Temps réel (#25) : `AgentModifieEvent`
est relayé par le flux SSE. Synthèse : carte « Frais d'adhésion collectés »
(`GET /frais-adhesion/agents/{id}/synthese`, `FRAIS_ADHESION:LIRE`).

## J4 — Cotisations

Contrat vérifié directement dans le code backend réel
(`COSITI_Backend/src/main/java/cm/cositi/api/cotisation/`) : DTO, codes
d'erreur métier et enveloppe de pagination exacts, `03_SPECIFICATIONS_API.md §4`
ne détaillant pas tous les champs (notamment l'absence de `creePar` sur
`PaiementDto`, voir plus bas).

### `/cotisations` — `JournalCotisations`

| | |
|---|---|
| Fichier | `src/ecrans/cotisations/JournalCotisations.tsx` |
| Accès | `GardeRoute permission="PAIEMENT:LIRE"` |
| Contrat API | `GET /paiements` |

Filtres dans l'URL : `statut`, `modePaiement`, et `adherentId` (porté par un
lien externe, ex. depuis `FicheAdherent` — bandeau « Filtré sur un adhérent »
avec option de retrait). Pagination et tri serveur. Colonnes : reçu
(chasse fixe), adhérent (identifiant abrégé — `03_SPECIFICATIONS_API.md` ne
retourne pas le nom de l'adhérent dans la liste, seulement son id), date,
montant (chiffres tabulaires), mode (`BadgeStatut domaine="modePaiement"`),
référence, statut (`BadgeStatut domaine="paiement"`).

**Mise en évidence des paiements mobile money sans référence** : la cellule
« Référence » affiche « Manquante » en rouge avec une icône d'alerte et une
infobulle explicative quand `modePaiement` est `ORANGE_MONEY`/`MTN_MOMO` et
`referenceTransaction` est vide — jamais silencieux.

Filtres documentés par l'API mais non construits (dates `dateDu`/`dateAu`,
recherche libre — absente du contrat backend réel pour ce endpoint) : voir
décisions en attente.

### `/cotisations/nouveau` — `NouveauPaiement`

| | |
|---|---|
| Fichier | `src/ecrans/cotisations/NouveauPaiement.tsx` |
| Accès | `GardeRoute permission="PAIEMENT:CREER"` |
| Contrat API | `POST /paiements`, en-tête `Idempotency-Key` obligatoire |

`Idempotency-Key` généré une seule fois via `crypto.randomUUID()` au montage
de l'écran (`useState(() => crypto.randomUUID())`) — **aucune valeur de
repli** : un identifiant faible romprait la garantie d'idempotence sur une
écriture financière. Référence de transaction rendue dynamiquement
obligatoire dès que le mode sélectionné est Orange Money ou MTN MoMo
(validation Zod `superRefine`, message identique à celui de l'API). Type de
paiement fixé à `COTISATION` (non exposé à l'utilisateur — hors mandat de
session que de saisir d'autres types).

### `/cotisations/:id` — `DetailPaiement`

| | |
|---|---|
| Fichier | `src/ecrans/cotisations/DetailPaiement.tsx` |
| Accès | `GardeRoute permission="PAIEMENT:LIRE"` |
| Contrat API | `GET /paiements/{id}`, `POST .../valider`, `.../corriger`, `.../annuler` |

Bouton **Valider** (`PAIEMENT:VALIDER`) : entièrement masqué sans la
permission ; **visible mais désactivé avec explication au survol** (info-bulle)
quand l'utilisateur connecté est le créateur du paiement — ce n'est pas un
masquage complet dans ce cas précis, car l'explication doit rester consultable.

`TODO [A]` — **écart de contrat détecté en construisant cet écran** :
`PaiementDto` (backend réel, vérifié à ce jalon) n'expose pas le champ
`creePar`, alors que `ServicePaiementImpl.valider` compare bien
`paiement.getCreePar()` pour refuser l'auto-validation
(`PAIEMENT_AUTO_VALIDATION_INTERDITE`, 403). Le frontend déclare le champ en
optionnel (`src/api/paiements.ts`) : si l'API l'expose un jour, le masquage
préventif fonctionnera automatiquement ; en son absence, le bouton reste
actif et l'API refuse quand même l'action avec son message explicite. Voir
`Conception/SUIVI_EXECUTION.md`.

**Corriger** (`PAIEMENT:CORRIGER`, `DialogueCorrigerPaiement`) : montant,
date, référence pré-remplis, motif obligatoire, confirmation explicite.
**Annuler** (`PAIEMENT:ANNULER`, `DialogueConfirmation` générique) : motif
obligatoire, la confirmation rappelle montant, date et adhérent.

Non construit en J4, hors mandat de la session : génération/consultation du
reçu (`GET /paiements/{id}/recu`), affectations manuelles
(`GET/POST /paiements/{id}/affectations`), remises de caisse, rapprochement
(P1).

### Statut ajouté

`INCOHERENCE` ajouté à `src/lib/statuts.ts` (domaine `paiement`) : code réel
de `cm.cositi.api.cotisation.entite.StatutPaiement` absent de la version
précédente de la table — complété, pas redéfini.

## Workflow de correction, validation et traçabilité (Maker–Checker, V19)

Référence : `COSITI_V1_BACKEND_UI_UX_MISE_A_JOUR_3_MODULES_WORKFLOW.md` (checklist §51 et §51 bis tenue à
jour). Routes réelles : `/demandes-validation/...` et, par module, `/{adherents|agents|paiements}/{id}/
statut-validation`, `/historique-validation`, `/soumettre`, `/demandes-modification` (`/demandes-correction`
pour une cotisation), `/agents/{id}/demandes-changement-statut`. Code : `src/api/workflow.ts`,
`src/hooks/useWorkflow.ts`, `src/ecrans/workflow/`.

**Principe** : proposition → justification → vérification → décision → application → audit. Le demandeur ne
décide jamais de sa propre demande ; la valeur officielle reste inchangée jusqu'à l'approbation. Les boutons
suivent `GET /auth/moi` et l'état renvoyé par le serveur (`modifiableDirectement`, demande ouverte) ; toute
décision est revérifiée par l'API (permission, rôle DAF pour la finance, auteur ≠ validateur, état, version).

### `/validations` — `EcranCentreValidation`

| | |
|---|---|
| Accès | `GardeRoute permission="ADHERENT:LIRE"` (tous les rôles métier) — entrée « Centre de validation » |
| Onglets | « À traiter » (`/en-attente` : demandes décidables, jamais les siennes), « Mes demandes » (`mesDemandes=true`), « Toutes les demandes » |
| Filtres | module, statut, type de demande — dans l'URL, pagination serveur |

### `/validations/:id` — `FicheDemandeValidation`

En-tête : référence, type, statut ; actions selon le rôle — validateur habilité : « Demander correction »,
« Rejeter » (motif obligatoire), « Approuver » (désactivés avec explication pour l'auteur) ; demandeur :
« Soumettre », « Resoumettre » (valeurs proposées corrigeables), « Annuler la demande ». Cartes : demande
(donnée concernée, dates, motif), comparaison « Valeur officielle actuelle / Valeur proposée » (« avant /
appliquée » après approbation, « valeur soumise » pour une validation initiale), justificatifs (consultation
authentifiée, ajout par téléversement puis rattachement), chronologie des transitions. Un utilisateur sans
autorité voit « Action non disponible ». Conflit de version : message et « Recharger ».

### Intégration dans les fiches

| Fiche | Brouillon / correction demandée / rejeté | En attente | Validé (officiel) |
|---|---|---|---|
| Adhérent | modification directe ; « Soumettre pour validation » (vérification : complétion, pièces) | bandeau, aucune modification directe, complétion suspendue | « Demander une modification », « Demander un changement de statut » ; complétion des champs vides seulement |
| Agent | « Modifier », « Désactiver » ; « Soumettre pour validation » | bandeau | « Demander une modification », « Demander la désactivation / réactivation » |
| Cotisation | brouillon : « Modifier » | demande de correction ouverte : « Valider » désactivé | soumise, incohérente ou validée : « Demander une correction » (DAF) |

Onglet « Validation » (adhérent, agent) et carte « Validations et demandes de modification » (cotisation) :
`GET .../historique-validation`. Liste des agents : colonne « Validation ».

## Parcours d'adhésion : frais, activation, contrôle DGA (V20)

Référence : `COSITI_V1_SPECIFICATION_COMPLETE_FRAIS_ADHESION_ACTIVATION_CONTROLE_DGA.md` (DoD §24 cochée). Routes
réelles : `/adherents/{id}/frais-adhesion|activation|activer|statut-activation|soumettre-dga|synthese-workflow|
controle-dga|controles-dga`, `/controles-dga/...`, `/frais-adhesion/...`. Code : `src/api/adhesion.ts`,
`src/hooks/useAdhesion.ts`, `src/ecrans/adhesion/`. Domaines de statut : `fraisAdhesion`, `controleDgaAdherent`,
`tourControleDga`, `correspondance`, `decisionControleDga`, `ecartFrais`, `documentControle`, `operationAdhesion`.

**Aucun calcul côté client** : montant unitaire, attendu, écart, conditions d'activation, compteurs du contrôle,
dossiers distincts soumis et `detailCalcul` viennent du serveur.

### Onglet « Adhésion » de `/adherents/:id` — `OngletAdhesion`

| Carte | Contenu | Action (permission) |
|---|---|---|
| Parcours d'adhésion | Frise : frais enregistré → activé → transmis DGA → documents contrôlés ; **deux badges distincts** statut du compte / contrôle DGA | — |
| Frais d'adhésion | Référence, statut, attendu, reçu, écart, agent collecteur, dates, anomalie et résolution | « Enregistrer le frais » (`FRAIS_ADHESION:ENREGISTRER`) : agent obligatoire (agent responsable proposé), montant reçu prérempli avec le montant serveur, date ≤ aujourd'hui, relecture, clé d'idempotence ; « Valider l'encaissement », « Résoudre l'anomalie » (`FRAIS_ADHESION:VALIDER`, masqués pour l'auteur) ; « Signaler une anomalie » (`FRAIS_ADHESION:SIGNALER`, motif obligatoire) |
| Activation et contrôle | Dates d'activation et de transmission ; contrôle courant (référence, tour, compteurs, décision) ; lien vers le contrôle | « Vérifier et activer » (`ADHERENT:ACTIVER`) : conditions serveur ✓ / ✗ avec caractère bloquant, confirmation des doublons quand c'est le seul blocage ; « Transmettre / Retransmettre à la DGA » |
| Historique des contrôles | Tours précédents (`CONTROLE_DGA:LIRE`) | — |

### `/controles-dga` — `EcranFileControleDga` (`CONTROLE_DGA:LIRE` — PCA, DG, DGA, Gestionnaire)

Indicateurs serveur : dossiers distincts soumis, retransmissions, en attente DGA, informations en anomalie.
Filtres dans l'URL : statut (« À traiter » par défaut = en attente ou en cours), période de transmission, « avec
anomalie seulement ». Tableau : contrôle, adhérent (nom + matricule), agent collecteur, gestionnaire, date, tour,
documents vérifiés, anomalies, statut. Ligne → contrôle.

### `/controles-dga/:id` — `EcranControleDga`

Résumé (compteurs serveur, dates, décision). « Démarrer le contrôle » (`CONTROLE_DGA:EFFECTUER`, statut en attente).
Une carte par document : pièce téléchargeable (`DOCUMENT:LIRE`), « Document manquant », « Illisible » (commentaire
obligatoire, appliqué à toutes ses informations) ; tableau « Enregistré dans COSITI / Lu sur le document /
Résultat / Commentaire », « Correspond » en un clic, « Autre résultat… » (valeur lue obligatoire pour « ne
correspond pas », commentaire obligatoire hors « correspond »). Finalisation : « Valider le dossier », « Demander
une correction », « Rejeter » (commentaire obligatoire sauf validation, clé d'idempotence) ; avertissement quand les
compteurs reçus montrent des anomalies ou des informations non vérifiées, refus serveur affiché. Journal du
contrôle (`GET /controles-dga/{id}/journal`). L'utilisateur qui a transmis le dossier ne voit aucune action
(`CONTROLE_DGA_AUTO_CONTROLE_INTERDIT` imposé par le serveur). Conflit de version : message dédié.

### `/frais-adhesion` — `EcranFraisAdhesion` (`FRAIS_ADHESION:LIRE` — PCA, DG, DGA, DAF, Gestionnaire)

Montant unitaire en description (`GET /frais-adhesion/configuration`, bandeau si règle non confirmée). Filtres
période et agent dans l'URL. **Rapprochement** : « dossiers distincts soumis × montant unitaire = montant attendu »
en trois blocs, `detailCalcul` du serveur, montant enregistré, écart en chiffres **et en toutes lettres**, alerte
d'écarts, tableau des dossiers en écart (`ecartFrais`), frais hors soumission. Synthèse de la période (nombre,
attendu, reçu, écart, par statut). Liste paginée filtrable (statut, écarts seulement) avec les actions du DAF.

## Mise à jour en temps réel

Flux SSE `GET /api/v1/temps-reel/flux` (backend `cm.cositi.api.tempsreel`), lu par `fetch` en streaming dans
`api/client.ts` (`ecouterFlux`) — `EventSource` ne peut pas porter l'en-tête `Authorization`, et le jeton ne passe
jamais dans l'URL. `app/FournisseurTempsReel.tsx` ouvre **un** flux par onglet tant que la session est connectée ;
`hooks/useTempsReel.ts` regroupe les signaux (300 ms) et invalide les familles de requêtes de
`CLES_PAR_DOMAINE` (`api/tempsReel.ts`). Le signal ne porte aucune donnée métier : la ressource est relue par
l'API, qui applique permissions et périmètre. Reconnexion immédiate à la fermeture normale (toutes les 10 minutes,
jeton relu), progressive (2 s → 30 s) après une erreur, puis invalidation complète. En-tête : indicateur
« En direct / Connexion… / Hors ligne » (`IndicateurTempsReel`, libellé écrit, `role="status"`). La cloche de
notifications garde son rechargement périodique comme filet de sécurité.

## V21 — Règles à valider, matrice documentaire et notifications actionnables

Journal : `journal_des_actions_frontEnd/2026-10-02_V21_reduction_regles_en_attente_frontend.md`.

### `/regles` — `EcranRegles`

| | |
|---|---|
| Accès | `GardeRoute unePermissionParmi={["ADMINISTRATION:LIRE", "REGLE:VALIDER"]}` — entrée « Règles à valider » (section Système) |
| Contrat API | `GET /regles/en-attente`, `POST /regles/parametres/{cle}/valider`, `GET /exigences-documentaires`, `PUT /regles/exigences/{id}`, `POST /regles/exigences/{id}/valider` |

Indicateurs serveur (paramètres à valider, propositions, exigences à confirmer). Onglet « Règles provisoires » :
nature, règle, valeur appliquée, statut, dernière modification ; « Confirmer » (`REGLE:VALIDER`, PCA) avec la
référence de la décision COSITI comme motif obligatoire — la valeur ne change pas. Onglet « Matrice documentaire »
(`?onglet=matrice`) : rubrique, pièce ou information, niveau, contrôle DGA, bloquante, période, statut ; « Modifier »
(`DialogueModifierExigence` : niveau, condition, DGA, activation, période, motif, version, conflit signalé) et
« Confirmer » (rappel : une pièce obligatoire confirmée devient bloquante). Sans `REGLE:VALIDER` : consultation seule.

### Checklist documentaire — `ChecklistDocumentaire`

`GET /adherents/{id}/checklist-documentaire`. Par pièce : niveau, statut calculé (`statutPiece`), « Bloque
l'activation », version, validité, contrôle DGA, condition, règle non confirmée signalée ; par information : valeur
COSITI et dernier résultat DGA. Compteurs, `pretPourActivation`, avertissements. Actions « Ajouter cette pièce » /
« Remplacer » (`DOCUMENT:TELEVERSER`). Affichée dans l'onglet **Documents** (remplace `documents-manquants`), l'onglet
**Adhésion** (carte « Pièces justificatives ») et le dialogue d'activation (« Pièces à traiter »).

### Documents — téléversement V21

Types proposés depuis la matrice en vigueur (`GET /exigences-documentaires?enVigueur=true`) plus « Autre » ;
caractère de la pièce rappelé ; « Valable du / jusqu'au » facultatifs ; **remplacement** d'une pièce (version
active) avec motif obligatoire — l'ancienne version reste listée, au statut « Remplacé ». Colonnes « Version » et
« Validité » (« Expirée ») dans le tableau des documents.

### Compléments d'écrans existants

- Contrôle DGA : résultat « Non applicable » (sans motif) ; « Valider le dossier » suit `validable`, les `blocages`
  serveur sont listés ; carte « Correction demandée par la DGA » avec « Corriger le dossier et retransmettre » pour le
  Gestionnaire (`ADHERENT:ACTIVER`).
- Fiche adhérent : association choisie dans `GET /associations` (Informations professionnelles et Compléter le
  dossier) ; après création, ouverture sur l'onglet Adhésion.
- Cotisation validée : carte « Répartition du versement » (`GET /paiements/{id}/affectations`, libellé de composante
  et règle appliquée renvoyés par le serveur).
- Audit : colonne « Corrélation » (`correlationId`).

### Notifications actionnables

Une notification est poussée à son destinataire par le flux temps réel (message `notification`, après commit) :
`AlertesNotifications` (sous le routeur) affiche aussitôt une alerte de 15 s avec un bouton d'action
(`libelleActionNotification` : « Traiter la demande », « Contrôler le dossier », « Corriger le dossier »…) qui marque
la notification lue et ouvre l'écran où répondre (`cheminNotification`). La cloche affiche la même action. Routes
d'ouverture des objets sans écran propre : `/frais-adhesion/:id` (→ onglet Adhésion de l'adhérent) et
`/bilans-caisse/ouvrir/:id` (→ `/bilans-caisse?date=`), avec message et lien de repli si l'objet est inaccessible.

## V22 — Dossier adhérent, cotisations réparties, historiques

Journal : `docs/journal_des_actions_frontEnd/2026-10-04_V22_dossier_cotisations_historique_frontend.md`.

- **Fiche adhérent** : bouton « Historique » dans l'en-tête ; Identité avec numéros CNI / CNPS ; Coordonnées avec
  WhatsApp et e-mail (lecture et édition — **les deux `PUT` renvoient toujours ces champs**, sinon ils seraient
  effacés) ; carte **« Comptes de l'adhérent »** (`GET /synthese-cotisations`, `PAIEMENT:LIRE`) : comptes Sécurité
  Sociale et Épargne (solde validé, en attente, opérations), cumuls, progression CNPS, « Enregistrer une cotisation »
  (`PAIEMENT:CREER`, `/cotisations/nouveau?matricule=`).
- **`/adherents/nouveau`** : plus de pack (choisi à la première cotisation) ; WhatsApp et e-mail facultatifs.
- **`/cotisations/nouveau`** : étape 1 recherche par matricule (`GET /paiements/contexte-adherent`, résumé, blocages
  serveur) ; étape 2 date, montant total, **Sécurité Sociale / Épargne** (minimums lus du serveur, reste à répartir
  affiché), pack si `packRequis`, mode, référence, agent ; récapitulatif avant envoi ; une `Idempotency-Key` par
  saisie ; message de succès avec le statut renvoyé par le serveur.
- **Détail / correction d'une cotisation** : répartition enregistrée affichée ; correction de la répartition avec le
  montant.
- **Onglet Historique** : « Historique général » et « Historique financier » (`PAIEMENT:LIRE` ou
  `FRAIS_ADHESION:LIRE`), période (jour / semaine / mois / année + date) et ordre envoyés au serveur, pagination
  serveur, données sensibles masquées par le serveur, état 403 « Historique non accessible ».
- **Accès** : « DAF » réservé à `PAIEMENT:VALIDER` ou `RAPPORT_DAF:LIRE` ; file « Contrôle DGA » à
  `CONTROLE_DGA:LIRE` + (`CONTROLE_DGA:EFFECTUER` ou `RAPPORT_DAF:LIRE`) — navigation **et** routes ; « À traiter »
  du centre de validation réservé aux détenteurs d'un droit de décision.

## Module « Gestion des cotisations » (36 fonctionnalités)

Référence : `COSITI_GESTIONNAIRE_FRONTEND_UI_UX_97_FONCTIONNALITES.md §3`. Les
routes cibles `/cotisations/...` du document sont servies par le backend sous
`/paiements/...` (convention J4) et `/bilans-caisse/...` ; c'est ce contrat réel
qui est branché. **Cette section prévaut sur les sections J4/J5 ci-dessus.**

Statuts ajoutés à `src/lib/statuts.ts` : `REJETE` (domaine `paiement`),
domaines `bilanCaisse` (`SAISI`, `VALIDE`, `ANOMALIE`) et `operationPaiement`
(historique). Chaque mutation invalide le domaine `paiements`, les bilans de
caisse, les adhérents (résumé des cotisations), les droits et les statistiques
d'agent. Temps réel (#36) : `PaiementModifieEvent` est relayé par le flux SSE
(paiements et bilans de caisse).

**Défaut corrigé** : les colonnes triables du journal et de la file DAF
n'avaient pas d'accesseur ; TanStack ne les déclarait pas triables et le clic
de tri était sans effet. Le tri est maintenant serveur, sur la liste blanche
`DATE_PAIEMENT|MONTANT|NUMERO_RECU|STATUT|DATE_SAISIE`.

### `/cotisations` — `JournalCotisations`

| # | UI |
|---|---|
| 1, 6, 7 | Tableau paginé et trié par le serveur ; filtres statut (7 statuts officiels), mode, période `dateDu`/`dateAu` (une période inversée n'est pas envoyée, un bandeau l'explique) ; tout dans l'URL, chaque filtre en puce retirable |
| 2 | `?adherentId=` (lien depuis la fiche adhérent ou la fiche paiement) |
| 3 | Champ « Matricule de l'adhérent », temporisé, `adherentMatricule` serveur |
| 4, 28 | Filtre « Agent encaisseur » (`ORGANISATION:LIRE`) ; lien vers la synthèse de l'agent (`/agents/:id`) |
| 5 | Champ « N° de reçu ou référence », temporisé, `reference` serveur ; état vide explicite si introuvable |
| — | Colonne adhérent : nom + matricule relus par `GET /adherents/{id}` (identifiant abrégé si hors périmètre) |
| 27 | Onglet « Statistiques du jour » : date de référence, nombre et montant, tableaux par statut et par mode |
| 34 | « Exporter (CSV) » (`EXPORT:PAIEMENTS` — DAF, DG, DGA) : dialogue rappelant les critères réellement appliqués (statut, période) et ceux que l'export ignore |

### `/cotisations/nouveau` — `NouveauPaiement` (`PAIEMENT:CREER` — Agent, Gestionnaire)

- #12 : carte de l'adhérent choisi (nom, matricule, statut, zone) avant l'envoi.
- #11 : montant contrôlé en forme (strictement positif), date bornée à aujourd'hui ;
  erreurs serveur placées sur le champ concerné (`champ`).
- #13 : `POST /paiements/verifier-doublon` avant l'envoi. Référence déjà
  utilisée → erreur sur le champ, rien n'est envoyé ; doublons potentiels →
  dialogue listant les paiements du serveur, « Enregistrer quand même ». Si le
  contrôle préalable échoue techniquement, l'enregistrement reste possible (le
  serveur refait le contrôle bloquant).
- #9, #14 : « Enregistrer le paiement » (entre dans la file de contrôle) ou
  « Enregistrer comme brouillon » (`?brouillon=true`).
- #10, #35 : numéro de reçu annoncé après création ; clé `Idempotency-Key`
  générée au montage et réutilisée pour tout nouvel essai ; boutons désactivés
  pendant l'envoi.

### `/cotisations/:id` — `DetailPaiement`

Actions proposées selon la permission **et** le statut courant (le serveur
reste juge et son refus est affiché tel quel) :

| Action | Permission | Statut |
|---|---|---|
| Soumettre au contrôle (#14) | `PAIEMENT:CREER` | `BROUILLON` |
| Valider (#16) — dialogue de contrôle complet (reçu, adhérent, montant, date, mode, référence) | `PAIEMENT:VALIDER` (DAF) | `A_CONTROLER`, désactivé pour l'auteur |
| Rejeter (#17) — motif obligatoire, définitif | `PAIEMENT:VALIDER` | `A_CONTROLER`, `INCOHERENCE`, désactivé pour l'auteur |
| Corriger / Modifier (#19) — revue **avant / après**, seuls les champs modifiés envoyés ; motif obligatoire sauf brouillon | `PAIEMENT:CORRIGER`, ou `PAIEMENT:CREER` pour l'auteur d'un brouillon | `BROUILLON`, `A_CONTROLER`, `INCOHERENCE` |
| Annuler (motif) | `PAIEMENT:ANNULER` | tout sauf `ANNULE`, `REJETE` |
| Signaler une incohérence | `PAIEMENT:SIGNALER_INCOHERENCE` | `A_CONTROLER` |
| Confirmer la collecte | `PAIEMENT:CONFIRMER_CHEF` | — (motif désormais en paramètre de requête : il était envoyé dans le corps et ignoré) |

Cartes : Informations (montant, date, mode, référence, adhérent et agent liés à
leur fiche, auteur et date de saisie, confirmation du Chef) ; « Cotisations de
l'adhérent » (#20 validé, #21 en attente → journal filtré, #22 reste avant
seuil, #23 progression, #26 — `DROITS:LIRE` + `PAIEMENT:LIRE`) ; « Historique
des statuts » (#18). Bandeaux : brouillon, incohérence, rejet (motif et date).

### `/daf` — `EcranDaf` (file à valider, #15)

File `statut=A_CONTROLER`, plus anciens d'abord, tri serveur. Actions de
ligne : Confirmer (#16), Signaler une incohérence, **Rejeter** (#17, motif).

### `/bilans-caisse` — `EcranBilanCaisse` (#29 à #33)

| | |
|---|---|
| Accès | `GardeRoute permission="BILAN_CAISSE:LIRE"` (PCA, DG, DGA, DAF, Gestionnaire) — entrée « Bilan de caisse » |
| Contrat API | `GET /paiements/bilan-journalier`, `GET/POST /bilans-caisse`, `POST /bilans-caisse/{date}/valider`, `/anomalie` |

Date du bilan dans l'URL. Carte « Bilan numérique » (#29) : paiements, total
enregistré, montant **à retrouver en caisse**, définition provisoire (modes et
statuts inclus, avertissement `[V]`), détail par mode, heure de génération.
Carte « Rapprochement » (#31) : statut, numérique, caisse, écart en grands
chiffres **et en toutes lettres** (« Manque / Excédent en caisse », « Aucun
écart »), alerte si des paiements ont changé depuis la saisie, motif
d'anomalie, validation. Actions : « Saisir la caisse physique » (#30,
`BILAN_CAISSE:SAISIR` — Gestionnaire ; aucun bilan ou anomalie ; saisie puis
relecture des deux montants), « Valider le bilan » (#32, `BILAN_CAISSE:VALIDER`
— DAF ; `version` transmise), « Signaler une anomalie » (#33, description
obligatoire). Décision masquée à l'auteur de la saisie. Historique paginé des
bilans, filtrable par statut ; une ligne ouvre la date.

---

## J5 — Contrôle DAF (E11)

`03_SPECIFICATIONS_ECRANS.md` ne contenait pas encore de section E11 avant ce
jalon (aucun écran DAF n'existait) : le mandat de session l'annonçait comme
« déjà reconstituée » — vérifié inexact au moment de coder, section écrite
ici pour la première fois plutôt que corrigée sur une base qui n'existait
pas.

Écart de contrat détecté **puis résolu en cours de lot** : le mandat
annonçait deux endpoints DAF « déjà documentés en `§4-5` »
(`confirmer-chef`, `signaler-incoherence`). Vérifié en tout début de jalon
dans `03_SPECIFICATIONS_API.md` et dans le code backend d'alors : ni l'un ni
l'autre n'existait. Une session backend dédiée a livré le module J5/J6 **en
parallèle de ce lot frontend** ; une fois son code disponible, vérifié
directement (même méthode qu'en J3/J4) plutôt que de rester sur l'inférence
initiale :

- **`PAIEMENT:CONFIRMER_CHEF`** (`POST /paiements/{id}/confirmer-chef`,
  motif facultatif) correspond à UC-CHEF-10 (« Confirmer une collecte »),
  réservée au rôle `CHEF_AGENT_TERRAIN` et à son périmètre de supervision
  (`ServicePaiementImpl.verifierPerimetreChefSurEncaisseur`). **Ne change
  pas** le statut du paiement : seuls `confirmeParChefId`/`confirmeLe` sont
  renseignés. C'est une action **distincte** de « Valider ».
- **`PAIEMENT:VALIDER`** (`POST /paiements/{id}/valider`, déjà réel depuis
  J4) reste l'action de confirmation financière du DAF (UC-DAF-04
  « Confirmer un paiement »), inchangée.
- **`PAIEMENT:SIGNALER_INCOHERENCE`** (`POST /paiements/{id}/signaler-incoherence`,
  motif obligatoire, UC-DAF-05) — chemin et permission inférés par le
  frontend en début de lot se sont révélés **identiques** au code backend
  livré ensuite. Réservée au rôle `DAF` ; transition vers `INCOHERENCE`,
  résolue uniquement par `corrigerPaiement` (qui rouvre le paiement au
  contrôle).

Les deux permissions (`PAIEMENT:CONFIRMER_CHEF`, `PAIEMENT:SIGNALER_INCOHERENCE`)
sont confirmées dans `V8__permissions_j5_j6.sql` (backend). Détail complet
dans `Conception/SUIVI_EXECUTION.md`.

### `/daf` — `EcranDaf`

| | |
|---|---|
| Fichier | `src/ecrans/daf/EcranDaf.tsx` |
| Accès | `GardeRoute permission="PAIEMENT:LIRE"` (même permission que `/cotisations` — la file de contrôle n'est qu'une vue filtrée du même journal, pas un périmètre de lecture distinct) |
| Contrat API | `GET /paiements?statut=A_CONTROLER` (`03_SPECIFICATIONS_API.md §4`, réutilisé sans modification) |

File des paiements au statut `A_CONTROLER`, filtre fixe (ce n'est pas un
filtre proposé à l'utilisateur : c'est la définition même de l'écran).
Réutilise `usePaiements` et les colonnes communes du domaine paiement,
extraites dans `src/ecrans/cotisations/colonnesPaiement.tsx`
(`colonnesPaiementBase`) pour que la mise en évidence d'une référence mobile
money manquante ne soit écrite qu'à un seul endroit — `JournalCotisations`
(J4) a été refactoré dans le même lot pour consommer ces mêmes colonnes,
aucune règle de présentation métier n'est dupliquée entre les deux écrans.
Filtre additionnel : mode de paiement (`BarreFiltres`, mêmes options que
`JournalCotisations`).

Colonne « Actions » par ligne (workflow DAF, la file étant spécifiquement le
contrôle financier) :
- **Confirmer** (`PAIEMENT:VALIDER`, transition « Valider ») : bouton
  visible mais désactivé avec explication au survol si l'utilisateur
  connecté est le créateur du paiement — même garde-fou que
  `DetailPaiement` (J4).
- **Signaler une incohérence** (`PAIEMENT:SIGNALER_INCOHERENCE`) :
  `DialogueConfirmation` générique, motif obligatoire, rappelle montant,
  date et adhérent — même gabarit que l'annulation d'un paiement (J4).

Un paiement confirmé ou signalé sort de cette file (elle ne montre que
`A_CONTROLER`) et reste consultable, avec sa nouvelle teinte, dans
`/cotisations` (`BadgeStatut domaine="paiement"` : la teinte danger de
`INCOHERENCE` a été ajoutée dès J4, aucune extension de
`src/lib/statuts.ts` n'était nécessaire à ce jalon).

### `DetailPaiement` (`/cotisations/:id`, J4) — compléments J5

- **« Signaler une incohérence »** (`PAIEMENT:SIGNALER_INCOHERENCE`), à côté
  de Valider/Corriger/Annuler, même `DialogueConfirmation` motif obligatoire.
  Un bandeau `Alerte` rouge affiche `motifIncoherence` quand
  `statut === "INCOHERENCE"`.
- **« Confirmer la collecte »** (`PAIEMENT:CONFIRMER_CHEF`, UC-CHEF-10) :
  action du Chef des agents de terrain, distincte de « Valider » — motif
  facultatif, un simple clic suffit (pas de `DialogueConfirmation`, la
  confirmation n'étant pas destructive et le motif n'étant pas requis côté
  contrat). Désactivée avec explication si déjà confirmée
  (`confirmeParChefId`) ou si le paiement est `ANNULE`/`INCOHERENCE`. Une
  ligne d'information (« Confirmée le… » / « Non confirmée ») est visible
  dans la carte Informations, quelle que soit la permission de l'utilisateur
  connecté — c'est un fait déjà survenu, pas une action.

Non construit en J5, hors mandat de la session : production et transmission
du rapport DAF au PCA (`POST /daf/rapports`, `[A]`, prévu J5/J10 par
`Conception/JALONS_PROJET_COSITI.md`), rapprochement (`PAIEMENT:RAPPROCHER`,
P1).

---

## J6 — Droits et régularité

Contrat documenté dans `COSITI_Backend/docs/03_SPECIFICATIONS_API.md §5`. En
tout début de lot, aucun paquet `cm.cositi.api.droits` n'existait côté
backend : construit contre le seul contrat documenté et testé par MSW,
même posture que le reste du projet depuis J1. Une session backend dédiée a
livré le module en parallèle de ce lot ; une fois son code disponible,
`src/api/droits.ts` a été vérifié et aligné dessus (même méthode qu'en
J3/J4) — voir l'écart ci-dessous, réel et non anodin.

**Écart de contrat significatif, détecté à la lecture du code réel** :
`03_SPECIFICATIONS_API.md §5` donne un exemple de réponse pour
`GET /droits/adherents/{id}` qui inclut un champ `pack` ; le DTO réel
(`SituationDroitsDto`) **ne l'a pas**. Plus notable encore : l'exemple
illustratif ne couvrait pas `GET /droits/retardataires`, et le DTO réel
(`AdherentEnRetardDto`) est **beaucoup plus sobre** que ce que le mandat de
session demandait à l'écran — seuls `adherentId`, `matricule`, `nomComplet`,
`couvertJusquAu`, `joursRetard` sont renvoyés. Ni pack, ni cumul cotisé, ni
agent, ni zone, ni statut de régularité. L'écran `/droits` n'affiche donc
que ces cinq champs ; les colonnes demandées mais absentes de la réponse
réelle sont documentées comme non construites plutôt qu'inventées
(`AGENTS.md` règle 2 : le client affiche, il ne complète pas une donnée
manquante par une supposition).

Écart de contrat consolidé dans ce lot : `03_SPECIFICATIONS_API.md §3`
documentait déjà `GET /adherents/{id}/situation` (même forme d'exemple),
repris par J2 avant que le domaine `droits` n'existe. `src/api/adherents.ts`
et `src/hooks/useAdherents.ts` sont nettoyés du doublon
(`obtenirSituationAdherent`/`useSituationAdherent`) : `FicheAdherent`
consomme désormais uniquement `src/api/droits.ts` /
`src/hooks/useDroits.ts`, branchés sur l'endpoint canonique du domaine
`droits` (`GET /droits/adherents/{id}`).

`DROITS:LIRE` (utilisé depuis J2 par anticipation) et `DROITS:RECALCULER`
sont désormais confirmés réels par `V8__permissions_j5_j6.sql` :
`DROITS:LIRE` est accordé à tous les rôles métier (PCA, DG, DGA, DAF,
Gestionnaire des comptes, Chef des agents de terrain, Agent de terrain),
jamais à `SUPER_ADMIN` ; `DROITS:RECALCULER` est réservé DAF/SUPER_ADMIN.

### `/droits` — `EcranDroits`

| | |
|---|---|
| Fichier | `src/ecrans/droits/EcranDroits.tsx` |
| Accès | `GardeRoute permission="DROITS:LIRE"` |
| Contrat API | `GET /droits/retardataires` (`03_SPECIFICATIONS_API.md §5`, vérifié dans `ControleurDroits`/`ServiceRegulariteImpl`, backend réel) |

Liste des retardataires : matricule, adhérent, couvert jusqu'au, jours de
retard — **seuls champs réellement renvoyés par `AdherentEnRetardDto`**, voir
l'écart ci-dessus. Le tri par retard décroissant est **fixe côté serveur**
(`ServiceRegulariteImpl.retardataires`, `.sorted(...).reversed()`, aucun
paramètre `tri` accepté par le contrôleur) : l'écran ne propose donc pas de
bascule de tri, contrairement à `ListeAdherents` (J2).

Filtres confirmés par le contrôleur réel (`CritereRetard`) : zone, agent,
jours de retard minimum (`SelectRecherche` pour zone/agent, réutilisant
`useZones`/`useAgents` de J3 — aucune règle d'organisation terrain redéfinie
ici). `TODO [V]` : le filtre `packId` existe côté contrat (il attend l'UUID
du pack, pas son code lisible du type `PACK_700`) mais n'est pas exposé à
l'écran, faute d'endpoint de référentiel des packs pour le résoudre depuis
un code — même situation que `packId` sur `GET /adherents`, non construit en
J2.

Action « créer une campagne de relance à partir de la sélection » (mandat de
session) **non construite** : `TODO [A]`, bouton en permanence désactivé
avec infobulle explicative — `/relances` et `/campagnes-relance`
(`03_SPECIFICATIONS_API.md §10`, jalon J8) ne sont ni documentés en détail
ni implémentés. Aucune mécanique de sélection multi-ligne n'a été construite
pour une action qui n'existe pas encore côté serveur (`AGENTS.md` règle 10).

### `FicheAdherent` — complément « Situation de droits » et « Périodes de droits »

| | |
|---|---|
| Fichier | `src/ecrans/adherents/fiche/OngletCotisations.tsx` (dans la fiche depuis J2, déplacé dans l'onglet « Cotisations » par le module adhérents) |
| Contrat API | `GET /droits/adherents/{id}`, `GET /droits/adherents/{id}/periodes` (`§5`), tous deux réservés à `DROITS:LIRE` |

La carte « Situation de droits » (J2) est désormais alimentée par
`useSituationDroits` (`src/hooks/useDroits.ts`) et complétée des champs
« Jours couverts (cumul) » (`joursCouvertsTotal`, absent avant ce jalon) et
« Statut de régularité » (`BadgeStatut domaine="regularite"`, valeurs
`StatutRegularite` du backend — `A_JOUR`/`PARTIELLEMENT_A_JOUR`/`EN_RETARD`/
`JAMAIS_COTISE`, déjà présentes dans `src/lib/statuts.ts` depuis J1/J2). Le
champ `pack` de l'exemple du pack technique n'est **pas** affiché : absent
du DTO réel (voir l'écart ci-dessus). Aucun calcul n'est fait côté client :
tous les champs et les avertissements de règle `[V]` non validée (ex.
reliquat non imputé) viennent tels quels de la réponse API, affichés en
bandeau `AvertissementRegle` persistant — même traitement que les autres
écrans depuis J1.

Nouvelle carte « Périodes de droits » : tableau des périodes renvoyées par
`GET /droits/adherents/{id}/periodes` (date de début, date de fin, jours
couverts, **montant imputé** — `montantImpute`, champ réel non anticipé au
début du lot —, statut `BadgeStatut domaine="periodeDroits"`). Domaine
étendu dans ce même lot : `ANNULEE` ajouté à `src/lib/statuts.ts` (code réel
de `cm.cositi.api.droits.entite.StatutPeriode`, absent de la version
précédente qui ne connaissait que `COUVERTE`/`PARTIELLE`).

Non construit en J6, hors mandat de la session : recalcul manuel des droits
(`POST /droits/adherents/{id}/recalculer`, réservé `DAF`/`ADMIN_SYSTEME`,
motif obligatoire — endpoint disponible côté contrat mais aucune action
d'écran ne le déclenche à ce jour).

---

## Suite

Les écrans des jalons **J7 à J11** (CNPS et documents, relances et comptes
rendus, les six tableaux de bord, rapports/exports/audit, administration) sont
documentés dans [`03_SPECIFICATIONS_ECRANS_J7_J11.md`](03_SPECIFICATIONS_ECRANS_J7_J11.md).
Ce fichier a été scindé pour rester lisible : il couvrait déjà 526 lignes à la
fin de J6.

## Entretien de ce document

Un écran ajouté, modifié ou retiré se documente ici **dans le même lot de
travail** que le code correspondant (`AGENTS.md §8`). Ne jamais décrire un
écran par anticipation d'un jalon non encore livré.
