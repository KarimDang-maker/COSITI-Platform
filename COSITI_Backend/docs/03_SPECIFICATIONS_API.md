# 03 — Spécifications de l'API REST

Base : `/api/v1`. Format : JSON, UTF-8. Documentation générée par springdoc-openapi, exposée sur `/api/v1/openapi` (protégée hors développement).

## 1. Conventions

| Sujet | Règle |
|---|---|
| Versionnement | Préfixe d'URL `/v1`. Une rupture de contrat impose `/v2`, jamais une modification en place |
| Identifiants | UUID en chemin. Le matricule est un critère de recherche, pas une clé d'URL |
| Pagination | `?page=0&taille=25&tri=nom,asc` — taille maximale 200 |
| Filtres | Paramètres de requête nommés, jamais de filtre libre injecté en SQL |
| Dates | ISO 8601 (`2026-09-16`, `2026-09-16T10:12:33Z`) |
| Montants | Nombre décimal, deux décimales, sans séparateur de milliers |
| Idempotence | En-tête `Idempotency-Key` obligatoire sur `POST /paiements` |
| Corrélation | En-tête `X-Trace-Id` accepté et propagé, généré si absent |
| Langue | Messages d'erreur en français |

### Enveloppe de liste
```json
{ "contenu": [ ... ], "page": 0, "taille": 25,
  "totalElements": 172, "totalPages": 7, "avertissements": [] }
```

## 2. Authentification

| Méthode | Chemin | Description |
|---|---|---|
| POST | `/auth/connexion` | Identifiant + mot de passe → jeton d'accès (court) + jeton de rafraîchissement |
| POST | `/auth/rafraichir` | Rotation du jeton de rafraîchissement |
| POST | `/auth/deconnexion` | Révoque le jeton de rafraîchissement courant |
| POST | `/auth/mot-de-passe/changer` | Changement par l'utilisateur connecté |
| GET | `/auth/moi` | Profil, rôles, permissions effectives, périmètre de données |

`GET /auth/moi` alimente l'affichage conditionnel côté frontend. Il renvoie la liste des codes de permission, jamais un booléen par écran.

## 3. Adhérents

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/adherents` | `ADHERENT:LIRE` |
| POST | `/adherents` | `ADHERENT:CREER` |
| GET | `/adherents/{id}` | `ADHERENT:LIRE` |
| PUT | `/adherents/{id}` | `ADHERENT:MODIFIER` |
| POST | `/adherents/{id}/archiver` | `ADHERENT:ARCHIVER` |
| POST | `/adherents/{id}/statut` | `ADHERENT:CHANGER_STATUT` |
| POST | `/adherents/verifier-doublon` | `ADHERENT:CREER` |
| GET | `/adherents/{id}/situation` | `DROITS:LIRE` |
| GET | `/adherents/{id}/paiements` | `PAIEMENT:LIRE` |
| POST | `/adherents/{id}/pack` | `ADHERENT:MODIFIER` |
| GET | `/adherents/{id}/ayants-droit` · POST · DELETE | `ADHERENT:MODIFIER` |

Filtres de `GET /adherents` : `recherche` (matricule, nom, téléphone, CNI), `zoneId`, `agentId`, `activiteId`, `statut`, `packId`, `associationId`, `sansAgentReferent`, `dateAdhesionDu`, `dateAdhesionAu`.

`POST /adherents/verifier-doublon` est appelé avant la soumission du formulaire. Réponse :
```json
{ "candidats": [ { "adherentId": "…", "matricule": "COSITI-00042",
  "nomComplet": "…", "telephone": "6•• ••• 937", "scoreSimilarite": 92,
  "motifCorrespondance": "Téléphone principal identique" } ] }
