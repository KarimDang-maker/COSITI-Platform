# FONCTIONNALITE_GestComtes_V1

## 1. Objet du document

Ce document définit les fonctionnalités à intégrer progressivement dans le dashboard du rôle **Gestionnaire des comptes** de COSITI à partir des interfaces fournies en référence.

### Périmètre V1 étudié

Les trois éléments étudiés sont :

1. **Alertes & Relances**
2. **Immatriculations**
3. **Prestations familiales**

Le document décrit principalement :
- la structure visuelle observée ;
- les composants fonctionnels visibles ;
- les informations à afficher ;
- les interactions attendues ;
- les états et filtres ;
- les actions du Gestionnaire ;
- les règles de visibilité à respecter ;
- les éléments à prévoir côté données/API ;
- les critères d'acceptation.

> **Important :** les noms, libellés, informations et structures décrits ci-dessous sont basés sur les captures fournies. Lorsqu'un comportement n'est pas explicitement démontré par une capture, il est identifié comme une règle fonctionnelle à valider avant implémentation backend.

---

# 2. Règles générales du dashboard Gestionnaire des comptes

## 2.1. Périmètre du Gestionnaire

Le Gestionnaire des comptes est l'acteur opérationnel chargé notamment de :

- consulter les adhérents relevant de son périmètre ;
- gérer les opérations administratives liées aux adhérents ;
- traiter les alertes et relances ;
- suivre les situations d'immatriculation CNPS ;
- préparer et suivre les dossiers de prestations ;
- enregistrer les informations opérationnelles ;
- exécuter les campagnes/rappels qui lui sont affectés.

Le Gestionnaire ne doit pas disposer d'une visibilité globale sur les actions réalisées par les rôles supérieurs.

Il ne doit notamment pas avoir accès au journal global des actions du :
- DAF ;
- DGA ;
- DG ;
- PCA ;
- Super Administrateur.

## 2.2. Principe de séparation des responsabilités

Le frontend ne constitue pas une autorité de sécurité.

Toute permission doit être contrôlée par l'API/backend.

Le frontend doit :
- afficher uniquement les modules autorisés ;
- masquer les actions non autorisées ;
- gérer les états de chargement/erreur ;
- ne jamais considérer le masquage d'un bouton comme une protection suffisante.

## 2.3. Actualisation des données

Les listes opérationnelles doivent refléter les données persistées en base.

Après :
- création d'un adhérent ;
- modification d'une donnée ;
- traitement d'une alerte ;
- changement d'état d'une immatriculation ;
- modification d'un dossier ;

la liste concernée doit être invalidée puis actualisée via le mécanisme de requête utilisé par COSITI.

Si un mécanisme temps réel est réellement disponible dans le contrat API, il pourra être utilisé. Sinon, ne pas inventer de WebSocket/SSE.

---

# 3. MODULE : ALERTES & RELANCES

## 3.1. Objectif

Le module **Alertes & Relances** sert de centre opérationnel pour attirer l'attention du Gestionnaire sur les situations nécessitant une intervention concernant les adhérents.

La capture présente une interface intitulée :

**Centre d'Alertes Administratives COSITI**

avec un compteur d'alertes actives.

Le sous-titre indique que le système effectue une surveillance automatique de plusieurs situations, notamment :
- retards ;
- seuils d'administration ;
- cycles de vérification ;
- dossiers incomplets.

---

## 3.2. En-tête du module

### Titre

`Centre d'Alertes Administratives COSITI`

### Compteur

Un compteur indique le nombre d'alertes actives.

Exemple observé :

`12 active(s)`

Le compteur doit évoluer avec les données réelles.

### Description

La description explique la nature des contrôles automatiques effectués par COSITI.

### Export

La capture présente un bouton :

`Export Excel`

Pour le Gestionnaire, cette action doit respecter les permissions d'export prévues par le backend.

L'export doit porter uniquement sur les données auxquelles le Gestionnaire est autorisé à accéder.

---

# 4. Catégories d'alertes

La capture montre plusieurs catégories sous forme d'onglets/filtres.

## 4.1. Toutes

Exemple observé :

