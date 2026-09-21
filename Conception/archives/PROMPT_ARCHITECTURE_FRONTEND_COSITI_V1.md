# PROMPT MAÎTRE — CONSTRUIRE L’ARCHITECTURE COMPLÈTE DU FRONTEND COSITI V1

## MISSION

Tu es un **Frontend Architect Senior spécialisé en React 19, TypeScript strict, Vite, architecture modulaire par domaine métier, TanStack Query, React Hook Form, Zod, sécurité frontend et conception d'interfaces de back-office professionnelles**.

Ta mission immédiate n'est PAS de développer toute l'application métier.

Ta priorité absolue est de :

> **CONSTRUIRE ET MATÉRIALISER L'ARCHITECTURE COMPLÈTE DU FRONTEND COSITI V1.**

Le résultat attendu n'est pas seulement une liste de dossiers.

Je veux que tu crées réellement :

- les dossiers ;
- les pages ;
- les routes ;
- les composants ;
- les layouts ;
- les hooks ;
- les services API ;
- les types ;
- les schémas Zod ;
- les formulaires ;
- les providers ;
- le contexte d'authentification ;
- les guards de navigation ;
- les composants de permissions ;
- les tables ;
- les filtres ;
- les modales ;
- les états de chargement ;
- les états d'erreur ;
- les composants métier ;
- les mappers frontend/API si nécessaires ;
- les tests ;
- la configuration ;
- la documentation.

Même si une fonctionnalité n'est pas encore complètement implémentée, **la structure et les classes/fichiers structurants doivent exister au bon endroit**.

Une page ou un composant peut avoir une implémentation minimale tant que sa responsabilité est claire.

---

# 1. CONTEXTE DU PROJET

Le frontend est le **back-office interne COSITI V1**.

Il communique avec le backend COSITI via une API REST versionnée.

Le frontend doit être :

- lisible ;
- strictement typé ;
- modulaire ;
- sécurisé ;
- maintenable ;
- testable ;
- évolutif ;
- cohérent avec le backend ;
- conforme au Design System COSITI.

Le frontend n'est PAS l'autorité métier.

Le frontend :

- affiche ;
- collecte ;
- valide les données de forme ;
- appelle l'API ;
- gère l'état de l'interface ;
- masque les actions non pertinentes ;
- présente les erreurs ;
- gère la navigation.

Le backend reste l'autorité pour :

- authentification ;
- autorisation ;
- permissions ;
- règles métier ;
- calculs ;
- droits ;
- statuts ;
- validation métier ;
- périmètres organisationnels ;
- paiements ;
- CNPS ;
- audit.

---

# 2. STACK FRONTEND OBLIGATOIRE

Utilise la stack définie pour COSITI V1 :

```text
React 19
TypeScript strict
Vite
React Router
TanStack Query
React Hook Form
Zod
Tailwind CSS
Recharts
Vitest
Playwright
```

Avant d'ajouter une nouvelle dépendance :

- vérifier si elle est réellement nécessaire ;
- vérifier si elle existe déjà ;
- vérifier son rôle ;
- respecter la procédure de dépendances du projet ;
- ne jamais installer arbitrairement un package simplement pour résoudre un problème local.

Respecte notamment :

```text
save-exact
package-lock
audit
OSV
gitleaks
```

et les règles de journalisation des nouvelles dépendances définies par le projet.

---

# 3. PRINCIPES ARCHITECTURAUX

Utilise :

- séparation des responsabilités ;
- modularité par domaine métier ;
- SOLID lorsque pertinent ;
- composants réutilisables ;
- séparation UI / logique métier / accès API ;
- typage strict ;
- programmation déclarative React ;
- server state avec TanStack Query ;
- état local avec useState lorsque suffisant ;
- formulaires avec React Hook Form + Zod ;
- URL pour les filtres et paramètres qui doivent être partageables ;
- Context uniquement pour les états réellement transversaux.

NE PAS utiliser Redux.

NE PAS créer un store global inutile.

NE PAS mettre les données API dans un énorme contexte global.

---

# 4. ARCHITECTURE CIBLE

Je veux une architecture par domaine métier.

Structure générale :

```text
src/
├── app/
├── api/
├── auth/
├── composants/
├── fonctionnalites/
├── lib/
├── styles/
└── types/
```

Le détail doit être suffisamment explicite pour que chaque fonctionnalité puisse être localisée immédiatement.

---

# 5. ARBORESCENCE CIBLE

Construis une architecture proche de :

