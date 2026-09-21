import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Adherent, Cotisation, DossierAllocations } from '../types';
import { formatFCFA, formatDateShort, calculateAdherentStats } from '../utils/helpers';
import { exportToExcel } from '../utils/exportUtils';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  AlertTriangle,
  BadgeCheck,
  FolderHeart,
  CreditCard,
  Calendar,
  Users,
  Search,
  Download,
} from 'lucide-react';

type RapportType =
  | 'GLOBALE_ADHERENTS'
  | 'ADHERENTS_A_JOUR'
  | 'ADHERENTS_NON_A_JOUR'
  | 'SEUIL_15000_ATTEINT'
  | 'A_IMMATRICULER'
  | 'DEJA_IMMATRICULES'
  | 'DOSSIERS_A_CONSTITUER'
  | 'COTISATIONS_JOURNALIERES'
  | 'COTISATIONS_MENSUELLES'
  | 'FICHE_INDIVIDUELLE';

export const RapportsView: React.FC = () => {
  const { adherents, cotisations, dossiers, parametres } = useApp();

  const [selectedRapport, setSelectedRapport] = useState<RapportType>('GLOBALE_ADHERENTS');
  const [selectedAdherentId, setSelectedAdherentId] = useState<string>(
    adherents.length > 0 ? adherents[0].id : ''
  );
  const [selectedMois, setSelectedMois] = useState<string>('Mars');
  const [selectedAnnee, setSelectedAnnee] = useState<number>(new Date().getFullYear());

  // Calculs préalables
  const adherentsWithStats = adherents.map((adh) => ({
    adh,
    stats: calculateAdherentStats(adh, cotisations, parametres),
  }));

  // Génération des données selon le rapport sélectionné
  let title = '';
  let description = '';
  let reportData: any[] = [];
  let tableHeaders: string[] = [];
  let tableRows: any[][] = [];

  switch (selectedRapport) {
    case 'GLOBALE_ADHERENTS':
      title = '1. Liste globale des adhérents COSITI';
      description = 'Répertoire complet de tous les membres enregistrés dans la coopérative';
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Sexe', 'Téléphone', 'Profession', 'Date Adhésion', 'Statut', 'Cumul Cotisé (FCFA)'];
      tableRows = adherentsWithStats.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.sexe,
        adh.telephone,
        adh.profession,
        formatDateShort(adh.dateAdhesion),
        adh.statut,
        formatFCFA(stats.totalCumule),
      ]);
      reportData = adherentsWithStats.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: adh.nom,
        Prénom: adh.prenom,
        Sexe: adh.sexe,
        Téléphone: adh.telephone,
        Profession: adh.profession,
        DateAdhésion: adh.dateAdhesion,
        Statut: adh.statut,
        CumulCotisé: stats.totalCumule,
      }));
      break;

    case 'ADHERENTS_A_JOUR':
      title = '2. Liste des adhérents à jour de leurs cotisations';
      description = 'Adhérents dont la couverture journalière est conforme à la date actuelle';
      const aJourList = adherentsWithStats.filter(({ stats }) => stats.statutCotisation === 'À jour');
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Téléphone', 'Tarif/Jour', 'Total Cumulé (FCFA)', 'Jours Couverts', 'Statut'];
      tableRows = aJourList.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.telephone,
        `${adh.tarifJournalier} F`,
        formatFCFA(stats.totalCumule),
        `${stats.nombreJoursCotises} j`,
        stats.statutCotisation,
      ]);
      reportData = aJourList.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        Téléphone: adh.telephone,
        TarifJournalier: adh.tarifJournalier,
        TotalCumule: stats.totalCumule,
        JoursCotises: stats.nombreJoursCotises,
      }));
      break;

    case 'ADHERENTS_NON_A_JOUR':
      title = '3. Liste des adhérents non à jour de leurs cotisations';
      description = 'Adhérents accusant un retard de versement ou n’ayant aucun paiement';
      const nonAJourList = adherentsWithStats.filter(({ stats }) => stats.statutCotisation !== 'À jour');
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Téléphone', 'Dernier Versement', 'Jours Retard', 'Cumul Actuel (FCFA)', 'Statut'];
      tableRows = nonAJourList.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.telephone,
        stats.dateDernierVersement ? formatDateShort(stats.dateDernierVersement) : 'Jamais cotisé',
        `${stats.joursRetard} jours`,
        formatFCFA(stats.totalCumule),
        stats.statutCotisation,
      ]);
      reportData = nonAJourList.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        Téléphone: adh.telephone,
        DernierVersement: stats.dateDernierVersement || 'Aucun',
        JoursRetard: stats.joursRetard,
        TotalCumule: stats.totalCumule,
      }));
      break;

    case 'SEUIL_15000_ATTEINT':
      title = '4. Liste des adhérents ayant atteint le seuil de 15 000 FCFA';
      description = 'Membres éligibles aux prestations sociales ayant cotisé 15 000 FCFA ou plus';
      const seuilList = adherentsWithStats.filter(({ stats }) => stats.totalCumule >= parametres.seuilImmatriculation);
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Profession', 'Téléphone', 'Cumul Cotisé (FCFA)', 'Statut Immatriculation', 'N° CNPS'];
      tableRows = seuilList.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.profession,
        adh.telephone,
        formatFCFA(stats.totalCumule),
        adh.statutImmatriculation,
        adh.numeroCnps || 'En attente',
      ]);
      reportData = seuilList.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        Profession: adh.profession,
        Téléphone: adh.telephone,
        TotalCumule: stats.totalCumule,
        StatutImmatriculation: adh.statutImmatriculation,
        NumeroCnps: adh.numeroCnps || '',
      }));
      break;

    case 'A_IMMATRICULER':
      title = '5. Liste des adhérents prioritaires à immatriculer';
      description = 'Adhérents ayant franchi le seuil de 15 000 FCFA mais pas encore enregistrés à la CNPS';
      const aImmat = adherentsWithStats.filter(
        ({ adh, stats }) => stats.totalCumule >= parametres.seuilImmatriculation && adh.statutImmatriculation !== 'Immatriculé'
      );
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'CNI', 'Téléphone', 'Cumul Atteint (FCFA)', 'Date Adhésion', 'Action'];
      tableRows = aImmat.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.cni || 'Non renseignée',
        adh.telephone,
        formatFCFA(stats.totalCumule),
        formatDateShort(adh.dateAdhesion),
        'À déclarer CNPS',
      ]);
      reportData = aImmat.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        CNI: adh.cni,
        Téléphone: adh.telephone,
        Cumul: stats.totalCumule,
        DateAdhésion: adh.dateAdhesion,
      }));
      break;

    case 'DEJA_IMMATRICULES':
      title = '6. Liste des adhérents déjà immatriculés à la CNPS';
      description = 'Adhérents dotés d’un numéro d’immatriculation officiel de sécurité sociale';
      const dejaImmat = adherentsWithStats.filter(({ adh }) => adh.statutImmatriculation === 'Immatriculé');
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Numéro CNPS', 'Date Immatriculation', 'Téléphone', 'Cumul Cotisé (FCFA)'];
      tableRows = dejaImmat.map(({ adh, stats }) => [
        adh.matricule,
        `${adh.nom} ${adh.prenom}`,
        adh.numeroCnps || 'N/A',
        adh.dateImmatriculation ? formatDateShort(adh.dateImmatriculation) : '—',
        adh.telephone,
        formatFCFA(stats.totalCumule),
      ]);
      reportData = dejaImmat.map(({ adh, stats }) => ({
        Matricule: adh.matricule,
        Nom: `${adh.nom} ${adh.prenom}`,
        NumeroCnps: adh.numeroCnps,
        DateImmatriculation: adh.dateImmatriculation,
        Téléphone: adh.telephone,
        TotalCumule: stats.totalCumule,
      }));
      break;

    case 'DOSSIERS_A_CONSTITUER':
      title = '7. Dossiers d’allocations familiales à constituer / compléter';
      description = 'Adhérents immatriculés dont le dossier de prestations n’est pas encore complet ou validé';
      tableHeaders = ['Matricule', 'Nom & Prénoms', 'Statut Dossier', 'Pièces Fournies', 'Certificats Scolarité', 'Enfants', 'Date Transmission'];
      tableRows = dossiers.map((dos) => [
        dos.matricule,
        dos.adherentNomPrenom,
        dos.statut,
        `${dos.pieces.filter((p) => p.recu).length}/${dos.pieces.length}`,
        dos.certificatsScolariteFournis ? 'Fournis' : 'Manquants',
        `${dos.nombreEnfants || 0} enfant(s)`,
        dos.dateTransmission ? formatDateShort(dos.dateTransmission) : 'Non transmis',
      ]);
      reportData = dossiers.map((d) => ({
        Matricule: d.matricule,
        Adhérent: d.adherentNomPrenom,
        StatutDossier: d.statut,
        NombreEnfants: d.nombreEnfants,
        CertificatsScolarité: d.certificatsScolariteFournis ? 'OUI' : 'NON',
        DateTransmission: d.dateTransmission || '',
      }));
      break;

    case 'COTISATIONS_JOURNALIERES':
      title = '8. État récapitulatif des cotisations journalières';
      description = 'Enregistrement de tous les encaissements journaliers avec ventilation par mode';
      tableHeaders = ['Date', 'Matricule', 'Adhérent', 'Montant (FCFA)', 'Mode de paiement', 'Référence', 'Agent'];
      tableRows = cotisations.map((c) => [
        formatDateShort(c.datePaiement),
        c.matricule,
        c.adherentNomPrenom,
        formatFCFA(c.montant),
        c.modePaiement,
        c.reference || '—',
        c.agentEnregistreur,
      ]);
      reportData = cotisations.map((c) => ({
        Date: c.datePaiement,
        Matricule: c.matricule,
        Adhérent: c.adherentNomPrenom,
        Montant: c.montant,
        Mode: c.modePaiement,
        Référence: c.reference,
        Agent: c.agentEnregistreur,
      }));
      break;

    case 'COTISATIONS_MENSUELLES':
      title = `9. État récapitulatif mensuel des cotisations (${selectedMois} ${selectedAnnee})`;
      description = 'Synthèse financière filtrée par mois et année avec totaux consolidés';
      const cotisMois = cotisations.filter((c) => c.mois === selectedMois && c.annee === selectedAnnee);
      tableHeaders = ['Date Paiement', 'Matricule', 'Adhérent', 'Montant (FCFA)', 'Mode', 'Référence', 'Agent'];
      tableRows = cotisMois.map((c) => [
        formatDateShort(c.datePaiement),
        c.matricule,
        c.adherentNomPrenom,
        formatFCFA(c.montant),
        c.modePaiement,
        c.reference || '—',
        c.agentEnregistreur,
      ]);
      reportData = cotisMois.map((c) => ({
        Date: c.datePaiement,
        Matricule: c.matricule,
        Adhérent: c.adherentNomPrenom,
        Montant: c.montant,
        Mode: c.modePaiement,
      }));
      break;

    case 'FICHE_INDIVIDUELLE':
      const targetAdh = adherents.find((a) => a.id === selectedAdherentId) || adherents[0];
      const targetStats = targetAdh ? calculateAdherentStats(targetAdh, cotisations, parametres) : null;
      const targetCotis = cotisations.filter((c) => c.adherentId === targetAdh?.id);

      title = `10. Fiche individuelle d'adhérent : ${targetAdh?.matricule || ''}`;
      description = `Relevé complet de cotisations pour ${targetAdh?.nom} ${targetAdh?.prenom}`;
      tableHeaders = ['Date', 'Montant (FCFA)', 'Mois', 'Mode de paiement', 'Référence', 'Agent'];
      tableRows = targetCotis.map((c) => [
        formatDateShort(c.datePaiement),
        formatFCFA(c.montant),
        `${c.mois} ${c.annee}`,
        c.modePaiement,
        c.reference || '—',
        c.agentEnregistreur,
      ]);
      reportData = targetCotis.map((c) => ({
        Matricule: targetAdh?.matricule,
        Nom: targetAdh?.nom,
        Date: c.datePaiement,
        Montant: c.montant,
        Mode: c.modePaiement,
      }));
      break;
  }

  const handleExport = () => {
    exportToExcel(reportData, `Rapport_COSITI_${selectedRapport}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Rapports & États Statistiques Réglementaires
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Génération instantanée des 10 états officiels avec export Excel et impression PDF
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / PDF</span>
          </button>
        </div>
      </div>

      {/* Grille de sélection des 10 Rapports */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 print:hidden">
        {[
          { id: 'GLOBALE_ADHERENTS', label: '1. Liste globale adhérents' },
          { id: 'ADHERENTS_A_JOUR', label: '2. Adhérents à jour' },
          { id: 'ADHERENTS_NON_A_JOUR', label: '3. Adhérents non à jour' },
          { id: 'SEUIL_15000_ATTEINT', label: '4. Seuil 15 000 F atteint' },
          { id: 'A_IMMATRICULER', label: '5. À immatriculer CNPS' },
          { id: 'DEJA_IMMATRICULES', label: '6. Déjà immatriculés' },
          { id: 'DOSSIERS_A_CONSTITUER', label: '7. Dossiers Allocations' },
          { id: 'COTISATIONS_JOURNALIERES', label: '8. Cotisations du jour' },
          { id: 'COTISATIONS_MENSUELLES', label: '9. Cotisations du mois' },
          { id: 'FICHE_INDIVIDUELLE', label: '10. Fiche individuelle' },
        ].map((rep) => (
          <button
            key={rep.id}
            onClick={() => setSelectedRapport(rep.id as RapportType)}
            className={`p-3 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
              selectedRapport === rep.id
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {rep.label}
          </button>
        ))}
      </div>

      {/* Filtres contextuels selon rapport (Mois ou Adhérent) */}
      {selectedRapport === 'COTISATIONS_MENSUELLES' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4 print:hidden text-xs">
          <span className="font-bold text-slate-700">Sélectionner le mois :</span>
          <select
            value={selectedMois}
            onChange={(e) => setSelectedMois(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
          >
            {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(parseInt(e.target.value, 10))}
            className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
          />
        </div>
      )}

      {selectedRapport === 'FICHE_INDIVIDUELLE' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4 print:hidden text-xs">
          <span className="font-bold text-slate-700">Sélectionner l'adhérent :</span>
          <select
            value={selectedAdherentId}
            onChange={(e) => setSelectedAdherentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium max-w-md"
          >
            {adherents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.matricule} — {a.nom} {a.prenom} ({a.profession})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Rendu imprimable du rapport */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        {/* En-tête officiel imprimable */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-mono font-extrabold text-emerald-800 tracking-wider">
                {parametres.nomOrganisation} ({parametres.sigle})
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <div>Édité le {new Date().toLocaleDateString('fr-FR')}</div>
              <div className="font-bold text-slate-600">Total lignes : {tableRows.length}</div>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                {tableHeaders.map((h, i) => (
                  <th key={i} className="px-3 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="p-8 text-center text-slate-400">
                    Aucun élément à afficher pour ce rapport.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
