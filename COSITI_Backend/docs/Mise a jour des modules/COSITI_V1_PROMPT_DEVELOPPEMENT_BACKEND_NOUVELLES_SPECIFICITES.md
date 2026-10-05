# PROMPT DE DÉVELOPPEMENT --- COSITI V1

## Implémentation Backend des nouvelles spécificités --- Dossier adhérent, Cotisations, Historique et fonctions transversales

> **Type de document :** prompt d'exécution pour agent de développement
> backend\
> **Objectif :** coder, sécuriser, tester et intégrer les nouvelles
> règles fonctionnelles sans casser les fonctionnalités existantes.

------------------------------------------------------------------------

# 1. MISSION

Tu travailles sur le backend de **COSITI V1**.

Ta mission est d'implémenter de manière complète les nouvelles
spécificités fonctionnelles concernant :

1.  le dossier de l'adhérent ;
2.  les cotisations ;
3.  l'historique général et financier ;
4.  les règles transversales nécessaires au fonctionnement de ces trois
    modules ;
5.  les mécanismes transversaux qui doivent rester cohérents avec les
    autres modules de COSITI.

Tu dois d'abord analyser le code existant, le modèle de données, les
services, les contrôleurs, les DTO, les repositories, les migrations, la
sécurité et le contrat API existant.

**Ne commence pas par modifier le code.**

Commence par produire une analyse technique de l'existant et une liste
des écarts entre le système actuel et les règles de ce document.

------------------------------------------------------------------------

# 2. SOURCES DE VÉRITÉ ET RÈGLES ABSOLUES

Respecte les sources suivantes dans cet ordre :

1.  contrat `/api/v1/openapi` lorsqu'il existe ;
2.  règles fonctionnelles COSITI validées ;
3.  code backend existant ;
4.  conventions d'architecture déjà présentes dans le projet.

Ne jamais inventer un endpoint qui existe déjà sous un autre nom sans
vérifier le contrat actuel.

Avant toute modification :

-   rechercher les endpoints existants ;
-   rechercher les services existants ;
-   rechercher les entités existantes ;
-   rechercher les statuts déjà utilisés ;
-   rechercher les migrations Flyway ;
-   rechercher les règles de sécurité et permissions ;
-   rechercher les tests existants.

Si un point métier n'est pas défini, le marquer `À CONFIRMER` plutôt que
d'inventer une règle.

------------------------------------------------------------------------

# 3. CONTRAINTES TECHNIQUES

Respecter l'architecture backend existante.

Stack de référence :

-   Java 21 ;
-   Spring Boot 3.3.x ;
-   PostgreSQL 16 ;
-   JPA/Hibernate ;
-   Flyway ;
-   Spring Security/JWT ;
-   Bean Validation ;
-   MapStruct si déjà utilisé ;
-   tests unitaires et tests d'intégration.

Règles :

-   `ddl-auto=validate` ;
-   aucune modification manuelle de schéma hors migration Flyway ;
-   transactions explicites pour les opérations financières ;
-   contrôle d'autorisation côté backend ;
-   validation des données côté serveur ;
-   idempotence pour les opérations financières ;
-   optimistic locking lorsque nécessaire ;
-   références métier uniques ;
-   audit des opérations sensibles ;
-   événements après commit lorsque le projet utilise ce mécanisme ;
-   aucune logique métier critique uniquement dans le frontend.

------------------------------------------------------------------------

# 4. PHASE 0 --- AUDIT AVANT CODAGE

Avant de coder, analyse :

### Adhérents

Identifier :

-   `Adherent` ;
-   statut du dossier ;
-   informations personnelles ;
-   informations professionnelles ;
-   coordonnées ;
-   matricule COSITI ;
-   relations avec documents ;
-   relations avec cotisations ;
-   historique existant ;
-   mécanisme d'activation.

### Cotisations

Identifier :

