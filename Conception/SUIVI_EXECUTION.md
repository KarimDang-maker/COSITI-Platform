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
| J0 — Socle | Terminé (clos au jalon J12) | 21/09/2026 | 23/09/2026 | ☑ | ☑ | Reliquat frontend traité le 22/09 : Tailwind v4 + shadcn/ui + CVA, lucide-react, React Router, TanStack Query, React Hook Form + Zod, TanStack Table, Recharts, Vitest/Testing Library/MSW installés et vérifiés (`docs/journal-dependances.md`). **Les deux reliquats restants ont été levés au jalon J12** : Playwright installé (procédure de dépendances complète, Chromium seul) et **pipeline CI livré** (`.github/workflows/ci.yml` — backend, frontend, sécurité, recette E2E). Le critère de passage « pipeline CI vert » est donc rempli, onze jalons après l'ouverture de J0 : jusque-là, les tests ne protégeaient que la machine sur laquelle on les lançait. Le wrapper Maven cassé (`maven-wrapper.jar` absent du dépôt) est également réparé, en `distributionType=only-script` — aucun jar binaire versionné |
| J1 — Auth + RBAC | Terminé | 21/09/2026 | 22/09/2026 | ☑ | ☑ | Backend (cette session) + frontend (session précédente) tous deux livrés. Backend : entités `Utilisateur/Role/Permission`, `SecurityConfig` (JWT HS256, RBAC par permission, en-têtes de sécurité), `ServiceAuthentification` (connexion, verrouillage 5 échecs exponentiel, rafraîchissement avec rotation + détection de réutilisation, changement de mot de passe révoquant les sessions), `ServiceJeton`, `ServicePerimetreDonnees` (squelette), `ServiceAudit` (append-only, masquage `@DonneeSensible`), migrations `V5` (catalogue permissions + `role_permission`) et `V6` (`jeton_rafraichissement`), commande d'amorçage `CommandeAmorcageSuperAdmin`. **15/15 tests backend verts** (7 unitaires + 7 intégration Testcontainers + 1 smoke test contexte). Un bug réel corrigé en cours de route : `@Transactional` annulait silencieusement le compteur d'échecs/le verrouillage et la révocation de famille de jetons lors d'une réutilisation détectée (rollback Spring sur exception) — corrigé via `ExecuteurTransactionIndependante` (`PROPAGATION_REQUIRES_NEW`). Tests frontend : 10/10 verts (session précédente, non ré-exécutés dans cette session backend) |
| J2 — Adhérents | Terminé | 22/09/2026 | 22/09/2026 | ☑ | ☑ | Backend (cette session backend) + frontend (cette session frontend). Backend : entités `Adherent/Activite/Association/Pack/Adhesion/AyantDroit`, `ServiceMatricule` (séquence `seq_matricule_adherent`), `ServiceDoublonAdherent` (téléphone/CNI exacts + similarité `pg_trgm` par zone, masquage téléphone), `ServiceAdherent` (créer/consulter/modifier/rechercher/archiver/changerStatut/changerPack, transactionnel), `ServicePerimetreDonnees` étendu (portefeuille agent/chef via `affectation_portefeuille`+`agent.chef_agent_id`, requêtes SQL directes car les entités J3 n'existaient pas encore). **18/18 tests backend verts** (7+4 unitaires + 7 intégration Testcontainers/RestAssured). Bug réel corrigé : `Adhesion`/`AyantDroit.creeLe` envoyé `NULL` par Hibernate au lieu de laisser le `DEFAULT now()` s'appliquer — corrigé en renseignant `Instant.now()` dans le constructeur. Frontend : `ListeAdherents` (`/adherents`, filtres `recherche`/`statut` dans l'URL, pagination et tri serveur, 4 états), `NouvelAdherent` (`/adherents/nouveau`, formulaire RHF+Zod en 3 étapes, détection de doublon non bloquante puis confirmation explicite sur 409), `FicheAdherent` (`/adherents/:id`, situation de droits si `DROITS:LIRE`). Composants ajoutés : `tableau-donnees.tsx` (TanStack Table v8, tri/pagination manuels), `select-recherche.tsx`, `barre-filtres.tsx`. **17/17 tests frontend verts** (4 écran de connexion + 3 garde de route + 3 client HTTP + 4 liste adhérents + 3 nouvel adhérent). Champ « Code d'activité » en texte libre : `GET /activites` non documenté (voir décisions ci-dessous). `@tanstack/react-table` rétrogradé de v9 (réécriture d'API trop récente) vers v8.21.3 — voir `docs/journal-dependances.md` |
| J3 — Organisation terrain (DGA/Chef) | Terminé | 22/09/2026 | 22/09/2026 | ☑ | ☑ | Backend (cette session backend) + frontend (cette session frontend). Entités `Zone/Agent/AffectationPortefeuille/HistoriqueDesignationChef` (nouvelle migration `V7` : `agent.cree_par_dga_id` + table `historique_designation_chef`, décision documentée dans la migration : périmètre de désignation = la zone de l'agent désigné, mécanisme réel = `agent.chef_agent_id` déjà présent en V2, jamais un booléen `est_chef`). `ServiceAgent.creerParDga` (réservé DGA, crée aussi le compte de connexion + rôle `AGENT_TERRAIN`, mot de passe initial aléatoire renvoyé une seule fois), `designerChef`/`remplacerChef` (réservés DGA, motif obligatoire, un seul Chef actif par zone vérifié via le dernier enregistrement de l'historique, rôle `CHEF_AGENT_TERRAIN` accordé/retiré sur le compte lié), `ServicePortefeuille` (affecter/transférer/lot, clôture de l'affectation ouverte avant nouvelle affectation). **11/11 tests backend verts** (6 unitaires `ServiceAgentImplTest` + 5 intégration `OrganisationIntegrationTest` : ajout d'agent par DGA avec vérif du rôle, RBAC DGA-only 403, désignation/remplacement de Chef historisés avec rôle transféré, conflit sur double désignation, transfert de portefeuille). Deux bugs réels transverses corrigés en même temps (impactaient aussi J1/J2) : (1) le conteneur Testcontainers partagé entre classes de test était arrêté par la première classe puis ne redémarrait pas proprement pour les suivantes (« Connection refused ») — corrigé en conteneur « singleton manuel » démarré une fois dans un bloc statique, jamais arrêté explicitement (Ryuk nettoie en fin de JVM) ; (2) `transferer`/`changerPack` violaient l'index unique partiel « une seule affectation/adhésion ouverte » car Hibernate exécute par défaut tous les INSERT d'un flush avant tous les UPDATE, donc la clôture de l'ancienne ligne (UPDATE) était différée après l'insertion de la nouvelle — corrigé avec `saveAndFlush` sur la clôture. Frontend : `EcranOrganisation` (`/organisation`) — agents (portefeuille du mois via `GET /agents/{id}/charge`, taux de retard non affiché faute d'endpoint), zones (lecture seule), portefeuilles par zone (Chef actuel + adhérents sans agent référent), `DialogueAjouterAgent` (révèle le mot de passe initial une seule fois), `DialogueDesignerChef` (choix automatique désignation/remplacement selon `GET /agents/chef`, rappel explicite de l'ancien Chef), `DialogueMouvementPortefeuille` (affecter/transférer, motif obligatoire seulement pour le transfert). Permissions `ORGANISATION:*` lues directement dans le code backend (`V5__catalogue_permissions.sql`), le pack `03_SPECIFICATIONS_API.md §6` ne les documentant pas. **20/20 tests frontend verts** au total (J1+J2+J3 : 3 tests dédiés J3 — masquage par permission, formulaire d'ajout d'agent avec mot de passe initial, confirmation de remplacement du Chef rappelant l'ancien) |
| J4 — Cotisations | Terminé | 22/09/2026 | 22/09/2026 | ☑ | ☑ | Backend (cette session backend) + frontend (session frontend précédente). Backend : entités `Paiement/AffectationPaiement/ComposanteAffectation/RemiseCaisse`, `ServicePaiement.enregistrer` (7 contrôles : adhérent existant/non archivé/périmètre, montant > 0, référence mobile money obligatoire, date cohérente avec l'adhésion, idempotence via `cle_idempotence` avec renvoi 200 de l'existant, numéro de reçu par séquence `seq_numero_recu`, statut initial `A_CONTROLER`), `valider` (refuse `validateur.identifiant == paiement.creePar`, transition interdite si déjà validé/annulé), `corriger`/`annuler` (motif obligatoire, transitions contrôlées), `ServiceAffectationPaiement` (lit `REPARTITION_VERSEMENT` — `[V]` non validée — applique par défaut une affectation unique vers `COOPERATIVE` et journalise un avertissement, jamais de ventilation inventée), `ServiceRemiseCaisse` (déclarer/réceptionner, refuse l'auto-réception, détecte l'écart), `ServicePerimetreDonnees` étendu au paiement (périmètre = celui de l'adhérent rattaché). `PaiementDto` complété avec `creePar` (résolution de l'écart signalé par la session frontend — le frontend masque, le service reste seul juge). **19/19 tests backend verts** (7+3+1 unitaires + 8 intégration Testcontainers/RestAssured : idempotence, référence mobile money, séparation saisie/validation avec conflit de transition, affectation par défaut auditée, annulation motivée, remise de caisse avec écart, verrou optimiste, RBAC positif/négatif). Deux bugs réels corrigés : (1) `ServicePortefeuille.transferer`/`ServiceAdherent.changerPack` — cf. note J3, même classe de bug (`saveAndFlush` requis avant réaffectation) découverte confirmée transversale ; (2) `RemiseCaisse.ecart` (colonne PostgreSQL `GENERATED ALWAYS AS`) : l'entité JPA en mémoire ne reflète pas la valeur recalculée après un `UPDATE` dans la même transaction (même avec `@Generated`) — `ServiceRemiseCaisseImpl.receptionner` relit désormais l'écart par une requête SQL directe après écriture. Frontend (session précédente) : `JournalCotisations`, `NouveauPaiement`, `DetailPaiement`, `DialogueCorrigerPaiement`, **25/25 tests frontend verts** — non ré-exécutés dans cette session backend |
| J5 — Contrôle DAF | Terminé | 22/09/2026 | 22/09/2026 | ☑ | ☑ | Frontend (session frontend, notes ci-dessus conservées) + backend (session backend dédiée J5/J6 + comptes de démo, exécutée en parallèle puis vérifiée dans cette même session). Backend confirmé : `ServicePaiementImpl.confirmerParChef` (réservé `CHEF_AGENT_TERRAIN`, périmètre vérifié sur l'agent encaisseur via jointure `agent.chef_agent_id`, ne change pas le statut, motif facultatif **en paramètre de requête, jamais en corps JSON** — un corps optionnel aurait exigé un `Content-Type` même sans rien à transmettre, bug réel rencontré en testant un appel sans corps, statut 500 au lieu de 403 attendu, corrigé en passant `motif` en `@RequestParam`) et `.signalerIncoherence` (réservé `DAF`, motif obligatoire, transition vers `INCOHERENCE`). `valider` refuse désormais explicitement un paiement `INCOHERENCE` (`PAIEMENT_TRANSITION_INTERDITE`) ; `corriger` résout automatiquement l'incohérence et rouvre le paiement à `A_CONTROLER`. Écran de triage DAF : `GET /paiements?statut=A_CONTROLER` fonctionnait déjà depuis J4 (filtre générique), vérifié plutôt que dupliqué. Rapprochement mobile money confirmé hors périmètre (P1), non touché. Migration `V8__permissions_j5_j6.sql` (`PAIEMENT:CONFIRMER_CHEF` → `CHEF_AGENT_TERRAIN`, `PAIEMENT:SIGNALER_INCOHERENCE` → `DAF`, plus les deux permissions J6). **4 tests d'intégration backend verts** (`ControleDafIntegrationTest`) + **35/35 tests frontend verts** (session frontend) — **exécutés ensemble dans cette session** (`mvn -o test` : 88/88 verts toutes suites confondues, voir note de fin de tableau) |
| J6 — Droits et régularité | Terminé | 22/09/2026 | 22/09/2026 | ☑ | ☑ | Frontend (session frontend, notes ci-dessus conservées) + backend (même session backend dédiée que J5, vérifiée ici). Nouveau module backend `droits` (`entite/PeriodeDroits`+`StatutPeriode`, `repository/PeriodeDroitsRepository`, `service/ServiceCalculDroits(+Impl)` et `ServiceRegularite(+Impl)`+`StatutRegularite`, `controleur/ControleurDroits`, `dto/*`), schéma `periode_droits` (V3, non modifié). `ServiceCalculDroitsImpl.imputer(affectationPaiementId)` : lit `affectation_paiement`/`paiement` par JDBC direct (évite un cycle de paquetages avec `cotisation`, qui dépend déjà de `droits` depuis `ServicePaiementImpl.valider`), part de la fin de la dernière période non annulée (jamais de la date du paiement), `joursCouverts = montant / pack.montantJournalier` en `BigDecimal`/`RoundingMode.DOWN`, contrôle de chevauchement avant insertion, reliquat jamais imputé de force (`[V]` `TRAITEMENT_SURPAIEMENT` — reliquat non consommé, avertissement journalisé, cohérent avec l'esprit « report au mois suivant »). Appelé automatiquement à la fin de `ServicePaiementImpl.valider`, même transaction — bug réel corrigé : `ServiceAffectationPaiementImpl.affecter` faisait un simple `save()` de la nouvelle `affectation_paiement`, invisible à la lecture JDBC directe faite juste après par `imputer()` dans la même transaction (INSERT non flushé) → `AFFECTATION_INTROUVABLE` ; corrigé en `saveAndFlush` (même classe de bug que les corrections J3/J4). `recalculer` réservé `DAF`/`SUPER_ADMIN`, motif obligatoire, annule logiquement les périodes existantes puis rejoue les paiements `VALIDE`/`RAPPROCHE` dans l'ordre chronologique — non destructif, vérifié par test. `ServiceRegulariteImpl.evaluer` : seuil `DELAI_RETARD_JOURS` lu depuis `parametre` (jamais 30 en dur), `rafraichirStatutsQuotidiens` (`@Scheduled`) construit une identité système en mémoire (jamais persistée, rôle réel `GESTIONNAIRE_COMPTE`) pour appeler légitimement `ServiceAdherent.changerStatut` existant (jamais d'UPDATE SQL direct). Éligibilité CNPS comparée au `seuil_eligibilite_cnps` du pack **de l'adhérent**, jamais un seuil global. Permissions `DROITS:LIRE`/`DROITS:RECALCULER` ajoutées par `V8__permissions_j5_j6.sql`. **10 tests backend verts** (`ServiceCalculDroitsImplTest` 6 + `ServiceRegulariteImplTest` 4, unitaires) + **6 tests d'intégration backend verts** (`DroitsIntegrationTest` : multi-versements consécutifs avec arrondi, éligibilité CNPS par pack, recalcul DAF/SUPER_ADMIN non destructif, bascule de statut de retard aux bornes exactes du seuil, retardataires par périmètre, périmètre agent) + **35/35 tests frontend verts** — **exécutés ensemble** (`mvn -o test` : 88/88 verts, voir note de fin de tableau) |
| J7 — CNPS + documents | Terminé | 23/09/2026 | 23/09/2026 | ☑ | ☑ | Backend et frontend livrés dans la même session. **Aucune table créée** : le schéma du domaine existe depuis `V4__cnps_documents_relances.sql` ; `V9__permissions_j7_cnps_documents.sql` n'ajoute que le catalogue de permissions (`CNPS:LIRE/GERER/CHANGER_STATUT/DECLARER`, `DOCUMENT:LIRE/TELEVERSER/VERIFIER`) et deux règles `[V]` (`ASSIETTE_CNPS`, `PIECES_CNPS_OBLIGATOIRES`). Module `document` : `ServiceStockageDocumentImpl` (rattachement exclusif adhérent **ou** paiement, taille bornée, **type MIME par signature binaire** — `SignatureBinaire`, liste blanche JPEG/PNG/PDF —, empreinte SHA-256 du clair servant aussi de détection de doublon, analyse antivirus avant toute écriture disque, nom régénéré en UUID, chiffrement **AES-256-GCM** au repos via `ChiffrementFichier`, téléchargement journalisé `DOCUMENT_CONSULTATION`). `ServiceAnalyseAntivirusLocal` reconnaît la seule signature de test EICAR : limite documentée, le branchement d'un moteur réel (ClamAV) reste une exigence de mise en production. Module `cnps` : `ServiceDossierCnpsImpl` (ouverture avec création des pièces attendues lues dans le paramètre, pièces manquantes distinguant ATTENDUE/REJETEE, graphe de transitions **décidé et documenté** dans `StatutDossierCnps` faute de règle CNPS validée, refus de passer à PRET avec pièces manquantes, dossier TRANSMIS/TRAITE figé, historisation dans `historique_dossier_cnps`), `ServiceDeclarationCnpsImpl` (montant = droits réellement imputés sur le mois, **au prorata** pour une période à cheval, aucun taux ni assiette appliqué tant que `ASSIETTE_CNPS` est `[V]`, préparation idempotente par mois). **48 tests backend verts** (15 intégration `CnpsIntegrationTest` + 10 `ServiceDossierCnpsImplTest` + 7 `ServiceDeclarationCnpsImplTest` + 11 `ServiceStockageDocumentImplTest` + 5 `SignatureBinaireTest`), suite complète à **137/137**. Trois bugs réels corrigés en cours de lot : (1) `empreinte_sha256` est `CHAR(64)` en V4 et non `VARCHAR` — `ddl-auto=validate` refusait de démarrer, corrigé par `@JdbcTypeCode(SqlTypes.CHAR)` ; (2) `POST /cnps/declarations/{id}/transmettre` avec corps optionnel renvoyait 500 (même classe de bug que `confirmer-chef` en J5), corrigé en `@RequestParam` ; (3) **défaut antérieur à J7, tous endpoints confondus** : un corps JSON malformé ou une valeur d'énumération inconnue remontait au filet générique et renvoyait **500 au lieu de 400** — `GestionnaireExceptions` traite désormais `HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`, `MissingServletRequestParameterException`, `HttpMediaTypeNotSupportedException` et `MaxUploadSizeExceededException`, sans jamais renvoyer le message brut de Jackson (noms de classes Java). Frontend : `ListeDossiersCnps` (`/cnps`, onglets Dossiers / Éligibles non immatriculés), `FicheDossierCnps` (`/cnps/:id`, pièces, transitions, déclarations), `DialogueTeleverserDocument`, `api/cnps.ts`, `api/documents.ts`, `hooks/useCnps.ts`, `hooks/useDocuments.ts`. `api/client.ts` étendu (`postFormulaire` pour le multipart, `telechargerFichier` pour le binaire) plutôt qu'un `fetch` direct, interdit par `AGENTS.md`. **46 tests frontend verts** (11 dédiés J7). Deux corrections transverses côté frontend : `<Toaster />` ajouté à `test/rendu.tsx` — sans lui, aucun `toast` ne produisait de nœud et le principal canal de retour des mutations n'était pas vérifiable en test ; `TableauDonnees` ignore désormais les clics issus d'un élément interactif de la ligne (bouton, lien, champ) — un clic sur une action de ligne déclenchait aussi la navigation de la ligne, qui écrasait silencieusement l'action |
| J8 — Relances + comptes rendus | Terminé | 23/09/2026 | 23/09/2026 | ☑ | ☑ | Backend et frontend livrés dans la même session. Migration `V10__comptes_rendus_j8.sql` : seule la table `compte_rendu` (+ `compte_rendu_source`) manquait — `campagne_relance`, `relance` et `notification` existent depuis V4 et n'ont pas été retouchées. **Contrat `[A]` implémenté, à faire valider par la COSITI** : les quatre choix structurants (un seul type d'objet pour les deux niveaux via `type` TERRAIN/CONSOLIDE, indicateurs en colonnes typées et non en JSON libre, table de traçabilité des sources, aucune suppression physique) sont documentés en en-tête de la migration. Module `compterendu` : `ServiceCompteRenduImpl` — `produire` crée un **brouillon** (écart assumé avec le pack, qui créait et transmettait en un temps : un agent doit pouvoir relire avant d'envoyer), agent et zone déduits du compte connecté et jamais du corps de requête ; `transmettre` notifie le **rôle** destinataire (Gestionnaire pour un terrain, DGA pour un consolidé) car le destinataire est une fonction et non une personne, et journalise le cas « aucun destinataire » plutôt que de perdre le compte rendu ; `controler` refuse l'auto-contrôle (cas réel : un Chef porte aussi `AGENT_TERRAIN`) ; `consolider` **additionne** les indicateurs des sources contrôlées, déduit la période de leurs bornes, concatène les difficultés sans les réécrire, et trace chaque source — aucune pondération, aucun rapprochement avec les paiements enregistrés, qui relèverait d'une règle non validée. Module `relance` : `ServiceRelanceImpl` (périmètre vérifié, date de prochaine action exigée quand le résultat appelle un suivi, campagne fermée refusant de nouvelles relances, critères conservés tels quels en JSONB — une trace, jamais un moteur de ciblage). Module `notification` : dépôt réservé aux services métier, lecture et marquage limités à ses propres notifications (jamais par rôle : un contrôle par rôle laisserait un administrateur lire la boîte d'un autre). **Lacune J4 comblée** : `ServiceRemiseCaisseImpl` notifie désormais le DAF sur écart de caisse, exigence de `02_CLASSES_ET_METHODES.md §4` jusqu'ici signalée par un TODO faute de service de notification. **31 tests backend verts** (13 `ServiceCompteRenduImplTest` + 9 `ServiceRelanceImplTest` + 9 intégration `CompteRenduIntegrationTest` couvrant REC-H04 à REC-H07), suite complète à **168/168**. Frontend : `ListeComptesRendus` (`/comptes-rendus`, onglets par permission : mes comptes rendus / à contrôler / à consolider), `NouveauCompteRendu`, `FicheCompteRendu` (transmission, contrôle, remontée aux sources d'un consolidé), `EcranRelances` (`/relances`, campagnes et relances effectuées), `ClocheNotifications` dans l'en-tête (compteur rafraîchi toutes les 2 min, pas de temps réel — connexion terrain lente). **`TODO [A]` de J6 levé** : le bouton « Créer une campagne de relance » de `/droits`, désactivé faute d'endpoint, est branché sur `POST /campagnes-relance` et enregistre les filtres actifs comme critères. `campagneRelance` ajouté au registre `src/lib/statuts.ts`. **59 tests frontend verts** (13 dédiés J8) |
| J9 — Dashboards par rôle | Terminé | 23/09/2026 | 23/09/2026 | ☑ | ☑ | Backend et frontend livrés dans la même session. **Six dashboards, pas un de plus** : PCA, DG, DGA, DAF, Gestionnaire des comptes, Super Administrateur — ni le Chef des agents de terrain ni l'Agent de terrain n'en ont un (`Roles des acteurs.md §16`). Migration `V11__tableaux_de_bord_j9.sql` : **une permission par dashboard** (`TABLEAU_BORD:PCA`…`:SUPER_ADMIN`), accordée au seul rôle concerné — c'est ce qui rend REC-H08 et REC-H09 vérifiables par un test plutôt que par un contrôle de rôle dispersé. Ajoute la vue matérialisée `vue_synthese_zone` (agrégats par zone), `vue_situation_adherent` (V4) n'étant pas retouchée. `ServiceTableauBordImpl` : indicateur central `tauxActivation = adhérents ayant cotisé / adhérents enregistrés` calculé **sur les vues matérialisées**, jamais par agrégation à la volée (`02_CLASSES_ET_METHODES.md §8`) ; rafraîchissement planifié toutes les 15 min en `REFRESH … CONCURRENTLY` (possible grâce aux index uniques), un échec ne bloque jamais le service ; **la fraîcheur est remontée en avertissement** dès 60 min — un dashboard qui montre des chiffres d'il y a deux heures sans le dire fait décider sur du passé. Le dashboard Super Admin ne contient **aucune donnée métier nominative** (vérifié par test) et remonte en alerte le nombre de règles encore `[V]`. Objectifs terrain : liste vide assumée, le besoin est `[A]` non confirmé. Compteur des rapports DAF laissé à 0 : la table `rapport_daf` arrive en J10. **11 tests d'intégration backend verts** (`TableauBordIntegrationTest`), dont la **matrice RBAC complète** — pour chacun des six dashboards, le rôle propriétaire obtient 200 et les cinq autres 403, plus l'Agent et le Chef refusés partout. Suite complète à **179/179**. Frontend : `CadreTableauBord` (gabarit commun), les six écrans, `AccueilSelonRole` (`/` redirige selon les **permissions**, jamais le rôle), `GraphiqueZones` (premier graphique du projet : barres horizontales Recharts, **une seule série et une seule teinte** `--cositi-vert` validée par `validate_palette.js`, une seule mesure à la fois — jamais deux échelles —, tableau des chiffres exacts accessible d'un bouton), `CarteIndicateur` (une valeur seule n'est pas un graphique), `ListeAlertes` (icône + libellé écrit, la couleur ne porte jamais l'information seule). Le serveur renvoie des ratios (0,3314) et l'unité de mise en forme, jamais une chaîne déjà formatée. **72 tests frontend verts** (13 dédiés J9). Un bug réel corrigé : `AccueilSelonRole` décidait de la redirection **avant** le chargement du profil — permissions vides, donc tout le monde renvoyé sur l'écran de repli quel que soit son rôle ; l'état `initialisation` est désormais attendu |
| J10 — Rapports, exports, audit | Terminé | 23/09/2026 | 23/09/2026 | ☑ | ☑ | Backend et frontend livrés dans la même session. Migration `V12__rapports_daf_exports_j10.sql` : table `rapport_daf` (seule manquante — le journal d'audit existe depuis V1 et sa lecture depuis J1), permissions `RAPPORT_DAF:*` et `EXPORT:*`, paramètre `EXPORT_SEUIL_LIGNES`. **Contrat `[A]` implémenté, à faire valider** : un rapport est un **instantané figé** — les chiffres sont constatés par le serveur à la production puis ne sont plus recalculés, pour qu'un rapport transmis dise la même chose dans six mois ; le contenu détaillé est un JSONB, la période et les totaux restent en colonnes pour le filtrage. `ServiceRapportDafImpl` : `produire` n'accepte **aucun chiffre du client** (un rapport dont les montants viendraient de l'appelant ne prouverait rien), `transmettreAuPca` notifie le rôle PCA et refuse une seconde transmission, et **un rapport non transmis n'est visible que de son auteur** (403 `RAPPORT_NON_TRANSMIS`) — un brouillon de rapport financier lu comme un rapport officiel serait une confusion coûteuse. `ServiceExportImpl` (CSV) : **périmètre appliqué en SQL et non après lecture** (filtrer après coup ferait transiter des données non autorisées et fausserait le compte de lignes journalisé), journalisation systématique `EXPORT_SENSIBLE` avec type/filtres/nombre de lignes, et **neutralisation des valeurs interprétées comme formules** par un tableur (`=`, `+`, `-`, `@` préfixés — un adhérent peut s'appeler « -Marie », et l'injection CSV est un vecteur connu sur les exports). Le compteur de rapports du dashboard PCA, laissé à 0 en J9, est branché sur la table réelle. **14 tests d'intégration backend verts** (7 `RapportDafIntegrationTest` couvrant REC-H10/H11/H12 + 7 `ExportIntegrationTest`), suite complète à **193/193**. Frontend : `EcranRapportsDaf` (`/rapports` — production sans saisie de chiffre, transmission avec rappel d'irréversibilité, boutons filtrés par permission), `EcranAudit` (`/audit` — **lecture seule sans exception**, aucune action de modification ni de purge même pour un administrateur, et les valeurs avant/après ne sont pas affichées pour ne pas faire du journal une porte dérobée vers le référentiel), bouton d'export CSV sur la liste des adhérents reprenant les filtres actifs. `api/client.ts` étendu au `POST` binaire (un export est une production journalisée, pas une lecture). **79 tests frontend verts** (7 dédiés J10) |
| J11 — Administration + sécurité | Terminé | 23/09/2026 | 23/09/2026 | ☑ | ☑ | Backend et frontend livrés dans la même session. Migration `V13__administration_securite_j11.sql` : permissions `ADMINISTRATION:LIRE` et `PARAMETRE:MODIFIER` (la permission `ADMINISTRATION:GERER` existait depuis V5 **sans être référencée nulle part dans le code** — ce jalon lui donne enfin des endpoints), table `historique_role_utilisateur` (complète l'exigence « historique des changements de responsabilité » de `Roles des acteurs.md §14`, dont V7 ne couvrait que la désignation du Chef), **déclencheur rendant `journal_audit` append-only jusque dans la base** (exigence `04_SECURITE.md §11` : une protection applicative seule céderait à la première requête `psql`), et trois règles de débit paramétrables. `ServiceAdministrationImpl` avec trois garde-fous testés : on ne se désactive pas soi-même et on ne retire pas son propre rôle d'administration (une plateforme inadministrable est un incident, pas une opération réussie) ; **les rôles sont fermés** — un code inconnu est refusé, jamais créé à la volée ; **aucun mot de passe n'est choisi par l'administrateur**, il est généré et révélé une seule fois. Modification de paramètre : motif obligatoire, valeur validée selon le type déclaré (un `DELAI_RETARD_JOURS` à « trente » ferait échouer le calcul de régularité en pleine nuit), audit avant/après. `FiltreLimiteDebit` (`§12`) : **correction d'une erreur de lecture du pack en cours de jalon** — les deux règles sur la connexion sont complémentaires et non équivalentes, « 5 / 15 min / identifiant » est déjà appliquée depuis J1 par le verrouillage de compte, et seule « 20 / 15 min / IP » relève du filtre ; compter 5 par minute et par IP aurait bloqué un bureau COSITI dont les postes partagent une connexion. `application-prod.properties` durci : aucun repli de secret, `include-stacktrace=never`, bannière serveur masquée, Actuator réduit à `health`, `flyway.clean-disabled`. **19 tests backend verts** (12 `AdministrationIntegrationTest` couvrant REC-H14 + 7 `FiltreLimiteDebitTest` en isolation), suite complète à **212/212**. Trois bugs réels corrigés : (1) `ParametreDto` renvoyait `modifieLe`/`modifiePar` en dur à `null` — l'écran n'aurait jamais montré qui a changé une règle ; (2) `Parametre` n'avait pas de getters pour ces champs ; (3) **défaut antérieur, tous endpoints confondus** : une méthode HTTP non exposée (un `DELETE` sur un compte, qui n'existe pas) renvoyait **500 au lieu de 405** — le serveur s'accusait d'une panne là où le client demandait une opération inexistante ; `GestionnaireExceptions` traite désormais `HttpRequestMethodNotSupportedException`. Frontend : `EcranAdministration` (`/administration`, onglets Comptes / Rôles / Paramètres), `DialogueCreerUtilisateur` (mot de passe révélé une fois, aucun champ de saisie), `DialogueModifierParametre` (motif obligatoire, statut de validation rappelé). **85 tests frontend verts** (6 dédiés J11). La limitation de débit est désactivée dans la suite d'intégration par une propriété que seul `ConfigurationTestsIntegration` positionne — aucun fichier d'exécution ne la définit |
| J12 — Recette E2E + pilote | Terminé (recette et CI) — pilote non commencé | 23/09/2026 | 23/09/2026 | ☑ | ☑ | **Playwright installé** après passage complet de la procédure de `05_DEPENDANCES_CHAINE_LOGICIELLE.md §1`, consignée dans `docs/journal-dependances.md` **avant** d'écrire le code : 3 paquets ajoutés, tous Microsoft, licence Apache-2.0, `npm audit` **0 vulnérabilité**. **Chromium seul** est téléchargé (114 Mo) — les trois moteurs auraient pris ~1 Go sur un disque à 97 %, et lancer la recette sur un moteur documenté vaut mieux que sur trois partiellement vérifiés. Quatre fichiers de recette dans `COSITI_FrontEnd/e2e/` couvrant **REC-H01, H04, H05, H08, H09, H10, H11, H12, H13, H14** plus le parcours de doublon d'adhérent, chacun portant ses identifiants `REC-H` en en-tête. Les parcours multi-acteurs (compte rendu Agent→Gestionnaire, rapport DAF→PCA) utilisent **deux contextes de navigateur distincts** : ce qu'ils prouvent, et que les tests backend ne prouvent pas, c'est qu'un objet produit dans une session apparaît bien dans une autre, au bon moment et pour le bon rôle. Le mot de passe des comptes de démonstration vient d'une **variable d'environnement**, jamais du dépôt (`AGENTS.md` règle 8) ; le fichier `e2e/comptes.ts` refuse de démarrer si elle est absente plutôt que de retomber sur une valeur par défaut. Orchestration : `COSITI_Backend/outils/dev/e2e.ps1` (base `cositi_db_e2e` recréée, API sur le port 8083 pour ne pas gêner celle de développement, arrêt propre en `finally`). **CI livrée** (`.github/workflows/ci.yml`) — quatre tâches : backend (Testcontainers, Docker disponible sur l'exécuteur), frontend (types, lint, tests, build), sécurité (`npm audit --audit-level=high`, `npm audit signatures`, `gitleaks` sur **tout l'historique**, `osv-scanner`), et recette E2E sur la pile complète. **Ceci clôt le critère de passage de J0** (« pipeline CI vert »), resté non rempli pendant onze jalons. **Wrapper Maven réparé** : `mvnw`/`mvnw.cmd` régénérés en `distributionType=only-script` — pas de jar binaire versionné, et `./mvnw -v` fonctionne (dette J0 levée). `vite.config.ts` exclut `e2e/**` de Vitest, dont le motif par défaut aurait ramassé les specs Playwright et fait échouer `npm run test` sur un import incompatible. **212 tests backend et 85 tests frontend verts**, build de production vert |
. **Recette exécutée et verte : 18 parcours sur 18**, contre la pile réelle (API Spring Boot + PostgreSQL + navigateur). Elle a mis au jour **sept défauts applicatifs réels**, tous corrigés et couverts par des tests : création d'adhérent impossible faute de référentiels `activites` et `packs` ; double rafraîchissement de session déconnectant l'utilisateur ; liste des adhérents sans nom, zone ni date ; pré-contrôle de doublon répondant 400 depuis toujours ; champ facultatif vide envoyé en chaîne vide ; violation d'intégrité renvoyée en 500 ; « Transmettre à le Gestionnaire ». États finaux : **backend 212/212**, **frontend 86/86**, **E2E 18/18** |
## Décisions [A]/[V] en attente

Liste des points marqués `[A]` ou `[V]` dans les packs techniques qui bloquent ou limitent un jalon, à faire confirmer par la COSITI avant de coder la version définitive.

| Point | Jalon concerné | Statut |
|---|---|---|
| Règle de répartition d'un versement (`REPARTITION_VERSEMENT`) | J4 | `[V]` non validé |
| Délai de bascule en retard (`DELAI_RETARD_JOURS`) | J6 | `[V]` non validé |
| Traitement du reliquat non imputé | J6 | `[V]` non validé |
| Assiette CNPS (`revenu_mensuel_declare`) | J7 | `[V]` non validé — **implémenté sans rien inventer** : `ASSIETTE_CNPS` créé en `V9` au statut `V`, le montant déclaré correspond aux droits réellement imputés sur le mois (donnée constatée), aucun taux ni assiette reconstituée n'est appliqué, et chaque déclaration porte l'avertissement correspondant jusqu'à l'arbitrage de la COSITI |
| Composition d'un dossier CNPS (`PIECES_CNPS_OBLIGATOIRES`) | J7 | `[V]` — les cinq types proviennent du commentaire de `piece_dossier_cnps.type_piece` (V4), mais leur caractère obligatoire relève de la CNPS. Paramétré, jamais figé en code ; avertissement remonté à chaque lecture de dossier |
| Graphe de transitions du dossier CNPS | J7 | **Décision d'implémentation à faire valider.** V4 énumère les six statuts sans documenter aucun chemin entre eux, et `Roles des acteurs.md` non plus. Le graphe retenu (`BROUILLON→INCOMPLET/PRET`, `INCOMPLET→PRET/BROUILLON`, `PRET→TRANSMIS/INCOMPLET`, `TRANSMIS→TRAITE/REJETE`, `REJETE→INCOMPLET`, `TRAITE` terminal) est documenté dans `StatutDossierCnps` : il interdit l'incohérent sans inventer d'étape |
| Analyse antivirus réelle des documents | J7 | **Limite assumée** : `ServiceAnalyseAntivirusLocal` ne reconnaît que la signature de test EICAR et déclare tout le reste sain. La chaîne de traitement est complète et testée (un fichier signalé n'atteint jamais le disque), mais le branchement d'un moteur réel (ClamAV) est une exigence de mise en production — `docs/04_SECURITE.md §5` |
| Rotation de la clé de chiffrement des documents | J7 | Non implémentée en V1 (une seule clé active, `STORAGE_ENCRYPTION_KEY`). Le format de fichier porte déjà son IV par document, ce qui rend une rotation possible sans réécriture, à condition d'ajouter un identifiant de clé — à prévoir avant la mise en production |
| Contrat API — ajout d'un Agent par la DGA | J3 | Implémenté (`POST /agents`, vérifié DGA côté service, audité `AGENT_CREATION_PAR_DGA`) — reste à faire valider formellement par la COSITI |
| Contrat API — désignation / remplacement du Chef | J3 | Implémenté (`POST /agents/{id}/designer-chef` et `/remplacer-chef`) avec une décision d'implémentation documentée dans `V7__historique_designation_chef.sql` et `Conception/SUIVI_EXECUTION.md` (périmètre = la zone de l'agent désigné ; mécanisme réel = `agent.chef_agent_id`, jamais un booléen `est_chef`) — reste à faire valider formellement par la COSITI, en particulier le périmètre « zone » |
| Contrat API — compte rendu terrain, consolidation, transmission à la DGA | J8 | **Implémenté, reste à faire valider formellement par la COSITI.** Endpoints réels : `POST /comptes-rendus` (brouillon), `PUT /{id}`, `POST /{id}/transmettre`, `POST /{id}/controler`, `POST /comptes-rendus/consolider`, `GET /comptes-rendus`. Décisions de structure documentées en en-tête de `V10__comptes_rendus_j8.sql`. Deux points à confirmer en priorité : (1) le destinataire est un **rôle** et non une personne nommée — à valider si la COSITI attend une affectation nominative ; (2) `produire` crée un brouillon que l'agent transmet ensuite, alors que le pack décrivait une création-transmission en un seul temps |
| Rapprochement compte rendu déclaré / paiements enregistrés | J8 | `[V]` — non implémenté. Les indicateurs d'un compte rendu sont **déclarés par l'agent** et ne sont jamais comparés automatiquement aux paiements en base : l'écart est précisément ce que le Gestionnaire examine au contrôle (UC-GC-13). Une comparaison automatique supposerait une règle de tolérance que la COSITI n'a pas définie |
| `POST /relances/{id}/resultat` (pack `§10`) | J8 | **Écart assumé** : le pack décrit la création d'une relance puis l'enregistrement de son résultat en deux appels. Un seul endpoint est livré, qui enregistre le contact et son résultat ensemble — sur le terrain l'agent saisit après le contact, et `relance.resultat` est `NOT NULL` au schéma (V4). Une relance sans résultat n'existe pas |
| Contrat API — production et transmission du rapport DAF au PCA | J5 / J10 | **Implémenté, reste à faire valider formellement par la COSITI.** Endpoints réels : `POST /daf/rapports`, `POST /daf/rapports/{id}/transmettre`, `GET /daf/rapports`, `GET /daf/rapports/{id}`. Décisions documentées en en-tête de `V12__rapports_daf_exports_j10.sql`. Point à confirmer en priorité : le contenu attendu d'un rapport — l'implémentation constate encaissements validés, en attente de contrôle, incohérences, annulations et écarts de caisse sur la période, ce qui est déductible de `Roles des acteurs.md §6` mais n'a pas été validé |
| Export XLSX et génération asynchrone (`§10`) | J10 | **Écarts assumés.** XLSX non produit : il exigerait une dépendance qui n'a pas passé la procédure de `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`. Génération asynchrone et `GET /exports/{id}` non construits : au-delà de `EXPORT_SEUIL_LIGNES` (5 000), l'export est **refusé avec un message** demandant de restreindre les filtres, plutôt que de bloquer une requête HTTP plusieurs minutes. Au volume V1 (172 adhérents), l'export synchrone suffit |
| Objectifs terrain (confirmation du besoin) | J3 / J9 | `[A]` à confirmer — **non implémenté, volontairement**. Le dashboard DGA expose un champ `objectifsTermes` qui reste vide et l'écran l'explique en toutes lettres : rien n'est calculé tant que le besoin n'est pas confirmé. Le champ existe pour que le contrat n'ait pas à changer le jour où il le sera |
| Cadre légal camerounais (loi cybersécurité, conservation des données) | J11 | `[V]` — avis juridique requis |
| Code(s) de permission de l'entrée de navigation « Organisation terrain » — `03_SPECIFICATIONS_API.md §6` ne documente aucune permission par endpoint, contrairement aux adhérents et aux paiements | J3 | Résolu côté implémentation : `ORGANISATION:LIRE`/`GERER`/`AFFECTER_PORTEFEUILLE`/`DESIGNER_CHEF` trouvés dans `COSITI_Backend/.../V5__catalogue_permissions.sql` et utilisés côté frontend. Document `03_SPECIFICATIONS_API.md §6` reste à corriger pour lister ces permissions (écart pack/implémentation à signaler, ne pas corriger unilatéralement le pack) |
| CSP effective de production (`docs/04_SECURITE.md §5`) | J11 | `[A]` à définir avec la configuration du serveur qui servira le build |
| Playwright (parcours E2E connexion, création adhérent avec doublon) | J1–J4, résolu J12 | **Résolu.** Installé au jalon J12 après la procédure de dépendances complète. Recette dans `COSITI_FrontEnd/e2e/`, lancée par `outils/dev/e2e.ps1` en local et par la CI |
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
| Endpoints `confirmer-chef`/`signaler-incoherence` annoncés « déjà documentés en `03_SPECIFICATIONS_API.md §4-5` » par le mandat de session J5 | J5 | **Résolu.** Vérifié inexact en début de lot (`§4-5` ne les documentait pas, aucun code réel). Une session backend dédiée les a livrés **en parallèle** de ce lot frontend ; une fois son code disponible (`ControleurPaiement.confirmerChef`/`signalerIncoherence`, `V8__permissions_j5_j6.sql`), le frontend a été vérifié dessus. Résultat : ce sont bien **deux actions distinctes**, pas une seule — `PAIEMENT:CONFIRMER_CHEF` (`/confirmer-chef`, motif facultatif, réservé `CHEF_AGENT_TERRAIN`, UC-CHEF-10, ne change pas le statut) et `PAIEMENT:SIGNALER_INCOHERENCE` (`/signaler-incoherence`, motif obligatoire, réservé `DAF`, UC-DAF-05, confirmé identique à l'inférence initiale du frontend). `PAIEMENT:VALIDER` (J4, DAF, UC-DAF-04) reste par ailleurs la confirmation financière du DAF, inchangée. Les trois actions cohabitent désormais : « Confirmer » (DAF, `/daf` et `DetailPaiement`), « Confirmer la collecte » (Chef, `DetailPaiement`), « Signaler une incohérence » (DAF, `/daf` et `DetailPaiement`) |
| Permission `DROITS:LIRE` | J2, résolu J6 | **Résolu.** Utilisée depuis J2 par anticipation, confirmée réelle par `V8__permissions_j5_j6.sql` (backend, livré en parallèle du lot J6) : accordée à tous les rôles métier (PCA, DG, DGA, DAF, Gestionnaire des comptes, Chef des agents de terrain, Agent de terrain), jamais à `SUPER_ADMIN` |
| Forme de réponse de `GET /droits/adherents/{id}/periodes` | J6 | **Résolu, avec écart réel constaté.** Vérifiée dans `PeriodeDroitsDto` (backend, livré en parallèle) : `id`, `adherentId`, `dateDebut`, `dateFin`, `joursCouverts`, `montantImpute`, `packId`, `statut` (`COUVERTE`/`PARTIELLE`/`ANNULEE` — `ANNULEE` absente de la version précédente de `src/lib/statuts.ts`, ajoutée dans ce lot), `sourceAffectationId`. Le frontend supposait à tort un champ `paiementId` (renommé `sourceAffectationId`) et ignorait `montantImpute` (désormais affiché) |
| Forme de réponse de `GET /droits/adherents/{id}` (situation) | J6 | **Résolu, écart réel constaté.** `SituationDroitsDto` (backend réel) **n'a pas de champ `pack`**, contrairement à l'exemple illustratif de `03_SPECIFICATIONS_API.md §5`. Le champ « Pack » a été retiré de la carte « Situation de droits » de `FicheAdherent` plutôt que d'afficher une valeur absente de la réponse. `statut` est un `StatutRegularite` réel (`A_JOUR`/`PARTIELLEMENT_A_JOUR`/`EN_RETARD`/`JAMAIS_COTISE`), désormais affiché en `BadgeStatut domaine="regularite"` |
| Forme de réponse de `GET /droits/retardataires` | J6 | **Résolu, écart réel significatif.** `AdherentEnRetardDto` (backend réel, `ServiceRegulariteImpl`) ne renvoie que `adherentId`, `matricule`, `nomComplet`, `couvertJusquAu`, `joursRetard` — **ni pack, ni cumul cotisé, ni agent, ni zone, ni statut de régularité**, pourtant demandés à l'écran par le mandat de session. Colonnes retirées de `EcranDroits` plutôt qu'inventées (`AGENTS.md` règle 2). Le tri par retard décroissant est en outre **fixé côté serveur** (`.sorted(...).reversed()`, aucun paramètre `tri` accepté) : la bascule de tri a été retirée de l'écran, qui envoyait initialement un `tri=joursRetard,desc` sans effet réel |
| Filtre `packId` de `GET /droits/retardataires` (et `packId` de `GET /adherents`, J2) | J6 | `[V]` — confirmé réel côté contrôleur (`CritereRetard.packId`, type UUID), mais aucun endpoint de référentiel des packs n'est documenté pour le résoudre depuis un code lisible (`PACK_700`) ; filtre non exposé à l'écran, même situation que `packId` sur `GET /adherents` en J2 |
| Action « créer une campagne de relance à partir de la sélection » (`/droits`) | J6, résolu J8 | **Résolu.** `POST /campagnes-relance` livré au jalon J8 : le bouton est branché et enregistre les filtres actifs de l'écran comme critères de la campagne. La sélection multi-ligne n'a pas été construite — une campagne porte des critères, pas une liste figée d'adhérents, ce qui correspond au modèle réel (`campagne_relance.critere` JSONB) |
| Recalcul manuel des droits (`POST /droits/adherents/{id}/recalculer`) | J6 | Non construit côté frontend — hors mandat de la session, endpoint réel confirmé (`ControleurDroits.recalculer`, `RecalculerDroitsDto`, motif obligatoire) mais aucune action d'écran ne le déclenche à ce jour |

| Compteurs de limitation de débit en mémoire de l'instance | J11 | **Limite assumée.** Avec plusieurs instances derrière un répartiteur, chacune applique son propre quota et la limite effective est multipliée par leur nombre. Suffisant pour ralentir une force brute sur le déploiement mono-instance de la V1 ; un compteur partagé (Redis) ou une limitation en amont (passerelle, WAF) est à prévoir avant mise à l'échelle |
| Valeurs des limites de débit (`DEBIT_*`) | J11 | `[A]` — propositions techniques issues de `03_SPECIFICATIONS_API.md §12`, à confirmer une fois le trafic réel observé. Paramétrées en base pour être ajustées sans redéploiement |
| `REVOKE UPDATE/DELETE` sur `journal_audit` en production | J11 | **Partiellement fait.** Un déclencheur PostgreSQL rend la table append-only pour tout client, y compris `psql` (vérifié par test). Le `REVOKE` explicite recommandé par `04_SECURITE.md §9` suppose un rôle applicatif distinct du rôle de migration : c'est une tâche d'exploitation, pas une migration Flyway — reste à faire au déploiement |
| MFA (TOTP) pour PCA, DG, DGA, DAF, ADMIN_SYSTEME | J11 | `[A]` — **non implémenté en V1.** Exigé par `04_SECURITE.md §2`. Le schéma porte déjà `utilisateur.mfa_active` et la mention du secret chiffré, mais aucun parcours d'enrôlement ni de vérification n'est construit. À planifier avant la mise en production |

| Recette E2E — exécution locale | J12 | **Verte : 18 parcours sur 18** (`outils/dev/e2e.ps1`, Chromium, pile réelle API + PostgreSQL). Quatre défauts d'orchestration du script corrigés en chemin : (1) `mvn spring-boot:run -Dspring-boot.run.jvmArguments=...` perdait silencieusement les propriétés — **l'API démarrait sur la base de développement** ; remplacé par `java -jar` avec arguments d'application, plus un **garde-fou** vérifiant que le schéma E2E a bien été migré ; (2) `Stop-Process` tuait le lanceur Maven mais pas la JVM fille, laissant le port 8083 occupé — le script refuse de démarrer sur un port pris et libère le port en `finally` ; (3) `npx playwright test` échouait en « could not determine executable to run » ; (4) `npm run test:e2e` en « Unknown command: pm » — l'appel passe par le chemin explicite du binaire dans `node_modules/.bin`. **La recette a trouvé sept défauts applicatifs réels**, détaillés dans les lignes qui suivent, dont deux bloquants : la création d'adhérent était impossible par l'interface, et deux rafraîchissements concurrents déconnectaient l'utilisateur. Aucun n'était visible des tests d'écran, qui simulent l'API |
| Recette E2E — le navigateur parlait à la mauvaise pile | J12 | **Corrigé, et c'était le défaut principal.** `playwright.config.ts` portait `reuseExistingServer: !process.env.CI` : la recette adoptait le serveur Vite déjà ouvert sur 5173, lequel lit `.env.development` et désigne l'API de **développement** (port 8082). Le garde-fou de `outils/dev/e2e.ps1` ne pouvait pas le voir — il vérifie l'API qu'il démarre, pas celle que le navigateur appelle. La recette possède désormais son serveur : port dédié 5174, `--strictPort`, `reuseExistingServer: false`, et `VITE_API_BASE_URL` transmis explicitement par `webServer.env` ; l'origine 5174 est ajoutée aux origines CORS de l'API de recette (local et CI). Un `npm run dev` peut rester ouvert pendant la recette |
| `seConnecter` rendait la main avant la fin de la connexion | J12 | **Corrigé.** L'aide attendait la disparition du bouton « Se connecter » ; or `EcranConnexion` remplace son libellé par « Connexion en cours… » dès la soumission, donc l'attente était satisfaite **pendant que la requête était encore en vol**. La navigation suivante l'annulait et le parcours se poursuivait sur l'écran de connexion. L'aide attend maintenant d'avoir quitté `/connexion` — le résultat, pas le libellé |
| Cookie `Secure` et recette en HTTP | J12 | **Fausse piste, tranchée par la mesure.** Le cookie de rafraîchissement étant `Secure`, j'avais supposé qu'aucun navigateur ne le stockerait sur la pile de recette en HTTP, et introduit une propriété `cositi.securite.cookie-secure` pour l'abaisser localement. **Vérification faite, c'est faux** : les navigateurs traitent `localhost` comme une origine de confiance et acceptent un cookie `Secure` sur HTTP clair (cookie relu et session conservée après navigation, `secure: true`). La propriété a donc été **entièrement retirée** — code, script de recette, profil de production et CI : un interrupteur qui abaisse une protection sans rien résoudre finit par être activé ailleurs qu'en local. `Secure` est de nouveau inconditionnel, avec une note en tête de `ControleurAuthentification` pour qu'on ne refasse pas le raisonnement |
| `e2e/**` et `playwright.config.ts` hors de tout projet TypeScript | J12 | **Corrigé.** `tsconfig.app.json` n'inclut que `src`, `tsconfig.node.json` que `vite.config.ts` : une faute de frappe dans une spec ne se révélait qu'à l'exécution, douze minutes après le lancement de la pile. `tsconfig.e2e.json` les couvre désormais, référencé depuis la racine, donc contrôlé par `npm run build` — et par la CI, qui l'exécute |
| Deux rafraîchissements concurrents déconnectaient l'utilisateur | J12 | **Bug applicatif réel, trouvé par la recette E2E et corrigé.** `ServiceJetonImpl.rafraichir` fait tourner le jeton à chaque usage et traite la représentation d'un jeton déjà consommé comme un vol probable : il révoque **toute la famille**, y compris le jeton fraîchement émis (comportement serveur correct, conforme à la rotation OWASP). Or `AuthProvider` appelait `POST /auth/rafraichir` **en direct**, sans passer par le verrou « un seul appel en vol » que `api/client.ts` possède déjà pour la rotation déclenchée par un 401. Deux appels simultanés — le double montage de `StrictMode` en développement, **ou deux onglets restaurés ensemble en production** — produisaient un 403, la déconnexion de l'utilisateur et une alerte de sécurité infondée dans les journaux. Le démarrage passe désormais par `client.rafraichirSession`. Deux tests de non-régression, dont un qui monte `AuthProvider` sous `StrictMode` et échoue (« expected 2 to be 1 ») sur l'ancien code |
| « Transmettre à le Gestionnaire des comptes » | J12 | **Corrigé.** `FicheCompteRendu` concaténait la préposition à l'affichage : la contraction « au » manquait dans les quatre libellés concernés (bouton, alerte, titre de confirmation, notification). La préposition est maintenant portée par la valeur elle-même (`à la DGA` / `au Gestionnaire des comptes`) |
| Specs E2E écrites sur des libellés supposés | J12 | **Corrigées sur pièces.** Quatre écarts avec les écrans réels : `getByLabel("Nom")` désignait aussi « Prénoms » (correspondance partielle) ; le parcours d'adhésion remplissait « Localisation » alors que la première des trois étapes était encore affichée ; `getByLabel("Zone")` désignait à la fois le filtre de l'écran et le champ de la boîte de dialogue ; les boîtes de confirmation reprennent le verbe de l'action (« Transmettre », « Produire ») et non « Confirmer ». Les interactions de dialogue sont désormais portées par `getByRole("dialog")` |
| Création d'adhérent impossible par l'interface | J2, trouvé et corrigé J12 | **Bug bloquant, trouvé par la recette E2E.** `CreationAdherentDto.activiteId` est un UUID `@NotNull`, mais **aucun endpoint n'exposait le référentiel des activités** : l'écran demandait un « code d'activité » en texte libre (`TODO [V]` assumé depuis J2) que l'API refusait systématiquement — « Format invalide pour le champ activiteId ». **Aucun adhérent n'était donc enregistrable par l'interface**, sur l'écran central du produit. Les tests d'écran ne pouvaient pas le voir : ils simulent l'API, qui acceptait la chaîne envoyée. **Le même défaut existait sur le pack** : `packId` est lui aussi un UUID `@NotNull`, aucun endpoint ne listait les packs, et le formulaire ne comportait même pas de champ — l'API répondait « Le pack est obligatoire ». Deux endpoints de lecture seule livrés, `GET /activites` et `GET /packs`, sur des tables déjà alimentées par la migration `V2` (sept activités, deux packs) ; aucune écriture n'est exposée. Les deux champs sont désormais des sélecteurs avec recherche — exactement ce que le `TODO [V]` de J2 prévoyait. Seuls les packs **actifs** sont proposables, ce que `ServiceAdherentImpl.creer` vérifie déjà côté serveur ; l'API renvoie néanmoins les packs inactifs avec leur drapeau, pour que les adhérents déjà rattachés restent affichables. **Aucune règle métier inventée** : activités, packs et montants viennent de la COSITI |
| Consentement à l'usage des données non recueilli à l'adhésion | J2, constaté J12 | `[V]` — `CreationAdherentDto.consentementDonnees` existe, la colonne `adherent.consentement_donnees_le` aussi, et le service horodate le consentement quand le drapeau est vrai. **Aucun écran ne le demande**, il part donc toujours à `false`. Ni obligatoire côté API ni bloquant, mais c'est une question de protection des données : la formulation du consentement et son caractère obligatoire relèvent de la COSITI, pas d'une case à cocher inventée ici |
| La liste des adhérents n'affichait ni nom, ni zone, ni date d'adhésion | J2, trouvé et corrigé J12 | **Bug visible, trouvé par la capture d'écran d'un échec E2E.** `GET /adherents` renvoie un **résumé** (`AdherentResumeDto` : `nomComplet`, `zoneId`, `statut`…), pas la fiche complète. Le frontend employait un seul type `Adherent` pour les deux et lisait `nom`, `prenoms`, `zoneLibelle` et `dateAdhesion` — absents de la réponse : **trois colonnes sur six affichaient un tiret pour chaque ligne**, et le sélecteur d'adhérent de `NouveauPaiement` n'affichait que le matricule. Corrigé des deux côtés : `zoneLibelle` et `dateAdhesion` ajoutés au résumé (libellés de zone chargés en **une** requête par page, pas une par ligne), type `AdherentResume` distinct côté client, et le simulacre MSW renvoie désormais la vraie forme — tant qu'il renvoyait la fiche entière, aucun test ne pouvait voir le défaut. `zoneLibelle` ajouté aussi à `AdherentDetailDto` : la fiche affichait « — » pour la zone |
| « Agent référent » toujours « Aucun » sur la fiche adhérent | J2/J3, constaté J12 | `[A]` — `AdherentDetailDto` ne porte pas d'agent référent, et l'écran affiche donc « Aucun agent référent » même quand une affectation existe. La donnée vit dans `affectation_portefeuille` et `ServicePortefeuille` sait la lire ; l'exposer sur la fiche demande de trancher ce qu'on montre (agent courant seul, ou historique d'affectation), ce qui relève de la COSITI. **Non corrigé ici** pour ne pas figer ce choix : signalé plutôt qu'inventé |
| Violation de contrainte d'intégrité renvoyée en 500 | J12 | **Corrigé.** Un conflit de données n'est pas une panne : `GestionnaireExceptions` traite désormais `DataIntegrityViolationException` en **409 `CONFLIT_INTEGRITE`**, sans jamais renvoyer le message de la base (il nommerait tables et index). Découvert sur la création du second adhérent sans numéro CNI : le frontend envoyait `""` au lieu d'omettre le champ, et l'index unique partiel sur `numero_cni` traitait la chaîne vide comme une valeur. **La cause première est côté client** et est corrigée : un champ facultatif vide vaut désormais « absent », jamais chaîne vide |
| Le pré-contrôle de doublon n'a jamais fonctionné | J2, trouvé et corrigé J12 | **Corrigé.** Le client postait `{nom, prenoms, telephonePrincipal, numeroCni}` à `POST /adherents/verifier-doublon`, alors que `VerifierDoublonDto` attend `nomComplet` et un `zoneId` **obligatoire** : l'appel répondait `400` à chaque fois, silencieusement, et le bandeau informatif de doublon de l'étape 3 ne s'affichait jamais. La détection restait assurée à la création (409), donc aucun doublon n'est passé — mais l'avertissement préalable, celui qui évite de saisir une fiche pour rien, était perdu. Le simulacre MSW refuse maintenant l'appel sans `zoneId`, comme le vrai serveur |
| REC-H02, H03, H06, H07, H15 non couverts par un parcours E2E | J12 | **Couverts côté serveur** par `OrganisationIntegrationTest` (désignation et remplacement du Chef, historique), `CompteRenduIntegrationTest` (consolidation vers la DGA, périmètre du Chef) et le journal d'audit. Non repris en E2E : ils n'ajouteraient pas de preuve de bout en bout que les tests d'intégration ne donnent pas déjà, et chaque parcours navigateur coûte du temps de CI |
| Multi-navigateur (Firefox, WebKit) | J12 | Non installé : voir `docs/journal-dependances.md` (23/09/2026). À ajouter en CI si la COSITI confirme un besoin au-delà de Chromium |
| Phase pilote | J12 | **Non commencée.** Le jalon couvre la recette et la stabilisation ; le déploiement pilote suppose un environnement, des données réelles et une décision de la COSITI |

| `spotbugs` + `find-sec-bugs` et `dependency-check` en CI | J11 / J12 | **Non branchés.** `04_SECURITE.md §10` les exige, mais les plugins Maven correspondants ne sont pas déclarés dans le `pom.xml` : les ajouter au workflow sans les configurer ferait passer une étape vide pour un contrôle réussi. Le workflow livré exécute `npm audit`, `npm audit signatures`, `gitleaks` et `osv-scanner`, qui couvrent les dépendances et les secrets ; l'analyse statique de sécurité Java reste à ajouter |
| CSP effective de production (`docs/04_SECURITE.md §5`) | J11 | `[A]` toujours ouvert — l'API renvoie `default-src 'none'`, correct pour une API. La CSP du **frontend** dépend du serveur qui servira le build (Nginx, CDN…), non choisi à ce jour |
| JaCoCo et seuil de couverture sur les services critiques | J12 | **Non branché.** `04_SECURITE.md §10` prévoit un blocage sur seuil non atteint pour droits, paiement et RBAC. Le plugin n'est pas déclaré ; les 212 tests backend couvrent ces trois domaines, mais aucun seuil n'est mesuré ni imposé |

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

### J5/J6 — Contrôle DAF et Droits, frontend (22/09/2026)

Session menée en parallèle d'une session backend sur J5/J6. **Découverte en
cours de lot** : le module backend n'existait pas au début du travail
(aucun paquet `cm.cositi.api.daf` ni `cm.cositi.api.droits`, vérifié
directement), donc construit contre le contrat documenté et testé par MSW
— même méthode qu'en J1-J4. La session backend a ensuite livré son propre
lot **pendant** ce travail frontend ; une fois son code apparu dans le
dépôt, il a été lu et le frontend **réaligné dessus** (même démarche de
vérification qu'en J3/J4, appliquée ici en cours de route plutôt qu'en
préalable). Le détail de chaque écart trouvé et corrigé est dans le tableau
des décisions ci-dessus ; résumé du parcours ici.

**Phase 1 — construit contre le contrat inféré (aucun code backend
disponible) :**
- Écart détecté dès le départ : le mandat de session annonçait
  `confirmer-chef`/`signaler-incoherence` comme « déjà documentés en
  `03_SPECIFICATIONS_API.md §4-5` » — vérifié inexact, ni documentés ni
  implémentés à ce stade.
- `src/api/paiements.ts` : ajout de `signalerIncoherencePaiement` (chemin et
  permission `PAIEMENT:SIGNALER_INCOHERENCE` inférés). Écran `EcranDaf`
  (`/daf`, file `A_CONTROLER`, réutilise `usePaiements`) avec actions
  Confirmer (à l'origine réutilisant `PAIEMENT:VALIDER`) et Signaler une
  incohérence. `src/ecrans/cotisations/colonnesPaiement.tsx` (nouveau) :
  colonnes communes extraites de `JournalCotisations` (J4), réutilisées par
  `EcranDaf` — pas de règle de présentation dupliquée.
- `src/api/droits.ts`/`src/hooks/useDroits.ts` (nouveaux), `EcranDroits`
  (`/droits`), complément de `FicheAdherent` (situation + périodes),
  construits contre l'exemple de `03_SPECIFICATIONS_API.md §5` (qui inclut
  un champ `pack` sur la situation) et les besoins d'écran du mandat pour
  `/droits` (matricule, adhérent, pack, couvert jusqu'au, jours de retard,
  cumul, agent, zone, statut).
- Consolidation d'un doublon J2/J6 : `GET /adherents/{id}/situation` (`§3`)
  et `GET /droits/adherents/{id}` (`§5`) documentaient la même forme —
  `obtenirSituationAdherent`/`SituationAdherent`/`useSituationAdherent`
  retirés de `src/api/adherents.ts`/`src/hooks/useAdherents.ts`,
  `FicheAdherent` consomme désormais `src/api/droits.ts` uniquement.

**Phase 2 — code backend réel découvert en cours de lot, frontend
réaligné :**
- `ControleurPaiement.confirmerChef`/`.signalerIncoherence`,
  `ControleurDroits`, `ServiceRegulariteImpl`, `ServiceCalculDroitsImpl`,
  `V8__permissions_j5_j6.sql` apparus dans le dépôt. Lus intégralement avant
  de poursuivre (même exigence qu'en J3/J4 : vérifier le code réel plutôt
  que de rester sur l'inférence).
- **Écart majeur trouvé** : « confirmer » recouvre en réalité **deux actions
  distinctes** — `PAIEMENT:CONFIRMER_CHEF` (`/confirmer-chef`, motif
  facultatif, réservé `CHEF_AGENT_TERRAIN`, UC-CHEF-10, ne change pas le
  statut) et `PAIEMENT:VALIDER` (déjà réel depuis J4, DAF, UC-DAF-04). Le
  frontend avait fusionné les deux sous un seul bouton « Confirmer »
  (`PAIEMENT:VALIDER`) dans `EcranDaf` — corrigé en ajoutant l'action Chef
  manquante (« Confirmer la collecte », `PAIEMENT:CONFIRMER_CHEF`) dans
  `DetailPaiement`, sans toucher au bouton DAF existant. `Paiement` complété
  des champs réels `confirmeParChefId`/`confirmeLe`/`motifIncoherence`.
  `signalerIncoherencePaiement` (chemin, permission) s'est révélé
  **identique** à l'inférence initiale — aucun changement nécessaire au-delà
  de retirer les commentaires `TODO [A]` devenus obsolètes.
- **Écart significatif trouvé côté droits** : `SituationDroitsDto` réel n'a
  pas de champ `pack` (retiré de `FicheAdherent`) ; `AdherentEnRetardDto`
  réel est bien plus sobre que demandé (`adherentId`, `matricule`,
  `nomComplet`, `couvertJusquAu`, `joursRetard` seulement — colonnes pack,
  cumul, agent, zone, statut retirées de `EcranDroits`, non inventées) ; le
  tri par retard décroissant est **fixé côté serveur**
  (`ServiceRegulariteImpl`, aucun paramètre `tri` accepté), la bascule de
  tri côté écran a été retirée ; `PeriodeDroitsDto` réel a `montantImpute`
  (ajouté à l'affichage) et `sourceAffectationId` (pas `paiementId`,
  renommé) ; `StatutPeriode` a une troisième valeur réelle `ANNULEE`,
  ajoutée à `src/lib/statuts.ts` (même traitement que `INCOHERENCE` en J4).
  `DROITS:LIRE`/`DROITS:RECALCULER` confirmés réels par
  `V8__permissions_j5_j6.sql`.
- Jeu de données de test étendu : `JETON_CHEF` (nouveau, rôle
  `CHEF_AGENT_TERRAIN` superposé à `AGENT_TERRAIN`, `PAIEMENT:CONFIRMER_CHEF`)
  ajouté à `test/msw/donnees.ts` et `test/msw/handlers.auth.ts` — aucun
  compte Chef n'existait dans les jeux de test avant ce jalon.
  `DROITS:LIRE` ajouté à tous les comptes de test (reflète l'attribution
  réelle à tous les rôles métier) ; le test de masquage de
  `FicheAdherent.test.tsx` construit désormais un profil ad hoc sans
  `DROITS:LIRE` (aucun compte de test n'en est dépourvu à part
  `SUPER_ADMIN`, non représenté dans ce jeu de données).
- Statut `INCOHERENCE` (paiement) : déjà présent dans `src/lib/statuts.ts`
  depuis J4 avec la teinte danger — vérifié suffisant, aucune extension
  nécessaire.

**Tests** : `EcranDaf.test.tsx` (masquage par permission, garde-fou
anti-auto-validation, signalement d'incohérence), `EcranDroits.test.tsx`
(tri fixe serveur, filtre jours de retard minimum, campagne de relance
désactivée), `FicheAdherent.test.tsx` (nouveau — cet écran n'avait aucun
test depuis J2 ; situation de droits avec statut de régularité et
avertissement `[V]`, périodes de droits, masquage complet),
`DetailPaiement.test.tsx` complété d'un test de confirmation par le Chef,
distincte de Valider. MSW : `handlers.droits.ts` (nouveau, aligné sur les
DTO réels), `handlers.paiements.ts` complété du gestionnaire
`confirmer-chef` et des nouveaux champs `Paiement`.

**35/35 tests frontend verts** au total (25 J1-J4 + 3 EcranDaf + 3
EcranDroits + 3 FicheAdherent + 1 confirmation Chef). `npm run build`,
`npx oxlint`, `npx vitest run` : verts, exécutés après la phase 1 **et**
après la phase 2 (réalignement).

Tests backend **non ré-exécutés par cette session** (mandat frontend,
`mvn test` non lancé sur le module livré par la session backend parallèle)
— jalons J5/J6 marqués **partiels** dans le tableau d'avancement pour cette
raison, malgré un frontend complet et vérifié contre le code backend réel.

Docs mis à jour dans ce même lot : `docs/03_SPECIFICATIONS_ECRANS.md`
(sections J5 « E11 » et J6, cette dernière absente du mandat qui supposait
à tort la section E11 déjà écrite ; les deux réécrites une seconde fois en
phase 2 pour refléter le code réel plutôt que l'inférence initiale).

Écarts assumés faute de temps, consignés en décisions `[A]`/`[V]`
ci-dessus : recalcul manuel des droits non construit, filtre `packId` non
exposé (UUID sans référentiel pour le résoudre), production/transmission du
rapport DAF au PCA non construite, campagne de relance non construite.

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

### J5/J6 — Backend, et comptes de démonstration (22/09/2026)

Session backend dédiée, réalisée en parallèle de la session frontend J5/J6
ci-dessus (dont les notes ont été relues et confirmées exactes une fois ce
code disponible). Trois livrables : comptes de démonstration (demandé
explicitement par l'utilisateur, dérogation documentée), J5 (contrôle DAF),
J6 (droits et régularité).

- **Comptes de démonstration** : `securite/bootstrap/SeedComptesDemonstrationDev`
  (`ApplicationRunner`, `@Profile({"dev","local"})` + vérification explicite
  en code que `prod` n'est jamais actif — double verrou, jamais un seul).
  Idempotent, un compte par rôle (`demo.pca` … `demo.superadmin`, mot de
  passe fixe `Cositi#Demo2026!` ≥ 12 caractères), `doitChangerMotDePasse =
  false`, audité (`UTILISATEUR_CREATION`, auteur `SYSTEME` — `ServiceAudit`/
  `JpaConfig.auditorAware` retombent déjà sur `SYSTEME` hors contexte de
  sécurité, comme pour `CommandeAmorcageSuperAdmin`). `demo.agent` et
  `demo.chef` possèdent une ligne `agent` réelle (le Chef supervise l'Agent
  via `chef_agent_id`), rattachée à une zone existante ou à une zone de
  démonstration créée à la volée. Documenté dans `docs/04_SECURITE.md §2`
  (dérogation explicite) et `CONNEXION.md` (tableau identifiant/mot de
  passe/rôle). **5 tests verts** : `SeedComptesDemonstrationDevTest` (2,
  unitaires — double verrou prod, idempotence) + `SeedComptesDemonstrationDevIntegrationTest`
  (3, contexte Spring réel `@ActiveProfiles("dev")` — 8 comptes créés,
  agent/chef réels et rattachés, deuxième amorçage idempotent).
- **J5 — Contrôle DAF** : documenté `[A]` dans `docs/03_SPECIFICATIONS_API.md
  §4` avant codage (même convention que `designer-chef` en J3), puis codé.
  `ServicePaiementImpl.confirmerParChef` (réservé `CHEF_AGENT_TERRAIN`,
  périmètre vérifié sur l'agent encaisseur via `agent.chef_agent_id`, motif
  facultatif **en paramètre de requête**) et `.signalerIncoherence` (réservé
  `DAF`, motif obligatoire, transition vers `INCOHERENCE`). `valider` bloque
  désormais explicitement un paiement `INCOHERENCE` ; `corriger` résout
  l'incohérence et rouvre le paiement. Migration `V8__permissions_j5_j6.sql`.
  **4 tests d'intégration verts** (`ControleDafIntegrationTest`).
- **J6 — Droits et régularité** : nouveau module `droits` complet (entité,
  service, contrôleur, repository, dto), sur le schéma `periode_droits`
  existant (V3, non modifié). `ServiceCalculDroitsImpl.imputer` appelé
  automatiquement à la fin de `ServicePaiementImpl.valider`, dans la même
  transaction. Principes respectés : périodes persistées, jamais
  recalculées à l'affichage ; imputation partant de la fin de la dernière
  période, jamais de la date du paiement ; arrondi `BigDecimal`/
  `RoundingMode.DOWN` ; reliquat jamais imputé de force (`[V]`
  `TRAITEMENT_SURPAIEMENT`, avertissement journalisé) ; contrôle de
  chevauchement avant insertion ; éligibilité CNPS par
  `pack.seuil_eligibilite_cnps` de l'adhérent, jamais un seuil global ;
  seuil de retard `DELAI_RETARD_JOURS` lu en base, jamais 30 en dur ;
  recalcul réservé `DAF`/`SUPER_ADMIN`, motif obligatoire, audité
  (`DROITS_RECALCUL`) et non destructif (annulation logique puis rejeu).
  **16 tests verts** (10 unitaires + 6 intégration `DroitsIntegrationTest`).
- Migration ajoutée : `V8__permissions_j5_j6.sql` (`PAIEMENT:CONFIRMER_CHEF`,
  `PAIEMENT:SIGNALER_INCOHERENCE`, `DROITS:LIRE`, `DROITS:RECALCULER`) — les
  migrations V1 à V7 n'ont pas été modifiées.
- Deux bugs réels détectés et corrigés en cours de route :
  1. **`ServiceAffectationPaiementImpl.affecter` — INSERT non flushé** :
     `ServiceCalculDroitsImpl.imputer`, appelé juste après dans la même
     transaction, lit `affectation_paiement` par une requête JDBC directe
     (pas via le contexte de persistance Hibernate) — sans `saveAndFlush`
     (au lieu d'un simple `save`), la ligne n'était pas encore visible,
     provoquant `AFFECTATION_INTROUVABLE` (404) au lieu d'imputer les
     droits. Même classe de bug que les corrections J3/J4 déjà documentées
     (ordre de flush Hibernate), qui a cette fois cassé une régression sur
     `CotisationIntegrationTest` (J4) — corrigée avant de considérer le lot
     terminé.
  2. **`POST /paiements/{id}/confirmer-chef` avec un corps optionnel** :
     un appel sans corps ni `Content-Type` explicite renvoyait `500`
     (`HttpMediaTypeNotSupportedException` non gérée) au lieu du `403`/`409`
     attendu, parce que Spring tente de résoudre le convertisseur de corps
     dès qu'un `Content-Type` est présent (RestAssured en envoie un par
     défaut), même avec `@RequestBody(required = false)`. Corrigé en
     passant `motif` en `@RequestParam(required = false)` plutôt qu'en
     corps JSON — cohérent avec le fait que ce motif n'est jamais
     obligatoire (contrairement à `corriger`/`annuler`/`signaler-incoherence`).
- Bug bloquant supplémentaire trouvé et corrigé dans un test (pas dans le
  code applicatif) : deux adhérents créés dans la même zone avec un nom très
  proche (`DroitsIntegrationTest`) déclenchaient la détection de doublon par
  similarité de nom (`pg_trgm`, jalon J2) — `confirmationDoublonIgnore: true`
  ajouté à la fixture de test, comme le ferait un opérateur réel face à un
  faux positif.
- `mvn -o test` (Testcontainers/Docker disponibles) exécuté sur
  l'**intégralité** de la suite, y compris J1-J4 : **88/88 tests verts**
  (63 J1-J4 + 4 J5 + 16 J6 + 5 comptes de démonstration), aucune régression.
- Non fait dans cette session (hors mandat, signalé plutôt qu'improvisé) :
  frontend J5/J6 non retouché (déjà livré par la session frontend parallèle,
  notes conservées ci-dessus) ; rapprochement mobile money (P1, hors
  périmètre J5) ; production/transmission du rapport DAF au PCA (`[A]`,
  J5/J10, non commencée) ; modules J7 et suivants non commencés.

## Correctif COSITI V1 — Droits, hiérarchie, visibilité et workflow (vague 1)

Suite à `Conception/COSITI V1 — CORRECTION DES DROITS, HIÉRARCHIE, VISIBILITÉ
ET WORKFLOW.md`. Complète et corrige la vague 1 amorcée par un agent
d'arrière-plan interrompu (migration `V14`, entités/DTO/repositories
`PreferenceAllocationAdherent`/`RecommandationAllocationPaiement` déjà posés
mais non câblés) — code front+back écrit, **tests non exécutés dans cette
session sur demande explicite** (à rejouer avant de considérer le lot clos).

- **§7-§8 (double compte Sécurité Sociale/Épargne)** : `ServiceAffectationPaiementImpl.affecter`
  ventile désormais chaque paiement validé en deux lignes (composantes `CNPS`
  et `EPARGNE`) selon l'ordre de priorité recommandation structurée > préférence
  du dossier (si son montant de référence égale le montant payé) > répartition
  par défaut (`ValidationAllocation.repartitionParDefaut`, plancher 700 FCFA).
  `ServiceCalculDroitsImpl.imputer` n'est plus appelé que sur la ligne `CNPS` —
  l'Épargne est un compte personnel, sans lien avec les jours de couverture du
  pack. `ServicePaiementImpl.enregistrer` persiste la recommandation de l'agent
  (`RecommandationAllocationPaiement`) et la valide immédiatement (échec rapide).
  `GET /adherents/{id}/comptes` (nouveau) expose les deux soldes constatés.
- **§5 (création vs préinscription)** : `POST /adherents/preinscription`
  (`ADHERENT:PREINSCRIRE`, Agent) crée un adhérent minimal sans pack ni
  adhésion ; `POST /adherents/{id}/finaliser` (`ADHERENT:CREER`, Gestionnaire)
  ouvre le pack et enregistre la préférence d'allocation. `POST /adherents`
  (création complète directe) reste inchangé pour la Gestionnaire.
- **§3 (audit)** : export/impression réservés au Super Administrateur intégrés
  à l'infrastructure d'export existante (`ServiceExport`/`ControleurExport`,
  `POST /exports/audit`, `AUDIT:EXPORTER`) plutôt qu'un endpoint dupliqué —
  aucune bibliothèque PDF n'existe dans `pom.xml` : export CSV, PDF/impression
  laissés au frontend (impression navigateur) ou à une décision de dépendance
  future, signalée plutôt qu'improvisée. Journalisé sous `AUDIT_EXPORT_PDF`
  (dédié), pas `EXPORT_SENSIBLE`.
- **Frontend** : écran `/adherents/preinscription` (Agent), action « Finaliser
  le dossier » + carte comptes sur la fiche adhérent, recommandation
  d'allocation sur le formulaire de paiement (visible si montant > 1000 FCFA),
  carte de répartition Sécurité Sociale/Épargne sur le détail d'un paiement
  validé, bouton d'export CSV réservé à `AUDIT:EXPORTER` sur `/audit`.
- **Non fait dans cette vague** (signalé, pas improvisé) : §9 (visibilité des
  relances spéciales), §11 (reporting hiérarchique unifié — à réconcilier avec
  `compte_rendu`/`rapport_daf`), §12 (notifications email — dépendance non
  choisie), §14 (gestion de profils par le PCA + désactivation gatée par
  mémo Super Admin), §20 points 13-14 (démarrage : déjà couvert par Flyway ;
  base de sauvegarde des actions : non scopée).
- `ServiceAffectationPaiementImplTest.java`/`ServicePaiementImplTest.java`
  corrigés et réécrits (demande explicite utilisateur, hors vague) pour
  refléter la ventilation CNPS/EPARGNE réelle (ancien test assertait encore
  `COOPERATIVE`) ; `ServiceAdherentImplTest.java` corrigé au passage (même
  cause : constructeur non suivi). **116/116 tests unitaires verts**
  (`mvn -o test`, Docker indisponible pour les 103 tests d'intégration —
  échec identique et attendu, sans rapport avec le code corrigé).

## Correctif COSITI V1 — RAPORT_V1.md (vague 1/5)

Nouveau document de spécification (845 lignes), plus détaillé que le
correctif précédent. **Constat clé, vérifié par grep** : ses §10/§11
(« adaptations du frontend existant », « conflits ») décrivent un ancien
prototype (`mockData.ts`, `UserSwitchModal`, code `1111`/`0000`,
`permissions.ts` à 16 drapeaux) qui n'existe pas dans ce dépôt — ignorés
comme instructions littérales, seules les exigences fonctionnelles (§1-9,
§12-14) s'appliquent au code réel (déjà moderne : JWT, permissions serveur,
aucune donnée fictive). Décisions actées avec l'utilisateur : base de
sauvegarde en version légère (pas de seconde base Postgres — instantané
JSON avant/après déjà dans `journal_audit`, effacement de données à
construire en vague 4) ; SSE réel ajouté en vague 2 malgré la mise en garde
du correctif précédent (le document le redemande explicitement).

**Vague 1 — corrections ciblées sur l'existant, terminée et vérifiée**
(`mvn -o clean test` : 116/116 tests unitaires verts, aucune régression ;
mêmes 103 échecs Docker-dépendants qu'avant, sans rapport) :

- **§4.9/§9.9 création/gestion des comptes** : `ADMINISTRATION:GERER`
  (jusqu'ici SUPER_ADMIN seul, contrairement au document) retiré de la
  création/modification/rôles de comptes métier. Nouvelles permissions
  `UTILISATEUR:GERER` (PCA seul) et `UTILISATEUR:DESACTIVER` (PCA +
  SUPER_ADMIN — mémo obligatoire pour le SA différé en vague 2, aucun mémo
  n'existant encore, signalé en commentaire plutôt que simulé). Restriction
  serveur des rôles assignables via cette voie (jamais AGENT_TERRAIN/
  CHEF_AGENT_TERRAIN/SUPER_ADMIN, déjà couverts par
  `ServiceAgentImpl.creerParDga`/`designerChef` ou par l'amorçage) — vérifiée
  côté service, pas seulement filtrée côté frontend (`DialogueCreerUtilisateur.tsx`
  ne filtre le select que par confort). Le SA garde la réinitialisation de
  mot de passe.
- **§6.3/§7.2 changement de pack/allocation après création** : la
  Gestionnaire ne l'applique plus directement (ancien `changerPack` retiré,
  fichiers `ChangerPackDto`/`AdhesionDto` supprimés, inutilisés ailleurs).
  Nouveau cycle proposition (GC, `ADHERENT:PROPOSER_ALLOCATION`) → décision
  (DAF, `ADHERENT:VALIDER_ALLOCATION`, approuver/rejeter avec motif, jamais
  de modification de la proposition — §6.11) sur la nouvelle table
  `demande_changement_allocation` (migration V15). L'approbation applique le
  pack et pose une nouvelle `PreferenceAllocationAdherent`, exactement comme
  `finaliser()` le fait à la création. Endpoints `POST/GET
  /adherents/{id}/allocation-changes` + `POST .../{{cid}}/validate` (noms de
  route repris tels quels du §9.5 du document).
- **§6.2 point 8 reçu provisoire/définitif** : `RecuDto` expose désormais
  `provisoire` (statut ≠ VALIDE/RAPPROCHE) — la règle vit côté serveur, pas
  recalculée par le frontend. Écran `DetailPaiement.tsx` : bouton « Voir le
  reçu » ajouté (route jusqu'ici non consommée par le frontend).
- **§6.4/§7.3 seuil CNPS** : le paramètre `SEUIL_CNPS_PACK_700/1000`
  (posé en V1, jamais vérifié à l'exécution) déclenche désormais une
  notification à la Gestionnaire (`ServiceNotification.notifierRoles`)
  quand le solde validé du compte Sécurité Sociale le franchit, après
  chaque validation de paiement. Une seule alerte par adhérent
  (`adherent.alerte_seuil_cnps_le`, migration V15) — un pack personnalisé
  sans paramètre correspondant ne déclenche aucune alerte inventée.
- **§4.4/§6.5 objectif de recouvrement** : nouveau module
  `ServiceObjectifRecouvrement` (table `objectif_recouvrement`, migration
  V15) — proposition (Gestionnaire ou Chef, `ORGANISATION:PROPOSER_OBJECTIF`)
  puis décision (DGA, `ORGANISATION:DECIDER_OBJECTIF`, approuver/rejeter
  avec motif — arbitrage, §6.11). Une seule proposition par agent et par
  mois. Endpoints `POST/GET /agents/{id}/objectifs` + `POST
  .../{{oid}}/decision`.
- **Non fait dans cette vague** (signalé, pas improvisé) : le mémo
  obligatoire pour la désactivation par le SA (attend le module mémo,
  vague 2) ; pas d'écran frontend pour proposer/décider un changement
  d'allocation ni un objectif de recouvrement (backend complet, frontend à
  construire — hors temps de cette vague, à faire avant de considérer la
  fonctionnalité livrée de bout en bout) ; tests d'intégration Docker non
  rejoués (environnement sans Docker).

## Import des données réelles COSITI (hors vagues, demande explicite)

Source : `Conception/donnees.md` (converti depuis `COSITI_Suivi_Adherents LE
VRAI.xlsx`, transmis par l'utilisateur) — 173 adhérents et 228 paiements
réels de la coopérative, pour disposer de données réelles manipulables en
développement plutôt que du jeu de démonstration synthétique existant.

- **Transformation** (`Conception/scripts_import/parse_donnees.py` puis
  `finalize.py`, conservés comme trace des corrections) : 3 typos de date
  corrigées (`10/06/20236`→`2026`, `148/06/2026`→`18/06/2026`,
  `24/07/2027`→`24/07/2026`, ce dernier de toute façon rejeté par la
  contrainte `date_paiement <= CURRENT_DATE` sinon) ; rapprochement de noms
  entre les deux feuilles source (`MVOMO`→`MVOMO GERMAIN`, seul candidat
  possible) ; une adhérente présente dans les paiements mais absente de la
  feuille Adhérents (`MEGOUANG FOMBA NELLY`) ajoutée avec pour date
  d'inscription celle de son unique paiement ; une ligne à 0 F ignorée
  (case « Inscription plutôt », pas une cotisation) ; montants
  « 9 900 F » → `9900` ; modes de paiement mappés vers l'enum contraint en
  base (`ESPECES`/`ORANGE_MONEY`/`MTN_MOMO`/`VIREMENT`) — **hypothèse
  documentée** : les ~40 lignes « Non précisé » (reprises d'un rapport
  financier antérieur) sont posées à `ESPECES`, à corriger si l'information
  réelle est retrouvée.
- **Champs absents de la source, jamais inventés comme des faits réels** :
  zone (aucune n'existe dans le classeur → zone `HISTORIQUE` créée,
  ville/région = « Non précisé ») ; activité/profession (non capturée →
  code `AUTRE`, déjà seedé en V2, jamais une classification inventée) ;
  pack (la source ne distingue pas de pack par adhérent → `PACK_1000`
  appliqué uniformément, **à corriger pack par pack si la vraie répartition
  est un jour connue**) ; référence Mobile Money (jamais capturée →
  préfixe explicite `HIST-IMPORT-nnnn`, non confondable avec une vraie
  référence opérateur).
- **Implémentation** : `SeedDonneesReellesDev`
  (`cm.cositi.api.adherent.bootstrap`), même famille que
  `SeedComptesDemonstrationDev` — `@Profile({"dev","local"})` + vérification
  explicite du profil actif, idempotent (l'existence de la zone
  `HISTORIQUE` sert de marqueur — `Parametre` n'a volontairement aucun
  constructeur public, AGENTS.md règle n°1, donc pas de ligne dédiée pour un
  marqueur). Lit `dev-seed/adherents_reels.csv` et `paiements_reels.csv`
  (classpath). Chaque adhérent et paiement est audité
  (`ADHERENT_CREATION`/`PAIEMENT_CREATION`, motif « Import historique »).
  **Paiements importés en statut `A_CONTROLER`** (jamais `VALIDE`
  directement, comme toute saisie) : un compte DAF peut les valider depuis
  l'application réelle, ce qui exerce le workflow financier sur des
  données réelles plutôt que sur le jeu de démonstration.
- **Vérifié réellement** : instance de développement démarrée sur un port
  temporaire (8091, pour ne pas interférer avec l'instance de l'utilisateur
  sur 8082) contre la vraie base Postgres locale, puis arrêtée après
  contrôle. Résultat en base : 173 adhérents, 228 paiements, total exact
  **1 305 700 F** — identique au total du classeur source
  (« Total des cotisations perçues »). Répartition par mode : 164 Espèces
  (1 000 300 F), 59 Orange Money (280 400 F), 5 MTN MoMo (25 000 F).

## Module Gestionnaire des comptes — Dossiers CNPS / PVID / Risques professionnels (vague 1/4)

Trois documents dans `Conception/Gestionaires de comptes/` :
`FONCTIONALITE_GestComtes_V1.md` et `V2.md` (mockups détaillés — Alertes &
Relances, Immatriculations, Prestations familiales/PVID/RP structurées en
rubriques × offres avec délais/pièces par offre) et
`FONCTIONALITE_GestComtes_V2_BACK_FRONT.md` (checklist technique, très
stricte sur « ne jamais inventer un endpoint »). Deux agents d'exploration
ont d'abord audité le code réel (backend + frontend) : le module CNPS
existant (`DossierCnps`, jalon J7) modélise **uniquement l'immatriculation**
(un dossier par adhérent, contrainte `UNIQUE`) — aucune notion de
rubrique/offre, et rien pour une demande de prestation (potentiellement
plusieurs par adhérent dans le temps). C'est le cœur structurel manquant de
toute la V2, construit dans cette vague.

**Décisions de conception** (le contrat n'existait pas encore pour ces
points — contenu repris des documents, pas inventé) :

- Nouvelle entité `DossierPrestationCnps`, **distincte** de `DossierCnps` :
  fusionner aurait cassé la contrainte `adherent_id UNIQUE` et le cycle de
  vie d'immatriculation déjà testé.
- Catalogue référentiel `offre_cnps` (rubrique PF/RP/PVID, code, libellé,
  délai affiché, badge métier) + `piece_offre_cnps` (pièces obligatoires par
  offre), seedés avec le contenu exact des **12 offres** décrites dans
  `V1.md` §16-19 et `V2.md` §12-15/§36-39 (4 PF + 4 PVID + 4 RP) — lecture
  seule côté application, comme `activite`/`pack` (référentiel géré par
  migration, jamais par une route de création).
- **Journal d'activité du dossier = vue scopée, jamais `AUDIT:CONSULTER`** :
  donner l'accès audit global à la Gestionnaire romprait la visibilité
  hiérarchique verrouillée à la vague précédente (PCA/SUPER_ADMIN seuls).
  Nouvel endpoint dédié `GET .../journal`, gated `CNPS:LIRE` + périmètre du
  dossier — réplique exactement le pattern déjà en place pour
  `HistoriqueDossierCnps` (dont le Javadoc dit explicitement pourquoi il
  existe), plutôt qu'une requête scopée sur `journal_audit` comme envisagé
  initialement dans le plan.
- `Relance` (module recouvrement terrain existant) **non réutilisé** :
  suivi de relance porté par `DossierPrestationCnps.prochaineRelanceLe` +
  `observations`, forme trop différente pour une extension sûre.
- Statuts `INCOMPLET → COMPLET → TRANSMIS_CNPS → TRAITE`, avec
  `TRANSMIS_CNPS → REJETE → INCOMPLET` — repris des captures (« Incomplet »,
  « Transmis CNPS ») et alignés sur le cycle déjà en place pour
  `StatutDossierCnps`, décision technique documentée dans l'enum, pas une
  règle CNPS validée (même réserve que pour l'immatriculation).

**Réalisé** : migration `V16__dossiers_prestation_cnps.sql` (5 tables,
seed des 12 offres et de leurs pièces) ; module `cm.cositi.api.cnps`
étendu — 6 entités, 5 repositories, 11 DTOs, `TypeOperation.CNPS_OBSERVATIONS_MODIFICATION` ;
`ServiceDossierPrestationCnpsImpl` (ouvrir avec pièces auto-créées depuis le
référentiel de l'offre, lister/filtrer par rubrique/offre/statut/recherche
matricule-adhérent-n°CNPS via `JdbcTemplate` — pas de relation JPA
inter-module, `docs/02_CLASSES_ET_METHODES.md §1` —, ajouter une pièce,
changer de statut avec refus si pièces obligatoires manquantes pour
COMPLET et motif obligatoire pour REJETE, modifier observations/relance,
pièces manquantes, journal scopé) ; `ControleurCnps` étendu de 9 endpoints
(`GET /offres`, CRUD/lecture de `/dossiers-prestation`, pièces, statut,
observations, pièces-manquantes, journal), mêmes permissions existantes
`CNPS:LIRE`/`CNPS:GERER`/`CNPS:CHANGER_STATUT` et `ServicePerimetreDonnees`
réutilisé tel quel. Module Documents (upload chiffré) réutilisé sans
modification.

**Vérifié réellement** : `mvn -o clean test` — **126 tests unitaires
verts, 0 régression** (mêmes 103 échecs Docker-dépendants qu'avant, sans
rapport, confirmés spécifiques à `ConfigurationTestsIntegration`/
Testcontainers et non à ce lot). 10 nouveaux tests
`ServiceDossierPrestationCnpsImplTest` (ouverture avec pièces du
référentiel, refus d'ouverture sur offre introuvable/inactive, blocage du
passage à COMPLET tant qu'une pièce obligatoire manque, autorisation une
fois toutes fournies, transition hors graphe refusée, motif de rejet
obligatoire, ajout de pièce refusé sur dossier figé ou hors référentiel,
distinction ATTENDUE/REJETEE, journal scopé). Instance de développement
démarrée sur le port temporaire 8091 (jamais le port 8082 de
l'utilisateur) contre la vraie base Postgres locale : catalogue des 12
offres, création de dossier avec pièces auto-générées, filtrage par
rubrique, recherche par matricule, refus 409 à la transition COMPLET avec
pièce manquante, journal du dossier — tous vérifiés, dossier de test
supprimé et instance arrêtée après contrôle.

**Signalé, pas corrigé (hors périmètre de cette vague)** : bug
préexistant de double encodage UTF-8 sur les caractères accentués
(« é » stocké/servi en « Ã© »), observé aussi bien sur les anciennes
données de démonstration V2 que sur les nouvelles données V16 — donc
systémique et antérieur à ce lot, pas introduit par lui.

**Non fait dans cette vague** (reste des 4 vagues du module Gestionnaire
des comptes) : Alertes & Relances (centre catégorisé, agrégation
adhérents en retard + seuil CNPS + dossiers incomplets), écran
Immatriculations dédié, dashboard CNPS par rubrique/offre (4 cartes),
composants génériques réutilisés PF/RP/PVID, recherche/filtres frontend,
détail de dossier, bouton Export CNPS câblé côté écrans CNPS ; tests
d'intégration RBAC dédiés à ce nouveau module (403/périmètre/audit) ;
aucun écran frontend pour ce nouveau backend — volontairement, en attente
des vagues suivantes du même plan.

## Module Gestionnaire des comptes — Frontend (Alertes, Immatriculations, Dossiers CNPS) + hygiène de cache

Suite directe de la vague précédente (backend seul) : construction du
frontend des 3 écrans manquants, sur la base de 21 captures de l'ancienne
plateforme (`COSITI_FrontEnd/COSITI/Gestionaire des comptes/**`, référence
**fonctionnelle uniquement** — jamais le style ni la barre latérale de
cette ancienne version) et des 3 documents `FONCTIONALITE_GestComtes_*`.
Un audit UI/UX transverse (`docs/02_DESIGN_SYSTEM.md`) et un système de
nettoyage de cache ont été ajoutés à la demande explicite de l'utilisateur,
en cours de vague.

**Vague 0 — corrections de conformité au design system (existant, 6
écarts trouvés par audit, tous corrigés)** : couleurs Recharts recopiées en
HEX au lieu d'être lues depuis les jetons (`graphique-zones.tsx` — a aussi
révélé un vrai écart de teinte, la bordure recopiée avait dérivé d'un
caractère par rapport à `--cositi-bordure`) ; badge « Verrouillé » construit
à la main plutôt que via `BadgeStatut` (nouveau domaine `compte` ajouté à
`lib/statuts.ts`) ; plusieurs boutons `default` visibles simultanément sur
trois écrans (`FicheDossierCnps.tsx`, `EcranDaf.tsx`,
`ListeComptesRendus.tsx`) ; une date formatée par `.toISOString().slice()`
au lieu de `formaterDateSaisie` (fuseau UTC au lieu de Douala,
`EcranRapportsDaf.tsx`) ; construction manuelle du mois courant dupliquée
dans deux fichiers (consolidée en un seul `moisCourant()` dans
`lib/format.ts`) ; états vide/chargement/erreur manquants sur plusieurs
onglets de `EcranAdministration.tsx` et la carte Zones de
`EcranOrganisation.tsx`.

**Extensions backend minimales (additives, requises pour ne jamais
afficher une donnée fabriquée côté écran)** :
- Nouveau `GET /cnps/immatriculations` (`ServiceDossierCnps
  .situationsImmatriculation`, `SituationImmatriculationCnpsDto`) :
  reprend exactement le calcul de `eligiblesNonImmatricules` (cumul imputé
  vs seuil du pack de l'adhérent) sans le filtre d'exclusion des
  adhérents déjà immatriculés, avec profession/téléphone (jointure
  `activite`) et numéro/date d'immatriculation. Sert les 3 onglets de
  l'écran Immatriculations à partir d'un seul appel.
- `DossierPrestationCnpsDto` enrichi de `adherentMatricule`,
  `adherentNomComplet`, `numeroCnps` — chargés via une requête par
  adhérent (`chargerIdentite`/`chargerIdentites`, une requête à un seul
  paramètre fixe par adhérent plutôt qu'une clause `IN` à arité variable :
  plus simple à isoler en test unitaire, coût négligeable vu le
  plafond de pagination à 200 lignes).
- **Deux bugs réels trouvés en vérifiant en direct contre la base de
  développement, corrigés avant livraison** : (1) `chargerIdentite`
  concaténait `nom + " " + prenoms` sans garde contre un `prenoms` nul
  (fréquent sur les 173 adhérents importés de l'historique), produisant
  visiblement le mot « null » dans l'interface — corrigé en réutilisant
  la même règle que `ServiceDossierCnpsImpl.nomComplet` ; (2) confirmé au
  passage, sans le corriger (hors périmètre) : la chaîne de calcul des
  droits n'impute aucune période (`periode_droits` vide) même pour des
  paiements validés pendant cette vérification — signalé, pas investigué
  plus loin ici.
- 2 tests unitaires ajoutés (`ServiceDossierCnpsImplTest`, couvrant les
  deux populations et le filtre de périmètre). Suite complète à **128
  tests unitaires verts** (mêmes ~103 échecs Docker-dépendants qu'avant,
  sans rapport).

**Décisions de conception actées** :
- **« Vérification cycle 15/30 » — hypothèse `[A]`, à valider par la
  COSITI** : aucun champ backend ne trace la date du contrôle bimensuel
  réel. Cet onglet (présent sur les écrans Immatriculations et Alertes)
  affiche l'ensemble des adhérents suivis par le mécanisme de seuil CNPS,
  immatriculés ou non — pas une date fabriquée.
- Filtre « Certificat de scolarité » visible sur les captures : **non
  construit**, `CritereRechercheDossierPrestation` ne porte aucune colonne
  pour ça (le Javadoc du DTO le dit explicitement) — ni actif, ni faux
  contrôle désactivé.
- Journal d'activité du dossier : affiche fidèlement les transitions de
  statut fournies par `GET /cnps/dossiers-prestation/{id}/journal» — pas
  de types d'événements libres (« réception de pièce »...) que le backend
  n'enregistre pas.
- Bandeau « Conseil de Surveillance / lecture seule » des captures : **non
  reproduit** — ce rôle, remplacé par le Super Administrateur, est hors
  périmètre du Gestionnaire des comptes (V2 §1/§4).
- **Détail de dossier construit en page (`/dossiers-cnps/:id`), pas en
  modale contrairement aux captures** : une modale y aurait nécessité
  d'en ouvrir une seconde pour ajouter une pièce
  (`DialogueTeleverserDocument`), interdit explicitement par
  `docs/02_DESIGN_SYSTEM.md §9.2` (« fenêtre modale à l'intérieur d'une
  fenêtre modale »). Mêmes conventions que `FicheDossierCnps.tsx`
  existant.
- **Export CSV non câblé sur les nouveaux écrans Dossiers CNPS et
  Immatriculations** : `POST /exports/cnps` n'exporte que la table
  `dossier_cnps` (immatriculation), pas `dossier_prestation_cnps` ni la
  vue unifiée du nouvel endpoint — câbler le bouton y aurait exporté des
  données différentes de ce que l'écran affiche. Câblé uniquement sur
  `ListeDossiersCnps.tsx` (écran d'immatriculation existant, dont les
  données correspondent exactement à cet export), qui n'avait jusqu'ici
  aucun bouton.

**Nettoyage de cache (demande explicite)** : `deconnecter()`
(`ContexteAuth.tsx`) appelle désormais `clientRequetes.clear()` — purge
tout le cache TanStack Query en mémoire, pour qu'aucune donnée d'un
compte ne survive à la session suivante sur un poste partagé. Pour le
retour sur `/administration`, aucune invalidation manuelle n'a été
ajoutée : les requêtes de ce domaine n'ont pas de `staleTime` (défaut 0),
donc TanStack Query les rejoue déjà à chaque montage de l'écran — un
`invalidateQueries` explicite testé en premier lieu s'est révélé
**redondant et généreait une régression** (double appel en vol contre un
gestionnaire MSW à usage unique dans les tests), retiré.

**Écrans livrés** :
- `/dossiers-cnps` (`EcranDossiersCnps.tsx`) — 4 cartes KPI (PF/RP/PVID/
  Tous, totaux agrégés côté client à partir des `nombreDossiers` déjà
  comptés par offre côté serveur), tuiles d'offres par rubrique,
  détail d'offre, recherche/filtres serveur, tableau de dossiers.
  Composants réutilisés (un seul jeu, pas de duplication par rubrique) :
  `CarteRubriqueCnps`, `TuileOffreCnps`/`TuileToutesLesOffres`,
  `DetailOffreCnps`.
- `/dossiers-cnps/:id` (`FicheDossierPrestationCnps.tsx`) — identité,
  transitions de statut (une seule action `default` à la fois),
  checklist de pièces interactive (`ListePiecesDossierPrestation`, ajout
  via `DialogueTeleverserDocument` existant), dates, observations,
  journal d'activité (`JournalActiviteDossier`).
- `/immatriculations` (`EcranImmatriculations.tsx`) — bandeau règle
  métier, 3 onglets dérivés d'un seul appel réel, recherche, action
  « Éligible CNPS » (ouvre un dossier d'immatriculation,
  `useOuvrirDossierCnps` déjà existant) ou « Dossier Allocations »
  (navigue vers `/dossiers-cnps` filtré par matricule).
- `/alertes` (`EcranAlertes.tsx`) — 5 onglets composés de 3 requêtes
  réelles (`GET /droits/retardataires`, `GET /cnps/immatriculations`,
  `GET /cnps/dossiers-prestation?statut=INCOMPLET`) — jamais un
  `GET /alertes` unique inventé. Aucune pastille de priorité
  ATTENTION/URGENT : aucun DTO ne la fournit, pas inventée côté client.
- 3 entrées ajoutées à la barre latérale existante (`navigation-laterale
  .tsx`), gated `CNPS:LIRE` — la barre elle-même non retouchée
  structurellement, conformément à la demande.

**Vérifié réellement** : `mvn -o clean test` (backend, 128/128 unitaires,
0 régression) ; `npx tsc -b`, `npm run build`, `npm run test` (frontend,
**102/102 tests verts**, dont 8 nouveaux — 4 fichiers de smoke test un par
écran + 1 test dédié au nettoyage de cache à la déconnexion) ; instance de
développement sur le port temporaire 8091 (jamais 8082) contre la vraie
base Postgres locale : `GET /cnps/immatriculations` vérifié dans ses deux
branches (adhérent éligible non immatriculé, adhérent déjà immatriculé
avec numéro et date) via des données de test insérées puis nettoyées
(paiements réels temporairement validés puis remis à `A_CONTROLER`,
lignes `periode_droits`/`dossier_cnps`/`dossier_prestation_cnps` de test
supprimées après contrôle) ; enrichissement de
`GET /cnps/dossiers-prestation` vérifié de bout en bout, bug d'affichage
« null » trouvé et corrigé au passage.

**Non fait dans cette vague** (signalé, pas improvisé) : pas de
vérification manuelle dans un navigateur réel (aucun outil
d'automatisation de navigateur disponible dans cette session) — la
vérification s'appuie sur la compilation TypeScript stricte, la
construction de production et la suite de tests de rendu (React Testing
Library + MSW, y compris les nouveaux écrans) ; tests d'intégration
backend RBAC dédiés au nouvel endpoint `/cnps/immatriculations` (401/403)
non ajoutés, seuls des tests unitaires de service existent pour ce lot ;
la cause racine du défaut d'imputation des droits constaté en vérifiant
(§ ci-dessus) n'a pas été creusée, hors périmètre de cette vague frontend.