```
Le téléphone est partiellement masqué : l'agent doit pouvoir reconnaître un doublon, pas récupérer une base de contacts.

`POST /adherents` renvoie `201` avec l'en-tête `Location`. En cas de doublon détecté et non confirmé, `409` avec le code `ADHERENT_DOUBLON_POTENTIEL` et la liste des candidats ; le client renvoie alors `confirmationDoublonIgnore: true`, ce qui est journalisé.

## 4. Cotisations

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/paiements` | `PAIEMENT:LIRE` |
| POST | `/paiements` | `PAIEMENT:CREER` |
| GET | `/paiements/{id}` | `PAIEMENT:LIRE` |
| POST | `/paiements/{id}/valider` | `PAIEMENT:VALIDER` |
| POST | `/paiements/{id}/corriger` | `PAIEMENT:CORRIGER` |
| POST | `/paiements/{id}/annuler` | `PAIEMENT:ANNULER` |
| GET | `/paiements/{id}/recu` | `PAIEMENT:LIRE` |
| GET | `/paiements/{id}/affectations` | `PAIEMENT:LIRE` |
| POST | `/paiements/{id}/affectations` | `PAIEMENT:AFFECTER` |
| POST | `/paiements/rapprochement` | `PAIEMENT:RAPPROCHER` (P1) |

Corps de `POST /paiements` :
```json
{ "adherentId": "…", "datePaiement": "2026-09-16", "montant": 5000.00,
  "modePaiement": "ORANGE_MONEY", "referenceTransaction": "OM260916.1042.C12345",
  "typePaiement": "COTISATION", "agentEncaisseurId": "…", "documentPreuveId": null }
```

Erreurs métier spécifiques :

| Code | Statut | Déclencheur |
|---|---|---|
| `PAIEMENT_REFERENCE_MANQUANTE` | 400 | Mode mobile money sans référence |
| `PAIEMENT_MONTANT_INVALIDE` | 400 | Montant ≤ 0 |
| `PAIEMENT_DATE_INCOHERENTE` | 400 | Antérieure à l'adhésion ou future |
| `PAIEMENT_ADHERENT_ARCHIVE` | 409 | Adhérent archivé |
| `PAIEMENT_AUTO_VALIDATION_INTERDITE` | 403 | Le validateur est le créateur |
| `PAIEMENT_DEJA_VALIDE` | 409 | Transition interdite |
| `PAIEMENT_MOTIF_REQUIS` | 400 | Annulation ou correction sans motif |

`POST /paiements/{id}/annuler` ne supprime rien : le paiement passe en `ANNULE`, les périodes de droits issues de ses affectations sont invalidées et recalculées dans la même transaction.

## 5. Droits et régularité

| Méthode | Chemin | Description |
|---|---|---|
| GET | `/droits/adherents/{id}` | Situation à une date de référence (`?au=2026-09-16`) |
| GET | `/droits/adherents/{id}/periodes` | Historique des périodes de droits |
| POST | `/droits/adherents/{id}/recalculer` | Réservé `DAF`, `ADMIN_SYSTEME`, motif obligatoire |
| GET | `/droits/retardataires` | Filtres : zone, agent, jours de retard minimum, pack |

Réponse de situation :
```json
{ "matricule":"COSITI-00013", "pack":"PACK_700",
  "couvertJusquAu":"2026-09-02", "joursCouvertsTotal":90, "joursRetard":14,
  "cumulCotise":63000.00, "soldeAvantSeuil":0.00,
  "statut":"EN_RETARD", "eligibleCnps":true,
  "avertissements":["Reliquat de 400 F non imputé — règle de traitement non validée."] }
```

## 6. Organisation terrain

| Méthode | Chemin |
|---|---|
| GET / POST / PUT | `/zones`, `/zones/{id}` |
| GET / POST / PUT | `/agents`, `/agents/{id}` |
| GET | `/agents/{id}/portefeuille` |
| GET | `/agents/{id}/charge?periode=2026-09` |
| POST | `/portefeuilles/affecter` |
| POST | `/portefeuilles/transferer` (unitaire ou lot, motif obligatoire) |
| GET | `/portefeuilles/sans-agent?zoneId=…` |
| GET / POST | `/remises-caisse`, `/remises-caisse/{id}/receptionner` |
| POST | `/agents/{id}/designer-chef` `[A]` — réservé `DGA`, motif obligatoire, audité (`DGA-F03`) |
| POST | `/agents/{id}/remplacer-chef` `[A]` — réservé `DGA`, motif obligatoire, audité (`DGA-F04`) |
| GET | `/agents/chef?zoneId=…` `[A]` — Chef courant du périmètre |
| GET | `/agents/{id}/historique-chef` `[A]` — historique des désignations/remplacements |

`[A]` : contrat non confirmé, à valider avant codage (jalon J3, `../Roles des acteurs.md §14`). `POST /agents` reste la création générique ; la création par la DGA (`DGA-F01`) utilise le même endpoint avec vérification côté service que l'auteur porte le rôle `DGA` et journalisation `AGENT_CREATION_PAR_DGA`.

