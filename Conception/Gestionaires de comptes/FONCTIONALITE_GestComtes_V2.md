# FONCTIONALITE_GestComtes_V2

## 1. Objet du document

Ce document formalise les fonctionnalités à intégrer progressivement dans le **dashboard du Gestionnaire des comptes** de COSITI à partir des interfaces fournies.

Le périmètre analysé ici concerne la rubrique **Dossiers CNPS** et ses deux ensembles fonctionnels visibles dans les maquettes :

1. **PVID — Pension Vieillesse, Invalidité & Décès**
2. **Risques professionnels**

L'objectif est de transformer les éléments visuels observés dans les maquettes en fonctionnalités concrètes : navigation, consultation, recherche, filtrage, sélection d'une offre, consultation des exigences, consultation d'un dossier, suivi des pièces, statuts et actions.

> **Important :** les maquettes fournies montrent notamment un profil « Conseil de Surveillance — Accès Consultation ». Elles servent ici de référence visuelle et fonctionnelle. Les droits d'action du Gestionnaire doivent rester conformes à la matrice d'habilitation COSITI. Une fonctionnalité visible dans une maquette ne signifie donc pas automatiquement que le Gestionnaire peut la modifier ou la valider.

---

# 2. Positionnement dans le dashboard Gestionnaire

## 2.1 Élément de sidebar

Le Gestionnaire dispose dans sa navigation d'une entrée :

**Dossiers CNPS**

Cette entrée doit ouvrir l'espace de gestion et de suivi des dossiers CNPS.

### Sous-ensembles fonctionnels

L'écran Dossiers CNPS doit permettre de naviguer entre :

- Vue globale des dossiers CNPS
- Prestations familiales
- Risques professionnels
- PVID — Pension Vieillesse, Invalidité & Décès
- Tous les dossiers

Dans cette V2, le travail détaillé porte principalement sur :

- **Dossiers CNPS**
- **PVID**
- **Risques professionnels**

---

# 3. Écran principal — Dossiers CNPS

## 3.1 En-tête

L'écran présente :

- Badge/contexte : **CNPS**
- Fil d'Ariane : **RSTI & Prévoyance**
- Titre : **Dossiers CNPS**
- Description fonctionnelle indiquant que les dossiers sont organisés par rubriques techniques et sous-rubriques d'offres
- Action d'export : **Export Excel**

### Fonctionnalité

Le Gestionnaire doit pouvoir comprendre immédiatement :

- qu'il travaille dans l'espace CNPS ;
- quelle rubrique il consulte ;
- combien de dossiers existent dans chaque rubrique ;
- comment accéder au détail d'une catégorie ;
- comment rechercher un dossier ;
- comment filtrer les dossiers.

---

# 4. Bandeau d'information / contexte d'accès

La maquette présente un bandeau :

**Profil Conseil de Surveillance (Accès Consultation)**

avec le message indiquant que la consultation détaillée de l'état des dossiers, des pièces justificatives et l'export Excel sont autorisés.

Pour le Gestionnaire, ce bandeau doit être adapté à son propre contexte.

### Pour le Gestionnaire

Le système doit afficher uniquement les droits réellement disponibles pour son rôle.

Exemple :

**Profil Gestionnaire des comptes**

Puis éventuellement :

- consultation des dossiers ;
- création/constitution d'un dossier lorsque autorisée ;
- ajout ou suivi des pièces lorsque autorisé ;
- transmission du dossier ;
- suivi des relances ;
- autres actions explicitement autorisées par l'API.

Ne jamais afficher une action uniquement parce qu'elle existe dans la maquette si le rôle courant ne possède pas cette permission.

---

# 5. Cartes statistiques principales

La maquette présente quatre cartes principales.

## 5.1 Carte Prestations Familiales

Éléments :

- Icône
- Libellé : **Prestations Familiales**
- Code : **PF (Code 01)**
- Nombre de dossiers
- Description : enfants, scolarité, maternité & naissances

### Interaction

Cliquer sur la carte doit :

1. sélectionner la rubrique ;
2. mettre la carte en état actif ;
3. afficher les sous-rubriques correspondantes ;
4. mettre à jour la liste des dossiers.

