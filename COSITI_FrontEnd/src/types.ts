export type Sexe = 'M' | 'F';

export type StatutAdherent = 'Actif' | 'Inactif' | 'Suspendu' | 'Radié';

export type StatutImmatriculation =
  | 'Non immatriculé'
  | 'Éligible (seuil atteint)'
  | 'En cours d\'immatriculation'
  | 'Immatriculé';

export type StatutCotisation = 'À jour' | 'En retard' | 'Sans cotisation';

export type StatutDossierAllocations =
  | 'Dossier non commencé'
  | 'Dossier en cours'
  | 'Dossier incomplet'
  | 'Dossier complet'
  | 'Dossier transmis'
  | 'Dossier traité';

export type ModePaiement =
  | 'Espèces'
  | 'Wave'
  | 'Orange Money'
  | 'MTN MoMo'
  | 'Moov Money'
  | 'Virement bancaire'
  | 'Chèque';

export interface PieceDossier {
  id: string;
  nom: string;
  obligatoire: boolean;
  recu: boolean;
  dateReception?: string;
  fichierRef?: string;
  notes?: string;
}

export interface HistoriqueDossier {
  date: string;
  auteur: string;
  action: string;
}

export interface Adherent {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string;
  lieuNaissance: string;
  cni: string;
  telephone: string;
  adresse: string;
  profession: string;
  dateAdhesion: string;
  statut: StatutAdherent;
  statutImmatriculation: StatutImmatriculation;
  dateImmatriculation?: string;
  numeroCnps?: string;
  observations?: string;
  tarifJournalier: number; // 700 ou 1000 FCFA
  gestionnaireId?: string; // ID du gestionnaire de portefeuille attribué
  gestionnaireNom?: string; // Nom du gestionnaire de portefeuille
  createdAt: string;
  updatedAt: string;
}

export interface GestionnairePortefeuille {
  id: string;
  code: string; // Ex: "GP-01", "GP-02"
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  zoneSecteur: string; // Ex: "Douala - Marché Sandaga", "Yaoundé - Mokolo", "Bafoussam"
  statut: 'Actif' | 'Inactif';
  objectifsRecouvrementMensuel?: number; // FCFA
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cotisation {
  id: string;
  adherentId: string;
  matricule: string;
  adherentNomPrenom: string;
  datePaiement: string; // YYYY-MM-DD
  montant: number;
  modePaiement: ModePaiement;
  reference?: string;
  mois: string; // ex: "Mars" ou "2026-03"
  annee: number;
  agentEnregistreur: string;
  observations?: string;
  createdAt: string;
}

export type BrancheCnps =
  | 'PRESTATIONS_FAMILIALES'
  | 'RISQUES_PROFESSIONNELS'
  | 'PVID';

export interface DossierAllocations {
  id: string;
  adherentId: string;
  matricule: string;
  adherentNomPrenom: string;
  numeroCnps: string;
  branche?: BrancheCnps;
  sousRubriqueOffre?: string;
  montantPrestation?: number;
  dateImmatriculation: string;
  statut: StatutDossierAllocations;
  pieces: PieceDossier[];
  nombreEnfants: number;
  certificatsScolariteFournis: boolean;
  dateDepot?: string;
  dateTransmission?: string;
  dateRelance?: string;
  dateDecision?: string;
  observations?: string;
  historique: HistoriqueDossier[];
  createdAt: string;
  updatedAt: string;
}

export type DossierCnps = DossierAllocations;

export type TypeAlerte =
  | 'NON_A_JOUR'
  | 'SEUIL_15000_ATTEINT'
  | 'VERIFICATION_15_30'
  | 'DOSSIER_ALLOCATIONS';

export interface Alerte {
  id: string;
  type: TypeAlerte;
  titre: string;
  message: string;
  adherentId: string;
  matricule: string;
  nomAdherent: string;
  dateDeclenchement: string;
  niveau: 'info' | 'warning' | 'urgent';
  details: {
    dernierPaiement?: string;
    montantCumule?: number;
    montantRestant?: number;
    joursRetard?: number;
    statutImmatriculation?: string;
    piecesManquantes?: string[];
    dateSeuilAtteint?: string;
    isCycle15or30?: boolean;
  };
  vueOuIgnoree?: boolean;
}

export type TypeAcces =
  | 'Consultation'
  | 'Administrateur et consultation'
  | 'Administrateur et enregistrement'
  | 'Administrateur, enregistrement et consultation'
  | 'Enregistrement';

export type RoleUtilisateur =
  | 'PCA'
  | 'DG'
  | 'DGA'
  | 'Conseil de Surveillance'
  | 'DAF'
  | 'Caissière & Agent d\'enregistrement'
  | 'Administrateur'
  | 'Agent d\'enregistrement'
  | 'Agent de consultation';

export interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  role: RoleUtilisateur;
  typeAcces: TypeAcces;
  titreComplet?: string;
  poste?: string;
  descriptionAcces?: string;
  actif: boolean;
  telephone?: string;
  codePin?: string;
  codeAcces?: string;
  dernierAcces?: string;
}

