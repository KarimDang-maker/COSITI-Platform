# COSITI V1 — CORRECTION DES DROITS, HIÉRARCHIE, VISIBILITÉ ET WORKFLOW

Tu dois maintenant corriger les fonctionnalités déjà développées de la plateforme COSITI V1.

IMPORTANT :
- Ne réécris pas inutilement les fonctionnalités qui fonctionnent déjà.
- Commence par analyser le code existant, les routes, les composants, les permissions, les services API et les modèles utilisés.
- Identifie les conflits entre les droits actuels et les règles ci-dessous.
- Corrige le système de manière cohérente FRONTEND + BACKEND si les deux sont disponibles.
- Le frontend ne doit jamais être considéré comme la sécurité principale : les permissions doivent être contrôlées côté API/backend.
- Ne crée aucun nouveau rôle non demandé.
- Ne supprime aucune fonctionnalité métier existante sans vérifier son impact.
- Ne crée pas de données fictives pour simuler les fonctionnalités.
- Si une API nécessaire n'existe pas, signale précisément le besoin au lieu d'inventer silencieusement un endpoint.

==================================================
1. HIÉRARCHIE DES ACTEURS
==================================================

Les rôles V1 sont :

1. PCA
2. DG
3. DGA
4. DAF
5. Gestionnaire des comptes
6. Chef des agents de terrain
7. Agent de terrain
8. Super Administrateur

Chaîne opérationnelle terrain :

Agent de terrain
        ↓
Gestionnaire des comptes
        ↓
DGA

Le Chef des agents de terrain est un acteur de supervision terrain.

Il travaille avec la Gestionnaire des comptes pour l'organisation opérationnelle du terrain.

La DGA :
- peut ajouter un nouvel Agent de terrain ;
- peut désigner qui devient Chef des agents de terrain ;
- peut modifier cette désignation selon les règles de la plateforme.

==================================================
2. RÈGLE MAJEURE DE VISIBILITÉ
==================================================

Un utilisateur ne doit jamais pouvoir consulter les actions internes réalisées par des acteurs situés au-dessus de lui dans la hiérarchie.

Exemple :

La Gestionnaire des comptes NE DOIT PAS voir :
- les actions du DAF ;
- les actions de la DGA ;
- les actions du DG ;
- les actions du PCA ;
- les actions internes du Super Administrateur.

Un Agent de terrain NE DOIT PAS voir :
- les actions de la Gestionnaire ;
- les actions de la DGA ;
- les actions du DAF ;
- les actions du DG ;
- les actions du PCA ;
- les actions du Super Administrateur.

Le Chef des agents de terrain ne doit pas voir les actions internes de ses supérieurs.

La visibilité doit donc être déterminée par :
- le rôle ;
- le niveau hiérarchique ;
- le périmètre fonctionnel ;
- le périmètre organisationnel ;
- la nature de l'information.

NE PAS simplement afficher ou cacher les menus côté frontend.

Une API interdite doit également refuser l'accès.

==================================================
3. AUDIT GLOBAL EN TEMPS RÉEL
==================================================

Deux acteurs seulement ont une vision globale des actions réalisées sur la plateforme :

- PCA
- Super Administrateur

Ils peuvent consulter les événements/actions pertinents de la plateforme en temps réel.

Cette vision doit permettre notamment de suivre :
- connexions ;
- créations ;
- modifications ;
- validations ;
- annulations ;
- changements de rôles ;
- changements d'affectation ;
- opérations financières ;
- opérations sur les adhérents ;
- campagnes ;
- rapports ;
- événements administratifs ;
- événements de sécurité.

IMPORTANT :

La vision globale de l'audit ne signifie pas que tous les utilisateurs peuvent voir l'audit.

Seuls :
- PCA
- Super Administrateur

ont cette vision globale.

Le PCA peut consulter l'activité.

Le Super Administrateur est le SEUL acteur autorisé à :
- exporter l'audit (Fontinalite backend egalement) ;
- imprimer l'audit (Fontinalite backend egalement);
- générer le rapport d'audit en PDF (Fontinalite backend egalement).

Le bouton "Exporter PDF / Imprimer l'audit" doit donc être invisible pour le PCA et tous les autres rôles.

Toute génération de rapport d'audit doit elle-même être auditée.

==================================================
4. LISTE DES ADHÉRENTS
==================================================

La liste complète des adhérents COSITI est accessible uniquement aux rôles autorisés de niveau gestion/direction :

- Gestionnaire des comptes
- DAF
- DGA
- DG
- PCA
- Super Administrateur

