# COSITI V1 — Rôles, droits, workflows et spécification du backend

> **Nature du document :** spécification fonctionnelle et technique de la V1, à valider par la direction puis à suivre par les équipes backend (Spring Boot) et frontend (React).
> **Sources :** analyse du frontend existant (`RAPORT.md`), document « COSITI V1 — Correction des droits, hiérarchie, visibilité et workflow », consignes de la direction.
> **Date :** 24 septembre 2026
> **Conventions :** « DOIT » = obligatoire ; « RECOMMANDÉ » = à arbitrer ; ⚠️ = point à valider (repris au §13).

---

## Sommaire

1. [Principes directeurs](#1-principes-directeurs)
2. [Acteurs et organisation](#2-acteurs-et-organisation)
3. [Fiches des rôles : qui fait quoi](#3-fiches-des-rôles--qui-fait-quoi)
4. [Matrice des droits : rôle, module, action, API](#4-matrice-des-droits--rôle-module-action-api)
5. [Règles de visibilité et d'audit](#5-règles-de-visibilité-et-daudit)
6. [Workflows métier](#6-workflows-métier)
7. [Règles de gestion](#7-règles-de-gestion)
8. [Modèle de données V1](#8-modèle-de-données-v1)
9. [Backend Spring Boot](#9-backend-spring-boot)
10. [Adaptations du frontend existant](#10-adaptations-du-frontend-existant)
11. [Conflits entre l'existant et la V1](#11-conflits-entre-lexistant-et-la-v1)
12. [Tests d'acceptation obligatoires](#12-tests-dacceptation-obligatoires)
13. [Points à valider par la direction](#13-points-à-valider-par-la-direction)
14. [Plan de mise en œuvre](#14-plan-de-mise-en-œuvre)

---

## 1. Principes directeurs

Ces principes priment sur toute autre règle du document. En cas de doute sur un droit, on revient à eux.

| # | Principe | Conséquence concrète |
|---|---|---|
| P1 | **Un droit est attribué pour une fonction, pas pour un rang.** Un supérieur n'obtient pas une fonctionnalité parce qu'il est le chef, mais parce que sa fonction l'exige. | Le PCA, le DG ou la DGA ne peuvent pas créer un adhérent ni valider un paiement. |
| P2 | **Le chef a un droit de regard et d'arbitrage, pas un droit de modification.** | Un supérieur consulte le travail de ses subordonnés et rend des décisions motivées (approuver, rejeter, renvoyer pour correction). La correction est faite par l'acteur responsable, jamais par le chef à sa place. |
| P3 | **Séparation des tâches.** Celui qui saisit ne valide pas ; celui qui valide ne saisit pas. | La Gestionnaire des comptes enregistre un paiement « À VALIDER » ; seul le DAF le valide. |
| P4 | **Aucune substitution.** Aucun acteur n'agit au nom d'un autre, et aucun compte n'est partagé. | Pas de « bascule de profil » ; le Super Administrateur ne peut agir à la place d'aucun rôle métier. Un PCA qui souhaite l'inscription d'un adhérent **adresse la demande** à la Gestionnaire des comptes, qui la réalise sous son propre compte. |
| P5 | **Pas de visibilité ascendante.** Un utilisateur ne voit jamais les actions internes des acteurs situés au-dessus de lui. | La Gestionnaire ne voit pas le journal du DAF, de la DGA, du DG, du PCA ni du Super Administrateur. |
| P6 | **Le backend est la seule autorité.** Le frontend gère l'affichage ; l'API accepte ou refuse. | Une action cachée dans l'interface est aussi refusée par l'API (HTTP 403). |
| P7 | **Rien ne disparaît.** Aucune suppression physique de donnée métier ou historique ; on désactive, on annule, on contre-passe. | Désactivation logique des profils ; annulation motivée des paiements ; effacement exceptionnel soumis à une procédure (§6.10). |
| P8 | **Tout est tracé.** Chaque action significative produit une entrée d'audit et une copie dans la base de sauvegarde. | Y compris les consultations sensibles, les exports et la génération de rapports d'audit. |
| P9 | **Pas de données fictives.** | Le jeu de démonstration et la réinitialisation démo sont retirés du produit. |

**Définitions utiles**

- **Droit de regard (R) :** lecture du travail des subordonnés de son périmètre, y compris leur historique fonctionnel.
- **Arbitrage (A) :** décision motivée et tracée sur un objet produit par un subordonné. La donnée n'est pas modifiée par l'arbitre.
- **Périmètre :** ensemble des objets qu'un utilisateur peut atteindre, défini par son rôle, sa zone, son équipe et ses affectations.
- **Zone :** périmètre géographique ou organisationnel (ex. un marché, un quartier). **Ce n'est pas un rôle.**
- **Portefeuille :** ensemble des adhérents affectés à un agent de terrain.
- **Statut métier vs action interne :** voir le statut d'un objet (ex. « paiement validé » ou « rejeté : motif ») est une information fonctionnelle ; voir le journal des actions d'un autre acteur (qui, quand, quoi, depuis où) est de l'audit. Le premier peut être visible par le saisissant ; le second suit les règles du §5.

---

## 2. Acteurs et organisation

### 2.1 Les huit rôles V1

| Code | Rôle | Nature |
|---|---|---|
| PCA | Président du Conseil d'Administration | Supervision globale, audit global, gestion des profils de l'équipe |
| DG | Directeur Général | Pilotage général |
| DGA | Directeur(trice) Général(e) Adjoint(e) | Pilotage opérationnel, agents de terrain, campagnes |
| DAF | Directeur Administratif et Financier | Contrôle et validation financière |
| GC | Gestionnaire des comptes (gestionnaire des portefeuilles clients) | Création et gestion des adhérents, saisie des paiements, CNPS (immatriculations et télédéclarations) |
| CAT | Chef des agents de terrain | Supervision terrain |
| AT | Agent de terrain | Exécution terrain |
| SA | Super Administrateur | Administration du système, audit, sécurité |

**Aucun autre rôle ne doit être créé.** En particulier : pas de « Responsable de zone », pas de rôle « Adhérent ».

### 2.2 Correspondance avec le frontend existant

| Existant | V1 | Commentaire |
|---|---|---|
| Caissière & Agent d'enregistrement | **Gestionnaire des comptes (GC)** | Même personne, périmètre redéfini (création des adhérents, CNPS), mais **perte de la validation des encaissements**. |
| DG, DGA, DAF, PCA | Inchangés | Droits fortement réduits (principe P1). |
| Conseil de Surveillance | **Super Administrateur (SA)** ⚠️ | La direction désigne ce profil comme « superadmin / surveillance ». |
| Administrateur, Agent d'enregistrement, Agent de consultation | **Supprimés** | Rôles hérités sans titulaire. |
| Entité « Gestionnaire de portefeuille » (fiche GP-XXX, sans connexion) | **Agent de terrain (AT)**, désormais utilisateur connecté | Le portefeuille, la zone et l'objectif mensuel sont conservés. Le libellé « Gestionnaires (Portefeuille) » du menu doit être renommé pour éviter la confusion avec la Gestionnaire des comptes. |
| Rôle « Adhérent » | **Objet métier, pas un utilisateur** | Voir §2.4. |

### 2.3 Organigramme et chaînes

```
                                 PCA ───────────── mémo ─────────────► Super Administrateur
                                  │                                    (administration, audit ;
                   ┌──────────────┼──────────────┐                      hors chaîne métier)
                   │                             │
                   DG                           DAF  (rapporte au PCA ⚠️)
                   │
                  DGA
                   │
        Gestionnaire des comptes ◄──── organisation terrain ────► Chef des agents de terrain
                   │                                                      │ supervision
                   └──────────────── Agents de terrain ◄──────────────────┘
```

| Chaîne | Circuit |
|---|---|
| **Opérationnelle terrain** | Agent de terrain → Gestionnaire des comptes → DGA |
| **Supervision terrain** | Chef des agents de terrain → Agents de terrain (regard) ; le Chef travaille avec la Gestionnaire |
| **Financière** | Gestionnaire (saisie) → DAF (contrôle et validation) |
| **Reporting ascendant** | AT → GC ; CAT → GC ; GC → DGA ; DGA → DG ; DG → PCA ; DAF → PCA ⚠️ ; SA → PCA |
| **Mémos descendants** | Un supérieur vers un acteur de sa chaîne ; PCA → SA pour les actions d'administration (désactivation, effacement, paramètres) |

### 2.4 L'adhérent : un objet, pas un utilisateur

- L'adhérent **n'a ni compte de connexion ni tableau de bord** en V1.
- Il est représenté par un **profil unique** portant : identité, profil professionnel, pack, préférence d'allocation, statut, affectation terrain, informations CNPS, et **ses deux comptes métier** (Sécurité sociale et Épargne, §7.2).
- **Un seul profil par adhérent** (contrôle de doublon sur CNI et téléphone). Le modèle est conçu pour qu'une application mobile adhérent puisse être branchée plus tard sur ce même profil.
- Il ne faut pas confondre : **profil utilisateur** (un membre COSITI qui se connecte), **rôle** (fonction de ce membre), **profil adhérent** (objet métier) et **compte financier de l'adhérent** (Sécurité sociale ou Épargne).

---

## 3. Fiches des rôles : qui fait quoi

Chaque fiche distingue ce que le rôle **exécute**, ce sur quoi il a un **droit de regard ou d'arbitrage**, et ce qui lui est **interdit**.

### 3.1 PCA — Président du Conseil d'Administration

**Mission :** supervision globale et contrôle de l'ensemble de l'activité.

| Exécute | Regard / arbitrage | Interdit |
|---|---|---|
| Consulter l'**audit global en temps réel** | Regard sur toute l'activité métier (adhérents, paiements, CNPS, terrain, campagnes) | Créer ou modifier un adhérent (il passe par une demande à la GC) |
| **Créer et désactiver les profils** de son équipe (tous rôles sauf SA ; les agents de terrain sont créés par la DGA) ⚠️ | Consulter les rapports du DAF et du DG | Valider, modifier ou annuler un paiement ; se substituer au DAF |
| Émettre des **mémos** vers le SA (désactivation, paramètres, effacement) | Arbitrer les litiges remontés par ses rapporteurs directs | Exporter, imprimer ou générer en PDF l'audit (réservé au SA) |
| Recevoir et traiter les rapports du DG, du DAF et du SA | | Modifier le travail d'un subordonné |
| **Co-valider l'effacement de données** avec le SA (§6.10) | | |

### 3.2 DG — Directeur Général

**Mission :** pilotage général de la COSITI.

| Exécute | Regard / arbitrage | Interdit |
|---|---|---|
| Consulter le tableau de bord de pilotage et les indicateurs | Regard sur l'activité de la DGA et de la chaîne opérationnelle | Voir l'audit global |
| Gérer l'**agenda de direction** (rendez-vous, partenaires, notes) avec la DGA | Arbitrer les dossiers remontés par la DGA | Créer ou modifier un adhérent, un paiement ou un dossier CNPS |
| Consulter la liste des adhérents (lecture) | Consulter les données financières de pilotage (agrégats) ⚠️ | Voir les actions internes du PCA et du SA |
| Envoyer ses rapports au PCA, traiter ceux de la DGA | | |

### 3.3 DGA — Directeur(trice) Général(e) Adjoint(e)

**Mission :** pilotage opérationnel.

| Exécute | Regard / arbitrage | Interdit |
|---|---|---|
| **Créer les comptes des agents de terrain** | Regard sur le travail de la GC, du Chef et des agents (portefeuilles, résultats, relances) | Voir l'audit global et les actions internes du DG, du PCA, du DAF et du SA |
| **Désigner le Chef des agents de terrain** et modifier cette désignation | Arbitrer : objectifs de recouvrement proposés, radiation d'un adhérent, litiges terrain ⚠️ | Créer ou modifier un adhérent |
| **Créer les campagnes de relance** et en recevoir le rapport | | Exécuter les relances ou voir la vue d'exécution détaillée |
| Gérer l'agenda de direction avec le DG | | Valider un paiement |
| Recevoir les rapports de la GC, envoyer les siens au DG | | |

### 3.4 DAF — Directeur Administratif et Financier

**Mission :** seul acteur de la **validation et de la modification financière définitive**.

| Exécute | Regard / arbitrage | Interdit |
|---|---|---|
| **Contrôler et valider** (ou rejeter avec motif) les paiements « À VALIDER » | Regard sur les paiements saisis par la GC | Créer un adhérent ; modifier ses informations générales (identité, profil professionnel, affectation, CNPS) |
| **Corriger** une donnée financière validée (motif obligatoire, historique ancienne / nouvelle valeur) | | Voir l'audit global |
| **Annuler** une opération quand le workflow l'autorise | | Voir les actions internes des autres directions |
| Valider les changements de pack ou d'allocation d'un adhérent ⚠️ | | Accéder à l'agenda de direction (droit supprimé, principe P1) |
| Gérer la **trésorerie** : dépenses courantes, versements bancaires, frais Mobile Money, synthèse | | |
| Payer à la CNPS les montants télédéclarés par la GC ⚠️ | | |
| Produire ses rapports ; consulter son historique fonctionnel ; rapporter au PCA | | |

### 3.5 GC — Gestionnaire des comptes

**Mission :** gestion du portefeuille clients de la COSITI. **Seule personne autorisée à créer un adhérent**, et responsable de **toutes les actions CNPS** faites pour un adhérent sur la plateforme.

| Exécute | Regard / arbitrage | Interdit |
|---|---|---|
| **Créer un adhérent**, avec son profil professionnel choisi dans les référentiels (catégorie, profession, secteur…) | Regard sur le travail des agents de terrain et du Chef (résultats, relances, comptes rendus) | Valider un paiement ; modifier une donnée financière validée |
| Modifier les informations générales et le statut d'un adhérent (motif) | | Voir les actions internes du DAF, de la DGA, du DG, du PCA et du SA |
| Enregistrer le **pack**, le montant de référence, la **préférence d'allocation** et sa date | | Voir l'audit global |
| **Enregistrer les paiements en statut « À VALIDER »** ; corriger sa propre saisie tant qu'elle n'est pas validée | | Créer un agent de terrain ou désigner le Chef |
| **CNPS :** enregistrer les informations d'immatriculation obtenues hors plateforme, gérer les **télédéclarations**, gérer les dossiers de prestations et leurs pièces | | |
| **Organiser le terrain avec le Chef** : zones, portefeuilles, répartition des adhérents | | |
| Affecter et exécuter les relances des campagnes ; suivre les résultats des agents | | |
| Recevoir les rapports des agents et du Chef ; transmettre ses rapports à la DGA | | |

### 3.6 CAT — Chef des agents de terrain

**Mission :** supervision des agents de terrain de son périmètre.

| Exécute | Regard / arbitrage | Interdit |
|---|---|---|
| Organiser le terrain **avec la GC** (zones, portefeuilles, répartition) | Regard sur les agents de son équipe : portefeuilles, relances, résultats | Voir la liste globale des adhérents |
| Suivre les portefeuilles et les relances affectés à son équipe ⚠️ | | Voir l'audit global ou les actions de ses supérieurs |
| Produire ses comptes rendus et les transmettre à la GC | | Créer un adhérent, valider un paiement, modifier une donnée financière |

### 3.7 AT — Agent de terrain

**Mission :** exécution sur le terrain, dans son portefeuille.

| Exécute | Regard / arbitrage | Interdit |
|---|---|---|
| Consulter **son portefeuille** et les adhérents qui lui sont affectés (données nécessaires à son travail) | Aucun | Voir la liste globale des adhérents |
| Exécuter les **relances qui lui sont affectées** et saisir un résultat structuré | | Créer définitivement un adhérent (au plus une pré-inscription, ⚠️) |
| **Recueillir la recommandation d'allocation** d'un adhérent (paiement supérieur à 1 000 FCFA) sous forme de donnée structurée | | Valider un paiement ; modifier une donnée financière |
| Recueillir les informations et pièces terrain autorisées | | Voir les actions de la GC ou de tout supérieur ; voir l'audit |
| Envoyer un rapport à la GC | | |

### 3.8 SA — Super Administrateur

**Mission :** administration technique du système, sécurité et audit. **Ce n'est pas un acteur métier.**

| Exécute | Regard / arbitrage | Interdit |
|---|---|---|
| Consulter l'**audit global** et les **événements de sécurité** | Aucun sur le métier | Se substituer à un rôle, quel qu'il soit |
| **Seul à exporter, imprimer et générer en PDF l'audit** (chaque export est lui-même audité) | | Créer un adhérent, saisir ou valider un paiement, toute action CNPS |
| Administration technique des comptes : réinitialisation de mot de passe, déverrouillage | | Désactiver un utilisateur **sans mémo du PCA** |
| **Désactiver un utilisateur uniquement sur mémo du PCA** envoyé sur la plateforme (mémo et action journalisés) | | Modifier la matrice des droits sans mémo du PCA ⚠️ |
| Gérer les rôles, permissions, référentiels et paramètres techniques ⚠️ | | |
| **Co-valider l'effacement de données** avec le PCA (§6.10) | | |

---

## 4. Matrice des droits : rôle, module, action, API

**Légende :** **E** exécute · **V** valide · **L** lecture complète · **P** lecture limitée au périmètre · **R** regard (supervision) · **A** arbitrage · **—** interdit, l'API renvoie 403.

### 4.1 Adhérents

| Action | PCA | DG | DGA | DAF | GC | CAT | AT | SA | API |
|---|---|---|---|---|---|---|---|---|---|
| Liste complète | L | L | L | L | L | — | — | L ⚠️ | `GET /adherents` |
| Liste du périmètre | — | — | — | — | — | P | P | — | `GET /adherents?scope=mine` |
| Fiche adhérent | L | L | L | L | L | P | P | L ⚠️ | `GET /adherents/{id}` |
| Créer | — | — | — | — | **E** | — | — ⚠️ | — | `POST /adherents` |
| Modifier les informations générales et le profil professionnel | — | — | — | — | **E** | — | — | — | `PATCH /adherents/{id}` |
| Changer le statut (suspendre, radier) | — | — | A ⚠️ | — | **E** | — | — | — | `POST /adherents/{id}/statut` |
| Pack et préférence d'allocation (à la création) | — | — | — | — | **E** | — | — | — | inclus dans `POST /adherents` |
| Changement ultérieur de pack ou d'allocation | — | — | — | **V** | **E** (demande) | — | — | — | `POST /adherents/{id}/allocation-changes` puis `/validate` ⚠️ |
| Recommandation d'allocation (supérieure à 1 000 F) | — | — | — | — | L | P | **E** | — | `POST /adherents/{id}/recommandations` |
| Suppression physique | — | — | — | — | — | — | — | — | **aucune route** (P7) |
| Export | L | L | L | L | L | — | — | — | `GET /adherents/export` |

### 4.2 Paiements et comptes adhérent

| Action | PCA | DG | DGA | DAF | GC | CAT | AT | SA | API |
|---|---|---|---|---|---|---|---|---|---|
| Enregistrer un paiement (statut « À VALIDER ») | — | — | — | — | **E** | — | — ⚠️ | — | `POST /paiements` |
| Corriger sa saisie avant validation | — | — | — | — | **E** | — | — | — | `PATCH /paiements/{id}` si `A_VALIDER` et auteur |
| Valider ou rejeter | — | — | — | **V** | — | — | — | — | `POST /paiements/{id}/validation` |
| Corriger un paiement validé (motif) | — | — | — | **E** | — | — | — | — | `POST /paiements/{id}/corrections` |
| Annuler (motif) | — | — | — | **E** | demande | — | — | — | `POST /paiements/{id}/annulation` |
| Consulter les paiements | L | P (agrégats) ⚠️ | L | L | L | — | — | — | `GET /paiements` |
| Situation « à jour / en retard » d'un adhérent | L | L | L | L | L | P | P | — | `GET /adherents/{id}/situation` |
| Soldes des comptes Sécurité sociale et Épargne | L | L | L | L | L | — | — ⚠️ | — | `GET /adherents/{id}/comptes` |
| Reçu | — | — | — | L | **E** | — | — | — | `GET /paiements/{id}/recu` (provisoire ou définitif, ⚠️) |

### 4.3 CNPS

| Action | PCA | DG | DGA | DAF | GC | CAT | AT | SA | API |
|---|---|---|---|---|---|---|---|---|---|
| Enregistrer l'immatriculation obtenue hors plateforme (n°, date, justificatif) | — | — | — | — | **E** | — | — | — | `POST /adherents/{id}/immatriculation` |
| Télédéclarations : préparer, déclarer, joindre l'accusé | — | — | — | P (montants) | **E** | — | — | — | `/cnps/teledeclarations` |
| Paiement à la CNPS des montants déclarés | — | — | — | **E** ⚠️ | L | — | — | — | `POST /cnps/teledeclarations/{id}/paiement` |
| Dossiers de prestations : créer, pièces, statut | — | — | — | — | **E** | — | — | — | `/dossiers` |
| Pièces collectées sur le terrain | — | — | — | — | V | — | E ⚠️ | — | `POST /dossiers/{id}/pieces/{pid}/proposition` |
| Consulter | L | L | R | P | L | P | P | — | `GET /dossiers`, `GET /cnps/…` |

### 4.4 Organisation terrain

| Action | PCA | DG | DGA | DAF | GC | CAT | AT | SA | API |
|---|---|---|---|---|---|---|---|---|---|
| Créer un compte d'agent de terrain | — | — | **E** | — | — | — | — | — | `POST /terrain/agents` |
| Désigner ou changer le Chef | — | — | **E** | — | — | — | — | — | `PUT /terrain/chef` |
| Zones : créer, modifier | — | — | R | — | **E** | **E** | — | — | `/terrain/zones` |
| Affecter les adhérents aux agents | — | — | R | — | **E** | **E** | — | — | `POST /terrain/affectations` |
| Objectifs de recouvrement | — | R | A ⚠️ | — | E (proposition) | E (proposition) | — | — | `/terrain/objectifs` |
| Performance des agents | R | R | R | — | L | P | P (la sienne) | — | `GET /terrain/performance` |

### 4.5 Campagnes de relance

| Action | PCA | DG | DGA | DAF | GC | CAT | AT | SA | API |
|---|---|---|---|---|---|---|---|---|---|
| Créer une campagne | — | — | **E** | — | — | — | — | — | `POST /campagnes` |
| Voir la campagne et la vue d'exécution | — | — | définition + rapport | — | L | P ⚠️ | P (ses relances) | — | `GET /campagnes/{id}/relances` |
| Affecter les relances aux agents | — | — | — | — | **E** | E ⚠️ | — | — | `POST /campagnes/{id}/affectations` |
| Saisir un résultat structuré | — | — | — | — | **E** | — | **E** | — | `POST /relances/{id}/resultat` |
| Rapport de campagne | — | — | L | — | L | — | — | — | `GET /campagnes/{id}/rapport` |

### 4.6 Finances COSITI (trésorerie)

| Action | PCA | DG | DGA | DAF | GC | CAT | AT | SA | API |
|---|---|---|---|---|---|---|---|---|---|
| Dépenses, versements bancaires, frais Mobile Money : saisir, corriger, annuler | — | — | — | **E** | — | — | — | — | `/finances/*` |
| Synthèse de trésorerie | L | P (agrégats) ⚠️ | — | L | — | — | — | — | `GET /finances/synthese` |
| Rapports du DAF | L | L ⚠️ | — | E | — | — | — | — | `GET /finances/rapports` |

### 4.7 Agenda de direction

| Action | PCA | DG | DGA | DAF | GC | CAT | AT | SA | API |
|---|---|---|---|---|---|---|---|---|---|
| Rendez-vous, partenaires, notes | — ⚠️ | **E** | **E** | — | — | — | — | — | `/direction/*` |
| Notes « Confidentiel DG / DGA » | — | L | L | — | — | — | — | — | filtrées côté serveur |

### 4.8 Reporting, mémos et notifications

| Action | PCA | DG | DGA | DAF | GC | CAT | AT | SA | API |
|---|---|---|---|---|---|---|---|---|---|
| Envoyer un rapport à son supérieur direct | — | → PCA | → DG | → PCA ⚠️ | → DGA | → GC | → GC | → PCA | `POST /rapports-internes` |
| Lire et traiter les rapports reçus | ses rapports reçus | idem | idem | — | idem | — | — | — | `GET /rapports-internes?boite=reception` |
| Émettre un mémo descendant | E (y compris vers SA) | E | E | — | E (vers AT, CAT) | E (vers AT) | — | — | `POST /memos` |
| Notifications | les siennes | les siennes | les siennes | les siennes | les siennes | les siennes | les siennes | les siennes | `GET /notifications`, `GET /notifications/stream` |

### 4.9 Utilisateurs, audit, paramètres et système

| Action | PCA | DG | DGA | DAF | GC | CAT | AT | SA | API |
|---|---|---|---|---|---|---|---|---|---|
| Créer un profil utilisateur | **E** (sauf AT et SA) ⚠️ | — | **E** (AT seulement) | — | — | — | — | — | `POST /utilisateurs` |
| Désactiver un profil | **E** | — | — | — | — | — | — | **E sur mémo du PCA** | `POST /utilisateurs/{id}/desactivation` |
| Réinitialiser un mot de passe, déverrouiller | — | — | — | — | — | — | — | **E** | `POST /utilisateurs/{id}/reset-password` |
| Annuaire interne (emails masqués hors besoin) | L | P | P | P | P | P | — | L | `GET /utilisateurs` |
| Rôles et permissions | L | — | — | — | — | — | — | **E** ⚠️ | `/admin/roles` |
| **Audit global temps réel** | **L** | — | — | — | — | — | — | **L** | `GET /audit`, `GET /audit/stream` |
| **Exporter, imprimer, PDF de l'audit** | — | — | — | — | — | — | — | **E** | `POST /audit/exports` |
| Historique fonctionnel (le sien et celui de ses subordonnés) | — | E | E | E | E | E | E (le sien) | — | `GET /activite` |
| Référentiels (catégories, professions, secteurs) et paramètres métier | L | L | L | L | L | — | — | **E sur mémo du PCA** ⚠️ | `/admin/referentiels`, `/admin/parametres` |
| **Effacement de données** | **E (initie ou confirme)** | — | — | — | — | — | — | **E (initie ou confirme)** | `/admin/effacements` (§6.10) |

---

## 5. Règles de visibilité et d'audit

### 5.1 Niveaux hiérarchiques

| Niveau | Rôles |
|---|---|
| 1 | PCA |
| 2 | DG, DAF |
| 3 | DGA |
| 4 | Gestionnaire des comptes |
| 5 | Chef des agents de terrain |
| 6 | Agent de terrain |
| hors chaîne | Super Administrateur |

### 5.2 Qui voit les actions de qui

| Acteur | Voit les actions de | Ne voit jamais |
|---|---|---|
| PCA | **Toute la plateforme** (audit global, temps réel) | — |
| SA | **Toute la plateforme** (audit global et sécurité) | — |
| DG | Les siennes, DGA, GC, CAT, AT | PCA, DAF ⚠️, SA |
| DGA | Les siennes, GC, CAT, AT ; les actions communes (campagnes) | DG, PCA, DAF, SA |
| DAF | Les siennes (historique fonctionnel) ; les saisies de paiement de la GC | DG, DGA, PCA, SA |
| GC | Les siennes, CAT, AT | DAF, DGA, DG, PCA, SA |
| CAT | Les siennes, AT de son équipe | GC ⚠️, DGA, DG, DAF, PCA, SA |
| AT | Les siennes | Tous les autres |

**Règle d'application côté serveur :** chaque requête sur l'activité ou l'audit est filtrée par le serveur selon cette table. Le filtre est calculé à partir de l'utilisateur authentifié et ne dépend jamais d'un paramètre envoyé par le client.

### 5.3 Audit global

- **Contenu minimal :** connexions et échecs, créations, modifications, validations, rejets, annulations, corrections financières, changements de rôle, d'affectation et de désignation du Chef, opérations sur les adhérents, télédéclarations, campagnes, rapports internes, mémos, désactivations, paramètres, exports, effacements, événements de sécurité (accès refusés, verrouillages).
- **Temps réel :** flux poussé par le serveur (Server-Sent Events) vers le PCA et le SA.
- **Export :** réservé au SA. Le bouton est **absent** de l'interface pour tous les autres rôles et l'API renvoie 403. Chaque export (Excel, impression, PDF) crée un événement `AUDIT_EXPORT` (auteur, filtres, période, format, empreinte du fichier).
- **Non modifiable :** aucune route de modification ou de suppression ; droits d'écriture limités à l'insertion en base.

---

## 6. Workflows métier

### 6.1 Création d'un adhérent

1. Une demande peut venir de n'importe où (guichet, agent de terrain, direction). **Seule la GC crée l'adhérent**, sous son propre compte.
2. La GC saisit :
   - **Identité :** nom, prénom, sexe, date et lieu de naissance, CNI, téléphone, adresse.
   - **Profil professionnel** choisi dans les référentiels (catégorie, profession, secteur d'activité…). Le profil peut être complet ou partiel.
   - **Pack et allocation :** pack choisi, montant de référence journalier, allocation Sécurité sociale, allocation Épargne, préférence d'allocation, date de la préférence.
   - **Affectation** facultative à un agent ou à une zone.
   - **Informations CNPS** si l'adhérent est déjà immatriculé hors plateforme.
3. Le serveur contrôle les doublons (CNI, téléphone), attribue le matricule `COSITI-XXXX` dans une transaction, crée les **deux comptes** (Sécurité sociale et Épargne, solde 0) et journalise.
4. La liste des adhérents se met à jour chez les utilisateurs autorisés, sans rechargement de page (§9.8).

**Pré-inscription terrain ⚠️ :** si la direction la souhaite, l'agent de terrain peut saisir une **fiche de pré-inscription** (statut `PRE_INSCRIPTION`), distincte de l'adhérent. Seule la GC la transforme en adhérent définitif.

### 6.2 Paiement : saisie, contrôle, validation

```
GC : enregistre le paiement ──► statut À_VALIDER ──► DAF : contrôle ──┬─► VALIDÉ   ──► mouvements sur les 2 comptes
     (montant, mode, référence,                                        ├─► REJETÉ  ──► motif visible par la GC ; nouvelle saisie
      ventilation SS / Épargne)                                        └─► (plus tard) CORRIGÉ ou ANNULÉ par le DAF, avec motif
```

- **Saisie (GC) :** adhérent, montant, mode, référence de transaction, période, **ventilation proposée** (préremplie à partir de la préférence de l'adhérent). La ventilation est affichée en clair à l'écran.
- **Contrôle (DAF) :** le DAF sélectionne l'adhérent, contrôle la valeur de la cotisation et la ventilation, puis valide ou rejette. Il peut ajuster la ventilation avant validation, dans le respect des règles du §7.2.
- **Traçabilité de la validation :** utilisateur, date et heure, montant, adhérent, identifiant de l'opération, ancienne et nouvelle valeur si ajustement, motif si ajustement ou rejet.
- **Après validation :** la donnée n'est plus modifiable par la GC. Toute correction est faite par le DAF **par contre-passation** : le mouvement initial est annulé et un nouveau mouvement est créé, avec motif, l'historique étant conservé.
- **Effets :** seuls les paiements **VALIDÉS** alimentent les soldes, le cumul Sécurité sociale (seuil de 15 000 FCFA) et les états financiers. Les paiements à valider sont affichés à part ⚠️.
- **Reçu ⚠️ :** option A, reçu provisoire à la saisie puis reçu définitif à la validation ; option B, reçu uniquement après validation.

### 6.3 Allocation Sécurité sociale / Épargne

1. **À la création**, la GC enregistre la préférence : par exemple pack 1 000, soit 700 F en Sécurité sociale et 300 F en Épargne par jour.
2. **Paiement supérieur à 1 000 FCFA :** l'agent de terrain peut recueillir la **recommandation** de l'adhérent. Elle est enregistrée comme donnée structurée (répartition, date, agent, canal), pas comme un commentaire.
3. La **recommandation** est appliquée au dossier par la GC ; un changement durable de préférence suit le circuit « demande GC → validation DAF » ⚠️.
4. Tout paiement est refusé par l'API si ses règles d'allocation ne sont pas respectées (§7.2).

### 6.4 CNPS : immatriculation, télédéclarations, prestations

L'immatriculation **ne se fait pas sur la plateforme** : elle est obtenue auprès de la CNPS. La plateforme en conserve la trace, et **toutes les actions CNPS d'un adhérent sont rattachées à la GC**.

| Étape | Acteur | Détail |
|---|---|---|
| Suivi du seuil | Système | Alerte à la GC quand le cumul Sécurité sociale validé atteint le seuil (15 000 FCFA) |
| Démarche d'immatriculation | GC, hors plateforme | Auprès de la CNPS |
| Enregistrement de l'immatriculation | GC | N° CNPS (unique), date, justificatif scanné ; statut « Immatriculé » |
| Télédéclarations | GC | Période, adhérents concernés, montants déclarés, date, référence et accusé de la CNPS, statut (Préparée, Déclarée, Payée, Rejetée) |
| Paiement des montants déclarés | DAF ⚠️ | Opération financière, donc séparée de la déclaration |
| Dossiers de prestations | GC | Référentiel des 3 branches et 12 offres, pièces, statut, relances, décision |
| Pièces collectées sur le terrain | AT propose, GC valide ⚠️ | |

### 6.5 Organisation terrain

1. La **DGA** crée le compte de l'agent de terrain (email obligatoire) et **désigne le Chef** parmi les agents (désignation historisée, un seul Chef actif ⚠️).
2. La **GC et le Chef** définissent les zones, constituent les portefeuilles, répartissent les adhérents et suivent les agents.
3. La **DGA** supervise (regard) et arbitre les objectifs et les litiges ⚠️.
4. Tout changement d'affectation est journalisé (ancien et nouvel agent).

### 6.6 Campagnes de relance

```
DGA : crée la campagne (objectif, cible, période, consignes)
  └─► GC : affecte les relances aux agents (avec le Chef ⚠️)
        └─► AT : exécute ses relances, saisit un résultat structuré
              └─► GC : suit les résultats des agents
                    └─► DGA : reçoit le rapport consolidé
```

- **Résultat structuré** : joint ou injoignable, promesse de paiement (montant, date), refus (motif codé), changement de situation, commentaire.
- **Visibilité** : les relances spéciales terrain sont visibles **uniquement par la GC et les agents**, chaque agent ne voyant que les siennes. La DGA voit la définition de sa campagne et le rapport, pas la vue d'exécution.

### 6.7 Reporting hiérarchique

- Chaque collaborateur adresse un **rapport structuré à son supérieur direct** (circuit du §2.3). Le destinataire est déterminé par le serveur à partir de la chaîne, pas saisi librement.
- **Champs :** auteur, destinataire, rôles, date, objet, type (activité, compte rendu terrain, campagne, incident, financier, demande d'arbitrage), priorité, contenu, pièces jointes, statut, date de lecture, date de traitement, réponse.
- **Statuts :** BROUILLON → ENVOYÉ → LU → EN COURS → TRAITÉ → ARCHIVÉ.
- **Visibilité :** l'auteur et le destinataire uniquement. Le PCA et le SA en voient l'existence dans l'audit global.

### 6.8 Notifications

| Événement | Destinataire | Canal |
|---|---|---|
| Rapport reçu | Destinataire | Application + email |
| Rapport lu, rapport traité | Auteur | Application (+ email si traité) |
| Rapport demandant une action | Destinataire | Application + email |
| Paiements « À VALIDER » en attente | DAF | Application (résumé quotidien par email ⚠️) |
| Paiement rejeté | GC | Application |
| Mémo reçu | Destinataire | Application + email |
| Relance affectée | Agent | Application |
| Seuil de 15 000 FCFA atteint | GC | Application |

- **Email obligatoire** dans chaque profil utilisateur (professionnel ou personnel), avec contrôle du format.
- Les emails des collaborateurs ne sont pas affichés en dehors d'un besoin fonctionnel.

### 6.9 Gestion des profils utilisateurs

| Opération | Acteur | Règle |
|---|---|---|
| Création d'un profil (direction, GC, Chef potentiel) | PCA ⚠️ | Email obligatoire ; mot de passe provisoire à changer à la première connexion |
| Création d'un agent de terrain | DGA | |
| Désignation du Chef | DGA | Parmi les agents |
| Désactivation | PCA, ou SA **sur mémo du PCA** | Désactivation logique ; l'historique produit par l'utilisateur est conservé |
| Réinitialisation de mot de passe, déverrouillage | SA | Journalisé |
| Réactivation | PCA | Journalisée |

Toutes ces actions sont auditées.

### 6.10 Effacement de données

L'effacement ne peut être réalisé **que par le PCA et le Super Administrateur**, selon une procédure à **double validation** ⚠️ :

1. L'un des deux **initie** une demande (périmètre, motif, période concernée).
2. L'autre **confirme** (aucun des deux ne peut confirmer sa propre demande).
3. Le serveur prend une **sauvegarde complète** avant exécution.
4. L'effacement est exécuté, puis journalisé dans l'audit et la base de sauvegarde.
5. La restauration reste possible depuis la sauvegarde.

Cette procédure remplace le bouton « Mettre à jour le logiciel » de l'existant, accessible à tous.

### 6.11 Arbitrage

- Un supérieur **ne modifie jamais** le travail d'un subordonné. Il peut : **approuver**, **rejeter** ou **renvoyer pour correction**, avec un motif obligatoire.
- La décision est tracée (auteur, date, objet, motif) et notifiée au responsable, qui effectue la correction lui-même.
- Exemples : la DGA arbitre une radiation proposée par la GC ; le PCA arbitre un désaccord remonté entre le DAF et la GC sur un paiement.

---

## 7. Règles de gestion

### 7.1 Adhérent

| Règle | Détail |
|---|---|
| Matricule | `COSITI-XXXX`, séquence atomique côté serveur, immuable |
| Unicité | Matricule, n° CNPS ; contrôle de doublon sur CNI et téléphone |
| Profil professionnel | Valeurs issues des référentiels administrés ; saisie libre interdite |
| Statuts | Actif, Suspendu, Radié, Inactif ; pas de suppression physique |

### 7.2 Allocation Sécurité sociale / Épargne

- **Montant de référence journalier (MRJ)** : pack 700, pack 1 000, ou montant personnalisé (ex. 1 300) ⚠️.
- **Préférence** : `SS_jour + EP_jour = MRJ`, avec **`SS_jour ≥ 700`**.

| Exemple | Sécurité sociale | Épargne | Résultat |
|---|---|---|---|
| Pack 700 | 700 | 0 | Accepté |
| Pack 1 000 | 700 | 300 | Accepté |
| 1 300 | 900 | 400 | Accepté |
| 1 300 | 700 | 600 | Accepté |
| 1 000 | 600 | 400 | **Refusé** (SS < 700) |

- **Pour chaque paiement**, l'API vérifie :
  - `SS + EP = montant du paiement` ;
  - `SS ≥ 700 × nombre de jours couverts` ⚠️ (un paiement de 10 000 F au pack 1 000 couvre 10 jours : au moins 7 000 F en Sécurité sociale).
- **Cas à trancher ⚠️ :** montant non multiple du MRJ ; paiement inférieur à 700 F (avance partielle) ; paiement supérieur au pack (ex. 1 000 F payés au pack 700).
- La ventilation est enregistrée sur le paiement ; la préférence n'est qu'une valeur par défaut.

### 7.3 Seuil CNPS et situation de cotisation

- Le seuil de 15 000 FCFA se calcule sur le **solde validé du compte Sécurité sociale** ⚠️.
- Le calcul du retard reprend le cycle de 30 jours de l'existant, **à revoir** : le seuil de tolérance de 10 jours n'a aucun effet et les arriérés des mois précédents sont ignorés (voir `RAPORT.md`, §7.3) ⚠️.

### 7.4 Finances

- Une donnée financière validée ne se modifie pas en place : correction par contre-passation, avec motif et historique.
- Les soldes des comptes sont calculés à partir des mouvements (grand livre), jamais saisis.
- Unicité des références : n° de reçu, référence de transaction Mobile Money, n° de bordereau.

---

## 8. Modèle de données V1

Entités nouvelles (🆕) ou modifiées (✏️) par rapport à l'existant (`src/types.ts`).

| Entité | Statut | Champs principaux |
|---|---|---|
| `utilisateur` | ✏️ | id, nom, **prenom**, **email (obligatoire)**, telephone, role (8 valeurs), statut (ACTIF, DESACTIVE), **rattachement** (supérieur direct), zone_id, mot_de_passe_hash, date_creation, derniere_connexion. Supprimés : codeAcces, codePin, typeAcces libre. |
| `designation_chef` | 🆕 | id, agent_id, designe_par (DGA), date_debut, date_fin |
| `zone` | 🆕 | id, nom, description, statut |
| `affectation_adherent` | 🆕 | id, adherent_id, agent_id, zone_id, date_debut, date_fin, affecte_par (historisé) |
| `objectif_recouvrement` | 🆕 | id, agent_id, periode, montant, propose_par, decision_dga, motif |
| `adherent` | ✏️ | id, matricule, identité, **categorie_id, profession_id, secteur_id** (référentiels), statut, pack, mrj, date_adhesion, created_by (GC). Supprimés : gestionnaireNom dénormalisé, tarifJournalier. |
| `preference_allocation` | 🆕 | id, adherent_id, ss_jour, ep_jour, date_preference, saisie_par, statut (ACTIVE, DEMANDEE, VALIDEE_DAF), historisée |
| `recommandation_allocation` | 🆕 | id, adherent_id, agent_id, montant, ss, ep, date, canal, statut (PROPOSEE, APPLIQUEE, ECARTEE) |
| `compte_adherent` | 🆕 | id, adherent_id, type (SECURITE_SOCIALE, EPARGNE) ; **un couple par adhérent** |
| `paiement` | ✏️ (remplace `Cotisation`) | id, adherent_id, montant, mode, reference, periode, **ventilation_ss, ventilation_ep**, **statut (A_VALIDER, VALIDE, REJETE, ANNULE)**, saisi_par, date_saisie, valide_par, date_validation, motif_rejet, numero_recu |
| `mouvement_compte` | 🆕 | id, compte_id, paiement_id, montant (signé), type (CREDIT, CONTRE_PASSATION), date, auteur |
| `correction_financiere` | 🆕 | id, paiement_id, ancienne_valeur (json), nouvelle_valeur (json), motif, auteur (DAF), date |
| `immatriculation_cnps` | 🆕 | id, adherent_id, numero_cnps (unique), date, justificatif_id, saisi_par (GC) |
| `teledeclaration` | 🆕 | id, periode, montant_declare, date_declaration, reference_cnps, accuse_id, statut, declaree_par (GC), payee_par (DAF), lignes (adherent_id, montant) |
| `dossier_prestation`, `dossier_piece`, `dossier_historique` | ✏️ | Repris de l'existant ; offre identifiée par id ; fichiers joints |
| `referentiel_*` | 🆕 | categorie, profession, secteur, banque, operateur, branche et offre CNPS |
| `campagne_relance` | 🆕 | id, titre, objectif, cible (critères), date_debut, date_fin, consignes, creee_par (DGA), statut |
| `relance` | 🆕 | id, campagne_id, adherent_id, agent_id, affectee_par, resultat_code, promesse_montant, promesse_date, commentaire, date_execution |
| `rapport_interne` | 🆕 | id, auteur_id, destinataire_id, roles, date, objet, type, priorite, contenu, statut, date_lecture, date_traitement, reponse |
| `memo` | 🆕 | id, emetteur_id, destinataire_id, objet, contenu, type (INSTRUCTION, DESACTIVATION, PARAMETRE, EFFACEMENT), statut, action_liee |
| `decision_arbitrage` | 🆕 | id, arbitre_id, objet_type, objet_id, decision, motif, date |
| `piece_jointe` | 🆕 | id, nom, type_mime, taille, chemin, uploaded_by, date |
| `notification` | 🆕 | id, destinataire_id, type, objet_type, objet_id, message, lue, date, email_envoye |
| `demande_effacement` | 🆕 | id, initiee_par, confirmee_par, perimetre, motif, sauvegarde_ref, statut, dates |
| `audit_log` | ✏️ | id, horodatage, utilisateur_id, role, niveau_hierarchique, type_evenement, entite, entite_id, avant (json), apres (json), motif, ip, correlation_id |
| `depense`, `versement`, `frais_mobile_money`, `partenaire`, `rendez_vous`, `note_direction` | ✏️ | Repris de l'existant ; identifiants utilisateur au lieu de noms ; justificatifs joints |

---

## 9. Backend Spring Boot

### 9.1 Pile technique

| Élément | Choix |
|---|---|
| Langage, framework | Java 21, Spring Boot 3.x |
| Sécurité | Spring Security : JWT d'accès court + jeton de rafraîchissement en cookie httpOnly ; mots de passe BCrypt ou Argon2 ; verrouillage après échecs |
| Persistance | Spring Data JPA (Hibernate), **PostgreSQL** |
| Migrations | **Flyway**, exécuté au démarrage |
| Emails | Spring Mail (SMTP), envoi asynchrone avec reprise sur erreur |
| Temps réel | Server-Sent Events (`SseEmitter`) pour les notifications et l'audit |
| PDF | OpenPDF ou JasperReports (audit, reçus, rapports) |
| Tâches planifiées | `@Scheduled` (seuil, relances, résumés, relais de sauvegarde) |
| Tests | JUnit 5, Spring Security Test, **Testcontainers PostgreSQL** |

### 9.2 Création de la base et des tables au démarrage

- **Tables :** Flyway applique les scripts versionnés (`db/migration/V1__schema.sql`, `V2__referentiels.sql`…) à chaque démarrage. Ne pas utiliser `spring.jpa.hibernate.ddl-auto=update` en production (schéma non maîtrisé) ; utiliser `validate`.
- **Base de données :** PostgreSQL ne permet pas à Flyway de créer la base elle-même. Deux options :
  - la base est créée par l'infrastructure (script d'initialisation Docker ou DBA) — **RECOMMANDÉ** ;
  - un composant de démarrage se connecte à la base système avec un compte d'administration et crée `cositi` et `cositi_backup` si elles n'existent pas, avant Flyway.
- **Données initiales :** uniquement les référentiels réels validés et le premier compte Super Administrateur (mot de passe à changer à la première connexion). **Aucune donnée fictive.**

### 9.3 Base de sauvegarde des actions

Objectif : pouvoir récupérer les données en cas de bug ou de mauvaise manipulation.

| Composant | Rôle |
|---|---|
| **Table `outbox_evenement`** (base principale) | Écrite dans la **même transaction** que chaque modification : type d'entité, id, opération, état complet avant et après (JSON), utilisateur, horodatage, id de corrélation |
| **Relais** (tâche planifiée) | Copie les événements vers la base `cositi_backup`, puis les marque comme transmis. Garantit qu'aucune action validée n'est perdue, même si la base de sauvegarde est momentanément indisponible. |
| **Base `cositi_backup`** (seconde source de données) | Table `evenement` en **insertion seule** (le compte applicatif n'a pas les droits UPDATE et DELETE) ; chaînage par empreinte (hash de l'événement précédent) pour détecter toute altération |
| **Outil de restauration** (SA, sur procédure) | Reconstituer l'état d'une entité à une date donnée ; rejouer ou annuler une série d'actions ; chaque restauration est auditée |
| **Sauvegardes physiques** | `pg_dump` quotidien et archivage WAL (restauration à un instant précis) des deux bases, stockés hors du serveur |

### 9.4 Autorisation

- **Contrôle des fonctions :** permissions nommées (ex. `ADHERENT_CREATE`, `PAIEMENT_VALIDATE`, `AUDIT_EXPORT`) rattachées aux rôles et vérifiées par `@PreAuthorize` sur chaque méthode de service.
- **Contrôle du périmètre :** filtres de données appliqués dans les requêtes (Specifications JPA ou filtres Hibernate). Exemples : un agent ne lit que les adhérents dont l'affectation active pointe vers lui ; un Chef, ceux des agents de son équipe ; les rapports internes sont filtrés par auteur ou destinataire.
- **Contrôle de l'objet :** règles d'état (ex. `PATCH /paiements/{id}` uniquement si statut `A_VALIDER` et auteur = utilisateur courant).
- **Refus :** HTTP 403 et événement de sécurité `ACCES_REFUSE` dans l'audit.
- **Aucune route d'usurpation d'identité** (impersonation), y compris pour le SA.

### 9.5 Endpoints

Préfixe `/api/v1`. Les droits sont ceux du §4 ; seuls les points spécifiques sont rappelés.

| Domaine | Routes |
|---|---|
| Authentification | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` (profil + permissions), `POST /auth/change-password` |
| Adhérents | `GET /adherents`, `GET /adherents/{id}`, `POST /adherents` (GC), `PATCH /adherents/{id}` (GC), `POST /adherents/{id}/statut`, `GET /adherents/{id}/situation`, `GET /adherents/{id}/comptes`, `POST /adherents/{id}/recommandations` (AT), `POST /adherents/{id}/allocation-changes` (GC) + `/{cid}/validate` (DAF), `GET /adherents/export` |
| Pré-inscriptions ⚠️ | `POST /pre-inscriptions` (AT), `POST /pre-inscriptions/{id}/conversion` (GC) |
| Paiements | `GET /paiements?statut=A_VALIDER`, `POST /paiements` (GC), `PATCH /paiements/{id}` (GC, avant validation), `POST /paiements/{id}/validation` (DAF : `{decision, ventilation?, motif?}`), `POST /paiements/{id}/corrections` (DAF), `POST /paiements/{id}/annulation` (DAF), `GET /paiements/{id}/recu` |
| CNPS | `POST /adherents/{id}/immatriculation` (GC), `GET/POST /cnps/teledeclarations` (GC), `PATCH /cnps/teledeclarations/{id}`, `POST /cnps/teledeclarations/{id}/paiement` (DAF ⚠️), `GET /cnps/referentiel`, `GET/POST/PATCH /dossiers`, `PATCH /dossiers/{id}/pieces/{pid}`, `POST /dossiers/{id}/pieces/{pid}/fichier` |
| Terrain | `POST /terrain/agents` (DGA), `PUT /terrain/chef` (DGA), `GET/POST/PATCH /terrain/zones` (GC, CAT), `POST /terrain/affectations` (GC, CAT), `GET/POST /terrain/objectifs` + `/{id}/decision` (DGA), `GET /terrain/performance` |
| Campagnes | `POST /campagnes` (DGA), `GET /campagnes`, `POST /campagnes/{id}/affectations` (GC), `GET /campagnes/{id}/relances` (GC ; AT filtré), `POST /relances/{id}/resultat` (AT, GC), `GET /campagnes/{id}/rapport` (DGA, GC) |
| Finances | `/finances/depenses`, `/finances/versements`, `/finances/frais-mobile-money` (DAF), `GET /finances/synthese`, `GET /finances/rapports` |
| Direction | `/direction/rendez-vous`, `/direction/partenaires`, `/direction/notes` (DG, DGA ; confidentialité filtrée) |
| Reporting | `POST /rapports-internes`, `GET /rapports-internes?boite=envoyes\|reception`, `POST /rapports-internes/{id}/envoi`, `/lecture`, `/traitement`, `/reponse`, `/archivage` |
| Mémos, arbitrages | `POST /memos`, `GET /memos`, `POST /memos/{id}/execution` ; `POST /arbitrages` |
| Notifications | `GET /notifications`, `POST /notifications/{id}/lue`, `GET /notifications/stream` (SSE) |
| Utilisateurs | `GET /utilisateurs`, `POST /utilisateurs` (PCA ; DGA pour les agents), `PATCH /utilisateurs/{id}`, `POST /utilisateurs/{id}/desactivation` (PCA ; SA avec `memoId` obligatoire), `POST /utilisateurs/{id}/reactivation` (PCA), `POST /utilisateurs/{id}/reset-password` (SA) |
| Audit, activité | `GET /audit` (PCA, SA), `GET /audit/stream` (PCA, SA), `POST /audit/exports` (**SA seul** ; formats xlsx, pdf, impression ; audité), `GET /activite` (filtrée selon le §5.2) |
| Administration | `/admin/referentiels`, `/admin/parametres`, `/admin/roles` (SA, avec `memoId` ⚠️), `POST /admin/effacements` (PCA ou SA) + `/{id}/confirmation` (l'autre), `/admin/restaurations` (SA) |
| Tableaux de bord | `GET /dashboard` : contenu propre à chaque rôle |
| Alertes | `GET /alertes` : filtrées par périmètre (GC complet ; AT et CAT leur portefeuille ; DAF les paiements en attente) |

### 9.6 Journalisation

- Écrite par le serveur, dans la même transaction que l'action (audit + outbox de sauvegarde).
- Couvre aussi : connexions et échecs, accès refusés, exports, générations de rapports, consultations d'audit.
- Horodatage serveur en ISO 8601 ; identifiants d'utilisateur (et non des noms saisis).

### 9.7 Emails et notifications

- Service de notification unique : crée la notification applicative, la pousse par SSE si le destinataire est connecté, et met l'email en file d'envoi.
- Modèles d'email sans données sensibles (un lien vers la plateforme plutôt que le contenu du rapport).
- Validation du format d'email à la création et à la modification des profils.

### 9.8 Mise à jour en temps réel des adhérents

- **Mécanisme principal :** TanStack Query côté frontend ; après une création, invalidation de la requête `adherents` chez l'auteur.
- **Chez les autres utilisateurs autorisés :** le flux SSE déjà nécessaire aux notifications transporte un événement léger `ADHERENT_CREE` (id seulement), qui déclenche un rechargement ciblé. Pas de WebSocket.
- La base de données reste la source de vérité ; le client ne reconstruit jamais une donnée à partir de l'événement.

---

## 10. Adaptations du frontend existant

| Élément existant | Adaptation V1 |
|---|---|
| `AppContext.tsx` (état et logique locale, `localStorage`) | Remplacer par des appels API (TanStack Query) ; supprimer `mockData.ts`, `resetToDemoData`, `wipeAllDataForUpdate` |
| `UserSwitchModal`, bascule par code `1111` | Supprimer ; ajouter un écran de connexion et la session issue de `/auth/me` |
| `PinConfirmModal`, code `0000` | Supprimer ; remplacer par la saisie d'un **motif** pour les corrections et annulations |
| `permissions.ts` (16 drapeaux, 5 types d'accès) | Remplacer par les permissions renvoyées par `/auth/me` ; la navigation s'appuie dessus |
| `Sidebar.tsx` | Menus par rôle (§4) ; retirer l'affichage du code de sécurité |
| `AdherentModal` | Réservé à la GC ; ajout des référentiels (catégorie, profession, secteur), du pack, de la préférence d'allocation et de sa date ; retirer le champ n° CNPS de la création si l'immatriculation passe par son propre écran |
| `CotisationModal` → « Paiement » | Statut « À VALIDER » ; ventilation Sécurité sociale / Épargne affichée et contrôlée ; retirer la validation immédiate |
| Nouvel écran « Paiements à valider » (DAF) | Liste, contrôle, validation, rejet, ajustement de la ventilation |
| Fiche adhérent | Afficher les **deux comptes** (soldes, mouvements), la préférence, les recommandations ; droits par rôle (corriger le test sur des rôles obsolètes) |
| `ImmatriculationsView` / `ImmatriculationModal` | Devient « Enregistrement d'une immatriculation obtenue » (GC) + nouvel écran **Télédéclarations** |
| `DossiersView` | Réservé en écriture à la GC ; lecture selon le §4.3 |
| `GestionnairesView` (fiches GP) | Devient **Agents de terrain et zones** : comptes utilisateurs, zones, portefeuilles, désignation du Chef (DGA) |
| `DepensesView` | Réservé au DAF ; lecture PCA (et DG agrégée ⚠️) |
| `AgendaView` | DG et DGA uniquement ; confidentialité appliquée |
| `AlertesView`, `RapportsView`, `DashboardView` | Contenu par rôle et par périmètre, fourni par l'API |
| `UtilisateursView` | PCA (création, désactivation), DGA (agents), SA (technique, désactivation sur mémo) ; suppression de l'affichage des codes |
| `JournalView` | Deux vues : **audit global** (PCA, SA ; bouton d'export visible pour le SA seul) et **historique fonctionnel** (autres rôles) |
| `ParametresView` | Paramètres et référentiels : SA sur mémo du PCA ; procédure d'effacement à double validation |
| **Nouveaux écrans** | Rapports internes (boîte de réception et d'envoi), mémos, notifications, campagnes et relances, pré-inscriptions ⚠️ |
| Qualité | Installer `@types/react` et `@types/react-dom`, activer `strict` ; corriger les anomalies bloquantes listées dans `RAPORT.md` §10 |

---

## 11. Conflits entre l'existant et la V1

| # | Existant (code actuel) | Règle V1 | Correction |
|---|---|---|---|
| C1 | DG, DGA, DAF et caissière créent des adhérents | Seule la GC crée | Permission `ADHERENT_CREATE` réservée à la GC |
| C2 | Encaissement définitif immédiat par DG, DGA, DAF ou caissière | Saisie GC en « À VALIDER », validation DAF | Nouveau cycle de vie du paiement |
| C3 | Modification et suppression des cotisations par plusieurs rôles avec le code `0000` | Correction et annulation par le DAF seul, avec motif, sans suppression | Contre-passation, historique |
| C4 | Immatriculation « validée » par DG, DGA, DAF ou caissière | Enregistrement par la GC d'une immatriculation obtenue hors plateforme | Écran et permission réservés à la GC |
| C5 | Dossiers CNPS gérés par DG, DGA, DAF et caissière | Toutes les actions CNPS par la GC | Écriture réservée à la GC |
| C6 | Agenda de direction accessible au DAF | Fonction DG / DGA | Retrait du DAF |
| C7 | Gestion des utilisateurs ouverte à tous, codes visibles | PCA, DGA (agents), SA (technique, sur mémo) | Contrôle serveur, codes supprimés |
| C8 | Gestionnaires de portefeuille (fiches) gérés par tous | Agents de terrain créés par la DGA ; organisation GC + Chef | Nouveau module terrain |
| C9 | Effacement total par n'importe qui avec `1111` | PCA et SA, double validation, sauvegarde préalable | Procédure `/admin/effacements` |
| C10 | Journal visible par tous ; export par tous | Audit global PCA et SA ; export SA seul ; historique filtré pour les autres | Deux vues, filtrage serveur |
| C11 | Paramètres modifiables par DG / DGA | SA sur mémo du PCA ⚠️ | Mémo + audit |
| C12 | Bascule de profil par code universel | Authentification individuelle ; aucune substitution | Écran de connexion |
| C13 | Tarif unique 700 / 1 000 sans ventilation | Pack + double compte + règle SS ≥ 700 | Nouveaux modèles et contrôles |
| C14 | Jeu de démonstration et réinitialisation | Aucune donnée fictive | Suppression |
| C15 | DG / DGA ont tous les droits (« administrateur ») | Droits par fonction ; regard et arbitrage sans modification | Nouvelle matrice |
| C16 | Aucun reporting, notification, campagne, mémo, télédéclaration | Modules requis | Nouveaux modules |
| C17 | Alertes et rapports identiques pour tous | Filtrés par rôle et périmètre | Filtrage serveur |
| C18 | Rôle « Conseil de Surveillance » en consultation | Remplacé par le Super Administrateur ⚠️ | Migration des comptes |

---

## 12. Tests d'acceptation obligatoires

Tests d'intégration backend (Spring Boot + Testcontainers). Chaque ligne vérifie **l'API**, pas seulement l'interface.

### 12.1 Hiérarchie et visibilité

| Test | Attendu |
|---|---|
| AT consulte les actions de la GC | 403 ou liste vide |
| GC consulte les actions du DGA, du DG, du PCA, du DAF | Exclues des résultats |
| DGA, DG, DAF appellent `GET /audit` | 403 |
| PCA et SA appellent `GET /audit` | 200 |
| Un supérieur tente de modifier une donnée produite par un subordonné (ex. DGA modifie une affectation de la GC) | 403 |
| SA tente une action métier (créer un adhérent, valider un paiement) | 403 |

### 12.2 Adhérents

| Test | Attendu |
|---|---|
| GC crée un adhérent | 201, matricule attribué, deux comptes créés |
| AT, DAF, DGA, DG, PCA, SA créent un adhérent | 403 |
| AT ou CAT appellent la liste complète | 403 ; `scope=mine` ne renvoie que leur périmètre |
| GC, DAF, DGA, DG, PCA appellent la liste complète | 200 |
| DAF modifie l'identité d'un adhérent | 403 |
| Création d'un doublon (même CNI) | 409 |

### 12.3 Paiements et allocation

| Test | Attendu |
|---|---|
| GC crée un paiement | 201, statut `A_VALIDER` |
| GC valide un paiement | 403 |
| DAF valide | 200, statut `VALIDE`, mouvements créés, audit complet |
| DAF corrige un paiement validé sans motif | 400 |
| DAF corrige avec motif | 200, contre-passation + historique |
| AT modifie une donnée financière | 403 |
| Ventilation SS = 600 / EP = 400 | 400 (SS < 700) |
| SS + EP ≠ montant | 400 |
| Paiement `A_VALIDER` exclu des soldes et du seuil | Soldes inchangés avant validation |

### 12.4 CNPS

| Test | Attendu |
|---|---|
| GC enregistre une immatriculation | 201 ; n° CNPS unique |
| Tout autre rôle enregistre une immatriculation ou une télédéclaration | 403 |

### 12.5 Relances

| Test | Attendu |
|---|---|
| DGA crée une campagne | 201 |
| GC voit la campagne et toutes ses relances | 200 |
| AT voit uniquement les relances qui lui sont affectées | Filtrage vérifié |
| DAF, DG, PCA consultent la vue d'exécution | 403 |

### 12.6 Reporting et notifications

| Test | Attendu |
|---|---|
| AT → GC ; CAT → GC ; GC → DGA ; DGA → DG ; DAF → PCA | Destinataire calculé par le serveur |
| Tentative d'envoi à un destinataire hors chaîne | 400 |
| Réception d'un rapport | Notification applicative + email en file |
| Utilisateur non concerné lit un rapport | 403 |

### 12.7 Profils, audit et effacement

| Test | Attendu |
|---|---|
| PCA crée un profil ; DGA crée un agent | 201, audités |
| DGA crée un DAF | 403 |
| SA désactive un utilisateur sans mémo du PCA | 403 |
| SA désactive avec mémo | 200, mémo et action liés dans l'audit |
| Utilisateur désactivé tente de se connecter | 401 ; son historique est conservé |
| PCA tente un export d'audit | 403 |
| SA exporte l'audit en PDF | 200 + événement `AUDIT_EXPORT` |
| Un effacement est confirmé par son initiateur | 403 |
| Effacement initié par le PCA et confirmé par le SA | Sauvegarde préalable créée, effacement audité |
| Toute modification crée un événement dans `cositi_backup` | Vérifié après commit |
| Démarrage sur base vide | Flyway crée toutes les tables ; aucune donnée fictive |

---

## 13. Points à valider par la direction

| # | Question | Proposition du document |
|---|---|---|
| 1 | Le rôle « Conseil de Surveillance » est-il remplacé par le Super Administrateur ? | Oui (« superadmin / surveillance ») |
| 2 | Le DAF rapporte-t-il au PCA ou au DG ? | Au PCA |
| 3 | L'effacement exige-t-il l'accord **conjoint** du PCA et du SA, ou l'un des deux suffit-il ? | Double validation (l'un initie, l'autre confirme) |
| 4 | Qui crée les profils : PCA pour tous les rôles sauf agents (DGA) et SA ? | Oui |
| 5 | Le SA peut-il modifier la matrice des droits, les paramètres et les référentiels sans mémo du PCA ? | Non : mémo obligatoire |
| 6 | Le SA doit-il pouvoir lire la liste des adhérents ? | Lecture seule, à confirmer (minimisation des accès) |
| 7 | Un agent de terrain peut-il saisir une pré-inscription ou déclarer un encaissement terrain ? | Pré-inscription oui, encaissement non (la GC saisit) |
| 8 | Reçu à la saisie (provisoire) ou uniquement après validation du DAF ? | Provisoire puis définitif |
| 9 | Le seuil de 15 000 FCFA porte-t-il sur le compte Sécurité sociale validé ? | Oui |
| 10 | Règle `SS ≥ 700` par jour couvert ; traitement des montants non multiples du pack et des paiements inférieurs à 700 F | À définir |
| 11 | Packs autorisés : 700, 1 000 et montant personnalisé libre (≥ 700) ? | À définir |
| 12 | Qui valide un changement durable de pack ou d'allocation : DAF ? | DAF, sur demande de la GC |
| 13 | Le paiement à la CNPS des montants télédéclarés est-il une opération du DAF ? | Oui |
| 14 | Contenu exact d'une télédéclaration (par adhérent, groupée par période) | À préciser avec la GC |
| 15 | Le Chef voit-il les relances de son équipe (le texte les réserve à la GC et aux agents) ? | Oui, en lecture, pour son équipe |
| 16 | Le Chef peut-il affecter les relances avec la GC ? | Non, la GC affecte |
| 17 | Le CAT voit-il les actions de la GC, avec qui il travaille ? | Non (règle de visibilité ascendante) |
| 18 | Qui fixe les objectifs de recouvrement : proposition GC / Chef, décision DGA ? | Oui |
| 19 | La radiation d'un adhérent est-elle arbitrée par la DGA ? | Oui |
| 20 | Le DG voit-il le détail des paiements et de la trésorerie, ou seulement des agrégats ? Voit-il les actions du DAF ? | Agrégats ; pas les actions du DAF |
| 21 | Le PCA a-t-il accès à l'agenda de direction ? | Non |
| 22 | Un seul Chef des agents de terrain à la fois ? | Oui |
| 23 | Correction du calcul de retard (tolérance, arriérés) | À définir avec le métier |
| 24 | Référentiels bancaires, opérateurs et CNPS camerounais à fournir | À fournir |

---

## 14. Plan de mise en œuvre

| Phase | Contenu | Livrable |
|---|---|---|
| 0 | Validation des points du §13 | Matrice des droits signée |
| 1 | Socle Spring Boot : Flyway, bases principale et de sauvegarde, outbox, authentification, rôles et permissions, audit, notifications (SSE + email) | Connexion par rôle, audit temps réel PCA / SA |
| 2 | Utilisateurs, mémos, désactivation, organisation terrain (agents, Chef, zones, affectations) | Hiérarchie opérationnelle en place |
| 3 | Adhérents (référentiels, pack, allocation, double compte), pré-inscriptions | Création réservée à la GC |
| 4 | Paiements : saisie, validation DAF, corrections, grand livre, reçus | Workflow financier complet |
| 5 | CNPS : immatriculations, télédéclarations, dossiers, pièces | Module CNPS de la GC |
| 6 | Campagnes de relance, reporting interne, arbitrages | Circuits hiérarchiques |
| 7 | Trésorerie DAF, agenda de direction, tableaux de bord et rapports par rôle | Parité avec l'existant |
| 8 | Branchement du frontend (§10), suppression du `localStorage` et des données fictives | Application connectée |
| 9 | Tests d'acceptation (§12), sauvegardes, effacement, restauration, mise en production | Mise en service |

---

*Ce document remplace, pour les droits et les workflows, les sections correspondantes de `RAPORT.md`, qui reste la référence pour l'analyse de l'existant et la liste des anomalies du frontend.*