---

# 6. Carte Risques Professionnels

Éléments :

- Icône de protection
- Libellé : **Risques Professionnels**
- Code : **RP (Code 02)**
- Nombre de dossiers
- Description : accidents du travail, soins & rentes

### Interaction

Au clic :

- la carte devient active ;
- le thème visuel de la rubrique est appliqué ;
- les offres RP apparaissent ;
- les détails de l'offre sélectionnée sont affichés ;
- la liste des dossiers est filtrée sur cette rubrique.

---

# 7. Carte PVID

Éléments :

- Icône institutionnelle
- Libellé : **PVID (Retraite & Décès)**
- Code : **PVID (Code 03)**
- Nombre de dossiers
- Description : pension vieillesse, invalidité & réversion

### Interaction

Au clic :

- activation de PVID ;
- affichage des sous-rubriques PVID ;
- sélection d'une offre ;
- affichage des règles et pièces exigées ;
- filtrage de la liste des dossiers.

---

# 8. Carte Tous les dossiers CNPS

Éléments :

- Icône couches/liste
- Libellé : **Tous les Dossiers CNPS**
- Nombre global
- Description : vue transverse multi-rubriques

### Fonctionnalité

Cette carte donne accès à une vue transversale.

Elle doit permettre au Gestionnaire de retrouver les dossiers indépendamment de leur rubrique :

- Prestations familiales ;
- Risques professionnels ;
- PVID.

La sélection de cette carte doit retirer le filtre de rubrique.

---

# 9. Sélection d'une rubrique

Le comportement observé dans les maquettes est important :

- la carte sélectionnée reçoit une bordure accentuée ;
- le bloc de rubrique correspondant apparaît ;
- le contenu est mis à jour sans quitter l'écran ;
- les sous-rubriques sont présentées sous forme de cartes.

### Règle UX

Une seule rubrique principale est active à la fois.

États possibles :

- aucune rubrique ;
- Prestations familiales active ;
- Risques professionnels actif ;
- PVID actif ;
- Tous les dossiers actif.

---

# 10. Bloc de rubrique PVID

Lorsque le Gestionnaire sélectionne PVID, afficher :

**PVID (Pension Vieillesse, Invalidité & Décès)**

Description :

> Pensions de vieillesse, allocations uniques de départ, rentes d'invalidité et pensions de réversion pour les ayants droit.

Le bloc doit contenir :

- titre de rubrique ;
- description ;
- liste des offres ;
- nombre de dossiers par offre ;
- délai moyen d'instruction ;
- offre sélectionnée ;
- détail de l'offre.

---

# 11. Sous-rubriques PVID

La maquette présente 5 choix fonctionnels.

## 11.1 Toutes les offres

Permet d'afficher tous les dossiers de la rubrique PVID.

Informations :

- nombre de dossiers ;
- description « Afficher tous les dossiers de cette rubrique ».

### Action

Au clic :

- aucune offre individuelle n'est sélectionnée ;
- tous les dossiers PVID sont affichés.

---

# 12. PVID — Pension de Vieillesse Normale

Libellé :

**Pension de Vieillesse Normale (Retraite RSTI / CNPS)**

Description observée :

Pension viagère trimestrielle servie à l'assuré ayant atteint l'âge légal et cumulé le nombre requis de cotisations.

### Informations à afficher

- nombre de dossiers ;
- délai moyen d'instruction ;
- badge de mode de calcul ;
- pièces obligatoires.

### Délai affiché

**45 à 60 jours d'instruction**

### Mode de calcul affiché

**Calcul selon les trimestres validés (minimum garanti)**

### Pièces obligatoires observées

1. Demande officielle de liquidation de pension de vieillesse *
2. Extrait d'acte de naissance de l'assuré — 3 mois *
3. Photocopie CNI ou passeport légalisé *
4. Relevé de carrière individuel et bordereaux de cotisations COSITI/CNPS *
5. Attestation de cessation ou d'aménagement d'activité *
6. RIB bancaire ou compte Mobile Money pour paiement des arrérages *
7. 3 photos d'identité récentes de l'assuré *