```text
src/
│
├── main.tsx
│
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   ├── router.tsx
│   ├── providers/
│   │   ├── QueryProvider.tsx
│   │   ├── AuthProvider.tsx
│   │   └── AppProviders.tsx
│   │
│   ├── layouts/
│   │   ├── AuthLayout.tsx
│   │   ├── BackofficeLayout.tsx
│   │   └── ErrorLayout.tsx
│   │
│   ├── navigation/
│   │   ├── navigation.config.ts
│   │   ├── menu.config.ts
│   │   └── breadcrumbs.config.ts
│   │
│   └── erreurs/
│       ├── Page404.tsx
│       ├── Page403.tsx
│       └── Page500.tsx
│
├── api/
│   ├── client.ts
│   ├── types.ts
│   ├── erreurs.ts
│   ├── queryClient.ts
│   └── modules/
│       ├── auth.api.ts
│       ├── adherents.api.ts
│       ├── organisation.api.ts
│       ├── paiements.api.ts
│       ├── droits.api.ts
│       ├── cnps.api.ts
│       ├── documents.api.ts
│       ├── relances.api.ts
│       ├── notifications.api.ts
│       ├── tableaux-de-bord.api.ts
│       ├── rapports.api.ts
│       ├── audit.api.ts
│       └── administration.api.ts
│
├── auth/
│   ├── AuthContext.tsx
│   ├── AuthProvider.tsx
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   ├── ProtectedRoute.tsx
│   ├── PermissionGate.tsx
│   ├── auth.types.ts
│   └── auth.utils.ts
│
├── fonctionnalites/
│   ├── authentification/
│   ├── utilisateurs/
│   ├── adherents/
│   ├── organisation/
│   ├── paiements/
│   ├── controle-daf/
│   ├── droits/
│   ├── cnps/
│   ├── documents/
│   ├── relances/
│   ├── notifications/
│   ├── tableaux-de-bord/
│   ├── rapports/
│   ├── audit/
│   └── administration/
│
├── composants/
│   ├── ui/
│   ├── layout/
│   ├── navigation/
│   ├── tableaux/
│   ├── formulaires/
│   ├── feedback/
│   ├── documents/
│   └── securite/
│
├── lib/
│   ├── dates.ts
│   ├── monnaie.ts
│   ├── formatters.ts
│   ├── permissions.ts
│   ├── query-keys.ts
│   ├── constants.ts
│   └── utils.ts
│
├── styles/
│   ├── globals.css
│   └── design-tokens.css
│
└── types/
    ├── api.ts
    ├── pagination.ts
    ├── permissions.ts
    └── common.ts
```

---

# 6. RÈGLE FONDAMENTALE : ORGANISATION PAR FONCTIONNALITÉ

Chaque domaine métier doit être autonome.

Exemple :

```text
fonctionnalites/adherents/

├── pages/
├── composants/
├── hooks/
├── api/
├── schemas/
├── types/
├── utils/
└── index.ts
```

Exemple :

```text
fonctionnalites/paiements/

├── pages/
│   ├── PaiementsPage.tsx
│   ├── NouveauPaiementPage.tsx
│   └── DetailPaiementPage.tsx
│
├── composants/
│   ├── PaiementTable.tsx
│   ├── PaiementFilters.tsx
│   ├── PaiementForm.tsx
│   ├── PaiementStatusBadge.tsx
│   ├── ValidationPaiementDialog.tsx
│   ├── CorrectionPaiementDialog.tsx
│   └── AnnulationPaiementDialog.tsx
│
├── hooks/
│   ├── usePaiements.ts
│   ├── usePaiement.ts
│   ├── useCreerPaiement.ts
│   ├── useValiderPaiement.ts
│   ├── useCorrigerPaiement.ts
│   └── useAnnulerPaiement.ts
│
├── schemas/
│   └── paiement.schema.ts
│
├── types/
│   └── paiement.types.ts
│
└── index.ts
```

NE mets pas tous les hooks de toutes les fonctionnalités dans :

```text
hooks/
```

globalement.

Les hooks métier doivent rester proches de leur fonctionnalité.

---

# 7. ROUTES V1

Prépare les routes suivantes :

```text
/
├── /connexion
│
├── /adherents
├── /adherents/nouveau
├── /adherents/:id
│
├── /cotisations
├── /cotisations/nouveau
├── /cotisations/:id
│
├── /droits
│
├── /cnps
│
├── /daf
│
├── /organisation
│
├── /relances
│
├── /documents
│
├── /rapports
│
├── /administration
│
└── /audit
```

Respecter les permissions associées.

---

# 8. PERMISSIONS FRONTEND

Le frontend peut utiliser les permissions pour :

- masquer un menu ;
- masquer un bouton ;
- désactiver une action ;
- adapter l'interface.

Mais :

> LE FRONTEND NE DOIT JAMAIS ÊTRE CONSIDÉRÉ COMME LE SYSTÈME D'AUTORISATION.

Le backend doit toujours vérifier la permission.

Exemple :

```text
PermissionGate
        ↓
afficher / masquer
        ↓
API
        ↓
backend
        ↓
autorisation réelle
```

---

# 9. AUTHENTIFICATION

Créer :

```text
AuthProvider
AuthContext
useAuth
usePermissions
ProtectedRoute
PermissionGate
```

Le frontend doit gérer :

```text
connexion
utilisateur courant
refresh
déconnexion
expiration
erreur 401
erreur 403
```

Le token d'accès ne doit PAS être stocké dans :

```text
localStorage
sessionStorage
```

Le token d'accès doit rester en mémoire selon l'architecture de sécurité validée.

Le refresh token doit être géré par le mécanisme sécurisé prévu côté backend, notamment cookie HttpOnly/Secure/SameSite approprié.

Au logout :

