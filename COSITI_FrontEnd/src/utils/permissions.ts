import { Utilisateur, RoleUtilisateur, TypeAcces } from '../types';

export interface UserPermissions {
  typeAcces: TypeAcces;
  isReadOnly: boolean;
  canConsult: boolean; // Consultation intégrale des tableaux, répertoires, états et alertes
  canRecord: boolean; // Encaisser cotisation, nouvel adhérent, ajouter pièce dossier
  canEditRecords: boolean; // Modifier adhérent / cotisation (avec code 0000)
  canDeleteRecords: boolean; // Supprimer adhérent / cotisation (avec code 0000)
  canImmatriculer: boolean; // Valider immatriculation CNPS
  canManageDossiers: boolean; // Modifier et transmettre les dossiers
  canManageParametres: boolean; // Modifier les paramètres et seuils
  canConfigure: boolean; // Modification des règles métier et coordonnées
  canResetDemo: boolean; // Réinitialisation de la base de démonstration
  canManageUsers: boolean; // Gérer les comptes utilisateurs
  canExportReports: boolean; // Exporter en Excel / PDF
  canClearJournal: boolean; // Purger le journal d'audit
  canManageFinances: boolean; // Dépenses courantes, versements bancaires, frais Orange/MoMo (Espace DAF)
  canManageAgenda: boolean; // Agenda direction, partenaires potentiels, rendez-vous et notes (DG / DGA)
  badgeBgColor: string;
  badgeTextColor: string;
  badgeBorderColor: string;
}

export function getTypeAcces(user?: Utilisateur | null): TypeAcces {
  if (!user) return 'Consultation';
  if (user.typeAcces) {
    if (user.role === 'DAF' && user.typeAcces === 'Administrateur et enregistrement') {
      return 'Administrateur, enregistrement et consultation';
    }
    return user.typeAcces;
  }

  const role = user.role;
  if (role === 'PCA' || role === 'Conseil de Surveillance' || role === 'Agent de consultation') {
    return 'Consultation';
  }
  if (role === 'DG' || role === 'DGA' || role === 'Administrateur') {
    return 'Administrateur et consultation';
  }
  if (role === 'DAF') {
    return 'Administrateur, enregistrement et consultation';
  }
  if (role === 'Caissière & Agent d\'enregistrement' || role === "Agent d'enregistrement") {
    return 'Enregistrement';
  }
  return 'Consultation';
}

export function getUserPermissions(user?: Utilisateur | null): UserPermissions {
  const typeAcces = getTypeAcces(user);

  switch (typeAcces) {
    case 'Administrateur et consultation': // DG et DGA
      return {
        typeAcces,
        isReadOnly: false,
        canConsult: true,
        canRecord: true,
        canEditRecords: true,
        canDeleteRecords: true,
        canImmatriculer: true,
        canManageDossiers: true,
        canManageParametres: true,
        canConfigure: true,
        canResetDemo: true,
        canManageUsers: true,
        canExportReports: true,
        canClearJournal: true,
        canManageFinances: true,
        canManageAgenda: true,
        badgeBgColor: 'bg-purple-100',
        badgeTextColor: 'text-purple-800',
        badgeBorderColor: 'border-purple-200',
      };

    case 'Administrateur, enregistrement et consultation': // DAF (avec consultation et enregistrement)
    case 'Administrateur et enregistrement': // Rétrocompatibilité DAF
      return {
        typeAcces,
        isReadOnly: false,
        canConsult: true,
        canRecord: true,
        canEditRecords: true,
        canDeleteRecords: true,
        canImmatriculer: true,
        canManageDossiers: true,
        canManageParametres: false,
        canConfigure: false,
        canResetDemo: false,
        canManageUsers: false,
        canExportReports: true,
        canClearJournal: false,
        canManageFinances: true,
        canManageAgenda: true,
        badgeBgColor: 'bg-indigo-100',
        badgeTextColor: 'text-indigo-800',
        badgeBorderColor: 'border-indigo-200',
      };

    case 'Enregistrement': // Caissière et agent d'enregistrement
      return {
        typeAcces,
        isReadOnly: false,
        canConsult: true,
        canRecord: true,
        canEditRecords: true,
        canDeleteRecords: false, // Bloqué pour caissière
        canImmatriculer: true,
        canManageDossiers: true,
        canManageParametres: false, // Bloqué pour caissière
        canConfigure: false,
        canResetDemo: false,
        canManageUsers: false, // Bloqué pour caissière
        canExportReports: true,
        canClearJournal: false,
        canManageFinances: false,
        canManageAgenda: false,
        badgeBgColor: 'bg-emerald-100',
        badgeTextColor: 'text-emerald-800',
        badgeBorderColor: 'border-emerald-200',
      };

    case 'Consultation': // PCA, Conseil de Surveillance
    default:
      return {
        typeAcces: 'Consultation',
        isReadOnly: true,
        canConsult: true,
        canRecord: false,
        canEditRecords: false,
        canDeleteRecords: false,
        canImmatriculer: false,
        canManageDossiers: false,
        canManageParametres: false,
        canConfigure: false,
        canResetDemo: false,
        canManageUsers: false,
        canExportReports: true,
        canClearJournal: false,
        canManageFinances: false,
        canManageAgenda: false,
        badgeBgColor: 'bg-amber-100',
        badgeTextColor: 'text-amber-800',
        badgeBorderColor: 'border-amber-200',
      };
  }
}

