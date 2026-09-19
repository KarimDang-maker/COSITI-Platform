# 03 — Spécifications des écrans (V1)

Chaque écran est décrit par : sa route, sa permission d'accès, son contenu, ses actions et ses états particuliers. Les permissions sont celles renvoyées par `GET /auth/moi`.

## Navigation

| Menu | Route | Permission d'affichage |
|---|---|---|
| Tableau de bord | `/` | authentifié |
| Adhérents | `/adherents` | `ADHERENT:LIRE` |
| Cotisations | `/cotisations` | `PAIEMENT:LIRE` |
| Droits | `/droits` | `DROITS:LIRE` |
| CNPS | `/cnps` | `CNPS:LIRE` |
| DAF | `/daf` | `TRESORERIE:LIRE` |
| Zones et agents | `/organisation` | `ORGANISATION:LIRE` |
| Relances | `/relances` | `RELANCE:LIRE` |
| Documents | `/documents` | `DOCUMENT:LIRE` |
| Rapports | `/rapports` | `RAPPORT:LIRE` |
| Administration | `/administration` | `ADMINISTRATION:LIRE` |
| Audit | `/audit` | `AUDIT:CONSULTER` |

Un menu dont l'utilisateur n'a pas la permission n'est pas affiché — pas affiché grisé.

---

## E01 — Connexion · `/connexion`

Identifiant, mot de passe, bouton de connexion. Saisie du code TOTP en seconde étape si le compte a la double authentification active.

Contraintes : aucun message distinguant « identifiant inconnu » de « mot de passe incorrect » (message unique). Aucune indication du nombre de tentatives restantes. Verrouillage temporaire annoncé avec le délai, sans plus de détail. Si `doitChangerMotDePasse`, redirection forcée vers le changement avant tout accès.

---

## E02 — Tableau de bord · `/`

Contenu selon le rôle, quatre variantes alimentées par `/tableaux-de-bord/{direction|daf|cnps|terrain}`.

**Direction (PCA, DG, DGA)** — première carte : taux d'activation, avec l'effectif de référence et la période. Puis : effectif total et évolution, collecte du mois, adhérents en retard, ventilation par mode de paiement, dossiers CNPS par statut, performance par zone. Graphique d'évolution de la collecte sur 12 mois. Le PCA a la même vue que DG/DGA en lecture seule stratégique ; « temps réel » signifie ici données actualisées à la demande ou par rafraîchissement contrôlé, aucun mécanisme de flux temps réel n'étant spécifié en V1.

**DAF** — collecte par mode de paiement, espèces en attente de remise interne (caisse/coffre-fort — jamais un versement bancaire), remises en écart, paiements à contrôler, paiements sans référence de transaction, paiements confirmés par la hiérarchie en attente de contrôle DAF **[A — dépend du contrat de confirmation hiérarchique, voir `docs/03_SPECIFICATIONS_ECRANS.md` §E11]**.

**Gestionnaire des comptes** — adhérents éligibles non immatriculés, dossiers incomplets avec la pièce manquante, déclarations du mois à produire / produites / accusées.

**Terrain (Chef des agents de terrain, Agent de terrain)** — portefeuille, retardataires du jour, relances effectuées et résultats, montant collecté, caisse à remettre. Le Chef des agents de terrain voit en plus l'agrégat de son équipe (zones et objectifs), selon le contrat [A] de supervision retenu.

Filtres communs : période, zone. Chaque carte indique sa date de calcul. Les avertissements de règle non validée renvoyés par l'API apparaissent en bandeau `Alerte` d'information en haut de page.

---

## E03 — Liste des adhérents · `/adherents`

Colonnes : matricule (mono), nom et prénoms, téléphone, activité, zone, agent référent, pack, statut (badge), cumul cotisé, dernière cotisation.

Filtres : recherche libre (matricule, nom, téléphone, CNI), zone, agent, activité, statut, pack, association, « sans agent référent », période d'adhésion. Les filtres sont dans l'URL.