`Toutes (12)`

Affiche l'ensemble des alertes accessibles au Gestionnaire.

## 4.2. Adhérents non à jour

Exemple :

`Adhérents non à jour (7)`

Cette catégorie correspond aux adhérents dont les cotisations présentent un retard selon la règle métier configurée.

La carte observée affiche :
- matricule COSITI ;
- niveau de priorité ;
- nom de l'adhérent ;
- message d'alerte ;
- contexte du dernier versement ;
- bouton `Traiter l'alerte`.

## 4.3. Seuil 15 000 FCFA atteint

Exemple :

`Seuil 15 000 FCFA atteint (2)`

Cette alerte est liée au seuil de cotisations permettant de déclencher le processus d'immatriculation CNPS.

Le Gestionnaire doit pouvoir identifier :
- l'adhérent ;
- le montant cumulé ;
- le seuil atteint ;
- l'action opérationnelle attendue.

## 4.4. Cycle de vérification 15 / 30

Exemple :

`Cycle vérification 15 / 30 (2)`

Cette catégorie correspond au contrôle périodique illustré dans les écrans d'immatriculation.

## 4.5. Dossiers Allocations

Exemple :

`Dossiers Allocations (1)`

Cette catégorie permet d'identifier les dossiers nécessitant une intervention ou une constitution.

---

# 5. Carte d'alerte

Chaque alerte doit être structurée de manière homogène.

## Informations

Une carte peut contenir :

- matricule COSITI ;
- type d'alerte ;
- niveau de priorité ;
- nom de l'adhérent ;
- description ;
- contexte métier ;
- bouton d'action.

## Niveaux observés

Deux niveaux sont visibles :

### ATTENTION

Utilisé pour une situation nécessitant une intervention mais ne correspondant pas à une urgence critique.

### URGENT

Utilisé pour une situation nécessitant une intervention prioritaire.

Le niveau de priorité doit être fourni par les données métier et non calculé arbitrairement par le frontend.

---

# 6. Action « Traiter l'alerte »

Chaque alerte comporte un bouton :

`Traiter l'alerte →`

L'action doit ouvrir le contexte opérationnel correspondant.

Exemples :

### Alerte de retard de cotisation

Ouvrir la fiche de l'adhérent ou l'écran opérationnel permettant au Gestionnaire :
- d'identifier l'adhérent ;
- de consulter son historique pertinent ;
- d'effectuer la relance autorisée ;
- de mettre à jour le suivi.

### Alerte seuil 15 000 FCFA

Ouvrir le contexte d'immatriculation correspondant.

### Alerte dossier allocation

Ouvrir le dossier de prestations/allocation concerné.

> Le bouton ne doit pas conduire vers une page générique sans conserver le contexte de l'adhérent et de l'alerte.

---

# 7. Module : IMMATRICULATIONS

## 7.1. Objectif

Le module **Immatriculations** permet au Gestionnaire de suivre les adhérents dans leur processus d'immatriculation CNPS.

La capture présente un en-tête :

`Gestion des Immatriculations CNPS`

avec une règle métier affichée :

`Contrôle automatique au 15 et 30 de chaque mois`

Le système identifie les adhérents ayant atteint le seuil de cotisations requis.

---

# 8. Bandeau de règle métier

Le bandeau supérieur doit présenter :

### Règle métier COSITI

`Contrôle automatique au 15 et 30 de chaque mois`

### Seuil

`15 000 FCFA`

### Description

Le système vérifie automatiquement les adhérents ayant atteint le seuil de cotisations afin de déclencher le processus d'immatriculation CNPS.

### Indicateur

La capture présente :

`ADHÉRENTS ÉLIGIBLES EN ATTENTE`

avec un nombre.

Cet indicateur doit être calculé à partir des données backend.

---

# 9. Onglet : À immatriculer d'urgence

La capture montre :

`À immatriculer d'urgence (2)`

Cette vue présente les adhérents ayant atteint le seuil et nécessitant une action.

## Tableau

Colonnes observées :

- Matricule ;
- Nom & prénom(s) ;
- Métier & contact ;
- Cumul cotisé ;
- Progression seuil (15K) ;
- Numéro CNPS ;
- Action.