---

# 13. PVID — Allocation Unique de Vieillesse

Libellé :

**Allocation Unique de Vieillesse (Versement forfaitaire)**

Description observée :

Remboursement forfaitaire sous forme de capital unique pour l'assuré n'ayant pas atteint le minimum de trimestres cotisés.

### Délai affiché

**30 jours**

### Mode de versement affiché

**Versement unique des cotisations revalorisées**

### Pièces obligatoires observées

1. Demande formelle d'allocation unique de vieillesse *
2. Extrait d'acte de naissance et pièce d'identité *
3. Historique des cotisations COSITI certifié *
4. RIB bancaire ou compte Mobile Money certifié *

---

# 14. PVID — Pension d'Invalidité Prématurée

Libellé :

**Pension d'Invalidité Prématurée (Inaptitude médicale)**

Description observée :

Pension accordée avant l'âge de la retraite si l'adhérent est frappé d'une inaptitude médicale permanente à l'exercice de son métier.

### Délai affiché

**30 jours après expertise médicale**

### Mode de calcul/prise en charge affiché

**Pension calculée sur la moyenne des cotisations**

### Pièces obligatoires observées

1. Rapport médical circonstancié du médecin traitant sous pli confidentiel *
2. Avis conforme du médecin conseil de la CNPS *
3. Relevé récapitulatif des cotisations COSITI à jour *
4. Extrait d'acte de naissance et pièce d'identité *

---

# 15. PVID — Pension de Réversion & Capital Décès

Libellé :

**Pension de Réversion & Capital Décès (Conjoints et orphelins)**

Description observée :

Paiement d'un capital décès d'urgence et service d'une pension aux veufs/veuves et orphelins mineurs de l'adhérent décédé.

### Délai affiché

**20 jours après déclaration du décès**

### Indication affichée dans la maquette

**Capital décès immédiat + 50 % de la pension au conjoint**

Cette information doit être considérée comme une règle affichée par la maquette et non comme une règle métier juridiquement vérifiée dans ce document.

### Pièces obligatoires observées

1. Extrait d'acte de décès de l'adhérent assuré *
2. Certificat de mariage légal délivré par le tribunal *
3. Acte de mariage religieux du conjoint survivant *
4. Extraits d'actes de naissance de tous les orphelins mineurs *
5. Certificats de scolarité des orphelins scolarisés *
6. Relevé d'identité bancaire du conjoint tuteur *

---

# 16. Comportement commun des offres PVID

Chaque carte d'offre doit afficher :

- intitulé ;
- courte description ;
- nombre de dossiers ;
- délai moyen d'instruction ;
- indicateur de sélection.

Au clic :

1. la carte devient active ;
2. un bloc « Détail de l'offre » apparaît ;
3. les informations métier sont affichées ;
4. les pièces obligatoires sont listées ;
5. la liste des dossiers est filtrée.

---

# 17. Bloc « Détail de l'offre »

Ce composant doit être réutilisable.

Il comprend :

### A. Titre

Nom complet de l'offre.

### B. Description

Description fonctionnelle courte.

### C. Délai

Exemple :

**Délai moyen d'instruction CNPS : 30 jours**

### D. Badge métier

Exemple :

**Versement unique des cotisations revalorisées**

### E. Pièces obligatoires

Liste structurée avec :

- libellé ;
- caractère obligatoire ;
- éventuellement statut de réception lorsque l'on consulte un dossier réel.

---

# 18. Bloc « Pièces obligatoires » vs pièces d'un dossier

Il faut distinguer deux notions.

### Référentiel de l'offre

Il indique :

> « Quelles pièces sont normalement nécessaires pour cette offre ? »

### Dossier individuel

Il indique :

> « Quelles pièces ont réellement été reçues pour cet adhérent ? »

Le Gestionnaire doit pouvoir comparer les deux.

Exemple :

**7 pièces requises**

Dossier :

**5/7 reçues**

Le système doit identifier :

- pièces reçues ;
- pièces manquantes ;
- pièces rejetées si ce statut existe dans le modèle métier ;
- pièces à compléter.

---