Actions : nouvel adhérent (`ADHERENT:CREER`), export (`EXPORT:ADHERENT`), clic sur une ligne → fiche.

Points d'attention : pagination serveur obligatoire · un agent de terrain ne voit que son portefeuille, sans que ce soit présenté comme une restriction · un filtre rapide « jamais cotisé » est mis en évidence, c'est la population que la coopérative doit traiter en priorité.

---

## E04 — Nouvel adhérent · `/adherents/nouveau`

Formulaire en quatre étapes, avec récapitulatif avant validation.

1. **Identité** — nom, prénoms, date de naissance, sexe, téléphone principal, téléphone secondaire, CNI.
2. **Activité et localisation** — activité, zone, quartier, ville, localisation, association, géolocalisation facultative avec accord explicite.
3. **Adhésion** — date d'adhésion, pack, agent référent, inscription payée, numéro CNPS si déjà connu.
4. **Récapitulatif** — relecture, mention d'information sur le traitement des données et case de consentement horodaté, validation.

**Contrôle de doublon** : à la sortie du champ téléphone principal et du champ CNI, appel à `POST /adherents/verifier-doublon`. Les candidats s'affichent dans un panneau `AlerteDoublon` non bloquant : matricule, nom, téléphone masqué, motif de correspondance, lien vers la fiche existante. L'utilisateur peut ouvrir la fiche existante ou continuer ; continuer exige de cocher « j'ai vérifié, il s'agit d'une personne différente », ce qui est journalisé côté serveur.

Le matricule n'est jamais saisi : il est attribué par l'API à la création et affiché en confirmation, avec une action d'impression du reçu d'inscription.

---

## E05 — Fiche adhérent · `/adherents/:id`

En-tête : matricule, nom complet, badge de statut, badge de régularité, pack, zone, agent référent, téléphone.

