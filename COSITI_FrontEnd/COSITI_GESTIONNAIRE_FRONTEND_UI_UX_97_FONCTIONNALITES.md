# COSITI V1 --- Matrice Frontend / UI / UX des 97 fonctionnalités

Ce document associe les **35 fonctionnalités Gestion des adhérents**,
**25 fonctionnalités Gestion des agents de terrain** et **36
fonctionnalités Gestion des cotisations** à leur implémentation
frontend.

> **Référence technique :** React + TypeScript strict, TanStack Query,
> React Hook Form + Zod, instance HTTP unique, permissions backend,
> filtres dans l'URL. Le frontend ne doit jamais devenir l'autorité sur
> les règles métier.
>
> **Contrat API :** les endpoints listés reprennent le référentiel
> fonctionnel précédent. Avant codage, ils doivent être comparés à
> `/api/v1/openapi`. Une ligne indiquée « interne / à confirmer » ne
> doit pas conduire à inventer une API.

## Règles UX communes

-   Chaque écran traite les états **chargement, vide, erreur, succès et
    accès interdit**.
-   Les listes utilisent pagination, tri et filtres côté serveur.
-   Les filtres sont conservés dans l'URL.
-   Les mutations utilisent TanStack Query et invalident les données
    dépendantes.
-   Les formulaires utilisent React Hook Form + Zod.
-   Les erreurs `403`, `404`, `409`, `422`, `429` et `5xx` ont un
    affichage adapté.
-   Les opérations sensibles nécessitent confirmation et protection
    contre le double envoi.
-   Les documents sont accessibles uniquement via API authentifiée.
-   Les calculs métier critiques restent côté backend.
-   Les actions sensibles sont auditables côté backend.