# 19. Recherche des dossiers

La zone de recherche visible dans les maquettes contient :

**Rechercher par Matricule, Adhérent, N° CNPS...**

La recherche doit pouvoir porter au minimum sur :

- matricule COSITI ;
- nom/prénom de l'adhérent ;
- numéro CNPS.

La recherche doit être indépendante de la sélection d'une offre.

---

# 20. Filtres des dossiers

Deux filtres sont visibles.

## 20.1 Filtre statut

Valeur par défaut :

**Tous les statuts de dossier**

Il doit permettre de filtrer les dossiers selon leur état métier.

Les valeurs exactes doivent provenir du backend/API.

Ne pas inventer de statuts supplémentaires dans le frontend.

## 20.2 Filtre certificats de scolarité

Valeur visible :

**Tous certificats de scolarité**

Ce filtre est particulièrement pertinent pour les dossiers où les certificats de scolarité constituent une pièce.

Il doit permettre de distinguer les dossiers selon la présence/absence ou le statut des certificats lorsque cette information est supportée par l'API.

---

# 21. Vue liste des dossiers

La maquette globale montre un tableau comprenant notamment :

| Colonne | Fonction |
|---|---|
| Matricule COSITI | Identifier le dossier |
| Adhérent & famille | Identifier l'adhérent et les personnes à charge |
| Matricule CNPS | Référence CNPS |
| Rubrique & sous-offre | Identifier le type de prestation |
| Statut dossier | État d'avancement |
| Pièces réunies | Progression documentaire |
| Transmission / dépôt | État de transmission |
| Action | Ouvrir/consulter le dossier |

---

# 22. Indicateur de progression documentaire

La maquette affiche par exemple :

**5/8**

avec une barre de progression.

Fonctionnalité :

- calculer le nombre de pièces reçues ;
- afficher le nombre total de pièces requises ;
- représenter visuellement la progression ;
- permettre d'identifier rapidement les dossiers incomplets.

Exemples :

- `5/8` → dossier incomplet ;
- `8/8` → dossier documentaire complet.

Le calcul définitif doit être effectué à partir des données retournées par l'API.

---

# 23. Statut de transmission

La liste affiche une zone :

**Transmission / dépôt**

avec une information telle que :

- Déposé le 20/02/2026
- Transmis le 22/02/2026

La date et le statut doivent provenir du backend.

---

# 24. Action « Consulter »

Chaque ligne possède une action :

**Consulter**

Au clic :

- ouverture du dossier ;
- affichage des informations ;
- affichage des pièces ;
- affichage du statut ;
- affichage des dates ;
- affichage des observations ;
- affichage du journal d'activité si le rôle y est autorisé.

---

# 25. Écran détaillé d'un dossier CNPS

La première capture montre une fenêtre détaillée.

Structure à reproduire :

### En-tête

- identifiant du dossier ;
- badge de rubrique ;
- titre du dossier ;
- nom de l'adhérent ;
- matricule CNPS ;
- bouton de fermeture.

### Bandeau de droits

Indiquer clairement si l'utilisateur :

- consulte ;
- peut modifier ;
- peut ajouter une pièce ;
- peut transmettre ;
- peut relancer ;
- peut uniquement lire.

---

# 26. Informations générales du dossier

La fenêtre montre notamment :

### Rubrique CNPS

Exemple :

**Prestations Familiales (PF)**

### Sous-rubrique

Exemple :

**Allocations Familiales — Enfants scolarisés & à charge**

### Statut actuel

Exemple :

**Dossier incomplet**

### Nombre d'enfants déclarés

Exemple :

**3**

Ces informations doivent être chargées depuis le dossier.

---

# 27. Alerte sur une pièce critique

La maquette montre un bloc :

**Certificats de scolarité des enfants**

avec :

**Non fournis**

Fonctionnalité :

- identifier les pièces critiques ;
- afficher leur état ;
- signaler immédiatement un manque bloquant ;
- permettre au Gestionnaire de savoir quelle pièce doit être récupérée.

---

# 28. Liste des pièces du dossier

Chaque pièce contient :

