# CLAUDE.md — Règles transverses du projet COSITI

Ce fichier regroupe les règles qui s'appliquent à **tout** travail sur ce dépôt, backend ou frontend, pour ne pas avoir à les redonner à chaque prompt. Il est complété par deux packs techniques indépendants :

- `COSITI_API_docs/AGENTS.md` + `COSITI_API_docs/docs/` — backend (Spring Boot / PostgreSQL)
- `COSITI_WEB_docs/AGENTS.md` + `COSITI_WEB_docs/docs/` — frontend (React / TypeScript)

**Ordre de préséance en cas de contradiction** : cahier des charges fonctionnel validé (documents amont, hors dépôt) > ce `CLAUDE.md` > le pack technique concerné (`AGENTS.md` + `docs/`) > tout code existant, y compris le prototype `src/` décrit en §7.

---

## 1. Le projet en une phrase

COSITI est une coopérative camerounaise qui **enregistre** les données d'adhésion, de cotisation et de droits CNPS des travailleurs du secteur informel — elle ne **détient** et ne **transfère** jamais de fonds depuis la plateforme. Toute décision d'implémentation qui rapprocherait la plateforme d'un rôle d'intermédiaire financier est fausse par construction, quelle que soit la fonctionnalité demandée.

## 2. État du dépôt — ne pas confondre les deux couches

Ce dépôt contient deux choses de nature différente :

1. **`src/`, `index.html`, `metadata.json`, `DOCUMENTATION_SYSTEME_COSITI.md`** — un prototype React 18 + `localStorage` (V2.5) construit sur un **ancien modèle de rôles** (Caissière, DG, DGA, DAF, Gestionnaire de portefeuille, Super Admin, codes PIN `0000`/`1111`). C'est une démonstration fonctionnelle, **pas l'architecture cible**. Ne pas l'étendre comme s'il s'agissait de la V1 réelle, ne pas y recopier de nouveaux écrans en pensant construire la V1. Il peut rester consulté pour comprendre un besoin métier illustré, jamais comme référence de rôles, de sécurité ou d'architecture.
2. **`COSITI_API_docs/` et `COSITI_WEB_docs/`** — les deux packs de documentation technique qui décrivent l'architecture cible V1 : API Spring Boot côté `cositi-api`, interface React côté `cositi-web`, chacune dans son futur dépôt séparé (voir `00_LISEZ_MOI_PACK.md` de chaque pack). **C'est cette architecture qui fait foi pour tout nouveau développement.**

Si une demande porte sur « l'application COSITI » sans préciser laquelle des deux couches, et que la réponse dépend du modèle de rôles ou de l'architecture, demander confirmation plutôt que de deviner.

## 3. Les huit rôles V1 — liste exhaustive et définitive

| Code | Rôle | Rattachement hiérarchique | Responsabilité principale |
|---|---|---|---|
| `PCA` | Président du Conseil d'Administration | sommet | Vision stratégique, lecture globale de l'activité |
| `DG` | Directeur Général | sous PCA | Pilotage général |
| `DGA` | Directeur Général Adjoint | sous DG | Supervision opérationnelle, désigne le Chef des agents de terrain |
| `DAF` | Directeur Administratif et Financier | sous DGA | Contrôle des données de paiement/collecte, jamais d'exécution financière |
| `GESTIONNAIRE_COMPTE` | Gestionnaire des comptes | sous DGA | Adhérents, suivi CNPS (immatriculation, déclarations, pièces) |
| `CHEF_AGENT_TERRAIN` | Chef des agents de terrain | sous DGA | **Reste un agent de terrain** + privilèges de supervision (zones, objectifs, équipe) |
| `AGENT_TERRAIN` | Agent de terrain | sous Chef | Collecte réelle, saisie de la donnée de paiement |
| `SUPER_ADMIN` | Super Administrateur | transversal, technique | Comptes, rôles, paramètres — **pas d'accès métier courant** |

Règles associées, non négociables :