## 1. Gestion des adhérents --- 35 fonctionnalités

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            \# Fonctionnalité        Méthode frontend                        Endpoint                                       Vue/interaction   Composants UI          UX détaillé
                                                                                                                            UI                                       
  ------------ --------------------- --------------------------------------- ---------------------------------------------- ----------------- ---------------------- -------------------------
             1 Lister les adhérents  listAdherents()                         GET /api/v1/adherents                          Liste adhérents   TableauPagine,         Liste serveur paginée;
               autorisés                                                                                                                      BarreFiltres,          recherche, filtres et tri
                                                                                                                                              BadgeStatut            dans l'URL; actions par
                                                                                                                                                                     ligne; états
                                                                                                                                                                     chargement/vide/erreur.

             2 Rechercher nom/prénom searchAdherents(criteria)               GET /api/v1/adherents?search=                  Recherche liste   ChampRecherche,        Recherche serveur avec
                                                                                                                                              TableauPagine          temporisation; conserver
                                                                                                                                                                     les filtres; afficher
                                                                                                                                                                     nombre de résultats et
                                                                                                                                                                     état vide.

             3 Rechercher matricule  findByMatricule(matricule)              GET /api/v1/adherents/{matricule}              Accès direct      ChampRecherche,        Saisie précise; ouvrir la
                                                                                                                            fiche             FicheAdherent          fiche retournée; message
                                                                                                                                                                     clair si introuvable.

             4 Rechercher téléphone  searchByPhone(phone)                    GET /api/v1/adherents?phone=                   Recherche contact ChampTéléphone,        Recherche serveur;
                                                                                                                                              TableauPagine          formatage visuel du
                                                                                                                                                                     numéro; afficher nom et
                                                                                                                                                                     matricule pour éviter les
                                                                                                                                                                     homonymes.

             5 Filtrer statut        filterByStatus(status)                  GET /api/v1/adherents?status=                  Filtre statut     Selecteur,             Filtre serveur; badge de
                                                                                                                                              BarreFiltres           filtre actif; suppression
                                                                                                                                                                     individuelle du filtre.

             6 Filtrer agent         filterByAgent(agentId)                  GET /api/v1/adherents?agentId=                 Filtre agent      SelecteurAgent,        Sélection d'un agent
                                                                                                                                              BarreFiltres           autorisé; recharge
                                                                                                                                                                     serveur; agent
                                                                                                                                                                     sélectionné visible dans
                                                                                                                                                                     les filtres.

             7 Filtrer complétion    filterByCompletion(range)               GET /api/v1/adherents?completion=              Filtre complétude SelecteurPlage,        Plages de complétion
                                                                                                                                              Progression            demandées au serveur;
                                                                                                                                                                     progression visible dans
                                                                                                                                                                     les résultats.

             8 Pagination/tri        paginateAndSort(query)                  GET /api/v1/adherents?page=&size=&sort=        Tableau paginé    TableauPagine,         Pagination et tri
                                                                                                                                              Pagination             serveur; état conservé
                                                                                                                                                                     dans l'URL; ne pas
                                                                                                                                                                     recharger inutilement.

             9 Créer adhérent        createAdherent(command)                 POST /api/v1/adherents                         Nouvel adhérent   FormulaireAdherent,    Formulaire par sections;
                                                                                                                                              RHF, Zod, Confirmation contrôle doublon avant
                                                                                                                                                                     envoi; désactiver
                                                                                                                                                                     soumission; après succès
                                                                                                                                                                     ouvrir la fiche et
                                                                                                                                                                     invalider la liste.

            10 Vérifier doublons     checkDuplicate(data)                    POST /api/v1/adherents/duplicate-check         Alerte avant      AlerteDoublon, Modale  Afficher les
                                                                                                                            création                                 correspondances
                                                                                                                                                                     potentielles du serveur;
                                                                                                                                                                     ne jamais déclarer
                                                                                                                                                                     localement un doublon
                                                                                                                                                                     certain.

            11 Générer référence     generateAdherentReference()             Inclus dans POST /api/v1/adherents             Référence lecture BadgeRéférence         La référence est générée
                                                                                                                            seule                                    par le backend;
                                                                                                                                                                     l'afficher après création
                                                                                                                                                                     avec copie possible.

            12 Détail adhérent       getAdherent(id)                         GET /api/v1/adherents/{id}                     Fiche adhérent    FicheAdherent,         En-tête fixe: nom,
                                                                                                                                              Onglets, FilAriane     matricule, statut;
                                                                                                                                                                     onglets Profil,
                                                                                                                                                                     Professionnel,
                                                                                                                                                                     Cotisations, CNPS,
                                                                                                                                                                     Documents, Historique
                                                                                                                                                                     selon droits.

            13 Modifier profil       updateAdherent(id, command)             PUT /api/v1/adherents/{id}                     Édition fiche     FormulaireAdherent,    Réutiliser le formulaire;
                                                                                                                                              RHF, Zod               champs éditables selon
                                                                                                                                                                     permission; afficher
                                                                                                                                                                     erreurs serveur; rester
                                                                                                                                                                     sur la fiche après
                                                                                                                                                                     sauvegarde.

            14 Calculer complétion   calculateCompletion(id)                 GET /api/v1/adherents/{id}/completion          Bloc complétude   Progression,           Afficher le taux serveur;
                                                                                                                                              CarteIndicateur        ne pas le recalculer
                                                                                                                                                                     comme source d'autorité
                                                                                                                                                                     côté client.

            15 Champs manquants      getMissingFields(id)                    GET /api/v1/adherents/{id}/missing-fields      Bloc À compléter  ListeManquants,        Regrouper les champs
                                                                                                                                              BadgeAttention         manquants par catégorie;
                                                                                                                                                                     bouton vers la section
                                                                                                                                                                     concernée; prioriser les
                                                                                                                                                                     éléments bloquants.

            16 Compléter dossier     completeProfile(id, command)            PATCH /api/v1/adherents/{id}/profile           Parcours          Stepper,               Modifier uniquement les
                                                                                                                            complétion        FormulaireSection      éléments manquants; après
                                                                                                                                                                     succès recalcul serveur
                                                                                                                                                                     et retour à la fiche.

            17 État dossier          getDossierStatus(id)                    GET /api/v1/adherents/{id}/dossier             Bloc état         BadgeStatut, Timeline  Afficher état courant et
                                                                                                                                                                     étapes; libellés métier
                                                                                                                                                                     simples; aucune
                                                                                                                                                                     transition inventée côté
                                                                                                                                                                     UI.

            18 Documents manquants   getMissingDocuments(id)                 GET /api/v1/adherents/{id}/documents/missing   Checklist         ChecklistDocuments,    Afficher les pièces
                                                                                                                            documents         BadgeAttention         réellement manquantes
                                                                                                                                                                     selon l'API; distinguer
                                                                                                                                                                     obligatoire et
                                                                                                                                                                     informationnel si le
                                                                                                                                                                     backend le précise.

            19 Consulter documents   listAdherentDocuments(id)               GET /api/v1/adherents/{id}/documents           Onglet Documents  ListeDocuments,        Lister type, statut,
                                                                                                                                              BadgeStatut            date; consultation via
                                                                                                                                                                     API authentifiée
                                                                                                                                                                     uniquement; aucune URL
                                                                                                                                                                     publique.

            20 Ajouter pièce         attachDocument(id, document)            POST /api/v1/adherents/{id}/documents          Ajout document    FileUpload,            Type de pièce + fichier;
                                                                                                                                              ProgressionUpload,     progression;
                                                                                                                                              Modale                 erreur/succès; empêcher
                                                                                                                                                                     double dépôt.

            21 Historique            getAdherentHistory(id)                  GET /api/v1/adherents/{id}/history             Onglet Historique Timeline, Filtres      Chronologie avec date,
                                                                                                                                                                     acteur et action
                                                                                                                                                                     autorisée; respecter le
                                                                                                                                                                     périmètre d'accès.

            22 Agent responsable     getAssignedAgent(id)                    GET /api/v1/adherents/{id}/agent               Bloc affectation  CarteAgent,            Afficher l'agent courant;
                                                                                                                                              BadgeAffectation       aucune permission ne doit
                                                                                                                                                                     être déduite de cette
                                                                                                                                                                     information.

            23 Affecter agent        assignAgent(id, agentId)                POST /api/v1/adherents/{id}/agent              Action Affecter   SelecteurAgent,        Choisir agent puis
                                                                                                                                              ModaleConfirmation     confirmer; afficher cible
                                                                                                                                                                     avant envoi; invalider
                                                                                                                                                                     fiche et listes.

            24 Modifier affectation  changeAgent(id, agentId, reason)        PUT /api/v1/adherents/{id}/agent               Action Réaffecter SelecteurAgent,        Montrer ancien/nouvel
                                                                                                                                              ChampMotif,            agent et motif; mutation
                                                                                                                                              Confirmation           sensible auditée backend.

            25 Proches quota CNPS    findNearCnpsThreshold(criteria)         GET /api/v1/adherents/cnps/near-threshold      Vue proximité     TableauPagine,         Résultats serveur;
                                                                                                                            CNPS              ProgressionCNPS        progression visible;
                                                                                                                                                                     accès direct à la fiche.

            26 Atteint 15 000        findEligibleForPreRegistration()        GET /api/v1/adherents/cnps/eligible            Vue éligibles     TableauPagine,         Afficher uniquement les
                                                                                                                                              BadgeÉligible          résultats serveur; ne pas
                                                                                                                                                                     calculer l'éligibilité
                                                                                                                                                                     localement.

            27 Éligibilité           getPreRegistrationEligibility(id)       GET                                            Bloc CNPS         CarteÉligibilité,      Afficher conditions et
               pré-immatriculation                                           /api/v1/adherents/{id}/cnps/pre-registration                     Checklist              blocages retournés;
                                                                                                                                                                     distinguer éligibilité et
                                                                                                                                                                     complétude du dossier.

            28 Cumul cotisations     getContributionSummary(id)              GET                                            Résumé financier  CartesIndicateurs,     Montants fournis par le
                                                                             /api/v1/adherents/{id}/contribution-summary                      MiniHistorique         serveur; afficher
                                                                                                                                                                     période/périmètre; pas de
                                                                                                                                                                     calcul métier critique
                                                                                                                                                                     client.

            29 Infos                 getProfessionalProfile(id)              GET /api/v1/adherents/{id}/professional        Onglet            CarteProfil,           Regrouper activité et
               professionnelles                                                                                             Professionnel     FormulaireLecture      informations
                                                                                                                                                                     professionnelles; mode
                                                                                                                                                                     lecture/édition
                                                                                                                                                                     explicite.

            30 Modifier infos        updateProfessionalProfile(id, command)  PUT /api/v1/adherents/{id}/professional        Édition           Formulaire, RHF, Zod   Valider forme côté UI
               professionnelles                                                                                             Professionnel                            puis backend; rafraîchir
                                                                                                                                                                     seulement les données
                                                                                                                                                                     concernées.

            31 Coordonnées           getContactProfile(id)                   GET /api/v1/adherents/{id}/contact             Bloc Coordonnées  CarteContact           Afficher téléphone/email
                                                                                                                                                                     selon habilitation; ne
                                                                                                                                                                     pas exposer les données
                                                                                                                                                                     non autorisées.

            32 Modifier coordonnées  updateContactProfile(id, command)       PUT /api/v1/adherents/{id}/contact             Édition Contact   FormulaireContact,     Validation de format et
                                                                                                                                              RHF, Zod               erreurs de conflit;
                                                                                                                                                                     conserver les valeurs
                                                                                                                                                                     saisies après erreur.

            33 Changer statut        changeDossierStatus(id,status,reason)   POST /api/v1/adherents/{id}/dossier/status     Action statut     SelecteurStatut,       Afficher seulement les
               dossier                                                                                                                        ChampMotif,            actions autorisées;
                                                                                                                                              Confirmation           confirmer; nouveau statut
                                                                                                                                                                     visible immédiatement
                                                                                                                                                                     après succès.

            34 Exporter adhérents    exportAdherents(criteria)               POST /api/v1/exports/adherents                 Export            ExportBouton,          Export généré serveur;
                                                                                                                                              ModaleOptionsExport,   critères visibles;
                                                                                                                                              EtatExport             permissions et
                                                                                                                                                                     journalisation
                                                                                                                                                                     respectées.

            35 Publier changement    publishAdherentChangedEvent(event)      Interne / SSE-WebSocket si retenu              Temps réel        Provider temps réel,   Seulement si temps réel
                                                                                                                                              InvalidationQuery      retenu; signaler une mise
                                                                                                                                                                     à jour sans provoquer de
                                                                                                                                                                     saut brutal du tableau.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 2. Gestion des agents de terrain --- 25 fonctionnalités

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            \# Fonctionnalité       Méthode frontend                                 Endpoint                                                    Vue/interaction   Composants UI           UX détaillé
                                                                                                                                                 UI                                        
  ------------ -------------------- ------------------------------------------------ ----------------------------------------------------------- ----------------- ----------------------- ---------------------
             1 Lister agents        listFieldAgents()                                GET /api/v1/agents-terrain                                  Liste agents      TableauPagine,          Lecture comparative;
               terrain                                                                                                                                             BarreFiltres,           statut, portefeuille
                                                                                                                                                                   BadgeStatut             et activité; actions
                                                                                                                                                                                           par ligne.

             2 Rechercher agent     searchFieldAgents(criteria)                      GET /api/v1/agents-terrain?search=                          Recherche         ChampRecherche,         Recherche serveur;
                                                                                                                                                                   TableauPagine           contexte d'identité
                                                                                                                                                                                           visible pour éviter
                                                                                                                                                                                           homonymes.

             3 Profil agent         getFieldAgent(id)                                GET /api/v1/agents-terrain/{id}                             Fiche agent       FicheAgent, Onglets,    Séparer identité,
                                                                                                                                                                   CartesIndicateurs       portefeuille et
                                                                                                                                                                                           activité; actions
                                                                                                                                                                                           selon permissions.

             4 Créer profil agent   createFieldAgent(command)                        POST /api/v1/agents-terrain                                 Nouvel agent      FormulaireAgent, RHF,   Création réservée au
                                                                                                                                                                   Zod                     rôle autorisé; succès
                                                                                                                                                                                           = fiche ouverte +
                                                                                                                                                                                           liste invalidée.

             5 Modifier profil      updateFieldAgent(id,command)                     PUT /api/v1/agents-terrain/{id}                             Édition agent     FormulaireAgent         Champs éditables
                                                                                                                                                                                           selon droits; erreurs
                                                                                                                                                                                           serveur au niveau
                                                                                                                                                                                           champ.

             6 Activer/désactiver   changeAgentStatus(id,status)                     POST /api/v1/agents-terrain/{id}/status                     Action statut     BadgeStatut,            Montrer état
                                                                                                                                                                   Confirmation            actuel/cible;
                                                                                                                                                                                           confirmer; rafraîchir
                                                                                                                                                                                           portefeuilles et
                                                                                                                                                                                           liste.

             7 Activité récente     getAgentActivity(id,period)                      GET /api/v1/agents-terrain/{id}/activity                    Onglet Activité   FiltresPériode,         Période choisie;
                                                                                                                                                                   Timeline, Tableau       événements
                                                                                                                                                                                           chronologiques; pas
                                                                                                                                                                                           de métriques
                                                                                                                                                                                           décoratives.

             8 Compter adhérents    countAssignedAdherents(id)                       GET /api/v1/agents-terrain/{id}/portfolio/summary           Indicateur        CarteIndicateur         Afficher valeur
               affectés                                                                                                                          portefeuille                              serveur et son
                                                                                                                                                                                           contexte.

             9 Portefeuille         getAgentPortfolio(id,query)                      GET /api/v1/agents-terrain/{id}/portfolio                   Onglet            TableauPagine,          Liste paginée; accès
                                                                                                                                                 Portefeuille      BarreFiltres            direct à chaque
                                                                                                                                                                                           fiche.

            10 Compter dossiers     countCompleteAdherentDossiers(id)                Même endpoint de synthèse                                   Indicateur        CarteIndicateur,        Valeur serveur;
               complets                                                                                                                          complétude        Progression             période/instant de
                                                                                                                                                                                           calcul visible si
                                                                                                                                                                                           fourni.

            11 Compter dossiers     countIncompleteAdherentDossiers(id)              Même endpoint de synthèse                                   Indicateur        CarteIndicateur,        Le clic ouvre le
               incomplets                                                                                                                        incomplets        LienFiltré              portefeuille filtré
                                                                                                                                                                                           si le contrat le
                                                                                                                                                                                           permet.

            12 Proches seuil CNPS   getNearThresholdPortfolio(id)                    GET                                                         Sous-vue CNPS     TableauPagine,          Lister les membres
                                                                                     /api/v1/agents-terrain/{id}/portfolio/cnps/near-threshold                     ProgressionCNPS         proches; progression
                                                                                                                                                                                           au premier plan.

            13 Éligibles CNPS       getEligiblePortfolio(id)                         GET /api/v1/agents-terrain/{id}/portfolio/cnps/eligible     Sous-vue          TableauPagine,          Résultats serveur;
                                                                                                                                                 éligibles         BadgeÉligible           lien vers
                                                                                                                                                                                           fiche/dossier si
                                                                                                                                                                                           autorisé.

            14 Compter              countAgentContributions(id,period)               GET /api/v1/agents-terrain/{id}/contributions/summary       Indicateur        CarteIndicateur,        Valeur liée à la
               contributions                                                                                                                     contributions     FiltrePériode           période sélectionnée.

            15 Somme contributions  sumAgentContributions(id,period)                 Même endpoint de synthèse                                   Indicateur        CarteMontant,           Montant XAF serveur;
                                                                                                                                                 montant           FiltrePériode           aucune somme de pages
                                                                                                                                                                                           côté client.

            16 Affecter adhérent    assignAdherent(agentId,adherentId)               POST /api/v1/agents-terrain/{id}/portfolio                  Action Affecter   SelecteurAdherent,      Afficher adhérent +
                                                                                                                                                                   Confirmation            agent avant
                                                                                                                                                                                           validation; mise à
                                                                                                                                                                                           jour après succès.

            17 Retirer affectation  unassignAdherent(agentId,adherentId,reason)      DELETE /api/v1/agents-terrain/{id}/portfolio/{adherentId}   Action Retirer    Confirmation,           Confirmation et
                                                                                                                                                                   ChampMotif              motif; retirer de la
                                                                                                                                                                                           liste après succès.

            18 Réaffecter adhérent  reassignAdherent(adherentId,newAgentId,reason)   PUT /api/v1/adherents/{id}/agent                            Action Réaffecter SelecteurAgent,         Montrer agent actuel
                                                                                                                                                                   ChampMotif,             et nouvel agent;
                                                                                                                                                                   Confirmation            action distincte
                                                                                                                                                                                           d'une édition
                                                                                                                                                                                           standard.

            19 Distribution         getPortfolioDistribution()                       GET /api/v1/agents-terrain/portfolio/distribution           Vue distribution  Tableau,                Volumes par agent;
               portefeuilles                                                                                                                                       CartesIndicateurs       aucun classement
                                                                                                                                                                                           subjectif.

            20 Charge de travail    getAgentWorkload(id)                             GET /api/v1/agents-terrain/{id}/workload                    Bloc charge       CarteIndicateur,        Afficher uniquement
                                                                                                                                                                   Progression             la métrique serveur;
                                                                                                                                                                                           ne pas qualifier
                                                                                                                                                                                           automatiquement
                                                                                                                                                                                           l'agent.

            21 Filtrer statut       filterAgents(status)                             GET /api/v1/agents-terrain?status=                          Filtre statut     Selecteur, BarreFiltres Filtre serveur
                                                                                                                                                                                           conservé dans l'URL.

            22 Dernière activité    getLastActivity(id)                              GET /api/v1/agents-terrain/{id}/activity/last               Bloc dernière     CarteDernièreActivité   Date/heure et type
                                                                                                                                                 activité                                  visibles; date
                                                                                                                                                                                           complète au besoin.

            23 Opérations agent     listAgentOperations(id,query)                    GET /api/v1/agents-terrain/{id}/operations                  Onglet Opérations TableauPagine, Filtres, Filtrer par
                                                                                                                                                                   BadgeType               période/type/statut
                                                                                                                                                                                           uniquement si
                                                                                                                                                                                           supporté par l'API.

            24 Historique           historyPortfolioChanges(id)                      Interne / endpoint à confirmer                              Onglet Historique Timeline,               À implémenter
               portefeuille                                                                                                                                        TableauHistorique       seulement si le
                                                                                                                                                                                           contrat API existe;
                                                                                                                                                                                           ne pas inventer
                                                                                                                                                                                           d'endpoint.

            25 Publier activité     publishAgentActivity(event)                      Interne / SSE-WebSocket si retenu                           Temps réel        Provider temps réel,    Mise à jour discrète
               agent                                                                                                                                               InvalidationQuery       des indicateurs;
                                                                                                                                                                                           éviter les refresh
                                                                                                                                                                                           agressifs.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 3. Gestion des cotisations --- 36 fonctionnalités

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            \# Fonctionnalité   Méthode frontend                           Endpoint                                                   Vue/interaction   Composants UI              UX détaillé
                                                                                                                                      UI                                           
  ------------ ---------------- ------------------------------------------ ---------------------------------------------------------- ----------------- -------------------------- -----------------
             1 Lister           listContributions(query)                   GET /api/v1/cotisations                                    Liste cotisations TableauPagine,             Recherche,
               cotisations                                                                                                                              BarreFiltres, BadgeStatut  filtres, tri et
                                                                                                                                                                                   pagination
                                                                                                                                                                                   serveur; actions
                                                                                                                                                                                   par ligne.

             2 Par adhérent     findByAdherent(adherentId)                 GET /api/v1/adherents/{id}/cotisations                     Onglet            TableauPagine,             Résumé en tête
                                                                                                                                      cotisations       RésuméContributions        puis historique
                                                                                                                                                                                   chronologique.

             3 Par matricule    findByAdherentMatricule(matricule)         GET /api/v1/cotisations?adherentMatricule=                 Recherche         ChampRecherche,            Identifier
                                                                                                                                      matricule         TableauPagine              d'abord le membre
                                                                                                                                                                                   puis afficher ses
                                                                                                                                                                                   opérations.

             4 Par agent        findByAgent(agentId)                       GET /api/v1/cotisations?agentId=                           Filtre agent      SelecteurAgent,            Filtre serveur;
                                                                                                                                                        TableauPagine              agent et période
                                                                                                                                                                                   visibles.

             5 Par référence    findByReference(reference)                 GET /api/v1/cotisations/{reference}                        Recherche         ChampRéférence,            Accès direct;
                                                                                                                                      transaction       FicheCotisation            message précis si
                                                                                                                                                                                   introuvable.

             6 Filtrer statut   filterByStatus(status)                     GET /api/v1/cotisations?status=                            Filtre statut     SelecteurStatut,           Statuts
                                                                                                                                                        BadgeStatut                officiels; filtre
                                                                                                                                                                                   persistant.

             7 Filtrer période  filterByPeriod(from,to)                    GET /api/v1/cotisations?from=&to=                          Filtre date       DateRangePicker            Bornes exactes
                                                                                                                                                                                   visibles; requête
                                                                                                                                                                                   serveur.

             8 Détail           getContribution(id)                        GET /api/v1/cotisations/{id}                               Fiche cotisation  PanneauLateral, Timeline   Afficher montant,
               cotisation                                                                                                                                                          adhérent, agent,
                                                                                                                                                                                   moyen, référence,
                                                                                                                                                                                   statut et
                                                                                                                                                                                   historique selon
                                                                                                                                                                                   droits.

             9 Créer cotisation createContribution(command)                POST /api/v1/cotisations                                   Nouvelle          FormulaireCotisation,      Identifier
                                                                                                                                      cotisation        RechercheAdherent, RHF,    adhérent, saisir
                                                                                                                                                        Zod                        données,
                                                                                                                                                                                   contrôler
                                                                                                                                                                                   doublon,
                                                                                                                                                                                   soumettre;
                                                                                                                                                                                   bloquer double
                                                                                                                                                                                   clic.

            10 Générer          generateTransactionReference()             Interne                                                    Référence         BadgeRéférence             Référence générée
               référence                                                                                                                                                           par backend;
               transaction                                                                                                                                                         affichée après
                                                                                                                                                                                   création.

            11 Valider montant  validateAmount()                           Règle backend à l'enregistrement                           Champ montant     ChampMontantXAF,           Format contrôlé
                                                                                                                                                        MessageErreur              client pour UX;
                                                                                                                                                                                   règle métier
                                                                                                                                                                                   serveur.

            12 Valider adhérent validateAdherent()                         Règle backend à l'enregistrement                           Sélection         RechercheAdherent,         Afficher nom +
                                                                                                                                      adhérent          CarteAdherent              matricule +
                                                                                                                                                                                   statut avant
                                                                                                                                                                                   envoi.

            13 Doublon          duplicateCheckContribution()               POST /api/v1/cotisations/duplicate-check                   Alerte doublon    AlerteDoublon, Modale      Correspondances
               cotisation                                                                                                                                                          serveur; ne pas
                                                                                                                                                                                   bloquer sur une
                                                                                                                                                                                   heuristique
                                                                                                                                                                                   locale.

            14 Soumettre        submitForValidation(id)                    POST /api/v1/cotisations/{id}/submit                       Action Soumettre  BoutonAction, Confirmation Afficher état
               validation                                                                                                                                                          cible; confirmer;
                                                                                                                                                                                   mettre à jour la
                                                                                                                                                                                   file.

            15 Liste à valider  listPendingValidation()                    GET /api/v1/cotisations?status=A_VALIDER                   File validation   TableauValidation,         Montant,
                                                                                                                                                        BarreFiltres               adhérent, agent,
                                                                                                                                                                                   date, référence
                                                                                                                                                                                   au premier
                                                                                                                                                                                   niveau.

            16 Valider          validateContribution(id,command)           POST /api/v1/cotisations/{id}/validate                     Action Valider    PanneauValidation,         Contrôle complet
               cotisation                                                                                                                               ConfirmationAction         puis validation
                                                                                                                                                                                   réservée au rôle
                                                                                                                                                                                   habilité; audit
                                                                                                                                                                                   backend.

            17 Rejeter          rejectContribution(id,reason)              POST /api/v1/cotisations/{id}/reject                       Action Rejeter    ModaleRejet, ChampMotif    Motif obligatoire
               cotisation                                                                                                                                                          si requis;
                                                                                                                                                                                   historique mis à
                                                                                                                                                                                   jour.

            18 Historique       getContributionHistory(id)                 GET /api/v1/cotisations/{id}/history                       Historique        Timeline, BadgeStatut      Transitions
               statuts                                                                                                                                                             chronologiques
                                                                                                                                                                                   avec date/acteur
                                                                                                                                                                                   si fournis.

            19 Corriger         correctContribution(id,command)            PATCH /api/v1/cotisations/{id}                             Action Corriger   FormulaireCorrection,      Action visible
               opération                                                                                                                                ChampMotif, Confirmation   uniquement si
                                                                                                                                                                                   autorisée;
                                                                                                                                                                                   afficher
                                                                                                                                                                                   avant/après;
                                                                                                                                                                                   audit
                                                                                                                                                                                   obligatoire.

            20 Total validé     getValidatedTotal(criteria)                Endpoint synthèse / contribution-summary                   Carte total       CarteMontant,              Valeur serveur,
                                                                                                                                      validé            FiltrePériode              toujours associée
                                                                                                                                                                                   au périmètre.

            21 Total en attente getPendingTotal(criteria)                  Endpoint synthèse / contribution-summary                   Carte en attente  CarteMontant,              Valeur serveur;
                                                                                                                                                        BadgeAttention             lien vers file si
                                                                                                                                                                                   autorisé.

            22 Restant avant 15 getRemainingToCnpsThreshold(id)            Endpoint contribution-summary                              Indicateur CNPS   Progression,               Montant restant
               000                                                                                                                                      MontantRestant             fourni serveur;
                                                                                                                                                                                   aucun calcul
                                                                                                                                                                                   d'autorité
                                                                                                                                                                                   client.

            23 Progression CNPS getContributionProgress(id)                Endpoint contribution-summary                              Progression       ProgressionCNPS,           Afficher
                                                                                                                                                        CarteIndicateur            progression
                                                                                                                                                                                   serveur; ne pas
                                                                                                                                                                                   déduire
                                                                                                                                                                                   l'éligibilité de
                                                                                                                                                                                   la barre.

            24 Seuil atteint    getThresholdEligibility(id)                GET /api/v1/adherents/{id}/cnps/pre-registration           Badge éligibilité BadgeÉligibilité,          Distinguer
                                                                                                                                                        Checklist                  atteint, éligible
                                                                                                                                                                                   et dossier
                                                                                                                                                                                   complet lorsque
                                                                                                                                                                                   l'API les
                                                                                                                                                                                   distingue.

            25 Cotisations      findNearThresholdContributions(criteria)   GET /api/v1/cotisations/cnps/near-threshold                Vue proximité     TableauPagine, Progression Résultats
               proches seuil                                                                                                                                                       serveur; accès
                                                                                                                                                                                   fiche membre.

            26 Résumé           getContributionSummary(id)                 GET /api/v1/adherents/{id}/contribution-summary            Résumé fiche      CartesIndicateurs,         Cumul, restant,
               cotisations                                                                                                                              MiniHistorique             progression et
                                                                                                                                                                                   statuts
                                                                                                                                                                                   disponibles.

            27 Statistiques     getDailyStatistics(date)                   GET /api/v1/cotisations/statistics/daily                   Statistiques jour SélecteurDate,             Date de référence
               quotidiennes                                                                                                                             CartesIndicateurs, Tableau toujours visible.

            28 Statistiques par getAgentContributionSummary(criteria)      GET /api/v1/agents-terrain/{id}/contributions/summary      Vue par agent     Tableau, FiltreAgent,      Afficher
               agent                                                                                                                                    FiltrePériode              métriques
                                                                                                                                                                                   documentées sans
                                                                                                                                                                                   classement
                                                                                                                                                                                   subjectif.

            29 Rapport          getDailyReport(date)                       GET /api/v1/cotisations/daily-report                       Rapport quotidien PanneauRapport,            Rapport
               quotidien                                                                                                                                ExportBouton               structuré; date,
                                                                                                                                                                                   périmètre et
                                                                                                                                                                                   heure de
                                                                                                                                                                                   génération
                                                                                                                                                                                   visibles.

            30 Enregistrer      recordPhysicalCash(command)                POST /api/v1/cotisations/daily-reconciliation              Rapprochement     FormulaireRapprochement,   Saisie contrôlée;
               caisse physique                                                                                                                          ChampMontant, Confirmation chiffres très
                                                                                                                                                                                   lisibles;
                                                                                                                                                                                   confirmer
                                                                                                                                                                                   validation.

            31 Écart caisse     getCashDifference(date)                    GET /api/v1/cotisations/daily-reconciliation/{date}        Bloc écart        CarteÉcart,                Écart calculé
                                                                                                                                                        TableauRapprochement,      serveur; ne pas
                                                                                                                                                        Alerte                     dépendre
                                                                                                                                                                                   uniquement de la
                                                                                                                                                                                   couleur.

            32 Valider          validateDailyReconciliation(date)          POST                                                       Validation        Confirmation,              Afficher total,
               rapprochement                                               /api/v1/cotisations/daily-reconciliation/{date}/validate   rapprochement     RésuméRapprochement        caisse et écart
                                                                                                                                                                                   avant validation;
                                                                                                                                                                                   action habilitée
                                                                                                                                                                                   et auditée.

            33 Signaler         flagAnomaly(command)                       POST /api/v1/cotisations/daily-reconciliation/{date}/issue Déclaration       ModaleAnomalie,            Type +
               anomalie                                                                                                               anomalie          SelecteurType,             description;
                                                                                                                                                        ChampDescription           afficher statut
                                                                                                                                                                                   de traitement si
                                                                                                                                                                                   disponible.

            34 Exporter         exportContributions(criteria)              POST /api/v1/exports/cotisations                           Export            ExportBouton,              Export serveur;
               cotisations                                                                                                                              ModaleOptionsExport        filtres courants;
                                                                                                                                                                                   habilitation et
                                                                                                                                                                                   audit.

            35 Idempotence UX   idempotency()                              Interne / header API                                       Protection        BoutonDésactivé, Spinner,  Bloquer doubles
                                                                                                                                      mutation          IdentifiantIdempotence     clics;
                                                                                                                                                                                   transmettre
                                                                                                                                                                                   idempotency key
                                                                                                                                                                                   si contrat; ne
                                                                                                                                                                                   pas répéter
                                                                                                                                                                                   aveuglément une
                                                                                                                                                                                   mutation après
                                                                                                                                                                                   perte réseau.

            36 Publier          publishContributionChangedEvent(event)     Interne / SSE-WebSocket si retenu                          Temps réel        Provider temps réel,       Signaler
               changement                                                                                                                               InvalidationQuery          discrètement les
               cotisation                                                                                                                                                          changements et
                                                                                                                                                                                   rafraîchir sans
                                                                                                                                                                                   perturber
                                                                                                                                                                                   brutalement la
                                                                                                                                                                                   position
                                                                                                                                                                                   utilisateur.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 4. Architecture UI recommandée

