# PROMPT DE DÉVELOPPEMENT --- COSITI V1

## Implémentation Frontend des nouvelles spécificités --- UX/UI, Dossier adhérent, Cotisations, Historique et fonctions transversales

> **Type de document :** prompt d'exécution pour agent de développement
> frontend\
> **Objectif :** implémenter l'interface et les parcours utilisateur
> correspondant aux nouvelles règles sans contourner le backend.

------------------------------------------------------------------------

# 1. MISSION

Tu travailles sur le frontend de **COSITI V1**.

Ta mission est d'implémenter les nouvelles spécificités UX/UI concernant
:

1.  le dossier de l'adhérent ;
2.  l'enregistrement des cotisations ;
3.  l'historique général et financier ;
4.  les règles transversales nécessaires ;
5.  l'intégration visuelle avec les modules Documents, CNPS, Validation,
    Frais d'adhésion, DGA et DAF sans donner au Gestionnaire des accès
    qui ne lui appartiennent pas.

Avant toute modification, analyse l'architecture frontend existante et
le contrat API disponible.

------------------------------------------------------------------------

# 2. CONTRAINTES FRONTEND ABSOLUES

Respecter les règles existantes du projet :

-   TypeScript strict ;
-   aucun `any` ;
-   une seule instance HTTP ;
-   TanStack Query pour les données serveur ;
-   React Hook Form + Zod pour les formulaires ;
-   ContextAuth pour l'authentification si déjà présent ;
-   pas de Redux ;
-   permissions déterminées par le backend ;
-   pas de stockage local de données sensibles ;
-   pas de calcul métier critique uniquement côté frontend ;
-   pas d'invention d'endpoint ;
-   `/api/v1/openapi` est la référence contractuelle ;
-   états loading/error/empty obligatoires ;
-   confirmation des opérations sensibles ;
-   boutons désactivés pendant les requêtes ;
-   invalidation/refetch après mutation.

Le frontend ne doit jamais être utilisé pour contourner les permissions
backend.

------------------------------------------------------------------------

# 3. PHASE 0 --- AUDIT DE L'EXISTANT

Avant de coder :

-   rechercher les routes adhérents ;
-   rechercher la page détail adhérent ;
-   rechercher le formulaire de création ;
-   rechercher le formulaire de cotisation ;
-   rechercher les composants d'historique ;
-   rechercher les composants de compte/solde ;
-   rechercher les hooks TanStack Query ;
-   rechercher les types API ;
-   rechercher les permissions ;
-   rechercher les dashboards ;
-   rechercher les composants Documents/CNPS/Validation.

Produire une matrice :

  -----------------------------------------------------------------------------
  Écran/composant   Existe      À modifier  À créer     API         Risque
                                                        utilisée    
  ----------------- ----------- ----------- ----------- ----------- -----------

  -----------------------------------------------------------------------------

Ne pas recréer un composant déjà existant sans raison.

------------------------------------------------------------------------

# 4. MODULE 1 --- DOSSIER DE L'ADHÉRENT

## 4.1 Structure de la page

Le dossier doit être organisé en sections clairement identifiées.

Structure recommandée :

1.  En-tête adhérent ;
2.  Identité ;
3.  Coordonnées ;
4.  Informations professionnelles ;
5.  État du dossier ;
6.  Compte Sécurité Sociale ;
7.  Compte Épargne ;
8.  Actions disponibles ;
9.  Historique.

Adapter cette structure au design system existant.

------------------------------------------------------------------------

# 5. EN-TÊTE DU DOSSIER

Afficher notamment :

-   nom/prénom ;
-   matricule COSITI ;
-   état du dossier ;
-   informations essentielles permettant d'identifier l'adhérent ;
-   actions autorisées.

Le statut doit être visuellement explicite.

Ne jamais afficher une action simplement parce que l'utilisateur connaît
son URL : l'action doit dépendre des permissions et de l'état retourné
par l'API.

------------------------------------------------------------------------

# 6. IDENTITÉ

Créer une section « Identité ».

Afficher les données personnelles disponibles dans l'API.

Utiliser une présentation lisible de type fiche d'information, et non un
long formulaire permanent.