## Données d'une ligne

La ligne doit permettre d'identifier rapidement :

### Matricule

Exemple :

`COSITI-0001`

### Nom

Exemple :

`TRAORÉ Moussa`

### Métier

Exemple :

`Menuisier ébéniste`

### Contact

Le numéro de téléphone est affiché sous le métier.

### Cumul cotisé

Exemple :

`16 100 FCFA`

### Progression

La progression visuelle montre l'atteinte du seuil.

Exemple :

`100% / 15 000 FCFA`

### Numéro CNPS

Si l'adhérent n'est pas encore immatriculé, l'interface doit indiquer qu'il est éligible à l'immatriculation plutôt que d'afficher un numéro inexistant.

---

# 10. Action d'immatriculation

La capture présente un bouton du type :

`Éligible CNPS`

Pour les adhérents éligibles, le Gestionnaire doit pouvoir accéder à l'opération d'immatriculation autorisée.

Le parcours doit conserver :
- l'identité de l'adhérent ;
- le matricule COSITI ;
- le cumul de cotisations ;
- l'éligibilité ;
- le statut d'immatriculation.

Toute validation définitive doit être persistée par l'API.

---

# 11. Onglet : Vérification cycle 15 / 30

La capture présente :

`Vérification cycle 15 / 30 (4)`

Cette vue reprend le principe de contrôle périodique.

Elle doit permettre au Gestionnaire de vérifier les adhérents identifiés par le système lors des contrôles prévus.

La ligne doit conserver les mêmes informations structurantes que la vue d'immatriculation afin d'éviter de changer inutilement le contexte de travail.

---

# 12. Onglet : Déjà immatriculés CNPS

La capture présente :

`Déjà immatriculés CNPS (2)`

Cette vue liste les adhérents ayant déjà reçu un numéro CNPS.

## Informations observées

- Matricule COSITI ;
- Nom & prénom(s) ;
- Métier & contact ;
- Cumul cotisé ;
- Progression du seuil ;
- Numéro CNPS ;
- date d'immatriculation ;
- action.

## Action

La capture présente un bouton :

`Dossier Allocations`

Cela permet de poursuivre vers la gestion des prestations/dossiers pour l'adhérent.

---

# 13. Recherche dans les immatriculations

Un champ :

`Filtrer la liste...`

est visible.

Le filtre doit permettre au minimum de retrouver un adhérent par les informations réellement disponibles dans le contrat API.

Ne pas inventer de critères backend inexistants.

Les résultats doivent être filtrés côté serveur lorsque le volume de données le justifie.

---

# 14. MODULE : PRESTATIONS FAMILIALES

## 14.1. Objectif

Le module **Prestations familiales** permet au Gestionnaire de consulter et suivre les dossiers relatifs aux prestations familiales CNPS.

La capture présente une organisation en :
- rubrique ;
- sous-rubriques/offres ;
- détail de l'offre ;
- filtres ;
- liste des dossiers.

---

# 15. Vue générale des rubriques

La capture montre quatre cartes principales :

## Prestations Familiales

Code :

`PF (Code 01)`

Compteur observé :

`2`

Description :

`Enfants, scolarité, maternité & naissances`

## Risques Professionnels

Code :

`RP (Code 02)`

Compteur observé :

`0`

Description :

`Accidents du travail, soins & rentes`

## PVID

Code :

`PVID (Code 03)`

Description :

`Pension vieillesse, invalidité & réversion`

## Total Global

Carte récapitulative du nombre global de dossiers.

> Les écrans fournis détaillent principalement la rubrique Prestations Familiales. Les autres rubriques ne doivent pas être développées à partir de suppositions non présentes dans les captures.

---

# 16. Sous-rubriques des Prestations Familiales

La capture montre quatre offres principales.

## 16.1. Allocations Familiales — Enfants scolarisés & à charge

Cette offre concerne les versements périodiques pour l'entretien et l'éducation des enfants à charge légitimes ou reconnus.

### Informations affichées

