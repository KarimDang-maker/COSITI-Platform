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
| Contrat API | `GET /adherents` (`03_SPECIFICATIONS_API.md §3`) |

Filtres synchronisés dans l'URL (`?recherche=&statut=&page=`) : recherche
libre (matricule, nom, téléphone, CNI) et statut. Pagination **serveur**
(`?page=&taille=25`), tri serveur au clic sur les en-têtes triables
(matricule, adhérent, date d'adhésion). Colonnes : matricule (chasse fixe),
adhérent, téléphone (`formaterTelephone`), zone, date d'adhésion
(`formaterDate`), statut (`BadgeStatut domaine="adherent"`).

Filtres documentés par l'API mais **non construits en J2** (référentiels
associés non consommés faute de temps) : `zoneId`, `agentId`, `activiteId`,
`packId`, `associationId`, `sansAgentReferent`, `dateAdhesionDu/Au`. À
ajouter quand ces référentiels seront exposés par un écran ou un sélecteur.

États : squelette de tableau (chargement), bandeau `Alerte` rouge (erreur),
`EtatVide` avec action « Nouvel adhérent » (liste vide), tableau + pied de
pagination avec total réel (« 172 adhérents ») sinon. `avertissements` de
l'enveloppe de liste affichés en `AvertissementRegle` au-dessus du tableau.

Bouton « Nouvel adhérent » visible seulement avec `ADHERENT:CREER`.

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
| Contrat API | `GET /adherents/{id}` ; `GET /adherents/{id}/situation` si `DROITS:LIRE` |

Identité et coordonnées, statut (`BadgeStatut`), bloc « Situation de droits »
affiché seulement avec la permission `DROITS:LIRE` (avec ses propres
`avertissements` en `AvertissementRegle` — ex. reliquat non imputé, règle
`[V]`). Lien vers `/cotisations?adherentId=<id>` plutôt qu'un tableau de
paiements dupliqué dans la fiche (le journal des cotisations, J4, est la
source unique de cette liste).

Non construit en J2, hors mandat de la session : gestion des ayants droit
(`GET/POST/DELETE /adherents/{id}/ayants-droit`), changement de pack
(`POST /adherents/{id}/pack`), modification (`PUT /adherents/{id}`),
archivage et changement de statut manuels. À spécifier dans un jalon
ultérieur si le besoin est confirmé.

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
| Fichier | `src/ecrans/adherents/FicheAdherent.tsx` (existant depuis J2) |
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