- case/indicateur d'état ;
- nom de la pièce ;
- caractère obligatoire ;
- date de réception si disponible ;
- note/référence ;
- état de la pièce.

Exemples observés :

- extrait d'acte de naissance ;
- photocopie CNI ;
- attestation ou certificat d'immatriculation CNPS ;
- certificat de mariage ;
- extraits d'acte de naissance des enfants ;
- certificats de scolarité ;
- certificat de vie et d'entretien collectif ;
- photos d'identité.

---

# 29. Notes et références documentaires

Chaque document peut disposer d'une zone :

**Note, référence ou relance...**

Elle doit permettre de conserver une information opérationnelle liée à la pièce.

Exemples fonctionnels :

- référence du document ;
- remarque ;
- information de relance ;
- précision administrative.

La persistance et la modification doivent respecter les permissions du rôle.

---

# 30. Dates de suivi

Le dossier détaillé présente :

### Date dépôt à la COSITI

Date de réception du dossier par COSITI.

### Date transmission CNPS

Date de transmission à la CNPS.

### Prochaine relance

Date prévue pour une relance.

Ces dates sont essentielles pour le suivi opérationnel du Gestionnaire.

---

# 31. Observations administratives & suivi

Zone texte destinée aux observations.

Elle peut servir à noter :

- pièce manquante ;
- relance effectuée ;
- échange avec l'adhérent ;
- difficulté administrative ;
- information à transmettre à un supérieur.

Les droits d'écriture doivent être contrôlés côté API.

---

# 32. Journal d'activité du dossier

La maquette affiche :

**Journal d'activité du dossier**

avec :

- utilisateur ;
- action ;
- date/heure.

Exemples observés :

- ouverture du dossier ;
- réception de pièces ;
- relance téléphonique ;
- ajout/modification d'une information.

### Règle

Le journal ne doit pas être un simple historique frontend.

Il doit être alimenté par le backend et rester cohérent avec le système d'audit COSITI.

---

# 33. PVID — fonctionnement de filtrage

Lorsque l'utilisateur sélectionne :

**PVID**

la séquence doit être :

```text
Dossiers CNPS
   ↓
PVID
   ↓
Sélection d'une offre
   ↓
Détail de l'offre
   ↓
Recherche / filtres
   ↓
Liste des dossiers
   ↓
Consultation d'un dossier
```

---

# 34. Risques professionnels

Lorsque le Gestionnaire sélectionne **Risques Professionnels**, afficher :

**Risques Professionnels**

Description observée :

> Prise en charge intégrale des accidents du travail, maladies professionnelles, frais médicaux et chirurgicaux, rééducation et rentes d'incapacité.

La rubrique utilise une identité visuelle jaune/orange dans les maquettes.

---

# 35. Sous-rubriques Risques Professionnels

Les maquettes montrent 5 choix.

## 35.1 Toutes les offres

Permet de voir tous les dossiers de la rubrique RP.

---

# 36. RP — Accident du Travail & Trajet

Libellé :

**Accident du Travail & Trajet (Déclaration et prise en charge)**

Description :

Prise en charge d'urgence de tout accident survenu sur le lieu d'activité ou sur le trajet direct.

### Délai affiché

**Déclaration sous 48h obligatoire**

### Badge

**Prise en charge médicale à 100 %**

### Pièces obligatoires observées

1. Formulaire officiel déclaration d'accident du travail (DAT) *
2. Certificat médical initial constatant les lésions *
3. Rapport d'enquête ou témoignages des circonstances (COSITI) *
4. Reçus et factures détaillées des soins d'urgence *
5. Carte d'immatriculation CNPS de l'adhérent *

---

# 37. RP — Maladie Professionnelle

Libellé :

**Maladie Professionnelle (Reconnaissance et soins)**

Description :

Affection liée aux conditions de travail.

### Délai affiché

**30 jours après expertise médicale**

### Badge

**Prise en charge intégrale des soins et bilans**

### Pièces obligatoires observées

1. Déclaration maladie professionnelle *
2. Rapport d'exposition au risque dans l'activité habituelle *
3. Examens biologiques ou radiologiques de confirmation *
4. Historique des cotisations COSITI à jour *

