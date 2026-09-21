# 04 — Sécurité (frontend)

## 1. Principe de base

Le navigateur est un environnement hostile : l'utilisateur peut tout modifier, tout inspecter, tout rejouer. **Rien de ce qui est écrit ici ne protège une donnée.** Ces mesures réduisent la surface d'attaque contre l'utilisateur légitime (vol de session, injection, fuite de données à l'écran). La protection des données, elle, est entièrement du ressort de l'API.

Corollaire opérationnel : ne jamais « simplifier » un contrôle serveur au motif que le client le fait déjà, et ne jamais masquer une donnée uniquement côté client — si un utilisateur ne doit pas voir un champ, l'API ne doit pas le lui envoyer.

## 2. Stockage du jeton

| Élément | Règle |
|---|---|
| Jeton d'accès | **En mémoire uniquement** (variable de module dans `auth/jeton.ts`). Perdu au rechargement, reconstitué par le rafraîchissement |
| Jeton de rafraîchissement | Cookie `HttpOnly`, `Secure`, `SameSite=Strict`, posé par l'API. **Jamais lisible par JavaScript** |
| `localStorage` / `sessionStorage` | **Interdits pour tout élément d'authentification.** Une faille XSS y accède en une ligne |
| Données personnelles en cache navigateur | Interdit. Le cache TanStack Query est en mémoire, non persisté |

Si l'architecture de l'API impose un mode différent, le signaler et l'arbitrer — ne pas trancher seul côté client.

Déconnexion : purge du jeton en mémoire, appel de `/auth/deconnexion` pour révoquer le jeton de rafraîchissement, vidage complet du cache de requêtes, redirection. Une déconnexion qui laisse des données en cache est un défaut, surtout sur un poste partagé — et les postes de la coopérative le seront.

Expiration d'inactivité : minuterie côté client alignée sur la durée serveur, avertissement à deux minutes, verrouillage de l'interface au terme.

## 3. Protection contre l'injection de script

| Risque | Mesure |
|---|---|
| XSS via rendu | React échappe par défaut. `dangerouslySetInnerHTML` **interdit** sans dérogation écrite et assainissement par DOMPurify |
| XSS via URL | Toute URL provenant de données est validée : schéma `http`/`https` uniquement. `javascript:` et `data:` refusés |
| Injection via redirection | La destination mémorisée à la connexion est validée comme chemin interne. Aucune redirection vers une URL externe fournie en paramètre |
| Exécution dynamique | `eval`, `new Function`, `setTimeout` avec chaîne : interdits. Règle ESLint bloquante |
| Rendu de Markdown ou HTML | Aucun besoin identifié en V1. Si le besoin apparaît, assainissement obligatoire et validation préalable |
| Dépendances | Voir `05_DEPENDANCES_CHAINE_LOGICIELLE.md` — c'est le vecteur XSS le plus probable |

## 4. En-têtes et politique de sécurité du contenu

