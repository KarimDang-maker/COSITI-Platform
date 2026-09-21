import React from 'react';
import { Cotisation, Adherent, ParametresApp } from '../types';
import { formatFCFA, formatDateFr } from '../utils/helpers';
import { Printer, X, CheckCircle2, Shield } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotisation: Cotisation | null;
  adherent?: Adherent | null;
  parametres: ParametresApp;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  cotisation,
  adherent,
  parametres,
}) => {
  if (!isOpen || !cotisation) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Actions bar (hidden in print) */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2 text-slate-700 text-sm font-semibold">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Reçu officiel d'encaissement de cotisation</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimer le reçu
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reçu imprimable */}
        <div className="p-8 bg-white text-slate-900 print:p-0 print:m-0" id="printable-receipt">
          {/* Entête institutionnelle */}
          <div className="border-b-2 border-emerald-800 pb-4 mb-5 text-center relative">
            <div className="inline-block px-3 py-1 bg-emerald-800 text-white text-xs font-extrabold rounded-md tracking-wider uppercase mb-1">
              {parametres.sigle || 'COSITI'}
            </div>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              {parametres.nomOrganisation}
            </h1>
            <p className="text-[11px] text-emerald-800 font-semibold italic mt-0.5">
              « {parametres.slogan} »
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              {parametres.adresse} • Tél : {parametres.telephone} • Email : {parametres.email}
            </p>
          </div>

          {/* Titre du document et numéro */}
          <div className="flex items-center justify-between bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/60 mb-5">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                REÇU DE COTISATION
              </span>
              <span className="text-xs font-mono font-bold text-slate-800">
                N° {cotisation.reference || `REC-${cotisation.id.slice(-6).toUpperCase()}`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Date d'encaissement</span>
              <span className="text-xs font-bold text-slate-800">
                {formatDateFr(cotisation.datePaiement)}
              </span>
            </div>
          </div>

          {/* Adhérent & Cotisation détails */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-5">
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Identité de l'Adhérent
              </span>
              <div className="font-bold text-slate-900 text-sm">
                {cotisation.adherentNomPrenom}
              </div>
              <div>
                <span className="text-slate-500">Matricule : </span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  {cotisation.matricule}
                </span>
              </div>
              {adherent && (
                <>
                  <div>
                    <span className="text-slate-500">Activité : </span>
                    <span className="font-medium text-slate-800">{adherent.profession}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Téléphone : </span>
                    <span className="font-medium text-slate-800">{adherent.telephone}</span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Détails du Paiement
              </span>
              <div>
                <span className="text-slate-500">Mode : </span>
                <span className="font-semibold text-slate-800">{cotisation.modePaiement}</span>
              </div>
              <div>
                <span className="text-slate-500">Période : </span>
                <span className="font-semibold text-slate-800">
                  {cotisation.mois} {cotisation.annee}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Agent guichet : </span>
                <span className="font-medium text-slate-800">{cotisation.agentEnregistreur}</span>
              </div>
              {cotisation.observations && (
                <div className="text-[11px] text-slate-600 italic">
                  Note : {cotisation.observations}
                </div>
              )}
            </div>
          </div>

          {/* Grand encadré Montant */}
          <div className="bg-emerald-700 text-white p-4 rounded-xl text-center shadow-xs mb-6">
            <span className="text-[11px] uppercase tracking-widest font-semibold opacity-90 block mb-1">
              Montant Total Encaissé
            </span>
            <div className="text-3xl font-extrabold tracking-tight">
              {formatFCFA(cotisation.montant)}
            </div>
            <div className="text-[11px] mt-1 opacity-90 flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Paiement certifié régulier auprès de la COSITI</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-200">
            <div className="text-center">
              <span className="text-slate-500 font-medium block mb-8">L'Adhérent</span>
              <div className="h-6 border-b border-dashed border-slate-400 mx-6"></div>
              <span className="text-[10px] text-slate-400 mt-1 block">Signature ou émargement</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 font-medium block mb-8">
                Pour la COSITI (Caisse / Agent)
              </span>
              <div className="h-6 border-b border-dashed border-slate-400 mx-6 font-script text-emerald-800 text-sm italic">
                {cotisation.agentEnregistreur}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Cachet & Signature</span>
            </div>
          </div>

          <div className="mt-8 pt-3 border-t border-slate-100 text-[10px] text-center text-slate-400">
            Document généré informatiquement par le système de gestion COSITI • Conservez ce reçu pour tout droit ou prestation sociale.
          </div>
        </div>
      </div>
    </div>
  );
};