---

# 38. RP — Prise en Charge des Soins Médicaux

Libellé :

**Prise en Charge des Soins Médicaux, Pharmaceutiques & Prothèses**

Description :

Remboursement ou prise en charge directe des médicaments, appareillages, rééducation motrice.

### Délai affiché

**14 jours après validation des ordonnances**

### Badge

**Remboursement sur justificatifs validés**

### Pièces obligatoires observées

1. Prescriptions et ordonnances médicales originales *
2. Factures normalisées certifiées acquittées *
3. Rapport du médecin traitant ou spécialiste *

---

# 39. RP — Rente d'Incapacité Permanente ou de Survivants

Libellé :

**Rente d'Incapacité Permanente ou de Survivants**

Description :

Rente viagère ou capital forfaitaire versé en cas de réduction définitive de la capacité de travail ou décès.

### Délai affiché

**Commission médicale CNPS**

### Badge

**Pourcentage fixé par le barème d'invalidité**

### Pièces obligatoires observées

1. Certificat médical de consolidation ou guérison avec séquelles *
2. Décision du médecin conseil de la CNPS fixant le taux d'IPP *
3. Acte de décès et certificat d'hérédité si rente de survivants *
4. Dossier administratif complet COSITI *

---

# 40. Comportement commun des offres RP

Le comportement doit être identique à PVID :

```text
Sélection RP
   ↓
Sélection d'une offre
   ↓
Affichage du détail
   ↓
Affichage des délais
   ↓
Affichage du mode de prise en charge
   ↓
Affichage des pièces requises
   ↓
Filtrage de la liste
   ↓
Consultation du dossier
```

---

# 41. Vue « Toutes les offres »

Les maquettes montrent une vue où seul le bloc de rubrique est affiché sans détail d'offre lorsqu'aucune offre spécifique n'est sélectionnée.

Cette vue doit :

- afficher toutes les offres ;
- permettre de sélectionner une offre ;
- afficher le nombre de dossiers par offre ;
- ne pas forcer la sélection d'une offre ;
- afficher tous les dossiers correspondant à la rubrique lorsque l'utilisateur choisit « Toutes les offres ».

---

# 42. État vide

Lorsque aucun dossier ne correspond aux critères, afficher un état vide similaire aux maquettes :

**Aucun dossier CNPS trouvé pour ces critères.**

Puis un texte explicatif.

L'état vide doit être contextualisé :

- aucune recherche ;
- aucun dossier dans la rubrique ;
- aucun dossier pour l'offre ;
- aucun dossier correspondant aux filtres.

Éviter d'afficher une erreur lorsqu'il s'agit simplement d'un résultat vide.

---

# 43. Export Excel

La maquette montre :

**Export Excel**

Le bouton doit respecter les permissions du rôle.

Avant export :

- vérifier l'autorisation backend ;
- appliquer les filtres courants si le contrat API le prévoit ;
- exporter uniquement les données autorisées ;
- journaliser l'opération si les règles d'audit COSITI l'exigent.

Ne pas construire un export contenant des champs auxquels le Gestionnaire n'a pas accès.

---

# 44. Fonctionnement attendu pour le Gestionnaire

Le Gestionnaire est l'acteur opérationnel de suivi des adhérents et des dossiers.

Dans cette V2, l'espace Dossiers CNPS doit lui permettre principalement de :

### Consulter

- les dossiers CNPS relevant de son périmètre ;
- les rubriques ;
- les offres ;
- les pièces attendues ;
- les pièces reçues ;
- les statuts ;
- les dates ;
- les observations autorisées ;
- le suivi du dossier.

### Rechercher

- par matricule COSITI ;
- par adhérent ;
- par numéro CNPS.

### Filtrer

- par rubrique ;
- par sous-rubrique/offre ;
- par statut ;
- par état des pièces ;
- par certificat de scolarité lorsque pertinent.

### Suivre

- dossiers incomplets ;
- pièces manquantes ;
- délais ;
- dates de transmission ;
- prochaines relances.

### Agir

Les actions d'écriture doivent être activées uniquement si elles font partie des permissions du Gestionnaire dans le backend.