```text
purger le token mémoire
↓
appeler l'API de déconnexion
↓
vider le cache TanStack Query
↓
retourner à /connexion
```

NE JAMAIS stocker de données personnelles persistantes dans localStorage/sessionStorage.

---

# 10. API CLIENT UNIQUE

RÈGLE ABSOLUE :

Il doit exister UNE instance HTTP centrale :

```text
src/api/client.ts
```

Tous les appels HTTP passent par cette instance.

INTERDIT :

```text
fetch(...)
axios.get(...)
axios.post(...)
```

directement dans les composants.

Le composant ne doit jamais appeler directement HTTP.

Architecture :

```text
Page
 ↓
Hook
 ↓
API module
 ↓
api/client.ts
 ↓
Backend
```

---

# 11. API MODULES

Créer :

```text
api/modules/auth.api.ts
api/modules/adherents.api.ts
api/modules/organisation.api.ts
api/modules/paiements.api.ts
api/modules/droits.api.ts
api/modules/cnps.api.ts
api/modules/documents.api.ts
api/modules/relances.api.ts
api/modules/notifications.api.ts
api/modules/tableaux-de-bord.api.ts
api/modules/rapports.api.ts
api/modules/audit.api.ts
api/modules/administration.api.ts
```

Chaque module doit exposer uniquement les fonctions API nécessaires.

Exemple :

```text
adherents.api.ts

listerAdherents()
creerAdherent()
obtenirAdherent()
modifierAdherent()
archiverAdherent()
changerStatutAdherent()
verifierDoublon()
obtenirSituation()
obtenirPaiements()
obtenirAyantsDroit()
ajouterAyantDroit()
supprimerAyantDroit()
```

---

# 12. TANSTACK QUERY

Utiliser TanStack Query pour les données serveur.

Préparer :

```text
useQuery
useMutation
query keys
invalidateQueries
prefetch
```

Créer une convention :

```text
lib/query-keys.ts
```

Exemple :

```text
adherents
adherent(id)
adherentPaiements(id)
paiements(filters)
paiement(id)
droits(adherentId)
cnpsDossiers(filters)
```

NE stocke pas les données serveur dans un Context global.

---

# 13. ÉTAT LOCAL

Utiliser `useState` pour :

- ouverture de modale ;
- onglet ;
- filtre local temporaire ;
- état UI ;
- sélection locale ;
- visibilité d'un panneau.

Utiliser URL/search params lorsque le filtre doit être :

- partageable ;
- conservé lors d'un refresh ;
- navigable avec précédent/suivant.

---

# 14. FORMULAIRES

Utiliser :

```text
React Hook Form
+
Zod
```

Architecture :

```text
Form
↓
RHF
↓
Zod
↓
API
↓
Backend
```

La validation frontend est une validation UX.

La validation backend reste obligatoire.

Ne duplique pas les règles métier complexes dans Zod.

Exemple :

Zod peut vérifier :

```text
champ obligatoire
format téléphone
format email
montant positif
date valide
```

Mais ne doit pas devenir l'autorité pour :

```text
éligibilité CNPS
droits
permissions
statut métier
règles de cotisation
```

---

# 15. MODULE ADHÉRENTS

Créer :

```text
fonctionnalites/adherents/

├── pages/
│   ├── AdherentsPage.tsx
│   ├── NouvelAdherentPage.tsx
│   └── DetailAdherentPage.tsx
│
├── composants/
│   ├── AdherentTable.tsx
│   ├── AdherentFilters.tsx
│   ├── AdherentForm.tsx
│   ├── AdherentHeader.tsx
│   ├── AdherentStatusBadge.tsx
│   ├── AdherentSituation.tsx
│   ├── AdherentPaiements.tsx
│   ├── AyantsDroitSection.tsx
│   └── VerificationDoublon.tsx
│
├── hooks/
├── schemas/
├── types/
└── index.ts
```

Le parcours de création doit prévoir :

```text
Formulaire
↓
Vérification doublon
↓
Affichage éventuel des candidats
↓
Confirmation explicite si nécessaire
↓
Création
↓
Retour détail
```

La vérification doublon ne doit pas être traitée comme une décision frontend définitive.

Le backend reste l'autorité.

---

# 16. MODULE ORGANISATION

Créer :

```text
fonctionnalites/organisation/

├── pages/
│   ├── OrganisationPage.tsx
│   ├── ZonesPage.tsx
│   ├── AgentsPage.tsx
│   └── PortefeuillesPage.tsx
│
├── composants/
│   ├── ZoneTable.tsx
│   ├── AgentTable.tsx
│   ├── AgentPortfolio.tsx
│   ├── AgentCharge.tsx
│   ├── AffectationPortfolioDialog.tsx
│   ├── TransfertPortfolioDialog.tsx
│   ├── ObjectifDialog.tsx
│   └── ChefTerrainDesignationDialog.tsx
│
├── hooks/
├── schemas/
├── types/
└── index.ts
```

Les fonctionnalités non définitivement spécifiées doivent être marquées `[V]`.

---

# 17. MODULE PAIEMENTS

Créer :