Si l'utilisateur possède le droit de modification, utiliser une action
explicite « Modifier ».

------------------------------------------------------------------------

# 7. COORDONNÉES

Créer une section regroupant :

-   téléphone ;
-   WhatsApp ;
-   e-mail ;
-   quartier ;
-   ville ;
-   autres coordonnées disponibles.

Les informations doivent être facilement lisibles.

Pour les données modifiables, utiliser les formulaires existants et les
règles de validation du projet.

------------------------------------------------------------------------

# 8. INFORMATIONS PROFESSIONNELLES

Créer une section dédiée aux informations professionnelles.

Afficher les informations reçues du backend.

Ne pas inventer de champs qui n'existent pas dans le contrat API.

------------------------------------------------------------------------

# 9. ÉTAT DU DOSSIER

Afficher clairement le statut actuel.

Prévoir les états :

-   chargement ;
-   données disponibles ;
-   erreur ;
-   dossier introuvable ;
-   accès refusé.

Les libellés doivent être compréhensibles par l'utilisateur métier.

------------------------------------------------------------------------

# 10. COMPTES SÉCURITÉ SOCIALE ET ÉPARGNE

Afficher deux blocs distincts :

### Compte Sécurité Sociale

Afficher le montant fourni par le backend.

### Compte Épargne

Afficher le montant fourni par le backend.

Ne pas recalculer les soldes à partir d'une liste partielle de
cotisations.

Si le backend fournit un résumé financier, l'utiliser comme source de
vérité.

Prévoir un lien/action permettant d'accéder aux détails financiers
lorsque l'utilisateur possède les droits.

------------------------------------------------------------------------

# 11. SUPPRESSION DU PACK À LA CRÉATION

Modifier le formulaire de création d'un adhérent.

Supprimer :

-   sélecteur de pack ;
-   champ de pack ;
-   validation Zod associée ;
-   résumé du pack dans la confirmation ;
-   envoi du pack dans le payload.

Le formulaire doit pouvoir créer un adhérent sans sélection de pack.

Ne pas déplacer automatiquement le champ dans le même formulaire : le
choix intervient lors de l'enregistrement d'une cotisation.

Tester visuellement et fonctionnellement qu'aucune référence au pack ne
subsiste dans le parcours de création.

------------------------------------------------------------------------

# 12. MODULE 2 --- ENREGISTREMENT D'UNE COTISATION

## 12.1 Recherche par matricule

Le parcours doit commencer par la recherche de l'adhérent.

Prévoir :

-   champ matricule ;
-   validation ;
-   état de recherche ;
-   état introuvable ;
-   état erreur ;
-   résultat sélectionnable.

Après sélection, afficher un résumé de l'adhérent avant la saisie
financière.

------------------------------------------------------------------------

# 13. FORMULAIRE DE COTISATION

Le formulaire doit contenir :

-   adhérent sélectionné ;
-   montant total ;
-   montant Sécurité Sociale ;
-   montant Épargne ;
-   informations complémentaires prévues par l'API.

Le choix de la répartition intervient ici, et non lors de la création de
l'adhérent.

------------------------------------------------------------------------

# 14. VALIDATION UX DE LA RÉPARTITION

Afficher en temps réel les informations utiles à la compréhension de la
répartition.

Règles :

-   Sécurité Sociale ≥ 700 FCFA ;
-   Épargne ≥ 300 FCFA lorsque cette règle s'applique ;
-   montant total = Social + Épargne.

Les erreurs doivent être explicites.

Exemples :

-   « Le montant affecté à la Sécurité Sociale doit être au minimum de
    700 FCFA. »
-   « Le montant affecté à l'Épargne doit être au minimum de 300 FCFA. »
-   « La répartition doit correspondre au montant total de la
    cotisation. »

Le frontend peut aider à la validation, mais le backend reste l'autorité
finale.

------------------------------------------------------------------------

# 15. CONFIRMATION AVANT ENREGISTREMENT

Avant une opération financière, afficher une confirmation récapitulative
:

-   adhérent ;
-   matricule ;
-   montant total ;
-   Sécurité Sociale ;
-   Épargne.