export interface JournalOperation {
  id: string;
  date: string;
  utilisateur: string;
  role: string;
  typeOperation:
    | 'CREATION_ADHERENT'
    | 'MODIFICATION_ADHERENT'
    | 'SUPPRESSION_ADHERENT'
    | 'ENREGISTREMENT_COTISATION'
    | 'MODIFICATION_COTISATION'
    | 'SUPPRESSION_COTISATION'
    | 'IMMATRICULATION'
    | 'CREATION_DOSSIER'
    | 'MODIFICATION_DOSSIER'
    | 'MODIFICATION_PARAMETRES'
    | 'PURGE_OU_IMPORT_DONNEES'
    | 'MISE_A_JOUR_LOGICIEL'
    | 'CHANGEMENT_UTILISATEUR'
    | 'CREATION_UTILISATEUR'
    | 'MODIFICATION_UTILISATEUR'
    | 'SUPPRESSION_UTILISATEUR'
    | 'ENREGISTREMENT_DEPENSE'
    | 'MODIFICATION_DEPENSE'
    | 'SUPPRESSION_DEPENSE'
    | 'ENREGISTREMENT_VERSEMENT_BANCAIRE'
    | 'MODIFICATION_VERSEMENT_BANCAIRE'
    | 'SUPPRESSION_VERSEMENT_BANCAIRE'
    | 'ENREGISTREMENT_FRAIS_MOBILE_MONEY'
    | 'MODIFICATION_FRAIS_MOBILE_MONEY'
    | 'SUPPRESSION_FRAIS_MOBILE_MONEY'
    | 'CREATION_PARTENAIRE'
    | 'MODIFICATION_PARTENAIRE'
    | 'SUPPRESSION_PARTENAIRE'
    | 'CREATION_RENDEZ_VOUS'
    | 'MODIFICATION_RENDEZ_VOUS'
    | 'SUPPRESSION_RENDEZ_VOUS'
    | 'CREATION_NOTE_DIRECTION'
    | 'MODIFICATION_NOTE_DIRECTION'
    | 'SUPPRESSION_NOTE_DIRECTION'
    | 'CREATION_GESTIONNAIRE'
    | 'MODIFICATION_GESTIONNAIRE'
    | 'SUPPRESSION_GESTIONNAIRE'
    | 'AFFECTATION_PORTEFEUILLE';
  entite: string;
  adherentMatricule?: string;
  adherentNom?: string;
  description: string;
  anciennesInformations?: string;
  nouvellesInformations?: string;
}

export interface ParametresApp {
  nomOrganisation: string;
  sigle: string;
  slogan: string;
  adresse: string;
  telephone: string;
  email: string;
  seuilImmatriculation: number; // 15000 FCFA
  montantsCotisationDefauts: number[]; // [700, 1000]
  joursVerification: number[]; // [15, 30]
  joursVerificationCycle?: number[]; // [15, 30] pour compatibilité
  seuilJoursRetardAlerte: number; // ex: 10 jours
  codeConfirmationSecurite: string; // "0000"
  statutsAdherents: StatutAdherent[];
  statutsDossiers: StatutDossierAllocations[];
  dernierNumeroMatricule: number; // ex: 14 -> next is 15
}

// ==========================================
// MODULE DAF : FINANCES, DÉPENSES & TRÉSORERIE
// ==========================================

