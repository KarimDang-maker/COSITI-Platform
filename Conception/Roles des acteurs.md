# COSITI — V1
# Référentiel précis des actions par acteur sur la plateforme

**Version : 1.1 — Mise à jour du 21 septembre 2026**

## 1. Chaîne hiérarchique V1

```text
PCA
 ↑
Rapports du DAF

DGA
 ↑
Gestionnaire des comptes
 ↑
Comptes rendus des agents de terrain
 ↑
Chef / Agents de terrain
```

### Règles principales

1. Les agents de terrain rendent compte au **Gestionnaire des comptes**.
2. Le Gestionnaire des comptes rend compte à la **DGA**.
3. La **DGA peut ajouter un nouvel Agent de terrain** dans le système.
4. La **DGA peut désigner l'Agent de terrain qui devient Chef des agents de terrain**.
5. Le Chef supervise les agents de son périmètre.
6. Le **DAF produit ses rapports pour le PCA**.
7. Le **PCA reçoit les rapports du DAF**.
8. Le Chef et l'Agent de terrain n'ont pas de dashboard dédié.

---

## 2. Acteurs V1

| Acteur | Dashboard | Mission |
|---|---:|---|
| PCA | Oui | Supervision globale et réception des rapports DAF |
| DG | Oui | Pilotage général |
| DGA | Oui | Pilotage opérationnel et supervision |
| DAF | Oui | Contrôle des données financières |
| Gestionnaire des comptes | Oui | Gestion des adhérents/CNPS et réception des comptes rendus terrain |
| Chef des agents de terrain | Non | Supervision opérationnelle des agents |
| Agent de terrain | Non | Opérations terrain et comptes rendus |
| Super Administrateur | Oui | Administration système et sécurité |

Les six dashboards V1 sont exclusivement : **PCA, DG, DGA, DAF, Gestionnaire des comptes, Super Administrateur**.

---

# 3. PCA

## Fonctionnalités

- Consulter l'activité globale.
- Consulter les adhérents.
- Consulter les collectes enregistrées.
- Consulter l'activité des zones et agents.
- Consulter la situation CNPS.
- Consulter les alertes.
- Consulter les rapports.
- Consulter les rapports produits par le DAF.
- Consulter les éléments d'audit autorisés.

## Cas d'utilisation

| ID | Cas d'utilisation | Résultat |
|---|---|---|
| UC-PCA-01 | Consulter le dashboard global | Vision globale |
| UC-PCA-02 | Consulter les adhérents | État des adhérents |
| UC-PCA-03 | Consulter les collectes | Situation consolidée |
| UC-PCA-04 | Consulter l'activité terrain | Activité des zones/agents |
| UC-PCA-05 | Consulter la situation CNPS | Indicateurs CNPS |
| UC-PCA-06 | Consulter les alertes | Points nécessitant attention |
| UC-PCA-07 | Consulter un rapport DAF | Rapport financier disponible |
| UC-PCA-08 | Consulter les rapports globaux | Pilotage |
| UC-PCA-09 | Consulter l'audit autorisé | Traçabilité |

---

# 4. DG

## Fonctionnalités

- Consulter l'activité globale.
- Suivre les adhérents.
- Suivre les collectes.
- Suivre les retards.
- Suivre les agents et les zones.
- Consulter la situation CNPS.
- Consulter les alertes.
- Consulter les rapports.
- Consulter l'audit autorisé.

## Cas d'utilisation

| ID | Cas d'utilisation | Résultat |
|---|---|---|
| UC-DG-01 | Consulter le dashboard DG | Vision générale |
| UC-DG-02 | Suivre les adhérents | Référentiel consultable |
| UC-DG-03 | Suivre les collectes | État consolidé |
| UC-DG-04 | Identifier les retards | Situations en retard |
| UC-DG-05 | Suivre les agents | Activité des équipes |
| UC-DG-06 | Suivre les zones | Activité par zone |
| UC-DG-07 | Suivre la CNPS | Situation CNPS |
| UC-DG-08 | Consulter les alertes | Points à traiter |
| UC-DG-09 | Consulter les rapports | Pilotage |
| UC-DG-10 | Consulter l'audit | Traçabilité |

---

# 5. DGA

## Positionnement

```text
Agent de terrain
       ↓
Gestionnaire des comptes
       ↓
DGA
```

