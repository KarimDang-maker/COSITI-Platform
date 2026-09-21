# Journal des dépendances — API COSITI

Toute dépendance ajoutée au projet est consignée ici, sans exception, y compris un utilitaire trivial.
Procédure de vérification : `docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`.
Une dépendance présente dans `pom.xml` mais absente de ce journal est un défaut bloquant en revue.

## Socle initial

Les dépendances listées au §6 de `05_DEPENDANCES_CHAINE_LOGICIELLE.md` sont validées d'emblée.
Elles restent soumises aux contrôles continus d'intégration continue.

- Date de validation du socle : ____________
- Validé par : ____________

## Gabarit à recopier pour chaque ajout

```markdown
## groupId:artifactId — version
- Date : AAAA-MM-JJ — Auteur :
- Motif :
- Alternative écartée : (raison)
- Identité vérifiée : coordonnées confrontées à (URL du dépôt officiel)
- OSV : · Dependency-Check : · OSS Index :
- Avis de malveillance : (recherche OSV MAL-, historique du mainteneur)
- Signature Maven Central : vérifiée / non vérifiée
- Licence : — compatible / à arbitrer
- Santé du projet : dernière publication, nombre de mainteneurs, SECURITY.md
- Version épinglée :
```

## Exceptions en cours

Toute vulnérabilité non corrigée faisant l'objet d'un contournement est inscrite ici,
avec sa date, son auteur et sa date de réexamen. Une exception sans date de réexamen
n'est pas une exception, c'est un oubli.

| Composant | Avis | Gravité | Contournement | Décidé par | Le | Réexamen le |
|---|---|---|---|---|---|---|
| | | | | | | |