export type CategorieDepense =
  | 'Loyer & Charges locatives'
  | 'Fournitures de bureau & Imprimés'
  | 'Carburant & Déplacements'
  | 'Primes & Salaires personnel'
  | 'Communication, Internet & Téléphonie'
  | 'Entretien, Réparations & Équipements'
  | 'Frais bancaires & Tenue de compte'
  | 'Restauration & Réceptions'
  | 'Autre dépense d\'exploitation';

export const CATEGORIES_DEPENSES: CategorieDepense[] = [
  'Fournitures de bureau & Imprimés',
  'Loyer & Charges locatives',
  'Carburant & Déplacements',
  'Primes & Salaires personnel',
  'Communication, Internet & Téléphonie',
  'Entretien, Réparations & Équipements',
  'Frais bancaires & Tenue de compte',
  'Restauration & Réceptions',
  'Autre dépense d\'exploitation',
];

export const BANQUES_PARTENAIRES: string[] = [
  'BICICI',
  'Ecobank Côte d\'Ivoire',
  'SGCI (Société Générale)',
  'BOA CI (Bank of Africa)',
  'NSIA Banque',
  'BNI (Banque Nationale d\'Investissement)',
  'Coris Bank',
  'Autre institution bancaire',
];

export const OPERATEURS_MOBILE: OperateurMobile[] = [
  'Orange Money',
  'MTN MoMo',
  'Moov Money',
  'Wave',
];

export interface DepenseCourante {
  id: string;
  date: string; // YYYY-MM-DD
  categorie: CategorieDepense;
  motif: string;
  montant: number; // en FCFA
  modePaiement: 'Espèces / Caisse' | 'Virement bancaire' | 'Chèque' | 'Orange Money' | 'Wave' | 'MTN MoMo' | 'Moov Money';
  beneficiaire: string;
  numeroPiece: string; // Facture, Reçu, Bon de caisse
  statut: 'Payé' | 'En attente';
  enregistrePar: string;
  observations?: string;
  createdAt: string;
}

export interface VersementBancaire {
  id: string;
  date: string; // YYYY-MM-DD
  banque: string; // ex: 'Ecobank Côte d\'Ivoire', 'BOA CI', etc.
  numeroCompte?: string;
  numeroBordereau: string;
  montant: number; // en FCFA
  sourceFonds: 'Recettes Cotisations Adhérents' | 'Retraits Mobile Money' | 'Fonds propres / Apport' | 'Autre';
  deposant: string;
  enregistrePar: string;
  statut: 'Validé' | 'En attente de relevé';
  observations?: string;
  createdAt: string;
}

export type OperateurMobile = 'Orange Money' | 'MTN MoMo' | 'Moov Money' | 'Wave';

export type TypeFraisMobileMoney =
  | 'Frais de retrait marchand'
  | 'Commission prélevée sur encaissement'
  | 'Frais de transfert opérateur'
  | 'Frais de compte pro';

export interface FraisMobileMoney {
  id: string;
  date: string; // YYYY-MM-DD
  operateur: OperateurMobile;
  typeFrais: TypeFraisMobileMoney;
  montantTransaction: number; // Montant brut collecté ou retiré
  fraisPreleves: number; // Montant des frais prélevés par l'opérateur en FCFA
  montantNet: number; // montantTransaction - fraisPreleves
  referenceTransaction: string; // N° SMS / Réf transaction opérateur
  cotisationIdLiee?: string;
  adherentConcerne?: string;
  enregistrePar: string;
  observations?: string;
  createdAt: string;
}

// ==========================================
// MODULE DIRECTION (DG & DGA) : AGENDA, PARTENAIRES & NOTES
// ==========================================

export type SecteurPartenaire =
  | 'Institution publique / Ministère'
  | 'Caisse Sociale (CNPS)'
  | 'Banque & Microfinance'
  | 'Opérateur Télécom & Mobile Money'
  | 'Organisation Professionnelle / Syndicat'
  | 'Filière Agricole & Coopérative'
  | 'Bailleur de fonds / ONG'
  | 'Partenaire Technique & Logistique'
  | 'Autre';