La DGA reçoit donc les comptes rendus consolidés du Gestionnaire des comptes.

## Dashboard

- Activité opérationnelle.
- Adhérents.
- Collectes.
- Agents.
- Zones.
- Objectifs.
- Retards.
- CNPS.
- Alertes.
- Rapports opérationnels.

## Fonctionnalités spécifiques

### DGA-F01 — Ajouter un Agent de terrain

La DGA peut créer un nouvel Agent de terrain dans le système.

Le compte doit être rattaché à son organisation/périmètre et l'action doit être auditée.

### DGA-F02 — Affecter un Agent de terrain

La DGA peut affecter l'agent à une zone ou au périmètre prévu.

### DGA-F03 — Désigner le Chef des agents de terrain

La DGA choisit quel Agent de terrain exerce la fonction de Chef.

La désignation doit être explicite, contrôlée et historisée.

### DGA-F04 — Modifier la désignation du Chef

La DGA peut remplacer le Chef lorsque les règles organisationnelles le permettent.

### DGA-F05 — Superviser les agents

Consulter l'activité des agents et de l'équipe.

### DGA-F06 — Consulter les comptes rendus

Consulter les informations remontées par le Gestionnaire.

### DGA-F07 — Suivre les objectifs

Consulter et, si validé, définir/attribuer les objectifs.

### DGA-F08 — Suivre les zones

### DGA-F09 — Suivre les adhérents

### DGA-F10 — Suivre les collectes

### DGA-F11 — Consulter les alertes

### DGA-F12 — Consulter les rapports

## Cas d'utilisation

| ID | Cas d'utilisation | Résultat |
|---|---|---|
| UC-DGA-01 | Consulter le dashboard | Vision opérationnelle |
| UC-DGA-02 | Ajouter un agent | Agent créé |
| UC-DGA-03 | Affecter un agent | Rattachement enregistré |
| UC-DGA-04 | Désigner le Chef | Rôle Chef attribué |
| UC-DGA-05 | Modifier le Chef | Historique conservé |
| UC-DGA-06 | Suivre les agents | Activité visible |
| UC-DGA-07 | Consulter les comptes rendus | Remontées terrain disponibles |
| UC-DGA-08 | Suivre les objectifs | Progression visible |
| UC-DGA-09 | Suivre les zones | Activité par zone |
| UC-DGA-10 | Suivre les adhérents | Situation disponible |
| UC-DGA-11 | Suivre les collectes | Collectes disponibles |
| UC-DGA-12 | Consulter alertes/rapports | Pilotage |

---

# 6. DAF

## Flux

```text
Transaction réelle
      ↓
Agent de terrain
      ↓
Enregistrement de l'information
      ↓
Chaîne hiérarchique
      ↓
Contrôle DAF
      ↓
Rapport DAF
      ↓
PCA
```

COSITI n'exécute aucun mouvement de fonds.

## Fonctionnalités

- Consulter les paiements.
- Contrôler un paiement.
- Vérifier adhérent, montant, date, moyen, référence et justificatif.
- Confirmer une opération conforme.
- Signaler une incohérence.
- Consulter les collectes.
- Effectuer les rapprochements autorisés.
- Corriger une opération autorisée avec motif.
- Annuler une opération autorisée avec motif.
- Produire les rapports DAF.
- Transmettre les rapports au PCA.
- Consulter l'historique/audit autorisé.

## Cas d'utilisation

| ID | Cas d'utilisation | Résultat |
|---|---|---|
| UC-DAF-01 | Consulter le dashboard DAF | Vision financière interne |
| UC-DAF-02 | Lister les paiements à contrôler | File de contrôle |
| UC-DAF-03 | Contrôler un paiement | Paiement contrôlé |
| UC-DAF-04 | Confirmer un paiement | État confirmé |
| UC-DAF-05 | Signaler une incohérence | Anomalie traçable |
| UC-DAF-06 | Effectuer un rapprochement | Comparaison documentée |
| UC-DAF-07 | Corriger une opération | Correction auditée |
| UC-DAF-08 | Annuler une opération | Annulation auditée |
| UC-DAF-09 | Produire un rapport DAF | Rapport généré |
| UC-DAF-10 | Transmettre le rapport au PCA | Rapport disponible au PCA |
| UC-DAF-11 | Consulter l'historique | Traçabilité |

---

# 7. Gestionnaire des comptes