```text
fonctionnalites/paiements/

├── pages/
│   ├── PaiementsPage.tsx
│   ├── NouveauPaiementPage.tsx
│   └── DetailPaiementPage.tsx
│
├── composants/
│   ├── PaiementTable.tsx
│   ├── PaiementFilters.tsx
│   ├── PaiementForm.tsx
│   ├── PaiementStatusBadge.tsx
│   ├── PaiementDetails.tsx
│   ├── ValidationPaiementDialog.tsx
│   ├── CorrectionPaiementDialog.tsx
│   ├── AnnulationPaiementDialog.tsx
│   ├── AffectationPaiement.tsx
│   └── RecuPaiement.tsx
│
├── hooks/
├── schemas/
├── types/
└── index.ts
```

Le formulaire doit prévoir :

```text
adhérent
date
montant
mode
référence
collecteur
document
type
```

Règles UI :

- référence obligatoire pour les modes concernés ;
- bouton désactivé pendant l'envoi ;
- Idempotency-Key générée pour la création ;
- aucune soumission multiple accidentelle ;
- confirmation des opérations sensibles ;
- raison obligatoire pour correction ;
- raison obligatoire pour annulation ;
- créateur ne doit pas voir une action de validation de son propre paiement si les données utilisateur le permettent ;
- le backend reste l'autorité finale.

Après création :

```text
statut = à contrôler
```

Si le backend fournit un aperçu de couverture, il peut être affiché comme :

```text
APERÇU INDICATIF
```

et jamais comme vérité métier calculée par le frontend.

---

# 18. MODULE CONTRÔLE DAF

Créer :

```text
fonctionnalites/controle-daf/

├── pages/
│   └── ControleDafPage.tsx
│
├── composants/
│   ├── ControleTable.tsx
│   ├── ControleFilters.tsx
│   ├── ConfirmationPaiementDialog.tsx
│   ├── IncoherenceDialog.tsx
│   └── PreuvePaiementViewer.tsx
│
├── hooks/
├── types/
└── index.ts
```

NE crée pas d'écran de :

```text
gestion bancaire
dépôt microfinance
solde bancaire
Mobile Money
```

sauf nouvelle spécification validée.

---

# 19. MODULE DROITS

Créer :

```text
fonctionnalites/droits/

├── pages/
│   └── DroitsPage.tsx
│
├── composants/
│   ├── DroitsTable.tsx
│   ├── DroitsDetails.tsx
│   ├── PeriodesDroits.tsx
│   ├── StatutDroitBadge.tsx
│   └── RecalculDroitsDialog.tsx
│
├── hooks/
├── types/
└── index.ts
```

Le frontend affiche les calculs fournis par l'API.

Il ne recalcule pas les droits lui-même.

---

# 20. MODULE CNPS

Créer :

```text
fonctionnalites/cnps/

├── pages/
│   ├── CnpsPage.tsx
│   ├── DossiersCnpsPage.tsx
│   └── DetailDossierCnpsPage.tsx
│
├── composants/
│   ├── CnpsDossierTable.tsx
│   ├── CnpsFilters.tsx
│   ├── CnpsDossierDetails.tsx
│   ├── CnpsPieces.tsx
│   ├── PiecesManquantes.tsx
│   ├── CnpsStatusBadge.tsx
│   └── DeclarationCnps.tsx
│
├── hooks/
├── schemas/
├── types/
└── index.ts
```

---

# 21. MODULE DOCUMENTS

Créer :

```text
fonctionnalites/documents/

├── pages/
│   └── DocumentsPage.tsx
│
├── composants/
│   ├── DocumentTable.tsx
│   ├── DocumentUpload.tsx
│   ├── DocumentViewer.tsx
│   ├── DocumentMetadata.tsx
│   └── DocumentStatusBadge.tsx
│
├── hooks/
├── schemas/
├── types/
└── index.ts
```

Règles :

- pas d'URL publique de document privé ;
- téléchargement via API authentifiée ;
- validation type/taille ;
- affichage des erreurs ;
- aucun chemin physique exposé.

---

# 22. MODULE RELANCES

Créer :

```text
fonctionnalites/relances/

├── pages/
│   ├── RelancesPage.tsx
│   └── CampagnesRelancePage.tsx
│
├── composants/
│   ├── RelanceTable.tsx
│   ├── RelanceFilters.tsx
│   ├── RelanceResultatForm.tsx
│   ├── CampagneTable.tsx
│   └── ResultatRelanceBadge.tsx
│
├── hooks/
├── schemas/
├── types/
└── index.ts
```

Le résultat d'une relance doit être structuré.

---

# 23. MODULE NOTIFICATIONS

Créer :

```text
fonctionnalites/notifications/

├── composants/
│   ├── NotificationCenter.tsx
│   ├── NotificationItem.tsx
│   └── NotificationBadge.tsx
│
├── hooks/
├── types/
└── index.ts
```

Prévoir :

- liste ;
- non lue ;
- lecture ;
- compteur.

---

# 24. MODULE TABLEAUX DE BORD

Créer des dashboards spécialisés :

