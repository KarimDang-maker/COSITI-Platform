# 02 — Design system COSITI

Version 1.0 — 21/09/2026
Destinataire : **l'agent de code qui développe le frontend COSITI**.

Ce document est la référence unique du design de la plateforme. En cas d'écart
entre ce document et un écran existant, c'est ce document qui fait foi. En cas
d'écart entre ce document et `COSITI_branding_pack/COSITI_charte_graphique.md`,
c'est **la charte** qui fait foi : signale l'écart, ne le corrige pas seul.

| Marqueur | Sens |
|---|---|
| **[C]** | Confirmé (charte COSITI ou cahier des charges) — implémentable tel quel |
| **[A]** | À analyser — proposition technique, à confirmer par le chef de projet |
| **[V]** | À valider par la COSITI — **jamais figé en dur dans le code** |

---

## 1. Les six règles

Elles priment sur toute préférence esthétique.

1. **Aucune valeur hexadécimale hors de `src/styles/tokens.css`.** Un composant
   consomme un jeton sémantique. Si la couleur nécessaire n'existe pas, on
   l'ajoute au fichier de jetons avec son ratio de contraste mesuré — on ne
   l'écrit pas en ligne.
2. **La couleur porte du sens, jamais de la décoration.** Un aplat coloré
   signifie toujours quelque chose : un statut, une alerte, l'action
   principale. Si on ne sait pas dire ce que la couleur signifie, on la retire.
3. **La couleur n'est jamais le seul indicateur.** Un statut s'accompagne
   toujours de son libellé, une erreur d'un message explicite, un écart de son
   signe.
4. **Une seule action primaire par écran.** Tout le reste est secondaire,
   tertiaire ou destructif.
5. **Le frontend masque, il ne protège pas.** Cacher un bouton selon les
   permissions de `GET /auth/moi` est une commodité d'affichage. L'autorisation
   réelle est vérifiée par l'API, systématiquement.
6. **Tout statut passe par `src/lib/statuts.ts`, tout formatage par
   `src/lib/format.ts`.** Deux écrans qui formatent différemment le même
   montant font douter de la donnée.

---

## 2. Parti pris

L'interface est un outil de travail utilisé plusieurs heures par jour, par des
personnes dont une partie n'est pas à l'aise avec le numérique, sur des postes
et des connexions inégaux. Elle doit être **lisible, prévisible et silencieuse**.

L'identité COSITI y entre par le vert : il structure la navigation, les titres
et les actions positives. L'orange reste rare et donc efficace — il signale
l'action prioritaire et marque l'appartenance à la marque, pas plus. Les fonds
sont clairs pour réduire la fatigue visuelle sur de longues sessions de saisie.

Pas de dégradé, pas d'ombre décorative, pas d'animation d'agrément, pas
d'emoji, pas de mode sombre en V1.

---

## 3. Arborescence

```
COSITI_FrontEnd/
├── components.json                  config shadcn/ui (alias, style, icônes)
├── docs/02_DESIGN_SYSTEM.md         ce document
├── COSITI_branding_pack/            charte + logos — source de vérité de la marque
└── src/
    ├── styles/
    │   ├── tokens.css               JETONS — seul fichier qui contient des HEX
    │   └── globals.css              pont Tailwind v4 + styles de base
    ├── lib/
    │   ├── utils.ts                 cn()
    │   ├── statuts.ts               statut API → libellé + teinte
    │   └── format.ts                montants, dates, matricules, téléphones
    └── components/
        ├── ui/                      primitives shadcn, techniques, en anglais
        └── cositi/                  composants métier, en français
```

La séparation `ui/` ↔ `cositi/` est structurante : `ui/` est régénérable par la
CLI shadcn, `cositi/` porte tout ce qui est propre à la coopérative. Un statut
d'adhérent n'a rien à faire dans `ui/badge.tsx`.

---

## 4. Couleurs

### 4.1 Marque — charte §2 [C]