## Positionnement

Le Gestionnaire des comptes est le niveau intermédiaire entre le terrain et la DGA.

```text
Agents de terrain
       ↓ comptes rendus
Gestionnaire des comptes
       ↓ compte rendu consolidé
DGA
```

## Dashboard

- Adhérents.
- Cotisations.
- Retards.
- Dossiers CNPS.
- Pièces manquantes.
- Déclarations.
- Activité terrain.
- Comptes rendus reçus.
- Alertes.

## Fonctionnalités

- Créer, consulter et modifier les adhérents selon permissions.
- Vérifier les doublons.
- Consulter les situations adhérents.
- Suivre les cotisations et paiements.
- Suivre les retards.
- Gérer le suivi CNPS.
- Suivre immatriculations, pièces et déclarations.
- Gérer les documents autorisés.
- Suivre les relances.
- Recevoir les comptes rendus des agents.
- Contrôler les comptes rendus.
- Consolider les remontées terrain.
- Rendre compte à la DGA.
- Consulter les alertes.
- Consulter les rapports autorisés.
- Consulter l'audit autorisé.

## Cas d'utilisation

| ID | Cas d'utilisation | Résultat |
|---|---|---|
| UC-GC-01 | Consulter le dashboard | Vision adhérents/CNPS/terrain |
| UC-GC-02 | Créer un adhérent | Adhérent enregistré |
| UC-GC-03 | Modifier un adhérent | Données historisées |
| UC-GC-04 | Vérifier un doublon | Candidat identifié |
| UC-GC-05 | Consulter une situation | Situation disponible |
| UC-GC-06 | Suivre les cotisations | État des paiements |
| UC-GC-07 | Suivre les retards | Adhérents identifiés |
| UC-GC-08 | Suivre un dossier CNPS | Dossier suivi |
| UC-GC-09 | Identifier les pièces manquantes | Dossier incomplet identifié |
| UC-GC-10 | Suivre les déclarations CNPS | État consultable |
| UC-GC-11 | Suivre les relances | Actions consultables |
| UC-GC-12 | Recevoir un compte rendu terrain | Compte rendu disponible |
| UC-GC-13 | Contrôler un compte rendu | Remontée examinée |
| UC-GC-14 | Consolider les remontées | Synthèse disponible |
| UC-GC-15 | Rendre compte à la DGA | DGA informée |
| UC-GC-16 | Consulter les alertes | Points à traiter |
| UC-GC-17 | Consulter rapports/audit | Traçabilité |

---

# 8. Chef des agents de terrain

**Aucun dashboard dédié.**

Le Chef est un Agent de terrain désigné par la DGA.

## Fonctionnalités

- Consulter les agents de son périmètre.
- Superviser les agents.
- Suivre les zones.
- Suivre les portefeuilles.
- Suivre les objectifs.
- Suivre les collectes.
- Examiner les remontées opérationnelles de son équipe.
- Suivre les relances de son équipe.
- Signaler une incohérence.
- Participer à la confirmation hiérarchique des collectes selon le workflow validé.

## Cas d'utilisation

| ID | Cas d'utilisation | Résultat |
|---|---|---|
| UC-CHEF-01 | Consulter son équipe | Agents visibles |
| UC-CHEF-02 | Superviser un agent | Activité suivie |
| UC-CHEF-03 | Consulter une zone | Situation disponible |
| UC-CHEF-04 | Suivre un portefeuille | Situation disponible |
| UC-CHEF-05 | Suivre un objectif | Progression disponible |
| UC-CHEF-06 | Suivre les collectes | Collectes de l'équipe |
| UC-CHEF-07 | Examiner une remontée | Contrôle opérationnel |
| UC-CHEF-08 | Suivre les relances | Actions de l'équipe |
| UC-CHEF-09 | Signaler une incohérence | Anomalie remontée |
| UC-CHEF-10 | Confirmer une collecte | Confirmation traçable |

---

# 9. Agent de terrain

**Aucun dashboard dédié.**

## Fonctionnalités

- Consulter son portefeuille.
- Consulter les adhérents de son périmètre.
- Créer un adhérent.
- Modifier les données autorisées.
- Enregistrer une collecte/paiement.
- Joindre un justificatif.
- Consulter l'état d'une collecte.
- Effectuer une relance.
- Enregistrer le résultat d'une relance.
- Produire un compte rendu destiné au Gestionnaire des comptes.