-   entité de cotisation ;
-   montant ;
-   statut ;
-   validation ;
-   référence ;
-   relation avec adhérent ;
-   relation avec agent ;
-   calcul des cumuls ;
-   calcul des seuils ;
-   solde éventuel.

### Historique

Identifier :

-   audit existant ;
-   journal métier ;
-   événements ;
-   historique adhérent ;
-   historique financier ;
-   système de pagination ;
-   filtres existants.

### Sécurité

Identifier :

-   rôles ;
-   permissions ;
-   annotations ou règles d'autorisation ;
-   contrôle d'accès aux données ;
-   séparation Gestionnaire/DGA/DAF ;
-   mécanisme de JWT ;
-   contrôle des scopes/périmètres.

Produire une matrice :

  Fonction   Existe   À modifier   À créer   Endpoint actuel   Risque
  ---------- -------- ------------ --------- ----------------- --------

------------------------------------------------------------------------

# 5. MODULE 1 --- DOSSIER DE L'ADHÉRENT

## 5.1 Vue dossier complète

Le backend doit fournir les données nécessaires à une vue complète de
l'adhérent comprenant :

-   identité ;
-   informations personnelles ;
-   informations professionnelles ;
-   coordonnées ;
-   état du dossier ;
-   compte Sécurité Sociale ;
-   compte Épargne ;
-   informations de cotisations utiles ;
-   informations nécessaires à l'historique.

Ne pas créer un endpoint redondant si les données existent déjà dans un
endpoint détail suffisamment structuré.

Privilégier un DTO de lecture spécialisé si nécessaire.

Exemple conceptuel :

`AdherentDetailResponse`

avec :

-   `id`
-   `matricule`
-   `identity`
-   `professional`
-   `contacts`
-   `dossierStatus`
-   `socialSecurityAccount`
-   `savingsAccount`
-   `contributionSummary`

Adapter aux noms réellement présents dans le projet.

------------------------------------------------------------------------

# 6. SUPPRESSION DU PACK À LA CRÉATION

Modifier la création d'un adhérent afin que le pack ne soit plus
obligatoire ni sélectionnable à cette étape.

Actions :

-   supprimer le champ du DTO de création si nécessaire ;
-   supprimer la validation correspondante ;
-   supprimer le traitement métier du pack dans le service de création ;
-   vérifier les migrations et données existantes ;
-   conserver les anciennes données historiques si elles existent ;
-   ne pas casser les anciens dossiers.

Ajouter des tests prouvant qu'un adhérent peut être créé sans
sélectionner de pack.

Le choix du pack/répartition intervient désormais au niveau de la
cotisation.

------------------------------------------------------------------------

# 7. MODULE 2 --- COTISATIONS

## 7.1 Recherche par matricule

Le Gestionnaire doit pouvoir identifier un adhérent par son matricule
COSITI avant de créer une cotisation.

Réutiliser l'endpoint existant si possible.

Contrôler :

-   matricule existant ;
-   adhérent autorisé ;
-   statut compatible avec une cotisation ;
-   absence d'ambiguïté.

------------------------------------------------------------------------

# 8. CRÉATION D'UNE COTISATION

Créer ou adapter le service métier de cotisation.

Méthode cible conceptuelle :

`createContribution(command)`

Le command doit contenir au minimum :

-   adhérent ;
-   montant total ;
-   montant Sécurité Sociale ;
-   montant Épargne ;
-   informations de contexte nécessaires.

La référence de cotisation doit être générée côté backend.

------------------------------------------------------------------------

# 9. RÈGLE DE RÉPARTITION

Invariant obligatoire :

`montantTotal = montantSocialSecurity + montantSavings`

Règle minimale :

`montantSocialSecurity >= 700 FCFA`

Règle Épargne :

`montantSavings >= 300 FCFA` lorsque la cotisation alimente ce compte
selon la règle métier applicable.

Le plafond Épargne n'est pas défini dans les règles actuelles.

**Ne pas inventer ce plafond.**