export const SECTEURS_PARTENAIRES: SecteurPartenaire[] = [
  'Organisation Professionnelle / Syndicat',
  'Institution publique / Ministère',
  'Caisse Sociale (CNPS)',
  'Banque & Microfinance',
  'Opérateur Télécom & Mobile Money',
  'Filière Agricole & Coopérative',
  'Bailleur de fonds / ONG',
  'Partenaire Technique & Logistique',
  'Autre',
];

export type StatutPartenariat =
  | 'Prospection préliminaire'
  | 'Premier contact établi'
  | 'Négociations en cours'
  | 'Accord de principe'
  | 'Convention signée / Actif'
  | 'En veille / Suspendu';

export const STATUTS_PARTENARIAT: StatutPartenariat[] = [
  'Prospection préliminaire',
  'Premier contact établi',
  'Négociations en cours',
  'Accord de principe',
  'Convention signée / Actif',
  'En veille / Suspendu',
];

export type DegrePriorite = 'Stratégique (P1)' | 'Prioritaire (P2)' | 'Standard (P3)';

export interface PartenaireDirection {
  id: string;
  nomOrganisation: string;
  sigle?: string;
  secteur: SecteurPartenaire;
  personneContact: string;
  titreContact: string;
  telephone: string;
  email?: string;
  adresse?: string;
  statut: StatutPartenariat;
  priorite: DegrePriorite;
  potentielSynergie: string; // Objectifs attendus / projets communs
  datePremierContact?: string;
  enregistrePar: string;
  notesHistorique?: string;
  createdAt: string;
  updatedAt: string;
}

export type StatutRendezVous = 'Prévu' | 'Confirmé' | 'Tenu' | 'Reporté' | 'Annulé';

export const STATUTS_RENDEZ_VOUS: StatutRendezVous[] = [
  'Prévu',
  'Confirmé',
  'Tenu',
  'Reporté',
  'Annulé',
];

export type ModaliteRdv =
  | 'Siège COSITI'
  | 'Bureaux du partenaire'
  | 'Visioconférence'
  | 'Appel téléphonique'
  | 'Sur le terrain';

export interface RendezVousDirection {
  id: string;
  titre: string; // Objet du rendez-vous
  partenaireId?: string;
  nomInterlocuteurOuPartenaire: string;
  date: string; // YYYY-MM-DD
  heure: string; // HH:MM
  dureeEstimee?: string; // ex: '1h00', '45 min'
  modalite: ModaliteRdv;
  lieuPrecision?: string; // Adresse ou lien visio
  participantsDirection: string; // ex: 'DG (M. KONÉ)', 'DGA (Mme DIABATÉ)', 'DG & DGA', etc.
  responsablePrincipal: 'DG' | 'DGA' | 'DAF';
  statut: StatutRendezVous;
  ordreDuJour: string;
  compteRendu?: string; // Notes après réunion
  engagementsEtActions?: string; // Qui fait quoi, prochaines étapes
  dateRappel?: string;
  enregistrePar: string;
  createdAt: string;
  updatedAt: string;
}

export type CategorieNoteDirection =
  | 'Stratégie & Partenariats'
  | 'Négociation & Accords'
  | 'Gouvernance & Décisions'
  | 'Vigilance Financière & DAF'
  | 'Réglementation & CNPS'
  | 'Mémorandum interne Direction';

export const CATEGORIES_NOTES_DIRECTION: CategorieNoteDirection[] = [
  'Stratégie & Partenariats',
  'Négociation & Accords',
  'Gouvernance & Décisions',
  'Vigilance Financière & DAF',
  'Réglementation & CNPS',
  'Mémorandum interne Direction',
];

export interface NoteSpecifiqueDirection {
  id: string;
  titre: string;
  date: string; // YYYY-MM-DD
  categorie: CategorieNoteDirection;
  partenaireLie?: string;
  rendezVousLie?: string;
  contenu: string;
  pointsCles: string[]; // Points essentiels à retenir
  prochaineEcheance?: string;
  niveauConfidentialite: 'Confidentiel Direction (DG / DGA)' | 'Direction Élargie';
  auteur: string; // Nom ou rôle de l'auteur
  createdAt: string;
  updatedAt: string;
}

