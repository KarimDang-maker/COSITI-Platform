import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Alerte, TypeAlerte, Adherent } from '../types';
import { formatFCFA, formatDateShort } from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import {
  AlertTriangle,
  CreditCard,
  Sparkles,
  Calendar,
  FolderHeart,
  BadgeCheck,
  ArrowRight,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';

interface AlertesViewProps {
  onSelectAdherent: (id: string) => void;
  onNewCotisationForAdherent: (adh: Adherent) => void;
  onImmatriculerAdherent: (adh: Adherent) => void;
  onOpenDossier: (adh: Adherent) => void;
}

export const AlertesView: React.FC<AlertesViewProps> = ({
  onSelectAdherent,
  onNewCotisationForAdherent,
  onImmatriculerAdherent,
  onOpenDossier,
}) => {
  const { alerts, adherents, cotisations, parametres } = useApp();

  const [activeTab, setActiveTab] = useState<'TOUTES' | TypeAlerte>('TOUTES');
  const [filterRetardJours, setFilterRetardJours] = useState<number>(0);
  const [search, setSearch] = useState('');

  // Filtrage des alertes
  const filteredAlerts = alerts.filter((al) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      al.matricule.toLowerCase().includes(q) ||
      al.adherentNom.toLowerCase().includes(q) ||
      al.titre.toLowerCase().includes(q) ||
      al.message.toLowerCase().includes(q);

    const matchesTab = activeTab === 'TOUTES' || al.type === activeTab;

    // Filtre retard additionnel si dans l'onglet non à jour
    let matchesRetard = true;
    if (al.type === 'NON_A_JOUR' && filterRetardJours > 0) {
      matchesRetard = (al.donneesSupplementaires?.joursRetard || 0) >= filterRetardJours;
    }

    return matchesSearch && matchesTab && matchesRetard;
  });

  // Compteurs par type
  const countNonAJour = alerts.filter((a) => a.type === 'NON_A_JOUR').length;
  const countSeuil15k = alerts.filter((a) => a.type === 'SEUIL_15000_ATTEINT').length;
  const countCycle1530 = alerts.filter((a) => a.type === 'VERIFICATION_15_30').length;
  const countDossiers = alerts.filter((a) => a.type === 'DOSSIER_ALLOCATIONS').length;

  const handleExportExcel = () => {
    const data = filteredAlerts.map((a) => ({
      Matricule: a.matricule,
      Adhérent: a.adherentNom,
      Niveau: a.niveau,
      Type: a.type,
      Titre: a.titre,
      Message: a.message,
      Date: a.dateCreation,
    }));
    exportToExcel(data, `Alertes_COSITI_${activeTab}_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleAction = (al: Alerte) => {
    const adh = adherents.find((a) => a.id === al.adherentId || a.matricule === al.matricule);
    if (!adh) {
      onSelectAdherent(al.adherentId);
      return;
    }

    if (al.type === 'SEUIL_15000_ATTEINT' || al.type === 'VERIFICATION_15_30') {
      onImmatriculerAdherent(adh);
    } else if (al.type === 'NON_A_JOUR') {
      onNewCotisationForAdherent(adh);
    } else if (al.type === 'DOSSIER_ALLOCATIONS') {
      onOpenDossier(adh);
    } else {
      onSelectAdherent(adh.id);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Centre d'Alertes Administratives COSITI</span>
            <span className="bg-rose-100 text-rose-800 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full">
              {alerts.length} active(s)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance automatique des retards, seuils d'immatriculation (15 000 F), contrôles du 15 & 30 et dossiers incomplets
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Onglets des 4 Catégories réglementaires requises */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('TOUTES')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'TOUTES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Toutes ({alerts.length})
        </button>

        <button
          onClick={() => setActiveTab('NON_A_JOUR')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'NON_A_JOUR'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>1. Adhérents non à jour ({countNonAJour})</span>
        </button>

        <button
          onClick={() => setActiveTab('SEUIL_15000_ATTEINT')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'SEUIL_15000_ATTEINT'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>2. Seuil 15 000 FCFA atteint ({countSeuil15k})</span>
        </button>

        <button
          onClick={() => setActiveTab('VERIFICATION_15_30')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'VERIFICATION_15_30'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-blue-900 hover:bg-blue-50 border border-blue-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>3. Cycle vérification 15 / 30 ({countCycle1530})</span>
        </button>

        <button
          onClick={() => setActiveTab('DOSSIER_ALLOCATIONS')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'DOSSIER_ALLOCATIONS'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <FolderHeart className="w-3.5 h-3.5" />
          <span>4. Dossiers Allocations ({countDossiers})</span>
        </button>
      </div>

      {/* Barre de recherche et sous-filtre pour les retards */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrer par nom, matricule ou motif..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {activeTab === 'NON_A_JOUR' && (
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-slate-500 font-semibold shrink-0">Filtrer retard :</span>
            <select
              value={filterRetardJours}
              onChange={(e) => setFilterRetardJours(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value={0}>Tous les adhérents en retard</option>
              <option value={7}>Retard &gt; 7 jours</option>
              <option value={15}>Retard &gt; 15 jours</option>
              <option value={30}>Retard &gt; 30 jours (Critique)</option>
            </select>
          </div>
        )}
      </div>

      {/* Liste des cartes d'alertes */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white p-12 text-center text-xs text-slate-500 rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <p className="font-bold text-slate-800">Toutes les situations sont régularisées !</p>
            <p className="text-slate-400 mt-0.5">Aucune alerte correspondante pour ce filtre.</p>
          </div>
        ) : (
          filteredAlerts.map((al) => {
            const isUrgent = al.niveau === 'urgent';
            const isWarning = al.niveau === 'warning';

            return (
              <div
                key={al.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                  isUrgent
                    ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                    : isWarning
                    ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                    : 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded ${
                        isUrgent
                          ? 'bg-rose-200 text-rose-900'
                          : isWarning
                          ? 'bg-amber-200 text-amber-950'
                          : 'bg-emerald-200 text-emerald-950'
                      }`}
                    >
                      {al.matricule}
                    </span>

                    <button
                      onClick={() => onSelectAdherent(al.adherentId)}
                      className="font-bold text-xs text-slate-900 hover:underline cursor-pointer"
                    >
                      {al.adherentNom}
                    </button>

                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {al.niveau === 'urgent'
                        ? 'Urgent'
                        : al.niveau === 'warning'
                        ? 'Attention'
                        : 'Information'}
                    </span>
                  </div>

                  <h3 className="text-xs font-extrabold text-slate-900 pt-1">
                    {al.titre}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {al.message}
                  </p>
                </div>

                {/* Bouton d'action directe */}
                <div className="shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleAction(al)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98 ${
                      al.type === 'SEUIL_15000_ATTEINT' || al.type === 'VERIFICATION_15_30'
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : al.type === 'NON_A_JOUR'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <span>{al.actionRequise || 'Traiter l\'alerte'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
