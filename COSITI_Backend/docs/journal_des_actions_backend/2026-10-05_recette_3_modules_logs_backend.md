# Journal des logs backend — recette des 3 modules (05/10/2026)

Logs de la **passe finale** de recette, sur une base vierge (schéma isolé `cositi_recette` de `cositi_db`, migrations
V1 à V23 appliquées au démarrage, comptes de démonstration du profil `dev`), API sur le port 8083.
Journal d'actions associé : `2026-10-05_V23_recette_3_modules_backend.md`.

| | |
|---|---|
| Script | `COSITI_Backend/scripts/recette/recette_3_modules.py` |
| Résultat API | **313 / 313 étapes conformes** |
| Erreurs serveur (ERROR) | **0** |
| Recette E2E navigateur (Playwright, Chrome) | **20 réussis, 0 en échec** |

## 1. Démarrage de l'API

```
2026-10-05T19:15:54.954+01:00  Successfully applied 23 migrations to schema "cositi_recette", now at version v23 (execution time 00:01.469s)
2026-10-05T19:16:18.855+01:00  Started CositiApiApplication in 43.355 seconds (process running for 45.413)
```

## 2. Bilan par module

| Module | Conformes | Étapes |
|---|---|---|
| AGENTS DE TERRAIN | 46 | 46 |
| ADHÉRENTS | 48 | 48 |
| ADHÉRENTS — frais, activation, contrôle DGA | 54 | 54 |
| ADHÉRENTS — workflow de modification officielle | 36 | 36 |
| AGENTS — portefeuilles | 13 | 13 |
| COTISATIONS | 62 | 62 |
| COTISATIONS — remises de caisse | 10 | 10 |
| COTISATIONS — bilan de caisse et droits | 13 | 13 |
| ADHÉRENTS — historiques et fin de cycle | 8 | 8 |
| AGENT DE TERRAIN ET CHEF — périmètre et collecte | 16 | 16 |
| TRANSVERSE — rôles et règles V23 | 7 | 7 |

## 3. Avertissements métier émis par le serveur

Refus attendus, déclenchés volontairement par la recette (chaque refus est une règle vérifiée). Aucun n'est une erreur technique.

| Code | Statut HTTP | Occurrences |
|---|---|---|
| `JETON_RAFRAICHISSEMENT_ABSENT` | 401 | 23 |
| `ADHERENT_SANS_AGENT` | 404 | 5 |
| `PERIMETRE_ADHERENT_REFUSE` | 403 | 3 |
| `COTISATION_EPARGNE_INSUFFISANTE` | 400 | 2 |
| `DEMANDE_ACCES_REFUSE` | 403 | 2 |
| `DEMANDE_AUTO_VALIDATION_INTERDITE` | 403 | 2 |
| `IDENTIFIANTS_INVALIDES` | 401 | 2 |
| `ADHERENT_EN_VALIDATION` | 409 | 1 |
| `ADHERENT_MODIFICATION_PAR_DEMANDE` | 409 | 1 |
| `ADHERENT_TRI_INVALIDE` | 400 | 1 |
| `ADHERENT_VALIDATION_PAR_CONTROLE_DGA` | 409 | 1 |
| `ADHERENT_VERSION_OBSOLETE` | 409 | 1 |
| `AFFECTATION_SECURITE_SOCIALE_INSUFFISANTE` | 400 | 1 |
| `AGENT_MODIFICATION_PAR_DEMANDE` | 409 | 1 |
| `AGENT_NON_VALIDE` | 409 | 1 |
| `AGENT_STATUT_INCHANGE` | 409 | 1 |
| `BILAN_CAISSE_TRANSITION_INTERDITE` | 409 | 1 |
| `CONTROLE_DGA_CONSTAT_INVALIDE` | 400 | 1 |
| `COTISATION_FRAIS_ADHESION_NON_VALIDE` | 409 | 1 |
| `COTISATION_PACK_REQUIS` | 400 | 1 |
| `COTISATION_REPARTITION_INCOHERENTE` | 400 | 1 |
| `COTISATION_REPARTITION_REQUISE` | 400 | 1 |
| `COTISATION_SECURITE_SOCIALE_INSUFFISANTE` | 400 | 1 |
| `DEMANDE_VALIDATION_NON_AUTORISEE` | 403 | 1 |
| `DOCUMENT_DOUBLON` | 409 | 1 |
| `DOCUMENT_TYPE_NON_AUTORISE` | 400 | 1 |
| `FRAIS_ADHESION_DEJA_ENREGISTRE` | 409 | 1 |
| `HISTORIQUE_PERIODE_INVALIDE` | 400 | 1 |
| `IDEMPOTENCY_KEY_CONFLIT` | 409 | 1 |
| `IDEMPOTENCY_KEY_MANQUANTE` | 400 | 1 |
| `ORGANISATION_CHEF_DEJA_DESIGNE` | 409 | 1 |
| `PAIEMENT_ADHERENT_ARCHIVE` | 409 | 1 |
| `PAIEMENT_DEJA_CONFIRME_CHEF` | 409 | 1 |
| `PAIEMENT_DEJA_VALIDE` | 409 | 1 |
| `PAIEMENT_HORS_PERIMETRE_CHEF` | 403 | 1 |
| `PAIEMENT_REFERENCE_DEJA_UTILISEE` | 409 | 1 |
| `PAIEMENT_REFERENCE_MANQUANTE` | 400 | 1 |
| `PAIEMENT_TRANSITION_INTERDITE` | 409 | 1 |
| `REMISE_CAISSE_DEJA_RECEPTIONNEE` | 409 | 1 |
| `REMISE_PAIEMENT_AUTRE_AGENT` | 400 | 1 |
| `REMISE_PAIEMENT_DEJA_REMIS` | 409 | 1 |
| `VALIDATION_FINANCIERE_NON_AUTORISEE` | 403 | 1 |
| `ZONE_CODE_EXISTANT` | 409 | 1 |
| `ZONE_CODE_NON_MODIFIABLE` | 400 | 1 |

Autres avertissements (journal applicatif) :

