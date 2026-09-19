# 02 — Classes et méthodes

Architecture en couches, par module métier. Un module = un package, avec son contrôleur, son service, son repository et ses DTO. Aucune dépendance croisée entre modules autrement que par les interfaces de service exposées.

## 1. Arborescence des packages

```
cm.cositi.api
├── config/                  SecurityConfig, JpaConfig, OpenApiConfig, CorsConfig,
│                            RateLimitConfig, AuditorAwareConfig, FlywayConfig
├── commun/
│   ├── entite/              EntiteAuditable, EntiteArchivable (@MappedSuperclass)
│   ├── exception/           ExceptionMetier, ExceptionRessourceIntrouvable,
│   │                        ExceptionConflit, ExceptionAutorisation, GestionnaireExceptions
│   ├── reponse/             ReponsePaginee<T>, ReponseErreur, ReponseValidation
│   ├── validation/          TelephoneCamerounais, MatriculeValide (annotations)
│   └── util/                Matricules, Montants, Periodes, Chiffrement
├── securite/
│   ├── entite/              Utilisateur, Role, Permission
│   ├── service/             ServiceAuthentification, ServiceUtilisateur, ServiceJeton,
│   │                        ServicePerimetreDonnees
│   ├── filtre/              FiltreJwt, FiltreJournalisationAcces
│   └── controleur/          ControleurAuthentification, ControleurUtilisateur, ControleurRole
├── parametre/               Parametre, ServiceParametre, ControleurParametre
├── audit/                   JournalAudit, ServiceAudit, AspectAudit, ControleurAudit
├── organisation/            Zone, Agent, AffectationPortefeuille + services + controleurs
├── adherent/                Adherent, AyantDroit, Adhesion, Association, Activite, Pack
├── cotisation/              Paiement, AffectationPaiement, ComposanteAffectation, RemiseCaisse
├── droits/                  PeriodeDroits, ServiceCalculDroits, ServiceRegularite
├── cnps/                    DossierCnps, PieceDossierCnps, DeclarationCnps
├── document/                Document, ServiceStockageDocument, ServiceAnalyseAntivirus
├── relance/                 CampagneRelance, Relance
├── notification/            Notification, ServiceNotification
├── reporting/               ServiceTableauBord, ServiceExport, ServiceControleCoherence
└── migration/               ServiceMigrationClasseur, RapportMigration
```

## 2. Classes transverses

### `EntiteAuditable` (@MappedSuperclass)
```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class EntiteAuditable {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    protected UUID id;
    @CreatedDate     protected Instant creeLe;
    @CreatedBy       protected String creePar;
    @LastModifiedDate protected Instant modifieLe;
    @LastModifiedBy  protected String modifiePar;
    @Version         protected Long version;
}
```

### `EntiteArchivable extends EntiteAuditable`
Ajoute `archive`, `archiveLe`, `archivePar`, `motifArchivage`.
Toutes les entités archivables portent `@SQLRestriction("archive = false")` et exposent une méthode de repository explicite pour lire les archivées (`findByIdIncludingArchived`).

### `ServiceParametre`
Aucune règle [V] ne vit dans le code. Toute lecture passe par ce service.
```java
public interface ServiceParametre {
    String texte(String cle);
    BigDecimal decimal(String cle);
    int entier(String cle);
    boolean booleen(String cle);
    <T> T json(String cle, Class<T> type);
    boolean estValide(String cle);                 // false si statut_validation = 'V'
    void modifier(String cle, String valeur, String motif);
}
```
Comportement obligatoire : si `estValide(cle)` renvoie `false`, le service appelant journalise un avertissement et l'API renvoie l'avertissement dans l'enveloppe de réponse. On ne bloque pas, mais on ne laisse jamais croire que la règle est validée.