- nom de l'offre ;
- description ;
- nombre de dossiers ;
- délai moyen observé ;
- montant/règle de prestation lorsqu'il est défini ;
- pièces obligatoires.

### Pièces observées

La capture fait apparaître notamment :

- extrait de naissance de l'adhérent ;
- photocopie de la CNI de l'adhérent ;
- attestation d'immatriculation CNPS ;
- extraits d'acte de naissance des enfants à charge ;
- certificats de scolarité ou d'apprentissage en cours de validité ;
- certificat de vie et d'entretien collectif ;
- certificat de mariage légal si applicable ;
- photos d'identité récentes de l'assuré.

Le système doit conserver la notion de pièce obligatoire et son état.

---

# 17. Allocations prénatales — Suivi médical obligatoire

La capture présente :

`Allocations Prénatales (Suivi médical obligatoire)`

Description :

Prime accordée en plusieurs tranches sur présentation des examens médicaux de grossesse.

## Informations

Le détail de l'offre présente :

- délai moyen d'instruction ;
- forfait/règle de prestation ;
- nombre de pièces obligatoires.

## Pièces observées

- carnet de consultations prénatales homologué ;
- certificats des visites médicales obligatoires ;
- carte d'assuré CNPS valide.

Le Gestionnaire doit pouvoir suivre la complétude du dossier par rapport aux pièces exigées.

---

# 18. Indemnités journalières de maternité

La capture présente :

`Indemnités Journalières de Maternité (Travailleuses indépendantes)`

Description :

Compensation de perte de revenu pendant l'arrêt de travail lié à la maternité.

## Informations affichées

- délai moyen d'instruction ;
- règle de prestation ;
- pièces obligatoires.

## Pièces observées

La capture montre notamment :

- attestation d'immatriculation CNPS à jour ;
- certificat médical de grossesse ;
- déclaration formelle d'interruption d'activité ;
- RIB ou coordonnées Mobile Money pour paiement ;
- certificat d'accouchement.

Le système doit permettre de suivre la présence/absence de chaque pièce.

---

# 19. Prime à la naissance & frais d'accouchement

La capture présente :

`Prime à la Naissance & Frais d'accouchement`

Description :

Aide financière forfaitaire accordée lors de la naissance d'un enfant viable déclaré à l'état civil.

## Informations affichées

- délai moyen d'instruction ;
- règle/forfait ;
- pièces obligatoires.

## Pièces observées

- extrait d'acte de naissance du nouveau-né ;
- certificat médical d'accouchement ;
- copie de la CNI de la mère et du père adhérent.

---

# 20. Sélecteur « Toutes les offres »

La capture présente une option :

`Toutes les offres`

Cette option permet d'afficher l'ensemble des dossiers correspondant à la rubrique sélectionnée.

Elle ne doit pas supprimer les informations de contexte de la rubrique.

---

# 21. Détail dynamique de l'offre

Lorsqu'une offre est sélectionnée, un panneau de détail apparaît.

Il contient :

### Nom de l'offre

Titre complet.

### Description

Explication de la prestation.

### Délai moyen d'instruction CNPS

Exemple :

`15 à 30 jours après dépôt complet`

### Règle ou montant de prestation

Exemple :

`2 500 à 5 000 FCFA / enfant / mois`

ou un forfait selon l'offre.

### Pièces obligatoires

Liste structurée des documents nécessaires.

Cette zone doit changer dynamiquement lorsque le Gestionnaire sélectionne une autre offre.

---

# 22. Filtres des dossiers

La capture montre une barre de filtres avec :

## Recherche

Placeholder :

`Rechercher par Matricule, Adhérent, N° CNPS...`

## Statut

Sélecteur :

`Tous les statuts de dossier`

Il doit permettre de filtrer selon les statuts réellement supportés par le backend.

## Certificat de scolarité

Sélecteur :

`Tous les certificats de scolarité`

Ce filtre est particulièrement lié aux prestations familiales pour enfants scolarisés.

---

# 23. Tableau des dossiers

Lorsque des dossiers correspondent aux critères, la capture montre un tableau contenant :