---

# 45. Permissions et séparation des responsabilités

Le frontend ne doit jamais décider seul qu'une action est autorisée.

Architecture attendue :

```text
Utilisateur connecté
      ↓
Role / Permissions
      ↓
Frontend masque ou désactive l'action
      ↓
API vérifie réellement l'autorisation
      ↓
Service métier
      ↓
Base de données
      ↓
Audit si action concernée
```

Une action masquée dans le frontend doit également être refusée côté API si elle est appelée manuellement.

---

# 46. Mise à jour des données

Les compteurs doivent rester cohérents avec les données réelles.

Exemples :

- nombre de dossiers PVID ;
- nombre de dossiers RP ;
- nombre de dossiers par offre ;
- progression des pièces ;
- statut du dossier.

Après une opération réussie :

- invalider les queries concernées ;
- recharger les données ;
- mettre à jour les compteurs ;
- mettre à jour la liste ;
- éviter les données fictives ou statiques.

Si une vraie diffusion temps réel est prévue par le backend, elle pourra être branchée ultérieurement. Le frontend ne doit pas simuler du temps réel avec des données inventées.

---

# 47. Architecture UI réutilisable

Pour éviter de créer plusieurs composants presque identiques, prévoir des composants génériques.

## Composants recommandés

```text
CnpsDashboard
CnpsCategoryCard
CnpsCategorySection
CnpsOfferCard
CnpsOfferDetails
CnpsOfferDocuments
CnpsSearchFilters
CnpsDossierTable
CnpsDossierRow
CnpsDossierDetails
CnpsDocumentChecklist
CnpsFollowUpPanel
CnpsActivityJournal
CnpsEmptyState
CnpsExportButton
```

Les données de PVID et RP doivent être pilotées par configuration/API plutôt que par duplication massive du JSX.

---

# 48. Modèle fonctionnel recommandé

Conceptuellement :

```text
CNPS
├── Rubrique
│   ├── PVID
│   │   ├── Toutes les offres
│   │   ├── Pension vieillesse normale
│   │   ├── Allocation unique vieillesse
│   │   ├── Pension invalidité prématurée
│   │   └── Réversion & capital décès
│   │
│   └── Risques professionnels
│       ├── Toutes les offres
│       ├── Accident du travail & trajet
│       ├── Maladie professionnelle
│       ├── Soins médicaux / pharmaceutiques / prothèses
│       └── Rente incapacité permanente / survivants
│
└── Dossier
    ├── Adhérent
    ├── Offre
    ├── Statut
    ├── Pièces
    ├── Dates
    ├── Observations
    └── Journal d'activité
```

---

# 49. États UI à prévoir

Chaque composant doit gérer au minimum :

### Chargement

Afficher un état de chargement cohérent.

### Succès

Afficher les données.

### Vide

Afficher « Aucun dossier... ».

### Erreur

Afficher un message fonctionnel compréhensible.

### Non autorisé

Ne pas afficher une action interdite.

### Donnée indisponible

Ne pas remplacer silencieusement une donnée métier par une valeur inventée.

---

# 50. Responsive

La maquette est principalement desktop.

Pour le dashboard Gestionnaire :

- desktop : tableau complet ;
- tablette : réduction progressive des colonnes ;
- petit écran : transformation du tableau en cartes/lignes empilées ;
- filtres accessibles sans casser la lisibilité ;
- détail dossier dans une modal/panneau adapté à la largeur disponible.

Le responsive ne doit pas supprimer une information métier importante.

---

# 51. Priorité d'intégration dans le dashboard Gestionnaire

## Phase 1 — Dossiers CNPS

Implémenter :

- entrée sidebar ;
- page Dossiers CNPS ;
- quatre cartes statistiques ;
- recherche ;
- filtres ;
- tableau ;
- consultation du dossier ;
- progression documentaire.

## Phase 2 — PVID

Implémenter :

- carte PVID ;
- bloc PVID ;
- toutes les offres ;
- 4 offres détaillées ;
- pièces obligatoires ;
- délais ;
- sélection d'offre ;
- filtrage des dossiers.

