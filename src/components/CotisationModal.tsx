import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Cotisation, ModePaiement, Adherent } from '../types';
import { formatFCFA, calculateAdherentStats } from '../utils/helpers';
import { X, CreditCard, Shield, CheckCircle2, Search, AlertTriangle } from 'lucide-react';

interface CotisationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAdherentId?: string | null;
  cotisationToEdit?: Cotisation | null;
  onSuccessCreated?: (newCotisation: Cotisation) => void;
  onRequestPinConfirm?: (action: () => void, title: string, desc: string) => void;
}

const MOIS_LIST = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const MODES_PAIEMENT: ModePaiement[] = [
  'Espèces',
  'Wave',
  'Orange Money',
  'MTN MoMo',
  'Moov Money',
  'Virement bancaire',
  'Chèque',
];

export const CotisationModal: React.FC<CotisationModalProps> = ({
  isOpen,
  onClose,
  preselectedAdherentId,
  cotisationToEdit,
  onSuccessCreated,
  onRequestPinConfirm,
}) => {
  const {
    adherents,
    cotisations,
    parametres,
    currentUser,
    addCotisation,
    updateCotisation,
  } = useApp();

  const isEditing = Boolean(cotisationToEdit);

  const [selectedAdherentId, setSelectedAdherentId] = useState<string>('');
  const [adherentSearch, setAdherentSearch] = useState('');
  const [montant, setMontant] = useState<number>(700);
  const [customMontant, setCustomMontant] = useState<string>('700');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('Espèces');
  const [reference, setReference] = useState('');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().slice(0, 10));
  const [mois, setMois] = useState<string>(MOIS_LIST[new Date().getMonth()]);
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [observations, setObservations] = useState('');

  // Initialisation
  useEffect(() => {
    if (cotisationToEdit) {
      setSelectedAdherentId(cotisationToEdit.adherentId);
      setMontant(cotisationToEdit.montant);
      setCustomMontant(String(cotisationToEdit.montant));
      setModePaiement(cotisationToEdit.modePaiement);
      setReference(cotisationToEdit.reference || '');
      setDatePaiement(cotisationToEdit.datePaiement);
      setMois(cotisationToEdit.mois);
      setAnnee(cotisationToEdit.annee);
      setObservations(cotisationToEdit.observations || '');
    } else {
      const initialAdhId = preselectedAdherentId || (adherents.length > 0 ? adherents[0].id : '');
      setSelectedAdherentId(initialAdhId);

      const foundAdh = adherents.find((a) => a.id === initialAdhId);
      const defaultRate = foundAdh?.tarifJournalier || parametres.montantsCotisationDefauts[0] || 700;
      setMontant(defaultRate);
      setCustomMontant(String(defaultRate));

      setModePaiement('Wave');
      setReference('');
      setDatePaiement(new Date().toISOString().slice(0, 10));
      setMois(MOIS_LIST[new Date().getMonth()]);
      setAnnee(new Date().getFullYear());
      setObservations('');
    }
  }, [cotisationToEdit, preselectedAdherentId, isOpen, adherents, parametres]);

  if (!isOpen) return null;

  const selectedAdherent = adherents.find((a) => a.id === selectedAdherentId);
  const currentStats = selectedAdherent
    ? calculateAdherentStats(selectedAdherent, cotisations, parametres)
    : null;

  // Filtrage adhérents pour sélection aisée
  const filteredAdherents = adherents.filter((a) => {
    if (!adherentSearch.trim()) return true;
    const q = adherentSearch.toLowerCase();
    return (
      a.matricule.toLowerCase().includes(q) ||
      a.nom.toLowerCase().includes(q) ||
      a.prenom.toLowerCase().includes(q) ||
      a.telephone.toLowerCase().includes(q)
    );
  });

  const handleSelectAdherent = (adhId: string) => {
    setSelectedAdherentId(adhId);
    const adh = adherents.find((a) => a.id === adhId);
    if (adh) {
      setMontant(adh.tarifJournalier || 700);
      setCustomMontant(String(adh.tarifJournalier || 700));
    }
  };

  const handlePresetAmount = (val: number) => {
    setMontant(val);
    setCustomMontant(String(val));
  };

  const handleCustomAmountChange = (valStr: string) => {
    setCustomMontant(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setMontant(parsed);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAdherent) {
      alert('Veuillez sélectionner un adhérent.');
      return;
    }

    if (!montant || montant <= 0) {
      alert('Le montant de la cotisation doit être supérieur à zéro.');
      return;
    }

    if (isEditing && cotisationToEdit) {
      if (onRequestPinConfirm) {
        onRequestPinConfirm(
          () => {
            const res = updateCotisation(
              cotisationToEdit.id,
              {
                montant,
                modePaiement,
                reference: reference.trim() || undefined,
                datePaiement,
                mois,
                annee,
                observations: observations.trim() || undefined,
              },
              '0000'
            );
            if (res.success) {
              onClose();
            } else {
              alert(res.error);
            }
          },
          'Confirmation de modification de cotisation',
          `Vous modifiez une cotisation déjà enregistrée pour ${cotisationToEdit.matricule}. Code requis : 0000.`
        );
      }
    } else {
      const res = addCotisation({
        adherentId: selectedAdherent.id,
        matricule: selectedAdherent.matricule,
        adherentNomPrenom: `${selectedAdherent.nom} ${selectedAdherent.prenom}`,
        datePaiement,
        montant,
        modePaiement,
        reference: reference.trim() || `REC-${Date.now().toString().slice(-6)}`,
        mois,
        annee,
        agentEnregistreur: currentUser.nom,
        observations: observations.trim() || undefined,
      });

      if (res.success && res.cotisation) {
        onClose();
        if (onSuccessCreated) {
          onSuccessCreated(res.cotisation);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6">
        {/* En-tête */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? 'Modifier une cotisation' : 'Enregistrer une cotisation'}
              </h3>
              <p className="text-xs text-emerald-200">
                {isEditing
                  ? `Paiement ${cotisationToEdit?.matricule}`
                  : 'Encaissement et calcul automatique des droits'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Sélection de l'adhérent */}
          {!isEditing ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sélectionner l'Adhérent *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrer par nom, prénom ou matricule..."
                  value={adherentSearch}
                  onChange={(e) => setAdherentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg mb-1 focus:bg-white focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={selectedAdherentId}
                onChange={(e) => handleSelectAdherent(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {filteredAdherents.map((adh) => (
                  <option key={adh.id} value={adh.id}>
                    {adh.matricule} — {adh.nom} {adh.prenom} ({adh.profession})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Adhérent</span>
                <span className="text-xs font-bold text-slate-800">
                  {cotisationToEdit?.matricule} — {cotisationToEdit?.adherentNomPrenom}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Fixé
              </span>
            </div>
          )}

          {/* Fiche récapitulatif situation adhérent */}
          {selectedAdherent && currentStats && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-emerald-950 flex items-center space-x-1.5">
                  <span>{selectedAdherent.matricule}</span>
                  <span>•</span>
                  <span>{selectedAdherent.nom} {selectedAdherent.prenom}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentStats.statutCotisation === 'À jour'
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {currentStats.statutCotisation}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-emerald-200/60">
                <div>
                  <span className="text-slate-500 block">Cumul actuel</span>
                  <span className="font-bold text-slate-900">
                    {formatFCFA(currentStats.totalCumule)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Jours cotisés</span>
                  <span className="font-bold text-slate-900">
                    {currentStats.nombreJoursCotises} jours
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Seuil Immatriculation</span>
                  <span className="font-bold text-emerald-800">
                    {currentStats.seuilAtteint
                      ? '✓ Seuil atteint (15k)'
                      : `Reste ${formatFCFA(currentStats.montantRestantPourSeuil)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Montant avec boutons rapides prédéfinis */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Montant à encaisser (FCFA) *
            </label>

            {/* Boutons rapides */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handlePresetAmount(700)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 700
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                700 F <span className="text-[10px] font-normal block opacity-80">(1 jour)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(1000)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 1000
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                1 000 F <span className="text-[10px] font-normal block opacity-80">(1 jour)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(4900)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 4900
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                4 900 F <span className="text-[10px] font-normal block opacity-80">(7 jours)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(10000)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 10000
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                10 000 F <span className="text-[10px] font-normal block opacity-80">(10 jours)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePresetAmount(15000)}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  montant === 15000
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                }`}
                title="Seuil total requis pour l'immatriculation CNPS"
              >
                15 000 F <span className="text-[10px] font-normal block text-emerald-700 font-semibold">★ Seuil</span>
              </button>
            </div>

            {/* Saisie manuelle du montant */}
            <div className="relative">
              <input
                type="number"
                step="100"
                required
                value={customMontant}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="Montant en FCFA"
                className="w-full px-3 py-2.5 text-base font-extrabold text-emerald-950 font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                FCFA
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mode de paiement *
              </label>
              <select
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value as ModePaiement)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {MODES_PAIEMENT.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Référence de paiement
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: WAVE-TX-9942, N° reçu..."
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date de versement *
              </label>
              <input
                type="date"
                required
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mois
                </label>
                <select
                  value={mois}
                  onChange={(e) => setMois(e.target.value)}
                  className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {MOIS_LIST.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Année
                </label>
                <input
                  type="number"
                  value={annee}
                  onChange={(e) => setAnnee(parseInt(e.target.value, 10))}
                  className="w-full px-2 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agent enregistreur
              </label>
              <input
                type="text"
                disabled
                value={`${currentUser.nom} (${currentUser.role})`}
                className="w-full px-3 py-2 text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-medium cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observations & Notes de versement
              </label>
              <textarea
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ex: Paiement anticipé, rattrapage arriéré, appoint espèces..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {isEditing && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs text-amber-900">
              <Shield className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Contrôle de sécurité :</strong> Le code <strong>0000</strong> vous sera
                demandé pour enregistrer la modification de cette cotisation.
              </span>
            </div>
          )}

          {/* Boutons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
            >
              {isEditing ? 'Sauvegarder la cotisation' : 'Valider l’encaissement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
