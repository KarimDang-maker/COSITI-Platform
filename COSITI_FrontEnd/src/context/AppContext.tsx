import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_ADHERENTS,
  INITIAL_COTISATIONS,
  INITIAL_DOSSIERS,
  INITIAL_JOURNAL,
  INITIAL_PARAMETRES,
  INITIAL_UTILISATEURS,
  INITIAL_DEPENSES,
  INITIAL_VERSEMENTS,
  INITIAL_FRAIS_MOBILE_MONEY,
  INITIAL_PARTENAIRES,
  INITIAL_RENDEZ_VOUS,
  INITIAL_NOTES_DIRECTION,
  INITIAL_GESTIONNAIRES,
  DEFAULT_PIECES_DOSSIER,
} from '../data/mockData';
import {
  Adherent,
  Alerte,
  BrancheCnps,
  Cotisation,
  DossierAllocations,
  JournalOperation,
  ParametresApp,
  Utilisateur,
  DepenseCourante,
  VersementBancaire,
  FraisMobileMoney,
  PartenaireDirection,
  RendezVousDirection,
  NoteSpecifiqueDirection,
  GestionnairePortefeuille,
} from '../types';
import { generateAlerts, generateNextMatricule } from '../utils/helpers';
import { getPiecesForOffre } from '../data/cnpsBranches';

interface AppContextType {
  adherents: Adherent[];
  cotisations: Cotisation[];
  dossiers: DossierAllocations[];
  journal: JournalOperation[];
  parametres: ParametresApp;
  utilisateurs: Utilisateur[];
  currentUser: Utilisateur;
  activeTab: string;
  selectedAdherentId: string | null;
  globalSearch: string;
  alerts: Alerte[];

  // Gestionnaires de Portefeuille
  gestionnaires: GestionnairePortefeuille[];
  addGestionnaire: (data: Omit<GestionnairePortefeuille, 'id' | 'createdAt' | 'updatedAt'>) => {
    success: boolean;
    gestionnaire?: GestionnairePortefeuille;
    error?: string;
  };
  updateGestionnaire: (id: string, data: Partial<GestionnairePortefeuille>) => {
    success: boolean;
    error?: string;
  };
  deleteGestionnaire: (id: string) => { success: boolean; error?: string };
  assignerPortefeuille: (adherentId: string, gestionnaireId: string | null) => {
    success: boolean;
    error?: string;
  };

  // Finances & DAF
  depenses: DepenseCourante[];
  versements: VersementBancaire[];
  fraisMobileMoney: FraisMobileMoney[];

  // Direction & Agenda (DG & DGA)
  partenaires: PartenaireDirection[];
  rendezVous: RendezVousDirection[];
  notesDirection: NoteSpecifiqueDirection[];

  // Setters de navigation
  setActiveTab: (tab: string) => void;
  setSelectedAdherentId: (id: string | null) => void;
  setGlobalSearch: (term: string) => void;
  setCurrentUser: (user: Utilisateur) => void;
  switchUserWithCode: (targetUser: Utilisateur, code: string) => { success: boolean; error?: string };

  // Actions métier Adhérents & Cotisations
  addAdherent: (data: Omit<Adherent, 'id' | 'matricule' | 'createdAt' | 'updatedAt'>) => {
    success: boolean;
    adherent?: Adherent;
    error?: string;
  };
  updateAdherent: (
    id: string,
    data: Partial<Adherent>,
    pinCode: string
  ) => { success: boolean; error?: string };
  deleteAdherent: (id: string, pinCode: string) => { success: boolean; error?: string };

  addCotisation: (data: Omit<Cotisation, 'id' | 'createdAt'>) => {
    success: boolean;
    cotisation?: Cotisation;
    error?: string;
  };
  updateCotisation: (
    id: string,
    data: Partial<Cotisation>,
    pinCode: string
  ) => { success: boolean; error?: string };
  deleteCotisation: (id: string, pinCode: string) => { success: boolean; error?: string };

  immatriculerAdherent: (
    adherentId: string,
    numeroCnps: string,
    dateImmatriculation: string,
    observations?: string
  ) => { success: boolean; error?: string };

  updateDossier: (
    dossierId: string,
    data: Partial<DossierAllocations>,
    noteAction?: string
  ) => { success: boolean; error?: string };
  createDossierForAdherent: (
    adherentId: string,
    branche?: BrancheCnps,
    sousRubriqueOffre?: string
  ) => { success: boolean; error?: string };

  // Actions Finances DAF
  addDepense: (data: Omit<DepenseCourante, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  updateDepense: (id: string, data: Partial<DepenseCourante>) => { success: boolean; error?: string };
  deleteDepense: (id: string, pinCode?: string) => { success: boolean; error?: string };

  addVersement: (data: Omit<VersementBancaire, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  updateVersement: (id: string, data: Partial<VersementBancaire>) => { success: boolean; error?: string };
  deleteVersement: (id: string, pinCode?: string) => { success: boolean; error?: string };

  addFraisMobileMoney: (data: Omit<FraisMobileMoney, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  updateFraisMobileMoney: (id: string, data: Partial<FraisMobileMoney>) => { success: boolean; error?: string };
  deleteFraisMobileMoney: (id: string, pinCode?: string) => { success: boolean; error?: string };

  // Actions Direction DG/DGA (Partenaires, Agenda, Notes)
  addPartenaire: (data: Omit<PartenaireDirection, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  updatePartenaire: (id: string, data: Partial<PartenaireDirection>) => { success: boolean; error?: string };
  deletePartenaire: (id: string) => { success: boolean; error?: string };

  addRendezVous: (data: Omit<RendezVousDirection, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  updateRendezVous: (id: string, data: Partial<RendezVousDirection>) => { success: boolean; error?: string };
  deleteRendezVous: (id: string) => { success: boolean; error?: string };

  addNoteDirection: (data: Omit<NoteSpecifiqueDirection, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  updateNoteDirection: (id: string, data: Partial<NoteSpecifiqueDirection>) => { success: boolean; error?: string };
  deleteNoteDirection: (id: string) => { success: boolean; error?: string };

  updateParametres: (newParams: Partial<ParametresApp>) => void;
  addUtilisateur: (user: Omit<Utilisateur, 'id'>) => void;
  updateUtilisateur: (id: string, data: Partial<Utilisateur>) => void;
  deleteUtilisateur: (id: string) => void;
  nouveauParametrageUtilisateurs: (users: Utilisateur[]) => { success: boolean; error?: string };

  resetToDemoData: () => void;
  wipeAllDataForUpdate: (password: string) => { success: boolean; error?: string };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ADHERENTS: 'cositi_adherents_v1',
  COTISATIONS: 'cositi_cotisations_v1',
  DOSSIERS: 'cositi_dossiers_v1',
  JOURNAL: 'cositi_journal_v1',
  PARAMETRES: 'cositi_parametres_v1',
  UTILISATEURS: 'cositi_utilisateurs_v1',
  CURRENT_USER: 'cositi_current_user_v1',
  DEPENSES: 'cositi_depenses_v1',
  VERSEMENTS: 'cositi_versements_v1',
  FRAIS_MOBILE_MONEY: 'cositi_frais_mobile_money_v1',
  PARTENAIRES: 'cositi_partenaires_v1',
  RENDEZ_VOUS: 'cositi_rendez_vous_v1',
  NOTES_DIRECTION: 'cositi_notes_direction_v1',
  GESTIONNAIRES: 'cositi_gestionnaires_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Chargement localStorage ou init mock
  const [adherents, setAdherents] = useState<Adherent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADHERENTS);
    return saved ? JSON.parse(saved) : INITIAL_ADHERENTS;
  });

  const [cotisations, setCotisations] = useState<Cotisation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COTISATIONS);
    return saved ? JSON.parse(saved) : INITIAL_COTISATIONS;
  });

