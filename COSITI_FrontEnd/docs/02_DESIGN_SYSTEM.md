# 02 — Design system COSITI

Version 1.1 — 28/09/2026 (gabarit visuel « Spark Admin » intégré, §2.1)
Destinataire : **l'agent de code qui développe le frontend COSITI**.

Catalogue vivant : route `/design-system`, en développement uniquement (§18).

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

### 2.1 Gabarit visuel : Spark Admin, traduit dans l'identité COSITI [A]

Depuis la v1.1, la **structure** de l'interface reprend le gabarit Bootstrap
« Spark Admin » (coquille, densité, rayons, ombres, cartes, tableaux,
formulaires). Son **identité** est remplacée par celle de la charte. Règle
d'arbitrage : la charte gagne sur tout ce qu'elle fixe (couleurs, typographie,
logo) ; le gabarit gagne sur tout ce qu'elle ne fixe pas (géométrie, densité,
mise en page) ; l'accessibilité (§14) gagne sur les deux.

| Élément du gabarit | Traduction COSITI |
|---|---|
| Vert forêt `#051C12` de la navigation | `--nav-fond` = vert foncé de la charte |
| Vert forêt `#072F1F` des boutons | `--primaire` = vert principal (bouton), `--surface-inversee` = vert foncé (carte mise en avant) |
| Accent lime `#B4F105` (liseré actif, icône active, lien sur carte sombre) | `--marque` = orange de la charte — jamais en texte courant |
| Rouge / vert / orange système | Les teintes d'état §4.4 |
| Plus Jakarta Sans, graisse 500, interlettrage −0,01 em | Reprise telle quelle, auto-hébergée (§6) ; tailles de la charte (16 px de texte courant) |
| Sélecteur de période et calendrier flatpickr | `SelecteurPeriode`, `Calendrier`, `ChampDate` — même rendu, sans dépendance |
| Rayons 6 → 24 px, ombres très diffuses | Repris tels quels, ombres teintées vert foncé (§7) |
| Navigation 280 / 80 px, en-tête collant translucide | Repris (§8) |
| Carte « alerte verte » en tête de tableau de bord | Carte de l'indicateur principal (taux d'activation, §11) |
| Liste « Transaction » | `ListeElements` |
| « Product Overview » (barres) | `BarreProgression` |
| Tableau, barre d'outils, pagination numérotée | `TableauDonnees` + `BarreFiltres` + `Pagination` |

**Non repris, délibérément** : la recherche globale (aucun écran ne la
spécifie — `AGENTS.md` règle 10), le bouton plein écran, la bannière
promotionnelle, l'astérisque décoratif et toutes les animations
d'agrément (rotation, pulsation, battement), la connexion par réseaux sociaux,
les dégradés de fond de la page de connexion.

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
    │   ├── statuts.ts               statut API → libellé + teinte (+ pastilles, remplissages)
    │   ├── format.ts                montants, dates, matricules, téléphones, évolutions
    │   ├── roles.ts                 code de rôle → libellé en toutes lettres
    │   └── jetons.ts                lecture des jetons CSS depuis JS (graphiques)
    ├── components/
    │   ├── ui/                      primitives shadcn, techniques, en anglais
    │   └── cositi/                  composants métier, en français
    └── ecrans/designsystem/         catalogue vivant (développement uniquement)
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
| Orange sur vert foncé | 4,25 | Icône, liseré, grand texte — jamais un texte courant (v1.1) |

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
| Surfaces | `--fond`, `--surface`, `--surface-douce` (en-tête de tableau, `#F8FAF9`), `--surface-survol` | `bg-fond`, `bg-surface`, … |
| Surface inversée | `--surface-inversee`, `-contenu`, `-doux`, `-trait`, `-accent` | `bg-surface-inversee` — indicateur principal, pastille d'identité |
| Traits | `--bordure`, `--bordure-forte` | `border-bordure` |
| Texte | `--texte`, `--texte-doux`, `--texte-doux-fort`, `--texte-inactif`, `--titre` | `text-texte-doux` |
| Action principale | `--primaire`, `--primaire-survol`, `--primaire-contenu`, `--primaire-doux` | `bg-primaire text-primaire-contenu` |
| Marque | `--marque`, `--marque-survol`, `--marque-contenu`, `--marque-trait` | `bg-marque text-marque-contenu` |
| Navigation | `--nav-fond`, `--nav-contenu`, `--nav-contenu-doux`, `--nav-survol-fond`, `--nav-actif-fond`, `--nav-actif-trait`, `--nav-trait` | `bg-nav-fond` |
| Coquille | `--entete-fond` (en-tête translucide), `--voile` (fond de modale et de tiroir) | `bg-entete-fond`, `bg-voile` |
| Graphiques | `--graphique-serie-1..3`, `--graphique-grille`, `--graphique-axe`, `--graphique-survol` | lus par `lib/jetons.ts` |
| Focus | `--anneau`, `--anneau-halo`, `--anneau-danger`, `--anneau-danger-halo` | `ring-anneau`, `ring-anneau-halo` |