Si le montant total ne respecte pas les invariants, rejeter la
transaction avec une erreur métier explicite.

------------------------------------------------------------------------

# 10. STATUT DE COTISATION

Conserver la distinction entre :

-   cotisation enregistrée ;
-   cotisation en attente de contrôle ;
-   cotisation validée ;
-   cotisation rejetée si ce statut existe dans le workflow.

Ne jamais créditer définitivement un solde validé avec une opération qui
n'a pas atteint le statut requis.

Adapter les statuts au modèle existant au lieu de créer des doublons.

------------------------------------------------------------------------

# 11. IDEMPOTENCE DES COTISATIONS

Une double soumission ne doit pas créer deux cotisations.

Mettre en place ou renforcer :

-   clé d'idempotence ;
-   référence métier unique ;
-   contrainte DB ;
-   gestion transactionnelle ;
-   réponse cohérente lors d'une répétition de requête.

Tester :

1.  requête unique ;
2.  double requête identique ;
3.  double requête concurrente ;
4.  retry après timeout ;
5.  conflit de référence.

------------------------------------------------------------------------

# 12. CALCUL DES COMPTES

Le backend doit être la source de vérité pour :

-   total des cotisations ;
-   total Sécurité Sociale ;
-   total Épargne ;
-   montant validé ;
-   montant en attente ;
-   reste avant seuil ;
-   taux de progression.

Créer/réutiliser un service spécialisé, par exemple :

`ContributionSummaryService`

Méthodes conceptuelles :

-   `getContributionSummary(adherentId)`
-   `getSocialSecurityBalance(adherentId)`
-   `getSavingsBalance(adherentId)`
-   `getValidatedContributionTotal(adherentId)`
-   `getPendingContributionTotal(adherentId)`
-   `getRemainingBeforeThreshold(adherentId)`
-   `calculateProgress(adherentId)`

Ne pas effectuer ces calculs critiques uniquement côté frontend.

------------------------------------------------------------------------

# 13. MODULE 3 --- HISTORIQUE

Le dossier adhérent doit exposer deux historiques distincts.

## 13.1 Historique général

Il doit pouvoir retracer notamment :

-   création du dossier ;
-   modification des informations personnelles ;
-   modification des informations professionnelles ;
-   modification des coordonnées ;
-   actions documentaires ;
-   télédéclaration ;
-   immatriculation ;
-   changements de statut ;
-   autres événements métier autorisés.

## 13.2 Historique financier

Il doit retracer :

-   frais d'adhésion lorsqu'ils sont disponibles dans le domaine ;
-   cotisations ;
-   validations ;
-   rejets ;
-   corrections financières autorisées ;
-   mouvements financiers ;
-   autres événements financiers pertinents.

Ne pas mélanger audit technique et historique métier.

------------------------------------------------------------------------

# 14. API HISTORIQUE

Réutiliser les endpoints existants lorsqu'ils couvrent déjà le besoin.

Sinon prévoir un contrat cohérent du type :

`GET /api/v1/adherents/{id}/history`

Filtres :

-   `from`
-   `to`
-   `period`
-   `type`
-   `page`
-   `size`
-   `sort`

Et un historique financier dédié si nécessaire :

`GET /api/v1/adherents/{id}/financial-history`

**Ces routes sont des cibles fonctionnelles, pas des endpoints à créer
aveuglément. Vérifier `/api/v1/openapi`.**

------------------------------------------------------------------------

# 15. FILTRES TEMPORELS

Supporter :

-   jour ;
-   semaine ;
-   mois ;
-   année ;
-   période personnalisée si déjà supportée.

Les dates doivent être traitées côté backend avec une gestion correcte
du fuseau horaire et des bornes inclusives/exclusives.

Éviter les filtres calculés uniquement côté frontend.

------------------------------------------------------------------------

# 16. MODÈLE D'ÉVÉNEMENT HISTORIQUE

Chaque événement doit pouvoir identifier :