Le bouton de confirmation doit être désactivé pendant l'envoi.

Empêcher les doubles clics.

Afficher un résultat clair après succès ou échec.

------------------------------------------------------------------------

# 16. STATUT DE LA COTISATION

Après enregistrement, afficher clairement si la cotisation est :

-   en attente de contrôle ;
-   validée ;
-   rejetée lorsque ce statut est prévu.

Ne jamais afficher « Validée » uniquement parce que la requête POST a
réussi.

Utiliser le statut retourné par le backend.

------------------------------------------------------------------------

# 17. MODULE 3 --- HISTORIQUE

## 17.1 Point d'accès

Ajouter un bouton ou onglet « Historique » dans le dossier adhérent.

L'accès doit respecter les permissions du rôle.

------------------------------------------------------------------------

# 18. DEUX ONGLETS D'HISTORIQUE

Créer deux vues :

### Historique général

Pour les actions administratives et opérationnelles.

### Historique financier

Pour les opérations financières.

Les deux vues doivent être clairement séparées.

------------------------------------------------------------------------

# 19. HISTORIQUE GÉNÉRAL

Afficher notamment lorsque les données sont disponibles :

-   modifications personnelles ;
-   modifications professionnelles ;
-   modifications des coordonnées ;
-   documents ;
-   télédéclaration ;
-   immatriculation ;
-   changements de statut ;
-   autres événements métier.

Chaque ligne doit présenter au minimum :

-   date/heure ;
-   action ;
-   acteur ;
-   statut/résultat ;
-   contexte utile.

------------------------------------------------------------------------

# 20. HISTORIQUE FINANCIER

Afficher notamment :

-   frais d'adhésion lorsqu'ils sont exposés par l'API ;
-   cotisations ;
-   validations ;
-   rejets ;
-   corrections autorisées ;
-   autres mouvements financiers.

Une ligne financière doit permettre de comprendre l'opération sans
ambiguïté.

------------------------------------------------------------------------

# 21. FILTRE PAR PÉRIODE

Prévoir un filtre simple :

-   Jour ;
-   Semaine ;
-   Mois ;
-   Année.

Prévoir éventuellement une période personnalisée uniquement si l'API le
supporte.

Le filtre doit déclencher une requête serveur et non filtrer uniquement
les données déjà chargées.

------------------------------------------------------------------------

# 22. PAGINATION

Les historiques doivent être paginés côté serveur.

Prévoir :

-   page ;
-   taille ;
-   tri ;
-   total ;
-   navigation.

Éviter de charger tout l'historique d'un adhérent.

------------------------------------------------------------------------

# 23. ÉTATS UX OBLIGATOIRES

Pour chaque historique :

### Loading

Afficher un état de chargement cohérent.

### Empty

Exemple :

« Aucune action enregistrée pour cette période. »

### Error

Afficher une erreur compréhensible avec possibilité de réessayer.

### Unauthorized

Ne pas afficher le contenu si le backend refuse l'accès.

### Partial data

Si une information secondaire manque, conserver une présentation
utilisable sans inventer la donnée.

------------------------------------------------------------------------

# 24. FONCTIONNALITÉS TRANSVERSALES --- AUTRES MODULES

Les trois modules doivent s'intégrer proprement avec les autres modules.

## Documents

Dans l'historique général, afficher les événements documentaires lorsque
l'API les expose.

Ne pas permettre au Gestionnaire de voir les contrôles DGA qui ne lui
sont pas destinés.

## CNPS

Afficher les événements d'immatriculation et de télédéclaration dans
l'historique général lorsqu'ils existent.

Les données CNPS doivent provenir du backend.

## Validation

Afficher les statuts et événements de validation nécessaires au rôle
connecté.

Ne pas exposer au Gestionnaire les informations internes de validation
qui relèvent du travail de la DGA ou de la DAF.

## Frais d'adhésion

Si l'API expose les frais d'adhésion dans l'historique financier, les
présenter comme des opérations distinctes.

Ne jamais additionner côté frontend les soumissions pour reconstruire un
montant financier.

## DGA

Les écrans DGA doivent recevoir leurs données via leurs endpoints
autorisés.