Focus : les boutons, liens et interrupteurs portent un anneau plein
`ring-2 ring-anneau` décalé de 2 px ; les champs passent leur bordure en vert
et ajoutent un halo `anneau-halo` de 3 px (la bordure seule assure le 3:1).

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

Charte §3 : police sans empattement, « **DejaVu Sans**, **Noto Sans** ou une
équivalence ». Décision du 28/09/2026 : la plateforme utilise **Plus Jakarta
Sans**, la police du gabarit Spark — Noto Sans et DejaVu Sans restent en repli
dans `--police-base`. Elle est **auto-hébergée** (`src/styles/polices/`,
variable 200–800, latin et latin étendu, licence OFL, provenance dans
`docs/journal-dependances.md`) — pas de CDN de polices : les postes COSITI
travaillent avec une connectivité irrégulière et une police distante qui ne
charge pas décale toute la page.

Comme dans le gabarit : texte courant en graisse 500, interlettrage −0,01 em ;
titres en 700, −0,025 em. Les **tailles** restent celles de la charte (16 px
de texte courant, 32 / 22 px de titres).

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
| Titre de carte [A] | 18 px | vert foncé | 700 | `h2` de `CarteSection` |
| Valeur d'indicateur | 32 px | texte principal | 800 | `CarteIndicateur` |
| Valeur de l'indicateur principal | 40 px | blanc sur vert foncé | 800 | `CarteIndicateur principal` |
| Petites capitales | 12 px, +0,06 em | texte secondaire fort | 700 | en-tête de tableau, section de navigation, groupe de menu |

Titre de carte : le gabarit titre ses cartes en 18 px ; la charte fixe 22 px
pour le titre de section. Arbitrage [A] : le `h2` **hors carte** garde les
22 px vert principal de la charte ; le titre **d'une carte** (`CarteSection`)
est un `h2` en 18 px vert foncé. À confirmer par la COSITI.

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

Rayons (v1.1, échelle du gabarit) — plus l'objet est grand, plus il est
arrondi :

| Jeton | Valeur | Utilitaire | Objets |
|---|---:|---|---|
| `--rayon-sm` | 6 px | `rounded-sm` | case à cocher, puce |
| `--rayon-md` | 10 px | `rounded-md` | item de menu, bouton compact, action de ligne, lien de navigation |
| `--rayon-lg` | 14 px | `rounded-lg` | bouton, champ, élément de liste, avatar, alerte |
| `--rayon-xl` | 18 px | `rounded-xl` | menu déroulant, sélecteur, tableau, carte profil |
| `--rayon-2xl` | 24 px | `rounded-2xl` | carte, carte d'indicateur, modale, carte de connexion |
| `--rayon-plein` | — | `rounded-full` | badge de statut, pastille d'icône, barre de progression |

Ombres : uniquement sur les cartes et les surfaces flottantes. Elles sont
teintées vert foncé — une ombre grise neutre paraît sale sur le fond
légèrement vert de l'interface. Les cartes n'ont **pas de bordure** : l'ombre
`carte` suffit à les détacher du fond.

| Jeton | Utilitaire | Usage |
|---|---|---|
| `--ombre-legere` | `shadow-legere` | bouton d'en-tête, onglet actif, poignée d'interrupteur |
| `--ombre-carte` | `shadow-carte` | carte, tableau, barre de filtres |
| `--ombre-flottante` | `shadow-flottante` | menu, sélecteur, infobulle, carte principale, carte de connexion |
| `--ombre-modale` | `shadow-modale` | modale, tiroir |

Les utilitaires shadcn `shadow-xs/sm/md/lg` sont remappés sur ces ombres dans
`globals.css` : une primitive régénérée hérite des ombres COSITI.

Mouvement : `120 ms` pour le survol et le focus, `180 ms` pour l'ouverture
d'un panneau ou d'une modale. Rien d'autre n'est animé.
`prefers-reduced-motion` est respecté globalement dans `globals.css`.

