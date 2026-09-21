import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DepenseCourante,
  VersementBancaire,
  FraisMobileMoney,
  CategorieDepense,
  CATEGORIES_DEPENSES,
  BANQUES_PARTENAIRES,
  OPERATEURS_MOBILE,
  OperateurMobile,
  TypeFraisMobileMoney,
} from '../../types';
import {
  Landmark,
  Receipt,
  Smartphone,
  Plus,
  Search,
  Trash2,
  Edit3,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  X,
  AlertCircle,
  Building2,
  Wallet,
} from 'lucide-react';

interface DepensesViewProps {
  onRequestPinConfirm?: (action: () => void, title: string, desc: string) => void;
}

export const DepensesView: React.FC<DepensesViewProps> = ({ onRequestPinConfirm }) => {
  const {
    depenses,
    versements,
    fraisMobileMoney,
    cotisations,
    currentUser,
    addDepense,
    updateDepense,
    deleteDepense,
    addVersement,
    updateVersement,
    deleteVersement,
    addFraisMobileMoney,
    updateFraisMobileMoney,
    deleteFraisMobileMoney,
    adherents,
  } = useApp();

  // Onglet actif : 'depenses' | 'versements' | 'mobile_money' | 'bilan'
  const [activeSubTab, setActiveSubTab] = useState<'depenses' | 'versements' | 'mobile_money' | 'bilan'>('depenses');

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('all');
  const [selectedBanque, setSelectedBanque] = useState<string>('all');
  const [selectedOperateur, setSelectedOperateur] = useState<string>('all');

  // Modal Dépense State
  const [isDepenseModalOpen, setIsDepenseModalOpen] = useState(false);
  const [editingDepense, setEditingDepense] = useState<DepenseCourante | null>(null);
  const [depenseForm, setDepenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    montant: '',
    motif: '',
    categorie: CATEGORIES_DEPENSES[0] || 'Fournitures de bureau & Imprimés',
    beneficiaire: '',
    modePaiement: 'Espèces / Caisse' as DepenseCourante['modePaiement'],
    numeroPiece: '',
    statut: 'Payé' as DepenseCourante['statut'],
    observations: '',
  });

  // Modal Versement Bancaire State
  const [isVersementModalOpen, setIsVersementModalOpen] = useState(false);
  const [editingVersement, setEditingVersement] = useState<VersementBancaire | null>(null);
  const [versementForm, setVersementForm] = useState({
    date: new Date().toISOString().split('T')[0],
    banque: BANQUES_PARTENAIRES[0] || 'BICICI',
    numeroCompte: 'CI008 01112 00012345601 45',
    numeroBordereau: '',
    montant: '',
    sourceFonds: 'Recettes Cotisations Adhérents' as VersementBancaire['sourceFonds'],
    deposant: currentUser?.nom || 'DAF COSITI',
    statut: 'Validé' as VersementBancaire['statut'],
    observations: '',
  });

  // Modal Frais Mobile Money State
  const [isFraisModalOpen, setIsFraisModalOpen] = useState(false);
  const [editingFrais, setEditingFrais] = useState<FraisMobileMoney | null>(null);
  const [fraisForm, setFraisForm] = useState({
    date: new Date().toISOString().split('T')[0],
    operateur: 'Orange Money' as OperateurMobile,
    montantTransaction: '',
    fraisPreleves: '',
    typeFrais: 'Frais de retrait marchand' as TypeFraisMobileMoney,
    referenceTransaction: '',
    adherentConcerne: '',
    observations: '',
  });

  // Calculs financiers globaux
  const totalDepenses = useMemo(() => {
    return depenses.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);
  }, [depenses]);

  const totalVersements = useMemo(() => {
    return versements.reduce((sum, v) => sum + (Number(v.montant) || 0), 0);
  }, [versements]);

  const totalFraisOperateurs = useMemo(() => {
    return fraisMobileMoney.reduce((sum, f) => sum + (Number(f.fraisPreleves) || 0), 0);
  }, [fraisMobileMoney]);

  const totalCotisations = useMemo(() => {
    return cotisations.reduce((sum, c) => sum + (Number(c.montant) || 0), 0);
  }, [cotisations]);

  // Cotisations encaissées par Mobile Money
  const cotisationsMobileMoney = useMemo(() => {
    return cotisations
      .filter((c) =>
        c.modePaiement === 'Orange Money' ||
        c.modePaiement === 'Wave' ||
        c.modePaiement === 'Moov Money' ||
        c.modePaiement === 'MTN Mobile Money'
      )
      .reduce((sum, c) => sum + (Number(c.montant) || 0), 0);
  }, [cotisations]);

  // Handlers Dépenses
  const handleOpenNewDepense = () => {
    setEditingDepense(null);
    setDepenseForm({
      date: new Date().toISOString().split('T')[0],
      montant: '',
      motif: '',
      categorie: CATEGORIES_DEPENSES[0],
      beneficiaire: '',
      modePaiement: 'Espèces / Caisse',
      numeroPiece: `DEP-${Date.now().toString().slice(-4)}`,
      statut: 'Payé',
      observations: '',
    });
    setIsDepenseModalOpen(true);
  };

  const handleEditDepense = (dep: DepenseCourante) => {
    setEditingDepense(dep);
    setDepenseForm({
      date: dep.date,
      montant: dep.montant.toString(),
      motif: dep.motif,
      categorie: dep.categorie,
      beneficiaire: dep.beneficiaire,
      modePaiement: dep.modePaiement,
      numeroPiece: dep.numeroPiece || '',
      statut: dep.statut,
      observations: dep.observations || '',
    });
    setIsDepenseModalOpen(true);
  };

  const handleSaveDepense = (e: React.FormEvent) => {
    e.preventDefault();
    const montantNum = Number(depenseForm.montant);
    if (!montantNum || montantNum <= 0) {
      alert('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    if (!depenseForm.motif.trim()) {
      alert('Veuillez renseigner le motif de la dépense.');
      return;
    }
    if (!depenseForm.beneficiaire.trim()) {
      alert('Veuillez spécifier le bénéficiaire de la dépense.');
      return;
    }

    if (editingDepense) {
      updateDepense(editingDepense.id, {
        date: depenseForm.date,
        montant: montantNum,
        motif: depenseForm.motif.trim(),
        categorie: depenseForm.categorie as CategorieDepense,
        beneficiaire: depenseForm.beneficiaire.trim(),
        modePaiement: depenseForm.modePaiement,
        numeroPiece: depenseForm.numeroPiece.trim() || editingDepense.numeroPiece,
        statut: depenseForm.statut,
        observations: depenseForm.observations.trim() || undefined,
      });
    } else {
      addDepense({
        date: depenseForm.date,
        montant: montantNum,
        motif: depenseForm.motif.trim(),
        categorie: depenseForm.categorie as CategorieDepense,
        beneficiaire: depenseForm.beneficiaire.trim(),
        modePaiement: depenseForm.modePaiement,
        numeroPiece: depenseForm.numeroPiece.trim() || `DEP-${Date.now().toString().slice(-4)}`,
        statut: depenseForm.statut,
        enregistrePar: currentUser?.nom || 'DAF',
        observations: depenseForm.observations.trim() || undefined,
      });
    }
    setIsDepenseModalOpen(false);
  };

  const handleDeleteDepense = (dep: DepenseCourante) => {
    const doDelete = () => {
      const res = deleteDepense(dep.id, '0000');
      if (!res.success) alert(res.error);
    };

    if (onRequestPinConfirm) {
      onRequestPinConfirm(
        doDelete,
        'Suppression de dépense (Code 0000)',
        `Confirmez-vous la suppression de la dépense de ${dep.montant.toLocaleString('fr-FR')} FCFA (${dep.motif}) ?`
      );
    } else {
      if (window.confirm(`Supprimer la dépense de ${dep.montant.toLocaleString('fr-FR')} FCFA ?`)) {
        doDelete();
      }
    }
  };

  // Handlers Versements
  const handleOpenNewVersement = () => {
    setEditingVersement(null);
    setVersementForm({
      date: new Date().toISOString().split('T')[0],
      banque: BANQUES_PARTENAIRES[0] || 'BICICI',
      numeroCompte: 'CI008 01112 00012345601 45',
      numeroBordereau: `BORD-${Date.now().toString().slice(-5)}`,
      montant: '',
      sourceFonds: 'Recettes Cotisations Adhérents',
      deposant: currentUser?.nom || 'DAF COSITI',
      statut: 'Validé',
      observations: '',
    });
    setIsVersementModalOpen(true);
  };

  const handleEditVersement = (vrs: VersementBancaire) => {
    setEditingVersement(vrs);
    setVersementForm({
      date: vrs.date,
      banque: vrs.banque,
      numeroCompte: vrs.numeroCompte || '',
      numeroBordereau: vrs.numeroBordereau,
      montant: vrs.montant.toString(),
      sourceFonds: vrs.sourceFonds,
      deposant: vrs.deposant,
      statut: vrs.statut,
      observations: vrs.observations || '',
    });
    setIsVersementModalOpen(true);
  };

  const handleSaveVersement = (e: React.FormEvent) => {
    e.preventDefault();
    const montantNum = Number(versementForm.montant);
    if (!montantNum || montantNum <= 0) {
      alert('Veuillez saisir un montant de versement valide supérieur à 0.');
      return;
    }
    if (!versementForm.numeroBordereau.trim()) {
      alert('Veuillez renseigner le numéro de bordereau bancaire.');
      return;
    }

    if (editingVersement) {
      updateVersement(editingVersement.id, {
        date: versementForm.date,
        banque: versementForm.banque,
        numeroCompte: versementForm.numeroCompte.trim() || undefined,
        numeroBordereau: versementForm.numeroBordereau.trim(),
        montant: montantNum,
        sourceFonds: versementForm.sourceFonds,
        deposant: versementForm.deposant.trim(),
        statut: versementForm.statut,
        observations: versementForm.observations.trim() || undefined,
      });
    } else {
      addVersement({
        date: versementForm.date,
        banque: versementForm.banque,
        numeroCompte: versementForm.numeroCompte.trim() || undefined,
        numeroBordereau: versementForm.numeroBordereau.trim(),
        montant: montantNum,
        sourceFonds: versementForm.sourceFonds,
        deposant: versementForm.deposant.trim() || (currentUser?.nom ?? 'DAF'),
        enregistrePar: currentUser?.nom || 'DAF',
        statut: versementForm.statut,
        observations: versementForm.observations.trim() || undefined,
      });
    }
    setIsVersementModalOpen(false);
  };

  const handleDeleteVersement = (vrs: VersementBancaire) => {
    const doDelete = () => {
      const res = deleteVersement(vrs.id, '0000');
      if (!res.success) alert(res.error);
    };

    if (onRequestPinConfirm) {
      onRequestPinConfirm(
        doDelete,
        'Suppression versement bancaire (Code 0000)',
        `Supprimer le versement de ${vrs.montant.toLocaleString('fr-FR')} FCFA sur ${vrs.banque} (Bordereau ${vrs.numeroBordereau}) ?`
      );
    } else {
      if (window.confirm(`Supprimer le versement de ${vrs.montant.toLocaleString('fr-FR')} FCFA ?`)) {
        doDelete();
      }
    }
  };

  // Handlers Frais Mobile Money
  const handleOpenNewFrais = () => {
    setEditingFrais(null);
    setFraisForm({
      date: new Date().toISOString().split('T')[0],
      operateur: 'Orange Money',
      montantTransaction: '',
      fraisPreleves: '',
      typeFrais: 'Frais de retrait marchand',
      referenceTransaction: `TX-${Date.now().toString().slice(-6)}`,
      adherentConcerne: '',
      observations: '',
    });
    setIsFraisModalOpen(true);
  };

  const handleEditFrais = (f: FraisMobileMoney) => {
    setEditingFrais(f);
    setFraisForm({
      date: f.date,
      operateur: f.operateur,
      montantTransaction: f.montantTransaction.toString(),
      fraisPreleves: f.fraisPreleves.toString(),
      typeFrais: f.typeFrais,
      referenceTransaction: f.referenceTransaction,
      adherentConcerne: f.adherentConcerne || '',
      observations: f.observations || '',
    });
    setIsFraisModalOpen(true);
  };

  const handleSaveFrais = (e: React.FormEvent) => {
    e.preventDefault();
    const brut = Number(fraisForm.montantTransaction);
    const frais = Number(fraisForm.fraisPreleves);
    if (!brut || brut <= 0) {
      alert('Veuillez saisir le montant brut de la transaction.');
      return;
    }
    if (frais < 0 || frais > brut) {
      alert('Les frais prélevés ne peuvent pas dépasser le montant total de la transaction.');
      return;
    }

    const net = brut - frais;

    if (editingFrais) {
      updateFraisMobileMoney(editingFrais.id, {
        date: fraisForm.date,
        operateur: fraisForm.operateur,
        montantTransaction: brut,
        fraisPreleves: frais,
        montantNet: net,
        typeFrais: fraisForm.typeFrais,
        referenceTransaction: fraisForm.referenceTransaction.trim() || editingFrais.referenceTransaction,
        adherentConcerne: fraisForm.adherentConcerne.trim() || undefined,
        observations: fraisForm.observations.trim() || undefined,
      });
    } else {
      addFraisMobileMoney({
        date: fraisForm.date,
        operateur: fraisForm.operateur,
        montantTransaction: brut,
        fraisPreleves: frais,
        montantNet: net,
        typeFrais: fraisForm.typeFrais,
        referenceTransaction: fraisForm.referenceTransaction.trim() || `TX-${Date.now().toString().slice(-6)}`,
        adherentConcerne: fraisForm.adherentConcerne.trim() || undefined,
        enregistrePar: currentUser?.nom || 'DAF',
        observations: fraisForm.observations.trim() || undefined,
      });
    }
    setIsFraisModalOpen(false);
  };

  const handleDeleteFrais = (f: FraisMobileMoney) => {
    const doDelete = () => {
      const res = deleteFraisMobileMoney(f.id, '0000');
      if (!res.success) alert(res.error);
    };

    if (onRequestPinConfirm) {
      onRequestPinConfirm(
        doDelete,
        'Suppression de frais opérateur (Code 0000)',
        `Supprimer la ligne de frais de ${f.fraisPreleves.toLocaleString('fr-FR')} FCFA pour la transaction ${f.referenceTransaction} (${f.operateur}) ?`
      );
    } else {
      if (window.confirm(`Supprimer les frais de ${f.fraisPreleves.toLocaleString('fr-FR')} FCFA ?`)) {
        doDelete();
      }
    }
  };

  // Listes filtrées
  const filteredDepenses = useMemo(() => {
    return depenses.filter((d) => {
      const matchesSearch =
        d.motif.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.beneficiaire.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.numeroPiece && d.numeroPiece.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCat = selectedCategorie === 'all' || d.categorie === selectedCategorie;
      return matchesSearch && matchesCat;
    });
  }, [depenses, searchTerm, selectedCategorie]);

  const filteredVersements = useMemo(() => {
    return versements.filter((v) => {
      const matchesSearch =
        v.banque.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.numeroBordereau.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.deposant.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBanque = selectedBanque === 'all' || v.banque === selectedBanque;
      return matchesSearch && matchesBanque;
    });
  }, [versements, searchTerm, selectedBanque]);

  const filteredFrais = useMemo(() => {
    return fraisMobileMoney.filter((f) => {
      const matchesSearch =
        f.referenceTransaction.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.adherentConcerne && f.adherentConcerne.toLowerCase().includes(searchTerm.toLowerCase())) ||
        f.operateur.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOperateur = selectedOperateur === 'all' || f.operateur === selectedOperateur;
      return matchesSearch && matchesOperateur;
    });
  }, [fraisMobileMoney, searchTerm, selectedOperateur]);

  return (
    <div className="space-y-6" id="daf-financial-view">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
              Espace DAF & Trésorerie
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Directeur Administratif & Financier
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Gestion Financière, Dépenses & Frais Opérateurs
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Saisie et suivi des dépenses courantes, enregistrement des versements bancaires avec bordereaux,
            et décompte des frais de retrait Orange Money et Mobile Money prélevés lors des encaissements.
          </p>
        </div>

        {/* Boutons d'actions selon sous-onglet */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {activeSubTab === 'depenses' && (
            <button
              type="button"
              onClick={handleOpenNewDepense}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Saisir une dépense</span>
            </button>
          )}

          {activeSubTab === 'versements' && (
            <button
              type="button"
              onClick={handleOpenNewVersement}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Landmark className="w-4 h-4" />
              <span>Nouveau versement bancaire</span>
            </button>
          )}

          {activeSubTab === 'mobile_money' && (
            <button
              type="button"
              onClick={handleOpenNewFrais}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Enregistrer frais opérateur</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI financiers en cartes haute visibilité */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Dépenses courantes
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {totalDepenses.toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">FCFA</span>
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {depenses.length} dépense{depenses.length > 1 ? 's' : ''} engagée{depenses.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Versements en banque
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {totalVersements.toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">FCFA</span>
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {versements.length} bordereau{versements.length > 1 ? 'x' : ''} enregistré{versements.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Frais Orange & MoMo
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-700 tracking-tight">
              {totalFraisOperateurs.toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">FCFA</span>
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Prélevés sur {cotisationsMobileMoney.toLocaleString('fr-FR')} F reçus
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total cotisations reçues
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {totalCotisations.toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">FCFA</span>
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Net en caisse: {(totalCotisations - totalDepenses - totalFraisOperateurs).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>
      </div>

      {/* Navigation entre sous-onglets DAF */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('depenses');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'depenses'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>1. Dépenses Courantes ({depenses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('versements');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'versements'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>2. Versements Bancaires ({versements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('mobile_money');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'mobile_money'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>3. Frais Retrait Orange & MoMo ({fraisMobileMoney.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('bilan');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'bilan'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>4. Synthèse & Rapprochement</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VUE 1 : DÉPENSES COURANTES */}
      {/* ========================================================================= */}
      {activeSubTab === 'depenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par motif, bénéficiaire, n° pièce..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedCategorie}
                onChange={(e) => setSelectedCategorie(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORIES_DEPENSES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & N° Pièce</th>
                    <th className="py-3 px-4">Motif de la dépense</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Bénéficiaire</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Montant (FCFA)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        Aucune dépense courante enregistrée correspondant aux critères.
                      </td>
                    </tr>
                  ) : (
                    filteredDepenses.map((dep) => (
                      <tr key={dep.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{dep.date}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {dep.numeroPiece || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{dep.motif}</div>
                          {dep.observations && (
                            <div className="text-xs text-slate-500 line-clamp-1">
                              {dep.observations}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                            {dep.categorie}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {dep.beneficiaire}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {dep.modePaiement}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {dep.montant.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditDepense(dep)}
                              title="Modifier la dépense"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDepense(dep)}
                              title="Supprimer la dépense"
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-600">Total des dépenses affichées :</span>
              <span className="text-rose-700 font-black text-base">
                {filteredDepenses
                  .reduce((acc, curr) => acc + (Number(curr.montant) || 0), 0)
                  .toLocaleString('fr-FR')}{' '}
                FCFA
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : VERSEMENTS BANCAIRES */}
      {/* ========================================================================= */}
      {activeSubTab === 'versements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par banque, bordereau, déposant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedBanque}
                onChange={(e) => setSelectedBanque(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les banques</option>
                {BANQUES_PARTENAIRES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Bordereau</th>
                    <th className="py-3 px-4">Banque & Compte</th>
                    <th className="py-3 px-4">Source des fonds</th>
                    <th className="py-3 px-4">Déposant</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Montant versé</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVersements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <Landmark className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        Aucun versement bancaire enregistré correspondant.
                      </td>
                    </tr>
                  ) : (
                    filteredVersements.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{v.date}</div>
                          <div className="text-xs font-mono font-bold text-blue-700">
                            {v.numeroBordereau}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{v.banque}</span>
                          </div>
                          {v.numeroCompte && (
                            <div className="text-xs text-slate-500 font-mono">
                              {v.numeroCompte}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                            {v.sourceFonds}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{v.deposant}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{v.statut}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-blue-900">
                          {v.montant.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditVersement(v)}
                              title="Modifier le versement"
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVersement(v)}
                              title="Supprimer le versement"
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-600">Total des versements bancaires :</span>
              <span className="text-blue-800 font-black text-base">
                {filteredVersements
                  .reduce((acc, curr) => acc + (Number(curr.montant) || 0), 0)
                  .toLocaleString('fr-FR')}{' '}
                FCFA
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 3 : FRAIS MOBILE MONEY & ORANGE MONEY */}
      {/* ========================================================================= */}
      {activeSubTab === 'mobile_money' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3 text-amber-900 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Espace de déduction des frais d'opérateur Télécom :</span>{' '}
              Lorsqu'un adhérent cotise par Orange Money, MTN MoMo, Moov Money ou Wave, les opérateurs prélèvent
              des commissions et frais de retrait. Le DAF enregistre ici ces prélèvements pour assurer une stricte
              concordance entre les cotisations brutes dues et le solde net réellement perçu.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par référence, adhérent concerné..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedOperateur}
                onChange={(e) => setSelectedOperateur(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Tous les opérateurs</option>
                {OPERATEURS_MOBILE.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Réf.</th>
                    <th className="py-3 px-4">Opérateur Télécom</th>
                    <th className="py-3 px-4">Adhérent / Détail</th>
                    <th className="py-3 px-4">Type de frais</th>
                    <th className="py-3 px-4 text-right">Montant brut</th>
                    <th className="py-3 px-4 text-right text-rose-700">Frais prélevés</th>
                    <th className="py-3 px-4 text-right text-emerald-800">Net disponible</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFrais.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        <Smartphone className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        Aucun prélèvement d'opérateur enregistré.
                      </td>
                    </tr>
                  ) : (
                    filteredFrais.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{f.date}</div>
                          <div className="text-xs font-mono font-bold text-amber-800">
                            {f.referenceTransaction}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                              f.operateur === 'Orange Money'
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : f.operateur === 'MTN MoMo'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : f.operateur === 'Moov Money'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                            }`}
                          >
                            {f.operateur}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">
                            {f.adherentConcerne || 'Adhérent COSITI'}
                          </div>
                          {f.observations && (
                            <div className="text-xs text-slate-500">{f.observations}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {f.typeFrais}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {f.montantTransaction.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600">
                          - {f.fraisPreleves.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-700">
                          {f.montantNet.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditFrais(f)}
                              title="Modifier la ligne"
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFrais(f)}
                              title="Supprimer la ligne"
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-sm font-bold gap-2">
              <span className="text-slate-600">
                Cumul frais prélevés par les opérateurs de télécommunications :
              </span>
              <span className="text-rose-700 font-black text-base">
                -{' '}
                {filteredFrais
                  .reduce((acc, curr) => acc + (Number(curr.fraisPreleves) || 0), 0)
                  .toLocaleString('fr-FR')}{' '}
                FCFA
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 4 : BILAN & RAPPROCHEMENT SYNTHÉTIQUE */}
      {/* ========================================================================= */}
      {activeSubTab === 'bilan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Ressources Encaissées (Entrées de fonds)</span>
            </h2>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Total Cotisations & Adhésions perçues</span>
                <span className="font-bold text-slate-900">{totalCotisations.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Dont paiements par Mobile Money</span>
                <span className="font-medium text-amber-800">{cotisationsMobileMoney.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Dont paiements en Espèces / Guichet</span>
                <span className="font-medium text-slate-800">
                  {(totalCotisations - cotisationsMobileMoney).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              <span>Charges & Affectations de Trésorerie</span>
            </h2>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Dépenses courantes de fonctionnement</span>
                <span className="font-bold text-rose-700">- {totalDepenses.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Frais de retrait et commissions opérateurs télécom</span>
                <span className="font-bold text-amber-700">- {totalFraisOperateurs.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Fonds déposés sur les comptes bancaires (Bordereaux)</span>
                <span className="font-bold text-blue-700">{totalVersements.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-emerald-900 text-white p-6 rounded-2xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black">Position Nette de Trésorerie Théorique</h3>
                <p className="text-emerald-200 text-xs mt-1">
                  (Cotisations encaissées) - (Dépenses courantes) - (Frais prélevés par opérateurs Orange / MoMo)
                </p>
              </div>
              <div className="text-3xl font-black text-emerald-300">
                {(totalCotisations - totalDepenses - totalFraisOperateurs).toLocaleString('fr-FR')} FCFA
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES D'ÉDITION & SAISIE DAF */}
      {/* ========================================================================= */}

      {/* Modale Dépense Courante */}
      {isDepenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-emerald-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">
                  {editingDepense ? 'Modifier une dépense' : 'Saisir une dépense courante (DAF)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDepenseModalOpen(false)}
                className="text-emerald-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={depenseForm.date}
                    onChange={(e) => setDepenseForm({ ...depenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    N° Pièce / Facture
                  </label>
                  <input
                    type="text"
                    value={depenseForm.numeroPiece}
                    onChange={(e) => setDepenseForm({ ...depenseForm, numeroPiece: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: FACT-2025-01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motif de la dépense *
                </label>
                <input
                  type="text"
                  required
                  value={depenseForm.motif}
                  onChange={(e) => setDepenseForm({ ...depenseForm, motif: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: Achat rames de papier et cartouches d'encre"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={depenseForm.montant}
                    onChange={(e) => setDepenseForm({ ...depenseForm, montant: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: 25000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mode de paiement
                  </label>
                  <select
                    value={depenseForm.modePaiement}
                    onChange={(e) =>
                      setDepenseForm({
                        ...depenseForm,
                        modePaiement: e.target.value as DepenseCourante['modePaiement'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Espèces / Caisse">Espèces (Petite caisse)</option>
                    <option value="Chèque">Chèque bancaire</option>
                    <option value="Virement bancaire">Virement bancaire</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Wave">Wave</option>
                    <option value="MTN MoMo">MTN MoMo</option>
                    <option value="Moov Money">Moov Money</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Catégorie budgétaire
                  </label>
                  <select
                    value={depenseForm.categorie}
                    onChange={(e) =>
                      setDepenseForm({
                        ...depenseForm,
                        categorie: e.target.value as CategorieDepense,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES_DEPENSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bénéficiaire / Fournisseur *
                  </label>
                  <input
                    type="text"
                    required
                    value={depenseForm.beneficiaire}
                    onChange={(e) => setDepenseForm({ ...depenseForm, beneficiaire: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Librairie de France, CIE, SODECI..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observations / Références
                </label>
                <textarea
                  rows={2}
                  value={depenseForm.observations}
                  onChange={(e) => setDepenseForm({ ...depenseForm, observations: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Note explicative pour l'audit..."
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDepenseModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingDepense ? 'Mettre à jour' : 'Enregistrer la dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Versement Bancaire */}
      {isVersementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-blue-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Landmark className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-base">
                  {editingVersement ? 'Modifier versement' : 'Nouveau Versement Bancaire (DAF)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVersementModalOpen(false)}
                className="text-blue-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVersement} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={versementForm.date}
                    onChange={(e) => setVersementForm({ ...versementForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    N° Bordereau de dépôt *
                  </label>
                  <input
                    type="text"
                    required
                    value={versementForm.numeroBordereau}
                    onChange={(e) =>
                      setVersementForm({ ...versementForm, numeroBordereau: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: BORD-2025-089"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Banque réceptrice *
                  </label>
                  <select
                    value={versementForm.banque}
                    onChange={(e) => setVersementForm({ ...versementForm, banque: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {BANQUES_PARTENAIRES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Montant versé (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={versementForm.montant}
                    onChange={(e) => setVersementForm({ ...versementForm, montant: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 500000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Source des fonds versés
                </label>
                <select
                  value={versementForm.sourceFonds}
                  onChange={(e) =>
                    setVersementForm({
                      ...versementForm,
                      sourceFonds: e.target.value as VersementBancaire['sourceFonds'],
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Recettes Cotisations Adhérents">
                    Recettes Cotisations Adhérents
                  </option>
                  <option value="Retraits Mobile Money">Retraits Mobile Money</option>
                  <option value="Fonds propres / Apport">Fonds propres / Apport</option>
                  <option value="Autre">Autre provenance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nom du déposant
                  </label>
                  <input
                    type="text"
                    value={versementForm.deposant}
                    onChange={(e) => setVersementForm({ ...versementForm, deposant: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom de l'agent qui a fait le dépôt"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    N° de compte bancaire
                  </label>
                  <input
                    type="text"
                    value={versementForm.numeroCompte}
                    onChange={(e) => setVersementForm({ ...versementForm, numeroCompte: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsVersementModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingVersement ? 'Mettre à jour' : 'Enregistrer le versement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Frais Mobile Money */}
      {isFraisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-amber-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">
                  {editingFrais
                    ? 'Modifier frais opérateur'
                    : 'Décompte Frais de retrait Orange Money / MoMo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFraisModalOpen(false)}
                className="text-amber-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFrais} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={fraisForm.date}
                    onChange={(e) => setFraisForm({ ...fraisForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Opérateur Télécom *
                  </label>
                  <select
                    value={fraisForm.operateur}
                    onChange={(e) =>
                      setFraisForm({
                        ...fraisForm,
                        operateur: e.target.value as OperateurMobile,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    {OPERATEURS_MOBILE.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Montant brut transaction (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={fraisForm.montantTransaction}
                    onChange={(e) =>
                      setFraisForm({ ...fraisForm, montantTransaction: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500"
                    placeholder="Ex: 50000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Frais prélevés par l'opérateur (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={fraisForm.fraisPreleves}
                    onChange={(e) => setFraisForm({ ...fraisForm, fraisPreleves: e.target.value })}
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl text-sm font-bold text-rose-700 focus:ring-2 focus:ring-rose-500"
                    placeholder="Ex: 500"
                  />
                </div>
              </div>

              {fraisForm.montantTransaction && fraisForm.fraisPreleves && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center text-xs font-bold">
                  <span className="text-emerald-800">Montant net perçu par COSITI :</span>
                  <span className="text-emerald-900 font-black text-sm">
                    {(
                      Number(fraisForm.montantTransaction) - Number(fraisForm.fraisPreleves)
                    ).toLocaleString('fr-FR')}{' '}
                    FCFA
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Réf. Transaction / SMS
                  </label>
                  <input
                    type="text"
                    value={fraisForm.referenceTransaction}
                    onChange={(e) =>
                      setFraisForm({ ...fraisForm, referenceTransaction: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500"
                    placeholder="Ex: CI250228.1452.C09876"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Type de frais
                  </label>
                  <select
                    value={fraisForm.typeFrais}
                    onChange={(e) =>
                      setFraisForm({
                        ...fraisForm,
                        typeFrais: e.target.value as TypeFraisMobileMoney,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Frais de retrait marchand">Frais de retrait marchand</option>
                    <option value="Commission prélevée sur encaissement">Commission prélevée sur encaissement</option>
                    <option value="Frais de transfert opérateur">Frais de transfert opérateur</option>
                    <option value="Frais de compte pro">Frais de compte pro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Adhérent ou Payeur concerné
                </label>
                <div className="space-y-2">
                  <select
                    value={fraisForm.adherentConcerne}
                    onChange={(e) => setFraisForm({ ...fraisForm, adherentConcerne: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Sélectionner un adhérent enregistré (optionnel) --</option>
                    {adherents.map((a) => (
                      <option key={a.id} value={`${a.nom} ${a.prenom} (${a.matricule})`}>
                        {a.matricule} - {a.nom} {a.prenom} ({a.telephone})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={fraisForm.adherentConcerne}
                    onChange={(e) =>
                      setFraisForm({ ...fraisForm, adherentConcerne: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="Ou nom libre du payeur si versement direct"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observations / Note
                </label>
                <input
                  type="text"
                  value={fraisForm.observations}
                  onChange={(e) => setFraisForm({ ...fraisForm, observations: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="Ex: Frais déduits directement par l'agent de retrait"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFraisModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingFrais ? 'Mettre à jour' : 'Enregistrer le décompte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
