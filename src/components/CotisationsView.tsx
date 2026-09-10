import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Cotisation, ModePaiement } from '../types';
import { formatFCFA, formatDateShort } from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import { getUserPermissions } from '../utils/permissions';
import {
  CreditCard,
  Search,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  Edit,
  Trash2,
  Calendar,
  X,
  Filter,
  User,
  Eye,
} from 'lucide-react';

interface CotisationsViewProps {
  onOpenNewCotisation: () => void;
  onSelectAdherent: (id: string) => void;
  onViewReceipt: (cot: Cotisation) => void;
  onEditCotisation: (cot: Cotisation) => void;
  onDeleteCotisation: (cot: Cotisation) => void;
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

export const CotisationsView: React.FC<CotisationsViewProps> = ({
  onOpenNewCotisation,
  onSelectAdherent,
  onViewReceipt,
  onEditCotisation,
  onDeleteCotisation,
}) => {
  const { cotisations, currentUser } = useApp();
  const permissions = getUserPermissions(currentUser);

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<string>('TOUS');
  const [filterMois, setFilterMois] = useState<string>('TOUS');
  const [filterAnnee, setFilterAnnee] = useState<string>('TOUS');
  const [filterAgent, setFilterAgent] = useState<string>('TOUS');

  // Extraire agents uniques
  const distinctAgents = Array.from(new Set(cotisations.map((c) => c.agentEnregistreur)));

  // Filtrage
  const filteredCotisations = cotisations
    .filter((cot) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        cot.matricule.toLowerCase().includes(q) ||
        cot.adherentNomPrenom.toLowerCase().includes(q) ||
        cot.reference?.toLowerCase().includes(q) ||
        cot.datePaiement.includes(q) ||
        String(cot.montant).includes(q);

      const matchesMode = filterMode === 'TOUS' || cot.modePaiement === filterMode;
      const matchesMois = filterMois === 'TOUS' || cot.mois === filterMois;
      const matchesAnnee = filterAnnee === 'TOUS' || String(cot.annee) === filterAnnee;
      const matchesAgent = filterAgent === 'TOUS' || cot.agentEnregistreur === filterAgent;

      return matchesSearch && matchesMode && matchesMois && matchesAnnee && matchesAgent;
    })
    .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime());

  // Calcul du montant total filtré
  const totalEncaisse = filteredCotisations.reduce((sum, c) => sum + c.montant, 0);

  const handleExportExcel = () => {
    const exportData = filteredCotisations.map((c) => ({
      Matricule: c.matricule,
      'Nom de l\'adhérent': c.adherentNomPrenom,
      'Date de versement': c.datePaiement,
      'Montant (FCFA)': c.montant,
      'Mode de paiement': c.modePaiement,
      Référence: c.reference || '',
      Mois: c.mois,
      Année: c.annee,
      'Agent enregistreur': c.agentEnregistreur,
      Observations: c.observations || '',
    }));

    exportToExcel(exportData, `Cotisations_COSITI_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Registre des Cotisations Journalières
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des encaissements (700 F & 1 000 F / jour), versements groupés et reçus officiels
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Exporter la liste en Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          {permissions.canRecord && (
            <button
              onClick={onOpenNewCotisation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <CreditCard className="w-4 h-4" />
              <span>Encaisser une cotisation</span>
            </button>
          )}
        </div>
      </div>

      {/* Bannière d'information si Profil Consultation */}
      {permissions.isReadOnly && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Eye className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Profil {currentUser.role} (Accès Consultation) :</strong> Consultation exhaustive du registre, export Excel et réimpression des reçus de caisse autorisés. L'encaissement direct est réservé à la Caissière et aux profils habilités.
            </span>
          </div>
        </div>
      )}

      {/* Barre de recherche et filtres rapides */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Recherche */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par Matricule, Adhérent, Référence, Montant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mode de paiement */}
          <div>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous les modes</option>
              <option value="Espèces">Espèces</option>
              <option value="Wave">Wave</option>
              <option value="Orange Money">Orange Money</option>
              <option value="MTN MoMo">MTN MoMo</option>
              <option value="Moov Money">Moov Money</option>
              <option value="Virement bancaire">Virement bancaire</option>
              <option value="Chèque">Chèque</option>
            </select>
          </div>

          {/* Mois */}
          <div>
            <select
              value={filterMois}
              onChange={(e) => setFilterMois(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous les mois</option>
              {MOIS_LIST.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Agent */}
          <div>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              <option value="TOUS">Tous les agents</option>
              {distinctAgents.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicateurs synthèse du tableau */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-100 gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">
              <strong>{filteredCotisations.length}</strong> versement(s) trouvé(s)
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700">
              Total cumulé filtré :{' '}
              <strong className="text-emerald-800 font-mono font-extrabold">
                {formatFCFA(totalEncaisse)}
              </strong>
            </span>
          </div>

          {(search || filterMode !== 'TOUS' || filterMois !== 'TOUS' || filterAgent !== 'TOUS') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterMode('TOUS');
                setFilterMois('TOUS');
                setFilterAnnee('TOUS');
                setFilterAgent('TOUS');
              }}
              className="text-emerald-700 font-semibold hover:underline text-[11px]"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Tableau des cotisations */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredCotisations.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Aucune cotisation trouvée pour ces critères.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Matricule & Adhérent</th>
                  <th className="px-4 py-3.5">Montant</th>
                  <th className="px-4 py-3.5">Mode de paiement</th>
                  <th className="px-4 py-3.5">Référence</th>
                  <th className="px-4 py-3.5">Période</th>
                  <th className="px-4 py-3.5">Agent</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCotisations.map((cot) => (
                  <tr key={cot.id} className="hover:bg-slate-50 transition-colors">
                    {/* Date */}
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {formatDateShort(cot.datePaiement)}
                    </td>

                    {/* Matricule & Nom */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onSelectAdherent(cot.adherentId)}
                        className="text-left group cursor-pointer block"
                      >
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] mr-1.5 border border-emerald-200/60">
                          {cot.matricule}
                        </span>
                        <span className="font-bold text-slate-900 group-hover:text-emerald-700 group-hover:underline">
                          {cot.adherentNomPrenom}
                        </span>
                      </button>
                    </td>

                    {/* Montant */}
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-800 text-sm">
                      {formatFCFA(cot.montant)}
                    </td>

                    {/* Mode */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {cot.modePaiement}
                      </span>
                    </td>

                    {/* Référence */}
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {cot.reference || '—'}
                    </td>

                    {/* Période */}
                    <td className="px-4 py-3 text-slate-700">
                      {cot.mois} {cot.annee}
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {cot.agentEnregistreur}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Imprimer le reçu officiel */}
                        <button
                          onClick={() => onViewReceipt(cot)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                          title="Imprimer le reçu de paiement officiel"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reçu</span>
                        </button>

                        {/* Modifier cotisation (code 0000 requis) */}
                        {permissions.canEditRecords && (
                          <button
                            onClick={() => onEditCotisation(cot)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Modifier ce versement (Code 0000 requis)"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Supprimer cotisation (code 0000 requis) */}
                        {permissions.canDeleteRecords && (
                          <button
                            onClick={() => onDeleteCotisation(cot)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer ce versement (Code 0000 requis)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