| Jeton | HEX | Usage prescrit par la charte |
|---|---|---|
| `--cositi-orange` | `#F28C18` | Actions prioritaires, accents de marque |
| `--cositi-orange-fonce` | `#C9680B` | Survol, confirmation, accents sombres |
| `--cositi-vert` | `#146B45` | Navigation, boutons principaux, actions positives |
| `--cositi-vert-fonce` | `#0B4931` | Titres, navigation forte, fonds de contraste |
| `--cositi-vert-clair` | `#DDF3E7` | Succès, badges, surfaces douces |
| `--cositi-creme` | `#FFF8ED` | Alertes douces, surfaces chaleureuses |
| `--cositi-fond-interface` | `#F5F7F6` | Arrière-plan global |
| `--cositi-texte-principal` | `#1F2933` | Contenu courant |
| `--cositi-texte-secondaire` | `#6B7280` | Légendes, aide, métadonnées |
| `--cositi-information` | `#247BA0` | Messages informatifs |
| `--cositi-avertissement` | `#D99A18` | États nécessitant attention |
| `--cositi-erreur` | `#C83E4D` | Erreurs, actions destructives |

### 4.2 Ce que la charte n'a pas tranché, et qui l'est ici

La charte indique elle-même que « le contraste doit être vérifié dans
l'environnement final ». Vérification faite, sur blanc :

| Couleur | Ratio | Conclusion |
|---|---:|---|
| Vert `#146B45` | 6,52 | Texte et aplat : conforme |
| Vert foncé `#0B4931` | 10,44 | Titres : excellent |
| Information `#247BA0` | 4,75 | Texte : conforme |
| Erreur `#C83E4D` | 4,94 | Texte et aplat blanc : conforme |
| Texte secondaire `#6B7280` | 4,83 sur blanc · **4,49** sur `#F5F7F6` | Conforme sur carte, limite sur le fond de page |
| Orange foncé `#C9680B` | 3,84 | Bordures, icônes, grand texte seulement |
| **Orange `#F28C18`** | **2,46** | **Jamais du texte. Jamais de blanc dessus.** |
| **Avertissement `#D99A18`** | **2,45** | **Jamais du texte sur fond clair.** |

Trois décisions en découlent, toutes appliquées dans `tokens.css` :

1. **L'orange est un aplat, pas une encre.** Un bouton orange porte du texte
   sombre (`--marque-contenu`, 6,00:1). Du blanc sur l'orange de la charte
   donne 2,46:1 et échoue. C'est l'erreur la plus probable sur ce projet :
   ne pas la commettre.
2. **Le bouton principal est vert, pas orange.** C'est la règle d'usage de la
   charte (« le vert principal convient aux boutons d'action principaux »), et
   c'est aussi la seule des deux couleurs qui tienne le contraste avec du blanc.
   L'orange reste pour l'action *prioritaire* — celle qu'on veut voir en
   premier dans une file de traitement — et pour les marqueurs de marque.
3. **Le texte secondaire sur le fond de page est à 4,49:1.** Le jeton
   `--texte-doux-fort` (`#5A626D`, 5,73:1) [A] existe pour ces cas. Règle
   simple : `--texte-doux` sur une carte blanche, `--texte-doux-fort` sur le
   fond de page et les en-têtes de tableau.

### 4.3 Jetons sémantiques

Les composants n'utilisent **que** cette couche. Elle est définie dans
`tokens.css` §3 et exposée à Tailwind dans `globals.css`.

| Famille | Jetons | Utilitaires Tailwind |
|---|---|---|
| Surfaces | `--fond`, `--surface`, `--surface-douce`, `--surface-survol` | `bg-fond`, `bg-surface`, … |
| Traits | `--bordure`, `--bordure-forte` | `border-bordure` |
| Texte | `--texte`, `--texte-doux`, `--texte-doux-fort`, `--texte-inactif`, `--titre` | `text-texte-doux` |
| Action principale | `--primaire`, `--primaire-survol`, `--primaire-contenu`, `--primaire-doux` | `bg-primaire text-primaire-contenu` |
| Marque | `--marque`, `--marque-survol`, `--marque-contenu`, `--marque-trait` | `bg-marque text-marque-contenu` |
| Navigation | `--nav-fond`, `--nav-contenu`, `--nav-contenu-doux`, `--nav-actif-fond`, `--nav-actif-trait` | `bg-nav-fond` |
| Focus | `--anneau`, `--anneau-halo`, `--anneau-danger` | `ring-ring` |

> **Piège shadcn.** Dans shadcn, le jeton `accent` désigne la surface de survol
> neutre des menus, pas un accent de marque. `globals.css` mappe donc
> `--color-accent` sur `--surface-survol`. L'orange COSITI est exposé sous
> `marque`. Mapper l'orange sur `accent` rendrait orange tous les survols de
> menu déroulant.

### 4.4 Teintes d'état

Six teintes, pas une de plus. Convention de suffixes : `-doux` = surface,
`-fort` = texte et icône, `-trait` = bordure. Tout couple `doux`/`fort` est
au-dessus de 4,5:1.

| Teinte | Surface | Encre | Sens |
|---|---|---|---|
| `neutre` | `#EDF1EF` | `#4B5563` (6,64) | État sans charge : brouillon, inactif, archivé |
| `info` | `#E7F1F6` | `#1C6382` (5,80) | Étape en cours, transmission, information |
| `succes` | `#DDF3E7` | `#0B4931` (8,97) | Validé, à jour, traité |
| `attention` | `#FFF8ED` | `#8A6410` (5,09) | À contrôler, incomplet, en retard |
| `danger` | `#FBEAEC` | `#9E2C39` (6,29) | Annulé, rejeté, écart, jamais cotisé |
| `marque` | `#F28C18` plein | `#1F2933` (6,00) | Action prioritaire — **jamais un état métier** |

---

## 5. Statuts métier

La table de correspondance vit dans **`src/lib/statuts.ts`** et nulle part
ailleurs. Les codes viennent du schéma de l'API (`01_SCHEMA_BDD.md`,
`02_CLASSES_ET_METHODES.md`).