- Matricule COSITI ;
- Adhérent & famille ;
- Matricule CNPS ;
- Rubrique & sous-rubrique/offre ;
- Statut dossier ;
- Pièces réunies ;
- Transmission / dépôt ;
- Action.

## Exemple de progression des pièces

La capture montre :

`5/8`

et :

`8/8`

avec une progression visuelle.

Le système doit afficher la progression calculée à partir des pièces réellement enregistrées.

Le frontend ne doit pas recalculer une règle métier différente de celle du backend.

---

# 24. Statuts de dossier

La capture présente notamment un état :

`Incomplet`

et un état :

`Transmis CNPS`

Les statuts supplémentaires doivent uniquement être utilisés s'ils sont définis dans le modèle métier/API.

Chaque statut doit avoir :
- un libellé ;
- une représentation visuelle ;
- éventuellement une action associée ;
- une règle de transition contrôlée par le backend.

---

# 25. Action « Consulter »

Le tableau présente un bouton :

`Consulter`

Cette action doit ouvrir le détail du dossier.

Le détail doit conserver le contexte :

- adhérent ;
- famille ;
- matricule COSITI ;
- numéro CNPS ;
- prestation ;
- pièces ;
- état du dossier ;
- informations de dépôt/transmission.

Les actions de modification doivent être affichées uniquement si le Gestionnaire possède réellement le droit correspondant.

---

# 26. Navigation entre les trois modules

Le Gestionnaire doit pouvoir travailler avec le lien métier entre les modules.

### Alerte → Immatriculation

Une alerte de seuil atteint doit pouvoir conduire vers la fiche d'immatriculation de l'adhérent concerné.

### Immatriculation → Prestations

Une fois l'adhérent immatriculé, le Gestionnaire doit pouvoir accéder aux dossiers de prestations/allocation associés.

### Alerte → Prestations

Une alerte concernant un dossier d'allocation doit conduire directement au dossier concerné.

L'objectif est d'éviter de faire rechercher manuellement l'adhérent après chaque alerte.

---

# 27. Matrice fonctionnelle du Gestionnaire

| Fonctionnalité | Gestionnaire |
|---|---|
| Consulter les alertes de son périmètre | OUI |
| Traiter une alerte opérationnelle | OUI |
| Consulter les alertes des supérieurs | NON |
| Voir le journal global des actions | NON |
| Exporter des données autorisées | SELON PERMISSION API |
| Consulter les adhérents | OUI |
| Créer un adhérent | OUI |
| Consulter les immatriculations | OUI |
| Suivre les adhérents éligibles CNPS | OUI |
| Suivre les adhérents déjà immatriculés | OUI |
| Consulter les prestations familiales | OUI |
| Créer/modifier librement une règle CNPS | NON |
| Modifier les données financières validées par le DAF | NON |
| Valider définitivement un paiement | NON |
| Consulter les actions du DAF | NON |
| Consulter les actions du DGA | NON |
| Consulter les actions du DG | NON |
| Consulter les actions du PCA | NON |
| Consulter les actions du Super Administrateur | NON |

---

# 28. Architecture fonctionnelle recommandée

Le module Gestionnaire peut être structuré ainsi :

```text
Gestionnaire des comptes
│
├── Adhérents
│   ├── Liste
│   ├── Nouveau adhérent
│   └── Fiche adhérent
│
├── Cotisations
│   └── Suivi opérationnel
│
├── Immatriculations
│   ├── À immatriculer d'urgence
│   ├── Vérification cycle 15 / 30
│   └── Déjà immatriculés CNPS
│
├── Dossiers CNPS
│   └── Prestations familiales
│       ├── Toutes les offres
│       ├── Enfants scolarisés & à charge
│       ├── Allocations prénatales
│       ├── Indemnités journalières de maternité
│       └── Prime à la naissance & frais d'accouchement
│
└── Alertes & Relances
    ├── Toutes
    ├── Adhérents non à jour
    ├── Seuil 15 000 FCFA atteint
    ├── Cycle vérification 15 / 30
    └── Dossiers Allocations
```

---

# 29. États UI à prévoir

Pour chacun des trois modules, prévoir au minimum :

## Chargement

Afficher un état de chargement cohérent avec le design system.