export interface RoleDescription {
  id: RoleUtilisateur;
  nomRole: string;
  typeAcces: TypeAcces;
  titreOfficiel: string;
  description: string;
  droitsCles: string[];
  restrictions: string[];
  couleurBadge: string;
}

export const ROLES_CONFIG: RoleDescription[] = [
  {
    id: 'PCA',
    nomRole: 'Le PCA',
    typeAcces: 'Consultation',
    titreOfficiel: 'Président du Conseil d\'Administration',
    description: 'Supervision stratégique de la coopérative, contrôle des grands équilibres et consultation des états financiers et des alertes.',
    droitsCles: [
      'Consultation intégrale du Tableau de bord et statistiques',
      'Consultation des répertoires adhérents et cotisations',
      'Accès aux alertes administratives et au journal d\'audit',
      'Téléchargement des rapports financiers et exports Excel',
    ],
    restrictions: [
      'Aucun droit d\'enregistrement ou d\'encaissement direct',
      'Aucune modification ou suppression des données de caisse',
      'Aucune modification des paramètres système',
    ],
    couleurBadge: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    id: 'DG',
    nomRole: 'Le DG et la DGA',
    typeAcces: 'Administrateur et consultation',
    titreOfficiel: 'Directeur Général & Directrice Générale Adjointe',
    description: 'Administration générale, gouvernance exécutive, consultation globale, validation des immatriculations CNPS et gestion des utilisateurs.',
    droitsCles: [
      'Administration et supervision globale de toute la plateforme',
      'Consultation complète de tous les modules et journaux d\'audit',
      'Gestion de l\'agenda de direction, des partenaires potentiels et rendez-vous institutionnels',
      'Enregistrement et suivi des notes spécifiques à retenir et décisions stratégiques',
      'Gestion des comptes utilisateurs et attribution des rôles',
      'Configuration des paramètres, seuils d\'immatriculation et cycles',
      'Validation et suppression avec code de sécurité 0000',
    ],
    restrictions: [
      'Traçabilité obligatoire de toute action administrative dans le journal',
    ],
    couleurBadge: 'bg-purple-100 text-purple-900 border-purple-300',
  },
  {
    id: 'Conseil de Surveillance',
    nomRole: 'Le Conseil de Surveillance',
    typeAcces: 'Consultation',
    titreOfficiel: 'Conseil de Surveillance & Contrôle de Gestion',
    description: 'Organe de contrôle légal et de vérification des opérations. Accès de consultation étendu pour audit, conformité et inspection des comptes.',
    droitsCles: [
      'Inspection et vérification de tous les encaissements journaliers',
      'Consultation du journal d\'audit complet et historique des modifications',
      'Contrôle de l\'avancement des immatriculations CNPS et dossiers',
      'Export des états de synthèse pour rapports de surveillance',
    ],
    restrictions: [
      'Aucun droit de saisie ou d\'encaissement de cotisations',
      'Aucune modification des fiches membres ou versements',
      'Aucune altération des paramètres coopérative',
    ],
    couleurBadge: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  {
    id: 'DAF',
    nomRole: 'Le DAF',
    typeAcces: 'Administrateur, enregistrement et consultation',
    titreOfficiel: 'Directeur Administratif et Financier',
    description: 'Pilotage financier, supervision administrative, consultation et analyse globale, encaissements et enregistrements directs, gestion budgétaire et clôture des cotisations.',
    droitsCles: [
      'Consultation intégrale de tous les états financiers, tableaux de bord et répertoires',
      'Saisie et suivi des dépenses courantes de fonctionnement et charges d\'exploitation',
      'Enregistrement des versements bancaires avec traçabilité des bordereaux',
      'Suivi et déduction des frais de retrait Orange Money et Mobile Money prélevés par les opérateurs',
      'Consultation et audit des pièces justificatives et dossiers sociaux',
      'Enregistrement direct des cotisations et adhésions',
      'Administration financière et suivi de la conformité',
      'Modification et régularisation des versements (avec code 0000)',
      'Validation des dossiers d\'immatriculation et transmission CNPS',
      'Génération et export de tous les états comptables et financiers',
    ],
    restrictions: [
      'Purge du journal d\'audit réservée à la Direction Générale',
    ],
    couleurBadge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  },
  {
    id: 'Caissière & Agent d\'enregistrement',
    nomRole: 'La Caissière et agent d\'enregistrement',
    typeAcces: 'Enregistrement',
    titreOfficiel: 'Caisse centrale & Saisie des adhésions',
    description: 'Saisie opérationnelle quotidienne : adhésion des nouveaux membres, encaissements des cotisations journalières et délivrance des reçus officiels.',
    droitsCles: [
      'Enregistrement des nouveaux adhérents du secteur informel',
      'Encaissement des cotisations (Espèces, Wave, Orange, MTN, Moov)',
      'Impression immédiate des reçus officiels pour les membres',
      'Réception et pointage des pièces des dossiers d\'allocations',
      'Consultation des registres nécessaires à la caisse',
    ],
    restrictions: [
      'Pas d\'accès à la configuration des paramètres système',
      'Pas d\'accès à la gestion des comptes utilisateurs',
      'Suppression d\'adhérents ou versements interdite',
    ],
    couleurBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
];