Domaines couverts : `adherent`, `regularite`, `periodeDroits`, `paiement`,
`modePaiement`, `remiseCaisse`, `dossierCnps`, `pieceCnps`, `document`,
`analyseAntivirus`, `compteRendu`, `rapportDaf`, `resultatRelance`,
`canalRelance`, `validationParametre`.

```tsx
<BadgeStatut domaine="paiement" code={paiement.statut} />
```

Trois points d'attention :

- **`JAMAIS_COTISE` est en rouge délibérément.** Sur 172 adhérents, 115 n'ont
  jamais cotisé : c'est le problème central de la coopérative, il ne doit pas
  se fondre dans le reste.
- **Un code inconnu ne casse jamais l'écran.** `definitionStatut()` renvoie le
  code brut en teinte neutre si l'API a pris de l'avance sur le frontend.
- **Jamais de pastille nue.** Un badge affiche toujours son libellé.

---

## 6. Typographie

Charte §3 : police sans empattement, **Noto Sans** ou **DejaVu Sans**. Noto Sans
est auto-hébergée en `woff2` (400 / 600 / 700, sous-ensemble latin étendu) —
pas de CDN de polices : les postes COSITI travaillent avec une connectivité
irrégulière et une police distante qui ne charge pas décale toute la page. [A]

Le lettrage du logo a son propre dessin : il n'est **jamais** reconstitué avec
une police système.

| Niveau | Taille | Couleur | Graisse | Élément |
|---|---:|---|---:|---|
| Titre de page | 32 px | vert foncé | 700 | `h1` — un seul par écran |
| Titre de section | 22 px | vert principal | 700 | `h2` |
| Sous-titre | 18 px | texte principal | 600 | `h3` |
| Texte courant | 16 px | texte principal | 400 | `p`, cellules |
| Libellé de champ | 14 px | texte principal | 600 | `label` |
| Légende et aide | 13 px | texte secondaire | 400 | aide, métadonnée |

Les styles de `h1`, `h2`, `h3` sont appliqués dans `globals.css` : le niveau
sémantique porte le style, un agent n'a pas à réappliquer taille et couleur.

**Au-delà de deux niveaux de titre dans un écran, l'écran est trop chargé** et
doit être découpé.

Chasse fixe (`--police-mono`) obligatoire pour : matricules, références de
transaction, numéros d'immatriculation CNPS, identifiants techniques. Chiffres
tabulaires (classe `.chiffre`) pour toute colonne de montants.

---

## 7. Espacement, rayons, ombres, mouvement

Échelle d'espacement : `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Aucune valeur
intermédiaire.