## Données disponibles

Afficher les données réelles.

## Aucun résultat

Exemple :

`Aucun dossier CNPS trouvé pour ces critères.`

## Erreur

Afficher un message utilisateur clair sans exposer :
- stack trace ;
- détails SQL ;
- informations techniques sensibles ;
- tokens ;
- données internes de sécurité.

## Action en cours

Lorsqu'une action est exécutée :
- désactiver le bouton concerné ;
- afficher son état de traitement ;
- empêcher les doubles soumissions ;
- actualiser les données après succès.

---

# 30. Recherche et filtrage

Les filtres doivent être cohérents entre eux.

Exemple pour les prestations :

```text
Recherche
    +
Rubrique
    +
Sous-rubrique
    +
Statut
    +
Certificat de scolarité
```

Le résultat doit être déterminé par les données métier disponibles.

Éviter de filtrer côté frontend une très grande liste déjà chargée en mémoire si l'API prévoit une recherche serveur.

---

# 31. Persistance et cohérence

Toute opération importante doit être persistée en base.

Exemples :

- traitement d'une alerte ;
- modification du statut d'un dossier ;
- ajout d'une pièce ;
- transmission d'un dossier ;
- mise à jour d'une immatriculation ;
- création d'un adhérent.

Après mutation :

```text
Mutation API
     ↓
Succès backend
     ↓
Invalidation de la query concernée
     ↓
Refetch
     ↓
Interface actualisée
```

---

# 32. Audit

Les opérations importantes du Gestionnaire doivent pouvoir être auditées par les acteurs autorisés.

Le Gestionnaire ne doit pas avoir accès au journal global.

L'audit doit cependant conserver les opérations effectuées par le Gestionnaire selon les règles générales de COSITI.

Les actions sensibles doivent notamment conserver :
- utilisateur ;
- rôle ;
- action ;
- objet concerné ;
- date/heure ;
- résultat ;
- contexte nécessaire à la traçabilité.

---

# 33. Sécurité fonctionnelle

Ne jamais faire confiance au frontend pour :

- l'autorisation ;
- le rôle ;
- le périmètre d'adhérents ;
- les transitions de statut ;
- les montants ;
- les règles d'éligibilité ;
- les règles d'immatriculation ;
- la complétude définitive d'un dossier.

Le backend doit contrôler ces éléments.

---

# 34. Tests d'acceptation — Alertes

### A-ALT-01
Le Gestionnaire voit uniquement les alertes qui lui sont accessibles.

### A-ALT-02
Le compteur correspond aux alertes réellement disponibles.

### A-ALT-03
Le filtre « Toutes » affiche toutes les alertes accessibles.

### A-ALT-04
Une alerte de seuil permet d'accéder au contexte d'immatriculation.

### A-ALT-05
Une alerte de dossier allocation permet d'accéder au dossier concerné.

### A-ALT-06
Le traitement d'une alerte actualise la liste après succès.

---

# 35. Tests d'acceptation — Immatriculations

### A-IMM-01
Le Gestionnaire peut consulter les adhérents éligibles.

### A-IMM-02
Le seuil de 15 000 FCFA affiché correspond à la règle métier backend.

### A-IMM-03
Un adhérent déjà immatriculé apparaît dans l'onglet correspondant.

### A-IMM-04
Le numéro CNPS est affiché lorsqu'il existe.

### A-IMM-05
La progression du seuil correspond aux données persistées.

### A-IMM-06
Le passage d'un état à un autre est contrôlé par le backend.

### A-IMM-07
Après modification, les listes sont actualisées.

---

# 36. Tests d'acceptation — Prestations familiales

### A-PF-01
Le Gestionnaire peut sélectionner la rubrique Prestations Familiales.

### A-PF-02
Les sous-rubriques disponibles sont affichées.

### A-PF-03
La sélection d'une offre actualise le détail de l'offre.

### A-PF-04
Les pièces obligatoires correspondant à l'offre sont affichées.

### A-PF-05
La progression des pièces correspond aux données du dossier.

### A-PF-06
Les filtres peuvent être combinés.