### `ServicePerimetreDonnees`
Centralise le filtrage par périmètre. Toute requête de liste passe par lui.
```java
public interface ServicePerimetreDonnees {
    Specification<Adherent> perimetreAdherent(Utilisateur u);
    Specification<Paiement> perimetrePaiement(Utilisateur u);
    void verifierAccesAdherent(Utilisateur u, UUID adherentId);   // lève ExceptionAutorisation
    void verifierAccesPaiement(Utilisateur u, UUID paiementId);
}
```
Règles : `AGENT_TERRAIN` → uniquement les adhérents de son portefeuille ouvert · `CHEF_AGENT_TERRAIN` → son propre portefeuille (il reste agent) plus celui des agents qu'il supervise, selon le contrat [A] de désignation retenu en `01_SCHEMA_BDD.md` §2 · `GESTIONNAIRE_COMPTE` → global sur les adhérents et les dossiers CNPS, pas sur la trésorerie · `PCA`, `DG`, `DGA`, `DAF`, `SUPER_ADMIN` → global. `SUPER_ADMIN` a un périmètre global technique (comptes, rôles, paramètres) mais **pas d'accès métier courant** aux données nominatives — voir `04_SECURITE.md` §3.

### `ServiceAudit`
```java
public interface ServiceAudit {
    void tracer(TypeOperation type, String entite, UUID entiteId,
                Object avant, Object apres, String motif);
    void tracerRefus(String entite, UUID entiteId, String permissionManquante);
    void tracerExport(String typeExport, Map<String,Object> filtres, int nbLignes);
}
```
Implémentation : sérialisation JSONB avec masquage des champs annotés `@DonneeSensible` (CNI, téléphone partiel, empreintes). Écriture dans la même transaction que l'opération métier.

## 3. Module Adhérent

### Entité `Adherent`
Champs conformes à `01_SCHEMA_BDD.md`. Points d'implémentation :
- `matricule` : `@Column(updatable = false, unique = true, nullable = false)`.
- `statut` : `@Enumerated(EnumType.STRING)`.
- Pas de champ `agentNom` persisté comme source de vérité ; un `@Transient` ou une projection pour l'affichage.

### `ServiceMatricule`
```java
public interface ServiceMatricule {
    String genererProchain();               // COSITI-0000N, séquence PostgreSQL dédiée
    boolean estValide(String matricule);
}
```
Utilise une séquence PostgreSQL (`seq_matricule_adherent`), pas un `MAX(...)+1` — le calcul par maximum n'est pas sûr en concurrence. Prévoir dès maintenant l'interface pour l'attribution par blocs pré-réservés (besoin V2, enrôlement hors ligne) sans l'implémenter.

### `ServiceDoublonAdherent`
```java
public interface ServiceDoublonAdherent {
    List<CandidatDoublon> rechercher(CritereDoublon critere);
}
public record CandidatDoublon(UUID adherentId, String matricule, String nomComplet,
                              String telephone, int scoreSimilarite, String motifCorrespondance) {}
```
Règles de correspondance, par ordre de force : téléphone principal identique · CNI identique · similarité de nom ≥ seuil configurable (`pg_trgm`, `similarity()`) dans la même zone. **Jamais de fusion automatique** : on renvoie les candidats, l'utilisateur tranche, et le choix de créer malgré l'alerte est journalisé (`ADHERENT_DOUBLON_IGNORE`).

### `ServiceAdherent`
```java
public interface ServiceAdherent {
    AdherentDetailDto creer(CreationAdherentDto dto, Utilisateur auteur);
    AdherentDetailDto consulter(UUID id, Utilisateur demandeur);
    AdherentDetailDto modifier(UUID id, ModificationAdherentDto dto, Utilisateur auteur);
    ReponsePaginee<AdherentResumeDto> rechercher(CritereRechercheAdherent critere,
                                                 Pageable pageable, Utilisateur demandeur);
    void archiver(UUID id, String motif, Utilisateur auteur);
    void changerStatut(UUID id, StatutAdherent nouveau, String motif, Utilisateur auteur);
    AdhesionDto changerPack(UUID id, UUID packId, LocalDate effetLe, Utilisateur auteur);
}
```
`creer` : contrôle de doublon → génération du matricule → création de l'adhésion ouverte → création de l'affectation de portefeuille → journalisation. Le tout en une transaction.
`changerPack` : clôture l'adhésion en cours (`dateFin = effetLe - 1`) et en ouvre une nouvelle. **L'impact sur les droits déjà acquis est une règle [V]** : ne rien recalculer rétroactivement tant que le DAF n'a pas tranché, journaliser un avertissement.

