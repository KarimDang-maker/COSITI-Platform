# V23 — Règles d'accès validées et recette des 3 modules (adhérents, cotisations, agents de terrain) — backend

**Date :** 05/10/2026
**Demande :** « tester et corriger au fur et à mesure le fonctionnement du backend sur les trois premiers modules […] si une
fonctionnalité n'a pas de correspondance UI/UX, la créer dans le frontend et tester l'intégration […] journaliser les logs
backend dans le fichier ».
**Spécification appliquée :** `docs/SPEC_BACKEND_V23_REGLES_ACCES.md` (rédigée par la session frontend V23).
**Logs détaillés de la recette :** `2026-10-05_recette_3_modules_logs_backend.md` (même dossier).
**Script de recette (versionné) :** `scripts/recette/recette_3_modules.py`.

## 1. Démarche

1. Application de la spec V23 (migration `V23__regles_validees_acces_roles.sql` + code).
2. Instance de recette isolée : jar copié, port 8083, schéma `cositi_recette`, limitation de débit désactivée,
   CORS 5173/5174. La base de dev `cositi_db` (schéma `public`) n'a pas été touchée.
3. Recette API scriptée des 3 modules par rôle (8 comptes démo) : chaque anomalie trouvée a été corrigée, couverte
   par un test, puis la recette relancée.
   Progression : 104/134 → 260 → 274 → 282 → 298/298 → 309 → **313/313**.
4. Fonctionnalités backend sans écran : écran créé côté frontend, test Vitest (MSW) et test E2E Playwright.
5. Relecture des logs serveur : bruit d'erreurs éliminé jusqu'à **0 ligne ERROR** sur la dernière passe.

Le mot de passe de recette est lu dans `COSITI_RECETTE_MOT_DE_PASSE` (règle n° 8 : aucun secret dans Git).

## 2. V23 implémenté

- **Paramètres :**
  - tous les `parametre` en statut V/A passés à C (réputés validés), avec une trace `REGLE_VALIDATION` dans
    `journal_audit` ;
  - toutes les `exigence_documentaire` passées à C.
  - Aucune valeur n'est figée en constante : les règles restent dans `parametre`.
- **Adhérent :**
  - zone et localisation facultatives à la création (`DROP NOT NULL`) ;
  - latitude/longitude retirées des DTO ;
  - `GEOLOCALISATION` retiré des champs de complétion ;
  - détection de doublons sans zone : recherche toutes zones confondues ;
  - activation possible sans zone ni localisation.
- **CNI :** aucune date de validité (champs ignorés, jamais expirée).
- **Cotisation :** bloquée (409 `COTISATION_FRAIS_ADHESION_NON_VALIDE`) tant que le frais d'adhésion n'est pas validé
  par le DAF. Le montant affiché provient du paramètre.
- **Rôles :**
  - le Gestionnaire perd `ADHERENT:VALIDER` ;
  - le DG obtient les droits de validation DGA ;
  - le PCA ne garde que `REGLE:VALIDER` ;
  - le DAF garde ses validations financières ;
  - nouvelle permission `FINANCES:CONSULTER` (DAF seul), posée sur les listes et synthèses de paiements, de frais et
    de bilans de caisse.
- **Notifications :**
  - recontrôle et activation envoyés au DGA et au DG ;
  - la notification `BILAN_CAISSE_VALIDE` au Gestionnaire est supprimée.

## 3. Anomalies trouvées par la recette et corrigées