```text
fonctionnalites/tableaux-de-bord/

├── pages/
│   ├── DashboardPcaPage.tsx
│   ├── DashboardDirectionPage.tsx
│   ├── DashboardDgaPage.tsx
│   ├── DashboardDafPage.tsx
│   ├── DashboardGestionnairePage.tsx
│   └── DashboardTerrainPage.tsx
│
├── composants/
│   ├── KpiCard.tsx
│   ├── CollectionChart.tsx
│   ├── AdherentsSummary.tsx
│   ├── LateAdherentsTable.tsx
│   ├── CnpsStatusSummary.tsx
│   ├── ZonePerformanceTable.tsx
│   ├── PaymentModeChart.tsx
│   └── AlertsPanel.tsx
│
├── hooks/
├── types/
└── index.ts
```

Le dashboard PCA doit permettre de suivre l'activité globale.

Le dashboard DAF doit permettre de voir notamment :

- collecte par mode ;
- éléments à contrôler ;
- incohérences ;
- paiements sans référence lorsque pertinent.

Le dashboard Gestionnaire doit couvrir le périmètre CNPS prévu.

Le dashboard Terrain doit couvrir :

- portefeuille ;
- retards ;
- relances ;
- résultats ;
- collecte enregistrée.

NE calcule pas ces KPI dans React si le backend les fournit.

---

# 25. MODULE RAPPORTS

Créer :

```text
fonctionnalites/rapports/

├── pages/
│   └── RapportsPage.tsx
│
├── composants/
│   ├── RapportFilters.tsx
│   ├── RapportTypeSelector.tsx
│   ├── ExportStatus.tsx
│   └── ExportHistoryTable.tsx
│
├── hooks/
├── types/
└── index.ts
```

Les gros exports peuvent être asynchrones.

Le frontend doit gérer :

```text
création
en attente
traitement
terminé
échec
téléchargement
```

---

# 26. MODULE AUDIT

Créer :

```text
fonctionnalites/audit/

├── pages/
│   └── AuditPage.tsx
│
├── composants/
│   ├── AuditTable.tsx
│   ├── AuditFilters.tsx
│   ├── AuditDetails.tsx
│   └── AuditActionBadge.tsx
│
├── hooks/
├── types/
└── index.ts
```

Audit en lecture seule.

Pas de bouton supprimer.

---

# 27. MODULE ADMINISTRATION

Créer :

```text
fonctionnalites/administration/

├── pages/
│   ├── AdministrationPage.tsx
│   ├── UtilisateursPage.tsx
│   ├── RolesPage.tsx
│   └── ParametresPage.tsx
│
├── composants/
│   ├── UserTable.tsx
│   ├── UserForm.tsx
│   ├── RoleTable.tsx
│   ├── PermissionMatrix.tsx
│   ├── ParameterTable.tsx
│   └── ChangeReasonDialog.tsx
│
├── hooks/
├── schemas/
├── types/
└── index.ts
```

Toute modification administrative importante doit pouvoir demander une raison.

---

# 28. COMPOSANTS UI PARTAGÉS

Créer une bibliothèque interne :

```text
composants/ui/

├── Button.tsx
├── Input.tsx
├── Select.tsx
├── Checkbox.tsx
├── Radio.tsx
├── Textarea.tsx
├── DatePicker.tsx
├── Modal.tsx
├── Dialog.tsx
├── Drawer.tsx
├── Table.tsx
├── Pagination.tsx
├── Badge.tsx
├── Alert.tsx
├── Toast.tsx
├── Spinner.tsx
├── Skeleton.tsx
├── EmptyState.tsx
├── ErrorState.tsx
├── ConfirmDialog.tsx
└── Tooltip.tsx
```

NE recrée pas des boutons différents dans chaque module.

---

# 29. TABLEAUX

Créer des composants réutilisables :

```text
DataTable
TableHeader
TableBody
TablePagination
TableFilters
SortableHeader
EmptyTable
```

Mais attention :

NE crée pas un énorme composant DataTable générique impossible à comprendre.

Le composant générique doit gérer uniquement les comportements réellement partagés.

La logique métier reste dans le module.

---

# 30. DESIGN SYSTEM COSITI

Respecter le Design System.

Couleurs principales :

```text
Primary     #1B4F72
Success     #1E7B4D
Attention   #B36A00
Danger      #A32A2A
Information #2C5F8A
```

Créer une centralisation :

```text
styles/design-tokens.css
```

et/ou les tokens Tailwind appropriés.

NE disperse pas les valeurs de couleur dans les composants.

---

# 31. UX

L'interface doit être :

- sobre ;
- lisible ;
- prévisible ;
- professionnelle ;
- cohérente ;
- adaptée au back-office.

Utiliser le français formel :

```text
Vous
Enregistrer
Modifier
Annuler
Valider
Supprimer
Confirmer
```

NE PAS mettre d'emojis dans l'interface.

NE PAS utiliser de jargon technique côté utilisateur.

---

# 32. FORMULAIRES FINANCIERS

Pour les paiements :

- désactiver le bouton pendant la soumission ;
- empêcher les doubles soumissions ;
- confirmer les opérations sensibles ;
- afficher clairement montant/date/adhérent ;
- demander une raison pour correction/annulation ;
- ne pas déclencher l'action financière sur un simple Enter lorsque cela peut provoquer une opération accidentelle ;
- utiliser Idempotency-Key.

