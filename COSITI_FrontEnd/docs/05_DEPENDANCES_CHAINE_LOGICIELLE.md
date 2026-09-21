# 05 — Dépendances et chaîne logicielle (frontend)

## 1. Pourquoi ce document est le plus important du pack frontend

L'écosystème npm est la principale porte d'entrée d'une attaque sur ce dépôt. Un paquet malveillant installé ici s'exécute :
- sur le poste du développeur, au moment de l'installation, via les scripts de cycle de vie ;
- dans le navigateur d'un utilisateur authentifié, avec accès au jeton en mémoire et à tout ce qui est affiché à l'écran.

Le prototype existant illustre le problème : trois dépendances déclarées jamais importées, et `@types/react` absent — donc `tsc` ne vérifiait rien. Personne ne savait ce qui entrait dans le produit.

## 2. Procédure d'ajout d'un paquet

Aucun paquet n'est installé sans avoir passé les dix points ci-dessous. Le résultat est consigné dans `docs/journal-dependances.md`.

**1. Justifier le besoin.** Est-ce faisable avec React, la bibliothèque standard ou une dépendance déjà présente ? Un formatage de date, un `debounce`, un tri : la réponse est presque toujours oui. Les micro-paquets d'une ligne sont historiquement le vecteur d'attaque le plus rentable.

**2. Vérifier le nom exact — contrôle anti-usurpation.** Comparer caractère par caractère avec le nom officiel donné par la documentation du projet. Les pièges classiques : lettre en trop ou en moins, trait d'union déplacé, chiffre substitué à une lettre, faux paquet d'organisation (`@react/…` au lieu du nom réel). **Ne jamais copier un nom de paquet depuis un billet de blog, un forum, une capture d'écran ou une réponse d'IA sans le confronter à la source officielle.** Un paquet suggéré qui n'existe pas encore est une cible : quelqu'un peut le publier.

**3. Vérifier que le paquet n'est pas usurpé.** Signaux d'alerte : date de première publication très récente pour une bibliothèque censée être établie · téléchargements hebdomadaires sans rapport avec la réputation annoncée · dépôt source absent ou pointant vers un projet sans lien · description recopiée d'un autre paquet · nombre de versions anormalement faible.

**4. Interroger les bases de vulnérabilités.**
- **OSV** (osv.dev) — `osv-scanner --lockfile=package-lock.json`. Couvre npm et référence aussi les avis de paquets malveillants (préfixe `MAL-`).
- **GitHub Advisory Database** — Dependabot activé sur le dépôt.
- **`npm audit`** — utile, mais insuffisant seul : il ne détecte que les vulnérabilités déclarées, pas la malveillance.

**5. Vérifier l'absence de comportement malveillant.** Point distinct du précédent. Un paquet sans CVE peut être malveillant. Ce qu'il faut regarder :
- **Scripts de cycle de vie** (`preinstall`, `install`, `postinstall`) : un paquet de formatage de date n'a aucune raison d'en avoir. Vérifier avec `npm view <paquet> scripts` avant d'installer.
- **Code obfusqué ou minifié** dans les sources publiées alors que le dépôt contient du code lisible.
- **Accès réseau** dans un paquet qui n'en a pas besoin.
- **Écart entre le dépôt source et le contenu publié** : le code sur le dépôt public n'est pas nécessairement celui qui est publié sur le registre.
- Un service d'analyse comportementale de paquets npm (Socket ou équivalent) automatise ces contrôles et devrait être activé sur le dépôt [A].

**6. Vérifier la santé du projet.** Dernière publication, nombre de mainteneurs, réactivité aux avis de sécurité, nombre de dépendances transitives apportées. Un paquet qui en tire trente autres apporte trente surfaces d'attaque.

**7. Vérifier les signatures et la provenance.** `npm audit signatures` vérifie les signatures du registre. Privilégier, à fonction égale, les paquets publiant des attestations de provenance.

**8. Vérifier la licence.** Compatible avec l'usage de la COSITI.

**9. Installer avec les scripts désactivés lors de l'évaluation.** `npm install <paquet> --ignore-scripts` pour inspecter avant toute exécution. En intégration continue, `npm ci --ignore-scripts` chaque fois que c'est possible.

**10. Épingler la version exacte.** `save-exact=true` dans `.npmrc`. Aucun `^`, aucun `~`. `package-lock.json` versionné, `npm ci` en CI — jamais `npm install`, qui peut résoudre différemment.

## 3. Configuration `.npmrc` obligatoire

```
save-exact=true
audit-level=high
fund=false
package-lock=true
engine-strict=true
```

Registre : registre npm officiel uniquement, ou miroir interne contrôlé. Aucun registre alternatif sans validation explicite du responsable technique — un registre non maîtrisé permet de servir une version modifiée d'un paquet légitime.

Pour les paquets d'organisation, déclarer explicitement le registre associé à la portée : c'est ce qui évite qu'un paquet interne soit résolu depuis le registre public sous un nom homonyme.

