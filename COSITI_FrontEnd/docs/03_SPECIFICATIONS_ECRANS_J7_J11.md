# 03b — Spécifications des écrans, jalons J7 à J11

Suite de [`03_SPECIFICATIONS_ECRANS.md`](03_SPECIFICATIONS_ECRANS.md), qui
couvre J1 à J6. Même convention : un écran ajouté, modifié ou retiré se
documente **dans le même lot de travail** que le code correspondant, et jamais
par anticipation d'un jalon non livré.

---

## J7 — CNPS et documents

### `/cnps` — `ListeDossiersCnps`

**Permission d'accès** : `CNPS:LIRE` (PCA, DG, DGA, DAF, Gestionnaire des
comptes — V9). Le Chef et l'Agent de terrain n'ont pas ce domaine.

Deux onglets, qui répondent à deux questions différentes du Gestionnaire :

| Onglet | Question | Source |
|---|---|---|
| Dossiers | « où en sont les dossiers ouverts ? » | `GET /cnps/dossiers` |
| Éligibles non immatriculés | « qui devrait avoir un dossier et n'en a pas ? » | `GET /cnps/eligibles-non-immatricules` |

**Actions** : ouvrir un dossier pour un adhérent éligible (`CNPS:GERER`
uniquement — masqué sinon), filtrer par statut.