---

# 33. ERREURS API

Créer un système central :

```text
api/erreurs.ts
```

Gérer au minimum :

```text
400
401
403
404
409
422
429
500
```

Afficher un message utilisateur compréhensible.

NE PAS afficher :

```text
stack trace
SQL
classe Java
nom interne de serveur
```

---

# 34. LOADING / ERROR / EMPTY STATES

Chaque écran avec données serveur doit prévoir :

```text
Loading
Success
Empty
Error
```

Exemple :

```text
PaiementsPage

loading → Skeleton
success → Table
empty → EmptyState
error → ErrorState
```

Ne jamais laisser une page blanche.

---

# 35. PAGINATION

Toutes les grandes listes doivent être préparées pour la pagination backend.

Utiliser :

```text
page
size
sort
filters
```

Ne télécharge pas toute la base dans le navigateur.

---

# 36. FILTRES

Les filtres importants doivent pouvoir être conservés dans l'URL.

Exemple :

```text
/cotisations?statut=A_CONTROLER&page=1&size=20
```

Utiliser React Router / URLSearchParams.

NE stocke pas ces filtres uniquement dans useState lorsqu'ils doivent être partageables.

---

# 37. TYPESCRIPT STRICT

Règles :

```text
strict: true
```

Interdit :

```typescript
any
```

sauf exception explicitement justifiée.

Éviter :

```typescript
React.FC
```

Préférer :

```typescript
type Props = {
    ...
};

export function MonComposant({ ... }: Props) {
    ...
}
```

Toutes les props doivent être typées.

Les réponses API doivent être typées.

Les erreurs doivent être typées.

Les paramètres de route doivent être typés et validés lorsque nécessaire.

---

# 38. TYPES API

Créer des types proches des contrats backend.

Exemple :

```text
types/api.ts
types/pagination.ts
types/permissions.ts
```

Mais éviter de dupliquer manuellement un même type dans plusieurs modules.

Si le backend fournit un OpenAPI exploitable et que la génération de types est validée par le projet, évaluer cette possibilité avant de créer une duplication manuelle massive.

Toute divergence frontend/backend doit être signalée.

---

# 39. SÉCURITÉ FRONTEND

Le navigateur est considéré comme hostile.

Respecter :

- pas de secret dans le frontend ;
- pas de clé API privée ;
- pas de JWT persistant dans localStorage ;
- pas de données sensibles dans sessionStorage ;
- pas de HTML arbitraire ;
- pas de `dangerouslySetInnerHTML` sauf exception explicitement justifiée et sanitization ;
- pas de `eval` ;
- pas de `new Function()` ;
- pas de string dans `setTimeout`;
- pas de contenu Markdown/HTML non maîtrisé ;
- pas de console.log contenant PII ;
- pas de console.log contenant tokens ;
- pas de console.log contenant données financières sensibles.

---

# 40. DOCUMENTS ET FICHIERS

Pour les documents :

```text
API authentifiée
↓
récupération
↓
affichage / téléchargement contrôlé
```

Ne jamais faire :

```text
https://serveur/document/private/cni.pdf
```

si cette URL contourne l'autorisation backend.

Le frontend doit passer par le mécanisme sécurisé de l'API.

---

# 41. ROUTING

Créer un système central :

```text
app/routes.tsx
app/navigation/
```

Les routes doivent indiquer :

```text
path
component
permission
layout
```

Exemple conceptuel :

```text
/adherents
permission = ADHERENT:LIRE

/cotisations
permission = PAIEMENT:LIRE

/droits
permission = DROITS:LIRE

/cnps
permission = CNPS:LIRE

/administration
permission = ADMINISTRATION:LIRE

/audit
permission = AUDIT:CONSULTER
```

Le route guard améliore l'UX mais ne remplace jamais le contrôle backend.

---

# 42. NAVIGATION

Créer une configuration centralisée :

```text
navigation.config.ts
```

Elle doit permettre de définir :

```text
label
route
icon
permission
ordre
section
```

Le menu doit être construit à partir des permissions disponibles.

Mais :

> masquer un menu n'est PAS une protection de sécurité.

---

# 43. LAYOUT BACK-OFFICE

Préparer :

```text
BackofficeLayout
Sidebar
Header
Breadcrumbs
UserMenu
NotificationCenter
MainContent
```

Architecture :

```text
BackofficeLayout
├── Sidebar
├── Header
│   ├── Breadcrumbs
│   ├── Notifications
│   └── UserMenu
│
└── MainContent
```

Le layout ne doit pas contenir de logique métier.

---

# 44. DASHBOARD

Les dashboards ne doivent pas appeler directement l'API depuis les composants graphiques.

Architecture :

```text
DashboardPage
↓
DashboardHook
↓
DashboardAPI
↓
Backend
↓
DashboardResponse
↓
Cards / Charts / Tables
```

Les graphiques utilisent uniquement les données fournies par l'API.

NE recalcule pas les KPI métier complexes dans Recharts.

---

# 45. ACCESSIBILITÉ

Prévoir :