  const [dossiers, setDossiers] = useState<DossierAllocations[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DOSSIERS);
    return saved ? JSON.parse(saved) : INITIAL_DOSSIERS;
  });

  const [journal, setJournal] = useState<JournalOperation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.JOURNAL);
    return saved ? JSON.parse(saved) : INITIAL_JOURNAL;
  });

  const [parametres, setParametres] = useState<ParametresApp>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARAMETRES);
    return saved ? JSON.parse(saved) : INITIAL_PARAMETRES;
  });

  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.UTILISATEURS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((u) => u.role === 'DG' || u.role === 'PCA' || u.role === 'DAF')) {
          return parsed.map((u: Utilisateur) =>
            u.role === 'DAF' && u.typeAcces !== 'Administrateur, enregistrement et consultation'
              ? {
                  ...u,
                  typeAcces: 'Administrateur, enregistrement et consultation' as const,
                  descriptionAcces: 'Gestion financière, enregistrement des cotisations, consultation globale et administration',
                }
              : u
          );
        }
      } catch (e) {
        console.error('Erreur parsing utilisateurs:', e);
      }
    }
    return INITIAL_UTILISATEURS;
  });

  const [currentUser, setCurrentUser] = useState<Utilisateur>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'DG' || parsed.role === 'PCA' || parsed.role === 'DAF' || parsed.role === 'Conseil de Surveillance' || parsed.role === 'Caissière & Agent d\'enregistrement' || parsed.role === 'DGA')) {
          if (parsed.role === 'DAF' && parsed.typeAcces !== 'Administrateur, enregistrement et consultation') {
            return {
              ...parsed,
              typeAcces: 'Administrateur, enregistrement et consultation' as const,
              descriptionAcces: 'Gestion financière, enregistrement des cotisations, consultation globale et administration',
            };
          }
          return parsed;
        }
      } catch (e) {
        console.error('Erreur parsing currentUser:', e);
      }
    }
    return INITIAL_UTILISATEURS[0];
  });

  // Finances & Trésorerie DAF
  const [depenses, setDepenses] = useState<DepenseCourante[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEPENSES);
    return saved ? JSON.parse(saved) : INITIAL_DEPENSES;
  });

  const [versements, setVersements] = useState<VersementBancaire[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VERSEMENTS);
    return saved ? JSON.parse(saved) : INITIAL_VERSEMENTS;
  });

  const [fraisMobileMoney, setFraisMobileMoney] = useState<FraisMobileMoney[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FRAIS_MOBILE_MONEY);
    return saved ? JSON.parse(saved) : INITIAL_FRAIS_MOBILE_MONEY;
  });

  // Agenda & Direction DG/DGA
  const [partenaires, setPartenaires] = useState<PartenaireDirection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARTENAIRES);
    return saved ? JSON.parse(saved) : INITIAL_PARTENAIRES;
  });

  const [rendezVous, setRendezVous] = useState<RendezVousDirection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RENDEZ_VOUS);
    return saved ? JSON.parse(saved) : INITIAL_RENDEZ_VOUS;
  });

  const [notesDirection, setNotesDirection] = useState<NoteSpecifiqueDirection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTES_DIRECTION);
    return saved ? JSON.parse(saved) : INITIAL_NOTES_DIRECTION;
  });

  const [gestionnaires, setGestionnaires] = useState<GestionnairePortefeuille[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GESTIONNAIRES);
    return saved ? JSON.parse(saved) : INITIAL_GESTIONNAIRES;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedAdherentId, setSelectedAdherentId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Synchronisation LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADHERENTS, JSON.stringify(adherents));
  }, [adherents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COTISATIONS, JSON.stringify(cotisations));
  }, [cotisations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DOSSIERS, JSON.stringify(dossiers));
  }, [dossiers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(journal));
  }, [journal]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARAMETRES, JSON.stringify(parametres));
  }, [parametres]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify(utilisateurs));
  }, [utilisateurs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEPENSES, JSON.stringify(depenses));
  }, [depenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VERSEMENTS, JSON.stringify(versements));
  }, [versements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FRAIS_MOBILE_MONEY, JSON.stringify(fraisMobileMoney));
  }, [fraisMobileMoney]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARTENAIRES, JSON.stringify(partenaires));
  }, [partenaires]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RENDEZ_VOUS, JSON.stringify(rendezVous));
  }, [rendezVous]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTES_DIRECTION, JSON.stringify(notesDirection));
  }, [notesDirection]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GESTIONNAIRES, JSON.stringify(gestionnaires));
  }, [gestionnaires]);

  // Alertes calculées en temps réel
  const alerts = useMemo(() => {
    return generateAlerts(adherents, cotisations, dossiers, parametres);
  }, [adherents, cotisations, dossiers, parametres]);

  // Ajouter un adhérent avec génération matricule unique COSITI-xxxx
  const addAdherent = (data: Omit<Adherent, 'id' | 'matricule' | 'createdAt' | 'updatedAt'>) => {
    const { matricule, sequence } = generateNextMatricule(parametres.dernierNumeroMatricule);

    const now = new Date().toISOString();
    const hasCnpsNumber = Boolean(data.numeroCnps && data.numeroCnps.trim() !== '');

    let gestNom = data.gestionnaireNom;
    if (data.gestionnaireId && !gestNom) {
      const g = gestionnaires.find((item) => item.id === data.gestionnaireId);
      if (g) gestNom = `${g.nom} ${g.prenom} (${g.code})`;
    }

    const newAdherent: Adherent = {
      ...data,
      id: `adh-${Date.now()}`,
      matricule,
      gestionnaireId: data.gestionnaireId || undefined,
      gestionnaireNom: gestNom,
      statutImmatriculation: hasCnpsNumber ? 'Immatriculé' : data.statutImmatriculation || 'Non immatriculé',
      dateImmatriculation: hasCnpsNumber ? (data.dateImmatriculation || now.slice(0, 10)) : data.dateImmatriculation,
      createdAt: now,
      updatedAt: now,
    };

    setAdherents((prev) => [newAdherent, ...prev]);
    setParametres((prev) => ({
      ...prev,
      dernierNumeroMatricule: sequence,
    }));

    // Si le numéro CNPS est renseigné par l'agent enregistreur dès la création, on crée le dossier CNPS
    if (hasCnpsNumber) {
      const piecesTemplate = getPiecesForOffre('Allocations Familiales (Enfants scolarisés & à charge)');
      const initialDossier: DossierAllocations = {
        id: `dos-${Date.now()}`,
        adherentId: newAdherent.id,
        matricule: newAdherent.matricule,
        adherentNomPrenom: `${newAdherent.nom} ${newAdherent.prenom}`,
        numeroCnps: newAdherent.numeroCnps!,
        branche: 'PRESTATIONS_FAMILIALES',
        sousRubriqueOffre: 'Allocations Familiales (Enfants scolarisés & à charge)',
        dateImmatriculation: newAdherent.dateImmatriculation || now.slice(0, 10),
        statut: 'Dossier non commencé',
        pieces: piecesTemplate.map((p) => ({ ...p, recu: false })),
        nombreEnfants: 0,
        certificatsScolariteFournis: false,
        historique: [
          {
            date: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
            auteur: currentUser.nom,
            action: `Création automatique du dossier CNPS suite à la saisie du N° CNPS par l'agent enregistreur`,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      setDossiers((prev) => [initialDossier, ...prev]);
    }

    // Journal
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'CREATION_ADHERENT',
      entite: 'Adhérent',
      adherentMatricule: matricule,
      adherentNom: `${newAdherent.nom} ${newAdherent.prenom}`,
      description: `Création du nouvel adhérent ${matricule} (${newAdherent.nom} ${newAdherent.prenom})${hasCnpsNumber ? ` avec N° CNPS ${newAdherent.numeroCnps} renseigné par l'agent enregistreur` : ''}`,
      nouvellesInformations: `Profession: ${newAdherent.profession}, Tél: ${newAdherent.telephone}, N° CNPS: ${newAdherent.numeroCnps || 'Non renseigné'}`,
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true, adherent: newAdherent };
  };

  // Modifier un adhérent (Code de confirmation 1111 ou 0000)
  const updateAdherent = (id: string, data: Partial<Adherent>, pinCode: string) => {
    const isPinValid =
      pinCode === '1111' ||
      pinCode === '0000' ||
      pinCode === parametres.codeConfirmationSecurite;

    if (!isPinValid) {
      return { success: false, error: 'Code de confirmation incorrect. Code requis : 1111.' };
    }

    const currentAdh = adherents.find((a) => a.id === id);
    if (!currentAdh) {
      return { success: false, error: 'Adhérent introuvable.' };
    }

    // Le matricule NE DOIT JAMAIS CHANGER
    const sanitizedData = { ...data };
    delete sanitizedData.matricule;
    delete sanitizedData.id;

    const hasNewCnps = Boolean(sanitizedData.numeroCnps && sanitizedData.numeroCnps.trim() !== '');

    let gestNom = sanitizedData.gestionnaireNom;
    if (sanitizedData.gestionnaireId !== undefined) {
      if (sanitizedData.gestionnaireId) {
        const g = gestionnaires.find((item) => item.id === sanitizedData.gestionnaireId);
        gestNom = g ? `${g.nom} ${g.prenom} (${g.code})` : sanitizedData.gestionnaireNom;
      } else {
        gestNom = undefined;
        sanitizedData.gestionnaireId = undefined;
      }
    }

    const updatedAdh: Adherent = {
      ...currentAdh,
      ...sanitizedData,
      gestionnaireNom: sanitizedData.gestionnaireId !== undefined ? gestNom : currentAdh.gestionnaireNom,
      statutImmatriculation: hasNewCnps ? 'Immatriculé' : (sanitizedData.statutImmatriculation || currentAdh.statutImmatriculation),
      dateImmatriculation: hasNewCnps && !currentAdh.dateImmatriculation ? new Date().toISOString().slice(0, 10) : (sanitizedData.dateImmatriculation || currentAdh.dateImmatriculation),
      updatedAt: new Date().toISOString(),
    };

    setAdherents((prev) => prev.map((a) => (a.id === id ? updatedAdh : a)));

    // Journal des modifications
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_ADHERENT',
      entite: 'Adhérent',
      adherentMatricule: currentAdh.matricule,
      adherentNom: `${updatedAdh.nom} ${updatedAdh.prenom}`,
      description: `Mise à jour des informations de l'adhérent ${currentAdh.matricule} (validé par code)`,
      anciennesInformations: JSON.stringify({
        nom: currentAdh.nom,
        prenom: currentAdh.prenom,
        tel: currentAdh.telephone,
        statut: currentAdh.statut,
        statutImmatriculation: currentAdh.statutImmatriculation,
        numeroCnps: currentAdh.numeroCnps,
      }),
      nouvellesInformations: JSON.stringify({
        nom: updatedAdh.nom,
        prenom: updatedAdh.prenom,
        tel: updatedAdh.telephone,
        statut: updatedAdh.statut,
        statutImmatriculation: updatedAdh.statutImmatriculation,
        numeroCnps: updatedAdh.numeroCnps,
      }),
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true };
  };

  // Supprimer un adhérent (Code 1111 ou 0000)
  const deleteAdherent = (id: string, pinCode: string) => {
    const isPinValid =
      pinCode === '1111' ||
      pinCode === '0000' ||
      pinCode === parametres.codeConfirmationSecurite;

    if (!isPinValid) {
      return { success: false, error: 'Code de confirmation incorrect. Code requis : 1111.' };
    }

    const currentAdh = adherents.find((a) => a.id === id);
    if (!currentAdh) {
      return { success: false, error: 'Adhérent introuvable.' };
    }

    setAdherents((prev) => prev.filter((a) => a.id !== id));

    // Journal
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'SUPPRESSION_ADHERENT',
      entite: 'Adhérent',
      adherentMatricule: currentAdh.matricule,
      adherentNom: `${currentAdh.nom} ${currentAdh.prenom}`,
      description: `Suppression définitive de l'adhérent ${currentAdh.matricule} (${currentAdh.nom} ${currentAdh.prenom})`,
      anciennesInformations: `Matricule: ${currentAdh.matricule}, CNI: ${currentAdh.cni}, Tél: ${currentAdh.telephone}`,
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true };
  };

  // Enregistrer une cotisation
  const addCotisation = (data: Omit<Cotisation, 'id' | 'createdAt'>) => {
    const newCotisation: Cotisation = {
      ...data,
      id: `cot-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setCotisations((prev) => [newCotisation, ...prev]);

    // Vérifier si le cumul atteint le seuil d'immatriculation (15 000 FCFA)
    const targetAdherent = adherents.find(
      (a) => a.id === data.adherentId || a.matricule === data.matricule
    );

    if (targetAdherent) {
      const existingTotal = cotisations
        .filter((c) => c.adherentId === targetAdherent.id || c.matricule === targetAdherent.matricule)
        .reduce((acc, c) => acc + c.montant, 0);

      const newTotal = existingTotal + data.montant;
      const seuil = parametres.seuilImmatriculation || 15000;

      if (newTotal >= seuil && targetAdherent.statutImmatriculation === 'Non immatriculé') {
        // Mettre à jour automatiquement le statut en "Éligible (seuil atteint)"
        setAdherents((prev) =>
          prev.map((a) =>
            a.id === targetAdherent.id
              ? { ...a, statutImmatriculation: 'Éligible (seuil atteint)', updatedAt: new Date().toISOString() }
              : a
          )
        );
      }
    }

    // Journal
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'ENREGISTREMENT_COTISATION',
      entite: 'Cotisation',
      adherentMatricule: data.matricule,
      adherentNom: data.adherentNomPrenom,
      description: `Encaissement de ${data.montant} FCFA (${data.modePaiement}) pour ${data.matricule}`,
      nouvellesInformations: `Mois: ${data.mois} ${data.annee}, Réf: ${data.reference || 'N/A'}, Agent: ${data.agentEnregistreur}`,
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true, cotisation: newCotisation };
  };

  // Modifier une cotisation (Code obligatoire 1111 ou 0000)
  const updateCotisation = (id: string, data: Partial<Cotisation>, pinCode: string) => {
    const isPinValid =
      pinCode === '1111' ||
      pinCode === '0000' ||
      pinCode === parametres.codeConfirmationSecurite;

    if (!isPinValid) {
      return { success: false, error: 'Code de confirmation incorrect. Code requis : 1111.' };
    }

    const currentCot = cotisations.find((c) => c.id === id);
    if (!currentCot) {
      return { success: false, error: 'Cotisation introuvable.' };
    }

    const updatedCot = { ...currentCot, ...data };
    setCotisations((prev) => prev.map((c) => (c.id === id ? updatedCot : c)));

    // Journal
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_COTISATION',
      entite: 'Cotisation',
      adherentMatricule: currentCot.matricule,
      adherentNom: currentCot.adherentNomPrenom,
      description: `Modification d'une cotisation de ${currentCot.montant} FCFA sur ${currentCot.matricule} (validé par code)`,
      anciennesInformations: `Montant: ${currentCot.montant}, Mode: ${currentCot.modePaiement}, Date: ${currentCot.datePaiement}`,
      nouvellesInformations: `Montant: ${updatedCot.montant}, Mode: ${updatedCot.modePaiement}, Date: ${updatedCot.datePaiement}`,
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true };
  };

  // Supprimer une cotisation (Code 1111 ou 0000)
  const deleteCotisation = (id: string, pinCode: string) => {
    const isPinValid =
      pinCode === '1111' ||
      pinCode === '0000' ||
      pinCode === parametres.codeConfirmationSecurite;

    if (!isPinValid) {
      return { success: false, error: 'Code de confirmation incorrect. Code requis : 1111.' };
    }

    const currentCot = cotisations.find((c) => c.id === id);
    if (!currentCot) {
      return { success: false, error: 'Cotisation introuvable.' };
    }

    setCotisations((prev) => prev.filter((c) => c.id !== id));
    if (!currentCot) {
      return { success: false, error: 'Cotisation introuvable.' };
    }

    setCotisations((prev) => prev.filter((c) => c.id !== id));

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'SUPPRESSION_COTISATION',
      entite: 'Cotisation',
      adherentMatricule: currentCot.matricule,
      adherentNom: currentCot.adherentNomPrenom,
      description: `Suppression d'une cotisation de ${currentCot.montant} FCFA sur ${currentCot.matricule}`,
      anciennesInformations: `Réf: ${currentCot.reference || 'N/A'}, Date: ${currentCot.datePaiement}, Montant: ${currentCot.montant}`,
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true };
  };

  // Immatriculer un adhérent
  const immatriculerAdherent = (
    adherentId: string,
    numeroCnps: string,
    dateImmatriculation: string,
    observations?: string
  ) => {
    const targetAdh = adherents.find((a) => a.id === adherentId);
    if (!targetAdh) return { success: false, error: 'Adhérent introuvable' };

    setAdherents((prev) =>
      prev.map((a) =>
        a.id === adherentId
          ? {
              ...a,
              statutImmatriculation: 'Immatriculé',
              numeroCnps,
              dateImmatriculation,
              observations: observations || a.observations,
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );

    // Si aucun dossier d'allocations n'existe encore, on en initialise un automatiquement
    const existingDossier = dossiers.find(
      (d) => d.adherentId === adherentId || d.matricule === targetAdh.matricule
    );
    if (!existingDossier) {
      const newDossier: DossierAllocations = {
        id: `dos-${Date.now()}`,
        adherentId: targetAdh.id,
        matricule: targetAdh.matricule,
        adherentNomPrenom: `${targetAdh.nom} ${targetAdh.prenom}`,
        numeroCnps,
        dateImmatriculation,
        statut: 'Dossier non commencé',
        pieces: DEFAULT_PIECES_DOSSIER.map((p) => ({
          ...p,
          recu: false,
        })),
        nombreEnfants: 0,
        certificatsScolariteFournis: false,
        historique: [
          {
            date: new Intl.DateTimeFormat('fr-FR', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date()),
            auteur: currentUser.nom,
            action: `Création du dossier suite à l'immatriculation CNPS (${numeroCnps})`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDossiers((prev) => [newDossier, ...prev]);
    }

    // Journal
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'IMMATRICULATION',
      entite: 'Adhérent',
      adherentMatricule: targetAdh.matricule,
      adherentNom: `${targetAdh.nom} ${targetAdh.prenom}`,
      description: `Immatriculation CNPS validée pour ${targetAdh.matricule} : N° ${numeroCnps}`,
      nouvellesInformations: `N° CNPS: ${numeroCnps}, Date: ${dateImmatriculation}`,
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true };
  };

  // Mettre à jour un dossier d'allocations familiales
  const updateDossier = (
    dossierId: string,
    data: Partial<DossierAllocations>,
    noteAction = 'Mise à jour des informations du dossier'
  ) => {
    const currentDossier = dossiers.find((d) => d.id === dossierId);
    if (!currentDossier) return { success: false, error: 'Dossier introuvable' };

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const newHistoryItem = {
      date: dateFormatted,
      auteur: currentUser.nom,
      action: noteAction,
    };

    const updated = {
      ...currentDossier,
      ...data,
      historique: [newHistoryItem, ...currentDossier.historique],
      updatedAt: new Date().toISOString(),
    };

    setDossiers((prev) => prev.map((d) => (d.id === dossierId ? updated : d)));

    // Journal
    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_DOSSIER',
      entite: 'Dossier Allocations',
      adherentMatricule: currentDossier.matricule,
      adherentNom: currentDossier.adherentNomPrenom,
      description: `Mise à jour dossier allocations pour ${currentDossier.matricule}: ${noteAction}`,
      nouvellesInformations: `Statut: ${updated.statut}, Enfants: ${updated.nombreEnfants}`,
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true };
  };

  // Création explicite de dossier CNPS (avec sélection de la branche et sous-rubrique/offre)
  const createDossierForAdherent = (
    adherentId: string,
    branche: BrancheCnps = 'PRESTATIONS_FAMILIALES',
    sousRubriqueOffre: string = 'Allocations Familiales (Enfants scolarisés & à charge)'
  ) => {
    const adh = adherents.find((a) => a.id === adherentId);
    if (!adh) return { success: false, error: 'Adhérent introuvable' };

    const piecesTemplate = getPiecesForOffre(sousRubriqueOffre);

    const newDossier: DossierAllocations = {
      id: `dos-${Date.now()}`,
      adherentId: adh.id,
      matricule: adh.matricule,
      adherentNomPrenom: `${adh.nom} ${adh.prenom}`,
      numeroCnps: adh.numeroCnps || 'En attente',
      branche,
      sousRubriqueOffre,
      dateImmatriculation: adh.dateImmatriculation || new Date().toISOString().slice(0, 10),
      statut: 'Dossier non commencé',
      pieces: piecesTemplate.map((p) => ({
        ...p,
        recu: false,
      })),
      nombreEnfants: 0,
      certificatsScolariteFournis: false,
      historique: [
        {
          date: new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date()),
          auteur: currentUser.nom,
          action: `Création du dossier CNPS [${branche}] - ${sousRubriqueOffre}`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDossiers((prev) => [newDossier, ...prev]);
    return { success: true };
  };

  // Changement d'utilisateur sécurisé avec code de validation (1111)
  const switchUserWithCode = (targetUser: Utilisateur, code: string) => {
    const expectedMasterCode = '1111';
    const userSpecific = targetUser.codeAcces || targetUser.codePin;
    const isValid =
      code.trim() === expectedMasterCode ||
      (userSpecific && code.trim() === userSpecific.trim());

    if (!isValid) {
      return {
        success: false,
        error: 'Code de validation incorrect. Le code requis est 1111.',
      };
    }

    setCurrentUser(targetUser);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: targetUser.nom,
      role: targetUser.role,
      typeOperation: 'CHANGEMENT_UTILISATEUR',
      entite: 'Session Utilisateur',
      description: `Changement de session utilisateur : Basculement vers ${targetUser.nom} (${targetUser.poste || targetUser.role}) après validation du code 1111.`,
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true };
  };

  // Mettre à jour le logiciel et effacer toutes les données (mot de passe 1111)
  const wipeAllDataForUpdate = (password: string) => {
    if (password.trim() !== '1111') {
      return {
        success: false,
        error: 'Mot de passe de mise à jour incorrect. Le mot de passe requis est 1111.',
      };
    }

    // Effacement des données d'exploitation
    localStorage.removeItem(STORAGE_KEYS.ADHERENTS);
    localStorage.removeItem(STORAGE_KEYS.COTISATIONS);
    localStorage.removeItem(STORAGE_KEYS.DOSSIERS);
    localStorage.removeItem(STORAGE_KEYS.JOURNAL);
    localStorage.removeItem(STORAGE_KEYS.DEPENSES);
    localStorage.removeItem(STORAGE_KEYS.VERSEMENTS);
    localStorage.removeItem(STORAGE_KEYS.FRAIS_MOBILE_MONEY);
    localStorage.removeItem(STORAGE_KEYS.PARTENAIRES);
    localStorage.removeItem(STORAGE_KEYS.RENDEZ_VOUS);
    localStorage.removeItem(STORAGE_KEYS.NOTES_DIRECTION);

    setAdherents([]);
    setCotisations([]);
    setDossiers([]);
    setDepenses([]);
    setVersements([]);
    setFraisMobileMoney([]);
    setPartenaires([]);
    setRendezVous([]);
    setNotesDirection([]);
    setSelectedAdherentId(null);

    // Réinitialiser la séquence de numérotation des matricules à 0
    setParametres((prev) => {
      const updated = {
        ...prev,
        dernierNumeroMatricule: 0,
      };
      localStorage.setItem(STORAGE_KEYS.PARAMETRES, JSON.stringify(updated));
      return updated;
    });

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const initLog: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MISE_A_JOUR_LOGICIEL',
      entite: 'Système Logiciel',
      description:
        'Mise à jour logicielle effectuée avec succès (Code 1111 validé). Toutes les données enregistrées ont été effacées pour un redémarrage propre.',
      nouvellesInformations:
        'Adhérents effacés: 0 restant | Cotisations effacées: 0 | Dossiers effacés: 0 | Matricule reset: COSITI-0001 prêt',
    };

    setJournal([initLog]);
    localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify([initLog]));

    return { success: true };
  };

  // Nouveau paramétrage complet des utilisateurs
  const nouveauParametrageUtilisateurs = (newUsers: Utilisateur[]) => {
    if (!newUsers || newUsers.length === 0) {
      return { success: false, error: 'La liste des utilisateurs ne peut pas être vide.' };
    }

    setUtilisateurs(newUsers);
    localStorage.setItem(STORAGE_KEYS.UTILISATEURS, JSON.stringify(newUsers));

    const stillPresent = newUsers.find((u) => u.id === currentUser.id);
    if (stillPresent) {
      setCurrentUser(stillPresent);
    } else {
      setCurrentUser(newUsers[0]);
    }

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_PARAMETRES',
      entite: 'Paramétrage Utilisateurs',
      description: `Nouveau paramétrage des utilisateurs enregistré (${newUsers.length} comptes paramétrés avec postes et codes d'accès)`,
    };

    setJournal((prev) => [logEntry, ...prev]);

    return { success: true };
  };

  // Mettre à jour les paramètres
  const updateParametres = (newParams: Partial<ParametresApp>) => {
    setParametres((prev) => ({ ...prev, ...newParams }));

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_PARAMETRES',
      entite: 'Paramètres',
      description: 'Mise à jour de la configuration générale du système',
      nouvellesInformations: JSON.stringify(newParams),
    };

    setJournal((prev) => [logEntry, ...prev]);
  };

  // Gestion utilisateurs
  const addUtilisateur = (user: Omit<Utilisateur, 'id'>) => {
    const newUser: Utilisateur = {
      ...user,
      id: `u-${Date.now()}`,
    };
    setUtilisateurs((prev) => [...prev, newUser]);
  };

  const updateUtilisateur = (id: string, data: Partial<Utilisateur>) => {
    setUtilisateurs((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
    if (currentUser.id === id) {
      setCurrentUser((prev) => ({ ...prev, ...data }));
    }
  };

  const deleteUtilisateur = (id: string) => {
    setUtilisateurs((prev) => prev.filter((u) => u.id !== id));
  };

  // ==========================================
  // ACTIONS DAF : FINANCES, DÉPENSES & TRÉSORERIE
  // ==========================================

  const addDepense = (data: Omit<DepenseCourante, 'id' | 'createdAt'>) => {
    const newDep: DepenseCourante = {
      ...data,
      id: `dep-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setDepenses((prev) => [newDep, ...prev]);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'ENREGISTREMENT_DEPENSE',
      entite: 'Dépense courante',
      description: `Enregistrement dépense : ${data.montant.toLocaleString('fr-FR')} FCFA (${data.categorie}) - ${data.motif}`,
      nouvellesInformations: `Bénéficiaire: ${data.beneficiaire} | N° Pièce: ${data.numeroPiece} | Mode: ${data.modePaiement}`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const updateDepense = (id: string, data: Partial<DepenseCourante>) => {
    setDepenses((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_DEPENSE',
      entite: 'Dépense courante',
      description: `Mise à jour de la dépense ${id}`,
      nouvellesInformations: JSON.stringify(data),
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const deleteDepense = (id: string, pinCode?: string) => {
    if (pinCode && pinCode.trim() !== '0000') {
      return { success: false, error: 'Code de confirmation incorrect (code: 0000)' };
    }
    const target = depenses.find((d) => d.id === id);
    setDepenses((prev) => prev.filter((d) => d.id !== id));
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'SUPPRESSION_DEPENSE',
      entite: 'Dépense courante',
      description: `Suppression de la dépense ${id} (${target?.montant.toLocaleString('fr-FR')} FCFA - ${target?.motif})`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const addVersement = (data: Omit<VersementBancaire, 'id' | 'createdAt'>) => {
    const newVrs: VersementBancaire = {
      ...data,
      id: `vrs-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setVersements((prev) => [newVrs, ...prev]);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'ENREGISTREMENT_VERSEMENT_BANCAIRE',
      entite: 'Versement bancaire',
      description: `Versement bancaire de ${data.montant.toLocaleString('fr-FR')} FCFA sur ${data.banque} (Bordereau: ${data.numeroBordereau})`,
      nouvellesInformations: `Source: ${data.sourceFonds} | Déposant: ${data.deposant}`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const updateVersement = (id: string, data: Partial<VersementBancaire>) => {
    setVersements((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_VERSEMENT_BANCAIRE',
      entite: 'Versement bancaire',
      description: `Mise à jour du versement bancaire ${id}`,
      nouvellesInformations: JSON.stringify(data),
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const deleteVersement = (id: string, pinCode?: string) => {
    if (pinCode && pinCode.trim() !== '0000') {
      return { success: false, error: 'Code de confirmation incorrect (code: 0000)' };
    }
    const target = versements.find((v) => v.id === id);
    setVersements((prev) => prev.filter((v) => v.id !== id));
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'SUPPRESSION_VERSEMENT_BANCAIRE',
      entite: 'Versement bancaire',
      description: `Suppression du versement bancaire ${id} (${target?.montant.toLocaleString('fr-FR')} FCFA - ${target?.banque})`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const addFraisMobileMoney = (data: Omit<FraisMobileMoney, 'id' | 'createdAt'>) => {
    const newFmm: FraisMobileMoney = {
      ...data,
      id: `fmm-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setFraisMobileMoney((prev) => [newFmm, ...prev]);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'ENREGISTREMENT_FRAIS_MOBILE_MONEY',
      entite: 'Frais Mobile Money',
      description: `Saisie frais opérateur ${data.operateur} : ${data.fraisPreleves.toLocaleString('fr-FR')} FCFA prélevés sur ${data.montantTransaction.toLocaleString('fr-FR')} FCFA (Réf: ${data.referenceTransaction})`,
      nouvellesInformations: `Type: ${data.typeFrais} | Montant net: ${data.montantNet.toLocaleString('fr-FR')} FCFA`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const updateFraisMobileMoney = (id: string, data: Partial<FraisMobileMoney>) => {
    setFraisMobileMoney((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f)));
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_FRAIS_MOBILE_MONEY',
      entite: 'Frais Mobile Money',
      description: `Mise à jour des frais Mobile Money ${id}`,
      nouvellesInformations: JSON.stringify(data),
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const deleteFraisMobileMoney = (id: string, pinCode?: string) => {
    if (pinCode && pinCode.trim() !== '0000') {
      return { success: false, error: 'Code de confirmation incorrect (code: 0000)' };
    }
    const target = fraisMobileMoney.find((f) => f.id === id);
    setFraisMobileMoney((prev) => prev.filter((f) => f.id !== id));
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'SUPPRESSION_FRAIS_MOBILE_MONEY',
      entite: 'Frais Mobile Money',
      description: `Suppression enregistrement frais ${target?.operateur} (${target?.fraisPreleves.toLocaleString('fr-FR')} FCFA prélevés)`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  // ==========================================
  // ACTIONS DIRECTION (DG & DGA) : AGENDA, PARTENAIRES & NOTES
  // ==========================================

  const addPartenaire = (data: Omit<PartenaireDirection, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newPart: PartenaireDirection = {
      ...data,
      id: `part-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setPartenaires((prev) => [newPart, ...prev]);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'CREATION_PARTENAIRE',
      entite: 'Partenaire Direction',
      description: `Enregistrement du partenaire potentiel/actif : ${data.nomOrganisation} (${data.secteur}) - Contact: ${data.personneContact}`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const updatePartenaire = (id: string, data: Partial<PartenaireDirection>) => {
    setPartenaires((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p))
    );
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_PARTENAIRE',
      entite: 'Partenaire Direction',
      description: `Mise à jour de la fiche partenaire ${id}`,
      nouvellesInformations: JSON.stringify(data),
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const deletePartenaire = (id: string) => {
    const target = partenaires.find((p) => p.id === id);
    setPartenaires((prev) => prev.filter((p) => p.id !== id));
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'SUPPRESSION_PARTENAIRE',
      entite: 'Partenaire Direction',
      description: `Suppression du partenaire ${target?.nomOrganisation}`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const addRendezVous = (data: Omit<RendezVousDirection, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newRdv: RendezVousDirection = {
      ...data,
      id: `rdv-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setRendezVous((prev) => [newRdv, ...prev]);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'CREATION_RENDEZ_VOUS',
      entite: 'Agenda Direction',
      description: `Planification rendez-vous : « ${data.titre} » le ${data.date} à ${data.heure} avec ${data.nomInterlocuteurOuPartenaire}`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const updateRendezVous = (id: string, data: Partial<RendezVousDirection>) => {
    setRendezVous((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r))
    );
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_RENDEZ_VOUS',
      entite: 'Agenda Direction',
      description: `Mise à jour du rendez-vous ${id}`,
      nouvellesInformations: JSON.stringify(data),
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const deleteRendezVous = (id: string) => {
    const target = rendezVous.find((r) => r.id === id);
    setRendezVous((prev) => prev.filter((r) => r.id !== id));
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'SUPPRESSION_RENDEZ_VOUS',
      entite: 'Agenda Direction',
      description: `Suppression du rendez-vous : ${target?.titre} du ${target?.date}`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const addNoteDirection = (data: Omit<NoteSpecifiqueDirection, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newNote: NoteSpecifiqueDirection = {
      ...data,
      id: `note-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setNotesDirection((prev) => [newNote, ...prev]);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'CREATION_NOTE_DIRECTION',
      entite: 'Note Direction',
      description: `Création de la note de direction : « ${data.titre} » (${data.categorie})`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const updateNoteDirection = (id: string, data: Partial<NoteSpecifiqueDirection>) => {
    setNotesDirection((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n))
    );
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_NOTE_DIRECTION',
      entite: 'Note Direction',
      description: `Mise à jour de la note de direction ${id}`,
      nouvellesInformations: JSON.stringify(data),
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const deleteNoteDirection = (id: string) => {
    const target = notesDirection.find((n) => n.id === id);
    setNotesDirection((prev) => prev.filter((n) => n.id !== id));
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'SUPPRESSION_NOTE_DIRECTION',
      entite: 'Note Direction',
      description: `Suppression de la note de direction : ${target?.titre}`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  // Actions Gestionnaires de Portefeuille
  const addGestionnaire = (data: Omit<GestionnairePortefeuille, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newGestionnaire: GestionnairePortefeuille = {
      ...data,
      id: `gp-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setGestionnaires((prev) => [newGestionnaire, ...prev]);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'CREATION_GESTIONNAIRE',
      entite: 'Gestionnaires de Portefeuille',
      description: `Enregistrement du gestionnaire de portefeuille : ${data.nom} ${data.prenom} (${data.code}) - Zone: ${data.zoneSecteur}`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true, gestionnaire: newGestionnaire };
  };

  const updateGestionnaire = (id: string, data: Partial<GestionnairePortefeuille>) => {
    setGestionnaires((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...data, updatedAt: new Date().toISOString() } : g))
    );

    if (data.nom || data.prenom || data.code) {
      setAdherents((prev) =>
        prev.map((a) => {
          if (a.gestionnaireId === id) {
            const currentG = gestionnaires.find((g) => g.id === id);
            const nomComplet = `${data.nom || currentG?.nom} ${data.prenom || currentG?.prenom} (${data.code || currentG?.code})`;
            return { ...a, gestionnaireNom: nomComplet };
          }
          return a;
        })
      );
    }

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'MODIFICATION_GESTIONNAIRE',
      entite: 'Gestionnaires de Portefeuille',
      description: `Mise à jour du gestionnaire de portefeuille ID ${id}`,
      nouvellesInformations: JSON.stringify(data),
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const deleteGestionnaire = (id: string) => {
    const target = gestionnaires.find((g) => g.id === id);
    setGestionnaires((prev) => prev.filter((g) => g.id !== id));

    setAdherents((prev) =>
      prev.map((a) => (a.gestionnaireId === id ? { ...a, gestionnaireId: undefined, gestionnaireNom: undefined } : a))
    );

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'SUPPRESSION_GESTIONNAIRE',
      entite: 'Gestionnaires de Portefeuille',
      description: `Suppression du gestionnaire de portefeuille : ${target?.nom} ${target?.prenom} (${target?.code})`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  const assignerPortefeuille = (adherentId: string, gestionnaireId: string | null) => {
    const targetAdherent = adherents.find((a) => a.id === adherentId);
    if (!targetAdherent) return { success: false, error: 'Adhérent non trouvé' };

    let gestNom: string | undefined = undefined;
    if (gestionnaireId) {
      const g = gestionnaires.find((item) => item.id === gestionnaireId);
      if (g) {
        gestNom = `${g.nom} ${g.prenom} (${g.code})`;
      }
    }

    setAdherents((prev) =>
      prev.map((a) =>
        a.id === adherentId
          ? {
              ...a,
              gestionnaireId: gestionnaireId || undefined,
              gestionnaireNom: gestNom,
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const logEntry: JournalOperation = {
      id: `j-${Date.now()}`,
      date: dateFormatted,
      utilisateur: currentUser.nom,
      role: currentUser.role,
      typeOperation: 'AFFECTATION_PORTEFEUILLE',
      entite: 'Gestionnaires de Portefeuille',
      description: gestionnaireId
        ? `Affectation de l'adhérent ${targetAdherent.matricule} (${targetAdherent.nom} ${targetAdherent.prenom}) au portefeuille de ${gestNom}`
        : `Désaffectation du portefeuille pour l'adhérent ${targetAdherent.matricule}`,
    };
    setJournal((prev) => [logEntry, ...prev]);
    return { success: true };
  };

  // Réinitialiser les données de démonstration
  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEYS.ADHERENTS);
    localStorage.removeItem(STORAGE_KEYS.COTISATIONS);
    localStorage.removeItem(STORAGE_KEYS.DOSSIERS);
    localStorage.removeItem(STORAGE_KEYS.JOURNAL);
    localStorage.removeItem(STORAGE_KEYS.PARAMETRES);
    localStorage.removeItem(STORAGE_KEYS.UTILISATEURS);
    localStorage.removeItem(STORAGE_KEYS.DEPENSES);
    localStorage.removeItem(STORAGE_KEYS.VERSEMENTS);
    localStorage.removeItem(STORAGE_KEYS.FRAIS_MOBILE_MONEY);
    localStorage.removeItem(STORAGE_KEYS.PARTENAIRES);
    localStorage.removeItem(STORAGE_KEYS.RENDEZ_VOUS);
    localStorage.removeItem(STORAGE_KEYS.NOTES_DIRECTION);
    localStorage.removeItem(STORAGE_KEYS.GESTIONNAIRES);

    setAdherents(INITIAL_ADHERENTS);
    setCotisations(INITIAL_COTISATIONS);
    setDossiers(INITIAL_DOSSIERS);
    setJournal(INITIAL_JOURNAL);
    setParametres(INITIAL_PARAMETRES);
    setUtilisateurs(INITIAL_UTILISATEURS);
    setCurrentUser(INITIAL_UTILISATEURS[0]);
    setDepenses(INITIAL_DEPENSES);
    setVersements(INITIAL_VERSEMENTS);
    setFraisMobileMoney(INITIAL_FRAIS_MOBILE_MONEY);
    setPartenaires(INITIAL_PARTENAIRES);
    setRendezVous(INITIAL_RENDEZ_VOUS);
    setNotesDirection(INITIAL_NOTES_DIRECTION);
    setGestionnaires(INITIAL_GESTIONNAIRES);
    setSelectedAdherentId(null);
  };

  return (
    <AppContext.Provider
      value={{
        adherents,
        cotisations,
        dossiers,
        journal,
        parametres,
        utilisateurs,
        currentUser,
        activeTab,
        selectedAdherentId,
        globalSearch,
        alerts,
        depenses,
        versements,
        fraisMobileMoney,
        partenaires,
        rendezVous,
        notesDirection,
        gestionnaires,
        setActiveTab,
        setSelectedAdherentId,
        setGlobalSearch,
        setCurrentUser,
        switchUserWithCode,
        addAdherent,
        updateAdherent,
        deleteAdherent,
        addCotisation,
        updateCotisation,
        deleteCotisation,
        immatriculerAdherent,
        updateDossier,
        createDossierForAdherent,
        addGestionnaire,
        updateGestionnaire,
        deleteGestionnaire,
        assignerPortefeuille,
        addDepense,
        updateDepense,
        deleteDepense,
        addVersement,
        updateVersement,
        deleteVersement,
        addFraisMobileMoney,
        updateFraisMobileMoney,
        deleteFraisMobileMoney,
        addPartenaire,
        updatePartenaire,
        deletePartenaire,
        addRendezVous,
        updateRendezVous,
        deleteRendezVous,
        addNoteDirection,
        updateNoteDirection,
        deleteNoteDirection,
        updateParametres,
        addUtilisateur,
        updateUtilisateur,
        deleteUtilisateur,
        nouveauParametrageUtilisateurs,
        resetToDemoData,
        wipeAllDataForUpdate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans AppProvider');
  return context;
};