L'Agent de terrain et le Chef des agents de terrain ne doivent PAS avoir automatiquement accès à la liste complète.

Ils doivent uniquement accéder aux adhérents correspondant à leur périmètre opérationnel.

La visibilité terrain doit être limitée à :
- leur portefeuille ;
- leur zone ;
- les adhérents qui leur sont affectés ;
- les données nécessaires à leur travail.

NE PAS donner à un agent terrain une vue globale simplement parce qu'il peut consulter un adhérent.

==================================================
5. CRÉATION D'UN NOUVEL ADHÉRENT
==================================================

Une seule personne peut créer un nouvel adhérent :
Lors de la creation d'un nouvel adherent le gestionaire mentionne des ellement en dur sur la plateforme qui nous permettent de constituer le profil professionnel complet ou partiel de celui ci (Categorie, proffesion, secteur...etc)

GESTIONNAIRE DES COMPTES.

Donc :

Gestionnaire :
    CREATE adhérent = AUTORISÉ

Agent terrain :
    CREATE adhérent = INTERDIT
    sauf si le workflow existant prévoit une saisie préparatoire clairement séparée de la création définitive.

DAF :
    CREATE adhérent = INTERDIT

DGA :
    CREATE adhérent = INTERDIT

DG :
    CREATE adhérent = INTERDIT

PCA :
    CREATE adhérent = INTERDIT

Super Administrateur :
    ne doit pas être utilisé comme acteur métier de création d'adhérent.

Le Super Administrateur administre le système, pas les opérations métier à la place des utilisateurs.

==================================================
6. GESTION FINANCIÈRE — DAF
==================================================

Le DAF est le seul acteur autorisé à effectuer les validations et modifications financières définitives sur la plateforme.

Le DAF peut :
- consulter les opérations financières ;
- contrôler les paiements ;
- valider les paiements ;
- modifier les données financières autorisées ;
- gérer les informations financières des adhérents ;
- contrôler les cotisations ;
- effectuer les corrections financières autorisées ;
- annuler une opération lorsque le workflow l'autorise ;
- produire ses rapports.

Les autres acteurs ne doivent PAS pouvoir modifier directement les données financières validées.

IMPORTANT :
La Gestionnaire peut enregistrer un paiement en statut :

"À VALIDER"

Elle ne peut PAS le valider définitivement.

Workflow :

Gestionnaire
    ↓
Enregistre paiement
    ↓
Statut = À VALIDER
    ↓
DAF
    ↓
Contrôle
    ↓
Validation
    ↓
Paiement VALIDÉ

Le DAF doit sélectionner l'adhérent concerné puis renseigner/contrôler la valeur relative à sa cotisation.

La validation doit être traçable :
- utilisateur ;
- date ;
- heure ;
- montant ;
- adhérent ;
- ancienne valeur ;
- nouvelle valeur lorsque pertinent ;
- motif si modification/correction ;
- identifiant de l'opération.

Séparation des tâches :

GESTIONNAIRE
= saisie

DAF
= contrôle + validation financière

==================================================
7. DOUBLE COMPTE DE L'ADHÉRENT
==================================================