- labels ;
- focus visible ;
- navigation clavier ;
- boutons accessibles ;
- messages d'erreur associés aux champs ;
- contrastes corrects ;
- modales correctement gérées ;
- aria-label uniquement lorsqu'il est nécessaire.

---

# 46. PERFORMANCE

Préparer :

- lazy loading des routes ;
- pagination ;
- cache TanStack Query ;
- invalidation ciblée ;
- éviter les re-render inutiles ;
- éviter les appels API redondants ;
- images optimisées ;
- bundle raisonnable.

NE fais pas de micro-optimisations prématurées.

---

# 47. TESTS UNITAIRES

Créer :

```text
src/
...
```

et une structure de tests correspondant aux fonctionnalités.

Tester notamment :

- hooks ;
- schemas ;
- composants critiques ;
- logique d'affichage ;
- permissions ;
- formulaires ;
- erreurs ;
- états loading/empty/error.

Utiliser :

```text
Vitest
```

---

# 48. TESTS E2E

Utiliser :

```text
Playwright
```

Préparer les parcours principaux :

```text
Connexion
↓
Dashboard
↓
Création adhérent
↓
Vérification doublon
↓
Création paiement
↓
Contrôle
↓
Droits
↓
CNPS
↓
Rapport
↓
Audit
```

Prévoir également :

```text
permission refusée
session expirée
erreur API
double soumission
```

---

# 49. TESTS DE SÉCURITÉ FRONTEND

Vérifier :

- aucun secret dans le bundle ;
- aucun token dans localStorage ;
- aucun token dans sessionStorage ;
- aucune PII dans console ;
- aucun `dangerouslySetInnerHTML` non justifié ;
- aucun `eval` ;
- aucune URL externe non validée ;
- aucun endpoint appelé directement hors client API central ;
- aucune permission considérée comme une sécurité backend.

---

# 50. CONFIGURATION ENVIRONNEMENT

Préparer :

```text
.env
.env.development
.env.test
.env.production
```

Mais :

> AUCUN SECRET PRIVÉ NE DOIT ÊTRE EXPOSÉ DANS VITE.

Une variable :

```text
VITE_...
```

est potentiellement visible côté navigateur.

Donc ne jamais mettre :

```text
JWT_PRIVATE_KEY
DATABASE_PASSWORD
API_SECRET
PRIVATE_TOKEN
```

dans le frontend.

---

# 51. DOCUMENTATION FRONTEND

Créer :

```text
docs/
├── architecture/
│   ├── frontend-architecture.md
│   ├── modules.md
│   ├── routing.md
│   ├── state-management.md
│   └── dependencies.md
│
├── api/
│   └── frontend-api.md
│
├── security/
│   └── frontend-security.md
│
└── ui/
    └── design-system.md
```

Documenter :

- architecture ;
- modules ;
- routing ;
- API ;
- auth ;
- permissions ;
- TanStack Query ;
- formulaires ;
- Design System ;
- sécurité ;
- tests.

---

# 52. PRINCIPES KARPATHY

## THINK BEFORE CODING

Avant toute modification importante :

1. comprendre le besoin ;
2. analyser l'existant ;
3. identifier les hypothèses ;
4. ne pas inventer les contrats API ;
5. signaler les incohérences ;
6. choisir la solution la plus simple.

## SIMPLICITY FIRST

Ne crée pas :

```text
GlobalStore
MegaForm
MegaTable
BasePage
BaseHook
GenericCrudService
```

sans nécessité réelle.

## SURGICAL CHANGES

Ne modifie pas inutilement :

- d'autres fonctionnalités ;
- des composants non concernés ;
- le style global ;
- les dépendances ;
- les configurations.

## GOAL-DRIVEN EXECUTION

Chaque étape doit être vérifiable :

```text
npm run typecheck
↓
npm run lint
↓
npm run test
↓
npm run build
↓
npm run e2e
```

---

# 53. RÈGLE ABSOLUE SUR L'API

Le contrat backend est la source de vérité.

Si le contrat OpenAPI réel existe :

```text
/api/v1/openapi
```

utilise-le.

NE crée pas un endpoint frontend simplement parce qu'il "semble logique".

Si un endpoint est absent ou incertain :

```text
[V] API à valider
```

et ne l'invente pas.

---

# 54. PROCÉDURE OBLIGATOIRE

AVANT DE CODER :

## ÉTAPE 1

Inspecte le frontend existant.

Identifie :

- routes ;
- pages ;
- composants ;
- hooks ;
- services API ;
- contextes ;
- types ;
- formulaires ;
- styles ;
- tests ;
- dépendances.

## ÉTAPE 2

Compare avec cette architecture.

Classe :

```text
À conserver
À déplacer
À renommer
À créer
À supprimer
À valider
```

## ÉTAPE 3

Présente l'arborescence finale.

## ÉTAPE 4

Crée les dossiers.

## ÉTAPE 5

Crée les composants et pages structurantes.

## ÉTAPE 6

Crée les API modules.

## ÉTAPE 7

Crée les hooks.

## ÉTAPE 8

Crée les types et schemas.

## ÉTAPE 9

Configure routing/auth/query.

## ÉTAPE 10

Compile et teste.

---

# 55. AVANT CHAQUE MODIFICATION IMPORTANTE