## Cas d'utilisation

| ID | Cas d'utilisation | Résultat |
|---|---|---|
| UC-AG-01 | Consulter son portefeuille | Portefeuille disponible |
| UC-AG-02 | Consulter un adhérent | Données autorisées |
| UC-AG-03 | Créer un adhérent | Adhérent enregistré |
| UC-AG-04 | Modifier une donnée autorisée | Modification tracée |
| UC-AG-05 | Enregistrer une collecte | Paiement enregistré |
| UC-AG-06 | Ajouter un justificatif | Preuve associée |
| UC-AG-07 | Consulter l'état d'une collecte | État disponible |
| UC-AG-08 | Effectuer une relance | Relance créée |
| UC-AG-09 | Enregistrer le résultat | Résultat structuré |
| UC-AG-10 | Produire un compte rendu | Gestionnaire informé |

---

# 10. Super Administrateur

## Dashboard

- Utilisateurs.
- Rôles.
- Permissions.
- Sécurité.
- Audit.
- Paramètres.
- Contrôles de cohérence.
- État technique.

## Fonctionnalités

- Créer un utilisateur.
- Modifier un utilisateur.
- Activer/désactiver un utilisateur.
- Attribuer un rôle.
- Administrer les permissions.
- Administrer les paramètres autorisés.
- Consulter l'audit.
- Consulter les événements de sécurité.
- Consulter les contrôles de cohérence.
- Consulter l'état technique.
- Administrer la sécurité.

Le Super Administrateur **ne reçoit pas automatiquement les privilèges financiers du DAF**.

## Cas d'utilisation

| ID | Cas d'utilisation | Résultat |
|---|---|---|
| UC-SA-01 | Créer un utilisateur | Compte créé |
| UC-SA-02 | Modifier un utilisateur | Compte mis à jour |
| UC-SA-03 | Activer/désactiver | Accès contrôlé |
| UC-SA-04 | Attribuer un rôle | Permissions associées |
| UC-SA-05 | Administrer les permissions | Habilitations contrôlées |
| UC-SA-06 | Modifier un paramètre | Paramètre historisé |
| UC-SA-07 | Consulter l'audit | Traçabilité |
| UC-SA-08 | Consulter les événements de sécurité | Événements visibles |
| UC-SA-09 | Consulter la cohérence | Anomalies visibles |
| UC-SA-10 | Vérifier l'état technique | État système |
| UC-SA-11 | Administrer les paramètres V1 | Configuration contrôlée |
| UC-SA-12 | Contrôler la sécurité | Sécurité opérationnelle |

---

# 11. Matrice synthétique

| Fonction | PCA | DG | DGA | DAF | Gestionnaire | Chef | Agent | Super Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Ajouter un Agent terrain | — | — | **✓** | — | — | — | — | — |
| Désigner le Chef | — | — | **✓** | — | — | — | — | — |
| Superviser les agents | — | consultation | **✓** | — | suivi | **✓** | — | — |
| Agent → compte rendu | — | — | — | — | **reçoit** | — | **produit** | — |
| Gestionnaire → DGA | — | — | **reçoit** | — | **produit** | — | — | — |
| Contrôle paiements | consultation | consultation | consultation | **✓** | suivi | workflow | saisie | — |
| Rapport DAF | **reçoit** | consultation selon droits | consultation selon droits | **produit** | — | — | — | — |
| DAF → PCA | **✓** | — | — | **✓** | — | — | — | — |
| Suivi CNPS | consultation | consultation | supervision | consultation | **✓** | — | — | — |
| Relances | consultation | consultation | supervision | consultation | suivi | **✓** | **✓** | — |
| Administration utilisateurs | — | — | — | — | — | — | — | **✓** |
| Administration rôles/permissions | — | — | — | — | — | — | — | **✓** |
| Audit | consultation | consultation | consultation | consultation | périmètre | périmètre | périmètre | **✓** |

---

# 12. Flux opérationnels

## 12.1 Terrain → Gestionnaire → DGA

```text
Agent de terrain
    ↓
Travail terrain
    ↓
Compte rendu
    ↓
Gestionnaire des comptes
    ↓
Contrôle / consolidation
    ↓
Compte rendu à la DGA
    ↓
DGA
```

## 12.2 Désignation du Chef