Rayons : `4` badge · `6` bouton et champ · `10` carte et modale · plein pour
pastilles et avatars.

Ombres : uniquement sur les cartes et les surfaces flottantes. Elles sont
teintées vert foncé — une ombre grise neutre paraît sale sur le fond
légèrement vert de l'interface.

Mouvement : `120 ms` pour le survol et le focus, `180 ms` pour l'ouverture
d'un panneau ou d'une modale. Rien d'autre n'est animé.
`prefers-reduced-motion` est respecté globalement dans `globals.css`.

---

## 8. Gabarit

Coquille fixe, identique pour les six tableaux de bord :

```
┌────────────┬──────────────────────────────────────────────┐
│            │  En-tête 56 px — fil d'Ariane · recherche    │
│ Navigation │  globale · notifications · menu utilisateur  │
│  latérale  ├──────────────────────────────────────────────┤
│   248 px   │                                              │
│ fond vert  │  Contenu — largeur max 1440 px               │
│   foncé    │  fond #F5F7F6, cartes blanches               │
└────────────┴──────────────────────────────────────────────┘
```

- Navigation : `248 px`, repliable à `64 px`, repliée d'office sous `1024 px`.
  Fond vert foncé, logo **inversé**, item actif sur fond vert principal avec un
  liseré orange de 3 px à gauche.
- Les entrées de navigation sont filtrées par les permissions renvoyées par
  `GET /auth/moi`. Une entrée sans permission n'est pas affichée grisée : elle
  n'est pas affichée.
- Grille de formulaire : une colonne sous `768 px`, deux colonnes au-delà. Les
  champs liés restent groupés (téléphone principal et secondaire côte à côte,
  jamais séparés par une rupture de colonne).
- Points de rupture : `640 · 768 · 1024 · 1280 · 1440`.

---

## 9. Composants

### 9.1 Contrats

| Composant | Emplacement | Points d'attention |
|---|---|---|
| `Button` | `ui/` | Variantes `default` (vert), `marque` (orange, texte sombre), `outline`, `ghost`, `destructive`, `link`. Un seul `default` par écran. État de chargement **bloquant** — sur `POST /paiements`, le double envoi est une écriture financière en double, même si l'API impose `Idempotency-Key` |
| `BadgeStatut` | `cositi/` | `domaine` + `code`. Seul composant autorisé à afficher un statut |
| Champs | `ui/` + `cositi/` | Libellé toujours visible — jamais un simple texte indicatif. Aide sous le champ. Erreur reliée par `aria-describedby`. Le champ montant est en chasse fixe et aligné à droite |
| `Select` avec recherche | `cositi/` | Recherche obligatoire au-delà de 10 options : listes d'adhérents, d'agents, de zones |
| `TableauDonnees` | `cositi/` | En-tête collant, tri et pagination **serveur** (`?page=&taille=&tri=`), ligne activable au clavier, total réel affiché (« 172 adhérents ») |
| `Alerte` | `cositi/` | Bandeau persistant, quatre teintes. Pour les messages transitoires, utiliser les notifications |
| `AvertissementRegle` | `cositi/` | Bandeau `attention` pour toute règle `[V]`. Voir §10 |
| `DialogueConfirmation` | `ui/` + `cositi/` | Rappelle les valeurs concernées dans le texte. Motif obligatoire pour une annulation ou une correction — le champ motif est dans le dialogue, pas après |
| `EtatVide` | `cositi/` | Message explicite + action possible. Jamais un tableau vide sans explication |
| `Squelette` | `cositi/` | Préféré au spinner plein écran |
| `CarteIndicateur` | `cositi/` | Valeur, libellé, période de référence, évolution. La période est obligatoire : un chiffre sans période n'est pas un indicateur |
| `LigneAudit` | `cositi/` | Horodatage, auteur, action, cible — les quatre, toujours |

### 9.2 Ce qui n'existe pas et ne doit pas être créé

Carrousel, accordéon décoratif, fenêtre modale à l'intérieur d'une fenêtre
modale, infobulle portant une information indispensable, tableau à défilement
horizontal sur colonnes fixes, icône seule sans libellé ni `aria-label`.

---

## 10. Règles `[V]` : les rendre visibles