Servis par le serveur web qui héberge le frontend (Nginx ou équivalent), pas par l'application :

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self' https://api.cositi.example;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(self), camera=(), microphone=()
```

`script-src 'self'` sans `unsafe-inline` ni `unsafe-eval` : la configuration de Vite doit le permettre en production. `frame-ancestors 'none'` protège du détournement de clic — l'interface ne doit jamais être encadrée dans une page tierce.

La géolocalisation est autorisée parce qu'elle est utilisée au moment de l'enrôlement, avec accord explicite de l'adhérent. Caméra et micro sont bloqués en V1 (le besoin de photo arrive en V2, la politique sera ajustée à ce moment-là).

Aucune ressource externe : polices, scripts et styles sont servis par le domaine de l'application. Pas de CDN tiers — un CDN compromis est un script exécuté dans le navigateur d'un utilisateur authentifié.

## 5. Affichage des données sensibles

| Donnée | Règle d'affichage |
|---|---|
| Téléphone dans une alerte de doublon | Partiellement masqué (`6•• ••• 937`) — reconnaître un doublon ne doit pas donner un carnet d'adresses |
| Numéro de CNI | Affiché seulement sur la fiche détaillée, pour les rôles habilités, jamais dans une liste ni un export non autorisé |
| Pièce d'identité | Consultation précédée d'un avertissement rappelant que l'accès est journalisé. Pas de préchargement automatique |
| Montants et données financières | Écrans à accès restreint ; pas d'aperçu financier dans les vues partagées |
| Messages d'erreur | Aucun détail technique, aucun identifiant interne, aucune donnée d'un autre utilisateur |
| Journaux de la console | **Aucun `console.log` de données personnelles ou financières.** Règle ESLint bloquante en production |

Impression : les écrans imprimables (reçu, attestation) ont une feuille de style dédiée qui n'expose que ce qui est nécessaire.

## 6. Formulaires et actions

- Toute action destructive ou financière passe par une confirmation **qui rappelle les valeurs concernées**, pas un « Êtes-vous sûr ? » générique.
- Les actions exigeant un motif côté API l'exigent aussi côté formulaire, avec un minimum de caractères significatifs.
- Protection contre le double envoi : bouton désactivé pendant l'appel **et** clé d'idempotence sur la création de paiement. Le premier mécanisme est du confort, le second est la vraie protection.
- Aucune soumission par `Entrée` sur les formulaires financiers.
- Les champs de recherche ne sont jamais concaténés dans une URL sans encodage.

## 7. Permissions côté interface

`GET /auth/moi` fournit les codes de permission. Ils servent à masquer, jamais à autoriser.

Trois interdits :
1. Ne jamais coder en dur une liste de rôles dans un composant (`if (role === 'DAF')`). Toujours passer par une permission.
2. Ne jamais dériver un droit d'une donnée affichée (« l'utilisateur voit ce paiement donc il peut le valider »).
3. Ne jamais masquer une donnée reçue de l'API en se contentant de ne pas l'afficher : si elle ne doit pas être vue, elle ne doit pas être envoyée. Signaler tout cas où l'API envoie plus que nécessaire.

Le bouton « valider » d'un paiement est masqué pour le créateur du paiement, avec une explication au survol. L'API refuse de toute façon : le masquage évite une erreur, il ne la prévient pas.

## 8. Construction et configuration

- Tout ce qui est préfixé `VITE_` est **public dans le bundle**. N'y placer que l'URL de l'API et le nom de l'environnement. Aucune clé, aucun secret, jamais.
- Cartes de source (`sourcemaps`) désactivées en production, ou déposées sur un service d'erreurs privé, jamais servies publiquement.
- Pas de bannière de version ni d'information d'environnement affichée en production.
- Intégrité des ressources : le build produit des noms de fichiers empreintés ; si une ressource externe devait un jour être utilisée, elle porterait un attribut `integrity`.

## 9. Contrôles automatisés en intégration continue

| Étape | Outil | Blocage |
|---|---|---|
| Types | `tsc --noEmit` (mode strict) | Toute erreur |
| Règles | ESLint avec `react-hooks`, `jsx-a11y`, `no-eval`, `no-restricted-properties` (localStorage pour un jeton), `no-console` en production | Toute erreur |
| Tests | Vitest + Testing Library | Échec |
| Parcours critiques | Playwright (connexion, création d'adhérent avec doublon, enregistrement et validation de paiement) | Échec |
| Dépendances | `osv-scanner`, `npm audit --omit=dev`, `npm audit signatures` | Vulnérabilité critique ou élevée |
| Secrets | `gitleaks` | Toute détection |
| Build | `vite build` | Échec ou dépassement du budget de bundle |

## 10. Revue avant mise en production V1

- [ ] Aucun jeton dans `localStorage` ni `sessionStorage` (vérifié à la main dans le navigateur).
- [ ] Aucun `dangerouslySetInnerHTML` sans dérogation écrite.
- [ ] En-têtes de sécurité et CSP actifs et vérifiés sur l'environnement cible.
- [ ] Aucune ressource chargée depuis un domaine tiers.
- [ ] Aucun `console.log` de donnée personnelle ou financière dans le bundle de production.
- [ ] Déconnexion : cache vidé, jeton révoqué, aucune donnée résiduelle après retour arrière du navigateur.
- [ ] Chaque écran testé avec un rôle non autorisé : pas de fuite de donnée, message clair.
- [ ] `@types/react` et `@types/react-dom` présents, `tsc --noEmit` vert et significatif.
- [ ] `npm ci` reproductible depuis `package-lock.json` versionné.
- [ ] Sourcemaps non servies publiquement.
- [ ] Aucun secret dans le dépôt (`gitleaks` vert sur tout l'historique).