```text
DGA
 ↓
Choisir un Agent de terrain
 ↓
Désigner comme Chef
 ↓
Attribuer les privilèges correspondants
 ↓
Journaliser l'action
 ↓
Chef opérationnel
```

## 12.3 DAF → PCA

```text
DAF
 ↓
Contrôle des données
 ↓
Rapprochements autorisés
 ↓
Production du rapport
 ↓
Transmission / mise à disposition
 ↓
PCA
```

---

# 13. Contraintes de conception

1. Le backend est l'autorité finale pour les permissions.
2. Les relations hiérarchiques doivent être représentées dans les données.
3. La désignation du Chef doit être une action métier explicite et auditée.
4. La création d'un Agent de terrain par la DGA doit être auditée.
5. Les comptes rendus destinés aux rapports doivent être structurés.
6. Aucun endpoint non confirmé ne doit être inventé.
7. Les besoins non couverts par le contrat API doivent être marqués `[A]` ou `[V]`.
8. COSITI enregistre les informations de paiement mais n'exécute aucun mouvement de fonds.

---

# 14. API à spécifier/valider

Les contrats API suivants doivent être confirmés avant développement s'ils ne sont pas déjà présents :

- ajout d'un Agent de terrain par la DGA ;
- affectation d'un Agent de terrain ;
- désignation du Chef ;
- remplacement du Chef ;
- relation de supervision ;
- compte rendu terrain ;
- consolidation des comptes rendus ;
- transmission/mise à disposition du compte rendu à la DGA ;
- production du rapport DAF ;
- transmission/mise à disposition du rapport DAF au PCA ;
- historique des changements de responsabilité ;
- objectifs terrain, si confirmés.

**Règle :** le contrat `/api/v1/openapi` reste la référence technique. Un endpoint absent doit être spécifié puis validé avant codage.

---

# 15. Cas de recette prioritaires

| ID | Scénario | Résultat attendu |
|---|---|---|
| REC-H01 | DGA ajoute un Agent terrain | Agent créé avec le bon rôle |
| REC-H02 | DGA désigne un Chef | Chef désigné et permissions correctes |
| REC-H03 | DGA remplace le Chef | Historique conservé |
| REC-H04 | Agent produit un compte rendu | Gestionnaire le reçoit |
| REC-H05 | Gestionnaire contrôle le compte rendu | Données exploitables |
| REC-H06 | Gestionnaire rend compte | DGA informée |
| REC-H07 | Chef supervise son équipe | Accès limité au périmètre |
| REC-H08 | Agent ouvre une route dashboard DGA | Accès refusé |
| REC-H09 | Agent ouvre une route dashboard Gestionnaire | Accès refusé |
| REC-H10 | DAF produit un rapport | Rapport historisé |
| REC-H11 | PCA consulte le rapport DAF | Rapport accessible |
| REC-H12 | Utilisateur non autorisé consulte un rapport DAF | Accès refusé |
| REC-H13 | DGA consulte l'activité terrain | Périmètre correct |
| REC-H14 | Super Admin administre un compte | Action auditée |
| REC-H15 | Désignation Chef | Action auditée |

---

# 16. Hors périmètre V1

- API Orange Money.
- API MTN MoMo.
- API Wave.
- API carte bancaire.
- Paiement en ligne.
- Transfert de fonds depuis COSITI.
- Gestion d'un compte bancaire depuis COSITI.
- Gestion d'un compte Mobile Money depuis COSITI.
- Dépôt en microfinance depuis COSITI.
- Rôle Téléconseiller.
- Rôle Marketing autonome.
- Rôle Responsable de zone autonome.
- Rôle Responsable CNPS autonome.
- Dashboard Agent de terrain.
- Dashboard Chef des agents de terrain.

---

# 17. Règle finale

```text
AGENT DE TERRAIN
       │
       │ rend compte
       ▼
GESTIONNAIRE DES COMPTES
       │
       │ rend compte
       ▼
DGA
       │
       │ supervise / organise
       ├── ajoute les Agents de terrain
       └── désigne le Chef des agents de terrain


DAF
       │
       │ produit les rapports
       ▼
PCA
```

Ce document est le référentiel fonctionnel des **actions des acteurs, de la chaîne de responsabilité et des cas d'utilisation V1**. Il doit servir à aligner les modèles de données, RBAC, API, services métier, écrans, dashboards, rapports, audit et tests.