### `ServicePortefeuille`
```java
public interface ServicePortefeuille {
    void affecter(UUID adherentId, UUID agentId, String motif, Utilisateur auteur);
    void transferer(UUID adherentId, UUID nouvelAgentId, String motif, Utilisateur auteur);
    void transfererEnLot(List<UUID> adherentIds, UUID nouvelAgentId, String motif, Utilisateur auteur);
    List<AdherentResumeDto> portefeuille(UUID agentId, Utilisateur demandeur);
    List<AdherentResumeDto> sansAgentReferent(UUID zoneId);
    ChargeAgentDto charge(UUID agentId, YearMonth periode);
}
```
`transferer` clôt l'affectation ouverte avant d'en créer une nouvelle, dans la même transaction. Motif obligatoire.

**[A — contrat à valider, voir `03_SPECIFICATIONS_API.md` §10]** La désignation d'un agent comme `CHEF_AGENT_TERRAIN` par le DGA et l'attribution d'objectifs à un agent ne sont pas encore des méthodes de `ServicePortefeuille` ni d'un autre service : leur contrat REST et leur modèle de données (`01_SCHEMA_BDD.md` §2) doivent être fixés avant toute signature de méthode. Ne pas anticiper une méthode `designerChef(...)` ou `attribuerObjectif(...)` sans cette validation.

## 4. Module Cotisation

### `ServicePaiement`
```java
public interface ServicePaiement {
    PaiementDto enregistrer(EnregistrementPaiementDto dto, Utilisateur auteur);
    PaiementDto valider(UUID paiementId, Utilisateur validateur);
    PaiementDto corriger(UUID paiementId, CorrectionPaiementDto dto, String motif, Utilisateur auteur);
    void annuler(UUID paiementId, String motif, Utilisateur auteur);
    ReponsePaginee<PaiementDto> journal(CritereJournalPaiement critere, Pageable p, Utilisateur u);
    RecuDto genererRecu(UUID paiementId);
}
```

Contrôles obligatoires dans `enregistrer` :
1. Adhérent existant, non archivé, accessible dans le périmètre de l'auteur.
2. Montant strictement positif.
3. `referenceTransaction` non vide si le mode est Orange Money ou MTN MoMo. **Pas de référence de secours générée automatiquement** — c'est ce que faisait le prototype existant et cela rend le rapprochement impossible.
4. Date de paiement ≤ aujourd'hui et ≥ date d'adhésion.
5. Clé d'idempotence : si elle existe déjà, renvoyer le paiement existant en `200`, ne pas créer de doublon.
6. Numéro de reçu attribué par séquence dédiée.
7. Statut initial : `A_CONTROLER` (jamais `VALIDE` directement).

`valider` : lève `ExceptionAutorisation` si `validateur.id == paiement.creePar` (séparation des responsabilités), puis déclenche l'affectation et le calcul des droits.

**[A — contrat à valider, voir `03_SPECIFICATIONS_API.md` §10]** Le scénario S05 introduit une confirmation par le Chef des agents de terrain avant le contrôle DAF (`Agent → Chef → DAF`, jamais de validation par le créateur à aucun niveau). Deux méthodes de service sont pressenties — `confirmerParChef(UUID paiementId, Utilisateur chef)` et `signalerIncoherence(UUID paiementId, String motif, Utilisateur daf)` — mais ne doivent pas être codées avant que le contrat REST correspondant soit fixé. Ne pas les ajouter à `ServicePaiement` par anticipation.

### `ServiceAffectationPaiement`
```java
public interface ServiceAffectationPaiement {
    List<AffectationDto> affecter(UUID paiementId, Utilisateur auteur);
    List<AffectationDto> affecterManuellement(UUID paiementId, List<LigneAffectationDto> lignes,
                                              Utilisateur auteur);
    void verifierInvariant(UUID paiementId);   // somme des affectations = montant
}
```
`affecter` lit la règle `REPARTITION_VERSEMENT` dans `parametre`. **Tant que ce paramètre est marqué [V]**, l'implémentation par défaut crée une affectation unique vers la composante `COOPERATIVE` (montant intégral, sans ventilation) et journalise un avertissement. C'est la seule option honnête : le prototype existant ne ventile rien, et les deux versions documentées de la règle se contredisent.