**États** : chargement (squelette), erreur (message de l'API), vide (invite à
passer par l'onglet des éligibles).

**Point de vigilance** : l'éligibilité est calculée par l'API sur le seuil du
**pack de l'adhérent**, jamais sur un seuil global. L'écran affiche le cumul et
le seuil côte à côte mais ne les compare pas lui-même.

### `/cnps/:id` — `FicheDossierCnps`

**Permission d'accès** : `CNPS:LIRE`.

Trois blocs : cycle de vie du dossier, pièces, déclarations mensuelles.

**Actions par permission** :

| Action | Permission | Règle |
|---|---|---|
| Changer le statut | `CNPS:CHANGER_STATUT` | Seules les transitions du graphe serveur sont proposées ; le motif est obligatoire pour un rejet |
| Ajouter une pièce | `CNPS:GERER` | Ouvre `DialogueTeleverserDocument` puis rattache le document |
| Préparer / transmettre une déclaration | `CNPS:DECLARER` | |

**Avertissements affichés tels quels** : `PIECES_CNPS_OBLIGATOIRES` et
`ASSIETTE_CNPS` ne sont pas validés par la COSITI ; l'API renvoie ces messages
dans `avertissements`, l'écran les affiche sans les reformuler.

**Non construit** : saisie du `revenu_mensuel_declare` — l'assiette étant
`[V]`, aucun champ ne le demande tant que la règle n'est pas arbitrée.

### `DialogueTeleverserDocument` (composant partagé)

Aucun contrôle de format côté client au-delà de l'attribut `accept`, qui n'est
qu'un confort de saisie : c'est le serveur qui identifie le type réel par
signature binaire et refuse le fichier. Filtrer sérieusement ici donnerait
l'illusion d'une protection que le navigateur ne peut pas offrir.

---

## J8 — Relances et comptes rendus

### `/comptes-rendus` — `ListeComptesRendus`

**Permission d'accès** : `COMPTE_RENDU:LIRE`.

Un seul écran pour les trois rôles de la chaîne, parce qu'ils regardent le même
objet à trois moments différents. Les onglets suivent les permissions réelles :

| Onglet | Permission | Contenu |
|---|---|---|
| Mes comptes rendus | — | Ce que l'utilisateur a produit |
| À contrôler | `COMPTE_RENDU:CONTROLER` | File de travail du Gestionnaire |
| À consolider | `COMPTE_RENDU:CONSOLIDER` | Comptes rendus contrôlés, prêts à être agrégés |

L'onglet d'arrivée dépend du rôle : le Gestionnaire ouvre directement sur sa
file de contrôle, qui est son travail attendu.

**Aucune addition côté client**, y compris pour l'aperçu de sélection : les
totaux d'un consolidé sont calculés par le serveur.

### `/comptes-rendus/nouveau` — `NouveauCompteRendu`

**Permission d'accès** : `COMPTE_RENDU:PRODUIRE` (Agent et Chef).

Le compte rendu est créé **en brouillon** : rien ne part au Gestionnaire avant
une transmission explicite. Les indicateurs sont saisis, jamais pré-remplis
depuis les paiements enregistrés — un compte rendu est une déclaration de
l'agent, et l'écart éventuel avec la base est précisément ce que le
Gestionnaire contrôle.

### `/comptes-rendus/:id` — `FicheCompteRendu`

Actions proposées selon le statut **renvoyé par l'API**, jamais une copie
locale du cycle de vie : transmettre n'apparaît que sur un brouillon dont on est
l'auteur, contrôler que sur un compte rendu transmis dont on n'est pas l'auteur.

Un consolidé affiche la liste de ses sources, chacune ouvrable : la DGA peut
remonter d'un chiffre au compte rendu terrain qui l'a produit.

### `/relances` — `EcranRelances`

**Permission d'accès** : `RELANCE:LIRE`.

Onglets Campagnes et Relances effectuées. Les critères d'une campagne sont
affichés **tels qu'ils ont été enregistrés** : ils tracent ce qui a motivé la
campagne, ils ne sont pas rejoués pour recalculer une cible.

**Action** : clôturer une campagne (`RELANCE:GERER_CAMPAGNE`), irréversible et
confirmée.

### `ClocheNotifications` (en-tête)

Compteur de notifications non lues, rafraîchi toutes les 2 minutes —
volontairement sans temps réel : la connexion terrain est lente et ce n'est pas
une donnée critique. Ouvrir une notification la marque lue et navigue vers
l'objet concerné **quand un écran existe pour lui** ; sinon elle est seulement
marquée lue, plutôt que de mener à un lien mort.

### `/droits` — complément J8

Le bouton « Créer une campagne de relance », désactivé en J6 faute d'endpoint
(`TODO [A]`), est branché sur `POST /campagnes-relance`. Les filtres actifs de
l'écran deviennent les critères enregistrés de la campagne.

---

## J9 — Les six tableaux de bord

**Six écrans, pas un de plus** (`Roles des acteurs.md §2` et `§11`) : PCA, DG,
DGA, DAF, Gestionnaire des comptes, Super Administrateur. Le Chef des agents de
terrain et l'Agent de terrain n'en ont **pas**.

| Route | Permission | Particularité |
|---|---|---|
| `/tableaux-de-bord/pca` | `TABLEAU_BORD:PCA` | Zones + rapports DAF transmis |
| `/tableaux-de-bord/dg` | `TABLEAU_BORD:DG` | Zones + retards |
| `/tableaux-de-bord/dga` | `TABLEAU_BORD:DGA` | Zones, agents, comptes rendus consolidés |
| `/tableaux-de-bord/daf` | `TABLEAU_BORD:DAF` | File de contrôle, écarts de caisse |
| `/tableaux-de-bord/gestionnaire` | `TABLEAU_BORD:GESTIONNAIRE` | CNPS, déclarations, comptes rendus |
| `/tableaux-de-bord/super-admin` | `TABLEAU_BORD:SUPER_ADMIN` | **Aucune donnée métier nominative** |

### `/` — `AccueilSelonRole`

Redirige selon les **permissions** de `GET /auth/moi`, jamais selon le rôle.
L'Agent et le Chef, sans dashboard, arrivent sur `/adherents`. Tant que le
profil n'est pas chargé, aucune redirection n'est décidée.

### Composants de visualisation

| Composant | Rôle | Règle |
|---|---|---|
| `CarteIndicateur` | Valeur mise en avant | Une valeur seule n'est pas un graphique : chiffre + libellé, pas de dessin |
| `GraphiqueZones` | Comparaison des zones | Barres horizontales, **une seule série et une seule teinte**, **une seule mesure à la fois** — jamais deux échelles ; tableau des chiffres exacts accessible d'un bouton |
| `ListeAlertes` | Points à traiter | Icône + libellé écrit : la couleur ne porte jamais l'information seule |

Le serveur renvoie des **ratios** (0,3314) et l'unité de mise en forme, jamais
une chaîne déjà formatée : deux endpoints ne doivent pas formater différemment
la même donnée.

---

## J10 — Rapports, exports, audit

### `/rapports` — `EcranRapportsDaf`

**Permission d'accès** : `RAPPORT_DAF:LIRE` (PCA, DAF, DG, DGA).

Un seul écran pour les deux bouts du flux DAF → PCA. Les boutons suivent les
permissions : le PCA ne voit ni « Produire » ni « Transmettre ».

**Production** : aucun champ de montant. Les chiffres sont constatés par le
serveur sur la période puis **figés** — c'est ce qui permet de relire dans six
mois le rapport qui a fondé une décision.

**Transmission** : confirmée, irréversible, et rappelée comme telle.

### `/audit` — `EcranAudit`

**Permission d'accès** : `AUDIT:CONSULTER`.

**Lecture seule sans exception** : aucune action de modification ni de purge,
même pour un administrateur. Les valeurs avant/après ne sont pas affichées — les
exposer dans une liste ferait du journal une porte dérobée vers le référentiel.
Le motif, lui, est visible : c'est ce qui explique une opération.

### Exports

Bouton « Exporter (CSV) » sur `/adherents` (`EXPORT:ADHERENTS`), reprenant les
filtres actifs. L'export est journalisé côté serveur et la notification le
rappelle à l'utilisateur.

---

## J11 — Administration

### `/administration` — `EcranAdministration`

**Permission d'accès** : `ADMINISTRATION:LIRE` (Super Administrateur seul).

Trois onglets : Comptes, Rôles, Paramètres.

**Trois absences volontaires**, qui sont des décisions et non des oublis :

1. **Aucun bouton de suppression** — un compte se désactive, il ne s'efface pas
   (`AGENTS.md` règle absolue n°3).
2. **Aucune création de rôle** — les huit rôles V1 sont fermés ; l'onglet les
   affiche en lecture avec leurs permissions effectives.
3. **Aucun champ de mot de passe** — il est généré par le serveur et révélé une
   seule fois. Laisser un administrateur choisir le mot de passe d'un autre en
   ferait un secret partagé dès sa création.

**Paramètres** : le statut de validation (`C` / `A` / `V`) est affiché pour
chaque règle, avec une légende expliquant ce qu'il implique. Toute modification
exige un motif ; le type attendu est rappelé, mais c'est le serveur qui refuse
une valeur incompatible.

---

## Entretien de ce document

Même règle que le document principal : un écran ajouté, modifié ou retiré se
documente ici **dans le même lot de travail** que le code correspondant
(`AGENTS.md §8`).