---

## 8. Gabarit

Coquille fixe (`CoquilleApplication`), identique pour tous les écrans
internes, calquée sur le gabarit :

```
┌────────────┬──────────────────────────────────────────────┐
│ Logo       │  En-tête collant 72 px, fond translucide     │
│ inversé    │  [replier] [Créer ▾]      [cloche] [profil ▾]│
│            ├──────────────────────────────────────────────┤
│ PILOTAGE   │  Fil d'Ariane                                │
│ ▌Tableau…  │  Titre h1                        [actions]   │
│ ADHÉRENTS  │  Sous-titre                                  │
│  Adhérents │                                              │
│  …         │  Contenu — largeur max 1440 px, marges 40 px │
│            │  fond #F5F7F6, cartes blanches               │
│ [profil]   │  ─────────────── pied de page ────────────── │
└────────────┴──────────────────────────────────────────────┘
  280 px (replié : 80 px)
```

- Navigation : `280 px`, repliable à `80 px` au-delà de `1024 px` (préférence
  mémorisée dans le navigateur — préférence d'affichage, jamais une donnée) ;
  sous `1024 px`, elle devient un **tiroir** ouvert depuis l'en-tête. Fond vert
  foncé, logo **inversé** (icône seule une fois repliée). Entrées regroupées
  en sections titrées en petites capitales (Pilotage, Adhérents, Terrain,
  Finances, Système). Item actif : voile blanc léger, **liseré orange de 4 px
  collé au bord du panneau**, icône orange. Repliée : libellés en infobulle et
  toujours présents pour le lecteur d'écran. Carte profil (nom, rôle) en pied.
- Les entrées de navigation sont filtrées par les permissions renvoyées par
  `GET /auth/moi`. Une entrée sans permission n'est pas affichée grisée : elle
  n'est pas affichée. Une section vide disparaît.
- En-tête : bouton de repli (tiroir en écran étroit), menu **« Créer »**
  (raccourcis vers les seuls écrans de saisie existants, filtrés par
  permission, absent si aucun), notifications, menu utilisateur (nom, rôle en
  toutes lettres, changement de mot de passe, déconnexion). Le menu « Créer »
  est en vert foncé de navigation : ce n'est pas l'action primaire de l'écran.
- En-tête de page (`EnTetePage`) : fil d'Ariane, `h1`, sous-titre à gauche,
  actions de l'écran à droite.
- L'onglet du navigateur reprend le titre de l'écran : « Adhérents — COSITI ».
- Grille de formulaire : une colonne sous `768 px`, deux colonnes au-delà. Les
  champs liés restent groupés (téléphone principal et secondaire côte à côte,
  jamais séparés par une rupture de colonne).
- Points de rupture : `640 · 768 · 1024 · 1280 · 1440`.

---

## 9. Composants

### 9.1 Contrats

Primitives (`ui/`) — hauteurs et géométrie du gabarit :

| Composant | Points d'attention |
|---|---|
| `Button` | Variantes `default` (vert), `marque` (orange, texte sombre), `outline`, `secondary` (clair), `ghost`, `destructive`, `link`. Tailles `xs` 28 · `sm` 32 · `default` 40 · `lg` 48 px, icônes carrées assorties. Rayon `lg`, graisse 600. Un seul `default` par écran. État de chargement **bloquant** — sur `POST /paiements`, le double envoi est une écriture financière en double, même si l'API impose `Idempotency-Key` |
| `Input`, `Textarea`, `SelectTrigger` | 40 px, rayon `lg`, fond blanc, bordure `bordure-forte` ; focus bordure verte + halo ; erreur (`aria-invalid`) bordure danger ; désactivé et lecture seule sur `surface-douce` |
| `Checkbox`, `RadioGroupItem`, `Switch` | 18 px ; interrupteur 40 × 22 px. Toujours dans un `Label` cliquable |
| `Card` | Sans bordure, rayon `2xl`, `shadow-carte`, marges 24 px. Ne s'utilise pas directement dans un écran : passer par `CarteSection` |
| `Table` | En-tête en petites capitales sur `surface-douce`, cellules 14 × 20 px, survol `surface-survol` |
| `DropdownMenu`, `Select`, `Popover` | Rayon `xl`, `shadow-flottante`, items en rayon `md` ; libellé de groupe en petites capitales |
| `Dialog`, `AlertDialog`, `Sheet` | Voile vert foncé `voile`, rayon `2xl`, `shadow-modale`, fermeture libellée « Fermer » |
| `Tabs` | Pastille `surface-survol`, onglet actif blanc, texte vert foncé |

Composants COSITI (`cositi/`) :

| Composant | Rôle et points d'attention |
|---|---|
| `CoquilleApplication` | Coquille §8. `titre` alimente l'onglet du navigateur |
| `NavigationLaterale` | Sections, repli, tiroir, carte profil — filtrée par permission |
| `EnteteApplication`, `BoutonEntete`, `MenuCreation`, `MenuUtilisateur`, `ClocheNotifications` | En-tête §8. Bouton d'en-tête : icône seule, `aria-label` obligatoire. Nombre de notifications écrit, jamais une pastille seule |
| `PiedPage` | Nom de la coopérative en texte, jamais une reconstitution du logo |
| `EnTetePage` | Fil d'Ariane, unique `h1`, sous-titre, `statut`, actions. Tout écran interne commence par lui |
| `FilAriane` | Dernier maillon `aria-current="page"` ; un niveau sans écran n'est pas un lien |
| `CarteSection` | Seule manière de poser une carte : titre (`h2` 18 px), description, actions, pied, `contenuPleineLargeur` pour un tableau ou une liste collés aux bords |
| `MenuActions` | Menu « … » d'une carte ou d'une ligne, `libelle` accessible explicite, actions destructives en fin de menu |
| `CarteIndicateur`, `RangeeIndicateurs`, `Tendance` | Valeur, libellé, période de référence, évolution. La période est obligatoire dès que l'API la fournit : un chiffre sans période n'est pas un indicateur. `principal` = carte vert foncé, réservée au taux d'activation. L'évolution est **renvoyée par l'API**, son signe toujours écrit |
| `ListeElements` | Lignes riches : pastille d'icône (teinte d'état ou identité), titre, sous-titre, valeur, complément. Lien seulement vers un écran accessible |
| `ListeAlertes` | Points nécessitant attention, niveau écrit sous le libellé |
| `BarreProgression` | Libellé + valeur écrite + barre ; `role="progressbar"` |
| `TableauDonnees` | Carte du gabarit ; `barreOutils` (filtres, recherche, export) et `pied` (pagination). En-tête collant, tri et pagination **serveur** (`?page=&taille=&tri=`), ligne activable au clavier |
| `Pagination` | Total réel (« 172 adhérents »), « Page 1 sur 7 », Précédent / numéros / Suivant |
| `BarreFiltres` | Filtres alignés sur les paramètres de l'API ; `integree` dans `TableauDonnees` |
| `CelluleIdentite` | Avatar à initiales + nom + précision, pour toute colonne « personne » |
| `ChampFormulaire` | Libellé visible, aide, erreur reliée par `aria-describedby` et annoncée (région live). Le contrôle reçoit ses attributs par fonction enfant |
| `ChampMontant` | Chasse fixe, aligné à droite, unité « FCFA » accolée |
| `ChampMotDePasse` | Bouton afficher / masquer, `aria-pressed` |
| `ChampRecherche`, `ChampIcone` | Icône décorative dans le champ (loupe, identifiant) ; libellé toujours fourni |
| `Calendrier` | Calendrier du gabarit (thème flatpickr) sans dépendance : pastilles de 38 px, extrémités vert foncé, bande vert clair, mois voisins atténués, point orange sur aujourd'hui, lundi en tête. Clavier complet (flèches, Début/Fin, Page préc./suiv.) |
| `SelecteurPeriode` | Pastille du gabarit + calendrier en mode période. Sans période, rien n'est envoyé et le libellé dit ce que l'API applique (« Mois en cours ») ; la période vit dans l'URL (`?du=&au=`) via `usePeriodeTableauBord` |
| `ChampDate` | Vrai `<input type="date">` (saisie clavier, `register`) + bouton ouvrant le calendrier. Remplace tout champ date natif |
| `SelectRecherche` | Recherche obligatoire au-delà de 10 options : listes d'adhérents, d'agents, de zones |
| `BadgeStatut` | `domaine` + `code`. Seul composant autorisé à afficher un statut. Pastille arrondie précédée d'un point : le libellé reste écrit |
| `Alerte` | Bandeau persistant, quatre teintes, `action` facultative. Pour les messages transitoires, utiliser les notifications |
| `AvertissementRegle` | Bandeau `attention` pour toute règle `[V]`. Voir §10 |
| `DialogueConfirmation` | Rappelle les valeurs concernées dans le texte. Motif obligatoire pour une annulation ou une correction — le champ motif est dans le dialogue, pas après |
| `EtatVide` | Icône du domaine, message explicite + action possible. Jamais un tableau vide sans explication |
| `SqueletteTableau` | Préféré au spinner plein écran |
| `CadreAuthentification` | Écrans hors coquille (connexion, mot de passe) : carte centrée, logo vertical |
| `PageErreur` | Code en grand, titre, explication, actions de sortie (accès refusé) |
| `AvatarUtilisateur` | Initiales, rayon `lg`, `taille` sm/md/lg, `fond` claire/inversee |
| `LigneAudit` | Horodatage, auteur, action, cible — les quatre, toujours |

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
  Elle prend la forme de la carte vert foncé du gabarit (`CarteIndicateur
  principal`), quel que soit l'ordre de la réponse de l'API.