Ne pas réutiliser une route Gestionnaire pour contourner une
restriction.

## DAF

Les écrans DAF doivent être séparés des écrans Gestionnaire.

Aucun bouton DAF ou contrôle DAF ne doit apparaître dans le dashboard
Gestionnaire si les permissions ne l'autorisent pas.

------------------------------------------------------------------------

# 25. SUPPRESSION DES ÉLÉMENTS INTERDITS DU DASHBOARD GESTIONNAIRE

Supprimer du dashboard Gestionnaire :

-   bouton « DAF » ;
-   bouton « Contrôle DGA » ;
-   bouton « À traiter » lorsqu'il appartient au workflow supprimé.

Rechercher également :

-   routes ;
-   menus ;
-   breadcrumbs ;
-   raccourcis ;
-   actions dans les tableaux ;
-   permissions frontend ;
-   liens directs.

Il ne suffit pas de masquer les boutons principaux.

------------------------------------------------------------------------

# 26. PERMISSIONS FRONTEND

Utiliser les permissions retournées par le backend.

Le frontend doit :

-   masquer les actions interdites ;
-   désactiver les actions impossibles selon l'état ;
-   afficher les actions autorisées ;
-   gérer les réponses 401/403.

Mais le frontend ne doit jamais être considéré comme le mécanisme de
sécurité.

------------------------------------------------------------------------

# 27. TANSTACK QUERY

Créer/réutiliser des hooks dédiés.

Exemples conceptuels :

-   `useAdherent(id)`
-   `useContributionSummary(id)`
-   `useCreateContribution()`
-   `useAdherentHistory(id, filters)`
-   `useAdherentFinancialHistory(id, filters)`

Adapter aux conventions existantes.

Après création ou validation d'une cotisation, invalider les queries
concernées :

-   détail adhérent ;
-   comptes ;
-   résumé cotisations ;
-   historique général si nécessaire ;
-   historique financier ;
-   CNPS si le cumul change.

------------------------------------------------------------------------

# 28. TYPES TYPESCRIPT

Créer des types stricts pour :

-   détail adhérent ;
-   identité ;
-   coordonnées ;
-   professionnel ;
-   comptes ;
-   cotisation ;
-   répartition ;
-   statut ;
-   historique ;
-   filtres ;
-   pagination.

Ne jamais utiliser `any`.

Les types doivent être alignés sur l'OpenAPI réel.

------------------------------------------------------------------------

# 29. FORMULAIRES

Utiliser React Hook Form + Zod selon l'architecture existante.

Le formulaire de cotisation doit valider :

-   montant obligatoire ;
-   montant positif ;
-   minimum social ;
-   minimum épargne ;
-   cohérence de la répartition.

La validation frontend doit être considérée comme une aide UX. Les
erreurs backend doivent toujours être gérées.

------------------------------------------------------------------------

# 30. GESTION DES ERREURS

Prévoir les cas :

-   adhérent introuvable ;
-   matricule invalide ;
-   montant invalide ;
-   répartition incohérente ;
-   permission refusée ;
-   session expirée ;
-   doublon ;
-   opération déjà enregistrée ;
-   erreur réseau ;
-   erreur serveur ;
-   conflit de version.

Afficher des messages métier compréhensibles.

Ne jamais afficher directement une stack trace ou un message technique
brut.

------------------------------------------------------------------------

# 31. REFRESH ET COHÉRENCE DES DONNÉES

Après une mutation :

1.  attendre la réponse backend ;
2.  invalider les queries concernées ;
3.  récupérer les données à jour ;
4.  mettre à jour l'interface.

Ne pas maintenir plusieurs copies locales concurrentes du solde ou du
résumé financier.

------------------------------------------------------------------------

# 32. RESPONSIVE ET ACCESSIBILITÉ

Les nouvelles interfaces doivent être utilisables sur les tailles
d'écran supportées par COSITI.

Respecter :

-   labels explicites ;
-   focus clavier ;
-   contraste ;
-   boutons accessibles ;
-   états disabled visibles ;
-   messages d'erreur associés aux champs ;
-   tableaux lisibles ;
-   navigation claire.