### Adhérents

``` text
fonctionnalites/adherents/
├── pages/
│   ├── ListeAdherents.tsx
│   ├── FicheAdherent.tsx
│   └── NouvelAdherent.tsx
├── composants/
│   ├── TableauAdherents.tsx
│   ├── BarreFiltresAdherents.tsx
│   ├── FormulaireAdherent.tsx
│   ├── AlerteDoublon.tsx
│   ├── ProgressionDossier.tsx
│   ├── DocumentsAdherent.tsx
│   ├── HistoriqueAdherent.tsx
│   └── AffectationAgent.tsx
├── hooks/
│   ├── useAdherents.ts
│   ├── useAdherent.ts
│   └── useVerificationDoublon.ts
└── schemas/adherent.schema.ts
```

### Agents terrain

``` text
fonctionnalites/agents-terrain/
├── pages/ListeAgentsTerrain.tsx
├── pages/FicheAgentTerrain.tsx
├── composants/
│   ├── TableauAgents.tsx
│   ├── FormulaireAgent.tsx
│   ├── PortefeuilleAgent.tsx
│   ├── ActiviteAgent.tsx
│   ├── IndicateursAgent.tsx
│   └── AffectationAdherent.tsx
└── hooks + schemas
```

### Cotisations

``` text
fonctionnalites/cotisations/
├── pages/
│   ├── ListeCotisations.tsx
│   ├── DetailCotisation.tsx
│   ├── ValidationCotisations.tsx
│   └── RapprochementQuotidien.tsx
├── composants/
│   ├── TableauCotisations.tsx
│   ├── FormulaireCotisation.tsx
│   ├── RechercheAdherent.tsx
│   ├── AlerteDoublonCotisation.tsx
│   ├── PanneauValidationCotisation.tsx
│   ├── HistoriqueCotisation.tsx
│   └── RapprochementCaisse.tsx
└── hooks + schemas
```