-   identifiant événement ;
-   adhérent ;
-   acteur ;
-   rôle ;
-   date/heure ;
-   type d'événement ;
-   module ;
-   action ;
-   résultat ;
-   référence métier ;
-   contexte nécessaire à la compréhension.

Pour les changements sensibles, conserver les anciennes et nouvelles
valeurs lorsque cela est nécessaire et autorisé.

Ne pas exposer inutilement des données sensibles dans l'historique.

------------------------------------------------------------------------

# 17. FONCTIONNALITÉS TRANSVERSALES À PRÉSERVER

Même si les trois modules sont la cible principale, leur implémentation
doit rester compatible avec les autres modules.

## Documents

Les événements documentaires doivent pouvoir apparaître dans
l'historique général.

## CNPS

Les événements d'immatriculation et de télédéclaration doivent être
historisables.

## Validation

Les soumissions, validations, rejets et demandes de correction doivent
être traçables.

## Frais d'adhésion

Les événements relatifs aux frais d'adhésion doivent pouvoir alimenter
l'historique financier sans double comptabilisation.

## DGA

Les actions de contrôle DGA doivent être visibles uniquement selon les
permissions définies.

## DAF

Les actions financières de la DAF doivent être protégées et ne doivent
pas être exposées au Gestionnaire lorsqu'elles relèvent du travail
interne de la DAF.

## Notifications

Les changements importants peuvent déclencher des notifications selon le
workflow existant.

## Audit global

Les opérations sensibles doivent alimenter l'audit global lorsque les
règles d'audit le prévoient.

------------------------------------------------------------------------

# 18. AUTORISATIONS

Respecter la séparation des responsabilités.

Le Gestionnaire doit pouvoir :

-   consulter les dossiers auxquels il a droit ;
-   enregistrer les cotisations selon ses permissions ;
-   consulter les historiques autorisés.

Il ne doit pas obtenir une visibilité sur les opérations internes de la
DGA ou de la DAF qui ne sont pas nécessaires à son travail.

Les permissions doivent être vérifiées :

-   au niveau endpoint ;
-   au niveau service ;
-   au niveau périmètre de données lorsque nécessaire.

------------------------------------------------------------------------

# 19. PAGINATION, TRI ET FILTRES

Les listes et historiques doivent utiliser la pagination backend.

Supporter lorsque pertinent :

-   page ;
-   size ;
-   sort ;
-   date ;
-   statut ;
-   recherche.

Ne jamais charger inutilement tout l'historique d'un adhérent.

------------------------------------------------------------------------

# 20. CONCURRENCE ET INTÉGRITÉ

Pour les données financières et les opérations sensibles :

-   utiliser `@Transactional` lorsque nécessaire ;
-   protéger contre les mises à jour concurrentes ;
-   utiliser optimistic locking ou verrouillage adapté ;
-   vérifier les contraintes en base ;
-   éviter les calculs « lire puis écrire » non atomiques.

------------------------------------------------------------------------

# 21. TESTS BACKEND OBLIGATOIRES

## Tests unitaires

Tester :

-   création d'adhérent sans pack ;
-   validation des montants ;
-   minimum social de 700 ;
-   minimum épargne de 300 ;
-   égalité montant total/répartition ;
-   rejet d'une répartition incohérente ;
-   génération de référence ;
-   calcul des soldes ;
-   calcul des cumuls ;
-   calcul du reste avant seuil ;
-   calcul du taux de progression ;
-   filtrage temporel de l'historique ;
-   séparation historique général/financier.

## Tests d'intégration

Tester :

-   création d'adhérent ;
-   création de cotisation ;
-   persistance ;
-   historique ;
-   recherche par matricule ;
-   permissions ;
-   pagination ;
-   filtres ;
-   validation de cotisation ;
-   concurrence ;
-   idempotence.

## Tests de sécurité

Tester qu'un :

