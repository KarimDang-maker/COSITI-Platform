# 02 — Système de design

## 1. Parti pris

Sobriété. L'interface est un outil de travail utilisé plusieurs heures par jour par des personnes dont une partie n'est pas à l'aise avec le numérique. Elle doit être lisible, prévisible et silencieuse.

Trois règles qui découlent de ce parti pris :

1. **La couleur porte du sens, jamais de la décoration.** Un aplat coloré dans cette interface signifie toujours quelque chose : un statut, une alerte, une action primaire. Si on ne peut pas dire ce que la couleur signifie, on la retire.
2. **Le fond est blanc, le texte est noir.** Les surfaces grises servent à séparer, pas à embellir.
3. **Une seule action primaire par écran.** Tout le reste est secondaire ou tertiaire.

## 2. Jetons

Définis comme variables CSS dans `styles/index.css` et exposés à Tailwind. Aucune valeur hexadécimale écrite en ligne dans un composant.

### Couleurs de base
| Jeton | Valeur | Usage |
|---|---|---|
| `--couleur-fond` | `#FFFFFF` | Fond de page |
| `--couleur-surface` | `#FAFAFA` | Cartes, en-têtes de tableau |
| `--couleur-surface-accentuee` | `#F2F2F2` | Ligne survolée, zone désactivée |
| `--couleur-bordure` | `#E0E0E0` | Bordures, séparateurs |
| `--couleur-bordure-forte` | `#BDBDBD` | Bordure de champ au focus |
| `--couleur-texte` | `#1A1A1A` | Texte principal |
| `--couleur-texte-secondaire` | `#5C5C5C` | Libellés, aides |
| `--couleur-texte-desactive` | `#9E9E9E` | Texte inactif |

### Couleurs fonctionnelles
| Jeton | Valeur | Sens exclusif |
|---|---|---|
| `--couleur-primaire` | `#1B4F72` | Action principale, élément actif de navigation |
| `--couleur-primaire-survol` | `#16405C` | Survol de l'action principale |
| `--couleur-succes` | `#1E7B4D` | Validé, à jour, dossier traité |
| `--couleur-attention` | `#B36A00` | En retard, pièce manquante, à contrôler |
| `--couleur-danger` | `#A32A2A` | Annulation, erreur, écart de caisse |
| `--couleur-information` | `#2C5F8A` | Information neutre, avertissement de règle non validée |

Six couleurs fonctionnelles, pas une de plus. Chaque teinte a une variante de fond très claire (`-fond`) pour les badges et les bandeaux, dérivée par opacité, jamais choisie à l'œil.

### Typographie
| Jeton | Valeur |
|---|---|
| `--police-base` | `"Calibri", "Carlito", system-ui, sans-serif` |
| `--police-mono` | `"Consolas", "Courier New", monospace` — matricules, références de transaction, identifiants |
| `--taille-xs` / `sm` / `base` / `lg` / `xl` / `2xl` | `12 / 13 / 14 / 16 / 20 / 24 px` |
| `--graisse-normale` / `--graisse-demi` / `--graisse-forte` | `400 / 600 / 700` |
| `--interligne-serre` / `--interligne-base` | `1.3 / 1.55` |

Calibri est la police des documents du projet ; l'interface la conserve pour la cohérence, avec Carlito comme substitut libre et métriquement compatible sur les postes qui ne l'ont pas.

Deux niveaux de titre suffisent dans un écran : titre de page (`xl`, demi-gras) et titre de section (`lg`, demi-gras). Au-delà, l'écran est trop chargé et doit être découpé.

### Espacement, rayons, ombres
| Jeton | Valeur |
|---|---|
| `--espace-1` … `--espace-8` | `4, 8, 12, 16, 24, 32, 48, 64 px` |
| `--rayon-sm` / `md` / `lg` | `3 / 5 / 8 px` |
| `--ombre-carte` | `0 1px 2px rgba(0,0,0,.06)` |
| `--ombre-modale` | `0 8px 24px rgba(0,0,0,.14)` |

Pas d'ombre portée ailleurs que sur les cartes et les surfaces flottantes. Pas de dégradé. Pas d'animation décorative : seules les transitions fonctionnelles sont autorisées (ouverture de modale, apparition de message), 150 ms maximum.

## 3. Correspondance statut → couleur

Table de référence unique. Elle vit dans `lib/constantes.ts` et alimente le composant `Badge`. Aucun composant ne choisit une couleur de statut par lui-même.