## 5. Parcours UX principaux

### Parcours adhérent

**Liste → Recherche/filtre → Fiche → Action → Confirmation → API →
Invalidation Query → Retour visuel.**

L'en-tête de la fiche doit conserver visibles le **nom, matricule,
statut et actions autorisées**. Les onglets peuvent regrouper Profil,
Professionnel, Cotisations, CNPS, Documents et Historique.

### Parcours agent terrain

**Liste agents → Fiche → Portefeuille/activité →
Affectation/réaffectation → Confirmation → API → Mise à jour des
indicateurs.**

Les indicateurs doivent rester descriptifs. Le frontend ne doit pas
créer un score ou un jugement de performance non défini par COSITI.

### Parcours cotisation

**Recherche adhérent → Saisie → Contrôles → Soumission → File À VALIDER
→ Validation/Rejet → Historique → Mise à jour des cumuls.**

Pour une opération sensible, le frontend doit identifier clairement
l'adhérent, afficher les données de contrôle, empêcher le double envoi
et demander confirmation avant la mutation.

## 6. Definition of Done frontend

Une fonctionnalité est terminée lorsque :

1.  la page/section/action UI existe ;
2.  l'endpoint réel du contrat OpenAPI est branché ;
3.  les types TypeScript sont alignés sur le contrat ;
4.  TanStack Query gère les données serveur ;
5.  les mutations invalident les requêtes dépendantes ;
6.  les permissions sont respectées dans l'interface et imposées côté
    backend ;
7.  les états chargement/vide/erreur/succès sont couverts ;
8.  les formulaires utilisent RHF + Zod lorsque nécessaire ;
9.  les erreurs métier sont compréhensibles ;
10. les doubles soumissions sont bloquées ;
11. les actions sensibles demandent confirmation ;
12. aucune règle métier critique n'est dupliquée comme autorité côté
    frontend ;
13. aucune donnée sensible n'est persistée inutilement dans
    localStorage/sessionStorage ;
14. les actions sensibles sont journalisées côté backend ;
15. les tests couvrent le scénario nominal et les erreurs principales ;
16. aucun endpoint fictif n'est ajouté.

## 7. Points à confirmer avant codage

-   Contrat réel `/api/v1/openapi` pour chaque endpoint.
-   Permissions exactes de chaque mutation.
-   Transitions d'état des cotisations.
-   Règles définitives CNPS et seuil de 15 000 FCFA.
-   Règles de correction et éventuelle annulation.
-   Mécanisme temps réel : SSE/WebSocket ou simple invalidation/refetch
    TanStack Query.
-   Endpoint d'historique portefeuille agent s'il n'existe pas déjà.
-   Format et cycle de vie des exports.
