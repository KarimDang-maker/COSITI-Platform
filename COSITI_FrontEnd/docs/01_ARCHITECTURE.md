# 01 — Architecture du frontend

## 1. Arborescence

```
src/
├── app/
│   ├── main.tsx                 point d'entrée
│   ├── App.tsx                  providers (Query, Router, Auth, Toast)
│   ├── routes.tsx               table de routage
│   └── GardeRoute.tsx           garde d'authentification et de permission
├── api/
│   ├── client.ts                instance HTTP unique, intercepteurs
│   ├── erreurs.ts               typage et normalisation des erreurs API
│   ├── types.ts                 types générés depuis OpenAPI
│   └── ressources/              un fichier par ressource
│       ├── adherents.ts  paiements.ts  droits.ts  cnps.ts
│       ├── organisation.ts  documents.ts  relances.ts
│       └── administration.ts  audit.ts  tableauxBord.ts
├── fonctionnalites/             un dossier par module métier
│   ├── adherents/
│   │   ├── pages/               ListeAdherents.tsx, FicheAdherent.tsx, NouvelAdherent.tsx
│   │   ├── composants/          FormulaireAdherent.tsx, AlerteDoublon.tsx, BadgeStatut.tsx
│   │   ├── hooks/               useAdherents.ts, useVerificationDoublon.ts
│   │   └── schemas/             adherent.schema.ts (Zod)
│   ├── cotisations/  droits/  cnps/  daf/  organisation/
│   ├── relances/  documents/  rapports/  administration/  audit/
├── composants/
│   ├── ui/                      Bouton, Champ, Selecteur, Modale, Tableau,
│   │                            Badge, Alerte, Pagination, EtatVide, Squelette
│   ├── mise-en-page/            Coquille, BarreLaterale, EnTete, FilAriane
│   └── donnees/                 TableauPagine, BarreFiltres, ExportBouton
├── auth/
│   ├── ContexteAuth.tsx         utilisateur, rôles, permissions, périmètre
│   ├── useAuth.ts
│   ├── usePermission.ts         a(permission: string): boolean
│   └── jeton.ts                 stockage en mémoire, rafraîchissement
├── lib/
│   ├── formatage.ts             montants XAF, dates, téléphones
│   ├── validation.ts            téléphone camerounais, matricule
│   └── constantes.ts            libellés d'énumérations (affichage uniquement)
└── styles/
    ├── index.css                jetons CSS
    └── tailwind.config.ts
```

Règle de dépendance : `fonctionnalites/` peut importer `composants/`, `api/`, `auth/`, `lib/`. L'inverse est interdit. Deux dossiers de `fonctionnalites/` ne s'importent jamais l'un l'autre ; ce qui est partagé remonte dans `composants/` ou `lib/`.

## 2. Couche d'accès API

Une seule instance HTTP, dans `api/client.ts`. Aucun `fetch` ni appel direct ailleurs dans le code.

Responsabilités de l'intercepteur :
- Ajout de l'en-tête `Authorization` depuis le jeton en mémoire.
- Ajout d'un `X-Trace-Id` par requête.
- Sur `401` : tentative unique de rafraîchissement, puis rejeu de la requête ; second échec → déconnexion et redirection vers la connexion.
- Sur `403` : message « vous n'avez pas les droits pour cette action », sans détail technique.
- Sur `409` : remontée telle quelle au composant (conflit métier, à afficher en clair).
- Sur `429` : message d'attente avec le délai renvoyé par `Retry-After`.
- Normalisation de toute erreur en objet `ErreurApi { code, message, champ?, traceId, avertissements[] }`.

Les `avertissements` renvoyés par l'API (par exemple « règle de répartition non validée ») s'affichent dans un bandeau discret et persistant, jamais dans un message éphémère. Ils informent l'utilisateur qu'une règle métier n'est pas encore arbitrée.

## 3. Gestion de l'état

