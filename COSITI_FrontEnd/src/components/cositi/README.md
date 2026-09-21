# `src/components/cositi` — composants métier

Couche **COSITI**. Ces composants connaissent les adhérents, les cotisations,
les dossiers CNPS, les rôles et les permissions. Ils sont écrits à la main, en
français, et composent les primitives de `../ui/`.

## Règles

1. **Noms en français**, comme le reste du domaine (`badge-statut.tsx`,
   `carte-indicateur.tsx`). Le métier COSITI est en français, du schéma de base
   jusqu'à l'écran.
2. **Un composant d'ici ne réimplémente jamais une primitive** : il compose
   `Button`, `Table`, `Dialog`. S'il faut un comportement nouveau, il vient de
   `../ui/`, pas d'un `<div>` stylé à la main.
3. **Aucun appel réseau.** Ces composants reçoivent des données en props. Le
   chargement, le cache et la gestion d'erreur vivent dans les vues et les
   hooks.
4. **La teinte d'un statut vient toujours de `src/lib/statuts.ts`**, le
   formatage toujours de `src/lib/format.ts`. Aucune exception.
5. **Le masquage n'est pas une protection.** Un composant peut cacher un bouton
   selon les permissions renvoyées par `GET /auth/moi`, mais l'autorisation
   réelle est vérifiée par l'API. Ne jamais raisonner « le bouton est caché,
   donc l'action est impossible ».

## Composants du périmètre V1

| Composant | Rôle |
|---|---|
| `badge-statut.tsx` | `domaine` + `code` → libellé + teinte. Seul composant autorisé à afficher un statut |
| `carte-indicateur.tsx` | Valeur, libellé, période de référence, évolution. Base des six tableaux de bord |
| `tableau-donnees.tsx` | En-tête collant, tri serveur, pagination serveur, ligne activable au clavier |
| `barre-filtres.tsx` | Filtres de liste alignés sur les paramètres de requête de l'API |
| `etat-vide.tsx` | Message explicite + action. Jamais un tableau vide sans explication |
| `squelette-*.tsx` | Chargement : ligne, carte, tableau. Préféré au spinner plein écran |
| `alerte.tsx` | Bandeau persistant : information, attention, danger, succès |
| `avertissement-regle.tsx` | Bandeau spécifique aux règles `[V]` non validées par la COSITI |
| `dialogue-confirmation.tsx` | Confirmation d'action sensible, avec motif obligatoire quand la règle l'impose |
| `champ-*.tsx` | Champs composés : montant, téléphone, date, matricule, sélecteur d'adhérent avec recherche |
| `coquille-application.tsx` | Gabarit : navigation latérale + en-tête + zone de contenu |
| `navigation-laterale.tsx` | Navigation filtrée par permissions, logo inversé sur fond vert foncé |
| `entete-application.tsx` | Fil d'Ariane, recherche globale, notifications, menu utilisateur avec rôle |
| `logo-cositi.tsx` | Sélection de la bonne variante de logo selon le contexte et la place |
| `avatar-utilisateur.tsx` | Initiales ou photo, badge de rôle |
| `journal-audit.tsx` | Ligne d'audit : horodatage, auteur, action, cible |

Référence complète : [`docs/02_DESIGN_SYSTEM.md`](../../../docs/02_DESIGN_SYSTEM.md).