Certaines règles de calcul ne sont pas validées par la COSITI — la
décomposition d'un versement notamment. Le backend les traite comme des
paramètres et signale leur usage.

Deux obligations côté frontend :

1. **L'enveloppe de liste de l'API porte un tableau `avertissements`.** Il n'est
   jamais ignoré : il s'affiche en bandeau `AvertissementRegle` au-dessus du
   contenu concerné.
2. **Un écran qui affiche un résultat issu d'une règle `[V]` le dit.** Exemple :
   « Cette répartition utilise une règle provisoire, en attente de validation
   par la Direction administrative et financière. »

Un chiffre provisoire présenté comme définitif est un défaut fonctionnel, pas
un détail d'affichage.

---

## 11. Tableaux de bord

Six tableaux de bord en V1 : **PCA, DG, DGA, DAF, Gestionnaire des comptes,
Super Administrateur**. Le Chef des agents de terrain et l'Agent de terrain
n'ont pas de tableau de bord dédié — ne pas en créer.

- **Un tableau de bord de direction s'ouvre sur le taux d'activation**, en
  première carte, en haut à gauche, avec son effectif de référence et sa
  période. C'est l'indicateur central du projet ; il ne doit pas être noyé dans
  une grille de douze cartes équivalentes.
- Six cartes d'indicateurs au maximum au-dessus de la ligne de flottaison.
- Chaque tableau de bord ne montre que le périmètre de données de l'utilisateur.
  Un agent ne voit que son portefeuille — c'est l'API qui filtre, l'écran ne
  fait que ne pas prétendre le contraire.

Graphiques : trois séries au maximum, pas d'effet 3D, pas de dégradé, pas
d'ombre, axes légendés avec leur unité, palette limitée aux teintes
fonctionnelles, et toujours une alternative textuelle ou un tableau accessible
sous le graphique.

Les rôles ne sont **pas** distingués par une couleur. Un rôle s'affiche par son
libellé et, si nécessaire, une icône. Introduire huit couleurs de rôle
détruirait la règle 2 : dans cette interface, un aplat coloré veut dire un
statut.

---

## 12. Identité

Les fichiers sont dans `COSITI_branding_pack/assets/`, exposés par l'alias Vite
`@marque` (voir §14).

| Contexte | Fichier |
|---|---|
| Navigation latérale déployée (fond vert foncé) | `COSITI_logo_inverse.png` |
| Navigation repliée, avatar, espace carré | `COSITI_icon_hd.png` |
| En-tête clair, page de connexion horizontale, export PDF | `COSITI_logo_horizontal_hd.png` |
| Page de connexion verticale, document institutionnel | `COSITI_logo_vertical_hd.png` |
| Symbole déjà présent, largeur contrainte | `COSITI_wordmark_hd.png` |
| Impression une couleur, tampon | `COSITI_logo_monochrome.png` |
| Onglet du navigateur, raccourci | `COSITI_favicon.png` |

Règles de la charte §5, non négociables : zone libre autour du signe au moins
égale à la hauteur du « C » du wordmark ; ne pas étirer, ne pas incliner, ne
pas recolorer, ne pas ajouter d'ombre ; ne pas poser la version couleur sur un
fond chargé. Le monochrome est un mode de reproduction, pas une variante
graphique par défaut.

Le pack ne fournit que des PNG. Des versions vectorielles SVG sont à produire
pour la navigation et le favicon — le logo horizontal en PNG sur un écran haute
densité se verra. [A]

---

## 13. Rédaction de l'interface

- Vouvoiement, français professionnel, pas de familiarité, pas d'emoji.
- Message d'erreur : ce qui s'est passé, puis ce que l'utilisateur peut faire.
  « La référence de transaction est obligatoire pour un paiement Orange Money.
  Saisissez-la depuis le message de confirmation reçu. »
- Jamais de terme technique dans un message destiné à l'utilisateur : ni code
  HTTP, ni nom de table, ni nom d'exception, ni identifiant UUID complet.
- Vocabulaire métier fixé : **adhérent** (jamais « membre » ni « client »),
  cotisation, versement, période de droits, jours couverts, matricule,
  descente, portefeuille, remise de caisse, dossier CNPS, télédéclaration,
  compte rendu, zone, agent référent.
