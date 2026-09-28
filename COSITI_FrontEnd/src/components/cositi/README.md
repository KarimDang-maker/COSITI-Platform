# `src/components/cositi` — composants métier

Couche **COSITI**. Ces composants connaissent les adhérents, les cotisations,
les dossiers CNPS, les rôles et les permissions. Ils sont écrits à la main, en
français, et composent les primitives de `../ui/`.

Depuis la v1.1 du design system, ils reprennent la structure visuelle du
gabarit « Spark Admin » traduite dans l'identité COSITI
(`docs/02_DESIGN_SYSTEM.md §2.1`). Chacun est rendu dans le catalogue
`/design-system` (développement uniquement).

## Règles

1. **Noms en français**, comme le reste du domaine (`badge-statut.tsx`,
   `carte-indicateur.tsx`). Le métier COSITI est en français, du schéma de base
   jusqu'à l'écran.
2. **Un composant d'ici ne réimplémente jamais une primitive** : il compose
   `Button`, `Table`, `Dialog`. S'il faut un comportement nouveau, il vient de
   `../ui/`, pas d'un `<div>` stylé à la main.
3. **Aucun appel réseau.** Ces composants reçoivent des données en props. Le
   chargement, le cache et la gestion d'erreur vivent dans les vues et les
   hooks. (Exceptions assumées de la coquille : `ClocheNotifications` et
   `NavigationLaterale` lisent la session et les notifications de l'en-tête.)
4. **La teinte d'un statut vient toujours de `src/lib/statuts.ts`**, le
   formatage toujours de `src/lib/format.ts`, le libellé d'un rôle de
   `src/lib/roles.ts`. Aucune exception.
5. **Le masquage n'est pas une protection.** Un composant peut cacher un bouton
   selon les permissions renvoyées par `GET /auth/moi`, mais l'autorisation
   réelle est vérifiée par l'API. Ne jamais raisonner « le bouton est caché,
   donc l'action est impossible ».
6. **Un écran n'assemble plus à la main** ce qu'un composant d'ici fournit :
   en-tête de page, carte, pagination, champ avec libellé et erreur, champ
   montant, recherche, cellule « personne ».

## Composants du périmètre V1

### Coquille

| Composant | Rôle |
|---|---|
| `coquille-application.tsx` | Gabarit : navigation latérale (fixe, repliable, tiroir sous 1024 px) + en-tête collant + contenu + pied |
| `navigation-laterale.tsx` | Navigation filtrée par permissions, en sections ; logo inversé, liseré orange, carte profil |
| `entete-application.tsx` | Repli de la navigation, menu « Créer », notifications, menu utilisateur |
| `bouton-entete.tsx` | Bouton carré d'en-tête, icône seule avec `aria-label` obligatoire |
| `menu-creation.tsx` | Raccourcis vers les écrans de saisie existants, filtrés par permission |
| `menu-utilisateur.tsx` | Avatar, nom, rôle, changement de mot de passe, déconnexion |
| `cloche-notifications.tsx` | Notifications (J8) : compteur écrit, panneau, point « non lue » |
| `pied-page.tsx` | Pied de page de la coquille |
| `logo-cositi.tsx` | Sélection de la bonne variante de logo selon le contexte et la place |
| `cadre-authentification.tsx` | Écrans hors coquille : connexion, changement de mot de passe |
| `page-erreur.tsx` | Carte d'erreur pleine page (accès refusé) |

### Structure d'écran

| Composant | Rôle |
|---|---|
| `entete-page.tsx` | Fil d'Ariane, unique `h1`, sous-titre, statut, actions |
| `fil-ariane.tsx` | Fil d'Ariane, dernier maillon `aria-current` |
| `carte-section.tsx` | Seule manière de poser une carte : titre, description, actions, pied, pleine largeur |
| `menu-actions.tsx` | Menu « … » d'une carte ou d'une ligne |

### Données

| Composant | Rôle |
|---|---|
| `badge-statut.tsx` | `domaine` + `code` → libellé + teinte. Seul composant autorisé à afficher un statut |
| `carte-indicateur.tsx` | `CarteIndicateur`, `RangeeIndicateurs`, `Tendance` — base des six tableaux de bord ; `principal` = carte vert foncé |
| `liste-elements.tsx` | Lignes riches : pastille d'icône, titre, sous-titre, valeur |
| `liste-alertes.tsx` | Points nécessitant attention d'un tableau de bord |
| `barre-progression.tsx` | Libellé, valeur écrite, barre |
| `graphique-zones.tsx` | Comparaison des zones, une mesure à la fois, tableau accessible |
| `tableau-donnees.tsx` | Carte-tableau : barre d'outils, en-tête collant, tri serveur, ligne activable au clavier, pied |
| `pagination.tsx` | Total réel, page courante, Précédent / numéros / Suivant |
| `barre-filtres.tsx` | Filtres de liste alignés sur les paramètres de requête de l'API |
| `cellule-identite.tsx` | Avatar + nom + précision, pour les colonnes « personne » |
| `avatar-utilisateur.tsx` | Initiales, trois tailles, fond clair ou inversé |

### Saisie

| Composant | Rôle |
|---|---|
| `champ-formulaire.tsx` | Libellé, contrôle, aide, erreur reliée et annoncée |
| `champ-montant.tsx` | Montant en chasse fixe, aligné à droite, « FCFA » accolé |
| `champ-mot-de-passe.tsx` | Mot de passe avec bouton afficher / masquer |
| `champ-recherche.tsx` | Recherche de liste, loupe dans le champ |
| `champ-icone.tsx` | Champ précédé d'une icône décorative (connexion) |
| `champ-date.tsx` | Champ date natif + calendrier du gabarit |
| `calendrier.tsx` | Calendrier du gabarit (jour ou période), sans dépendance |
| `selecteur-periode.tsx` | Pastille « période » des tableaux de bord |
| `select-recherche.tsx` | Sélecteur avec recherche obligatoire au-delà de 10 options (zones, agents, adhérents) |

### Retours

| Composant | Rôle |
|---|---|
| `alerte.tsx` | Bandeau persistant : information, attention, danger, succès ; action facultative |
| `avertissement-regle.tsx` | Bandeau spécifique aux règles `[V]` non validées par la COSITI |
| `etat-vide.tsx` | Icône, message explicite + action. Jamais un tableau vide sans explication |
| `squelette-tableau.tsx` | Chargement d'un tableau. Préféré au spinner plein écran |
| `dialogue-confirmation.tsx` | Confirmation d'action sensible, avec motif obligatoire quand la règle l'impose |
| `dialogue-televerser-document.tsx` | Dépôt d'un document (J7) |

Référence complète : [`docs/02_DESIGN_SYSTEM.md`](../../../docs/02_DESIGN_SYSTEM.md).