Onglets :
- **Situation** — couvert jusqu'au, jours couverts, jours de retard, cumul cotisé, solde avant seuil CNPS, éligibilité CNPS. Frise des périodes de droits.
- **Cotisations** — journal des versements de l'adhérent, avec statut et mode.
- **Droits** — détail des périodes, avec la source (paiement d'origine).
- **CNPS** — dossier, pièces, déclarations.
- **Documents** — pièces rattachées.
- **Relances** — historique des contacts et résultats.
- **Historique** — extrait du journal d'audit concernant cet adhérent (`AUDIT:CONSULTER`).

Actions : modifier (`ADHERENT:MODIFIER`), changer de statut, changer de pack, enregistrer un paiement, transférer le portefeuille, archiver (`ADHERENT:ARCHIVER`, motif obligatoire).

Aucun calcul fait côté client dans cet écran : tout vient de `/droits/adherents/{id}`.

---

## E06 — Journal des cotisations · `/cotisations`

Colonnes : date, matricule, adhérent, montant, mode, référence de transaction, agent encaisseur, statut, créé par.

Filtres : période, adhérent, agent, mode, statut, montant minimum et maximum, « sans référence », « à contrôler ».

Actions : nouveau paiement, export, clic → détail.

Mise en évidence : les paiements mobile money sans référence de transaction sont signalés visuellement — c'est l'anomalie qui rend le rapprochement impossible.

---

## E07 — Nouveau paiement · `/cotisations/nouveau`

Champs : adhérent (sélecteur avec recherche par matricule, nom ou téléphone — affiche la situation de régularité dès la sélection), date, montant, mode de paiement, référence de transaction, agent encaisseur, pièce justificative, type (inscription ou cotisation).

Comportements :
- Le champ référence devient obligatoire et signalé comme tel dès que le mode est Orange Money ou MTN MoMo. **Aucune valeur de repli n'est proposée ni générée.**
- Un aperçu indicatif affiche ce que le versement couvrira, **uniquement s'il est renvoyé par l'API**. Aucun calcul de jours couverts côté client.
- Le bouton de soumission envoie un en-tête `Idempotency-Key` généré au montage du formulaire : un double clic ou un renvoi ne crée pas deux paiements.
- Après création, le paiement est en « à contrôler » — l'écran le dit explicitement et propose l'impression du reçu.

---

## E08 — Détail d'un paiement · `/cotisations/:id`

Contenu : toutes les données du versement, l'affectation (répartition par composante), les périodes de droits générées, l'auteur, le validateur, la pièce justificative, l'historique d'audit.

Actions : valider (`PAIEMENT:VALIDER` — **masqué si l'utilisateur est le créateur**, avec explication au survol), corriger (motif obligatoire), annuler (motif obligatoire, confirmation rappelant montant, date et adhérent), imprimer le reçu.

Si l'API renvoie l'avertissement « règle de répartition non validée », un bandeau le dit en clair : la ventilation affichée est provisoire.

---

## E09 — Droits et régularité · `/droits`

Vue liste des retardataires : matricule, adhérent, pack, couvert jusqu'au, jours de retard, cumul, agent, zone, statut de régularité.

Filtres : jours de retard minimum, zone, agent, pack, statut. Tri par défaut : retard décroissant.

Actions : créer une campagne de relance à partir de la sélection (`RELANCE:CREER`), export, clic → fiche adhérent.

---

## E10 — CNPS · `/cnps`

Trois sous-vues : **dossiers** (liste filtrable par statut, zone, pièce manquante), **éligibles non immatriculés** (population prioritaire), **déclarations** (à produire, produites, accusées, par mois).

Écran de dossier : informations de l'adhérent, numéro d'immatriculation, revenu mensuel déclaré (**champ signalé comme non validé tant que la règle d'assiette ne l'est pas**), liste des pièces avec leur statut et la possibilité de téléverser, historique des changements de statut, action de changement de statut avec commentaire.

Les transitions non autorisées ne sont pas proposées dans le sélecteur.

---

## E11 — DAF · `/daf`

Journal financier, remises de caisse (déclarées, reçues, en écart), rapprochement mobile money (P1), justificatifs, états de synthèse. Ce module ne représente que des opérations internes de contrôle (caisse/coffre-fort COSITI) : aucun écran ne doit suggérer un versement bancaire, un dépôt en microfinance ou un virement déclenché depuis la plateforme — l'ancien scénario de versement bancaire du prototype existant est supprimé.

Écran de remise de caisse : agent, date, montant déclaré, liste des paiements concernés, montant reçu à saisir, écart calculé et affiché immédiatement. Le bouton de réception est masqué si l'utilisateur connecté est l'agent concerné.

**[A — contrat à valider, ne pas construire avant accord]** Le nouveau scénario S05 ajoute une étape de confirmation hiérarchique par le Chef des agents de terrain entre la saisie de l'agent et le contrôle DAF, et un signalement structuré d'incohérence par le DAF (motif obligatoire, sans suppression). Tant que le contrat REST n'est pas fixé (`03_SPECIFICATIONS_API.md` §10 côté API), cet écran continue d'afficher le cycle actuel (à contrôler → validé/annulé) avec un bandeau d'avertissement plutôt que de simuler les nouveaux états.

Le périmètre de ce module reste marqué [V] au-delà : ne rien développer au-delà de la traçabilité tant que le DAF n'a pas spécifié ses besoins.

---

## E12 — Zones et agents · `/organisation`

**Zones** : liste, création, modification, adhérents rattachés.

**Agents** : liste avec code, nom, zone, taille du portefeuille, part d'actifs, montant collecté du mois, taux de retard. C'est cette vue qui permet de voir qu'un agent porte 300 adhérents dont 80 % d'inactifs pendant qu'un autre en porte 60 tous à jour.

**Portefeuilles** : affectation individuelle ou en lot, transfert avec motif obligatoire, historique des affectations, vue « adhérents sans agent référent » par zone.

Le transfert affiche une confirmation rappelant le nombre d'adhérents concernés et les deux agents.

**[A — contrat à valider, ne pas construire avant accord]** Deux actions du modèle de rôles V1 n'ont pas encore de contrat API : la désignation d'un agent comme Chef des agents de terrain par le DGA, et l'attribution d'un objectif à un agent ou une zone par le Chef/DGA. Une maquette d'écran peut être proposée (par exemple une action « Désigner comme chef » sur la fiche agent), mais elle ne doit pas être branchée sur un appel réseau tant que `03_SPECIFICATIONS_API.md` §10 n'a pas fixé le chemin.

---

## E13 — Relances · `/relances`

File de relance : adhérents à contacter, responsable, statut, dernier contact, prochaine action.

Enregistrement d'un résultat : canal (appel, SMS, WhatsApp, visite), résultat dans une **liste fermée** (promesse, paiement, injoignable, refus, déménagé, absent), commentaire, prochaine action. La liste fermée est ce qui rend la relance mesurable : ne jamais la remplacer par un champ libre.

Campagnes : création à partir d'un critère (retard supérieur à N jours, jamais cotisé, zone), attribution, suivi des résultats.

---

## E14 — Documents · `/documents`

Bibliothèque filtrable par type, statut, adhérent, dossier. Téléversement avec type, rattachement obligatoire, prévisualisation.

Contraintes d'interface : taille maximale annoncée avant le choix du fichier · seuls les types autorisés proposés · consultation d'une pièce d'identité précédée d'un avertissement rappelant que l'accès est journalisé · aucun lien de téléchargement direct, tout passe par l'API authentifiée.

---

## E15 — Rapports · `/rapports`

Rapports prédéfinis : adhérents récemment inscrits · adhérents non à jour · paiements par période et par mode · paiements sans référence ou en anomalie · adhérents avec données obligatoires manquantes · dossiers CNPS incomplets · activité par zone et par agent · résultats des campagnes de relance · journal des validations et corrections · rapport de contrôle de cohérence.

Chaque rapport : filtres, aperçu paginé, export CSV ou XLSX. Un export volumineux est généré en tâche de fond et récupéré quand il est prêt. L'écran rappelle que l'export est journalisé.

---

## E16 — Administration · `/administration`

**Utilisateurs** : création, activation, désactivation, réinitialisation de mot de passe, attribution de rôles, état de la double authentification. Aucun mot de passe n'est affiché ni envoyé par un canal non sécurisé.

**Rôles et permissions** : matrice rôle × permission, modifiable par `ADMINISTRATION:MODIFIER`. Toute modification est journalisée et signalée comme sensible avant validation.

**Référentiels** : zones, activités, packs, composantes d'affectation, modes de paiement.

**Paramètres métier** : liste des paramètres avec leur valeur, leur libellé et leur **statut de validation**. Un paramètre marqué à valider apparaît explicitement comme tel : c'est le point le plus important de cet écran, car il rend visible ce qui n'a pas encore été arbitré par la COSITI. Toute modification exige un motif.

---

## E17 — Audit · `/audit`

Journal filtrable : période, utilisateur, type d'opération, entité, identifiant d'entité, résultat.

Détail d'une entrée : valeurs avant et après (champs sensibles masqués), motif, adresse IP, identifiant de trace.

**Lecture seule stricte.** Aucun bouton de suppression, de purge ou d'export destructif, quel que soit le rôle. L'export du journal est possible et lui-même journalisé.

---

## Écrans transverses

| Écran | Comportement |
|---|---|
| Accès non autorisé | Message clair, retour à l'accueil. Ne divulgue pas l'existence de la ressource |
| Page introuvable | Message et retour, sans détail technique |
| Erreur inattendue | Message générique, identifiant de trace affiché pour le support, bouton « réessayer » |
| Hors ligne | Bandeau signalant la perte de connexion ; les formulaires en cours ne sont pas vidés |
| Session expirée | Modale de reconnexion conservant le contexte, pas de redirection brutale avec perte de saisie |