| Type d'état | Outil |
|---|---|
| Données serveur | TanStack Query (cache, invalidation, états de chargement et d'erreur) |
| Formulaire | React Hook Form + résolveur Zod |
| Session, permissions | `ContexteAuth` (React Context) |
| Interface locale (modale ouverte, onglet actif) | `useState` dans le composant |
| Filtres de liste | Paramètres d'URL (`useSearchParams`) — une liste filtrée doit être partageable par lien |

Pas de Redux ni de gestionnaire global supplémentaire. Si le besoin apparaît, le signaler avant de l'introduire.

Conventions TanStack Query :
- Clés structurées : `['adherents', 'liste', filtres]`, `['adherents', 'detail', id]`.
- Invalidation explicite après mutation, jamais de rechargement complet de page.
- Pas de `refetchInterval` sauf sur les files de travail (relances, paiements à contrôler).
- `staleTime` court sur les données financières, plus long sur les référentiels (zones, activités, packs).

## 4. Routage et permissions

```tsx
<Route element={<GardeRoute permission="PAIEMENT:VALIDER" />}>
  <Route path="/cotisations/:id" element={<DetailPaiement />} />
</Route>
```

`GardeRoute` vérifie la session puis la permission. Sans session → redirection vers `/connexion` en mémorisant la destination. Avec session mais sans permission → page « accès non autorisé », pas une page blanche ni une erreur technique.

`usePermission()` sert à masquer une action dans un écran autorisé :
```tsx
const { a } = usePermission();
{a('PAIEMENT:VALIDER') && <Bouton onClick={valider}>Valider</Bouton>}
```

Les permissions viennent de `GET /auth/moi`. Elles ne sont jamais codées en dur par écran ni déduites du nom du rôle : un rôle peut changer de permissions côté administration sans redéploiement du frontend.

## 5. Conventions de composants

- Composants fonctionnels, un composant par fichier, nom de fichier = nom du composant.
- Les pages orchestrent, les composants affichent. Un composant de présentation ne fait pas d'appel API.
- Props typées explicitement, pas de `any`, pas de `React.FC`.
- Chaque liste gère quatre états : chargement (squelette, pas de spinner plein écran), vide (message explicite avec l'action possible), erreur (message et bouton « réessayer »), données.
- Toute action destructive ou financière passe par une confirmation qui **rappelle les valeurs concernées** (« Annuler le paiement de 5 000 F du 16/09/2026 pour COSITI-00013 ? ») et exige un motif quand l'API l'exige.
- Les libellés d'énumérations sont traduits dans `lib/constantes.ts` : l'API renvoie `EN_RETARD`, l'écran affiche « En retard ».

## 6. Formulaires

Chaque formulaire a un schéma Zod dans `schemas/`. Le schéma reproduit les contrôles de format de l'API (téléphone camerounais, montant positif, dates cohérentes) **pour le confort de saisie**, jamais comme protection.

Règles :
- Validation à la sortie du champ (`onBlur`), pas à chaque frappe.
- Les erreurs de validation renvoyées par l'API sont réinjectées sur le champ concerné via `setError` grâce au champ `champ` de l'enveloppe d'erreur.
- Bouton de soumission désactivé pendant l'envoi, avec état visible.
- Pas de soumission par `Entrée` sur les formulaires financiers — action explicite requise.
- Formulaires longs découpés en étapes (adhésion : identité → activité et zone → adhésion et pack → récapitulatif).

## 7. Formatage

| Donnée | Affichage |
|---|---|
| Montant | `1 305 700 F` — espace insécable comme séparateur, suffixe `F`, pas de décimales si nulles |
| Date | `16/09/2026` |
| Date et heure | `16/09/2026 10:12` |
| Téléphone | `6 99 89 79 37` |
| Matricule | `COSITI-00013`, en police à chasse fixe dans les tableaux |
| Pourcentage | `66,9 %` — virgule décimale, espace avant le signe |

Locale `fr-FR`. Ces règles vivent dans `lib/formatage.ts`, jamais réimplémentées dans un composant.

## 8. Accessibilité et terrain

- Navigation complète au clavier sur tous les parcours de saisie.
- Libellés associés aux champs, messages d'erreur reliés par `aria-describedby`.
- Contraste conforme WCAG AA.
- Cibles tactiles d'au moins 44 px : des utilisateurs consulteront sur téléphone dès la V1.
- Interface responsive dès la V1 (préparation de la V2 mobile, sans être l'application terrain).
- Pas de dépendance à la couleur seule pour porter une information : statut = badge avec texte.

## 9. Performance

- Découpage par route (`React.lazy`) sur les modules lourds (rapports, audit, tableaux de bord).
- Pagination serveur systématique : aucune liste ne charge l'intégralité des adhérents ou des paiements.
- Virtualisation des tableaux au-delà de quelques centaines de lignes.
- Budget indicatif [A] : bundle initial sous 250 Ko compressé — la connexion n'est pas toujours bonne.
