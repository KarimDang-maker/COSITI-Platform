# Journal des dépendances — Interface web COSITI

Tout paquet npm ajouté au projet est consigné ici, sans exception, y compris un micro-paquet.
Procédure de vérification : `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`.
Un paquet présent dans `package.json` mais absent de ce journal est un défaut bloquant en revue.

## Socle initial

Les paquets listés au §6 de `05_DEPENDANCES_CHAINE_LOGICIELLE.md` sont validés d'emblée.
Ils restent soumis aux contrôles continus d'intégration continue.

- Date de validation du socle : ____________
- Validé par : ____________

## Gabarit à recopier pour chaque ajout

```markdown
## nom-du-paquet — version
- Date : AAAA-MM-JJ — Auteur :
- Motif :
- Alternative écartée : (raison)
- Nom vérifié caractère par caractère contre (URL de la documentation officielle)
- Dépôt source officiel : — cohérent avec le paquet publié : oui / non
- Première publication : · Mainteneurs : · Dernière version :
- Scripts de cycle de vie : (`npm view <paquet> scripts`)
- OSV : (avis, MAL-) · npm audit : · npm audit signatures :
- Dépendances transitives apportées :
- Licence : — compatible / à arbitrer
- Version épinglée : (save-exact)
```

## Exceptions en cours

| Paquet | Avis | Gravité | Contournement | Décidé par | Le | Réexamen le |
|---|---|---|---|---|---|---|
| | | | | | | |

## Incidents de chaîne logicielle

Tout paquet signalé comme malveillant après installation est traité comme une compromission
de poste, pas comme un simple retrait de dépendance : rotation des secrets accessibles depuis
le poste et l'intégration continue, puis consignation ici.

| Date | Paquet | Nature | Actions menées | Secrets rotés |
|---|---|---|---|---|
| | | | | |
