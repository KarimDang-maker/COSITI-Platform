import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateShort } from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import { getUserPermissions } from '../utils/permissions';
import {
  History,
  Search,
  FileSpreadsheet,
  Shield,
  CheckCircle2,
  Trash2,
  Edit,
  PlusCircle,
  BadgeCheck,
  User,
} from 'lucide-react';

export const JournalView: React.FC = () => {
  const { journal, clearJournal, currentUser } = useApp();
  const permissions = getUserPermissions(currentUser);

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('TOUS');

  const filteredJournal = journal.filter((entry) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      entry.utilisateur.toLowerCase().includes(q) ||
      entry.action.toLowerCase().includes(q) ||
      entry.details.toLowerCase().includes(q) ||
      (entry.matricule && entry.matricule.toLowerCase().includes(q));

    const matchesAction = filterAction === 'TOUS' || entry.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const handleExportExcel = () => {
    const data = filteredJournal.map((j) => ({
      'Date & Heure': j.dateHeure,
      Utilisateur: j.utilisateur,
      Rôle: j.role,
      Action: j.action,
      Entité: j.entite,
      Matricule: j.matricule || 'N/A',
      'Code 0000 validé': j.codeSecuriteValide ? 'OUI' : 'NON',
      Détails: j.details,
    }));
    exportToExcel(data, `Journal_Audit_COSITI_${new Date().toISOString().slice(0, 10)}`);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'AJOUT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Création
          </span>
        );
      case 'MODIFICATION':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
            Modification
          </span>
        );
      case 'SUPPRESSION':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            Suppression
          </span>
        );
      case 'IMMATRICULATION':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
            Immatriculation CNPS
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Journal d'Audit & Traçabilité des Opérations</span>
            <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-md">
              {journal.length} opération(s)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Historique exhaustif et horodaté de toutes les créations, modifications (code 0000) et suppressions
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          {permissions.canManageUsers && (
            <button
              onClick={() => {
                if (confirm('Voulez-vous réinitialiser le journal d\'audit ?')) {
                  clearJournal();
                }
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Vider le journal
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche et filtre */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par utilisateur, action, matricule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-slate-500 font-semibold shrink-0">Action :</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            <option value="TOUS">Toutes les actions</option>
            <option value="AJOUT">Créations</option>
            <option value="MODIFICATION">Modifications (Code 0000)</option>
            <option value="SUPPRESSION">Suppressions (Code 0000)</option>
            <option value="IMMATRICULATION">Immatriculations CNPS</option>
            <option value="DOSSIER">Dossiers Allocations</option>
          </select>
        </div>
      </div>

      {/* Tableau du Journal */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredJournal.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Aucun enregistrement dans le journal pour ces critères.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Date & Heure</th>
                  <th className="px-4 py-3.5">Utilisateur</th>
                  <th className="px-4 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Entité / Matricule</th>
                  <th className="px-4 py-3.5">Sécurité</th>
                  <th className="px-4 py-3.5">Détails de l'opération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJournal.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    {/* Date */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(entry.dateHeure).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* Utilisateur */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{entry.utilisateur}</div>
                      <div className="text-[10px] text-slate-400">{entry.role}</div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">{getActionBadge(entry.action)}</td>

                    {/* Entité & Matricule */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-700">{entry.entite}</div>
                      {entry.matricule && (
                        <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                          {entry.matricule}
                        </span>
                      )}
                    </td>

                    {/* Sécurité */}
                    <td className="px-4 py-3">
                      {entry.codeSecuriteValide ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Shield className="w-3 h-3 mr-1 text-amber-600" />
                          Code 0000 validé
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* Détails */}
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-md">
                      {entry.details}
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