------------------------------------------------------------------------

# 33. UI/UX --- PRINCIPES VISUELS

Respecter le design system existant de COSITI.

Ne pas ajouter d'éléments décoratifs de type « vibe coder » :

-   gradients gratuits ;
-   néons ;
-   glow ;
-   glassmorphism systématique ;
-   blobs ;
-   noise ;
-   dot grid ;
-   animations inutiles ;
-   micro-animations partout ;
-   confettis ;
-   effets de curseur.

L'interface doit rester professionnelle, administrative, lisible et
orientée données.

------------------------------------------------------------------------

# 34. TESTS FRONTEND OBLIGATOIRES

Tester :

### Dossier

-   affichage identité ;
-   affichage professionnel ;
-   affichage coordonnées ;
-   affichage statut ;
-   affichage comptes ;
-   gestion loading/error/empty.

### Création adhérent

-   absence du champ pack ;
-   validation ;
-   création sans pack.

### Cotisation

-   recherche par matricule ;
-   adhérent introuvable ;
-   saisie montant ;
-   répartition ;
-   minimum 700 ;
-   minimum 300 ;
-   incohérence total/répartition ;
-   confirmation ;
-   double clic ;
-   réponse backend en erreur ;
-   statut en attente ;
-   statut validé.

### Historique

-   historique général ;
-   historique financier ;
-   filtres jour/semaine/mois/année ;
-   pagination ;
-   tri ;
-   empty state ;
-   erreur ;
-   permissions.

### Navigation

-   bouton DAF absent du Gestionnaire ;
-   contrôle DGA absent du Gestionnaire ;
-   bouton « À traiter » retiré ;
-   routes interdites protégées.

------------------------------------------------------------------------

# 35. TESTS D'INTÉGRATION UI/API

Vérifier les parcours complets :

1.  ouvrir un adhérent ;
2.  consulter ses comptes ;
3.  créer une cotisation ;
4.  vérifier le statut retourné ;
5.  vérifier le résumé financier ;
6.  consulter l'historique ;
7.  filtrer l'historique ;
8.  constater la nouvelle opération financière.

Tester également qu'une réponse 403 entraîne l'UI attendue et ne laisse
pas apparaître une action comme disponible.

------------------------------------------------------------------------

# 36. NON-RÉGRESSION

Avant livraison :

-   tester les anciennes pages adhérents ;
-   tester les anciens parcours de cotisation ;
-   tester les documents ;
-   tester CNPS ;
-   tester validation ;
-   tester notifications ;
-   tester dashboards ;
-   tester navigation ;
-   tester permissions.

Aucune modification ne doit casser les autres modules.

------------------------------------------------------------------------

# 37. LIVRABLES ATTENDUS

Fournir :

1.  composants modifiés ;
2.  nouveaux composants ;
3.  hooks TanStack Query ;
4.  types TypeScript ;
5.  schémas Zod ;
6.  formulaires ;
7.  pages/routes ;
8.  guards/permissions ;
9.  tests unitaires ;
10. tests composants ;
11. tests d'intégration ;
12. documentation des changements ;
13. liste des endpoints consommés ;
14. liste des points `À CONFIRMER`.

------------------------------------------------------------------------

# 38. DEFINITION OF DONE

La fonctionnalité est terminée uniquement lorsque :

-   le dossier adhérent présente toutes les informations nécessaires ;
-   le pack est absent du parcours de création ;
-   la répartition est disponible dans le parcours cotisation ;
-   les règles de saisie sont correctement présentées ;
-   les deux historiques sont disponibles ;
-   les filtres temporels fonctionnent ;
-   les comptes affichent les données du backend ;
-   les actions DAF/DGA interdites sont absentes du Gestionnaire ;
-   les permissions sont respectées ;
-   les états loading/error/empty sont traités ;
-   les mutations invalident les bonnes données ;
-   les tests passent ;
-   aucune régression n'est introduite ;
-   l'interface respecte le design system COSITI.

**Ne considère jamais une fonctionnalité terminée parce qu'elle est
seulement visible à l'écran. Elle doit être connectée au backend réel,
respecter les permissions, gérer les erreurs et être testée.**
