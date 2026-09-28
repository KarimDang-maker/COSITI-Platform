# `src/components/ui` — primitives shadcn

Couche **technique**, sans connaissance du métier COSITI. Un composant d'ici
ne sait pas ce qu'est un adhérent, une cotisation ou un dossier CNPS.

## Règles

1. **Fichiers générés par la CLI**, jamais écrits à la main :
   `npx shadcn@latest add button`. Les noms restent ceux de shadcn, en anglais
   (`button.tsx`, `table.tsx`) — c'est la condition pour pouvoir régénérer un
   composant sans conflit.
2. **Seule modification autorisée** : remplacer une classe par un jeton COSITI
   (`bg-zinc-900` → `bg-primaire`) et ajuster hauteurs et rayons. Toute
   modification est notée en commentaire `/* COSITI: … */` en tête du fichier
   pour rester repérable à la régénération.
3. **Aucune règle métier ici.** Pas de statut, pas de permission, pas de libellé
   fonctionnel, pas d'appel API. Tout cela vit dans `../cositi/`.
4. **Aucune valeur hexadécimale.** Les couleurs viennent de
   `src/styles/tokens.css` via les utilitaires déclarés dans `globals.css`.
5. **Pas de variante décorative.** On n'ajoute une variante que si un écran
   spécifié dans `docs/03_SPECIFICATIONS_ECRANS.md` en a besoin.

## Primitives du périmètre V1

| Fichier | Sert à |
|---|---|
| `button.tsx` | Actions. Variantes : `default` (vert), `marque` (orange, action prioritaire), `outline`, `ghost`, `destructive`, `link` |
| `input.tsx` · `textarea.tsx` · `label.tsx` | Saisie |
| `select.tsx` · `checkbox.tsx` · `radio-group.tsx` · `switch.tsx` | Choix |
| `badge.tsx` | Support de `BadgeStatut` — ne porte pas la logique de teinte |
| `card.tsx` | Conteneur de section |
| `table.tsx` | Tableau brut, sans tri ni pagination |
| `dialog.tsx` · `sheet.tsx` · `alert-dialog.tsx` | Surfaces flottantes |
| `dropdown-menu.tsx` · `tooltip.tsx` · `popover.tsx` | Menus et aides |
| `tabs.tsx` · `separator.tsx` · `skeleton.tsx` · `scroll-area.tsx` | Structure |
| `sonner.tsx` | Notifications transitoires |

## Variante `marque`

Elle n'existe pas dans shadcn : on l'ajoute au `buttonVariants` de
`button.tsx`. Fond orange, **texte sombre** (`text-marque-contenu`) — du blanc
sur l'orange de la charte donne 2,46:1 et échoue au critère AA.

```ts
marque: "bg-marque text-marque-contenu hover:bg-marque-survol",
```

Référence complète : [`docs/02_DESIGN_SYSTEM.md`](../../../docs/02_DESIGN_SYSTEM.md).
