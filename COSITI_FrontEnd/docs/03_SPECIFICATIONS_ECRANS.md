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
   code d'activité, localisation, quartier, ville, date d'adhésion.
3. **Vérification et confirmation** : récapitulatif (téléphone masqué),
   résultat de `POST /adherents/verifier-doublon` (déclenché au passage de
   l'étape 2 à l'étape 3) affiché en bandeau `attention`
   **non bloquant** — la création reste possible sans action supplémentaire.

Doublon en soumission : si l'API renvoie `409 ADHERENT_DOUBLON_POTENTIEL`
(vérification faite une seconde fois côté serveur au moment d'écrire), un
`DialogueConfirmation` rappelle les candidats et demande une confirmation
explicite ; à la confirmation, le formulaire renvoie
`confirmationDoublonIgnore: true`.

`TODO [V]` : le champ « Code d'activité » est un champ texte libre, faute
d'un endpoint de référentiel des activités documenté dans
`03_SPECIFICATIONS_API.md` (seule la table `activite` existe côté schéma
backend). À remplacer par un `SelectRecherche` dès que l'endpoint existe.

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

## Entretien de ce document

Un écran ajouté, modifié ou retiré se documente ici **dans le même lot de
travail** que le code correspondant (`AGENTS.md §8`). Ne jamais décrire un
écran par anticipation d'un jalon non encore livré.