Le format du paramètre, quand il sera validé, doit rester générique :
```json
{"regle":"PAR_PACK","paliers":[
  {"pack":"PACK_700","parts":[{"composante":"CNPS","montant":700}]},
  {"pack":"PACK_1000","parts":[{"composante":"CNPS","montant":700},
                               {"composante":"EPARGNE","montant":300}]}]}
```

### `ServiceRemiseCaisse`
```java
public interface ServiceRemiseCaisse {
    RemiseCaisseDto declarer(UUID agentId, List<UUID> paiementIds, Utilisateur auteur);
    RemiseCaisseDto receptionner(UUID remiseId, BigDecimal montantRecu, Utilisateur receveur);
    BigDecimal caisseEnAttente(UUID agentId);
}
```
`receptionner` refuse si `receveur` est l'agent lui-même. Un écart non nul bascule la remise en `EN_ECART` et crée une notification pour le DAF.

## 5. Module Droits

### `ServiceCalculDroits`
Cœur métier. À traiter comme le code le plus critique du projet, avec la couverture de tests la plus forte.
```java
public interface ServiceCalculDroits {
    List<PeriodeDroits> imputer(AffectationPaiement affectation);
    SituationDroitsDto situation(UUID adherentId, LocalDate dateReference);
    void recalculer(UUID adherentId, String motif, Utilisateur auteur);
}
public record SituationDroitsDto(UUID adherentId, String matricule,
    LocalDate couvertJusquAu, int joursCouvertsTotal, int joursRetard,
    BigDecimal cumulCotise, BigDecimal soldeAvantSeuil,
    StatutRegularite statut, boolean eligibleCnps, List<Avertissement> avertissements) {}
```

Principes d'implémentation :
- Les périodes sont **persistées**, jamais recalculées uniquement à l'affichage.
- L'imputation part de la fin de la dernière période couverte, pas de la date du paiement.
- `joursCouverts = montantImpute / pack.montantJournalier`, arrondi vers le bas. **Le sort du reliquat est une règle [V]** : par défaut, il reste en solde non imputé et n'ouvre aucun droit partiel.
- Aucun chevauchement de périodes pour un même adhérent — contrôle avant insertion.
- Un recalcul complet est possible et journalisé (`DROITS_RECALCUL`), réservé à `DAF` et `SUPER_ADMIN`.

### `ServiceRegularite`
```java
public interface ServiceRegularite {
    StatutRegularite evaluer(UUID adherentId, LocalDate dateReference);
    ReponsePaginee<AdherentEnRetardDto> retardataires(CritereRetard c, Pageable p, Utilisateur u);
    void rafraichirStatutsQuotidiens();   // tâche planifiée
}
```
`StatutRegularite` : `A_JOUR`, `PARTIELLEMENT_A_JOUR`, `EN_RETARD`, `JAMAIS_COTISE`. Le seuil de bascule en retard est le paramètre `DELAI_RETARD_JOURS`, pas une constante (le prototype existant codait 30 jours en dur).

## 6. Module CNPS

### `ServiceDossierCnps`
```java
public interface ServiceDossierCnps {
    DossierCnpsDto ouvrir(UUID adherentId, Utilisateur auteur);
    DossierCnpsDto ajouterPiece(UUID dossierId, UUID documentId, String typePiece, Utilisateur a);
    DossierCnpsDto changerStatut(UUID dossierId, StatutDossier nouveau, String commentaire, Utilisateur a);
    List<PieceManquanteDto> piecesManquantes(UUID dossierId);
    List<AdherentResumeDto> eligiblesNonImmatricules(UUID zoneId);
}
```
L'éligibilité se calcule par rapport au `seuil_eligibilite_cnps` **du pack de l'adhérent** (10 500 ou 15 000), pas par rapport à un seuil global. Les transitions de statut interdites lèvent `ExceptionMetier` avec le chemin autorisé en message.