## Phase 3 — Risques professionnels

Implémenter :

- carte RP ;
- bloc RP ;
- toutes les offres ;
- 4 offres détaillées ;
- pièces obligatoires ;
- délais ;
- sélection d'offre ;
- filtrage des dossiers.

## Phase 4 — Suivi opérationnel

Ajouter selon les permissions API :

- gestion des pièces ;
- observations ;
- relances ;
- transmission ;
- journal ;
- notifications ;
- export.

---

# 52. Critères d'acceptation

## Dossiers CNPS

- [ ] La rubrique Dossiers CNPS est accessible depuis la sidebar du Gestionnaire.
- [ ] Les compteurs correspondent aux données backend.
- [ ] Les quatre cartes sont interactives.
- [ ] La carte active est visuellement identifiable.
- [ ] La recherche fonctionne par matricule, adhérent et numéro CNPS.
- [ ] Les filtres fonctionnent sans rechargement complet de la page.
- [ ] La liste affiche les informations autorisées.
- [ ] La progression des pièces est calculée à partir des données réelles.
- [ ] Le bouton Consulter ouvre le dossier correspondant.
- [ ] L'état vide est géré.

## PVID

- [ ] PVID peut être sélectionné.
- [ ] Les 4 offres PVID sont affichées.
- [ ] « Toutes les offres » est disponible.
- [ ] Chaque offre affiche son délai.
- [ ] Chaque offre affiche ses pièces requises.
- [ ] La sélection d'une offre filtre les dossiers.
- [ ] Le détail de l'offre change sans changer de page.
- [ ] Le nombre de dossiers est cohérent avec l'API.

## Risques professionnels

- [ ] RP peut être sélectionné.
- [ ] Les 4 offres RP sont affichées.
- [ ] « Toutes les offres » est disponible.
- [ ] Chaque offre affiche son délai.
- [ ] Chaque offre affiche ses pièces requises.
- [ ] La sélection d'une offre filtre les dossiers.
- [ ] Le détail de l'offre change sans changer de page.

## Sécurité

- [ ] Une action interdite au Gestionnaire est refusée par l'API.
- [ ] Les données d'un autre périmètre ne sont pas exposées.
- [ ] Les documents ne sont pas accessibles via URL publique directe.
- [ ] Les exports respectent les permissions.
- [ ] Les actions sensibles sont journalisées conformément aux règles COSITI.

---

# 53. Points à ne pas inventer pendant le développement

Les captures permettent de définir l'interface et les informations visibles, mais elles ne permettent pas de déduire avec certitude :

- les endpoints API ;
- les statuts backend exacts ;
- les règles CNPS juridiquement applicables ;
- les calculs de pension ;
- les droits d'écriture précis du Gestionnaire ;
- les transitions de statut ;
- les règles de transmission à la CNPS ;
- les notifications ;
- les règles exactes de relance ;
- les règles d'archivage.

Ces éléments doivent venir du contrat API, du cahier des charges et des règles métier validées.

---

# 54. Résultat attendu de cette V2

Le dashboard Gestionnaire doit évoluer d'une simple navigation vers un véritable **centre opérationnel de suivi des dossiers CNPS**.

Le parcours cible est :

```text
Sidebar
  ↓
Dossiers CNPS
  ↓
Vue globale
  ↓
Choix d'une rubrique
  ↓
Choix d'une offre
  ↓
Consultation des exigences
  ↓
Recherche / filtres
  ↓
Liste des dossiers
  ↓
Ouverture d'un dossier
  ↓
Contrôle des pièces
  ↓
Suivi des dates / statut / relances
  ↓
Action autorisée
  ↓
Mise à jour backend
  ↓
Actualisation de l'interface
  ↓
Journalisation si nécessaire
```

## Principe directeur

**Le Gestionnaire doit pouvoir passer rapidement de « quelle prestation ? » à « quelle offre ? », puis à « quel dossier ? », puis à « quelles pièces manquent et quelle action dois-je effectuer ? ».**

La V2 doit donc conserver la logique visuelle observée dans les maquettes tout en l'intégrant dans les règles d'habilitation et d'architecture de COSITI.