- Les rôles s'écrivent en toutes lettres : « Gestionnaire des comptes », pas
  « GC » ; « Directeur administratif et financier » au premier usage, « DAF »
  ensuite.
- Un montant est toujours suivi de son unité. Une date est toujours affichée
  dans le fuseau de Douala, jamais en UTC brut.

---

## 14. Accessibilité — exigences vérifiables

Ce ne sont pas des intentions : chacune se contrôle.

1. Contraste du texte ≥ 4,5:1, des composants d'interface et des bordures
   porteuses de sens ≥ 3:1. Les ratios sont documentés dans `tokens.css`.
2. Un seul anneau de focus dans toute l'application, toujours visible. `outline:
   none` sans remplacement est interdit.
3. Toute action est atteignable au clavier. Une ligne de tableau cliquable a un
   équivalent clavier explicite.
4. Modale : piège de focus, fermeture par `Échap`, titre annoncé, focus rendu à
   l'élément déclencheur.
5. Tout champ a un `label` associé ; toute erreur est reliée par
   `aria-describedby` et annoncée par une région live.
6. Toute icône porteuse de sens a un `aria-label` ; toute icône décorative est
   `aria-hidden`.
7. `prefers-reduced-motion` est respecté.
8. Zone tactile minimale de 40 px sur les actions de liste — les agents de
   terrain utilisent aussi des tablettes.

---

## 15. Activation

Le design system est écrit ; la couche Tailwind reste à installer. Les
dépendances ci-dessous sont marquées **[A]** : elles passent par la procédure de
`docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` et sont consignées dans
`docs/journal-dependances.md` avant installation.

> Ces deux documents ont été supprimés avec l'ancienne codebase et sont à
> reconstituer (voir `AGENTS.md` §7). Tant qu'ils n'existent pas, aucune
> installation ne se fait sans validation explicite du chef de projet. Il en va
> de même pour `docs/03_SPECIFICATIONS_ECRANS.md`, cité plus haut comme seule
> justification recevable pour ajouter une variante de composant.

**1. Dépendances**

```bash
npm i tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge lucide-react
npx shadcn@latest init      # lit components.json, ne pas régénérer ce fichier
```

**2. Alias `@`** — requis par `components.json` et par tous les exemples de ce
document.

```ts
// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@marque": fileURLToPath(new URL("./COSITI_branding_pack/assets", import.meta.url)),
    },
  },
});
```

```jsonc
// tsconfig.app.json — compilerOptions
"baseUrl": ".",
"paths": { "@/*": ["./src/*"], "@marque/*": ["./COSITI_branding_pack/assets/*"] }
```

**3. `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**4. Point d'entrée** — dans `src/main.tsx`, remplacer `import "./index.css"`
par `import "./styles/globals.css"`, puis supprimer `src/index.css` et
`src/App.css`, hérités du gabarit Vite.

**5. `index.html`** — `lang="fr"`, titre « COSITI », favicon de la marque.

Tant que l'étape 1 n'est pas faite, `src/styles/tokens.css` s'importe seul et
fonctionne : c'est du CSS natif, sans dépendance.

---

## 16. Revue

Avant de proposer un écran, vérifier :

- [ ] Aucun HEX hors de `tokens.css`
- [ ] Aucune couleur sans signification identifiable
- [ ] Une seule action primaire
- [ ] Aucun statut affiché hors de `BadgeStatut`
- [ ] Aucun montant, date, matricule ou téléphone formaté hors de `format.ts`
- [ ] Aucun texte blanc sur l'orange de la marque
- [ ] Deux niveaux de titre au maximum
- [ ] État vide, état de chargement et état d'erreur traités
- [ ] Avertissement affiché si une règle `[V]` est en jeu
- [ ] Parcours clavier complet, focus visible
- [ ] Aucun terme technique dans un message utilisateur

---

## 17. Entretien de ce document

Toute nouvelle règle de design, tout jeton ajouté, toute décision de contraste
est reportée ici **dans le même lot de travail** que le code correspondant. Un
design system qui décrit un état passé est pire que pas de design system : il
fait prendre de mauvaises décisions avec assurance.

Si une information manque, écrire `TODO [V] : question` et signaler — ne pas
inventer une règle de marque.
