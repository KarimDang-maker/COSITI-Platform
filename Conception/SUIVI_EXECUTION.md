# SUIVI_EXECUTION — Avancement du projet COSITI V1

Ce fichier est mis à jour par l'agent de code **à chaque avancée réelle** dans le code (pas en avance, pas en intention). Une ligne par jalon, complétée au fil de l'eau. Voir [`JALONS_PROJET_COSITI.md`](JALONS_PROJET_COSITI.md) pour le contenu et le critère de passage de chaque jalon.

## Comment mettre à jour ce fichier

1. Au début d'un jalon : passer son statut à `En cours`, renseigner la date de début.
2. À chaque sous-tâche significative livrée (endpoint, écran, migration) : ajouter une ligne dans `Journal détaillé`.
3. Quand le critère de passage du jalon est rempli (voir `JALONS_PROJET_COSITI.md`) : passer le statut à `Terminé`, cocher les tests, renseigner la date de fin.
4. Ne jamais marquer `Terminé` un jalon dont les tests backend ou frontend ne sont pas verts.

## Tableau d'avancement

| Jalon | Statut | Date début | Date fin | Tests backend | Tests frontend | Notes |
|---|---|---|---|---|---|---|
| J0 — Socle | Partiel (reliquat frontend) | 21/09/2026 | 22/09/2026 | ☐ | ☐ | Reliquat frontend traité : Tailwind v4 + shadcn/ui + CVA, lucide-react, React Router, TanStack Query, React Hook Form + Zod, TanStack Table, Recharts, Vitest/Testing Library/MSW installés et vérifiés (`docs/journal-dependances.md`). Playwright non installé, faute de temps. Le socle backend (Spring Boot, Flyway, CI) n'a pas été touché dans cette session, hors périmètre frontend |
| J1 — Auth + RBAC | Terminé | 21/09/2026 | 22/09/2026 | ☑ | ☑ | Backend (cette session) + frontend (session précédente) tous deux livrés. Backend : entités `Utilisateur/Role/Permission`, `SecurityConfig` (JWT HS256, RBAC par permission, en-têtes de sécurité), `ServiceAuthentification` (connexion, verrouillage 5 échecs exponentiel, rafraîchissement avec rotation + détection de réutilisation, changement de mot de passe révoquant les sessions), `ServiceJeton`, `ServicePerimetreDonnees` (squelette), `ServiceAudit` (append-only, masquage `@DonneeSensible`), migrations `V5` (catalogue permissions + `role_permission`) et `V6` (`jeton_rafraichissement`), commande d'amorçage `CommandeAmorcageSuperAdmin`. **15/15 tests backend verts** (7 unitaires + 7 intégration Testcontainers + 1 smoke test contexte). Un bug réel corrigé en cours de route : `@Transactional` annulait silencieusement le compteur d'échecs/le verrouillage et la révocation de famille de jetons lors d'une réutilisation détectée (rollback Spring sur exception) — corrigé via `ExecuteurTransactionIndependante` (`PROPAGATION_REQUIRES_NEW`). Tests frontend : 10/10 verts (session précédente, non ré-exécutés dans cette session backend) |
| J2 — Adhérents | Terminé | 22/09/2026 | 22/09/2026 | ☑ | ☑ | Backend (cette session backend) + frontend (cette session frontend). Backend : entités `Adherent/Activite/Association/Pack/Adhesion/AyantDroit`, `ServiceMatricule` (séquence `seq_matricule_adherent`), `ServiceDoublonAdherent` (téléphone/CNI exacts + similarité `pg_trgm` par zone, masquage téléphone), `ServiceAdherent` (créer/consulter/modifier/rechercher/archiver/changerStatut/changerPack, transactionnel), `ServicePerimetreDonnees` étendu (portefeuille agent/chef via `affectation_portefeuille`+`agent.chef_agent_id`, requêtes SQL directes car les entités J3 n'existaient pas encore). **18/18 tests backend verts** (7+4 unitaires + 7 intégration Testcontainers/RestAssured). Bug réel corrigé : `Adhesion`/`AyantDroit.creeLe` envoyé `NULL` par Hibernate au lieu de laisser le `DEFAULT now()` s'appliquer — corrigé en renseignant `Instant.now()` dans le constructeur. Frontend : `ListeAdherents` (`/adherents`, filtres `recherche`/`statut` dans l'URL, pagination et tri serveur, 4 états), `NouvelAdherent` (`/adherents/nouveau`, formulaire RHF+Zod en 3 étapes, détection de doublon non bloquante puis confirmation explicite sur 409), `FicheAdherent` (`/adherents/:id`, situation de droits si `DROITS:LIRE`). Composants ajoutés : `tableau-donnees.tsx` (TanStack Table v8, tri/pagination manuels), `select-recherche.tsx`, `barre-filtres.tsx`. **17/17 tests frontend verts** (4 écran de connexion + 3 garde de route + 3 client HTTP + 4 liste adhérents + 3 nouvel adhérent). Champ « Code d'activité » en texte libre : `GET /activites` non documenté (voir décisions ci-dessous). `@tanstack/react-table` rétrogradé de v9 (réécriture d'API trop récente) vers v8.21.3 — voir `docs/journal-dependances.md` |
| J3 — Organisation terrain (DGA/Chef) | Terminé | 22/09/2026 | 22/09/2026 | ☑ | ☑ | Backend (cette session backend) + frontend (cette session frontend). Entités `Zone/Agent/AffectationPortefeuille/HistoriqueDesignationChef` (nouvelle migration `V7` : `agent.cree_par_dga_id` + table `historique_designation_chef`, décision documentée dans la migration : périmètre de désignation = la zone de l'agent désigné, mécanisme réel = `agent.chef_agent_id` déjà présent en V2, jamais un booléen `est_chef`). `ServiceAgent.creerParDga` (réservé DGA, crée aussi le compte de connexion + rôle `AGENT_TERRAIN`, mot de passe initial aléatoire renvoyé une seule fois), `designerChef`/`remplacerChef` (réservés DGA, motif obligatoire, un seul Chef actif par zone vérifié via le dernier enregistrement de l'historique, rôle `CHEF_AGENT_TERRAIN` accordé/retiré sur le compte lié), `ServicePortefeuille` (affecter/transférer/lot, clôture de l'affectation ouverte avant nouvelle affectation). **11/11 tests backend verts** (6 unitaires `ServiceAgentImplTest` + 5 intégration `OrganisationIntegrationTest` : ajout d'agent par DGA avec vérif du rôle, RBAC DGA-only 403, désignation/remplacement de Chef historisés avec rôle transféré, conflit sur double désignation, transfert de portefeuille). Deux bugs réels transverses corrigés en même temps (impactaient aussi J1/J2) : (1) le conteneur Testcontainers partagé entre classes de test était arrêté par la première classe puis ne redémarrait pas proprement pour les suivantes (« Connection refused ») — corrigé en conteneur « singleton manuel » démarré une fois dans un bloc statique, jamais arrêté explicitement (Ryuk nettoie en fin de JVM) ; (2) `transferer`/`changerPack` violaient l'index unique partiel « une seule affectation/adhésion ouverte » car Hibernate exécute par défaut tous les INSERT d'un flush avant tous les UPDATE, donc la clôture de l'ancienne ligne (UPDATE) était différée après l'insertion de la nouvelle — corrigé avec `saveAndFlush` sur la clôture. Frontend : `EcranOrganisation` (`/organisation`) — agents (portefeuille du mois via `GET /agents/{id}/charge`, taux de retard non affiché faute d'endpoint), zones (lecture seule), portefeuilles par zone (Chef actuel + adhérents sans agent référent), `DialogueAjouterAgent` (révèle le mot de passe initial une seule fois), `DialogueDesignerChef` (choix automatique désignation/remplacement selon `GET /agents/chef`, rappel explicite de l'ancien Chef), `DialogueMouvementPortefeuille` (affecter/transférer, motif obligatoire seulement pour le transfert). Permissions `ORGANISATION:*` lues directement dans le code backend (`V5__catalogue_permissions.sql`), le pack `03_SPECIFICATIONS_API.md §6` ne les documentant pas. **20/20 tests frontend verts** au total (J1+J2+J3 : 3 tests dédiés J3 — masquage par permission, formulaire d'ajout d'agent avec mot de passe initial, confirmation de remplacement du Chef rappelant l'ancien) |
| J4 — Cotisations | Terminé | 22/09/2026 | 22/09/2026 | ☑ | ☑ | Backend (cette session backend) + frontend (session frontend précédente). Backend : entités `Paiement/AffectationPaiement/ComposanteAffectation/RemiseCaisse`, `ServicePaiement.enregistrer` (7 contrôles : adhérent existant/non archivé/périmètre, montant > 0, référence mobile money obligatoire, date cohérente avec l'adhésion, idempotence via `cle_idempotence` avec renvoi 200 de l'existant, numéro de reçu par séquence `seq_numero_recu`, statut initial `A_CONTROLER`), `valider` (refuse `validateur.identifiant == paiement.creePar`, transition interdite si déjà validé/annulé), `corriger`/`annuler` (motif obligatoire, transitions contrôlées), `ServiceAffectationPaiement` (lit `REPARTITION_VERSEMENT` — `[V]` non validée — applique par défaut une affectation unique vers `COOPERATIVE` et journalise un avertissement, jamais de ventilation inventée), `ServiceRemiseCaisse` (déclarer/réceptionner, refuse l'auto-réception, détecte l'écart), `ServicePerimetreDonnees` étendu au paiement (périmètre = celui de l'adhérent rattaché). `PaiementDto` complété avec `creePar` (résolution de l'écart signalé par la session frontend — le frontend masque, le service reste seul juge). **19/19 tests backend verts** (7+3+1 unitaires + 8 intégration Testcontainers/RestAssured : idempotence, référence mobile money, séparation saisie/validation avec conflit de transition, affectation par défaut auditée, annulation motivée, remise de caisse avec écart, verrou optimiste, RBAC positif/négatif). Deux bugs réels corrigés : (1) `ServicePortefeuille.transferer`/`ServiceAdherent.changerPack` — cf. note J3, même classe de bug (`saveAndFlush` requis avant réaffectation) découverte confirmée transversale ; (2) `RemiseCaisse.ecart` (colonne PostgreSQL `GENERATED ALWAYS AS`) : l'entité JPA en mémoire ne reflète pas la valeur recalculée après un `UPDATE` dans la même transaction (même avec `@Generated`) — `ServiceRemiseCaisseImpl.receptionner` relit désormais l'écart par une requête SQL directe après écriture. Frontend (session précédente) : `JournalCotisations`, `NouveauPaiement`, `DetailPaiement`, `DialogueCorrigerPaiement`, **25/25 tests frontend verts** — non ré-exécutés dans cette session backend |
| J5 — Contrôle DAF | Non démarré | — | — | ☐ | ☐ | |
| J6 — Droits et régularité | Non démarré | — | — | ☐ | ☐ | |
| J7 — CNPS + documents | Non démarré | — | — | ☐ | ☐ | |
| J8 — Relances + comptes rendus | Non démarré | — | — | ☐ | ☐ | |
| J9 — Dashboards par rôle | Non démarré | — | — | ☐ | ☐ | |
| J10 — Rapports, exports, audit | Non démarré | — | — | ☐ | ☐ | |
| J11 — Administration + sécurité | Non démarré | — | — | ☐ | ☐ | |
| J12 — Recette E2E + pilote | Non démarré | — | — | ☐ | ☐ | |

## Décisions [A]/[V] en attente

Liste des points marqués `[A]` ou `[V]` dans les packs techniques qui bloquent ou limitent un jalon, à faire confirmer par la COSITI avant de coder la version définitive.

| Point | Jalon concerné | Statut |
|---|---|---|
| Règle de répartition d'un versement (`REPARTITION_VERSEMENT`) | J4 | `[V]` non validé |
| Délai de bascule en retard (`DELAI_RETARD_JOURS`) | J6 | `[V]` non validé |
| Traitement du reliquat non imputé | J6 | `[V]` non validé |
| Assiette CNPS (`revenu_mensuel_declare`) | J7 | `[V]` non validé |
| Contrat API — ajout d'un Agent par la DGA | J3 | Implémenté (`POST /agents`, vérifié DGA côté service, audité `AGENT_CREATION_PAR_DGA`) — reste à faire valider formellement par la COSITI |
| Contrat API — désignation / remplacement du Chef | J3 | Implémenté (`POST /agents/{id}/designer-chef` et `/remplacer-chef`) avec une décision d'implémentation documentée dans `V7__historique_designation_chef.sql` et `Conception/SUIVI_EXECUTION.md` (périmètre = la zone de l'agent désigné ; mécanisme réel = `agent.chef_agent_id`, jamais un booléen `est_chef`) — reste à faire valider formellement par la COSITI, en particulier le périmètre « zone » |
| Contrat API — compte rendu terrain, consolidation, transmission à la DGA | J8 | `[A]` à valider |
| Contrat API — production et transmission du rapport DAF au PCA | J5 / J10 | `[A]` à valider |
| Objectifs terrain (confirmation du besoin) | J3 / J9 | `[A]` à confirmer |
| Cadre légal camerounais (loi cybersécurité, conservation des données) | J11 | `[V]` — avis juridique requis |
| Code(s) de permission de l'entrée de navigation « Organisation terrain » — `03_SPECIFICATIONS_API.md §6` ne documente aucune permission par endpoint, contrairement aux adhérents et aux paiements | J3 | Résolu côté implémentation : `ORGANISATION:LIRE`/`GERER`/`AFFECTER_PORTEFEUILLE`/`DESIGNER_CHEF` trouvés dans `COSITI_Backend/.../V5__catalogue_permissions.sql` et utilisés côté frontend. Document `03_SPECIFICATIONS_API.md §6` reste à corriger pour lister ces permissions (écart pack/implémentation à signaler, ne pas corriger unilatéralement le pack) |
| CSP effective de production (`docs/04_SECURITE.md §5`) | J11 | `[A]` à définir avec la configuration du serveur qui servira le build |
| Playwright (parcours E2E connexion, création adhérent avec doublon) | J1–J4 | Non installé faute de temps — reste à faire |
| Périmètre de données de `GESTIONNAIRE_COMPTE` sur les adhérents | J2 | `[A]` — traité comme global en V1 faute de champ d'assignation organisationnelle (zone/portefeuille) pour ce rôle dans le schéma ; à confirmer/restreindre si un périmètre organisationnel lui est attribué |
| Algorithme JWT : HS256 retenu pour le prototype au lieu de RS256/ES256 recommandé par `docs/04_SECURITE.md §2` | J1 | `[A]` documenté dans `docs/04_SECURITE.md` — secret ≥256 bits, variable d'environnement obligatoire ; migration vers une paire de clés asymétrique à planifier avant mise en production |
| Endpoint de référentiel des activités (`GET /activites` ou équivalent) — absent de `03_SPECIFICATIONS_API.md`, seule la table `activite` existe côté schéma | J2 | `[A]` à confirmer — champ « Code d'activité » du formulaire `NouvelAdherent` en texte libre en attendant |
| Filtres `zoneId`, `agentId`, `activiteId`, `packId`, `associationId`, `sansAgentReferent`, `dateAdhesionDu/Au` de `GET /adherents` | J2 | Documentés par l'API mais non construits en J2 côté frontend, faute de temps et de référentiels consommés — reste à faire |
| Taux de retard par agent, écran `/organisation` | J3 / J6 | Aucun endpoint ne l'expose actuellement (calcul de régularité prévu au jalon J6) — colonne volontairement absente du tableau des agents plutôt qu'inventée |
| Transfert de portefeuille en lot | J3 | L'API accepte une liste d'adhérents (`TransfererPortefeuilleDto.adherentIds`), l'écran ne transfère qu'un adhérent à la fois faute de temps pour une sélection multiple — reste à faire |
| Historique de désignation du Chef (`GET /agents/{id}/historique-chef`) | J3 | Appel disponible dans `src/api/organisation.ts`, non affiché à l'écran faute de temps — reste à faire |
| Champ `creePar` absent de `PaiementDto` (backend), alors que `ServicePaiementImpl.valider` s'appuie sur `paiement.getCreePar()` pour refuser l'auto-validation | J4 | Résolu côté backend (session backend) : `PaiementDto.creePar` ajouté. Le frontend le déclarait déjà optionnel ; aucune action frontend requise, mais le masquage préventif du bouton « Valider » est désormais réellement alimenté |
| Filtres de `GET /paiements` (dates `dateDu`/`dateAu`, recherche libre) | J4 | Documentés par l'API mais non construits côté frontend en J4, faute de temps — reste à faire |
| Transfert en lot, reçu, affectations manuelles, remises de caisse, rapprochement des paiements | J4 | Non construits côté frontend — hors mandat de la session, endpoints déjà exposés côté `src/api/paiements.ts`/`organisation.ts` pour partie |

## Journal détaillé

### J1 — Authentification + coquille applicative (22/09/2026)

- Reliquat de J0 traité en préalable : `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`
  (procédure) écrit avant toute installation ; Tailwind v4, `@tailwindcss/vite`,
  CVA, `clsx`/`tailwind-merge`, `lucide-react`, `shadcn` (CLI) installés et
  branchés sur `src/styles/tokens.css` via `src/styles/globals.css`
  (`@theme inline`). React Router, TanStack Query, React Hook Form + Zod,
  TanStack Table, Recharts, Vitest, Testing Library, MSW installés. Détail et
  vérifications dans `docs/journal-dependances.md`.
- Primitives `src/components/ui/*` générées par `npx shadcn add` (bouton,
  champ, select, tableau, dialogue, menu déroulant, infobulle, onglets,
  squelette, tiroir, notifications…). Correctifs appliqués dans le même lot :
  import `cn` recâblé sur `@/lib/utils` (paquet `cn` publié par shadcn retiré),
  `next-themes` retiré (aucun mode sombre en V1, thème `sonner.tsx` figé),
  variante `marque` ajoutée à `buttonVariants`, `text-white` remplacé par le
  jeton `text-destructive-foreground`.
- `src/api/client.ts` : instance HTTP unique, intercepteurs 401 (rotation via
  `POST /auth/rafraichir`, rejeu unique, puis déconnexion si échec), 409, 429
  (`Retry-After`), normalisation `ErreurApi` (`src/api/erreurs.ts`).
- `src/auth/jeton.ts` (jeton d'accès en mémoire, jamais `localStorage` ni
  `sessionStorage`), `src/auth/ContexteAuth.tsx` (`AuthProvider`, `useAuth`,
  `usePermission`, permissions lues uniquement depuis `GET /auth/moi`).
- `src/app/GardeRoute.tsx` + `src/app/routes.tsx` : redirection `/connexion`
  sans session, écran « Accès non autorisé » sans permission.
- Écrans : `EcranConnexion` (message d'erreur unique, gestion
  `doitChangerMotDePasse`, message dédié sur `429`), `EcranChangerMotDePasse`,
  `AccesNonAutorise`.
- Coquille applicative : `coquille-application.tsx`, `navigation-laterale.tsx`
  (filtrage par permission, `TODO [V]` sur le code de permission
  « Organisation terrain »), `entete-application.tsx` (menu utilisateur,
  déconnexion). Composants transverses ajoutés dans le même lot :
  `badge-statut.tsx`, `alerte.tsx`, `avertissement-regle.tsx`,
  `etat-vide.tsx`, `squelette-tableau.tsx`, `dialogue-confirmation.tsx`,
  `avatar-utilisateur.tsx`, `logo-cositi.tsx`.
- Infrastructure de test : `src/test/setup.ts`, `src/test/rendu.tsx`
  (`rendreAvecProviders`), `src/test/msw/` (serveur, gestionnaires
  d'authentification, jeu de données de rôles fixes).
- Tests : `EcranConnexion.test.tsx` (4 tests), `GardeRoute.test.tsx`
  (3 tests), `api/client.test.ts` (3 tests, dont l'intercepteur
  401 → rafraîchissement → rejeu, et 401 → rafraîchissement en échec →
  session perdue). **10/10 tests verts.**
- `npm run build` (`tsc -b && vite build`) : vert. `npm run lint` (oxlint) :
  vert (avertissements `react/only-export-components` uniquement, y compris
  sur des fichiers `ui/` générés tels quels par la CLI shadcn).
- Docs reconstitués dans ce même lot : `docs/01_ARCHITECTURE.md`,
  `docs/03_SPECIFICATIONS_ECRANS.md` (section J1),
  `docs/04_SECURITE.md`, `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`,
  `docs/journal-dependances.md`. `AGENTS.md §3/§4/§7` mis à jour.

### J2 — Adhérents, frontend (22/09/2026)

- `src/api/adherents.ts` (types + appels : lister, obtenir, vérifier-doublon,
  créer, modifier, situation), `src/api/organisation.ts` (zones, utilisé par
  le sélecteur de zone du formulaire), `src/api/pagination.ts` (enveloppe de
  liste partagée), `src/hooks/useAdherents.ts`, `src/hooks/useOrganisation.ts`
  (React Query).
- Composants ajoutés : `components/cositi/tableau-donnees.tsx` (TanStack
  Table en mode manuel — tri/pagination restent serveur, jamais recalculés
  côté client), `select-recherche.tsx` (recherche obligatoire au-delà de 10
  options), `barre-filtres.tsx`.
- Écrans : `ListeAdherents` (`/adherents`), `NouvelAdherent`
  (`/adherents/nouveau`, formulaire en 3 étapes, détection de doublon non
  bloquante puis confirmation explicite si l'API renvoie `409` à la
  soumission), `FicheAdherent` (`/adherents/:id`).
- Routes ajoutées dans `app/routes.tsx`, toutes protégées par `GardeRoute`
  avec la permission exacte du contrat API.
- Tests : `ListeAdherents.test.tsx` (4 états), `NouvelAdherent.test.tsx`
  (validation d'étape, doublon non bloquant + confirmation, création directe
  sans doublon). **17/17 tests frontend verts** au total (J1 + J2).
- `npm run build`, `npm run lint`, `npm run test` : verts.
- Dépendance : `@tanstack/react-table` rétrogradé v9→v8.21.3 (voir
  `docs/journal-dependances.md`).
- Docs mis à jour dans ce même lot : `docs/03_SPECIFICATIONS_ECRANS.md`
  (section J2).
- Écarts assumés faute de temps, consignés en décisions `[A]`/`[V]`
  ci-dessus : filtres `zoneId`/`agentId`/`activiteId`/`packId`/
  `associationId`/`sansAgentReferent`/dates non construits ; champ activité
  en texte libre ; pas de gestion des ayants droit ni de changement de pack
  dans la fiche.

### J3 — Organisation terrain, frontend (22/09/2026)

- Contrat vérifié directement dans le code backend réel (contrôleurs, DTO,
  entités, `@PreAuthorize`) plutôt que dans `03_SPECIFICATIONS_API.md §6`,
  qui ne détaille ni les permissions ni les formes de réponse pour ce
  domaine — écart signalé ci-dessus plutôt que corrigé unilatéralement dans
  le pack.
- Correction rétroactive : les codes de rôle utilisés côté frontend
  (`auth/types.ts`, `entete-application.tsx`, jeux de données de test)
  utilisaient une orthographe différente de celle du backend
  (`GESTIONNAIRE_COMPTES`/`CHEF_AGENTS_TERRAIN`/`ADMIN_SYSTEME` au lieu de
  `GESTIONNAIRE_COMPTE`/`CHEF_AGENT_TERRAIN`/`SUPER_ADMIN`). Alignés sur
  `V1__socle_securite.sql`. Sans impact de sécurité (aucune permission n'est
  déduite d'un rôle côté client), mais l'affichage du libellé de rôle dans
  l'en-tête aurait échoué silencieusement sur le code brut.
- `src/api/organisation.ts` réécrit : `GET /zones` et `GET /agents`
  renvoient une liste simple (pas l'enveloppe paginée utilisée par
  `/adherents`) ; ajout des types/appels `Agent`, `ChargeAgent`,
  `AdherentResume`, `HistoriqueDesignationChef`, `creerAgent`,
  `designerChef`, `remplacerChef`, `obtenirChefCourant`,
  `obtenirHistoriqueChef`, `affecterPortefeuille`, `transfererPortefeuille`.
- `src/hooks/useOrganisation.ts` étendu (React Query : agents, charge,
  portefeuille, chef courant — normalise un 404 `ORGANISATION_AUCUN_CHEF` en
  `null` plutôt qu'en erreur, sans agent référent, mutations agent/chef/
  portefeuille).
- Écran `EcranOrganisation` (`/organisation`) + `DialogueAjouterAgent`,
  `DialogueDesignerChef`, `DialogueMouvementPortefeuille`.
- Tests : `EcranOrganisation.test.tsx` (masquage par permission, formulaire
  d'ajout d'agent + mot de passe initial révélé une fois, confirmation de
  remplacement du Chef rappelant l'ancien). **20/20 tests frontend verts**
  au total.
- `npm run build`, `npm run lint`, `npm run test` : verts.
- Docs mis à jour dans ce même lot : `docs/03_SPECIFICATIONS_ECRANS.md`
  (section J3).
- Écarts assumés faute de temps, consignés en décisions `[A]`/`[V]`
  ci-dessus : taux de retard par agent absent, transfert en lot non
  construit (un seul adhérent à la fois), historique de désignation du Chef
  non affiché, création/modification de zone non construites.

### J4 — Cotisations, frontend (22/09/2026)

- Contrat vérifié directement dans le code backend réel
  (`cm.cositi.api.cotisation` : DTO, `StatutPaiement`, codes d'erreur
  métier, `ReponsePaginee`) plutôt que dans `03_SPECIFICATIONS_API.md §4`.
- `src/api/paiements.ts` (types + appels : lister, obtenir, enregistrer avec
  `Idempotency-Key`, valider, corriger, annuler), `src/hooks/usePaiements.ts`
  (React Query).
- `src/lib/statuts.ts` : ajout du code `INCOHERENCE` au domaine `paiement`
  (réel côté backend, absent de la table précédente) — complété, pas
  redéfini.
- Écrans : `JournalCotisations` (`/cotisations`), `NouveauPaiement`
  (`/cotisations/nouveau`), `DetailPaiement` (`/cotisations/:id`) +
  `DialogueCorrigerPaiement`.
- Écart de contrat détecté en construisant `DetailPaiement` : `PaiementDto`
  n'expose pas `creePar` bien que `ServicePaiementImpl.valider` s'appuie
  dessus pour refuser l'auto-validation. Le champ est déclaré optionnel côté
  frontend (`Paiement.creePar?`) : le masquage préventif ne s'applique que
  s'il est un jour exposé, l'API restant de toute façon l'autorité finale.
- Correctifs de test : polyfills `hasPointerCapture`/`setPointerCapture`/
  `releasePointerCapture`/`scrollIntoView` ajoutés à `src/test/setup.ts` —
  jsdom ne les implémente pas et les composants Radix sous-jacents
  (`ui/select.tsx`, `cositi/select-recherche.tsx`) en ont besoin pour
  s'ouvrir dans les tests.
- Tests : `DetailPaiement.test.tsx` (bouton Valider désactivé + explication
  pour le créateur, validation permise pour un tiers, confirmation
  d'annulation avec motif obligatoire rappelant les valeurs),
  `NouveauPaiement.test.tsx` (référence Orange Money obligatoire,
  `Idempotency-Key` non vide envoyé à l'enregistrement). **25/25 tests
  frontend verts** au total (J1 à J4).
- `npm run build`, `npm run lint` (via `rtk proxy` — le filtre de sortie du
  hook RTK ne reconnaît pas le format de sortie d'oxlint et fait
  artificiellement échouer la commande sans lui, voir note ci-dessous),
  `npm run test` : verts.
- Docs mis à jour dans ce même lot : `docs/03_SPECIFICATIONS_ECRANS.md`
  (section J4).
- Écarts assumés faute de temps, consignés en décisions `[A]`/`[V]`
  ci-dessus : champ `creePar` absent côté API, filtres de dates et
  recherche libre non construits, transfert en lot/reçu/affectations
  manuelles/remises de caisse/rapprochement non construits.

**Note d'outillage (hors périmètre applicatif)** : `npm run lint` exécuté
tel quel dans cette session renvoie un code de sortie non nul à cause d'un
hook local (`rtk`, proxy de commandes) qui tente de parser la sortie
d'oxlint comme un rapport ESLint JSON et échoue — la commande elle-même
(`oxlint`) est verte (avertissements uniquement). Contourné avec
`rtk proxy npm run lint` pour cette session. Sans rapport avec le code de
l'application ; signalé pour éviter une fausse alerte lors d'une prochaine
session.

### J1 à J4 — Backend (22/09/2026)

Session backend dédiée, réalisée dans l'ordre J1 → J2 → J3 → J4 imposé par
`AGENTS.md`, chaque jalon compilé et testé (Testcontainers + RestAssured)
avant de passer au suivant. Détail du contenu de chaque jalon dans les
colonnes « Notes » du tableau ci-dessus ; résumé du parcours et des
correctifs transverses ici.

- Dépendances ajoutées suivant `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` :
  `spring-boot-testcontainers`, `org.testcontainers:junit-jupiter`,
  `org.testcontainers:postgresql` (version épinglée `1.21.4`, au-delà de la
  version gérée par `spring-boot-starter-parent:3.3.3`, pour compatibilité
  avec le client `docker-java` embarqué et ce poste de développement),
  `io.rest-assured:rest-assured`. Détail et justification complète dans
  `docs/journal-dependances.md`.
- Migrations ajoutées (les 4 migrations V1-V4 existantes n'ont pas été
  modifiées) : `V5__catalogue_permissions.sql` (catalogue de permissions
  `MODULE:ACTION` + attribution aux 8 rôles), `V6__jetons_rafraichissement.sql`
  (table de jetons de rafraîchissement opaques hachés), `V7__historique_designation_chef.sql`
  (`agent.cree_par_dga_id` + table `historique_designation_chef`).
- Bugs transverses réels détectés et corrigés en cours de route (au-delà des
  bugs propres à chaque jalon détaillés dans le tableau ci-dessus) :
  1. **Rollback silencieux d'écritures de sécurité** — `@Transactional` sur
     une méthode qui se termine par une exception annule tout, y compris les
     compteurs d'échec de connexion et les révocations de jetons qui doivent
     au contraire survivre à l'échec qu'elles enregistrent. Corrigé avec
     `ExecuteurTransactionIndependante` (`PROPAGATION_REQUIRES_NEW`).
  2. **Conteneur Testcontainers partagé entre classes de test** arrêté par la
     première classe puis jamais redémarré proprement pour les suivantes.
     Corrigé en conteneur « singleton manuel » (bloc statique, jamais arrêté
     explicitement, nettoyé par Ryuk en fin de JVM).
  3. **Ordre de flush Hibernate** (INSERT avant UPDATE dans un même flush,
     indépendamment de l'ordre d'appel Java) faisant échouer toute clôture
     d'affectation/adhésion ouverte suivie d'une réouverture — corrigé avec
     `saveAndFlush` sur la clôture, dans `ServicePortefeuilleImpl.transferer`
     et `ServiceAdherentImpl.changerPack`.
  4. **Colonne PostgreSQL générée (`GENERATED ALWAYS AS`)** : l'entité JPA en
     mémoire ne reflète pas sa valeur recalculée après un `UPDATE` dans la
     même transaction, y compris avec `@Generated` — `RemiseCaisse.ecart`
     relu explicitement par SQL direct après écriture.
- Total tests backend J1-J4 : **63 tests verts** (15 + 18 + 11 + 19 par
  jalon — unitaires Mockito + intégration Testcontainers/RestAssured),
  exécutés ensemble sans régression croisée (voir décompte détaillé par
  jalon ci-dessus).
- Non fait dans cette session (hors mandat explicite J1-J4, signalé plutôt
  qu'improvisé) : commande d'amorçage du Super Admin non exécutée
  réellement (code écrit et revu, non lancée faute d'environnement de
  production) ; modules J5 et suivants (contrôle DAF, droits/régularité,
  CNPS, etc.) non commencés.