## 7. CNPS

| Méthode | Chemin |
|---|---|
| GET / POST | `/cnps/dossiers`, `/cnps/dossiers/{id}` |
| POST | `/cnps/dossiers/{id}/pieces` |
| POST | `/cnps/dossiers/{id}/statut` |
| GET | `/cnps/dossiers/{id}/pieces-manquantes` |
| GET | `/cnps/eligibles-non-immatricules` |
| GET / POST | `/cnps/declarations`, `/cnps/declarations/{id}/transmettre` |
| GET | `/cnps/declarations/a-produire?periode=2026-09` |

## 8. Documents

| Méthode | Chemin | Note |
|---|---|---|
| POST | `/documents` | `multipart/form-data`, contrôle de signature binaire |
| GET | `/documents/{id}` | Flux binaire, consultation journalisée |
| GET | `/documents/{id}/metadonnees` | Sans le contenu |
| POST | `/documents/{id}/statut` | Vérification, rejet, archivage |

Aucune URL publique, aucun lien signé permanent. Le contrôle d'accès est fait à chaque téléchargement.

## 9. Comptes rendus et rapport DAF `[A]`

Contrat non confirmé, à valider avant codage. Structure la chaîne hiérarchique terrain (`../Roles des acteurs.md §12.1`, jalon J8) et le flux DAF → PCA (`§12.3`, jalon J5/J10).

| Méthode | Chemin | Note |
|---|---|---|
| POST | `/comptes-rendus` | Agent de terrain → Gestionnaire des comptes |
| GET | `/comptes-rendus` | Filtres : auteur, destinataire, période, statut, périmètre du demandeur |
| POST | `/comptes-rendus/{id}/controler` | Gestionnaire des comptes |
| POST | `/comptes-rendus/consolider` | Corps : liste d'ids sources — Gestionnaire des comptes → DGA |
| POST | `/comptes-rendus/{id}/transmettre` | Rend le compte rendu consolidé visible à la DGA |
| POST | `/daf/rapports` | DAF produit un rapport |
| POST | `/daf/rapports/{id}/transmettre` | DAF → PCA |
| GET | `/daf/rapports` | Lecture réservée `DAF`, `PCA` selon droits |

## 10. Relances, notifications, reporting, administration

| Méthode | Chemin |
|---|---|
| GET / POST | `/relances`, `/relances/{id}/resultat` |
| GET / POST | `/campagnes-relance` |
| GET | `/notifications`, POST `/notifications/{id}/lue` |
| GET | `/tableaux-de-bord/pca` · `/dg` · `/dga` · `/daf` · `/gestionnaire` · `/super-admin` — **6 dashboards exclusivement**, aucun pour le Chef ni l'Agent de terrain |
| POST | `/exports/adherents` · `/exports/paiements` · `/exports/cnps` (asynchrone au-delà du seuil) |
| GET | `/exports/{id}` (état et récupération) |
| GET / POST / PUT | `/administration/utilisateurs`, `/administration/roles`, `/administration/parametres` |
| GET | `/audit` (filtres : entité, entité id, utilisateur, type, période) |
| GET | `/controles-coherence/dernier-rapport` |

`/audit` est en lecture seule : aucune méthode d'écriture ni de purge n'est exposée, quel que soit le rôle.

## 11. Santé et exploitation

| Chemin | Accès |
|---|---|
| `/actuator/health/liveness`, `/readiness` | Public en interne uniquement |
| `/actuator/info`, `/metrics`, `/prometheus` | Authentifié, rôle `ADMIN_SYSTEME` |
| Tous les autres endpoints Actuator | Désactivés |

## 12. Limites de débit

| Périmètre | Limite indicative [A] |
|---|---|
| `/auth/connexion` | 5 tentatives / 15 min / identifiant, 20 / 15 min / IP |
| Écriture (`POST`, `PUT`) | 60 / min / utilisateur |
| Lecture | 300 / min / utilisateur |
| Export | 5 / heure / utilisateur |

Dépassement : `429` avec `Retry-After`. Les échecs d'authentification répétés verrouillent temporairement le compte et sont journalisés (`CONNEXION_ECHEC`).