Chaque adhérent possède deux comptes métier : les deux compte metier sont sur un seul profil (En selectionant un adherent dans le systeme on peut voir l'etat de ses deux comptes sur la plateforme ce qui nous permtra plustard de creer un dashboard mobile pour les adherents, un seul compte par adherent)

1. Compte Sécurité Sociale
2. Compte Épargne

Le système doit enregistrer les allocations de cotisation séparément.

Exemple pack 700 :

700 FCFA → Sécurité Sociale
0 FCFA → Épargne

Exemple pack 1000 :

700 FCFA → Sécurité Sociale
300 FCFA → Épargne

Mais l'adhérent peut choisir une autre allocation selon les règles autorisées.

RÈGLE ABSOLUE :

Le minimum affecté au compte Sécurité Sociale est de :

700 FCFA.

Donc une allocation comme :

600 Sécurité Sociale
400 Épargne

DOIT être refusée.

Le système doit empêcher toute allocation qui ferait descendre la Sécurité Sociale sous 700 FCFA.

==================================================
8. ALLOCATION PERSONNALISÉE
==================================================

Lorsqu'un adhérent choisit la manière dont il souhaite répartir ses fonds, la préférence doit être enregistrée dans son dossier.

Exemple :

Montant = 1 300 FCFA

Sécurité Sociale = 900 FCFA
Épargne = 400 FCFA

ou :

Sécurité Sociale = 700 FCFA
Épargne = 600 FCFA

ou toute autre répartition autorisée respectant :

Sécurité Sociale >= 700 FCFA

Le montant total doit toujours respecter :

Sécurité Sociale + Épargne = Montant du paiement

Pour un montant supérieur à 1 000 FCFA, l'agent de terrain peut recueillir la recommandation du membre.

Cette recommandation doit être enregistrée comme une donnée métier structurée.

Elle ne doit pas être seulement écrite dans une zone de commentaire libre.

Lors de la création du dossier adhérent, la Gestionnaire doit pouvoir enregistrer :

- pack choisi ;
- montant de référence ;
- allocation Sécurité Sociale ;
- allocation Épargne ;
- préférence d'allocation ;
- date de la préférence.

La plateforme doit afficher clairement cette répartition lors de l'enregistrement et du contrôle d'un paiement.

==================================================
9. RELANCES SPÉCIALES
==================================================

Dans la V1, les relances spéciales destinées au terrain sont visibles uniquement par :

- Gestionnaire des comptes
- Agents de terrain

La DGA peut créer les campagnes de relance.

Mais la campagne elle-même et la vue d'exécution doivent respecter les droits définis.

Workflow :

DGA
 ↓
Crée campagne de relance
 ↓
Gestionnaire + Agents terrain
 ↓
Exécution des relances
 ↓
Résultats structurés
 ↓
Rapport chez la DGA

La Gestionnaire doit pouvoir suivre les résultats des agents.

Les agents doivent uniquement voir les relances qui leur sont affectées.

==================================================
10. ORGANISATION TERRAIN
==================================================

L'organisation terrain est réalisée par :

Gestionnaire des comptes
+
Chef des agents de terrain

Ils travaillent ensemble pour :
- organiser les équipes ;
- organiser les portefeuilles ;
- organiser les zones ;
- répartir les adhérents ;
- suivre les agents ;
- suivre les résultats terrain.

La DGA conserve la responsabilité de :
- créer un nouvel Agent de terrain ;
- désigner le Chef des agents de terrain ;
- superviser l'organisation globale.

Ne pas créer de rôle "Responsable de zone".

Une zone est un périmètre organisationnel, pas un nouveau rôle.

==================================================
11. SYSTÈME DE REPORTING INTERNE
==================================================

Ajouter un véritable système de reporting hiérarchique dans la plateforme.

Chaque collaborateur doit pouvoir faire un rapport à son supérieur direct.

Le rapport doit être adressé selon la chaîne hiérarchique.

Exemple :

Agent de terrain
    ↓
Gestionnaire des comptes

Gestionnaire des comptes
    ↓
DGA

Chef des agents de terrain
    ↓
Gestionnaire des comptes
    ou selon le circuit hiérarchique validé

DAF
    ↓
PCA

Le rapport doit être une donnée structurée.

Créer au minimum :

- auteur ;
- destinataire ;
- rôle de l'auteur ;
- rôle du destinataire ;
- date ;
- objet ;
- type de rapport ;
- priorité ;
- contenu ;
- pièces jointes si autorisées ;
- statut ;
- date de lecture ;
- date de traitement ;
- réponse du supérieur si nécessaire.

Statuts possibles :

- BROUILLON
- ENVOYÉ
- LU
- EN COURS
- TRAITÉ
- ARCHIVÉ

==================================================
12. NOTIFICATIONS DES RAPPORTS
==================================================

Lorsqu'un collaborateur envoie un rapport à son supérieur :

1. Le supérieur reçoit une notification dans l'application.
2. Le supérieur reçoit également une notification par email.

Chaque membre COSITI doit donc disposer d'une adresse email dans son profil :

- email professionnel
OU
- email personnel.

Le système doit vérifier le format de l'adresse email.

Ne jamais afficher publiquement les emails des autres collaborateurs sans raison fonctionnelle.

Prévoir une notification lorsque :
- un rapport est reçu ;
- un rapport est lu ;
- un rapport nécessite une action ;
- un rapport est traité.

==================================================
13. PROFIL DES MEMBRES COSITI
==================================================

Chaque compte utilisateur COSITI doit disposer d'un profil complet.

Informations minimales :

- nom ;
- prénom ;
- rôle ;
- téléphone si requis ;
- email ;
- statut ;
- rattachement organisationnel ;
- zone/périmètre lorsque pertinent ;
- date de création ;
- dernière connexion si autorisée.

L'email est obligatoire pour les comptes concernés par le système de reporting et notifications.

==================================================
14. CRÉATION DES PROFILS PAR LE PCA
==================================================

Le PCA peut créer/ajouter de nouveaux profils dans son équipe parmi les rôles disponibles sur la plateforme.

Le PCA peut également supprimer/désactiver un profil lorsque cela est nécessaire selon les règles de gestion.

IMPORTANT :

La suppression ne doit pas entraîner une suppression physique des données historiques produites par cet utilisateur.

Utiliser une désactivation logique lorsque cela est nécessaire.

Les actions du PCA sur les profils doivent être auditables.

Attention à ne pas confondre :

- profil utilisateur ;
- rôle ;
- compte adhérent ;
- compte financier d'un adhérent.

==================================================
15. MISE À JOUR TEMPS RÉEL DES ADHÉRENTS
==================================================

Lorsqu'un nouvel adhérent est créé :

1. les données sont enregistrées dans la base de données ;
2. la liste des adhérents doit être actualisée automatiquement ;
3. les utilisateurs autorisés doivent voir la nouvelle donnée sans devoir recharger manuellement toute la page lorsque la technologie actuelle le permet.

Mettre en place le mécanisme adapté au stack existant :

- invalidation TanStack Query ;
- refetch ciblé ;
- WebSocket/SSE uniquement si réellement nécessaire.

NE PAS introduire WebSocket uniquement pour donner une impression de temps réel si l'invalidation/cache suffit.

La base de données reste la source de vérité.

==================================================
16. MATRICE DE VISIBILITÉ
==================================================

Mettre en place une matrice claire.

### PCA

Peut :
- voir l'activité globale ;
- voir l'audit global ;
- voir les actions de la plateforme ;
- consulter les adhérents ;
- consulter les rapports ;
- consulter les rapports DAF ;
- gérer les profils de son équipe selon les règles ;
- superviser globalement.

Ne peut pas :
- modifier arbitrairement les données financières du DAF ;
- se substituer au DAF dans le workflow métier financier.

### DG

Peut :
- consulter les données de pilotage autorisées ;
- consulter les rapports de son périmètre ;
- consulter les adhérents selon son niveau ;
- superviser l'activité.

Ne voit pas :
- l'audit global réservé au PCA/Super Admin.

### DGA

Peut :
- piloter l'activité opérationnelle ;
- créer les agents terrain ;
- désigner le Chef ;
- créer les campagnes de relance ;
- consulter les rapports de son périmètre ;
- consulter les adhérents autorisés.

Ne voit pas :
- les actions internes globales réservées au PCA/Super Admin et DG( Sauf actions communes audit et campagne).

### DAF

Peut :
- consulter les liste des adherents nécessaires à son travail ;
- consulter les paiements ;
- modifier les données financières autorisées ;
- valider les paiements ;
- produire ses rapports ;
- consulter son historique fonctionnel.

Ne peut pas :
- consulter l'audit global de toute la plateforme ;
- modifier les informations générales d'un adhérent hors de son périmètre financier.

### Gestionnaire des comptes

Peut :
- voir la liste complète des adhérents ;
- créer les adhérents ;
- gérer les dossiers adhérents ;
- enregistrer les paiements à valider ;
- suivre CNPS ;
- organiser le terrain avec le Chef ;
- recevoir les comptes rendus des agents ;
- transmettre ses rapports à la DGA ;
- exécuter les campagnes de relance.

Ne peut pas :
- valider les paiements ;
- modifier les données financières validées par le DAF ;
- voir les actions internes du DAF/DGA/DG/PCA ;
- voir l'audit global.

### Chef des agents de terrain

Peut :
- superviser les agents de son périmètre ;
- organiser le terrain avec la Gestionnaire ;
- suivre les portefeuilles affectés ;
- suivre les relances affectées ;
- produire/transmettre des comptes rendus selon son circuit.

Ne peut pas :
- voir l'audit global ;
- voir les actions internes des supérieurs ;
- voir la liste globale des adhérents sans justification fonctionnelle.

### Agent de terrain

Peut :
- consulter son portefeuille ;
- consulter les adhérents affectés ;
- exécuter les relances affectées ;
- recueillir les informations terrain ;
- enregistrer les informations autorisées ;
- produire un rapport au Gestionnaire.

Ne peut pas :
- créer définitivement un adhérent ;
- valider un paiement ;
- modifier les données financières ;
- voir la liste globale des adhérents ;
- voir les actions des supérieurs ;
- voir l'audit global.

### Super Administrateur

Peut :
- administrer les utilisateurs ;
- gérer les rôles et permissions ;
- consulter l'audit global ;
- exporter/imprimer l'audit en PDF ;
- administrer les paramètres techniques autorisés ;
- consulter les événements de sécurité.
- Desactiver un utilisateurs sur la plateforme a la demande du pca uniquement par memo envoyer sur la plateforme et journaliser dans la plateforme
- ne peut se substituer a aucun roles sur la plateforme

Le Super Administrateur ne doit pas être automatiquement considéré comme un acteur métier financier.

==================================================
17. PRINCIPE DE SÉPARATION DES RESPONSABILITÉS
==================================================

Respecter strictement :

GESTIONNAIRE
= création adhérent + saisie opérationnelle + paiement à valider

DAF
= contrôle + validation + modification financière

DGA
= pilotage opérationnel + agents + campagnes

CHEF TERRAIN
= supervision terrain

AGENT TERRAIN
= exécution terrain

PCA
= supervision globale + audit global

SUPER ADMIN
= administration système + audit + export audit

DG
= pilotage général de la COSITI

==================================================
18. CORRECTION DES CONFLITS EXISTANTS
==================================================

Avant de modifier le code :

1. Inspecter les guards/routes.
2. Inspecter les permissions.
3. Inspecter les composants de navigation.
4. Inspecter les endpoints API.
5. Inspecter les services métier.
6. Inspecter les modèles utilisateur/adhérent/paiement.
7. Inspecter les dashboards.
8. Inspecter le système de notification.
9. Inspecter le système de reporting existant.
10. Inspecter le système d'audit.

Créer ensuite une matrice :

ROLE → MODULE → ACTION → VISIBILITÉ → AUTORISATION API

Identifier tous les conflits.

Ne pas corriger uniquement l'interface.

==================================================
19. TESTS OBLIGATOIRES
==================================================

Ajouter ou corriger les tests suivants :

### Hiérarchie

- Agent ne voit pas les actions Gestionnaire.
- Gestionnaire ne voit pas les actions DGA.
- Gestionnaire ne voit pas les actions DG.
- Gestionnaire ne voit pas les actions PCA.
- Gestionnaire ne voit pas les actions DAF.
- DGA ne voit pas l'audit global.
- DG ne voit pas l'audit global.
- DAF ne voit pas l'audit global.
- PCA voit l'audit global.
- Super Admin voit l'audit global.

### Adhérents

- Gestionnaire peut créer un adhérent.
- Agent ne peut pas créer définitivement un adhérent.
- DAF ne peut pas créer un adhérent.
- Liste globale interdite au terrain.
- Liste complète disponible aux rôles autorisés.

### Paiements

- Gestionnaire crée paiement = À VALIDER.
- Gestionnaire ne peut pas valider.
- DAF peut valider.
- DAF peut modifier les données financières autorisées.
- Agent ne peut pas modifier les données financières.
- Allocation Sécurité Sociale < 700 = refusée.
- Sécurité Sociale + Épargne != paiement total = refusé.

### Relances

- DGA peut créer une campagne.
- Gestionnaire voit la campagne.
- Agent voit uniquement les relances qui lui sont destinées.
- Les autres rôles ne voient pas les relances spéciales terrain sans permission.

### Reporting

- Agent → Gestionnaire.
- Gestionnaire → DGA.
- DAF → PCA ou DAF → DG.
- Notification applicative lors de la réception.
- Notification email lors de la réception.
- Rapport non visible aux utilisateurs non concernés.

### Audit

- PCA peut consulter l'audit.
- Super Admin peut consulter l'audit.
- Seul Super Admin peut exporter/imprimer en PDF.
- Export PDF lui-même enregistré dans l'audit.

==================================================
20. LIVRABLE ATTENDU
==================================================

À la fin de l'analyse, ne te contente pas de modifier le code.

Produis un résumé précis :

1. Fonctionnalités corrigées.
2. Permissions corrigées.
3. Conflits supprimés.
4. Routes protégées.
5. Endpoints/API nécessitant une correction.
6. Modèles de données modifiés.
7. Notifications ajoutées.
8. Workflow de reporting ajouté.
9. Workflow financier corrigé.
10. Workflow d'allocation Sécurité Sociale/Épargne corrigé.
11. Tests ajoutés/modifiés.
12. Points restant à valider.
13. Creation des tables et de la base de donne au demarrage du server spring boot
14. Creation d'une base de donnee de backup des actions de la plateforme pour recuperation des donnees en cas de bug ou d'une mauvaise manipulation

IMPORTANT :
Ne considère jamais une fonctionnalité comme sécurisée simplement parce qu'elle est cachée dans le frontend.

La règle finale est :

FRONTEND
= visibilité et expérience utilisateur

BACKEND
= autorisation réelle

DATABASE
= persistance et intégrité

AUDIT
= traçabilité

NOTIFICATION
= information des responsables

Et aucune modification ne doit créer de conflit avec la hiérarchie COSITI V1.