- **Rôles définitivement supprimés, à ne recréer sous aucune forme** (composant, enum, libellé d'affichage, donnée de démonstration) : `Téléconseiller`, `Marketing` (comme rôle autonome), `Responsable de zone` (comme rôle autonome), `Responsable CNPS` / `Responsable Pôle CNPS` (comme rôle autonome), `Caissière`, `Conseil de surveillance`. Leurs fonctions utiles sont rattachées à `DGA` ou `GESTIONNAIRE_COMPTE` selon le cas ; le reste n'est pas développé.
- Le **Chef des agents de terrain n'est pas une entité distincte** de l'agent de terrain : c'est un agent auquel des privilèges de supervision sont ajoutés. Ne pas modéliser une hiérarchie d'entités séparée sans validation explicite (voir §6).
- Le **Super Administrateur** ne devient jamais automatiquement un acteur métier : pas de privilège financier ou d'accès aux données nominatives par défaut.
- Il n'existe **aucune auto-inscription**. Tous les comptes sont créés par le Super Administrateur ; l'attribution du rôle `CHEF_AGENT_TERRAIN` par le DGA est une opération métier tracée, pas une simple modification de fiche.
- Toute permission est vérifiée **côté serveur**, jamais côté client. Le frontend masque pour le confort, il ne protège rien (détail dans chaque pack `04_SECURITE.md`).

## 4. Méthode de sprint — S00 à S12

Le développement suit `COSITI_PLAN_SPRINT_V1.md` (document amont), qui **remplace** tout séquencement antérieur en jalons J1-J12.

| Sprint | Domaine | Dépend de |
|---|---|---|
| S00 | Cadrage et architecture | — |
| S01 | Authentification + RBAC | S00 |
| S02 | Adhérents | S01 |
| S03 | Organisation terrain (zones, agents, Chef des agents de terrain) | S02 |
| S04 | Paiements / collectes (donnée, jamais de mouvement de fonds) | S03 |
| S05 | Contrôle DAF et confirmation hiérarchique des collectes | S04 |
| S06 | Droits et régularité | S05 |
| S07 | CNPS et documents | S02, S06 |
| S08 | Relances | S06 |
| S09 | Tableaux de bord par rôle | S02–S08 |
| S10 | Rapports, exports, audit | S09 |
| S11 | Administration et durcissement sécurité | S01, S10 |
| S12 | Recette E2E et stabilisation | tous |

**Un sprint n'est déclaré terminé que si, cumulativement** : les fonctionnalités prévues sont implémentées · les endpoints sont documentés dans le pack API concerné · les permissions sont vérifiées côté backend, avec un test « autorisé → 200 » et un test « non autorisé → 403 » pour chaque endpoint · les erreurs métier sont testées · les opérations sensibles sont auditables · le frontend ne duplique aucune règle métier · les tests passent · le scénario nominal est exécuté de bout en bout · aucun endpoint fictif n'a été ajouté · aucune fonctionnalité hors périmètre (§5) n'a été développée.

Ne pas commencer un sprint dont la dépendance n'est pas satisfaite sans le signaler explicitement.

## 5. Périmètre explicitement exclu de la V1

Ne jamais implémenter, même partiellement, même comme prototype ou stub actif :

- API ou SDK Orange Money, MTN MoMo, Wave, carte bancaire, tout paiement en ligne ;
- tout transfert de fonds déclenché depuis COSITI, tout compte bancaire ou Mobile Money géré depuis l'application ;
- tout dépôt en microfinance depuis la plateforme (l'ancien scénario de « versement bancaire DAF » est supprimé — voir §6) ;
- les rôles supprimés listés en §3 ;
- un portail adhérent public, une application mobile publique ;
- toute fonctionnalité V2/V3/V4 non nécessaire au fonctionnement interne V1.

Les moyens de paiement (Espèces, Orange Money, MTN MoMo, Wave, Virement, Chèque, autre) sont **des valeurs enregistrées dans un paiement**, jamais des intégrations actives.

## 6. Contrats API non encore validés — ne jamais les inventer

Le nouveau modèle de rôles (`CHEF_AGENT_TERRAIN` avec supervision, contrôle DAF revu) crée des besoins pour lesquels **aucun chemin REST n'est arrêté**. Une proposition de contrat peut être rédigée et documentée comme piste `[A]`, mais rien n'est codé avant validation explicite par le chef de projet :

1. Désignation d'un Agent de terrain comme Chef des agents de terrain, par le DGA.
2. Attribution d'objectifs à un agent ou une zone.
3. Confirmation hiérarchique d'une collecte (le Chef confirme avant le contrôle DAF).
4. Remise interne caisse/coffre-fort — confirmer si le module `remise_caisse` existant suffit ou doit évoluer.
5. Signalement structuré d'une incohérence documentaire/financière par le DAF.

Détail des pistes techniques : `COSITI_API_docs/docs/03_SPECIFICATIONS_API.md` §10 (backend) et `COSITI_WEB_docs/docs/03_SPECIFICATIONS_ECRANS.md` (frontend, écrans E11/E12).

**Nouveau scénario DAF (remplace l'ancien scénario de versement bancaire)** :
```
Paiement réel → Agent de terrain saisit → Chef des agents de terrain confirme
→ DAF contrôle → CONFIRMÉ ou INCOHÉRENCE
```
Les fonds réels restent dans les circuits internes de COSITI (caisse/coffre-fort) ; aucun transfert vers une banque ou une microfinance n'est exécuté par la plateforme.

## 7. Marqueurs de validation — convention commune aux deux packs

| Marqueur | Sens | Conséquence pour le code |
|---|---|---|
| **[C]** | Confirmé par la COSITI | Implémentable tel quel |
| **[A]** | À analyser — proposition technique | Implémentable comme proposition, mais signalée comme non confirmée ; ne jamais présenter comme définitif |
| **[V]** | À valider par la COSITI (DAF ou direction) | **Jamais codé en dur.** Vit en base (`table parametre` côté backend) ou reste un contrat non implémenté côté frontend ; le point bloquant principal reste la décomposition d'un versement (CNPS / coopérative / épargne) |

Une règle `[V]` non tranchée n'est pas une raison de bloquer une livraison : implémenter le comportement par défaut le plus honnête (ex. pas de ventilation plutôt qu'une ventilation inventée), journaliser un avertissement explicite, et le faire remonter à l'utilisateur final via l'API et l'interface — jamais silencieusement.

## 8. Règles de travail générales

- **Ne jamais inventer une règle métier ou un endpoint.** Si une information manque, le signaler et écrire `TODO [V] : question`, ne pas deviner.
- **Aucune suppression physique** de donnée métier (adhérent, paiement, document, dossier) : archivage logique avec auteur et motif.
- **Séparation des responsabilités** à chaque niveau de la chaîne financière : celui qui saisit ne valide pas sa propre opération, à aucun des trois niveaux (agent → chef → DAF).
- **Aucune dépendance** (Maven ou npm) n'est ajoutée sans suivre la procédure du `05_DEPENDANCES_CHAINE_LOGICIELLE.md` du pack concerné, journal des dépendances inclus. Pas d'exception pour un utilitaire trivial.
- **Aucun secret** dans le code, la configuration versionnée ou l'historique Git.
- Avant de committer : vérifier `git status` après un `git add` large, ne jamais committer un fichier dont le contenu n'a pas été relu si son nom suggère un secret.
- Ne pas créer de documents de planification ou de synthèse intermédiaires non demandés ; le travail se voit dans le code et la documentation des packs, pas dans des fichiers annexes.

## 9. Repères rapides avant toute implémentation

Avant d'écrire du code sur une fonctionnalité V1, vérifier dans l'ordre :

1. Le sprint auquel elle appartient (§4) est-il atteint dans l'ordre des dépendances ?
2. La fonctionnalité est-elle dans le périmètre exclu (§5) ? Si oui, ne pas la construire, le dire.
3. Existe-t-il déjà un contrat API documenté (`03_SPECIFICATIONS_API.md` / `03_SPECIFICATIONS_ECRANS.md`) ou s'agit-il d'un des cinq contrats en attente (§6) ?
4. Les rôles concernés sont-ils bien parmi les huit de §3, avec le bon périmètre de données ?
5. Une règle `[V]` est-elle en jeu ? Si oui, appliquer §7 plutôt que trancher soi-même.