### A-PF-07
Le détail d'un dossier est accessible via « Consulter ».

### A-PF-08
Un dossier incomplet est identifiable visuellement.

### A-PF-09
Un dossier transmis CNPS est identifiable visuellement.

---

# 37. Tests de sécurité — Gestionnaire

### SEC-GC-01
Le Gestionnaire ne peut pas accéder à l'audit global.

### SEC-GC-02
Le Gestionnaire ne peut pas consulter les actions privées des rôles supérieurs.

### SEC-GC-03
Une requête API interdite est rejetée même si elle est déclenchée manuellement depuis le navigateur.

### SEC-GC-04
Le Gestionnaire ne peut pas contourner les permissions en modifiant les paramètres d'une requête frontend.

### SEC-GC-05
Les exports respectent le périmètre autorisé.

---

# 38. Ordre d'intégration recommandé

Pour éviter de développer les trois modules simultanément, intégrer progressivement.

## Étape 1 — Alertes & Relances

1. Structure de la page.
2. Compteur.
3. Onglets.
4. Cartes d'alertes.
5. Priorités.
6. Recherche/filtrage.
7. Action « Traiter l'alerte ».
8. Connexion aux données backend.
9. Actualisation après traitement.

## Étape 2 — Immatriculations

1. Bandeau de règle métier.
2. Compteur d'éligibles.
3. Onglet « À immatriculer d'urgence ».
4. Onglet « Vérification cycle 15 / 30 ».
5. Onglet « Déjà immatriculés CNPS ».
6. Tableau.
7. Recherche.
8. Actions.
9. Connexion aux données.
10. Actualisation après mutation.

## Étape 3 — Prestations familiales

1. Cartes des rubriques.
2. Sélection de la rubrique PF.
3. Sous-rubriques/offres.
4. Sélection d'une offre.
5. Détail de l'offre.
6. Pièces obligatoires.
7. Filtres.
8. Tableau des dossiers.
9. Progression des pièces.
10. Consultation du dossier.
11. Connexion API.
12. Actualisation après mutation.

---

# 39. Points à valider avant développement backend

Les captures permettent de définir précisément l'interface, mais certains éléments doivent être confirmés dans le contrat API/backend avant de coder.

### À valider

- endpoint des alertes ;
- types d'alertes disponibles ;
- statut d'une alerte ;
- endpoint de traitement d'une alerte ;
- règles exactes du seuil 15 000 FCFA ;
- règle exacte du cycle 15 / 30 ;
- endpoint des immatriculations ;
- statuts d'immatriculation ;
- modèle des dossiers CNPS ;
- modèle des prestations ;
- modèle des sous-rubriques ;
- modèle des pièces ;
- statuts de dossier ;
- endpoint de recherche ;
- endpoint d'export ;
- règles d'accès du Gestionnaire ;
- mécanisme d'actualisation temps réel éventuellement disponible.

Si un endpoint n'existe pas dans `/api/v1/openapi`, ne pas l'inventer : le marquer **[A] À ajouter** ou **[V] À valider**.

---

# 40. Conclusion fonctionnelle

Les trois interfaces constituent un ensemble cohérent pour le travail quotidien du Gestionnaire :

```text
ALERTES & RELANCES
        │
        ├── Retard de cotisation
        │
        ├── Seuil 15 000 FCFA
        │
        └── Dossier allocation
                 │
                 ▼
        IMMATRICULATIONS
                 │
        ├── À immatriculer
        ├── Vérification 15 / 30
        └── Déjà immatriculés
                 │
                 ▼
        PRESTATIONS FAMILIALES
                 │
        ├── Enfants à charge
        ├── Allocations prénatales
        ├── Maternité
        └── Naissance / accouchement
```

Le principe UX à conserver est donc :

**Identifier → comprendre → traiter → consulter le dossier → mettre à jour → actualiser la liste.**

L'objectif n'est pas de reproduire uniquement les captures graphiquement, mais de transformer les composants visibles en fonctionnalités opérationnelles du **dashboard Gestionnaire des comptes**, tout en conservant les règles d'autorisation et de séparation des responsabilités de COSITI V1.
