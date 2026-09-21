# PLAN DÉTAILLÉ DE DÉVELOPPEMENT PAR SPRINT — PROJET COSITI COOP-CA (V1)

**Version** : 1.0.0 — 19/09/2026  
**Référence transverse** : Aligné sur `CLAUDE.md`, `COSITI_API_docs/` (Spring Boot 3.3 / PostgreSQL 16) et `COSITI_WEB_docs/` (React 19 / TypeScript / Vite).  
**Champ d'application** : Cadrage opérationnel exhaustif des 13 sprints de réalisation (**S00 à S12**).

---

## TABLE DES MATIÈRES

1. [Principes Directeurs & Règles d'Or Inviolables](#1-principes-directeurs--règles-dor-inviolables)
2. [Matrice Synthétique des Sprints (S00 à S12)](#2-matrice-synthétique-des-sprints-s00-à-s12)
3. [Détail Exhaustif par Sprint](#3-détail-exhaustif-par-sprint)
   - [Sprint S00 — Cadrage, Socle Technique & Architecture](#sprint-s00--cadrage-socle-technique--architecture)
   - [Sprint S01 — Authentification, Sessions JWT & RBAC](#sprint-s01--authentification-sessions-jwt--rbac)
   - [Sprint S02 — Référentiel Adhérents & Détection de Doublons](#sprint-s02--référentiel-adhérents--détection-de-doublons)
   - [Sprint S03 — Organisation Terrain, Zones, Agents & Portefeuilles](#sprint-s03--organisation-terrain-zones-agents--portefeuilles)
   - [Sprint S04 — Enregistrement des Collectes & Données de Paiement](#sprint-s04--enregistrement-des-collectes--données-de-paiement)
   - [Sprint S05 — Circuit de Validation Hiérarchique & Contrôle DAF](#sprint-s05--circuit-de-validation-hiérarchique--contrôle-daf)
   - [Sprint S06 — Moteur de Droits Sociaux & Suivi de Régularité](#sprint-s06--moteur-de-droits-sociaux--suivi-de-régularité)
   - [Sprint S07 — Pôle CNPS, Dossiers & Déclarations Mensuelles](#sprint-s07--pôle-cnps-dossiers--déclarations-mensuelles)
   - [Sprint S08 — Recouvrement, Relances Multicanales & Notifications](#sprint-s08--recouvrement-relances-multicanales--notifications)
   - [Sprint S09 — Tableaux de Bord & Pilotage par Profil de Rôle](#sprint-s09--tableaux-de-bord--pilotage-par-profil-de-rôle)
   - [Sprint S10 — Reporting Avancé, Exports & Audit Immuable](#sprint-s10--reporting-avancé-exports--audit-immuable)
   - [Sprint S11 — Administration Système, Paramètres Dynamiques & Durcissement](#sprint-s11--administration-système-paramètres-dynamiques--durcissement)
   - [Sprint S12 — Recette E2E, Reprise Historique & Mise en Production](#sprint-s12--recette-e2e-reprise-historique--mise-en-production)
4. [Critères Transverses de Clôture (Definition of Done)](#4-critères-transverses-de-clôture-definition-of-done)

---

## 1. PRINCIPES DIRECTEURS & RÈGLES D'OR INVIOLABLES

1. **Frontière financière étanche** : COSITI **enregistre et certifie** des données de paiement et d'assurance sociale. La plateforme **ne détient et ne transfère aucun fonds**. Aucun connecteur bancaire ou API Mobile Money (Orange Money, MTN MoMo, Wave) n'effectue de transaction sortante. L'ancien scénario de « versement bancaire DAF » est strictement banni : le contrôle DAF s'exécute sur des flux internes (caisse/coffre-fort).
2. **Modèle de rôles V1 (8 rôles exhaustifs)** :
   - `PCA` : Lecture stratégique globale de l'activité.
   - `DG` : Pilotage général opérationnel.
   - `DGA` : Supervision directe, nomination du Chef des agents de terrain.
   - `DAF` : Contrôle des données de collecte et régularité comptable.
   - `GESTIONNAIRE_COMPTE` : Adhérents, immatriculations et déclarations CNPS.
   - `CHEF_AGENT_TERRAIN` : Agent de terrain doté de prérogatives de supervision d'équipe.
   - `AGENT_TERRAIN` : Enrôlement et collecte de proximité sur son portefeuille.
   - `SUPER_ADMIN` : Paramétrage technique transversal (sans accès métier courant).
   - *Rôles formellement interdits* : `Caissière`, `Téléconseiller`, `Marketing`, `Responsable de zone`, `Responsable CNPS`, `Conseil de surveillance`.
3. **Séparation des responsabilités** : Celui qui enregistre une donnée financière ou administrative ne valide jamais sa propre opération (Agent saisit $\rightarrow$ Chef confirme $\rightarrow$ DAF valide).
4. **Zéro suppression physique** : Tout archivage est logique (`archive = true`, `archive_par`, `archive_le`, `motif_archivage`).
5. **Gestion des règles non tranchées [V]** : Aucune constante codée en dur. Les paramètres métier vivent dans la table `parametre` en base de données. L'API renvoie un avertissement explicite lors de leur consultation.
6. **Zéro calcul de droits côté client** : Le frontend affiche les situations consolidées issues de l'API ; aucune arithmétique financière ou de jours couverts n'est exécutée en TypeScript.

---

## 2. MATRICE SYNTHÉTIQUE DES SPRINTS (S00 À S12)

| Sprint | Intitulé Métier | Tâches Back | Tâches Front | Total Tâches | Livrable Clé |
|---|---|:---:|:---:|:---:|---|
| **S00** | Cadrage, Socle Technique & Architecture | 8 | 6 | **14** | Monorepo structuré, `server/` Spring Boot, Dockerfile, Flyway V1 |
| **S01** | Authentification, Sessions JWT & RBAC | 9 | 7 | **16** | Écran E01, JWT 15 min, rotation refresh token, `/auth/moi` |
| **S02** | Référentiel Adhérents & Détection Doublons | 11 | 9 | **20** | Écrans E03-E04-E05, matricule `COSITI-0000N`, alerte doublon |
| **S03** | Organisation Terrain, Zones & Portefeuilles | 10 | 8 | **18** | Écran E12, affectation portefeuille unitaire/lot, supervision Chef |
| **S04** | Enregistrement Collectes & Paiements | 11 | 8 | **19** | Écrans E06-E07, idempotence, reçus `REC-00000N`, réf Mobile Money |
| **S05** | Circuit Validation Hiérarchique & DAF | 10 | 7 | **17** | Écran E11, validation 3 niveaux (Agent $\rightarrow$ Chef $\rightarrow$ DAF), remises caisse |
| **S06** | Moteur de Droits & Suivi Régularité | 9 | 7 | **16** | Écran E09, `periode_droits` persistées, détection retards, recalcul |
| **S07** | Pôle CNPS, Dossiers & Déclarations | 11 | 8 | **19** | Écran E10, pièces attendues/fournies, déclarations mensuelles |
| **S08** | Recouvrement, Relances & Notifications | 9 | 7 | **16** | Écran E13, campagnes de relance, résultats fermés, centre notifs |
| **S09** | Tableaux de Bord par Rôle | 8 | 8 | **16** | Écran E02 (4 variantes : Direction, DAF, CNPS, Terrain), taux activation |
| **S10** | Reporting Avancé, Exports & Audit | 9 | 7 | **16** | Écrans E15-E17, journal d'audit append-only, exports CSV/XLSX |
| **S11** | Administration, Paramètres & Durcissement | 9 | 6 | **15** | Écran E16, habilitations rôles, table `parametre` [V], OWASP |
| **S12** | Recette E2E, Migration & Production | 8 | 7 | **15** | Reprise 172 adhérents historiques, scénario nominal, déploiement |
| **TOTAL** | **13 Sprints de Réalisation** | **122** | **95** | **217** | **Plateforme COSITI V1 Complète** |

---

## 3. DÉTAIL EXHAUSTIF PAR SPRINT

---

### SPRINT S00 — Cadrage, Socle Technique & Architecture
* **Dépendance** : Aucune.
* **Objectif** : Mettre en place l'environnement d'exécution, la configuration conteneurisée, la base PostgreSQL 16 et l'architecture en couches Spring Boot 3.3 / Java 21 et React 19.
* **Compte des tâches** : Total : **14 tâches** (Backend : **8**, Frontend : **6**).

#### Tâches Backend (8)
1. **B00.1** — Initialisation du projet Maven `server/pom.xml` avec Spring Boot 3.3.3, Java 21 LTS et dépendances strictes (`spring-boot-starter-web`, `security`, `data-jpa`, `validation`, `actuator`, `flyway-core`, `postgresql`, `jjwt`, `springdoc`).
2. **B00.2** — Configuration conteneurisée `Dockerfile` multi-stage build (image de base `eclipse-temurin:21-jre-jammy`) avec utilisateur non-root `cositi`.
3. **B00.3** — Mise en place des fichiers de configuration `application.yml` et `application-dev.yml` avec `hibernate.ddl-auto: validate` obligatoire.
4. **B00.4** — Rédaction et validation du script Flyway initial `V1__socle_securite.sql` (extensions `pgcrypto`, `pg_trgm`, tables `utilisateur`, `role`, `permission`, `parametre`, `journal_audit`).
5. **B00.5** — Création des superclasses d'entités `@MappedSuperclass` : `EntiteAuditable` (ID UUID, created/modified metadata, @Version) et `EntiteArchivable` (`@SQLRestriction("archive = false")`).
6. **B00.6** — Implémentation du gestionnaire centralisé d'exceptions `GestionnaireExceptions` (`@RestControllerAdvice`) avec format de réponse `ReponseErreur` normalisé, `traceId` et messages métier sans fuite de stacktrace.
7. **B00.7** — Configuration de la documentation OpenAPI 3 Springdoc (`/api/v1/openapi`, `/swagger-ui.html`) avec schéma de sécurité JWT Bearer.
8. **B00.8** — Écriture des tests de contexte Spring Boot (`CositiApiApplicationTests.java`).

#### Tâches Frontend (6)
1. **F00.1** — Configuration de l'environnement React 19 + TypeScript + Vite dans `client/`.
2. **F00.2** — Mise en place du Design System COSITI (couleurs institutionnelles, typographie Outfit/Inter, composants boutons, cartes, badges de statut, alertes).
3. **F00.3** — Configuration du routeur `react-router-dom` avec layout applicatif principal (Sidebar, Header, zone de contenu).
4. **F00.4** — Mise en place du client HTTP Axios durci avec gestionnaire d'intercepteurs (injection du token Bearer, capture du `X-Trace-Id`).
5. **F00.5** — Création de l'enveloppe de gestion d'erreur globale (`ErrorBoundary`) et écran d'erreur générique.
6. **F00.6** — Configuration des utilitaires de formatage monétaire (XAF sans décimales parasites) et dates ISO.

#### Documentation étape par étape
1. Démarrage de PostgreSQL 16 local ou via conteneur.
2. Exécution des migrations Flyway V1 et vérification de la création des index trigramme.
3. Vérification de la compilation Maven (`./mvnw clean compile`).
4. Lancement de l'application et validation du endpoint Actuator `/actuator/health`.

---

### SPRINT S01 — Authentification, Sessions JWT & RBAC
* **Dépendance** : S00.
* **Objectif** : Sécuriser l'accès à la plateforme via JWT (durée 15 min), rotation du jeton de rafraîchissement, gestion du verrouillage après 5 échecs et contrôle RBAC serveur sur les 8 rôles.
* **Compte des tâches** : Total : **16 tâches** (Backend : **9**, Frontend : **7**).

#### Tâches Backend (9)
1. **B01.1** — Entités `Utilisateur`, `Role`, `Permission` avec mapping JPA complet et implémentation de `UserDetails`.
2. **B01.2** — `UtilisateurRepository`, `RoleRepository`, `PermissionRepository`.
3. **B01.3** — Service cryptographique `ServiceJeton` (génération/validation JWT JJWT HMAC-SHA256, extraction des claims, expiration 15 min).
4. **B01.4** — `ServiceAuthentification` et son implémentation :
   - Signature : `ConnexionReponseDto connecter(ConnexionRequeteDto req)`
   - Signature : `ConnexionReponseDto rafraichir(String refreshToken)`
   - Signature : `UtilisateurMoiDto getUtilisateurConnecte(Utilisateur user)`
   - Signature : `void changerMotDePasse(Utilisateur user, ChangerMotDePasseDto dto)`
5. **B01.5** — `FiltreJwt` (`OncePerRequestFilter`) pour intercepter et valider l'en-tête `Authorization: Bearer <token>`.
6. **B01.6** — `SecurityConfig` configurant la politique `SessionCreationPolicy.STATELESS`, la protection contre le brute-force et les en-têtes HTTP de sécurité (HSTS, CSP, no-cache).
7. **B01.7** — `ControleurAuthentification` exposant les routes REST.
8. **B01.8** — Traçabilité des événements d'accès : enregistrement dans `journal_audit` de `CONNEXION_SUCCES` et `CONNEXION_ECHEC`.
9. **B01.9** — Tests d'authentification : succès (200), identifiant erroné (401), compte verrouillé (403), expiration token (401).

#### Endpoints REST Backend
| Verbe | Chemin | Permission / Rôle | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `POST` | `/auth/connexion` | Public | `ConnexionRequeteDto` | `ConnexionReponseDto` | 200, 401, 403 |
| `POST` | `/auth/rafraichir` | Public | `RafraichirRequeteDto` | `ConnexionReponseDto` | 200, 401, 403 |
| `GET` | `/auth/moi` | Authentifié | — | `UtilisateurMoiDto` | 200, 401 |
| `POST` | `/auth/mot-de-passe/changer` | Authentifié | `ChangerMotDePasseDto` | `Void` | 204, 400, 409 |

#### Tâches Frontend (7)
1. **F01.1** — Écran de connexion **E01** (`/connexion`) : formulaire identifiant, mot de passe, bouton de soumission.
2. **F01.2** — Gestion de l'état d'authentification global (`AuthContext` / Zustand) stockant l'utilisateur courant, ses rôles et permissions.
3. **F01.3** — Mécanisme de rafraîchissement transparent du token JWT via l'intercepteur Axios (sur interception d'une 401).
4. **F01.4** — Composant de route protégée (`ProtectedRoute`) vérifiant l'authentification et redirigeant vers `/connexion`.
5. **F01.5** — Composant d'autorisation granulaire (`HasPermission`) masquant les éléments d'interface selon les permissions reçues de `/auth/moi`.
6. **F01.6** — Modale forcée de changement de mot de passe si `doitChangerMotDePasse: true`.
7. **F01.7** — Affichage des messages d'erreur uniformisés sans distinction entre identifiant et mot de passe (anti-énumération).

#### Documentation étape par étape
1. Création d'un compte administrateur initial via script de seed sécurisé.
2. Appel de `POST /auth/connexion` et récupération de la paire de jetons.
3. Vérification du token sur `GET /auth/moi`.
4. Test de rotation sur `POST /auth/rafraichir`.

---

### SPRINT S02 — Référentiel Adhérents & Détection de Doublons
* **Dépendance** : S01.
* **Objectif** : Gestion complète du cycle de vie des adhérents, attribution atomique du matricule immuable `COSITI-0000N`, détection des doublons avec masquage RGPD des numéros de téléphone.
* **Compte des tâches** : Total : **20 tâches** (Backend : **11**, Frontend : **9**).

#### Tâches Backend (11)
1. **B02.1** — Migration Flyway `V2__organisation_adherents.sql` (séquence `seq_matricule_adherent`, tables `activite`, `association`, `pack`, `adherent`, `ayant_droit`, `adhesion`).
2. **B02.2** — Entités JPA `Adherent`, `Pack`, `Activite`, `Association`, `AyantDroit`, `Adhesion`.
3. **B02.3** — `AdherentRepository` avec requêtes JPQL de recherche multicritère et requête native sur la séquence PostgreSQL.
4. **B02.4** — Service atomique `ServiceMatricule` générant le matricule au format `COSITI-0000N` sans risque de collision en concurrence.
5. **B02.5** — `ServiceDoublonAdherent` implémentant les règles de détection (téléphone identique, CNI identique, similarité trigramme) et masquage du numéro de téléphone (`6•• ••• 937`).
6. **B02.6** — `ServiceAdherent` et son implémentation `ServiceAdherentImpl` (méthodes `creer`, `consulter`, `rechercher`, `archiver`, `changerStatut`, `changerPack`).
7. **B02.7** — `ServicePerimetreDonnees` : vérification que l'agent de terrain n'accède qu'aux adhérents de son portefeuille.
8. **B02.8** — Validation Bean Validation personnalisée : `@TelephoneCamerounais` et validateur regex `^(\+?237)?[6][2-9][0-9]{7}$`.
9. **B02.9** — Journalisation d'audit : `ADHERENT_CREATION`, `ADHERENT_MODIFICATION`, `ADHERENT_ARCHIVAGE`, `ADHERENT_DOUBLON_IGNORE`.
10. **B02.10** — `ControleurAdherent` exposant l'API REST.
11. **B02.11** — Tests d'intégration : création nominale (201), tentative avec doublon bloqué (409), création forcée avec traçabilité, contrôle d'accès hors portefeuille (403).

#### Endpoints REST Backend
| Verbe | Chemin | Permission | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `POST` | `/adherents/verifier-doublon` | `ADHERENT:CREER` | `CritereDoublonDto` | `List<CandidatDoublonDto>` | 200, 400 |
| `POST` | `/adherents` | `ADHERENT:CREER` | `CreationAdherentDto` | `AdherentDetailDto` | 201, 400, 409 |
| `GET` | `/adherents/{id}` | `ADHERENT:LIRE` | — | `AdherentDetailDto` | 200, 403, 404 |
| `GET` | `/adherents` | `ADHERENT:LIRE` | Params: recherche, zoneId, statut, page, taille | `ReponsePaginee<AdherentResumeDto>` | 200, 403 |
| `POST` | `/adherents/{id}/archiver` | `ADHERENT:ARCHIVER` | `MotifActionDto` | `Void` | 204, 400, 403, 404 |
| `POST` | `/adherents/{id}/statut` | `ADHERENT:CHANGER_STATUT` | `ChangementStatutDto` | `Void` | 204, 400, 403 |
| `POST` | `/adherents/{id}/pack` | `ADHERENT:MODIFIER` | `ChangementPackDto` | `Void` | 204, 400, 403 |

#### Tâches Frontend (9)
1. **F02.1** — Écran de liste des adhérents **E03** (`/adherents`) avec pagination serveur, tri et filtres rapides (« Jamais cotisé », Zone, Statut).
2. **F02.2** — Écran d'enrôlement **E04** (`/adherents/nouveau`) sous forme de wizard en 4 étapes (Identité $\rightarrow$ Activité/Localisation $\rightarrow$ Adhésion/Pack $\rightarrow$ Récapitulatif et Consentement).
3. **F02.3** — Panneau non bloquant `AlerteDoublon` déclenché à la sortie des champs téléphone principal et CNI.
4. **F02.4** — Case obligatoire de consentement horodaté au traitement des données personnelles (conformité loi camerounaise 2010/012 et ANTIC).
5. **F02.5** — Écran de fiche détaillée adhérent **E05** (`/adherents/:id`) avec onglets Situation, Cotisations, Droits, CNPS, Documents, Relances, Audit.
6. **F02.6** — Modal de changement de pack de cotisation avec avertissement explicite [V] sur l'absence de rétroactivité des droits acquis.
7. **F02.7** — Modal d'archivage logique avec champ de saisie obligatoire du motif.
8. **F02.8** — Bouton d'impression du reçu d'inscription et fiche d'enrôlement.
9. **F02.9** — Masquage automatique des actions selon les permissions effectives de l'utilisateur connecté.

#### Documentation étape par étape
1. Saisie d'un adhérent avec un numéro de téléphone déjà enregistré $\rightarrow$ Vérification de l'alerte doublon.
2. Soumission sans confirmation $\rightarrow$ Rejet 409 par l'API.
3. Soumission avec case cochée « J'ai vérifié » $\rightarrow$ Création 201, génération du matricule séquentiel et écriture d'audit de contournement.
4. Consultation de la fiche de l'adhérent créé.

---

### SPRINT S03 — Organisation Terrain, Zones, Agents & Portefeuilles
* **Dépendance** : S02.
* **Objectif** : Modéliser le découpage géographique, la hiérarchie des agents, l'affectation dynamique des portefeuilles et les prérogatives du Chef des agents de terrain.
* **Compte des tâches** : Total : **18 tâches** (Backend : **10**, Frontend : **8**).

#### Tâches Backend (10)
1. **B03.1** — Tables et entités JPA `Zone`, `Agent`, `AffectationPortefeuille`.
2. **B03.2** — Contrainte d'intégrité PostgreSQL : index unique partiel garantissant qu'un adhérent ne possède qu'une seule affectation ouverte (`date_fin IS NULL`).
3. **B03.3** — `ZoneRepository`, `AgentRepository`, `AffectationPortefeuilleRepository`.
4. **B03.4** — `ServicePortefeuille` :
   - Signature : `void affecter(UUID adherentId, UUID agentId, String motif, Utilisateur auteur)`
   - Signature : `void transferer(UUID adherentId, UUID nouvelAgentId, String motif, Utilisateur auteur)`
   - Signature : `void transfererEnLot(List<UUID> adherentIds, UUID nouvelAgentId, String motif, Utilisateur auteur)`
   - Signature : `List<AdherentResumeDto> portefeuille(UUID agentId, Utilisateur demandeur)`
   - Signature : `List<AdherentResumeDto> sansAgentReferent(UUID zoneId)`
5. **B03.5** — Logique transactionnelle de transfert : fermeture de l'affectation active précédente (`date_fin = date_debut - 1`), création de la nouvelle et traçabilité `PORTEFEUILLE_TRANSFERT`.
6. **B03.6** — Gestion du rôle `CHEF_AGENT_TERRAIN` : habilitations étendues à la consultation de son équipe sans dédoublement d'entité en base.
7. **B03.7** — Contrat [A] : endpoint préparatoire de désignation du Chef des agents de terrain par le DGA (`POST /agents/{id}/designer-chef`).
8. **B03.8** — `ControleurOrganisation` exposant les zones, agents et portefeuilles.
9. **B03.9** — Journalisation d'audit : `PORTEFEUILLE_AFFECTATION`, `PORTEFEUILLE_TRANSFERT`, `AGENT_DESIGNATION_CHEF`.
10. **B03.10** — Tests unitaires et d'intégration : transfert unitaire, transfert en lot, tentative d'accès au portefeuille d'un collègue par un agent (403).

#### Endpoints REST Backend
| Verbe | Chemin | Permission | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `GET` | `/zones` | `ORGANISATION:LIRE` | — | `List<Zone>` | 200, 403 |
| `POST` | `/zones` | `ORGANISATION:MODIFIER` | `CreationZoneDto` | `Zone` | 201, 400 |
| `GET` | `/agents` | `ORGANISATION:LIRE` | Params: zoneId, actif | `List<AgentDto>` | 200, 403 |
| `GET` | `/agents/{id}/portefeuille` | `ORGANISATION:LIRE` | — | `List<AdherentResumeDto>` | 200, 403, 404 |
| `POST` | `/portefeuilles/affecter` | `ORGANISATION:MODIFIER` | `AffectationDto` | `Void` | 204, 400, 403 |
| `POST` | `/portefeuilles/transferer` | `ORGANISATION:MODIFIER` | `TransfertPortefeuilleDto` | `Void` | 204, 400, 403 |
| `GET` | `/portefeuilles/sans-agent` | `ORGANISATION:LIRE` | Param: zoneId | `List<AdherentResumeDto>` | 200, 403 |

#### Tâches Frontend (8)
1. **F03.1** — Écran d'organisation terrain **E12** (`/organisation`) avec onglets Zones, Agents, Portefeuilles.
2. **F03.2** — Vue cartographique ou tabulaire des zones avec nombre d'adhérents et agents rattachés.
3. **F03.3** — Liste des agents avec indicateurs de performance (taille portefeuille, pourcentage d'actifs, retards).
4. **F03.4** — Composant de transfert de portefeuille individuel avec confirmation et saisie obligatoire du motif.
5. **F03.5** — Composant de transfert en lot d'adhérents d'un agent vers un autre (ex. départ ou réorganisation).
6. **F03.6** — Vue des adhérents « sans agent référent » permettant une affectation rapide.
7. **F03.7** — Interface réservée au DGA pour la désignation du Chef des agents de terrain (balisée avec le marqueur [A]).
8. **F03.8** — Restriction de la vue terrain : un agent ne visualise que les membres de son portefeuille.

#### Documentation étape par étape
1. Création d'une zone (ex. « Yaoundé - Marché Mokolo »).
2. Création d'un agent rattaché à la zone.
3. Affectation d'un adhérent au portefeuille de l'agent.
4. Transfert de l'adhérent vers un autre agent avec motif $\rightarrow$ Vérification de la clôture de l'ancienne affectation et du statut ouvert de la nouvelle.

---

### SPRINT S04 — Enregistrement des Collectes & Données de Paiement
* **Dépendance** : S03.
* **Objectif** : Permettre la saisie des cotisations et adhésions, sans jamais manipuler de flux financiers réels. Attribution du numéro de reçu immuable, contrôle strict de la référence Mobile Money et idempotence.
* **Compte des tâches** : Total : **19 tâches** (Backend : **11**, Frontend : **8**).

#### Tâches Backend (11)
1. **B04.1** — Migration Flyway `V3__cotisations_droits.sql` (séquence `seq_numero_recu`, tables `composante_affectation`, `remise_caisse`, `paiement`, `affectation_paiement`, `periode_droits`).
2. **B04.2** — Entités `Paiement`, `ComposanteAffectation`, `AffectationPaiement`.
3. **B04.3** — Contraintes SQL sur `paiement` : référence obligatoire pour Orange Money / MTN MoMo, montant $> 0$, date $\le$ aujourd'hui et $\ge$ date d'adhésion.
4. **B04.4** — Gestion de l'en-tête `Idempotency-Key` sur la création de paiement via la colonne unique `cle_idempotence`.
5. **B04.5** — `PaiementRepository` et `AffectationPaiementRepository`.
6. **B04.6** — `ServicePaiement` : implémentation de `enregistrer(EnregistrementPaiementDto dto, Utilisateur auteur)`.
7. **B04.7** — Statut initial obligatoire du paiement : `A_CONTROLER` (jamais validé directement à la saisie).
8. **B04.8** — Numérotation séquentielle des reçus de collecte au format `REC-00000N`.
9. **B04.9** — Journalisation d'audit : `PAIEMENT_CREATION`.
10. **B04.10** — `ControleurPaiement` : exposition de `POST /paiements`, `GET /paiements`, `GET /paiements/{id}`.
11. **B04.11** — Tests de robustesse : rejet si référence manquante en Mobile Money (400), soumission répétée avec même clé d'idempotence (200 retournant le même paiement), montant négatif rejeté (400).

#### Endpoints REST Backend
| Verbe | Chemin | Permission | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `POST` | `/paiements` | `PAIEMENT:CREER` | `EnregistrementPaiementDto` (Header: `Idempotency-Key`) | `PaiementDto` | 201, 200, 400, 409 |
| `GET` | `/paiements` | `PAIEMENT:LIRE` | Params: adherentId, statut, du, au, page | `ReponsePaginee<PaiementDto>` | 200, 403 |
| `GET` | `/paiements/{id}` | `PAIEMENT:LIRE` | — | `PaiementDto` | 200, 403, 404 |

#### Tâches Frontend (8)
1. **F04.1** — Écran de saisie d'un nouveau versement **E07** (`/cotisations/nouveau`).
2. **F04.2** — Sélecteur d'adhérent avec recherche dynamique par matricule, nom ou téléphone, affichant la régularité actuelle.
3. **F04.3** — Champ conditionnel dynamique : référence de transaction obligatoire dès sélection d'Orange Money ou MTN MoMo (aucune valeur fictive générée).
4. **F04.4** — Génération d'un UUID unique `Idempotency-Key` lors du montage du formulaire de paiement.
5. **F04.5** — Écran de journal des cotisations **E06** (`/cotisations`) avec colonnes Date, Reçu, Adhérent, Montant, Mode, Réf, Statut.
6. **F04.6** — Mise en évidence visuelle des anomalies de saisie (ex. badge rouge si référence douteuse).
7. **F04.7** — Bouton d'impression du reçu de versement provisoire « En attente de contrôle ».
8. **F04.8** — Avertissement explicite indiquant qu'aucun débit n'est exécuté par la plateforme (collecte déclarative).

#### Documentation étape par étape
1. Sélection d'un adhérent et du mode Orange Money sans référence $\rightarrow$ Blocage côté client et serveur (400).
2. Saisie d'une référence valide et validation $\rightarrow$ Enregistrement en statut `A_CONTROLER`, numéro `REC-000001` attribué.
3. Double clic rapide $\rightarrow$ Le second appel renvoie 200 avec le reçu existant sans créer de doublon en base.

---

### SPRINT S05 — Circuit de Validation Hiérarchique & Contrôle DAF
* **Dépendance** : S04.
* **Objectif** : Implémenter le circuit de validation à 3 niveaux (Agent $\rightarrow$ Chef des agents $\rightarrow$ DAF). Contrôle strict de la séparation des tâches (interdiction d'auto-validation) et module de remise interne de caisse.
* **Compte des tâches** : Total : **17 tâches** (Backend : **10**, Frontend : **7**).

#### Tâches Backend (10)
1. **B05.1** — Entité et repository `RemiseCaisse` (gestion interne coffre-fort/caisse, montant déclaré vs reçu, calcul automatique de l'écart).
2. **B05.2** — `ServicePaiement.valider(UUID paiementId, Utilisateur validateur)` :
   - Vérification stricte : `if (validateur.getId().equals(paiement.getCreePar())) throw new ExceptionAutorisation(...)`
   - Déclenchement de l'affectation comptable via `ServiceAffectationPaiement`.
   - Déclenchement de l'imputation des droits via `ServiceCalculDroits`.
3. **B05.3** — `ServicePaiement.confirmerParChef(UUID paiementId, Utilisateur chef)` (Contrat [A] de supervision).
4. **B05.4** — `ServicePaiement.signalerIncoherence(UUID paiementId, String motif, Utilisateur daf)` sans suppression de donnée.
5. **B05.5** — `ServicePaiement.annuler(UUID paiementId, String motif, Utilisateur auteur)` avec obligation de motif et traçabilité.
6. **B05.6** — `ServiceRemiseCaisse` : méthodes `declarer`, `receptionner` (interdisant à l'agent de réceptionner sa propre caisse).
7. **B05.7** — Contrôle de l'invariant financier : $\sum \text{affectations} = \text{montant du paiement}$.
8. **B05.8** — Journalisation d'audit : `PAIEMENT_VALIDATION`, `PAIEMENT_CONFIRMATION_HIERARCHIQUE`, `PAIEMENT_SIGNALEMENT_INCOHERENCE`, `PAIEMENT_ANNULATION`, `REMISE_CAISSE_DECLARATION`, `REMISE_CAISSE_RECEPTION`.
9. **B05.9** — Contrôleur REST : exposition des endpoints de validation, confirmation, signalement et annulation.
10. **B05.10** — Tests de sécurité : tentative d'auto-validation par le créateur rejetée (403), annulation sans motif rejetée (400), validation avec succès (200).

#### Endpoints REST Backend
| Verbe | Chemin | Permission | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `POST` | `/paiements/{id}/confirmer-chef` | `PAIEMENT:CONFIRMER` | — | `PaiementDto` | 200, 403, 404 |
| `POST` | `/paiements/{id}/valider` | `PAIEMENT:VALIDER` | — | `PaiementDto` | 200, 403, 409 |
| `POST` | `/paiements/{id}/signaler-incoherence`| `PAIEMENT:VALIDER` | `MotifDto` | `Void` | 204, 400, 403 |
| `POST` | `/paiements/{id}/annuler` | `PAIEMENT:ANNULER` | `MotifDto` | `Void` | 204, 400, 403 |
| `POST` | `/remises-caisse` | `REMISE:CREER` | `DeclarationRemiseDto` | `RemiseCaisseDto` | 201, 400, 403 |
| `POST` | `/remises-caisse/{id}/receptionner` | `REMISE:VALIDER` | `ReceptionRemiseDto` | `RemiseCaisseDto` | 200, 403, 409 |

#### Tâches Frontend (7)
1. **F05.1** — Écran de détail d'un versement **E08** (`/cotisations/:id`) affichant l'historique complet, les affectations et le statut hiérarchique.
2. **F05.2** — Bouton « Confirmer la collecte » réservé au Chef des agents de terrain.
3. **F05.3** — Bouton « Valider le paiement » réservé au DAF, automatiquement désactivé/masqué avec infobulle explicative si l'utilisateur connecté est l'auteur de la saisie.
4. **F05.4** — Modal de signalement d'incohérence documentaire ou financière avec saisie obligatoire du motif.
5. **F05.5** — Modal d'annulation motivée rappelant le montant, l'adhérent et avertissant de l'invalidation des droits associés.
6. **F05.6** — Écran de gestion DAF **E11** (`/daf`) pour le suivi des remises de caisse internes.
7. **F05.7** — Interface de pointage des remises de caisse calculant en temps réel l'écart entre montant déclaré et montant physiquement reçu.

#### Documentation étape par étape
1. Saisie d'une collecte par un Agent de terrain (`A_CONTROLER`).
2. Tentative de validation par le même agent $\rightarrow$ Erreur 403 « Auto-validation interdite ».
3. Confirmation par le Chef des agents de terrain.
4. Contrôle et validation par le DAF $\rightarrow$ Passage en `VALIDE`, ventilation comptable et calcul immédiat des droits.

---

### SPRINT S06 — Moteur de Droits Sociaux & Suivi de Régularité
* **Dépendance** : S05.
* **Objectif** : Cœur métier du système. Calculer et persister les périodes de droits sociaux (`periode_droits`), gérer les seuils d'éligibilité CNPS et classifier les adhérents selon leur statut de régularité.
* **Compte des tâches** : Total : **16 tâches** (Backend : **9**, Frontend : **7**).

#### Tâches Backend (9)
1. **B06.1** — Entité et repository `PeriodeDroits` avec contrainte de non-chevauchement des périodes par adhérent.
2. **B06.2** — `ServiceCalculDroits` :
   - Imputation séquentielle débutant à la fin de la dernière période couverte (ou date d'adhésion).
   - Division entière par le montant journalier du pack (`RoundingMode.DOWN`).
   - Persistance en base (jamais recalculé à la volée à l'affichage).
3. **B06.3** — Gestion du reliquat non imputé : consignation en solde d'attente (règle [V] documentée).
4. **B06.4** — `ServiceCalculDroits.situation(UUID adherentId, LocalDate dateReference)` consolidant : date limite de couverture, jours de retard, cumul cotisé, statut de régularité et éligibilité CNPS.
5. **B06.5** — `ServiceRegularite` : classification en 4 statuts (`A_JOUR`, `PARTIELLEMENT_A_JOUR`, `EN_RETARD`, `JAMAIS_COTISE`) selon le paramètre `DELAI_RETARD_JOURS`.
6. **B06.6** — Recalcul intégral sécurisé et tracé `DROITS_RECALCUL` réservé aux rôles `DAF` et `SUPER_ADMIN`.
7. **B06.7** — Tâche planifiée nocturne rafraîchissant les statuts de régularité quotidiens.
8. **B06.8** — `ControleurDroits` : endpoints `/droits/adherents/{id}`, `/droits/adherents/{id}/periodes`, `/droits/adherents/{id}/recalculer`.
9. **B06.9** — Tests unitaires exhaustifs du moteur : calcul pack 700, calcul pack 1000, gestion du saut de période, calcul des jours de retard.

#### Endpoints REST Backend
| Verbe | Chemin | Permission | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `GET` | `/droits/adherents/{id}` | `DROITS:LIRE` | Param: au (date optionnelle) | `SituationDroitsDto` | 200, 403, 404 |
| `GET` | `/droits/adherents/{id}/periodes` | `DROITS:LIRE` | — | `List<PeriodeDroits>` | 200, 403, 404 |
| `POST` | `/droits/adherents/{id}/recalculer` | `DAF` ou `SUPER_ADMIN` | `RecalculDto` | `Void` | 204, 400, 403 |

#### Tâches Frontend (7)
1. **F06.1** — Écran de suivi des droits et régularité **E09** (`/droits`) listant les adhérents avec retard décroissant.
2. **F06.2** — Composant frise chronologique des périodes couvertes affiché sur la fiche adhérent E05.
3. **F06.3** — Badges de régularité normalisés : Vert (`À jour`), Jaune (`Partiellement à jour`), Rouge (`En retard`), Gris (`Jamais cotisé`).
4. **F06.4** — Jauge d'atteinte du seuil d'éligibilité CNPS (10 500 F pour Pack 700 / 15 000 F pour Pack 1000).
5. **F06.5** — Bandeau d'avertissement [V] sur les fiches adhérents si un reliquat de cotisation reste non imputé.
6. **F06.6** — Filtres avancés sur la vue des droits : par zone, par agent encaisseur, par plage de jours de retard.
7. **F06.7** — Bouton de déclenchement du recalcul réservé aux profils autorisés avec confirmation de motif.

#### Documentation étape par étape
1. Adhérent inscrit au Pack 700 (700 FCFA/jour, seuil CNPS 10 500 FCFA).
2. Validation d'un paiement de 7 000 FCFA $\rightarrow$ Création d'une période de $7000 / 700 = 10$ jours couverts.
3. Validation d'un paiement complémentaire de 5 000 FCFA $\rightarrow$ Imputation de $5000 / 700 = 7$ jours supplémentaires, reliquat de 100 FCFA en attente, cumul $= 12 000$ FCFA $\rightarrow$ Éligibilité CNPS activée.

---

### SPRINT S07 — Pôle CNPS, Dossiers & Déclarations Mensuelles
* **Dépendance** : S02, S06.
* **Objectif** : Gérer les dossiers d'immatriculation à la CNPS, le cycle de collecte des pièces obligatoires (CNI, acte de naissance, photo) et la préparation des déclarations mensuelles sans intégration directe avec l'API CNPS.
* **Compte des tâches** : Total : **19 tâches** (Backend : **11**, Frontend : **8**).

#### Tâches Backend (11)
1. **B07.1** — Migration Flyway `V4__cnps_documents_relances.sql` (tables `document`, `dossier_cnps`, `piece_dossier_cnps`, `declaration_cnps`, `historique_dossier_cnps`).
2. **B07.2** — Entités `DossierCnps`, `PieceDossierCnps`, `DeclarationCnps`.
3. **B07.3** — `DossierCnpsRepository`, `PieceDossierCnpsRepository`, `DeclarationCnpsRepository`.
4. **B07.4** — `ServiceDossierCnps` : ouverture automatique/manuelle de dossier, rattachement de pièce justificative, passage automatique à `PRET` lorsque toutes les pièces obligatoires sont fournies.
5. **B07.5** — `ServiceDeclarationCnps` : préparation du bordereau mensuel calculé sur la base des `periode_droits` du mois échu.
6. **B07.6** — Gestion du paramètre [V] `revenu_mensuel_declare` : pas d'assiette inventée si non renseignée.
7. **B07.7** — Action humaine tracée `marquerTransmise` enregistrant la date de dépôt physique et la pièce de récépissé.
8. **B07.8** — Détection des adhérents éligibles non encore immatriculés (cumul $\ge$ seuil pack et dossier non `TRAITE`).
9. **B07.9** — Journalisation d'audit : `CNPS_DOSSIER_CREATION`, `CNPS_PIECE_AJOUT`, `CNPS_CHANGEMENT_STATUT`, `CNPS_DECLARATION_TRANSMISE`.
10. **B07.10** — `ControleurCnps` exposant les endpoints de gestion.
11. **B07.11** — Tests d'intégration : cycle complet dossier CNPS (incomplet $\rightarrow$ ajout CNI $\rightarrow$ prêt $\rightarrow$ transmis $\rightarrow$ traité).

#### Endpoints REST Backend
| Verbe | Chemin | Permission | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `POST` | `/cnps/dossiers` | `CNPS:CREER` | `OuvertureDossierDto` | `DossierCnps` | 200, 400, 409 |
| `GET` | `/cnps/dossiers/{id}` | `CNPS:LIRE` | — | `DossierCnps` | 200, 403, 404 |
| `POST` | `/cnps/dossiers/{id}/pieces` | `CNPS:MODIFIER` | `AjoutPieceDto` | `PieceDossierCnps` | 200, 400, 403 |
| `POST` | `/cnps/dossiers/{id}/statut` | `CNPS:CHANGER_STATUT` | `ChangementStatutDossierDto` | `DossierCnps` | 200, 400, 403 |
| `GET` | `/cnps/dossiers/{id}/pieces-manquantes` | `CNPS:LIRE` | — | `List<PieceDossierCnps>` | 200, 403 |
| `GET` | `/cnps/declarations/a-produire` | `CNPS:LIRE` | Param: periode (ex. 2026-09) | `List<DeclarationCnpsDto>` | 200, 403 |
| `POST` | `/cnps/declarations/{id}/transmettre` | `CNPS:TRANSMETTRE` | `TransmissionDeclarationDto` | `DeclarationCnps` | 200, 400, 403 |

#### Tâches Frontend (8)
1. **F07.1** — Écran Pôle CNPS **E10** (`/cnps`) avec 3 sous-vues : Dossiers, Éligibles non immatriculés, Déclarations.
2. **F07.2** — Tableau des dossiers avec filtres par statut (`BROUILLON`, `INCOMPLET`, `PRET`, `TRANSMIS`, `TRAITE`, `REJETE`) et zone.
3. **F07.3** — Fiche de dossier CNPS affichant la checklist des pièces obligatoires et leur statut de validation.
4. **F07.4** — Modal de téléversement direct d'une pièce justificative rattachée au dossier.
5. **F07.5** — Liste prioritaire des « Éligibles non immatriculés » pour action immédiate du Gestionnaire de compte.
6. **F07.6** — Écran de préparation du bordereau déclaratif mensuel avec totalisation des cotisations sociales.
7. **F07.7** — Modal de transmission déclarant le dépôt physique à la CNPS avec numéro de quittance.
8. **F07.8** — Avertissement explicite [V] sur l'assiette du revenu mensuel déclaré.

#### Documentation étape par étape
1. Ouverture du dossier CNPS suite au dépassement du seuil par un adhérent.
2. Téléversement de la CNI recto/verso $\rightarrow$ Le statut du dossier passe automatiquement de `INCOMPLET` à `PRET`.
3. Changement de statut vers `TRANSMIS` lors du dépôt au centre de prévoyance sociale.
4. Réception du numéro d'immatriculation définitif $\rightarrow$ Passage en `TRAITE`.

---

### SPRINT S08 — Recouvrement, Relances Multicanales & Notifications
* **Dépendance** : S06.
* **Objectif** : Structurer l'activité de recouvrement et de fidélisation via des campagnes ciblées, l'enregistrement de résultats dans une liste fermée et un centre de notifications internes.
* **Compte des tâches** : Total : **16 tâches** (Backend : **9**, Frontend : **7**).

#### Tâches Backend (9)
1. **B08.1** — Tables `campagne_relance`, `relance`, `notification`.
2. **B08.2** — Entités JPA et repositories associés.
3. **B08.3** — `ServiceRelance` : création de campagnes basées sur des critères JSONB (jours de retard $> N$, secteur d'activité, zone géographique).
4. **B08.4** — Enregistrement des contacts dans une liste de résultats fermée obligatoire : `PROMESSE`, `PAIEMENT`, `INJOIGNABLE`, `REFUS`, `DEMENAGE`, `ABSENT`.
5. **B08.5** — Programmation d'une date de prochaine action (`prochaine_action_le`) pour le suivi d'échéance.
6. **B08.6** — `ServiceNotification` : émission d'alertes internes (remise en écart pour le DAF, dossier CNPS prêt pour le gestionnaire, alerte retard pour l'agent).
7. **B08.7** — Journalisation d'audit : `RELANCE_ENREGISTREMENT`.
8. **B08.8** — Contrôleurs REST `/relances`, `/campagnes-relance`, `/notifications`.
9. **B08.9** — Tests d'intégration : génération d'une file de relance, consignation d'un appel téléphonique avec promesse de versement, notification lue/non-lue.

#### Endpoints REST Backend
| Verbe | Chemin | Permission | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `GET` | `/relances/file` | `RELANCE:LIRE` | Params: responsableId, retardMin | `List<RelanceAdherentDto>` | 200, 403 |
| `POST` | `/relances` | `RELANCE:CREER` | `EnregistrementRelanceDto` | `Relance` | 201, 400, 403 |
| `POST` | `/campagnes-relance` | `RELANCE:CREER` | `CreationCampagneDto` | `CampagneRelance` | 201, 400, 403 |
| `GET` | `/notifications` | Authentifié | Param: nonLuesUniquement | `List<Notification>` | 200, 401 |
| `POST` | `/notifications/{id}/lue` | Authentifié | — | `Void` | 204, 403, 404 |

#### Tâches Frontend (7)
1. **F08.1** — Écran du centre de relances **E13** (`/relances`) avec file de travail quotidienne par agent.
2. **F08.2** — Formulaire rapide d'enregistrement de contact : canal (Appel, SMS, WhatsApp, Visite terrain) et résultat (liste fermée exclusive).
3. **F08.3** — Sélecteur de date de rappel pour replanification automatique dans la file de travail.
4. **F08.4** — Interface de création de campagne de recouvrement ciblant une population filtrée depuis l'écran E09.
5. **F08.5** — Composant cloche de notification dans le Header avec compteur d'alertes non lues.
6. **F08.6** — Menu déroulant de notifications avec navigation directe vers l'entité concernée (paiement, dossier, remise).
7. **F08.7** — Indicateur de conversion des relances (pourcentage de promesses converties en paiements réels).

#### Documentation étape par étape
1. Détection automatique des adhérents en retard $> 30$ jours.
2. Attribution de la file à l'Agent de terrain référent.
3. Appel téléphonique de l'adhérent $\rightarrow$ Enregistrement du résultat `PROMESSE` au 25 du mois.
4. Consultation de la fiche adhérent $\rightarrow$ Historique de relance actualisé.

---

### SPRINT S09 — Tableaux de Bord & Pilotage par Profil de Rôle
* **Dépendance** : S02 à S08.
* **Objectif** : Offrir à chaque rôle une vue décisionnelle adaptée alimentée par l'indicateur central de la coopérative : le **taux d'activation** ($\text{cotisants uniques} / \text{inscrits}$).
* **Compte des tâches** : Total : **16 tâches** (Backend : **8**, Frontend : **8**).

#### Tâches Backend (8)
1. **B09.1** — Création et rafraîchissement des vues matérialisées PostgreSQL : `vue_situation_adherent`, `vue_taux_activation`, `vue_collecte_mensuelle`.
2. **B09.2** — `ServiceTableauBord` : méthode `direction()` pour les rôles `PCA`, `DG`, `DGA`.
3. **B09.3** — `ServiceTableauBord` : méthode `daf()` pour le suivi des remises caisse en attente, écarts et flux à contrôler.
4. **B09.4** — `ServiceTableauBord` : méthode `cnps()` pour le pilotage des immatriculations et déclarations.
5. **B09.5** — `ServiceTableauBord` : méthode `terrain(UUID agentId)` pour l'état d'avancement de la collecte et relances de l'agent.
6. **B09.6** — Calcul exact du taux d'activation : sur 172 adhérents historiques, mise en exergue des 115 n'ayant jamais cotisé.
7. **B09.7** — `ControleurTableauBord` exposant `/tableaux-de-bord/{direction|daf|cnps|terrain}`.
8. **B09.8** — Tests d'autorisation : contrôle que le PCA n'a accès qu'à la vue directionnelle en lecture, et qu'un agent ne consulte que sa synthèse terrain.

#### Endpoints REST Backend
| Verbe | Chemin | Permission / Rôle | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `GET` | `/tableaux-de-bord/direction` | `PCA`, `DG`, `DGA`, `SUPER_ADMIN` | — | `TableauBordDirectionDto` | 200, 403 |
| `GET` | `/tableaux-de-bord/daf` | `DAF`, `SUPER_ADMIN` | — | `TableauBordDafDto` | 200, 403 |
| `GET` | `/tableaux-de-bord/cnps` | `GESTIONNAIRE_COMPTE`, `SUPER_ADMIN` | — | `TableauBordCnpsDto` | 200, 403 |
| `GET` | `/tableaux-de-bord/terrain` | `CHEF_AGENT_TERRAIN`, `AGENT_TERRAIN` | Param: agentId | `TableauBordTerrainDto` | 200, 403 |

#### Tâches Frontend (8)
1. **F09.1** — Écran d'accueil Tableau de bord **E02** (`/`) avec rendu conditionnel selon le rôle principal de l'utilisateur.
2. **F09.2** — Variante Direction (PCA, DG, DGA) : carte géante Taux d'activation, effectif total, collecte du mois, répartition par mode de paiement.
3. **F09.3** — Graphique d'évolution des collectes sur 12 mois glissants (Recharts / Chart.js).
4. **F09.4** — Variante DAF : alertes paiements à contrôler, espèces en caisse non remises, remises en écart.
5. **F09.5** — Variante Gestionnaire de compte : dossiers CNPS incomplets, déclarations du mois en attente.
6. **F09.6** — Variante Terrain : collecte du jour, objectif mensuel, adhérents à relancer en priorité.
7. **F09.7** — Affichage de la date et heure de dernière actualisation des données calculées.
8. **F09.8** — Bandeau d'information sur les paramètres non encore confirmés par la coopérative.

#### Documentation étape par étape
1. Connexion en profil PCA $\rightarrow$ Affichage immédiat du tableau de bord stratégique sans actions d'écriture.
2. Connexion en profil DAF $\rightarrow$ Mise en avant des alertes de remises en écart.
3. Connexion en profil Agent $\rightarrow$ Affichage exclusif du portefeuille de sa zone.

---

### SPRINT S10 — Reporting Avancé, Exports & Audit Immuable
* **Dépendance** : S09.
* **Objectif** : Générer les états comptables et sociaux officiels, assurer les exports tabulaires sécurisés et garantir l'auditabilité totale du système sans possibilité de purge.
* **Compte des tâches** : Total : **16 tâches** (Backend : **9**, Frontend : **7**).

#### Tâches Backend (9)
1. **B10.1** — `ServiceExport` : génération de fichiers CSV et Excel (XLSX) pour les adhérents, cotisations et déclarations CNPS.
2. **B10.2** — Limitation de débit et volume sur les exports : génération asynchrone si le nombre de lignes dépasse 500.
3. **B10.3** — Traçabilité systématique `EXPORT_SENSIBLE` dans `journal_audit` avec type d'export, critères et nombre de lignes exportées.
4. **B10.4** — Respect du périmètre de données lors de l'export : un agent ne peut exporter que son propre portefeuille.
5. **B10.5** — `ServiceControleCoherence` : exécution des 7 contrôles d'intégrité nocturnes (paiement sans affectation, droits chevauchants, etc.).
6. **B10.6** — `ControleurAudit` : consultation en lecture seule stricte du journal d'audit avec filtres temporels et par utilisateur.
7. **B10.7** — Verrouillage absolu de la table `journal_audit` : aucune méthode de modification ni suppression exposée.
8. **B10.8** — `ControleurExport` : endpoints de déclenchement et téléchargement temporaire des exports.
9. **B10.9** — Tests d'audit : tentative de modification ou purge rejetée, traçabilité effective de chaque export.

#### Endpoints REST Backend
| Verbe | Chemin | Permission | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `GET` | `/audit` | `AUDIT:CONSULTER` | Params: entite, utilisateur, type, page | `ReponsePaginee<JournalAudit>` | 200, 403 |
| `POST` | `/exports/adherents` | `EXPORT:ADHERENT` | `CritereExportDto` | `Resource` (Fichier CSV/XLSX) | 200, 403 |
| `POST` | `/exports/paiements` | `EXPORT:PAIEMENT` | `CritereExportDto` | `Resource` | 200, 403 |
| `GET` | `/controles-coherence/dernier-rapport` | `ADMINISTRATION:LIRE` | — | `RapportCoherenceDto` | 200, 403 |

#### Tâches Frontend (7)
1. **F10.1** — Écran de consultation d'audit **E17** (`/audit`) en lecture seule stricte (aucun bouton d'action destructive).
2. **F10.2** — Visualiseur de différences (diff avant/après) sur les modifications d'enregistrements avec masquage des données sensibles.
3. **F10.3** — Écran de reporting centralisé **E15** (`/rapports`) avec sélection des modèles prédéfinis.
4. **F10.4** — Boutons d'export CSV / Excel sur les tables de données avec message d'avertissement rappelant l'enregistrement de l'action dans l'audit.
5. **F10.5** — Indicateur de progression lors des exports asynchrones volumineux.
6. **F10.6** — Affichage du rapport de contrôle de cohérence nocturne avec surbrillance des anomalies détectées.
7. **F10.7** — Filtres avancés d'audit par plage de dates, identifiant utilisateur et type d'opération.

#### Documentation étape par étape
1. Déclenchement d'un export de la liste des adhérents au format Excel.
2. Téléchargement immédiat du fichier.
3. Consultation immédiate de `/audit` $\rightarrow$ Constat de l'enregistrement de la ligne `EXPORT_SENSIBLE` avec l'identifiant de l'auteur et l'horodatage précis.

---

### SPRINT S11 — Administration Système, Paramètres Dynamiques & Durcissement
* **Dépendance** : S01, S10.
* **Objectif** : Fournir au Super Administrateur la gestion des comptes, la matrice des permissions, le paramétrage des règles de gestion [V] et appliquer le durcissement sécurité (OWASP, Rate Limiting).
* **Compte des tâches** : Total : **15 tâches** (Backend : **9**, Frontend : **6**).

#### Tâches Backend (9)
1. **B11.1** — Service et contrôleur d'administration des comptes utilisateurs (`ServiceUtilisateur`) : création, désactivation, réinitialisation de mot de passe, association au profil Agent.
2. **B11.2** — `ServiceParametre` : consultation et mise à jour avec motif obligatoire des règles stockées en table `parametre`.
3. **B11.3** — Matrice d'habilitation dynamique : association rôle-permission persistée et rechargée sans redémarrage.
4. **B11.4** — Mise en place du limiteur de débit avec Bucket4j (`/auth/connexion` : max 5 tentatives / 15 min / IP ; écritures : 60 / min).
5. **B11.5** — Durcissement des désérialisations Jackson (`FAIL_ON_UNKNOWN_PROPERTIES: true`).
6. **B11.6** — Chiffrement au repos des pièces d'identité et CNI (clé AES-256 issue des variables d'environnement).
7. **B11.7** — Masquage des en-têtes serveurs et suppression complète des traces de pile d'erreurs en profil production.
8. **B11.8** — `ControleurAdministration` exposant `/administration/utilisateurs`, `/administration/roles`, `/administration/parametres`.
9. **B11.9** — Tests de sécurité OWASP automatisés : injection SQL, contournement de permissions, dépassement de quota (429).

#### Endpoints REST Backend
| Verbe | Chemin | Permission / Rôle | Requête DTO | Réponse DTO | Statuts HTTP |
|---|---|---|---|---|---|
| `GET` | `/administration/utilisateurs` | `ADMINISTRATION:LIRE` | Params: role, actif, page | `ReponsePaginee<UtilisateurDto>` | 200, 403 |
| `POST` | `/administration/utilisateurs` | `SUPER_ADMIN` | `CreationUtilisateurDto` | `UtilisateurDto` | 201, 400, 403 |
| `PUT` | `/administration/utilisateurs/{id}/statut` | `SUPER_ADMIN` | `StatutCompteDto` | `Void` | 204, 403 |
| `GET` | `/administration/parametres` | `ADMINISTRATION:LIRE` | — | `List<Parametre>` | 200, 403 |
| `PUT` | `/administration/parametres/{cle}` | `SUPER_ADMIN` | `ModificationParametreDto` | `Void` | 204, 400, 403 |

#### Tâches Frontend (6)
1. **F11.1** — Écran d'administration globale **E16** (`/administration`) avec onglets Utilisateurs, Rôles & Permissions, Paramètres métier.
2. **F11.2** — Tableau de gestion des utilisateurs avec toggle d'activation/désactivation immédiate.
3. **F11.3** — Matrice interactive Rôle $\times$ Permission avec signalement visuel des droits sensibles.
4. **F11.4** — Interface de gestion des paramètres métier affichant explicitement le statut de validation (`[C]` Confirmé, `[A]` À analyser, `[V]` À valider).
5. **F11.5** — Modal de modification d'un paramètre imposant la saisie d'un motif d'audit avant soumission.
6. **F11.6** — Gestion de la réponse HTTP `429 Too Many Requests` avec affichage du compte à rebours avant réessai.

#### Documentation étape par étape
1. Modification du paramètre `DELAI_RETARD_JOURS` de 30 à 45 jours avec motif « Décision CA du 19/09 ».
2. Vérification de la prise en compte immédiate par le moteur de droits sans recompilation.
3. Vérification de la ligne de modification dans le journal d'audit.

---

### SPRINT S12 — Recette E2E, Reprise Historique & Mise en Production
* **Dépendance** : Tous les sprints antérieurs (S00 à S11).
* **Objectif** : Valider l'intégralité du cycle opérationnel nominal, importer les 172 adhérents historiques du classeur Excel existant via la table de correspondance, et sceller la livraison V1.
* **Compte des tâches** : Total : **15 tâches** (Backend : **8**, Frontend : **7**).

#### Tâches Backend (8)
1. **B12.1** — `ServiceMigrationClasseur` : script de reprise et nettoyage des 172 adhérents historiques (normalisation des noms, détection des dates invalides, association aux activités).
2. **B12.2** — Alimentation de la table `migration_correspondance` avec statut `IMPORTE`, `FUSIONNE` ou `ECARTE` pour chaque ligne.
3. **B12.3** — Reprise des cumuls cotisés des 57 cotisants actifs sous forme de solde d'ouverture validé par le DAF.
4. **B12.4** — Exécution des tests E2E automatisés (RestAssured + Testcontainers PostgreSQL) simulant le cycle complet : Enrôlement $\rightarrow$ Collecte Mobile Money $\rightarrow$ Confirmation Chef $\rightarrow$ Validation DAF $\rightarrow$ Imputation Droits $\rightarrow$ Dossier CNPS $\rightarrow$ Export $\rightarrow$ Audit.
5. **B12.5** — Audit complet des dépendances Maven avec `owasp dependency-check` et `osv-scanner` (zéro vulnérabilité critique tolérée).
6. **B12.6** — Vérification de l'absence totale de secrets dans le code et les configurations Git via `gitleaks`.
7. **B12.7** — Procédure de sauvegarde et test réel de restauration de la base PostgreSQL sur environnement vierge.
8. **B12.8** — Génération du SBOM logiciel final via `cyclonedx-maven-plugin`.

#### Tâches Frontend (7)
1. **F12.1** — Campagne de recette utilisateur simulant les 8 profils de rôles sur les 17 écrans applicatifs.
2. **F12.2** — Vérification du comportement hors ligne (bandeau de perte de réseau sans perte des formulaires en cours).
3. **F12.3** — Test de reprise de session après expiration de token sans déconnexion brutale de l'utilisateur.
4. **F12.4** — Validation de l'accessibilité, de l'ergonomie mobile/tablette pour les agents de terrain et de la fluidité des interfaces.
5. **F12.5** — Audit des dépendances npm avec `npm audit` (zéro vulnérabilité élevée).
6. **F12.6** — Build de production optimisé (`npm run build`) et vérification de la taille des bundles.
7. **F12.7** — Rédaction du guide d'exploitation utilisateur et de la fiche de conformité signée.

#### Documentation étape par étape
1. Importation du classeur historique et validation du rapport de migration signé par le DAF.
2. Exécution du scénario nominal de bout en bout sur l'environnement de pré-production.
3. Signature du procès-verbal de recette V1 et déploiement du conteneur Docker en production.

---

## 4. CRITÈRES TRANSVERSES DE CLÔTURE (DEFINITION OF DONE)

Un sprint n'est formellement déclaré **TERMINÉ** que si l'ensemble des conditions suivantes est vérifié :

1. **Permissions serveur** : Chaque endpoint backend est protégé par `@PreAuthorize` et possède au minimum un test unitaire « Rôle autorisé $\rightarrow$ 200/201/204 » et un test « Rôle non autorisé $\rightarrow$ 403 ».
2. **Périmètre de données** : Tout accès unitaire ou en liste filtre les données via `ServicePerimetreDonnees`.
3. **Zéro secret** : Aucun mot de passe, token ou clé d'API n'est présent dans le code source ni dans l'historique Git (`gitleaks` validé).
4. **Séparation des responsabilités** : L'interdiction pour un utilisateur de valider sa propre opération financière ou de caisse est testée et validée.
5. **Règles financières [V]** : Aucune formule de répartition de versement ni seuil de retard n'est codé en dur dans le code Java ou TypeScript. Tout paramètre vit dans la table `parametre` avec log d'avertissement.
6. **Documentation API** : Chaque endpoint est documenté dans OpenAPI Springdoc avec ses codes d'erreur métier.
7. **Archivage logique** : Aucune suppression SQL `DELETE` n'est exécutée sur les tables métier (adhérents, paiements, dossiers, documents).
8. **Intégrité Frontend** : Le frontend ne réalise aucun calcul de droit ou de régularité ; il reflète fidèlement les données renvoyées par l'API et masque les actions non permises.
9. **Qualité & Couverture** : La suite de tests passe avec succès (`mvn test`), la compilation est propre et le journal des dépendances est à jour.