| # | Module | Anomalie | Correction |
|---|---|---|---|
| 1 | Adhérents | Création refusée après V23 (zone/localisation encore exigées côté serveur) | Entité, DTO, service, doublons et activation rendus null-safe |
| 2 | Agents | `GET /portefeuilles/sans-agent` exigeait une zone : un adhérent sans zone ne pouvait jamais être affecté | `zoneId` facultatif ; option « Toutes les zones » côté frontend |
| 3 | Cotisations | La re-répartition manuelle acceptait une épargne < 300 et désynchronisait la répartition de la cotisation | `regleRepartition.valider` + `definirRepartition(..., SAISIE)` |
| 4 | Cotisations | Remise de caisse inutilisable : pas de liste ni de consultation, aucun contrôle à la déclaration, double réception possible, DAF non notifié | `GET /`, `/a-remettre`, `/{id}` ; contrôles `REMISE_PAIEMENT_AUTRE_AGENT`, `_DEJA_REMIS`, `_NON_ENCAISSE`, `REMISE_CAISSE_DEJA_RECEPTIONNEE`, `REMISE_MONTANT_INVALIDE` ; notification `REMISE_CAISSE_A_RECEPTIONNER` |
| 5 | Cotisations | Une cotisation saisie par un agent de terrain n'avait pas d'encaisseur | L'agent auteur devient l'encaisseur par défaut |
| 6 | Agents | Zones : `ORGANISATION:GERER_ZONES` non branché, ville/région ignorées en modification, aucune trace d'audit | `@PreAuthorize`, setters, `ZONE_CODE_NON_MODIFIABLE`, audits `ZONE_CREATION` / `ZONE_MODIFICATION` |
| 7 | Transverse | Connexions journalisées sous l'auteur `anonymousUser` | `ServiceAudit.tracerPour(acteur, …)` ; contexte anonyme tracé « ANONYME » |
| 8 | Documents | Erreur de lecture du fichier téléversé (ex. fichier mis en quarantaine par l'antivirus) → 500 | 400 `DOCUMENT_ILLISIBLE` + `warn` |
| 9 | Transverse | Déconnexions navigateur et accès refusé sur `/error` journalisés en ERROR (88 puis 6 lignes) | `estDeconnexionClient` (debug) ; dispatch ASYNC/ERROR/INCLUDE autorisé |
| 10 | Cotisations | Reçu sans identité de l'adhérent ni répartition | `RecuDto` enrichi (matricule, nom, SS/épargne, référence, type, auteur, dates) |

## 4. Écrans créés côté frontend (fonctionnalités backend sans UI)

| Fonctionnalité | Écran |
|---|---|
| Reçu de paiement (`GET /paiements/{id}/recu`) | `DialogueRecu` (bouton « Reçu » dans le détail, impression) |
| Changement de pack | `DialogueChangerPack` (lien « Changer » dans la carte des comptes) |
| Création / modification de zone | `DialogueZone` dans l'écran Organisation |
| Adhérents sans agent, toutes zones | Option « Toutes les zones (y compris sans zone) » |
| Déclaration de remise de caisse | `DialogueRemiseCaisse` (fiche agent de terrain) |
| Réception des remises par le DAF | Section `RemisesCaisse` de l'écran DAF (aperçu de l'écart) |

Tests : `ComplementsModules.test.tsx` (7 tests, MSW) et `e2e/modules-complements.spec.ts` (2 tests). Specs E2E
réalignées : sélecteur du mot de passe, formulaire de création V23, absence de mention « À valider ».

## 5. Résultats finaux

| Contrôle | Résultat |
|---|---|
| Tests backend (`mvn test`, schéma isolé) | **429 / 429**, BUILD SUCCESS |
| Recette API des 3 modules (8 rôles) | **313 / 313** |
| Logs serveur de la dernière passe | **0 ERROR** (avertissements métier uniquement, listés dans le journal des logs) |
| E2E Playwright (Chrome installé) | **20 / 20** |
| Vitest frontend | **228 / 228** |
| `tsc`, build de production | OK |
| oxlint | 9 avertissements préexistants, aucun dans les fichiers ajoutés ou modifiés |

## 6. Points ouverts

- **Affectation d'une zone à un adhérent créé sans zone :** qui l'attribue, et à quel moment ? Non tranché dans la
  spec (`TODO [V]`).
- Retrait facultatif d'`ORGANISATION:LIRE` au DAF (spec V23) : non appliqué.
- La notification d'anomalie de bilan reste envoyée à l'auteur de la saisie (D-20) : à confirmer.
- Inclure ou non le mobile money dans les remises de caisse : seuls les paiements en espèces sont cochés par défaut.
  À confirmer par la COSITI.
- Deux tests E2E sont instables sous forte charge (délais d'attente) ; ils passent quand ils sont relancés seuls.
- Chromium de Playwright non installé sur ce poste : la recette a utilisé Chrome (`channel: "chrome"`) avec une
  configuration temporaire, supprimée ensuite.
- **La migration V23 n'est pas encore appliquée sur la base de dev `cositi_db`.** Elle s'appliquera au prochain
  démarrage de l'API sur le port 8082 avec ce code.
- Les modifications frontend ne sont pas commitées ; elles côtoient le travail V23 de la session frontend.