## 4. Contrôles en intégration continue

| Contrôle | Commande | Fréquence | Blocage |
|---|---|---|---|
| Vulnérabilités | `osv-scanner --lockfile=package-lock.json` | Chaque PR | Critique ou élevée |
| Audit npm | `npm audit --omit=dev --audit-level=high` | Chaque PR + quotidien | Élevée ou critique |
| Signatures du registre | `npm audit signatures` | Chaque PR | Échec de vérification |
| Cohérence du verrou | `npm ci` depuis un cache vide | Chaque PR | Toute divergence avec `package-lock.json` |
| Scripts d'installation | Revue des `postinstall` des nouvelles dépendances | À chaque ajout | Script non justifié |
| Dépendances inutilisées | `depcheck` | Chaque PR | Dépendance déclarée non importée |
| Licences | `license-checker` | Chaque version | Licence non autorisée |
| SBOM | `@cyclonedx/cyclonedx-npm` | Chaque version | Échec de génération |
| Secrets | `gitleaks` | Chaque PR | Toute détection |
| Mises à jour | Dependabot ou Renovate, regroupées, hors correctifs de sécurité livrés seuls | Hebdomadaire | — |

Le contrôle « dépendance déclarée non importée » est volontairement bloquant : c'est exactement le défaut du prototype existant.

Le SBOM de chaque version livrée est archivé. Le jour où une vulnérabilité npm est publiée, c'est lui qui permet de répondre en quelques minutes à « sommes-nous concernés, et dans quelle version en production ? ».

## 5. Traitement d'une vulnérabilité ou d'un paquet compromis

| Situation | Délai | Action |
|---|---|---|
| Paquet signalé comme malveillant | Immédiat | Retrait, `npm ci` propre, **rotation de tous les secrets accessibles depuis le poste ou la CI**, analyse des dépendances transitives, journalisation de l'incident |
| Vulnérabilité critique | 48 h | Montée de version ou retrait, livraison en urgence |
| Vulnérabilité élevée | 7 jours | Montée de version planifiée |
| Moyenne | Prochain cycle | Regroupée |
| Faible | Suivi | Consignée |

Un paquet malveillant détecté après installation doit être traité comme une compromission de poste, pas comme un simple retrait de dépendance. Les scripts d'installation s'exécutent avec les droits du développeur.

Si aucun correctif amont n'existe : évaluer l'exploitabilité réelle (le composant est-il atteignable depuis une saisie utilisateur ?), documenter la décision datée et signée, contourner, et rouvrir à chaque cycle.

## 6. Socle autorisé d'emblée

`react`, `react-dom`, `@types/react`, `@types/react-dom`, `typescript`, `vite`, `@vitejs/plugin-react`, `react-router-dom`, `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `@hookform/resolvers`, `zod`, `tailwindcss`, `postcss`, `autoprefixer`, `recharts`, `date-fns`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `msw`, `@playwright/test`, `eslint` et son écosystème (`eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`), `prettier`.

`@types/react` et `@types/react-dom` sont **obligatoires**, pas optionnels : leur absence rend la vérification de types muette.

Client HTTP : `fetch` natif suffit. N'ajouter une bibliothèque HTTP que si un besoin précis le justifie, et le documenter.

## 7. Interdits explicites

- Tout paquet ajouté sans ligne dans `docs/journal-dependances.md`.
- Toute plage de version (`^`, `~`, `*`, `latest`) dans `package.json`.
- `npm install` en intégration continue — uniquement `npm ci`.
- `package-lock.json` non versionné, régénéré sans revue, ou modifié à la main.
- Tout registre autre que le registre officiel sans validation écrite.
- Toute bibliothèque de cryptographie : le chiffrement est du ressort du serveur. Le frontend ne chiffre rien et ne stocke aucune clé.
- Tout paquet dont la fonction est couverte par le socle ci-dessus.
- Toute dépendance de production tirée d'un paquet uniquement destiné au développement, et inversement (`dependencies` et `devDependencies` correctement séparées — ce qui conditionne la pertinence de `npm audit --omit=dev`).
- Toute désactivation d'un contrôle de CI sans exception écrite et datée.

## 8. Journal des dépendances — format

```markdown
## nom-du-paquet — 4.2.0
- Date : 2026-09-20 — Auteur : …
- Motif : …
- Alternative écartée : … (raison)
- Nom vérifié caractère par caractère contre https://… (documentation officielle)
- Dépôt source officiel : https://… — cohérent avec le paquet publié
- Première publication : 2019 · Mainteneurs : 5 · Dernière version : 2026-08
- Scripts de cycle de vie : aucun (`npm view nom-du-paquet scripts`)
- OSV : aucun avis, aucun MAL- · npm audit : RAS · signatures : vérifiées
- Dépendances transitives apportées : 3
- Licence : MIT — compatible
- Version épinglée : 4.2.0 (save-exact)
```