Explique brièvement :

1. ce que tu vas créer ;
2. dans quel module ;
3. dans quel dossier ;
4. pourquoi cette responsabilité appartient à ce dossier ;
5. quelle API elle utilise ;
6. quel hook la pilote ;
7. quelles permissions sont nécessaires.

Puis réalise la modification.

Ne demande pas une confirmation pour chaque fichier trivial lorsque les exigences sont déjà claires.

Pose une question uniquement lorsqu'une décision réellement bloquante ne peut pas être déduite.

---

# 56. CE QUE TU NE DOIS PAS FAIRE

NE PAS :

- utiliser Redux ;
- créer plusieurs clients HTTP ;
- appeler fetch directement dans les composants ;
- mettre des tokens dans localStorage ;
- mettre des données sensibles dans sessionStorage ;
- mettre des secrets dans VITE ;
- dupliquer les règles métier backend ;
- recalculer les droits ;
- recalculer les KPI métier ;
- créer des API fictives ;
- créer des rôles inexistants ;
- créer des intégrations Mobile Money ;
- créer une gestion bancaire ;
- créer des fonctionnalités hors V1 ;
- mettre des requêtes API dans les composants ;
- utiliser `any` sans justification ;
- créer des abstractions génériques inutiles ;
- créer une architecture plus complexe que nécessaire.

---

# 57. CRITÈRE DE RÉUSSITE

Lorsque j'ouvre le frontend, je dois immédiatement savoir :

```text
Où est l'application ?
Où sont les routes ?
Où est l'authentification ?
Où sont les permissions ?
Où est le client HTTP ?
Où sont les API ?
Où sont les pages ?
Où sont les composants ?
Où sont les hooks ?
Où sont les formulaires ?
Où sont les schemas Zod ?
Où sont les types ?
Où sont les dashboards ?
Où sont les paiements ?
Où sont les adhérents ?
Où est CNPS ?
Où sont les droits ?
Où sont les documents ?
Où sont les relances ?
Où sont les rapports ?
Où est l'audit ?
Où est l'administration ?
Où est le Design System ?
Où sont les tests ?
```

La réponse doit être évidente uniquement en parcourant l'arborescence.

---

# 58. DEFINITION OF DONE

La mission est terminée lorsque :

[ ] architecture modulaire créée
[ ] React 19 configuré
[ ] TypeScript strict activé
[ ] Vite configuré
[ ] routing structuré
[ ] layouts structurés
[ ] AuthProvider créé
[ ] ProtectedRoute créé
[ ] PermissionGate créé
[ ] client HTTP unique créé
[ ] API modules structurés
[ ] TanStack Query configuré
[ ] React Hook Form configuré
[ ] Zod configuré
[ ] modules métier créés
[ ] pages principales créées
[ ] composants principaux créés
[ ] hooks métier créés
[ ] types créés
[ ] schemas créés
[ ] permissions intégrées
[ ] Design System centralisé
[ ] gestion loading/error/empty
[ ] pagination prévue
[ ] filtres URL prévus
[ ] sécurité frontend respectée
[ ] aucun token dans localStorage
[ ] aucun secret dans le bundle
[ ] aucune API fictive
[ ] aucun rôle supprimé recréé
[ ] aucun paiement externe intégré
[ ] tests Vitest structurés
[ ] tests Playwright structurés
[ ] documentation créée
[ ] typecheck réussi
[ ] lint réussi
[ ] build réussi
[ ] problèmes éventuels explicitement documentés

---

# 59. PRIORITÉ ABSOLUE

Respecte cet ordre :

1. Compréhension du domaine COSITI
2. Architecture frontend
3. Modules métier
4. Routing
5. Contrats API
6. Authentification
7. Permissions
8. State management
9. Composants
10. Formulaires
11. Sécurité
12. Tests
13. Documentation
14. Design / finition

Ne sacrifie jamais l'architecture pour développer rapidement une page.

---

# 60. PREMIÈRE ACTION

NE COMMENCE PAS directement à coder.

Commence par inspecter le frontend existant.

Puis retourne exactement :

## 1. ANALYSE DE L'EXISTANT

## 2. PROBLÈMES ARCHITECTURAUX IDENTIFIÉS

## 3. ARCHITECTURE FRONTEND CIBLE

## 4. ARBORESCENCE COMPLÈTE

## 5. LISTE DES PAGES

## 6. LISTE DES COMPOSANTS

## 7. LISTE DES HOOKS

## 8. LISTE DES API MODULES

## 9. LISTE DES TYPES

## 10. LISTE DES SCHEMAS ZOD

## 11. MATRICE ROUTES / PERMISSIONS

## 12. MATRICE MODULES / API

## 13. MATRICE DES DÉPENDANCES

## 14. POINTS [A] ET [V]

## 15. PLAN D'IMPLÉMENTATION

Ensuite seulement, matérialise cette architecture dans le projet.

OBJECTIF FINAL :

> Construire un frontend COSITI V1 professionnel, lisible, strictement typé, modulaire, sécurisé, testable et évolutif, parfaitement aligné sur le backend COSITI et sans inventer de fonctionnalités ou de contrats API non validés.