- Six cartes d'indicateurs au maximum au-dessus de la ligne de flottaison.
- Période : les cinq tableaux de bord métier portent le `SelecteurPeriode` du
  gabarit à droite du titre (paramètres `du`/`au` de l'API). Sans choix, le
  serveur applique le mois civil en cours — le client ne le recalcule pas. Le
  tableau de bord Super Administrateur n'a pas de chiffre daté : pas de
  sélecteur.
- Disposition (`CadreTableauBord`) : en-tête de page, rangée d'indicateurs,
  puis une grille — contenu propre au rôle à gauche, carte « Points
  nécessitant attention » à droite (colonne de 352 px, collante au-delà de
  1280 px ; elle repasse sous le contenu en écran étroit).
- Chaque tableau de bord ne montre que le périmètre de données de l'utilisateur.
  Un agent ne voit que son portefeuille — c'est l'API qui filtre, l'écran ne
  fait que ne pas prétendre le contraire.

Graphiques : trois séries au maximum, pas d'effet 3D, pas de dégradé, pas
d'ombre, axes légendés avec leur unité, palette limitée aux teintes
fonctionnelles (`--graphique-serie-1..3` : vert, orange, bleu information),
et toujours une alternative textuelle ou un tableau accessible sous le
graphique. Recharts ne résout pas `var(--…)` dans ses attributs SVG : les
couleurs sont lues à l'exécution par `lib/jetons.ts`, jamais recopiées.

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

Fait au reliquat de J0 (22/09/2026) : la couche Tailwind est installée et
branchée sur ce fichier de jetons via `src/styles/globals.css`
(`@theme inline`). Procédure suivie et dépendances consignées dans
`docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md` et `docs/journal-dependances.md`,
tous deux désormais présents (`AGENTS.md §7`). Les commandes ci-dessous sont
conservées pour mémoire (état de référence, déjà exécuté) :

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
// tsconfig.app.json et tsconfig.json — compilerOptions
// `baseUrl` volontairement omis : TS >= 5 résout `paths` relativement à ce
// fichier sans lui, et `baseUrl` est dépréciée (TS6.0, TS5101).
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
- [ ] L'écran commence par `EnTetePage`, ses blocs sont des `CarteSection`
- [ ] Aucune carte, pagination, recherche ou champ assemblés à la main : les
      composants du §9.1 existent pour cela
- [ ] Le composant nouveau ou modifié figure dans le catalogue `/design-system`

---

## 17. Entretien de ce document

Toute nouvelle règle de design, tout jeton ajouté, toute décision de contraste
est reportée ici **dans le même lot de travail** que le code correspondant. Un
design system qui décrit un état passé est pire que pas de design system : il
fait prendre de mauvaises décisions avec assurance.

Si une information manque, écrire `TODO [V] : question` et signaler — ne pas
inventer une règle de marque.

---

## 18. Catalogue vivant

`src/ecrans/designsystem/CatalogueDesignSystem.tsx`, route `/design-system`,
accessible depuis le menu utilisateur **en développement uniquement**
(`import.meta.env.DEV` : la route et son module sont absents du build de
production). Quatre onglets — Fondations, Actions et retours, Formulaires,
Données — rendent chaque jeton et chaque composant par le code réel ; les
valeurs des jetons sont lues à l'exécution, jamais recopiées. Les données
affichées sont fictives et marquées comme telles.

Un composant ajouté ou modifié l'est dans le catalogue **dans le même lot de
travail** (§16).