| Message | Occurrences |
|---|---|
| c.c.a.d.service.ServiceCalculDroitsImpl  : Reliquat de 300.00 F non imputé pour l'adhérent 62a2fc35-ec8b-452d-a213-005be5499826 — règle TRAITEMENT_SUR | 3 |
| c.c.a.d.service.ServiceCalculDroitsImpl  : Reliquat de 100.00 F non imputé pour l'adhérent 62a2fc35-ec8b-452d-a213-005be5499826 — règle TRAITEMENT_SUR | 2 |
| o.f.c.i.s.DefaultSqlScriptExecutor       : DB: l'extension « pgcrypto » existe déjà, poursuite du traitement (SQL State: 42710 - Error Code: 0) | 1 |
| o.f.c.i.s.DefaultSqlScriptExecutor       : DB: l'extension « pg_trgm » existe déjà, poursuite du traitement (SQL State: 42710 - Error Code: 0) | 1 |
| org.hibernate.orm.deprecation            : HHH90000025: PostgreSQLDialect does not need to be specified explicitly using 'hibernate.dialect' (remove t | 1 |
| r$InitializeUserDetailsManagerConfigurer : Global AuthenticationManager configured with an AuthenticationProvider bean. UserDetailsService beans will  | 1 |
| s.b.a.a.m.OnlyOnceLoggingDenyMeterFilter : Reached the maximum number of URI tags for 'http.server.requests'. | 1 |
| c.c.a.d.service.ServiceCalculDroitsImpl  : Reliquat de 500.00 F non imputé pour l'adhérent ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1 — règle TRAITEMENT_SUR | 1 |
| c.c.a.d.service.ServiceCalculDroitsImpl  : Reliquat de 100.00 F non imputé pour l'adhérent ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1 — règle TRAITEMENT_SUR | 1 |

## 4. Journal complet des étapes

Format : horodatage, `[OK]`/`[KO]`, module, étape, rôle, requête, statut obtenu (attendu), durée, identifiant de corrélation (`trace=`, retrouvable dans les logs serveur et `journal_audit.correlation_id`).

```
Recette 3 modules — 2026-10-05T19:16:27 — base http://localhost:8083/api/v1 — suffixe fd2c0c

===== AGENTS DE TERRAIN =====
2026-10-05T19:16:27 [OK] AGENTS DE TERRAIN | Lister les zones | gest GET /zones -> 200 (attendu [200]) 166ms trace=recette-ad6b59bda341
2026-10-05T19:16:29 [OK] AGENTS DE TERRAIN | Créer une zone (DGA) | dga POST /zones -> 201 (attendu [201]) 90ms trace=recette-c3c8fe3b4735 code=ZR-fd2c0c
2026-10-05T19:16:29 [OK] AGENTS DE TERRAIN | Modifier une zone | dga PUT /zones/9b7567ad-b790-46a0-8df7-8bfed8055a97 -> 200 (attendu [200]) 61ms trace=recette-2a8159373bc4 code=ZR-fd2c0c
2026-10-05T19:16:29 [OK] AGENTS DE TERRAIN | Consulter une zone | gest GET /zones/9b7567ad-b790-46a0-8df7-8bfed8055a97 -> 200 (attendu [200]) 38ms trace=recette-6103d46461b4 code=ZR-fd2c0c
2026-10-05T19:16:29 [OK] AGENTS DE TERRAIN | Créer une zone (Gestionnaire, ORGANISATION:GERER_ZONES) | gest POST /zones -> 201 (attendu [201]) 55ms trace=recette-bbdb47ad47d2 code=ZG-fd2c0c
2026-10-05T19:16:29 [OK] AGENTS DE TERRAIN | Modifier ville et région d'une zone | gest PUT /zones/648bf470-0480-4937-84ce-fcb6125c2d95 -> 200 (attendu [200]) 37ms trace=recette-df4452abd801 code=ZG-fd2c0c
2026-10-05T19:16:29 [OK] AGENTS DE TERRAIN | Changer le code d'une zone -> 400 | gest PUT /zones/648bf470-0480-4937-84ce-fcb6125c2d95 -> 400 (attendu [400]) 32ms trace=recette-a61bef01da09 code=ZONE_CODE_NON_MODIFIABLE
2026-10-05T19:16:29 [OK] AGENTS DE TERRAIN | Code de zone déjà utilisé -> 409 | gest POST /zones -> 409 (attendu [409]) 51ms trace=recette-b3d725242084 code=ZONE_CODE_EXISTANT
2026-10-05T19:16:30 [OK] AGENTS DE TERRAIN | Créer une zone sans permission (Agent) | agent POST /zones -> 403 (attendu [403]) 30ms trace=recette-25a175a9755b code=ACCES_REFUSE
2026-10-05T19:16:30 [OK] AGENTS DE TERRAIN | Créer l'agent 1 (DGA) | dga POST /agents -> 201 (attendu [201]) 489ms trace=recette-abb868c8123c
2026-10-05T19:16:30 [OK] AGENTS DE TERRAIN | Créer l'agent 2 (DGA) | dga POST /agents -> 201 (attendu [201]) 420ms trace=recette-a88d4c73c2e9
2026-10-05T19:16:31 [OK] AGENTS DE TERRAIN | Créer l'agent 3 (DGA) | dga POST /agents -> 201 (attendu [201]) 398ms trace=recette-bb02390812d0
2026-10-05T19:16:31 [OK] AGENTS DE TERRAIN | Créer un agent sans être DGA (Gestionnaire) | gest POST /agents -> 403 (attendu [403]) 16ms trace=recette-7356b608fb2d code=ACCES_REFUSE
2026-10-05T19:16:31 [OK] AGENTS DE TERRAIN | Lister les agents | gest GET /agents?taille=50 -> 200 (attendu [200]) 63ms trace=recette-cbdbc52f3520
2026-10-05T19:16:31 [OK] AGENTS DE TERRAIN | Consulter un agent | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6 -> 200 (attendu [200]) 21ms trace=recette-c3fee8459c52
2026-10-05T19:16:31 [OK] AGENTS DE TERRAIN | Statut de validation du profil | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/statut-validation -> 200 (attendu [200]) 49ms trace=recette-fd5526bdaa13
2026-10-05T19:16:31 [OK] AGENTS DE TERRAIN | Modifier un agent (profil non validé : direct) | dga PUT /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6 -> 200 (attendu [200, 409]) 35ms trace=recette-e08ea0279d51
2026-10-05T19:16:31 [OK] AGENTS DE TERRAIN | Soumettre le profil à validation | dga POST /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/soumettre -> 200 (attendu [200, 201]) 203ms trace=recette-a6ec7ce5669a
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Valider le profil (DG, V23) | dg POST /demandes-validation/761ca67b-9f98-4ccc-9b36-fa5342fef854/approuver -> 200 (attendu [200]) 88ms trace=recette-5a6f02430cd2
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Profil validé | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/statut-validation -> 200 (attendu [200]) 30ms trace=recette-909d7f583f69
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Historique de validation de l'agent | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/historique-validation -> 200 (attendu [200]) 31ms trace=recette-233c4a2d20d8
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Désigner un Chef (DGA) | dga POST /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/designer-chef -> 200 (attendu [200]) 73ms trace=recette-2246cb4734c3
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Chef actuel de la zone | gest GET /agents/chef?zoneId=9b7567ad-b790-46a0-8df7-8bfed8055a97 -> 200 (attendu [200]) 29ms trace=recette-518142644216
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Seconde désignation refusée | dga POST /agents/77d9aed8-fcc2-4a76-afd6-6e038e9c0f4d/designer-chef -> 409 (attendu [409]) 22ms trace=recette-a901091e2c38 code=ORGANISATION_CHEF_DEJA_DESIGNE
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Remplacer le Chef | dga POST /agents/77d9aed8-fcc2-4a76-afd6-6e038e9c0f4d/remplacer-chef -> 200 (attendu [200]) 78ms trace=recette-aaee9d735cdb
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Historique des Chefs | dga GET /agents/77d9aed8-fcc2-4a76-afd6-6e038e9c0f4d/historique-chef -> 200 (attendu [200]) 30ms trace=recette-0fdcd47db099
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Désigner un Chef sans être DGA (Gestionnaire) | gest POST /agents/8a770ba5-451c-44e2-b164-8fe6c7e28f2b/designer-chef -> 403 (attendu [403]) 18ms trace=recette-731007459474 code=ACCES_REFUSE
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Demande de modification d'un agent | dga POST /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/demandes-modification -> 201 (attendu [201, 200]) 192ms trace=recette-c03c2870eb31
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Demandes de modification de l'agent | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/demandes-modification -> 200 (attendu [200]) 34ms trace=recette-15ca36d45b0c
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Approuver la modification de l'agent (DG) | dg POST /demandes-validation/0aadb1c8-9323-47e8-9000-910b84aaeaeb/approuver -> 200 (attendu [200]) 77ms trace=recette-232f4c0cf535
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Changement de statut d'un profil non validé : refusé par demande | dga POST /agents/8a770ba5-451c-44e2-b164-8fe6c7e28f2b/demandes-changement-statut -> 409 (attendu [409]) 43ms trace=recette-c3295b1593dd code=AGENT_NON_VALIDE
2026-10-05T19:16:32 [OK] AGENTS DE TERRAIN | Changement de statut direct sans changement -> 409 | dga POST /agents/8a770ba5-451c-44e2-b164-8fe6c7e28f2b/statut -> 409 (attendu [409]) 36ms trace=recette-737ecaf1c911 code=AGENT_STATUT_INCHANGE
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Soumettre le profil de l'agent 3 | dga POST /agents/8a770ba5-451c-44e2-b164-8fe6c7e28f2b/soumettre -> 200 (attendu [200]) 140ms trace=recette-2f8fccb21662
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Auteur de la soumission (DGA) : auto-validation refusée | dga POST /demandes-validation/40744295-ff11-4d7d-9a59-2d9797a0a25f/approuver -> 403 (attendu [403]) 28ms trace=recette-ec6d9cd625b8 code=DEMANDE_AUTO_VALIDATION_INTERDITE
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Valider le profil de l'agent 3 (DG) | dg POST /demandes-validation/40744295-ff11-4d7d-9a59-2d9797a0a25f/approuver -> 200 (attendu [200]) 83ms trace=recette-8a5bd80de916
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Profil 3 validé | dga GET /agents/8a770ba5-451c-44e2-b164-8fe6c7e28f2b/statut-validation -> 200 (attendu [200]) 56ms trace=recette-37a0c6c80a98
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Profil validé : modification directe refusée | dga PUT /agents/8a770ba5-451c-44e2-b164-8fe6c7e28f2b -> 409 (attendu [409]) 48ms trace=recette-70bb8e241795 code=AGENT_MODIFICATION_PAR_DEMANDE
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Demande de changement de statut (désactivation) | dga POST /agents/8a770ba5-451c-44e2-b164-8fe6c7e28f2b/demandes-changement-statut -> 201 (attendu [200, 201]) 70ms trace=recette-33c57662386d
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Approuver la désactivation (DG) | dg POST /demandes-validation/832c033b-af93-47d9-8a03-6ee1fef4c033/approuver -> 200 (attendu [200]) 59ms trace=recette-79846fa5d9a8
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Agent 3 désactivé | dga GET /agents/8a770ba5-451c-44e2-b164-8fe6c7e28f2b -> 200 (attendu [200]) 48ms trace=recette-2879dc296c0b
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Demandes de changement de statut | dga GET /agents/8a770ba5-451c-44e2-b164-8fe6c7e28f2b/demandes-changement-statut -> 200 (attendu [200]) 37ms trace=recette-3bd474f03db2
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Opérations de l'agent | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/operations -> 200 (attendu [200]) 69ms trace=recette-f2d9893ccb8f
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Distribution des portefeuilles | dga GET /agents/portefeuille-distribution -> 200 (attendu [200]) 38ms trace=recette-5806919a0a9d
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Charge mensuelle | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/charge?periode=2026-10 -> 200 (attendu [200]) 41ms trace=recette-9229cae164a2
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Charge : période illisible -> 400 | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/charge?periode=1 -> 400 (attendu [400]) 24ms trace=recette-ac54c02ded3e code=FORMAT_DATE_INVALIDE
2026-10-05T19:16:33 [OK] AGENTS DE TERRAIN | Résumé des cotisations de l'agent | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/cotisations-resume?periode=2026-10 -> 200 (attendu [200]) 48ms trace=recette-b63af52561c1

===== ADHÉRENTS =====
2026-10-05T19:16:33 [OK] ADHÉRENTS | Référentiel activités | gest GET /activites -> 200 (attendu [200]) 30ms trace=recette-eca2fd3fc636
2026-10-05T19:16:33 [OK] ADHÉRENTS | Référentiel packs | gest GET /packs -> 200 (attendu [200]) 56ms trace=recette-f5215404ce44
2026-10-05T19:16:33 [OK] ADHÉRENTS | Référentiel associations | gest GET /associations -> 200 (attendu [200]) 28ms trace=recette-07b93a63511b
2026-10-05T19:16:33 [OK] ADHÉRENTS | Exigences documentaires | gest GET /exigences-documentaires?enVigueur=true -> 200 (attendu [200]) 35ms trace=recette-6745bb95eafe
2026-10-05T19:16:34 [OK] ADHÉRENTS | Créer l'adhérent Atebafd2c0c (sans zone ni localisation, V23) | gest POST /adherents -> 201 (attendu [201]) 283ms trace=recette-acdb846f7acf
2026-10-05T19:16:34 [OK] ADHÉRENTS | Créer l'adhérent Mballafd2c0c (sans zone ni localisation, V23) | gest POST /adherents -> 201 (attendu [201]) 53ms trace=recette-72876aa95060
2026-10-05T19:16:34 [OK] ADHÉRENTS | Créer l'adhérent Ngonofd2c0c (sans zone ni localisation, V23) | gest POST /adherents -> 201 (attendu [201]) 56ms trace=recette-16753c75c653
2026-10-05T19:16:34 [OK] ADHÉRENTS | Créer l'adhérent Foudafd2c0c (sans zone ni localisation, V23) | gest POST /adherents -> 201 (attendu [201]) 37ms trace=recette-e293f999c7d8
2026-10-05T19:16:34 [OK] ADHÉRENTS | Créer sans activité -> 400 | gest POST /adherents -> 400 (attendu [400]) 41ms trace=recette-9a99c2da91ff code=VALIDATION_ECHOUEE
2026-10-05T19:16:34 [OK] ADHÉRENTS | Créer sans permission (DAF) | daf POST /adherents -> 403 (attendu [403]) 16ms trace=recette-f2e8490daa7c code=ACCES_REFUSE
2026-10-05T19:16:34 [OK] ADHÉRENTS | Doublon téléphone -> 409 | gest POST /adherents -> 409 (attendu [409]) 29ms trace=recette-384d607963fc code=ADHERENT_DOUBLON_POTENTIEL
2026-10-05T19:16:35 [OK] ADHÉRENTS | Vérifier un doublon sans zone (V23) | gest POST /adherents/verifier-doublon -> 200 (attendu [200]) 148ms trace=recette-32573b552ee7
2026-10-05T19:16:35 [OK] ADHÉRENTS | Lister / rechercher | gest GET /adherents?recherche=Atebafd2c0c&taille=10 -> 200 (attendu [200]) 76ms trace=recette-8cec74a16a73
2026-10-05T19:16:35 [OK] ADHÉRENTS | Tri invalide -> 400 | gest GET /adherents?tri=XYZ -> 400 (attendu [400]) 19ms trace=recette-6fc7955e11e4 code=ADHERENT_TRI_INVALIDE
2026-10-05T19:16:35 [OK] ADHÉRENTS | Consulter par matricule (casse libre) | gest GET /adherents/matricule/cositi-00001 -> 200 (attendu [200]) 25ms trace=recette-2bb0a8905b10
2026-10-05T19:16:35 [OK] ADHÉRENTS | Consulter la fiche | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 30ms trace=recette-e896a485b65b
2026-10-05T19:16:35 [OK] ADHÉRENTS | Complétion | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/completion -> 200 (attendu [200]) 43ms trace=recette-c774c13e45bc
2026-10-05T19:16:35 [OK] ADHÉRENTS | Champs manquants | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/champs-manquants -> 200 (attendu [200]) 32ms trace=recette-80bad31306b4
2026-10-05T19:16:35 [OK] ADHÉRENTS | État du dossier | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/dossier -> 200 (attendu [200]) 62ms trace=recette-0d3feb130220
2026-10-05T19:16:35 [OK] ADHÉRENTS | Dossier complet | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/dossier-complet -> 200 (attendu [200]) 161ms trace=recette-dd4bad9e394d
2026-10-05T19:16:35 [OK] ADHÉRENTS | Documents manquants | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/documents-manquants -> 200 (attendu [200]) 34ms trace=recette-56bb7e53e24e
2026-10-05T19:16:35 [OK] ADHÉRENTS | Checklist documentaire | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/checklist-documentaire -> 200 (attendu [200]) 44ms trace=recette-97b58ce6e468
2026-10-05T19:16:35 [OK] ADHÉRENTS | Coordonnées | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/coordonnees -> 200 (attendu [200]) 17ms trace=recette-db944fc5aae3
2026-10-05T19:16:35 [OK] ADHÉRENTS | Modifier les coordonnées | gest PUT /adherents/62a2fc35-ec8b-452d-a213-005be5499826/coordonnees -> 200 (attendu [200]) 34ms trace=recette-e0fd80ee09b3
2026-10-05T19:16:35 [OK] ADHÉRENTS | Infos professionnelles | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/professionnel -> 200 (attendu [200]) 25ms trace=recette-d94af271bee9
2026-10-05T19:16:35 [OK] ADHÉRENTS | Modifier les infos professionnelles | gest PUT /adherents/62a2fc35-ec8b-452d-a213-005be5499826/professionnel -> 200 (attendu [200]) 34ms trace=recette-53054128d80b
2026-10-05T19:16:35 [OK] ADHÉRENTS | Compléter le profil | gest PATCH /adherents/62a2fc35-ec8b-452d-a213-005be5499826/profil -> 200 (attendu [200]) 45ms trace=recette-f703a959c836
2026-10-05T19:16:35 [OK] ADHÉRENTS | Relire la fiche | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 20ms trace=recette-c7f14f46bce0
2026-10-05T19:16:35 [OK] ADHÉRENTS | Modifier la fiche (PUT) | gest PUT /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 48ms trace=recette-02a89af05c72
2026-10-05T19:16:35 [OK] ADHÉRENTS | PUT avec version obsolète -> 409 | gest PUT /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 409 (attendu [409]) 20ms trace=recette-30328482fec5 code=ADHERENT_VERSION_OBSOLETE
2026-10-05T19:16:35 [OK] ADHÉRENTS | Modifier sans permission (DAF) | daf PUT /adherents/62a2fc35-ec8b-452d-a213-005be5499826/coordonnees -> 403 (attendu [403]) 30ms trace=recette-71ac9e52515a code=ACCES_REFUSE
2026-10-05T19:16:35 [OK] ADHÉRENTS | Agent hors portefeuille : fiche refusée | agent GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 403 (attendu [403]) 24ms trace=recette-bd45e5a89171 code=PERIMETRE_ADHERENT_REFUSE
2026-10-05T19:16:35 [OK] ADHÉRENTS | Téléverser la CNI (0) avec dates (ignorées, V23) | gest POST /documents?type=CNI&adherentId=62a2fc35-ec8b-452d-a213-005be5499826&valideDu=2020-01-01&valideJusquau=2021-01-01 -> 201 (attendu [201]) 135ms trace=recette-8f2dec65b0ac
2026-10-05T19:16:36 [OK] ADHÉRENTS | Téléverser le formulaire d'adhésion (0) | gest POST /documents?type=FORMULAIRE_ADHESION&adherentId=62a2fc35-ec8b-452d-a213-005be5499826 -> 201 (attendu [201]) 36ms trace=recette-74db2bba8adc
2026-10-05T19:16:36 [OK] ADHÉRENTS | Téléverser la CNI (1) avec dates (ignorées, V23) | gest POST /documents?type=CNI&adherentId=ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1&valideDu=2020-01-01&valideJusquau=2021-01-01 -> 201 (attendu [201]) 31ms trace=recette-47ebbf0e2db9
2026-10-05T19:16:36 [OK] ADHÉRENTS | Téléverser le formulaire d'adhésion (1) | gest POST /documents?type=FORMULAIRE_ADHESION&adherentId=ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1 -> 201 (attendu [201]) 38ms trace=recette-49a8775be58b
2026-10-05T19:16:36 [OK] ADHÉRENTS | Téléverser la CNI (2) avec dates (ignorées, V23) | gest POST /documents?type=CNI&adherentId=12c17860-eec5-4bfa-845d-45772c48af99&valideDu=2020-01-01&valideJusquau=2021-01-01 -> 201 (attendu [201]) 34ms trace=recette-9c0c092f1d53
2026-10-05T19:16:36 [OK] ADHÉRENTS | Téléverser le formulaire d'adhésion (2) | gest POST /documents?type=FORMULAIRE_ADHESION&adherentId=12c17860-eec5-4bfa-845d-45772c48af99 -> 201 (attendu [201]) 38ms trace=recette-1b5459c56846
2026-10-05T19:16:36 [OK] ADHÉRENTS | Téléverser la CNI (3) avec dates (ignorées, V23) | gest POST /documents?type=CNI&adherentId=3d711615-e87f-4693-89a9-b4785af8194b&valideDu=2020-01-01&valideJusquau=2021-01-01 -> 201 (attendu [201]) 35ms trace=recette-77705c711bbd
2026-10-05T19:16:36 [OK] ADHÉRENTS | Téléverser le formulaire d'adhésion (3) | gest POST /documents?type=FORMULAIRE_ADHESION&adherentId=3d711615-e87f-4693-89a9-b4785af8194b -> 201 (attendu [201]) 33ms trace=recette-8987e4325980
2026-10-05T19:16:36 [OK] ADHÉRENTS | Téléverser une pièce | gest POST /documents?type=JUSTIFICATIF_RESIDENCE&adherentId=62a2fc35-ec8b-452d-a213-005be5499826 -> 201 (attendu [201]) 31ms trace=recette-70f2e8d73443
2026-10-05T19:16:36 [OK] ADHÉRENTS | Même fichier deux fois -> 409 | gest POST /documents?type=JUSTIFICATIF_RESIDENCE&adherentId=62a2fc35-ec8b-452d-a213-005be5499826 -> 409 (attendu [409]) 30ms trace=recette-e994be5c030d code=DOCUMENT_DOUBLON
2026-10-05T19:16:36 [OK] ADHÉRENTS | Fichier non autorisé (texte) -> 400/415 | gest POST /documents?type=CNI&adherentId=62a2fc35-ec8b-452d-a213-005be5499826 -> 400 (attendu [400, 415]) 23ms trace=recette-0e83074f7ec1 code=DOCUMENT_TYPE_NON_AUTORISE
2026-10-05T19:16:36 [OK] ADHÉRENTS | Lister les documents de l'adhérent | gest GET /documents?adherentId=62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 25ms trace=recette-3f8ae4b5ab19
2026-10-05T19:16:36 [OK] ADHÉRENTS | Métadonnées d'un document | gest GET /documents/65019189-4d48-4a47-8462-5126e081e397/metadonnees -> 200 (attendu [200]) 19ms trace=recette-c6a6fcd9627b
2026-10-05T19:16:36 [OK] ADHÉRENTS | Télécharger un document | gest GET /documents/65019189-4d48-4a47-8462-5126e081e397 -> 200 (attendu [200]) 27ms trace=recette-9214f253b604
2026-10-05T19:16:36 [OK] ADHÉRENTS | Marquer un document vérifié (Gestionnaire) | gest POST /documents/ebbf4ab2-b066-4768-9b78-bc9c3c065250/statut -> 200 (attendu [200]) 39ms trace=recette-2ed6c4b11be2
2026-10-05T19:16:36 [OK] ADHÉRENTS | Statut de document sans permission (DAF) | daf POST /documents/ebbf4ab2-b066-4768-9b78-bc9c3c065250/statut -> 403 (attendu [403]) 21ms trace=recette-2576a2e2e61d code=ACCES_REFUSE

===== ADHÉRENTS — frais, activation, contrôle DGA =====
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Configuration du frais | gest GET /frais-adhesion/configuration -> 200 (attendu [200]) 40ms trace=recette-d8d81163d774
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Enregistrer le frais d'adhésion (0) | gest POST /adherents/62a2fc35-ec8b-452d-a213-005be5499826/frais-adhesion -> 201 (attendu [201]) 95ms trace=recette-094dec534e88
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Enregistrer le frais d'adhésion (1) | gest POST /adherents/ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1/frais-adhesion -> 201 (attendu [201]) 38ms trace=recette-d837c9bd911b
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Enregistrer le frais d'adhésion (2) | gest POST /adherents/12c17860-eec5-4bfa-845d-45772c48af99/frais-adhesion -> 201 (attendu [201]) 36ms trace=recette-3573fd9bd639
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Enregistrer le frais d'adhésion (3) | gest POST /adherents/3d711615-e87f-4693-89a9-b4785af8194b/frais-adhesion -> 201 (attendu [201]) 45ms trace=recette-0017aa605cc7
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Frais de l'adhérent | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/frais-adhesion -> 200 (attendu [200]) 29ms trace=recette-b1ed8fafebbc
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Second frais pour le même adhérent -> 409 | gest POST /adherents/62a2fc35-ec8b-452d-a213-005be5499826/frais-adhesion -> 409 (attendu [409]) 25ms trace=recette-70f101ab4ecd code=FRAIS_ADHESION_DEJA_ENREGISTRE
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Gestionnaire : liste des frais refusée (V23 §6) | gest GET /frais-adhesion -> 403 (attendu [403]) 17ms trace=recette-57e18f1b2a0b code=ACCES_REFUSE
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | DAF : liste des frais | daf GET /frais-adhesion -> 200 (attendu [200]) 53ms trace=recette-b58e2dceb1ec
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | DAF : synthèse des frais | daf GET /frais-adhesion/synthese -> 200 (attendu [200]) 30ms trace=recette-1b3a7b906402
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | DAF : rapprochement des frais | daf GET /frais-adhesion/rapprochement -> 200 (attendu [200]) 44ms trace=recette-540182687bd6
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Synthèse des frais d'un agent | dga GET /frais-adhesion/agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/synthese -> 200 (attendu [200]) 22ms trace=recette-b3d28fe66795
2026-10-05T19:16:36 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Consulter un frais | daf GET /frais-adhesion/f652a6a5-6044-492c-af35-b9e459b15be1 -> 200 (attendu [200]) 32ms trace=recette-6eeef2aeff53
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Gestionnaire ne valide pas le frais (403) | gest POST /frais-adhesion/f652a6a5-6044-492c-af35-b9e459b15be1/valider -> 403 (attendu [403]) 21ms trace=recette-8159ee66e50b code=ACCES_REFUSE
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | DAF valide le frais (0) | daf POST /frais-adhesion/f652a6a5-6044-492c-af35-b9e459b15be1/valider -> 200 (attendu [200]) 25ms trace=recette-264520f3cc25
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | DAF valide le frais (1) | daf POST /frais-adhesion/626b7479-08ae-4d5e-8e8d-90163e5e82b7/valider -> 200 (attendu [200]) 28ms trace=recette-b9763155b5ad
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | DAF valide le frais (2) | daf POST /frais-adhesion/2dd3278b-0a8a-42d1-a036-0b2940a269fb/valider -> 200 (attendu [200]) 30ms trace=recette-d35732d14b63
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | DAF signale une anomalie (frais 3, montant 800) | daf POST /frais-adhesion/69881148-956a-4117-92fc-51aab6078d32/anomalie -> 200 (attendu [200]) 47ms trace=recette-9bbe687f9472
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | DAF résout l'anomalie | daf POST /frais-adhesion/69881148-956a-4117-92fc-51aab6078d32/resoudre-anomalie -> 200 (attendu [200]) 36ms trace=recette-54f098437553
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | DAF valide le frais (3) après résolution | daf POST /frais-adhesion/69881148-956a-4117-92fc-51aab6078d32/valider -> 200 (attendu [200]) 29ms trace=recette-1714565e0a05
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Vérification avant activation | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/activation -> 200 (attendu [200]) 71ms trace=recette-b2665817370e
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Statut d'activation | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/statut-activation -> 200 (attendu [200]) 32ms trace=recette-e70b61e2a3c2
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Relire avant activation (0) | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 16ms trace=recette-9395e2011343
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Activer l'adhérent (0) | gest POST /adherents/62a2fc35-ec8b-452d-a213-005be5499826/activer -> 200 (attendu [200]) 160ms trace=recette-f54f4c9ce24b
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Relire avant activation (1) | gest GET /adherents/ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1 -> 200 (attendu [200]) 22ms trace=recette-d14b65ddb552
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Activer l'adhérent (1) | gest POST /adherents/ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1/activer -> 200 (attendu [200]) 118ms trace=recette-0acacd54e58c
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Relire avant activation (2) | gest GET /adherents/12c17860-eec5-4bfa-845d-45772c48af99 -> 200 (attendu [200]) 17ms trace=recette-5aeee7cc2927
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Activer l'adhérent (2) | gest POST /adherents/12c17860-eec5-4bfa-845d-45772c48af99/activer -> 200 (attendu [200]) 154ms trace=recette-7eb5e8257c48
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Relire avant activation (3) | gest GET /adherents/3d711615-e87f-4693-89a9-b4785af8194b -> 200 (attendu [200]) 26ms trace=recette-66c578c36352
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Activer l'adhérent (3) | gest POST /adherents/3d711615-e87f-4693-89a9-b4785af8194b/activer -> 200 (attendu [200]) 116ms trace=recette-bf35f02c544b
2026-10-05T19:16:37 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Activer sans permission (DGA) | dga POST /adherents/62a2fc35-ec8b-452d-a213-005be5499826/activer -> 403 (attendu [403]) 18ms trace=recette-e275e0b28390 code=ACCES_REFUSE
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Synthèse workflow | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/synthese-workflow -> 200 (attendu [200]) 81ms trace=recette-07ea190f4a79
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Contrôle DGA courant | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/controle-dga -> 200 (attendu [200]) 35ms trace=recette-e7210744116f
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Contrôles DGA de l'adhérent | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/controles-dga -> 200 (attendu [200]) 36ms trace=recette-15c3a6608851
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | File du contrôle DGA (DG, V23) | dg GET /controles-dga -> 200 (attendu [200]) 27ms trace=recette-dd8e3e2d1a19
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Synthèse du contrôle DGA | dga GET /controles-dga/synthese -> 200 (attendu [200]) 17ms trace=recette-050a6ff5c228
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Gestionnaire ne démarre pas un contrôle (403) | gest POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/demarrer -> 403 (attendu [403]) 16ms trace=recette-296485ba739e code=ACCES_REFUSE
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Démarrer le contrôle (DG, V23) | dg POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/demarrer -> 200 (attendu [200]) 37ms trace=recette-6734cdba8015
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Lire le contrôle | dg GET /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa -> 200 (attendu [200]) 27ms trace=recette-ddc0999c8305
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Constat « conforme » sur un document entier refusé (CNI) | dg POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/documents/ff333823-58b1-417b-8c9c-c7cb59b9875d/verifier -> 400 (attendu [400]) 20ms trace=recette-f2b173904fc8 code=CONTROLE_DGA_CONSTAT_INVALIDE
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Relire le contrôle | dg GET /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa -> 200 (attendu [200]) 18ms trace=recette-77674156d4d7
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Vérifier le champ nom | dg POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/champs/21992fb3-0bfc-43dd-b0be-377ac4a4737e/verifier -> 200 (attendu [200]) 49ms trace=recette-00d4755f9f15
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Vérifier le champ prenoms | dg POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/champs/5a7663bb-80cb-4ccf-bccf-3b3296dda49c/verifier -> 200 (attendu [200]) 40ms trace=recette-68b8db5d9312
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Vérifier le champ dateNaissance | dg POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/champs/6515ef17-9b4b-48ee-af5d-ced2d472d5ba/verifier -> 200 (attendu [200]) 31ms trace=recette-49196b4845e1
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Vérifier le champ numeroCni | dg POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/champs/f87c295b-3a6a-42c8-9a40-47a50a13d837/verifier -> 200 (attendu [200]) 35ms trace=recette-1d0edf3fc428
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Vérifier le champ presence | dg POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/champs/aeacd2bd-72fd-420b-ac38-a32365c35c2d/verifier -> 200 (attendu [200]) 35ms trace=recette-89f9f87d7062
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Vérifier le champ localisation | dg POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/champs/ca175b85-b8a5-43ba-b8fb-30ca93980f0d/verifier -> 200 (attendu [200]) 34ms trace=recette-c34e9fb3bcc0
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Terminer : valider | dg POST /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/terminer -> 200 (attendu [200]) 87ms trace=recette-e2a88e2946d5
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Journal du contrôle | dga GET /controles-dga/a8c28c5f-f4c1-4b9e-b06e-e19a78d6a7aa/journal -> 200 (attendu [200]) 30ms trace=recette-c5a8ae2782af
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Contrôle DGA de l'adhérent 1 | gest GET /adherents/ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1/controle-dga -> 200 (attendu [200]) 22ms trace=recette-9b381da52682
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Démarrer (DGA) | dga POST /controles-dga/84cfd34f-e8ef-4d94-8519-06ea77ed7e69/demarrer -> 200 (attendu [200]) 29ms trace=recette-7221cee0b043
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Terminer : demander une correction | dga POST /controles-dga/84cfd34f-e8ef-4d94-8519-06ea77ed7e69/terminer -> 200 (attendu [200]) 44ms trace=recette-976e92c55a17
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Retransmettre au contrôle DGA | gest POST /adherents/ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1/soumettre-dga -> 200 (attendu [200, 201]) 73ms trace=recette-bdf226e02d49
2026-10-05T19:16:38 [OK] ADHÉRENTS — frais, activation, contrôle DGA | Statut de validation : VALIDE après contrôle DGA | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/statut-validation -> 200 (attendu [200]) 20ms trace=recette-ce9decd62045

===== ADHÉRENTS — workflow de modification officielle =====
2026-10-05T19:16:38 [OK] ADHÉRENTS — workflow de modification officielle | Soumission directe du dossier : passe par l'activation + contrôle DGA | gest POST /adherents/12c17860-eec5-4bfa-845d-45772c48af99/soumettre -> 409 (attendu [409]) 23ms trace=recette-e30c45cdbc45 code=ADHERENT_VALIDATION_PAR_CONTROLE_DGA
2026-10-05T19:16:38 [OK] ADHÉRENTS — workflow de modification officielle | Fiche (dossier validé par le contrôle DGA) | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 14ms trace=recette-36e3341a14f3
2026-10-05T19:16:38 [OK] ADHÉRENTS — workflow de modification officielle | Demande de modification à examiner | gest POST /adherents/62a2fc35-ec8b-452d-a213-005be5499826/demandes-modification -> 201 (attendu [200, 201]) 45ms trace=recette-7eb582106552
2026-10-05T19:16:38 [OK] ADHÉRENTS — workflow de modification officielle | Gestionnaire : aucune demande à décider (V23) | gest GET /demandes-validation/en-attente -> 200 (attendu [200]) 18ms trace=recette-f56573dda76e
2026-10-05T19:16:38 [OK] ADHÉRENTS — workflow de modification officielle | DGA : demande visible | dga GET /demandes-validation/en-attente -> 200 (attendu [200]) 21ms trace=recette-75283a0a60a9
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | PCA : aucune décision (403) | pca POST /demandes-validation/719b0062-bf03-412e-81e6-8d071e888255/approuver -> 403 (attendu [403]) 12ms trace=recette-f48910ee9dd4 code=DEMANDE_VALIDATION_NON_AUTORISEE
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Gestionnaire : approbation refusée (403) | gest POST /demandes-validation/719b0062-bf03-412e-81e6-8d071e888255/approuver -> 403 (attendu [403]) 13ms trace=recette-184a4462296d code=DEMANDE_AUTO_VALIDATION_INTERDITE
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Détail de la demande | gest GET /demandes-validation/719b0062-bf03-412e-81e6-8d071e888255 -> 200 (attendu [200]) 17ms trace=recette-b2851005be1a
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Éléments de la demande | dga GET /demandes-validation/719b0062-bf03-412e-81e6-8d071e888255/elements -> 200 (attendu [200]) 15ms trace=recette-dc8435df71d2
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Joindre un justificatif | gest POST /demandes-validation/719b0062-bf03-412e-81e6-8d071e888255/justificatifs -> 201 (attendu [200, 201, 409]) 27ms trace=recette-45e0b448df58
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Justificatifs | dga GET /demandes-validation/719b0062-bf03-412e-81e6-8d071e888255/justificatifs -> 200 (attendu [200]) 17ms trace=recette-65b3211f1911
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Approuver la modification (DG, V23) | dg POST /demandes-validation/719b0062-bf03-412e-81e6-8d071e888255/approuver -> 200 (attendu [200]) 49ms trace=recette-0afa55dfb8b3
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Décisions de la demande | dga GET /demandes-validation/719b0062-bf03-412e-81e6-8d071e888255/decisions -> 200 (attendu [200]) 24ms trace=recette-f364e5ee4926
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Fiche validée | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 12ms trace=recette-ff90fc0bdbad
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Dossier validé : modification directe refusée | gest PUT /adherents/62a2fc35-ec8b-452d-a213-005be5499826/coordonnees -> 409 (attendu [409]) 15ms trace=recette-8b15c08f81bd code=ADHERENT_MODIFICATION_PAR_DEMANDE
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Demande de modification (dossier validé) | gest POST /adherents/62a2fc35-ec8b-452d-a213-005be5499826/demandes-modification -> 201 (attendu [200, 201]) 65ms trace=recette-18c150bdb268
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Demander une correction (DGA) | dga POST /demandes-validation/c80fa849-6934-465c-aabd-a8000b444cda/demander-correction -> 200 (attendu [200]) 28ms trace=recette-0fc8288d3e66
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Resoumettre corrigée | gest POST /demandes-validation/c80fa849-6934-465c-aabd-a8000b444cda/resoumettre -> 200 (attendu [200]) 51ms trace=recette-1b6b42270354
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Approuver la modification (DGA) | dga POST /demandes-validation/c80fa849-6934-465c-aabd-a8000b444cda/approuver -> 200 (attendu [200]) 46ms trace=recette-81cf9f8706b5
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Modification appliquée | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/coordonnees -> 200 (attendu [200]) 13ms trace=recette-58102ec734c1
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Demande à rejeter | gest POST /adherents/62a2fc35-ec8b-452d-a213-005be5499826/demandes-modification -> 201 (attendu [200, 201]) 49ms trace=recette-dd018438fbf5
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Rejeter (DGA) | dga POST /demandes-validation/2151f398-8393-469f-9ef7-9f5c65e4b122/rejeter -> 200 (attendu [200]) 31ms trace=recette-a66109538b02
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Demande à annuler (brouillon) | gest POST /adherents/62a2fc35-ec8b-452d-a213-005be5499826/demandes-modification -> 201 (attendu [200, 201]) 32ms trace=recette-06e64716ccdb
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Soumettre le brouillon | gest POST /demandes-validation/a86e9bd0-7b49-4821-80fd-5f06eb7965bb/soumettre -> 200 (attendu [200]) 57ms trace=recette-ba95cb86e268
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Annuler la demande | gest POST /demandes-validation/a86e9bd0-7b49-4821-80fd-5f06eb7965bb/annuler -> 200 (attendu [200]) 31ms trace=recette-b5b5604f8735
2026-10-05T19:16:39 [OK] ADHÉRENTS — workflow de modification officielle | Demandes de modification de l'adhérent | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/demandes-modification -> 200 (attendu [200]) 32ms trace=recette-fa7d2d2d3439
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Détail d'une demande de modification | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/demandes-modification/c80fa849-6934-465c-aabd-a8000b444cda -> 200 (attendu [200]) 24ms trace=recette-27dbf3d2dc3a
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Relire avant demande générique | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 13ms trace=recette-5f1ae46ba850
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Créer une demande (route générique) | gest POST /demandes-validation -> 201 (attendu [200, 201]) 59ms trace=recette-35a1452d313b
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Approuver la demande générique (DGA) | dga POST /demandes-validation/9164a675-1291-4d09-a4cc-37f65716e177/approuver -> 200 (attendu [200]) 49ms trace=recette-1fdc316d038e
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Historique de validation | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/historique-validation -> 200 (attendu [200]) 33ms trace=recette-2d8a656c790d
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Liste des demandes (filtre) | dga GET /demandes-validation?taille=5 -> 200 (attendu [200]) 37ms trace=recette-cf2f50ac7e5d
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Changer de pack | gest POST /adherents/12c17860-eec5-4bfa-845d-45772c48af99/pack -> 200 (attendu [200]) 42ms trace=recette-5f33d9ce1f3b
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Changement de statut direct (dossier non validé) | gest POST /adherents/12c17860-eec5-4bfa-845d-45772c48af99/statut -> 409 (attendu [204, 409]) 22ms trace=recette-838c861a8114 code=ADHERENT_EN_VALIDATION
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Changement de statut sans motif -> 400 | gest POST /adherents/12c17860-eec5-4bfa-845d-45772c48af99/statut -> 400 (attendu [400]) 15ms trace=recette-7e81cdf68212 code=VALIDATION_ECHOUEE
2026-10-05T19:16:40 [OK] ADHÉRENTS — workflow de modification officielle | Relances de l'adhérent | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/relances -> 200 (attendu [200]) 19ms trace=recette-0894aa96766c

===== AGENTS — portefeuilles =====
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Affecter l'adhérent 0 à l'agent 1 | gest POST /portefeuilles/affecter -> 204 (attendu [204]) 60ms trace=recette-727b765ada62
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Affecter l'adhérent 1 à l'agent 1 | gest POST /portefeuilles/affecter -> 204 (attendu [204]) 31ms trace=recette-bf5bcbc5fadb
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Affecter l'adhérent 2 à l'agent 1 | gest POST /portefeuilles/affecter -> 204 (attendu [204]) 23ms trace=recette-aff4f5350301
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Affecter sans permission (DAF) | daf POST /portefeuilles/affecter -> 403 (attendu [403]) 13ms trace=recette-10244b9cc4b8 code=ACCES_REFUSE
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Agent responsable | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/agent -> 200 (attendu [200]) 21ms trace=recette-ecdb7400e81c
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Portefeuille de l'agent | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/portefeuille -> 200 (attendu [200]) 25ms trace=recette-2a1f315f2419
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Résumé du portefeuille | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/portefeuille/resume -> 200 (attendu [200]) 23ms trace=recette-98c1707a776f
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Transférer à l'agent 2 | dga POST /portefeuilles/transferer -> 204 (attendu [204]) 38ms trace=recette-69a58c98bf13
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Historique du portefeuille | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/portefeuille/historique -> 200 (attendu [200]) 23ms trace=recette-fda9854b4a9b
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Retirer du portefeuille | dga POST /portefeuilles/retirer -> 204 (attendu [204]) 24ms trace=recette-380120b4058a
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Adhérents sans agent (sans zone, V23) | gest GET /portefeuilles/sans-agent -> 200 (attendu [200]) 21ms trace=recette-93cd1006d2ba
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Éligibles CNPS du portefeuille | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/portefeuille/cnps/eligibles -> 200 (attendu [200]) 16ms trace=recette-acce3f5af718
2026-10-05T19:16:40 [OK] AGENTS — portefeuilles | Proches du seuil CNPS | dga GET /agents/ab9bd904-f323-43ca-a9c7-c60a540288d6/portefeuille/cnps/proches-seuil -> 200 (attendu [200]) 21ms trace=recette-e60566364a18

===== COTISATIONS =====
2026-10-05T19:16:40 [OK] COTISATIONS | Contexte par matricule | gest GET /paiements/contexte-adherent?matricule=COSITI-00001 -> 200 (attendu [200]) 41ms trace=recette-4db9d3814d90
2026-10-05T19:16:40 [OK] COTISATIONS | Adhérent préinscrit sans frais | gest POST /adherents -> 201 (attendu [201]) 22ms trace=recette-b732a5d7744e
2026-10-05T19:16:40 [OK] COTISATIONS | Contexte : non cotisable sans frais (V23 §5) | gest GET /paiements/contexte-adherent?matricule=COSITI-00005 -> 200 (attendu [200]) 25ms trace=recette-d3f2ee55a045
2026-10-05T19:16:40 [OK] COTISATIONS | Cotisation refusée sans frais validé (V23 §5) | gest POST /paiements -> 409 (attendu [409]) 62ms trace=recette-b2afc12a601e code=COTISATION_FRAIS_ADHESION_NON_VALIDE
2026-10-05T19:16:40 [OK] COTISATIONS | Première cotisation sans pack -> 400 | gest POST /paiements -> 400 (attendu [400]) 29ms trace=recette-09883ebb8970 code=COTISATION_PACK_REQUIS
2026-10-05T19:16:40 [OK] COTISATIONS | Sécurité sociale < 700 -> 400 | gest POST /paiements -> 400 (attendu [400]) 24ms trace=recette-54bf418c0228 code=COTISATION_SECURITE_SOCIALE_INSUFFISANTE
2026-10-05T19:16:40 [OK] COTISATIONS | Épargne alimentée < 300 -> 400 | gest POST /paiements -> 400 (attendu [400]) 29ms trace=recette-bb76a5eaf054 code=COTISATION_EPARGNE_INSUFFISANTE
2026-10-05T19:16:40 [OK] COTISATIONS | Total ≠ somme -> 400 | gest POST /paiements -> 400 (attendu [400]) 22ms trace=recette-09e671b43ec1 code=COTISATION_REPARTITION_INCOHERENTE
2026-10-05T19:16:40 [OK] COTISATIONS | Cotisation 1500 = 700 + 800 (pack choisi) | gest POST /paiements -> 201 (attendu [201]) 63ms trace=recette-583e86a65565
2026-10-05T19:16:41 [OK] COTISATIONS | Même clé, même requête -> 200 | gest POST /paiements -> 200 (attendu [200]) 15ms trace=recette-e8123efc1c54
2026-10-05T19:16:41 [OK] COTISATIONS | Même clé, autre requête -> 409 | gest POST /paiements -> 409 (attendu [409]) 22ms trace=recette-1a9138338c8c code=IDEMPOTENCY_KEY_CONFLIT
2026-10-05T19:16:41 [OK] COTISATIONS | Sans clé d'idempotence -> 400 | gest POST /paiements -> 400 (attendu [400]) 11ms trace=recette-8ce67be98b71 code=IDEMPOTENCY_KEY_MANQUANTE
2026-10-05T19:16:41 [OK] COTISATIONS | Mobile money sans référence -> 400 | gest POST /paiements -> 400 (attendu [400]) 21ms trace=recette-1374e10ae8f3 code=PAIEMENT_REFERENCE_MANQUANTE
2026-10-05T19:16:41 [OK] COTISATIONS | Cotisation sans répartition (proposition serveur) | gest POST /paiements -> 201 (attendu [201]) 41ms trace=recette-ffb2420b2816
2026-10-05T19:16:41 [OK] COTISATIONS | Cotisation adhérent 1 (à rejeter) | gest POST /paiements -> 201 (attendu [201]) 45ms trace=recette-3e181c9b9032
2026-10-05T19:16:41 [OK] COTISATIONS | Cotisation adhérent 1 (incohérence) | gest POST /paiements -> 201 (attendu [201]) 32ms trace=recette-de6c68a54d6d
2026-10-05T19:16:41 [OK] COTISATIONS | Cotisation mobile money | gest POST /paiements -> 201 (attendu [201]) 42ms trace=recette-e61a905affcd
2026-10-05T19:16:41 [OK] COTISATIONS | Référence de transaction déjà utilisée -> 409 | gest POST /paiements -> 409 (attendu [409]) 24ms trace=recette-1762ee19f0e3 code=PAIEMENT_REFERENCE_DEJA_UTILISEE
2026-10-05T19:16:41 [OK] COTISATIONS | Brouillon de cotisation | gest POST /paiements?brouillon=true -> 201 (attendu [201]) 35ms trace=recette-04eb90fab656
2026-10-05T19:16:41 [OK] COTISATIONS | Corriger le brouillon sans nouvelle répartition -> 400 | gest POST /paiements/3a54eb59-c661-426e-8e3a-09ea1a4532d1/corriger -> 400 (attendu [400]) 20ms trace=recette-02b9c7cd807b code=COTISATION_REPARTITION_REQUISE
2026-10-05T19:16:41 [OK] COTISATIONS | Corriger le brouillon | gest POST /paiements/3a54eb59-c661-426e-8e3a-09ea1a4532d1/corriger -> 200 (attendu [200]) 23ms trace=recette-6c53d8025d35
2026-10-05T19:16:41 [OK] COTISATIONS | Soumettre le brouillon | gest POST /paiements/3a54eb59-c661-426e-8e3a-09ea1a4532d1/soumettre -> 200 (attendu [200]) 27ms trace=recette-0ec85fc16149
2026-10-05T19:16:41 [OK] COTISATIONS | Vérifier un doublon de cotisation | gest POST /paiements/verifier-doublon -> 200 (attendu [200]) 27ms trace=recette-1b6937bc0b53
2026-10-05T19:16:41 [OK] COTISATIONS | Consulter une cotisation | gest GET /paiements/b7a939bf-d1d1-42b1-93c0-0f4a58fa4d1f -> 200 (attendu [200]) 14ms trace=recette-3a830181ed7b
2026-10-05T19:16:41 [OK] COTISATIONS | Reçu (identité, répartition) | gest GET /paiements/b7a939bf-d1d1-42b1-93c0-0f4a58fa4d1f/recu -> 200 (attendu [200]) 18ms trace=recette-a7ad5826d052
2026-10-05T19:16:41 [OK] COTISATIONS | Historique des statuts | gest GET /paiements/b7a939bf-d1d1-42b1-93c0-0f4a58fa4d1f/historique-statuts -> 200 (attendu [200]) 21ms trace=recette-1706fadeab64
2026-10-05T19:16:41 [OK] COTISATIONS | Statut de validation | gest GET /paiements/b7a939bf-d1d1-42b1-93c0-0f4a58fa4d1f/statut-validation -> 200 (attendu [200]) 23ms trace=recette-5af04a5aee36
2026-10-05T19:16:41 [OK] COTISATIONS | Gestionnaire : journal des cotisations refusé (V23 §6) | gest GET /paiements -> 403 (attendu [403]) 17ms trace=recette-51a66cf5a82b code=ACCES_REFUSE
2026-10-05T19:16:41 [OK] COTISATIONS | Gestionnaire : statistiques refusées | gest GET /paiements/statistiques/quotidiennes -> 403 (attendu [403]) 12ms trace=recette-2bc58c4c0f76 code=ACCES_REFUSE
2026-10-05T19:16:41 [OK] COTISATIONS | DAF : journal des cotisations | daf GET /paiements?statut=A_CONTROLER&taille=50 -> 200 (attendu [200]) 16ms trace=recette-8c207aa69fe5
2026-10-05T19:16:41 [OK] COTISATIONS | DAF : recherche par matricule | daf GET /paiements?adherentMatricule=COSITI-00001 -> 200 (attendu [200]) 17ms trace=recette-efd28710ad94
2026-10-05T19:16:41 [OK] COTISATIONS | DAF : statistiques du jour | daf GET /paiements/statistiques/quotidiennes -> 200 (attendu [200]) 20ms trace=recette-8d2562c87c66
2026-10-05T19:16:41 [OK] COTISATIONS | Synthèse : rien de crédité avant validation | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/synthese-cotisations -> 200 (attendu [200]) 26ms trace=recette-b9d64bcf5898
2026-10-05T19:16:41 [OK] COTISATIONS | Chef hors équipe : confirmation refusée | chef POST /paiements/b7a939bf-d1d1-42b1-93c0-0f4a58fa4d1f/confirmer-chef -> 403 (attendu [403]) 13ms trace=recette-138ebf0d03b8 code=PAIEMENT_HORS_PERIMETRE_CHEF
2026-10-05T19:16:42 [OK] COTISATIONS | Gestionnaire ne valide pas (403) | gest POST /paiements/b7a939bf-d1d1-42b1-93c0-0f4a58fa4d1f/valider -> 403 (attendu [403]) 10ms trace=recette-837fb47a3804 code=ACCES_REFUSE
2026-10-05T19:16:42 [OK] COTISATIONS | DAF valide la cotisation 1 | daf POST /paiements/b7a939bf-d1d1-42b1-93c0-0f4a58fa4d1f/valider -> 200 (attendu [200]) 74ms trace=recette-4286069d5332
2026-10-05T19:16:42 [OK] COTISATIONS | Double validation -> 409 | daf POST /paiements/b7a939bf-d1d1-42b1-93c0-0f4a58fa4d1f/valider -> 409 (attendu [409]) 12ms trace=recette-d0027aee3c4e code=PAIEMENT_DEJA_VALIDE
2026-10-05T19:16:42 [OK] COTISATIONS | DAF valide la cotisation 2 | daf POST /paiements/c43306b9-c94a-4875-8cab-1b1776f06453/valider -> 200 (attendu [200]) 65ms trace=recette-0fdaef2042d5
2026-10-05T19:16:42 [OK] COTISATIONS | Affectations = répartition saisie | daf GET /paiements/b7a939bf-d1d1-42b1-93c0-0f4a58fa4d1f/affectations -> 200 (attendu [200]) 19ms trace=recette-3248efb2bf55
2026-10-05T19:16:42 [OK] COTISATIONS | Synthèse après validation | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/synthese-cotisations -> 200 (attendu [200]) 20ms trace=recette-2de606fec244
2026-10-05T19:16:42 [OK] COTISATIONS | Résumé des cotisations | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/resume-cotisations -> 200 (attendu [200]) 37ms trace=recette-f443c046e8b3
2026-10-05T19:16:42 [OK] COTISATIONS | DAF rejette la cotisation 3 | daf POST /paiements/c42b96c1-9fd0-42d6-b719-401174b4e7e2/rejeter -> 200 (attendu [200]) 27ms trace=recette-a3070e6bd09e
2026-10-05T19:16:42 [OK] COTISATIONS | DAF signale une incohérence (4) | daf POST /paiements/69cd240b-1b58-4f0d-9e06-1a81c772c95b/signaler-incoherence -> 200 (attendu [200]) 30ms trace=recette-926a0ba9ccd9
2026-10-05T19:16:42 [OK] COTISATIONS | Validation d'une cotisation incohérente -> 409 | daf POST /paiements/69cd240b-1b58-4f0d-9e06-1a81c772c95b/valider -> 409 (attendu [409]) 16ms trace=recette-f8fecf6fe126 code=PAIEMENT_TRANSITION_INTERDITE
2026-10-05T19:16:42 [OK] COTISATIONS | Demande de correction (incohérence) | gest POST /paiements/69cd240b-1b58-4f0d-9e06-1a81c772c95b/demandes-correction -> 201 (attendu [200, 201]) 71ms trace=recette-b20e8f243ad8
2026-10-05T19:16:42 [OK] COTISATIONS | DGA ne décide pas une correction financière | dga POST /demandes-validation/1930b19c-1c1c-4af2-a3ff-0738eefb03c1/approuver -> 403 (attendu [403]) 15ms trace=recette-2faba75f3690 code=VALIDATION_FINANCIERE_NON_AUTORISEE
2026-10-05T19:16:42 [OK] COTISATIONS | DAF approuve la correction | daf POST /demandes-validation/1930b19c-1c1c-4af2-a3ff-0738eefb03c1/approuver -> 200 (attendu [200]) 98ms trace=recette-7f25d23bc16f
2026-10-05T19:16:42 [OK] COTISATIONS | Cotisation corrigée, rouverte au contrôle | daf GET /paiements/69cd240b-1b58-4f0d-9e06-1a81c772c95b -> 200 (attendu [200]) 26ms trace=recette-ed422bc695b1
2026-10-05T19:16:42 [OK] COTISATIONS | Demandes de correction de la cotisation | daf GET /paiements/69cd240b-1b58-4f0d-9e06-1a81c772c95b/demandes-correction -> 200 (attendu [200]) 28ms trace=recette-331b724d0636
2026-10-05T19:16:42 [OK] COTISATIONS | Historique de validation de la cotisation | daf GET /paiements/69cd240b-1b58-4f0d-9e06-1a81c772c95b/historique-validation -> 200 (attendu [200]) 24ms trace=recette-fd52bb3bc2e0
2026-10-05T19:16:42 [OK] COTISATIONS | DAF valide la cotisation mobile money | daf POST /paiements/4178bc97-85e5-451d-bd47-abe8dd79e397/valider -> 200 (attendu [200]) 78ms trace=recette-cf58625bd372
2026-10-05T19:16:42 [OK] COTISATIONS | Correction d'une cotisation validée | gest POST /paiements/4178bc97-85e5-451d-bd47-abe8dd79e397/demandes-correction -> 201 (attendu [200, 201]) 73ms trace=recette-e1e2dbc40d9b
2026-10-05T19:16:42 [OK] COTISATIONS | DAF approuve (réaffectation et droits recalculés) | daf POST /demandes-validation/9907c064-9ede-4101-98f4-2d7ef11f08d9/approuver -> 200 (attendu [200]) 213ms trace=recette-cd4a1354e6ee
2026-10-05T19:16:42 [OK] COTISATIONS | Affectations recalculées | daf GET /paiements/4178bc97-85e5-451d-bd47-abe8dd79e397/affectations -> 200 (attendu [200]) 20ms trace=recette-970fe5eaa620
2026-10-05T19:16:43 [OK] COTISATIONS | Annuler une cotisation | daf POST /paiements/3a54eb59-c661-426e-8e3a-09ea1a4532d1/annuler -> 204 (attendu [204, 200]) 44ms trace=recette-2b83c1e0157a
2026-10-05T19:16:43 [OK] COTISATIONS | Affectations de la cotisation 2 | daf GET /paiements/c43306b9-c94a-4875-8cab-1b1776f06453/affectations -> 200 (attendu [200]) 20ms trace=recette-6aac5afb5c31
2026-10-05T19:16:43 [OK] COTISATIONS | Ré-affectation manuelle : Épargne < 300 refusée | daf POST /paiements/c43306b9-c94a-4875-8cab-1b1776f06453/affectations -> 400 (attendu [400]) 39ms trace=recette-8545a9a522af code=COTISATION_EPARGNE_INSUFFISANTE
2026-10-05T19:16:43 [OK] COTISATIONS | Ré-affectation manuelle : Sécurité sociale < 700 refusée | daf POST /paiements/c43306b9-c94a-4875-8cab-1b1776f06453/affectations -> 400 (attendu [400]) 19ms trace=recette-d8844c847bf6 code=AFFECTATION_SECURITE_SOCIALE_INSUFFISANTE
2026-10-05T19:16:43 [OK] COTISATIONS | Ré-affectation manuelle valide (tout en Sécurité sociale) | daf POST /paiements/c43306b9-c94a-4875-8cab-1b1776f06453/affectations -> 200 (attendu [200]) 34ms trace=recette-ccc2e4666a2e
2026-10-05T19:16:43 [OK] COTISATIONS | La cotisation reflète la ré-affectation | daf GET /paiements/c43306b9-c94a-4875-8cab-1b1776f06453 -> 200 (attendu [200]) 13ms trace=recette-005ee46eb14a
2026-10-05T19:16:43 [OK] COTISATIONS | Les comptes de l'adhérent suivent la ré-affectation | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/synthese-cotisations -> 200 (attendu [200]) 23ms trace=recette-577e2590ab7a
2026-10-05T19:16:43 [OK] COTISATIONS | Ré-affectation refusée au Gestionnaire | gest POST /paiements/c43306b9-c94a-4875-8cab-1b1776f06453/affectations -> 403 (attendu [403]) 16ms trace=recette-df881f08921f code=ACCES_REFUSE

===== COTISATIONS — remises de caisse =====
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | Cotisations de l'agent 1 à remettre | gest GET /remises-caisse/a-remettre?agentId=ab9bd904-f323-43ca-a9c7-c60a540288d6 -> 200 (attendu [200]) 22ms trace=recette-e72af8155455
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | Remise : cotisation d'un autre agent -> 400 | gest POST /remises-caisse -> 400 (attendu [400]) 23ms trace=recette-dfaeea0c8a58 code=REMISE_PAIEMENT_AUTRE_AGENT
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | Déclarer la remise (agent 1) | gest POST /remises-caisse -> 201 (attendu [201]) 63ms trace=recette-a07cfaaede1b
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | Remise : cotisation déjà remise -> 409 | gest POST /remises-caisse -> 409 (attendu [409]) 17ms trace=recette-1d4a0024a931 code=REMISE_PAIEMENT_DEJA_REMIS
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | Gestionnaire : liste des remises refusée (Finances) | gest GET /remises-caisse -> 403 (attendu [403]) 18ms trace=recette-54f42512e861 code=ACCES_REFUSE
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | DAF : remises à réceptionner | daf GET /remises-caisse?statut=DECLAREE -> 200 (attendu [200]) 17ms trace=recette-69b11c233236
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | Consulter la remise | daf GET /remises-caisse/aef66bc5-c415-4200-b4f9-7cc40dc9a1b5 -> 200 (attendu [200]) 14ms trace=recette-08767b7c502a
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | Gestionnaire ne réceptionne pas (403) | gest POST /remises-caisse/aef66bc5-c415-4200-b4f9-7cc40dc9a1b5/receptionner -> 403 (attendu [403]) 16ms trace=recette-8a43d6342bae code=ACCES_REFUSE
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | DAF réceptionne avec un écart | daf POST /remises-caisse/aef66bc5-c415-4200-b4f9-7cc40dc9a1b5/receptionner -> 200 (attendu [200]) 44ms trace=recette-f6026ca2e549
2026-10-05T19:16:43 [OK] COTISATIONS — remises de caisse | Seconde réception -> 409 | daf POST /remises-caisse/aef66bc5-c415-4200-b4f9-7cc40dc9a1b5/receptionner -> 409 (attendu [409]) 13ms trace=recette-7c042de77478 code=REMISE_CAISSE_DEJA_RECEPTIONNEE

===== COTISATIONS — bilan de caisse et droits =====
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | DAF : bilan journalier numérique | daf GET /paiements/bilan-journalier -> 200 (attendu [200]) 38ms trace=recette-93fe80fb8a0a
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | Gestionnaire : bilan journalier refusé (V23 §6) | gest GET /paiements/bilan-journalier -> 403 (attendu [403]) 21ms trace=recette-deb375e8fb20 code=ACCES_REFUSE
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | Saisie de la caisse physique (Gestionnaire) | gest POST /bilans-caisse -> 201 (attendu [201, 200]) 60ms trace=recette-4d943c0efa5c
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | DAF : bilan du jour | daf GET /bilans-caisse/2026-10-05 -> 200 (attendu [200]) 19ms trace=recette-7c217e51593e
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | Gestionnaire : liste des bilans refusée (V23 §6) | gest GET /bilans-caisse -> 403 (attendu [403]) 15ms trace=recette-149281248e0e code=ACCES_REFUSE
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | DAF : liste des bilans | daf GET /bilans-caisse -> 200 (attendu [200]) 20ms trace=recette-f0c509ae5713
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | DAF valide le bilan | daf POST /bilans-caisse/2026-10-05/valider?commentaire=OK&version=0 -> 200 (attendu [200]) 24ms trace=recette-5b7210b27b17
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | Anomalie sur un bilan validé -> 409 | daf POST /bilans-caisse/2026-10-05/anomalie -> 409 (attendu [409]) 24ms trace=recette-ea78674ce8f5 code=BILAN_CAISSE_TRANSITION_INTERDITE
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | Situation des droits | gest GET /droits/adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 30ms trace=recette-b139cddc7352
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | Périodes de droits | gest GET /droits/adherents/62a2fc35-ec8b-452d-a213-005be5499826/periodes -> 200 (attendu [200]) 16ms trace=recette-77c1233dbeba
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | Retardataires | gest GET /droits/retardataires -> 200 (attendu [200]) 26ms trace=recette-c1e9c953e9ec
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | Recalcul des droits (DAF) | daf POST /droits/adherents/62a2fc35-ec8b-452d-a213-005be5499826/recalculer -> 204 (attendu [204]) 66ms trace=recette-10e75e9e2bb1
2026-10-05T19:16:43 [OK] COTISATIONS — bilan de caisse et droits | Recalcul refusé au Gestionnaire | gest POST /droits/adherents/62a2fc35-ec8b-452d-a213-005be5499826/recalculer -> 403 (attendu [403]) 15ms trace=recette-08f2c59ada05 code=ACCES_REFUSE

===== ADHÉRENTS — historiques et fin de cycle =====
2026-10-05T19:16:43 [OK] ADHÉRENTS — historiques et fin de cycle | Historique général | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/historique-general -> 200 (attendu [200]) 79ms trace=recette-ec5910a2ac06
2026-10-05T19:16:43 [OK] ADHÉRENTS — historiques et fin de cycle | Historique financier (Gestionnaire) | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/historique-financier?periode=JOUR -> 200 (attendu [200]) 45ms trace=recette-5d60a673abb2
2026-10-05T19:16:44 [OK] ADHÉRENTS — historiques et fin de cycle | Historique financier (DAF) | daf GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/historique-financier -> 200 (attendu [200]) 91ms trace=recette-e712ff2730b0
2026-10-05T19:16:44 [OK] ADHÉRENTS — historiques et fin de cycle | Historique : filtre période invalide | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/historique-general?du=2026-12-01&au=2026-01-01 -> 400 (attendu [400]) 13ms trace=recette-177bb00e0f00 code=HISTORIQUE_PERIODE_INVALIDE
2026-10-05T19:16:44 [OK] ADHÉRENTS — historiques et fin de cycle | Super Admin : historique refusé | sa GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/historique-general -> 403 (attendu [403]) 12ms trace=recette-3efafdc82ac1 code=ACCES_REFUSE
2026-10-05T19:16:44 [OK] ADHÉRENTS — historiques et fin de cycle | Journal brut (route obsolète, conservée) | gest GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826/historique -> 200 (attendu [200]) 18ms trace=recette-21de2e9a6e6d
2026-10-05T19:16:44 [OK] ADHÉRENTS — historiques et fin de cycle | Archiver un adhérent | gest POST /adherents/3d711615-e87f-4693-89a9-b4785af8194b/archiver -> 204 (attendu [204]) 23ms trace=recette-7ca462968e97
2026-10-05T19:16:44 [OK] ADHÉRENTS — historiques et fin de cycle | Cotisation sur adhérent archivé -> 409 | gest POST /paiements -> 409 (attendu [409]) 44ms trace=recette-dc2f92caa5ca code=PAIEMENT_ADHERENT_ARCHIVE

===== AGENT DE TERRAIN ET CHEF — périmètre et collecte =====
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Profil de l'agent de démonstration | agent GET /auth/moi -> 200 (attendu [200]) 31ms trace=recette-04712dd2ecca
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Retrouver l'agent de démonstration | dga GET /agents?taille=100 -> 200 (attendu [200]) 17ms trace=recette-5b746f44f522
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Affecter l'adhérent 0 à l'agent de démonstration (transfert) | dga POST /portefeuilles/transferer -> 204 (attendu [204]) 21ms trace=recette-6bae4e96e931
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Agent : liste limitée à son portefeuille | agent GET /adherents?taille=50 -> 200 (attendu [200]) 30ms trace=recette-41024b73de78
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Agent : fiche de son adhérent | agent GET /adherents/62a2fc35-ec8b-452d-a213-005be5499826 -> 200 (attendu [200]) 16ms trace=recette-be5c2ead2659
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Agent : fiche hors portefeuille refusée | agent GET /adherents/ac97a6a2-1da3-4ac4-9e7d-19e850cbd1b1 -> 403 (attendu [403]) 13ms trace=recette-5a6ed2a7d0a6 code=PERIMETRE_ADHERENT_REFUSE
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Agent : saisit une cotisation pour son adhérent | agent POST /paiements -> 201 (attendu [201]) 53ms trace=recette-843db196b13d
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Agent : cotisation hors portefeuille refusée | agent POST /paiements -> 403 (attendu [403]) 23ms trace=recette-bc878a13341e code=PERIMETRE_ADHERENT_REFUSE
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Agent ne valide pas sa cotisation (403) | agent POST /paiements/b14d0a44-4a93-4e4a-b8f9-b6ec48b3d405/valider -> 403 (attendu [403]) 9ms trace=recette-662adf518bec code=ACCES_REFUSE
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Chef confirme la collecte de son agent | chef POST /paiements/b14d0a44-4a93-4e4a-b8f9-b6ec48b3d405/confirmer-chef?motif=OK -> 200 (attendu [200]) 18ms trace=recette-ab0f8c711a99
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Seconde confirmation -> 409 | chef POST /paiements/b14d0a44-4a93-4e4a-b8f9-b6ec48b3d405/confirmer-chef -> 409 (attendu [409]) 13ms trace=recette-953e30a4edab code=PAIEMENT_DEJA_CONFIRME_CHEF
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Gestionnaire ne confirme pas comme Chef (403) | gest POST /paiements/b14d0a44-4a93-4e4a-b8f9-b6ec48b3d405/confirmer-chef -> 403 (attendu [403]) 11ms trace=recette-f5d78da54b68 code=ACCES_REFUSE
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | DAF valide la cotisation de l'agent | daf POST /paiements/b14d0a44-4a93-4e4a-b8f9-b6ec48b3d405/valider -> 200 (attendu [200]) 60ms trace=recette-d972fc5d8c6a
2026-10-05T19:16:44 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Agent : cotisation sans encaisseur indiqué -> l'agent lui-même | agent POST /paiements -> 201 (attendu [201]) 37ms trace=recette-65d21abedf40
2026-10-05T19:16:45 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Le Chef confirme cette collecte | chef POST /paiements/cc0aaebd-9739-4c44-9a6f-4d1e82316a1d/confirmer-chef -> 200 (attendu [200]) 25ms trace=recette-473d5de395c7
2026-10-05T19:16:45 [OK] AGENT DE TERRAIN ET CHEF — périmètre et collecte | Elle figure dans ce que l'agent doit remettre | gest GET /remises-caisse/a-remettre?agentId=03bc10e5-6b7a-4641-ab8d-e0b015b9f36c -> 200 (attendu [200]) 15ms trace=recette-ef8c49b169d4

===== TRANSVERSE — rôles et règles V23 =====
2026-10-05T19:16:45 [OK] TRANSVERSE — rôles et règles V23 | Tableau de bord Super Admin : 0 règle non validée | sa GET /tableaux-de-bord/super-admin -> 200 (attendu [200]) 22ms trace=recette-c0ffab49e303
2026-10-05T19:16:45 [OK] TRANSVERSE — rôles et règles V23 | Règles en attente : liste vide | pca GET /regles/en-attente -> 200 (attendu [200]) 20ms trace=recette-1aba4c371e92
2026-10-05T19:16:45 [OK] TRANSVERSE — rôles et règles V23 | Tableau de bord pca | pca GET /tableaux-de-bord/pca -> 200 (attendu [200]) 25ms trace=recette-bebfb9cf59a6
2026-10-05T19:16:45 [OK] TRANSVERSE — rôles et règles V23 | Tableau de bord dg | dg GET /tableaux-de-bord/dg -> 200 (attendu [200]) 17ms trace=recette-ab711d78c83c
2026-10-05T19:16:45 [OK] TRANSVERSE — rôles et règles V23 | Tableau de bord dga | dga GET /tableaux-de-bord/dga -> 200 (attendu [200]) 36ms trace=recette-dea9bf9a02ac
2026-10-05T19:16:45 [OK] TRANSVERSE — rôles et règles V23 | Tableau de bord daf | daf GET /tableaux-de-bord/daf -> 200 (attendu [200]) 17ms trace=recette-85a3c84e7eeb
2026-10-05T19:16:45 [OK] TRANSVERSE — rôles et règles V23 | Tableau de bord gest | gest GET /tableaux-de-bord/gestionnaire -> 200 (attendu [200]) 23ms trace=recette-0e1796749685

BILAN : 313/313 étapes conformes
```

## 5. Recette E2E (navigateur)

```
[1/20] [chrome] › e2e\acces-par-role.spec.ts:18:3 › Accès par rôle › REC-H08 — l'Agent de terrain ne peut pas ouvrir le tableau de bord DGA
[2/20] [chrome] › e2e\acces-par-role.spec.ts:27:3 › Accès par rôle › REC-H09 — l'Agent de terrain ne peut pas ouvrir le tableau de bord Gestionnaire
[3/20] [chrome] › e2e\acces-par-role.spec.ts:35:3 › Accès par rôle › l'Agent de terrain n'a aucune entrée « Tableau de bord » dans sa navigation
[4/20] [chrome] › e2e\acces-par-role.spec.ts:44:3 › Accès par rôle › le Chef des agents de terrain n'a pas non plus de tableau de bord
[5/20] [chrome] › e2e\acces-par-role.spec.ts:54:3 › Accès par rôle › REC-H12 — le Gestionnaire des comptes ne consulte aucun rapport DAF
[6/20] [chrome] › e2e\acces-par-role.spec.ts:65:3 › Accès par rôle › chaque rôle à dashboard arrive sur le sien après connexion
[7/20] [chrome] › e2e\acces-par-role.spec.ts:71:3 › Accès par rôle › l'Agent de terrain arrive sur son écran de travail, faute de dashboard
[8/20] [chrome] › e2e\acces-par-role.spec.ts:78:3 › Accès par rôle › le Super Administrateur n'a aucun accès métier courant
[9/20] [chrome] › e2e\chaine-hierarchique.spec.ts:17:3 › Chaîne hiérarchique › REC-H04 et REC-H05 — l'Agent produit un compte rendu, le Gestionnaire le reçoit et le contrôle
[10/20] [chrome] › e2e\chaine-hierarchique.spec.ts:69:3 › Chaîne hiérarchique › REC-H10 et REC-H11 — le DAF produit un rapport, le PCA le consulte une fois transmis
[11/20] [chrome] › e2e\modules-complements.spec.ts:89:3 › Fonctionnalités complétées des 3 modules › reçu de cotisation, changement de pack, remise de caisse déclarée puis réceptionnée
[12/20] [chrome] › e2e\modules-complements.spec.ts:148:3 › Fonctionnalités complétées des 3 modules › zones : création puis modification ; adhérents sans zone affectables (V23)
[13/20] [chrome] › e2e\organisation-terrain.spec.ts:13:3 › Organisation terrain › REC-H01 — la DGA ajoute un Agent et voit son mot de passe initial une seule fois
[14/20] [chrome] › e2e\organisation-terrain.spec.ts:40:3 › Organisation terrain › REC-H13 — la DGA consulte l'activité terrain depuis son tableau de bord
[15/20] [chrome] › e2e\organisation-terrain.spec.ts:52:3 › Organisation terrain › le tableau de bord DGA rappelle que les objectifs terrain ne sont pas suivis
[16/20] [chrome] › e2e\organisation-terrain.spec.ts:61:3 › Administration › REC-H14 — le Super Administrateur crée un compte, et le mot de passe n'est montré qu'une fois
[17/20] [chrome] › e2e\organisation-terrain.spec.ts:92:3 › Administration › le journal d'audit n'offre aucune action de modification
[18/20] [chrome] › e2e\organisation-terrain.spec.ts:100:3 › Administration › V23 — plus aucune règle « à valider » n'est présentée au Super Administrateur
[19/20] [chrome] › e2e\parcours-adherent.spec.ts:54:3 › Référentiel adhérents › le Gestionnaire crée un adhérent et le retrouve dans la liste
[20/20] [chrome] › e2e\parcours-adherent.spec.ts:68:3 › Référentiel adhérents › un second adhérent au même téléphone déclenche une confirmation explicite
20 passed (6.8m)
```
