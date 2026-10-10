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

- [x] 1. la page/section/action UI existe ;
- [x] 2. l'endpoint réel du contrat OpenAPI est branché (routes réelles, voir §8 — jamais les routes cibles
  `/agents-terrain`, `/cotisations`, `/adhesion-fees`) ;
- [x] 3. les types TypeScript sont alignés sur le contrat (DTO relus dans le code backend) ;
- [x] 4. TanStack Query gère les données serveur ;
- [x] 5. les mutations invalident les requêtes dépendantes, **et le flux temps réel invalide celles des autres
  utilisateurs** (§8.6) ;
- [x] 6. les permissions sont respectées dans l'interface et imposées côté backend ;
- [x] 7. les états chargement/vide/erreur/succès sont couverts ;
- [x] 8. les formulaires utilisent RHF + Zod lorsque nécessaire (création d'adhérent, identité, coordonnées,
  paiement) ; les dialogues courts à un ou deux champs utilisent un état local contrôlé ;
- [x] 9. les erreurs métier sont compréhensibles (message serveur affiché, erreur placée sur le champ) ;
- [x] 10. les doubles soumissions sont bloquées (boutons désactivés, clés d'idempotence) ;
- [x] 11. les actions sensibles demandent confirmation (relecture des montants, motif obligatoire) ;
- [x] 12. aucune règle métier critique n'est dupliquée comme autorité côté frontend ;
- [x] 13. aucune donnée sensible n'est persistée dans localStorage/sessionStorage (jeton en mémoire) ;
- [x] 14. les actions sensibles sont journalisées côté backend (`TypeOperation`, journal d'audit) ;
- [x] 15. les tests couvrent le scénario nominal et les erreurs principales (184 tests Vitest verts) ;
- [x] 16. aucun endpoint fictif n'est ajouté.

## 7. Points à confirmer avant codage

- [x] Contrat réel `/api/v1/openapi` pour chaque endpoint — routes réelles listées au §8.
- [x] Permissions exactes de chaque mutation — migrations V5 à V20, rappelées dans `src/api/*.ts`.
- [x] Transitions d'état des cotisations — `BROUILLON → A_CONTROLER → VALIDE | REJETE | INCOHERENCE`, annulation motivée.
- [ ] Règles définitives CNPS et seuil de 15 000 FCFA — paramètres `[V]`, affichés tels que renvoyés.
- [x] Règles de correction et éventuelle annulation — workflow Maker–Checker V19 (§8.4).
- [x] Mécanisme temps réel — **SSE retenu** : `GET /api/v1/temps-reel/flux` (§8.6).
- [x] Endpoint d'historique portefeuille agent — `GET /agents/{id}/portefeuille/historique`.
- [ ] Format et cycle de vie des exports — export CSV livré ; seuls les critères acceptés par le serveur sont
  appliqués (statut, zone, période), les autres sont signalés à l'utilisateur.

## 8. État d'implémentation — fonctionnalités développées (mis à jour le 2026-10-02)

Légende : ☑ livrée et testée · ◐ livrée avec une limite consignée en décision `[A]`/`[V]` dans
`Conception/SUIVI_EXECUTION.md`. Les routes sont celles du backend réel, préfixe `/api/v1` omis.

### 8.1 Gestion des adhérents — 35 / 35

| # | Fonctionnalité | État | Route réelle | Écran / UX livrée |
|---|---|---|---|---|
| 1 | Lister les adhérents autorisés | ☑ | `GET /adherents` | `/adherents` — tableau paginé serveur, périmètre appliqué par l'API, états chargement / vide / erreur |
| 2 | Rechercher nom/prénom | ☑ | `GET /adherents?recherche=` | Recherche temporisée (300 ms), filtre en puce retirable, conservée dans l'URL |
| 3 | Rechercher matricule | ☑ | `GET /adherents/matricule/{matricule}` | Accès direct à la fiche ; même message si introuvable ou hors périmètre |
| 4 | Rechercher téléphone | ☑ | `GET /adherents?telephone=` | Recherche temporisée ; nom et matricule affichés contre les homonymes |
| 5 | Filtrer statut | ☑ | `GET /adherents?statut=` | Sélecteur, libellés de `lib/statuts.ts` |
| 6 | Filtrer agent | ☑ | `GET /adherents?agentId=` | `SelectRecherche` sur le référentiel des agents (`ORGANISATION:LIRE`) |
| 7 | Filtrer complétion | ☑ | `GET /adherents?completionMin=&completionMax=` | Plages ; appartenance décidée par la formule serveur |
| 8 | Pagination/tri | ☑ | `GET /adherents?page=&taille=&tri=&direction=` | Tri serveur sur liste blanche, pagination avec total réel |
| 9 | Créer adhérent | ☑ | `POST /adherents` | `/adherents/nouveau` — formulaire en 3 étapes RHF + Zod, récapitulatif avant envoi |
| 10 | Vérifier doublons | ☑ | `POST /adherents/verifier-doublon` | Bandeau non bloquant à l'étape 3 ; confirmation explicite sur `409 ADHERENT_DOUBLON_POTENTIEL` |
| 11 | Générer référence | ☑ | inclus dans `POST /adherents` | Matricule annoncé après création, bouton de copie dans la fiche |
| 12 | Détail adhérent | ☑ | `GET /adherents/{id}` | `/adherents/:id` — en-tête collant, onglets dans l'URL |
| 13 | Modifier profil | ☑ | `PUT /adherents/{id}` ; dossier officiel : `POST /adherents/{id}/demandes-modification` | Modification directe en brouillon ; demande de modification pour un dossier validé (V19) |
| 14 | Calculer complétion | ☑ | `GET /adherents/{id}/completion` | Barre de complétion, valeur serveur |
| 15 | Champs manquants | ☑ | `GET /adherents/{id}/champs-manquants` | Liste dans « Compléter le dossier » |
| 16 | Compléter dossier | ☑ | `PATCH /adherents/{id}/profil` | Ne propose que les champs manquants |
| 17 | État dossier | ☑ | `GET /adherents/{id}/dossier` | Bloc « Dossier » de l'onglet Profil |
| 18 | Documents manquants | ☑ | `GET /adherents/{id}/documents-manquants` | Dépôt pré-typé par pièce manquante |
| 19 | Consulter documents | ☑ | `GET /documents?adherentId=`, `GET /documents/{id}` | Onglet Documents, téléchargement authentifié |
| 20 | Ajouter pièce | ☑ | `POST /documents` | Téléversement multipart, vérification / rejet motivé (`DOCUMENT:VERIFIER`) |
| 21 | Historique | ☑ | `GET /adherents/{id}/historique` | Chronologie filtrable, inclut les étapes du parcours d'adhésion |
| 22 | Agent responsable | ☑ | `GET /adherents/{id}/agent` | Carte « Agent responsable » |
| 23 | Affecter agent | ☑ | `POST /portefeuilles/affecter` | Confirmation, motif facultatif |
| 24 | Modifier affectation | ☑ | `POST /portefeuilles/transferer` | Ancien → nouvel agent, motif obligatoire |
| 25 | Proches quota CNPS | ☑ | `GET /cnps/proches-seuil` | Onglet « Proches du seuil CNPS », bande `[V]` affichée |
| 26 | Atteint 15 000 | ☑ | `GET /cnps/eligibles-non-immatricules` | Onglet « Éligibles CNPS » |
| 27 | Éligibilité pré-immatriculation | ☑ | `GET /adherents/{id}/resume-cotisations` | Onglet CNPS : éligibilité distincte de la complétude |
| 28 | Cumul cotisations | ☑ | `GET /adherents/{id}/resume-cotisations` | Onglet Cotisations : validé, en attente, reste avant seuil |
| 29 | Infos professionnelles | ☑ | `GET /adherents/{id}/professionnel` | Onglet Professionnel |
| 30 | Modifier infos professionnelles | ☑ | `PUT /adherents/{id}/professionnel` | Édition activité / CNPS, erreur localisée |
| 31 | Coordonnées | ☑ | `GET /adherents/{id}/coordonnees` | Carte Coordonnées |
| 32 | Modifier coordonnées | ☑ | `PUT /adherents/{id}/coordonnees` | Édition explicite, saisie conservée en cas d'erreur |
| 33 | Changer statut dossier | ☑ | `POST /adherents/{id}/statut` ; dossier officiel : demande V19 | Motif obligatoire, étape de confirmation |
| 34 | Exporter adhérents | ◐ | `POST /exports/adherents` | Le dialogue rappelle les critères appliqués (statut, zone) et signale ceux que l'export ignore |
| 35 | Publier changement | ☑ | `GET /temps-reel/flux` (SSE) | Les listes et fiches se rechargent dès qu'un autre acteur modifie un adhérent (§8.6) |

### 8.2 Gestion des agents de terrain — 25 / 25

| # | Fonctionnalité | État | Route réelle | Écran / UX livrée |
|---|---|---|---|---|
| 1 | Lister agents terrain | ☑ | `GET /agents` (paginé) | `/agents` — tableau paginé, état vide, colonne « Validation » |
| 2 | Rechercher agent | ☑ | `GET /agents?recherche=` | Recherche temporisée (nom, code, téléphone) |
| 3 | Profil agent | ☑ | `GET /agents/{id}` | `/agents/:id` — en-tête, carte Identité, onglets dans l'URL |
| 4 | Créer profil agent | ☑ | `POST /agents` | « Ajouter un agent » (DGA) ; mot de passe initial affiché une seule fois |
| 5 | Modifier profil | ☑ | `PUT /agents/{id}` ; profil validé : demande V19 | Erreur localisée au champ |
| 6 | Activer/désactiver | ☑ | `POST /agents/{id}/statut` ; profil validé : `POST /agents/{id}/demandes-changement-statut` | État actuel → cible, motif obligatoire |
| 7 | Activité récente | ☑ | `GET /agents/{id}/operations` | Onglet Activité, filtre par période |
| 8 | Compter adhérents affectés | ☑ | `GET /agents/{id}/portefeuille/resume` | Onglet Synthèse |
| 9 | Portefeuille | ☑ | `GET /agents/{id}/portefeuille` | Onglet Portefeuille paginé, ligne → fiche adhérent |
| 10 | Compter dossiers complets | ☑ | `GET /agents/{id}/portefeuille/resume` | Lien vers la liste filtrée |
| 11 | Compter dossiers incomplets | ☑ | `GET /agents/{id}/portefeuille/resume` | Lien vers la liste filtrée |
| 12 | Proches seuil CNPS | ☑ | `GET /agents/{id}/portefeuille/cnps/proches-seuil` | Onglet CNPS |
| 13 | Éligibles CNPS | ☑ | `GET /agents/{id}/portefeuille/cnps/eligibles` | Onglet CNPS |
| 14 | Compter contributions | ☑ | `GET /agents/{id}/cotisations-resume?periode=` | Synthèse du mois choisi |
| 15 | Somme contributions | ☑ | `GET /agents/{id}/cotisations-resume?periode=` | Montants validés / en attente / annulés |
| 16 | Affecter adhérent | ☑ | `POST /portefeuilles/affecter` | Adhérents sans agent de la zone, confirmation |
| 17 | Retirer affectation | ☑ | `POST /portefeuilles/retirer` | Motif obligatoire |
| 18 | Réaffecter adhérent | ☑ | `POST /portefeuilles/transferer` | Agent actuel → nouvel agent, motif obligatoire |
| 19 | Distribution portefeuilles | ☑ | `GET /agents/portefeuille-distribution` | Onglet « Répartition des portefeuilles » |
| 20 | Charge de travail | ☑ | `GET /agents/{id}/charge?periode=` | Collecte validée / objectif serveur |
| 21 | Filtrer statut | ☑ | `GET /agents?actif=` | Filtre en puce retirable |
| 22 | Dernière activité | ☑ | `GET /agents/{id}/operations` | Carte « Dernière activité enregistrée » |
| 23 | Opérations agent | ☑ | `GET /agents/{id}/operations?depuis=&jusqua=` | Chronologie typée |
| 24 | Historique portefeuille | ☑ | `GET /agents/{id}/portefeuille/historique` | Affectations ouvertes et clôturées, motif |
| 25 | Publier activité agent | ☑ | `GET /temps-reel/flux` (SSE) | Fiche, liste et répartition rechargées dès qu'un autre acteur agit (§8.6) |

Complément V20 : carte « Frais d'adhésion collectés » sur la synthèse de l'agent
(`GET /frais-adhesion/agents/{id}/synthese`) et lien vers la liste des frais filtrée sur l'agent.

### 8.3 Gestion des cotisations — 36 / 36

| # | Fonctionnalité | État | Route réelle | Écran / UX livrée |
|---|---|---|---|---|
| 1 | Lister cotisations | ☑ | `GET /paiements` | `/cotisations` — tableau paginé et trié serveur |
| 2 | Par adhérent | ☑ | `GET /paiements?adherentId=` | Lien depuis la fiche adhérent, bandeau « Filtré sur un adhérent » |
| 3 | Par matricule | ☑ | `GET /paiements?adherentMatricule=` | Champ temporisé |
| 4 | Par agent | ☑ | `GET /paiements?agentId=` | Filtre « Agent encaisseur » |
| 5 | Par référence | ☑ | `GET /paiements?reference=` | Champ temporisé, état vide explicite |
| 6 | Filtrer statut | ☑ | `GET /paiements?statut=` | 7 statuts officiels |
| 7 | Filtrer période | ☑ | `GET /paiements?dateDu=&dateAu=` | Période inversée non envoyée, bandeau explicatif |
| 8 | Détail cotisation | ☑ | `GET /paiements/{id}` | `/cotisations/:id` |
| 9 | Créer cotisation | ☑ | `POST /paiements` | `/cotisations/nouveau`, RHF + Zod |
| 10 | Générer référence transaction | ☑ | inclus dans `POST /paiements` | Numéro de reçu annoncé après création |
| 11 | Valider montant | ☑ | règle serveur | Contrôle de forme seulement, erreur serveur placée sur le champ |
| 12 | Valider adhérent | ☑ | règle serveur | Carte de l'adhérent choisi avant envoi |
| 13 | Doublon cotisation | ☑ | `POST /paiements/verifier-doublon` | Dialogue listant les paiements similaires, « Enregistrer quand même » |
| 14 | Soumettre validation | ☑ | `POST /paiements/{id}/soumettre` | Brouillon → file de contrôle |
| 15 | Liste à valider | ☑ | `GET /paiements?statut=A_CONTROLER` | `/daf` — plus anciens d'abord |
| 16 | Valider cotisation | ☑ | `POST /paiements/{id}/valider` | Dialogue de contrôle complet ; masqué pour l'auteur |
| 17 | Rejeter cotisation | ☑ | `POST /paiements/{id}/rejeter` | Motif obligatoire, définitif |
| 18 | Historique statuts | ☑ | `GET /paiements/{id}/historique-statuts` | Carte « Historique des statuts » |
| 19 | Corriger opération | ☑ | `POST /paiements/{id}/corriger` ; officielle : `POST /paiements/{id}/demandes-correction` | Revue avant / après, seuls les champs modifiés envoyés |
| 20 | Total validé | ☑ | `GET /adherents/{id}/resume-cotisations` | Carte « Cotisations de l'adhérent » |
| 21 | Total en attente | ☑ | idem | Lien vers le journal filtré |
| 22 | Restant avant 15 000 | ☑ | idem | Valeur serveur |
| 23 | Progression CNPS | ☑ | idem | Barre = rapport de deux montants serveur |
| 24 | Seuil atteint | ☑ | idem | Mention « Seuil atteint » |
| 25 | Cotisations proches seuil | ☑ | `GET /cnps/proches-seuil` | Onglet de la liste des adhérents |
| 26 | Résumé cotisations | ☑ | `GET /adherents/{id}/resume-cotisations` | Fiche adhérent et fiche paiement |
| 27 | Statistiques quotidiennes | ☑ | `GET /paiements/statistiques/quotidiennes` | Onglet « Statistiques du jour » |
| 28 | Statistiques par agent | ☑ | `GET /agents/{id}/cotisations-resume` | Synthèse de la fiche agent |
| 29 | Rapport quotidien | ☑ | `GET /paiements/bilan-journalier` | `/bilans-caisse` — carte « Bilan numérique » |
| 30 | Enregistrer caisse physique | ☑ | `POST /bilans-caisse` | Saisie puis relecture des deux montants |
| 31 | Écart caisse | ☑ | `GET /bilans-caisse/{date}` | Écart en chiffres **et en toutes lettres** |
| 32 | Valider rapprochement | ☑ | `POST /bilans-caisse/{date}/valider` | DAF, version transmise |
| 33 | Signaler anomalie | ☑ | `POST /bilans-caisse/{date}/anomalie` | Motif obligatoire, ressaisie ouverte |
| 34 | Exporter cotisations | ◐ | `POST /exports/paiements` | Critères appliqués (statut, période) rappelés ; les autres sont signalés |
| 35 | Idempotence UX | ☑ | en-tête `Idempotency-Key` | Clé générée au montage, réutilisée après une erreur réseau |
| 36 | Publier changement cotisation | ☑ | `GET /temps-reel/flux` (SSE) | Journal, file DAF, bilan et droits rechargés dès qu'un autre acteur agit (§8.6) |

### 8.4 Workflow de correction, validation et traçabilité (V19) — sur les 3 modules

| Fonctionnalité | Route réelle | Écran |
|---|---|---|
| Centre de validation (à traiter, mes demandes, toutes) | `GET /demandes-validation`, `/en-attente` | `/validations` |
| Fiche d'une demande : comparaison avant / proposé, justificatifs, chronologie | `GET /demandes-validation/{id}` | `/validations/:id` |
| Soumettre, approuver, rejeter, demander correction, resoumettre, annuler | `POST /demandes-validation/{id}/{action}` | Motif obligatoire au rejet et à la correction ; auteur ≠ validateur |
| Demande de modification d'une donnée officielle | `/adherents|agents/{id}/demandes-modification`, `/paiements/{id}/demandes-correction` | Bandeau de workflow dans chaque fiche |
| Statut et historique de validation | `/{module}/{id}/statut-validation`, `/historique-validation` | Onglet « Validation » |

### 8.5 Parcours d'adhésion : frais, activation, contrôle DGA (V20)

| Garantie / fonctionnalité | Route réelle | Écran / UX livrée |
|---|---|---|
| Adhérent identifié de façon unique | `GET /adherents/{id}`, matricule | Nom + matricule partout (fiche, file DGA, frais, écarts) |
| Frais d'adhésion de 1 000 FCFA associé à l'adhérent | `GET/POST /adherents/{id}/frais-adhesion`, `GET /frais-adhesion/configuration` | Onglet « Adhésion » : montant attendu lu du serveur, saisie puis relecture, écart signalé |
| Agent collecteur connu | champ `agentId` du frais | Choix obligatoire de l'agent (agent responsable proposé par défaut) ; carte sur la fiche agent |
| Création et activation par le Gestionnaire | `GET /adherents/{id}/activation`, `POST /adherents/{id}/activer` | « Vérifier et activer » : conditions serveur ✓/✗, caractère bloquant, confirmation des doublons tracée |
| Transmission au contrôle DGA | automatique à l'activation ; `POST /adherents/{id}/soumettre-dga` | Frise du parcours ; « Retransmettre à la DGA » après une correction demandée |
| Statut du compte distinct du contrôle DGA | `GET /adherents/{id}/synthese-workflow` | Deux badges séparés (« Actif » / « En attente de contrôle DGA ») |
| Vérification des documents par la DGA | `GET /controles-dga`, `POST /controles-dga/{id}/demarrer` | `/controles-dga` — file filtrable (à traiter, statut, période, anomalies) |
| Chaque information contrôlée est traçable | `POST /controles-dga/{id}/champs/{champId}/verifier`, `GET /controles-dga/{id}/journal` | `/controles-dga/:id` — COSITI et document côte à côte, « Correspond » en un clic, journal du contrôle |
| Anomalies explicites | idem, `POST /controles-dga/{id}/documents/{documentId}/verifier` | Valeur lue obligatoire pour « ne correspond pas », commentaire obligatoire hors « correspond », document manquant / illisible |
| Corrections traçables | `POST /controles-dga/{id}/terminer` (`DEMANDER_CORRECTION`), historique des tours | Nouveau tour à chaque retransmission ; tours précédents consultables |
| Dossiers soumis sans double comptage | `GET /controles-dga/synthese` | Indicateur « Dossiers distincts soumis », retransmissions comptées à part |
| Montant théorique calculé par le backend | `GET /frais-adhesion/rapprochement` | `/frais-adhesion` — « dossiers × montant unitaire = montant attendu », `detailCalcul` affiché tel quel |
| Rapprochement théorique / enregistré, écarts détectés | idem | Écart en chiffres et en toutes lettres, tableau des dossiers en écart, frais hors soumission |
| Encaissement validé par le DAF, anomalies de frais | `POST /frais-adhesion/{id}/valider`, `/anomalie`, `/resoudre-anomalie` | Actions masquées pour l'auteur ; résolution motivée, correction de montant tracée |
| Actions critiques auditées | `TypeOperation` V20 | Libellés dans le journal du contrôle et l'historique de l'adhérent |
| Permissions imposées côté backend | `@PreAuthorize` + périmètre | L'interface masque pour le confort ; les refus 403 / 409 / 422 sont affichés |
| Le frontend n'est jamais la source de vérité ; `/api/v1/openapi` reste le contrat | — | Aucun montant, compteur ou condition recalculé côté client |

### 8.6 Mise à jour en temps réel entre les rôles

- **Backend** : `GET /api/v1/temps-reel/flux` (`text/event-stream`, authentifié par l'en-tête `Authorization`).
  `EcouteurTempsReel` relaie **après commit** `AdherentModifieEvent`, `AgentModifieEvent`,
  `PaiementModifieEvent`, `DemandeValidationEvent` et `AdhesionEvent`. Chaque abonné ne reçoit que les domaines
  qu'il a le droit de lire. Le message ne porte aucune donnée métier (domaine, identifiants, nature du
  changement) : le navigateur recharge par l'API, qui applique permissions et périmètre. Le flux se ferme toutes
  les 10 minutes et est rouvert avec un jeton frais ; battement toutes les 25 s ; 5 flux au plus par utilisateur.
- **Frontend** : `FournisseurTempsReel` ouvre un seul flux par onglet tant que la session est connectée.
  `useTempsReel` regroupe les signaux (300 ms) et invalide les familles de requêtes touchées. Reconnexion
  automatique (2 s → 30 s), puis rechargement complet pour rattraper un signal manqué. Indicateur
  « En direct / Hors ligne » dans l'en-tête, avec libellé et non la couleur seule.
- Exemple : quand la DGA valide un contrôle, la fiche de l'adhérent ouverte chez le Gestionnaire, la file DGA et
  le rapprochement des frais chez le DAF se mettent à jour sans recharger la page.