-   Gestionnaire ne peut pas accéder aux opérations internes DAF ;
-   Gestionnaire ne peut pas exécuter une action DGA ;
-   utilisateur non autorisé ne peut pas lire un dossier ;
-   utilisateur non autorisé ne peut pas lire l'historique ;
-   utilisateur non autorisé ne peut pas modifier une cotisation.

## Tests financiers

Tester notamment :

-   `1000 = 700 + 300` ;
-   `1500 = 700 + 800` ;
-   social inférieur à 700 ;
-   épargne inférieure à 300 lorsque applicable ;
-   total différent de la somme ;
-   double soumission ;
-   soumissions concurrentes ;
-   cotisation en attente non intégrée comme validée ;
-   cotisation validée intégrée correctement.

------------------------------------------------------------------------

# 22. TESTS DE NON-RÉGRESSION

Avant livraison :

-   exécuter toute la suite existante ;
-   vérifier les anciennes routes ;
-   vérifier les anciens dossiers ;
-   vérifier les migrations ;
-   vérifier les données historiques ;
-   vérifier les rôles ;
-   vérifier les exports ;
-   vérifier les notifications ;
-   vérifier les fonctionnalités CNPS déjà existantes.

Aucune nouvelle fonctionnalité ne doit casser un module existant.

------------------------------------------------------------------------

# 23. MIGRATIONS

Toute évolution de schéma doit passer par Flyway.

Avant de créer une table ou colonne :

-   vérifier qu'elle n'existe pas ;
-   vérifier les migrations précédentes ;
-   définir contraintes ;
-   définir index ;
-   définir clés uniques ;
-   définir stratégie de données existantes.

Ne jamais supprimer une donnée historique sans règle explicite.

------------------------------------------------------------------------

# 24. OBSERVABILITÉ ET ERREURS

Les erreurs métier doivent être explicites et structurées.

Prévoir notamment :

-   adhérent introuvable ;
-   matricule invalide ;
-   cotisation invalide ;
-   répartition incohérente ;
-   montant insuffisant ;
-   permission insuffisante ;
-   doublon ;
-   idempotency conflict ;
-   conflit de version ;
-   historique inaccessible.

Conserver correlation ID et logs techniques nécessaires sans exposer
inutilement les données personnelles ou financières.

------------------------------------------------------------------------

# 25. LIVRABLES ATTENDUS

À la fin de l'implémentation, fournir :

1.  code backend ;
2.  migrations Flyway ;
3.  entités/domaines modifiés ;
4.  DTO ;
5.  services ;
6.  repositories ;
7.  controllers ;
8.  sécurité/permissions ;
9.  événements/audit ;
10. tests unitaires ;
11. tests d'intégration ;
12. tests de sécurité ;
13. tests financiers ;
14. documentation API ;
15. rapport des endpoints modifiés/créés ;
16. rapport des règles métier implémentées ;
17. rapport des points `À CONFIRMER`.

------------------------------------------------------------------------

# 26. DEFINITION OF DONE

La tâche est terminée uniquement si :

-   le dossier adhérent expose toutes les informations nécessaires ;
-   le pack n'est plus demandé à la création ;
-   le pack/répartition est géré lors de la cotisation ;
-   la répartition financière respecte les invariants ;
-   les comptes Sécurité Sociale et Épargne sont calculés côté backend ;
-   les cotisations sont idempotentes ;
-   les deux historiques sont disponibles ;
-   les filtres temporels fonctionnent ;
-   les permissions sont vérifiées côté backend ;
-   les opérations sensibles sont tracées ;
-   les fonctions transversales restent compatibles avec documents,
    CNPS, validation, frais d'adhésion, notifications et audit ;
-   les tests passent ;
-   aucune régression connue n'est introduite ;
-   l'API finale respecte le contrat `/api/v1/openapi`.

**Ne considère jamais une fonctionnalité terminée simplement parce que
le code compile. Elle doit être testée, sécurisée, persistée et vérifiée
fonctionnellement.**