| Entité | Statut API | Libellé affiché | Teinte |
|---|---|---|---|
| Adhérent | `PREINSCRIT` | Préinscrit | neutre |
| | `ACTIF` | Actif | succès |
| | `EN_RETARD` | En retard | attention |
| | `INACTIF` | Inactif | neutre |
| | `REACTIVE` | Réactivé | succès |
| | `RADIE` | Radié | danger |
| Paiement | `BROUILLON` | Brouillon | neutre |
| | `A_CONTROLER` | À contrôler | attention |
| | `VALIDE` | Validé | succès |
| | `RAPPROCHE` | Rapproché | succès |
| | `ANNULE` | Annulé | danger |
| | *(pending [A])* `INCOHERENCE` | — non implémenté tant que `03_SPECIFICATIONS_API.md` §10 (API) n'a pas fixé le contrat de confirmation hiérarchique — à ajouter (teinte attention) une fois validé |
| Dossier CNPS | `BROUILLON` | Brouillon | neutre |
| | `INCOMPLET` | Incomplet | attention |
| | `PRET` | Prêt | information |
| | `TRANSMIS` | Transmis | information |
| | `TRAITE` | Traité | succès |
| | `REJETE` | Rejeté | danger |
| Relance | `A_FAIRE` | À faire | attention |
| | `EN_COURS` | En cours | information |
| | `CONTACTE` | Contacté | information |
| | `RESOLU` | Résolu | succès |
| | `A_REPRENDRE` | À reprendre | attention |
| Régularité | `A_JOUR` | À jour | succès |
| | `PARTIELLEMENT_A_JOUR` | Partiellement à jour | attention |
| | `EN_RETARD` | En retard | attention |
| | `JAMAIS_COTISE` | Jamais cotisé | danger |

`JAMAIS_COTISE` est en rouge délibérément : c'est le problème central de la coopérative, il ne doit pas se fondre dans le reste.

## 4. Composants de base

Écrits dans `composants/ui/`, sans bibliothèque externe imposée.

| Composant | Variantes | Points d'attention |
|---|---|---|
| `Bouton` | primaire, secondaire, tertiaire, danger · tailles sm/md | Un seul primaire par écran. État de chargement intégré et bloquant |
| `Champ` | texte, nombre, montant, téléphone, date, zone de texte | Libellé toujours visible (jamais seulement en texte indicatif), aide sous le champ, erreur reliée par `aria-describedby` |
| `Selecteur` | simple, avec recherche | Recherche obligatoire au-delà de 10 options (liste des adhérents, des agents) |
| `Badge` | les six teintes | Toujours du texte, jamais une pastille seule |
| `Alerte` | information, attention, danger, succès | Utilisée pour les bandeaux persistants, dont les avertissements de règle non validée |
| `Modale` | md, lg | Piège de focus, fermeture par `Échap`, titre annoncé |
| `Confirmation` | standard, avec motif obligatoire | Rappelle les valeurs concernées dans le texte |
| `Tableau` | — | En-tête collant, tri par colonne, pagination serveur, ligne cliquable avec équivalent clavier |
| `EtatVide` | — | Message explicite + action possible. Jamais un tableau vide sans explication |
| `Squelette` | ligne, carte, tableau | Préféré au spinner plein écran |
| `Pagination` | — | Affiche toujours le total réel (« 172 adhérents ») |
| `CarteIndicateur` | — | Valeur en grand, libellé, évolution, période de référence |
| `FilAriane` | — | Sur toute page de détail |

## 5. Mise en page

Coquille fixe : barre latérale de navigation à gauche (240 px, repliable sous 1024 px), en-tête avec fil d'Ariane, recherche globale et menu utilisateur, contenu à droite avec une largeur maximale de 1440 px.

Grille de formulaire : une colonne sous 768 px, deux colonnes au-delà. Les champs liés restent groupés (téléphone principal et secondaire côte à côte, jamais séparés par une rupture de colonne).

Points de rupture : `640 / 768 / 1024 / 1280 px`.

## 6. Tableaux de bord

Un tableau de bord de direction s'ouvre sur **le taux d'activation**, en première carte, en haut à gauche, avec son effectif de référence et sa période. C'est l'indicateur central du projet ; il ne doit pas être noyé dans une grille de douze cartes équivalentes.

Règles de graphique : maximum trois séries par graphique · pas d'effet 3D, pas d'ombre, pas de dégradé · axes légendés avec l'unité · palette limitée aux couleurs fonctionnelles · toujours une alternative textuelle ou un tableau accessible sous le graphique.

## 7. Rédaction de l'interface

- Vouvoiement, français professionnel, pas de familiarité.
- Messages d'erreur : ce qui s'est passé, puis ce que l'utilisateur peut faire. « La référence de transaction est obligatoire pour un paiement Orange Money. Saisissez-la depuis le message de confirmation reçu. »
- Jamais de terme technique dans un message destiné à l'utilisateur : ni code HTTP, ni nom de table, ni nom d'exception.
- Vocabulaire métier fixé : adhérent (pas « membre » ni « client »), cotisation, versement, période de droits, jours couverts, matricule, descente, portefeuille, remise de caisse, dossier CNPS, télédéclaration.
- Pas d'emoji dans l'interface.