### `ServiceDeclarationCnps`
```java
public interface ServiceDeclarationCnps {
    DeclarationDto preparer(UUID dossierId, YearMonth periode, Utilisateur auteur);
    DeclarationDto marquerTransmise(UUID declarationId, UUID accuseDocumentId, Utilisateur a);
    List<DeclarationDto> aProduire(YearMonth periode);
}
```
`preparer` construit le montant à partir des `periode_droits` du mois. Le revenu mensuel déclaré (`revenu_mensuel_declare`) est **[V]** : si le champ est nul, la préparation aboutit mais porte un avertissement explicite, elle n'invente aucune assiette.

Aucune intégration technique directe avec la CNPS en V1. `marquerTransmise` est une action humaine tracée.

## 7. Module Document

### `ServiceStockageDocument`
```java
public interface ServiceStockageDocument {
    DocumentDto televerser(MultipartFile fichier, TypeDocument type, RattachementDto rattachement,
                           Utilisateur auteur);
    Resource telecharger(UUID documentId, Utilisateur demandeur);   // journalise la consultation
    void archiver(UUID documentId, String motif, Utilisateur auteur);
}
```
Contrôles : taille maximale configurée · type MIME validé par **signature binaire** (magic bytes), jamais par extension ni par l'en-tête client · nom de fichier régénéré (UUID), l'original conservé pour affichage seulement, assaini · empreinte SHA-256 calculée et stockée · analyse antivirus avant mise à disposition · stockage hors racine web, servi uniquement par l'API après contrôle d'accès · chiffrement au repos pour CNI et actes de naissance.

## 8. Module Reporting

### `ServiceTableauBord`
```java
public interface ServiceTableauBord {
    TableauBordDirectionDto direction(CritereTableauBord c, Utilisateur u);
    TableauBordDafDto daf(CritereTableauBord c, Utilisateur u);
    TableauBordCnpsDto cnps(CritereTableauBord c, Utilisateur u);
    TableauBordTerrainDto terrain(UUID agentId, Utilisateur u);
}
```
Indicateur central : `tauxActivation = adherentsAyantCotiseAuMoinsUneFois / adherentsEnregistres`. Calculé sur les vues matérialisées, jamais par agrégation à la volée sur l'ensemble des paiements.

### `ServiceExport`
Tout export passe par le périmètre de données du demandeur et est journalisé (`EXPORT_SENSIBLE`) avec le type, les filtres et le nombre de lignes. Formats : CSV, XLSX. Génération asynchrone au-delà d'un seuil configuré.

### `ServiceControleCoherence`
Exécute chaque nuit les contrôles listés en `01_SCHEMA_BDD.md` §8 et produit un rapport d'anomalies consultable dans l'application.

## 9. Gestion des erreurs

`GestionnaireExceptions` (`@RestControllerAdvice`) produit une réponse normalisée unique :
```json
{
  "horodatage": "2026-09-16T10:12:33Z",
  "statut": 409,
  "code": "PAIEMENT_REFERENCE_MANQUANTE",
  "message": "La référence de transaction est obligatoire pour un paiement Orange Money.",
  "champ": "referenceTransaction",
  "traceId": "8f2c…",
  "avertissements": ["Règle de répartition non validée par le DAF — affectation unique appliquée."]
}
```
Le message est destiné à l'utilisateur final et rédigé en français métier. **Aucune trace technique, aucun nom de table, aucune requête SQL ne sort de l'API.** Le `traceId` permet de retrouver le détail dans les logs serveur.

| Exception | Statut |
|---|---|
| `ExceptionValidation` | 400 |
| Authentification manquante ou invalide | 401 |
| `ExceptionAutorisation` | 403 |
| `ExceptionRessourceIntrouvable` | 404 |
| `ExceptionConflit` (doublon, verrou optimiste, transition interdite) | 409 |
| Dépassement de quota | 429 |
| Erreur inattendue | 500 (message générique) |
