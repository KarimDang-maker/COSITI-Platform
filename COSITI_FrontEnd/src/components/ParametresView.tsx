import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatFCFA } from '../utils/helpers';
import { getUserPermissions, ROLES_CONFIG } from '../utils/permissions';
import {
  Settings,
  Shield,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  Building,
  Save,
  Download,
  Eye,
  Users,
  Lock,
  UserCheck,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Utilisateur } from '../types';
import { MiseAJourLogicielModal } from './MiseAJourLogicielModal';
import { UserSwitchModal } from './UserSwitchModal';

export const ParametresView: React.FC = () => {
  const {
    parametres,
    updateParametres,
    resetToDemoData,
    adherents,
    cotisations,
    currentUser,
    utilisateurs,
    setCurrentUser,
    setActiveTab,
  } = useApp();
  const permissions = getUserPermissions(currentUser);

  const [nomOrganisation, setNomOrganisation] = useState(parametres.nomOrganisation);
  const [sigle, setSigle] = useState(parametres.sigle);
  const [seuilImmatriculation, setSeuilImmatriculation] = useState(
    parametres.seuilImmatriculation
  );
  const [joursVerification, setJoursVerification] = useState(
    (parametres.joursVerification || parametres.joursVerificationCycle || [15, 30]).join(', ')
  );
  const [adresse, setAdresse] = useState(
    parametres.adresse || 'Avenue des Banques, Quartier Bonanjo, B.P. 3140 Douala, Cameroun'
  );
  const [telephone, setTelephone] = useState(
    parametres.telephone || '+237 233 42 15 89 / +237 677 88 99 00'
  );
  const [email, setEmail] = useState(parametres.email || 'contact@cositi-cameroun.cm');

  const [isSaved, setIsSaved] = useState(false);
  const [isMiseAJourModalOpen, setIsMiseAJourModalOpen] = useState(false);
  const [targetUserForSwitch, setTargetUserForSwitch] = useState<Utilisateur | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canConfigure) return;

    const parsedJours = joursVerification
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    const finalJours = parsedJours.length > 0 ? parsedJours : [15, 30];

    updateParametres({
      nomOrganisation,
      sigle,
      seuilImmatriculation: Number(seuilImmatriculation),
      joursVerification: finalJours,
      joursVerificationCycle: finalJours,
      adresse,
      telephone,
      email,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportBackup = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      parametres,
      adherents,
      cotisations,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COSITI_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Paramètres du Système & Règles Métier
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuration des seuils, montants de cotisation, sécurité et coordonnées officielles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire principal des paramètres */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>Paramètres Généraux & Règles Métier</span>
              </h2>

              {!permissions.canConfigure && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  <Eye className="w-3 h-3 mr-1 text-amber-700" />
                  Lecture seule ({currentUser.role})
                </span>
              )}
            </div>

            {!permissions.canConfigure && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-center space-x-2.5">
                <Eye className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Profil {currentUser.role} (Accès {currentUser.typeAcces}) :</strong> Vous consultez la configuration en lecture seule. La modification des règles métier et des seuils est réservée à la Direction Générale (DG / DGA).
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nom de l'organisation
                </label>
                <input
                  type="text"
                  required
                  disabled={!permissions.canConfigure}
                  value={nomOrganisation}
                  onChange={(e) => setNomOrganisation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sigle officiel
                </label>
                <input
                  type="text"
                  required
                  disabled={!permissions.canConfigure}
                  value={sigle}
                  onChange={(e) => setSigle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seuil d'immatriculation CNPS (FCFA) *
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  disabled={!permissions.canConfigure}
                  value={seuilImmatriculation}
                  onChange={(e) => setSeuilImmatriculation(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Fixé à 15 000 FCFA conformément au cahier des charges.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jours du cycle de vérification
                </label>
                <input
                  type="text"
                  required
                  disabled={!permissions.canConfigure}
                  value={joursVerification}
                  onChange={(e) => setJoursVerification(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Séparés par une virgule (ex: 15, 30).
                </p>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Coordonnées officielles & Contact (Cameroun)
                </span>
                {permissions.canConfigure && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdresse('Avenue des Banques, Quartier Bonanjo, B.P. 3140 Douala, Cameroun');
                      setTelephone('+237 233 42 15 89 / +237 677 88 99 00');
                      setEmail('contact@cositi-cameroun.cm');
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Rétablir coordonnées Cameroun (+237 / Douala)
                  </button>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Adresse du siège (Cameroun)
                </label>
                <input
                  type="text"
                  disabled={!permissions.canConfigure}
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Ex: Avenue des Banques, Quartier Bonanjo, B.P. 3140 Douala, Cameroun"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Téléphone coopérative (Indicatif +237)
                </label>
                <input
                  type="text"
                  disabled={!permissions.canConfigure}
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+237 233 42 15 89 / +237 677 88 99 00"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email officiel
                </label>
                <input
                  type="email"
                  disabled={!permissions.canConfigure}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@cositi-cameroun.cm"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              {isSaved ? (
                <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Paramètres enregistrés avec succès !</span>
                </span>
              ) : (
                <span />
              )}

              {permissions.canConfigure ? (
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder les paramètres</span>
                </button>
              ) : (
                <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Configuration réservée à la Direction Générale</span>
                </span>
              )}
            </div>
          </form>

          {/* Sauvegarde et export des données */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Sauvegarde & Données de l'application</span>
            </h2>
            <p className="text-xs text-slate-600">
              Exportez à tout moment l'ensemble des données (adhérents, cotisations, journal d'audit) au format JSON sécurisé.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger sauvegarde complète (JSON)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Colonne latérale : Sécurité Code 0000 & Réinitialisation */}
        <div className="space-y-6">
          {/* Fiche Code 0000 */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Code de Sécurité Obligatoire
              </h3>
            </div>
            <p className="text-xs text-amber-950 leading-relaxed">
              Pour prévenir toute erreur ou manipulation non autorisée, les actions sensibles exigent la confirmation par le code :
            </p>
            <div className="p-3 bg-white rounded-xl border border-amber-300 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Code de validation
              </span>
              <span className="text-2xl font-extrabold font-mono text-amber-900 tracking-widest">
                0000
              </span>
            </div>
            <ul className="text-[11px] text-amber-900 space-y-1 list-disc pl-4">
              <li>Modification d'un adhérent</li>
              <li>Suppression d'un adhérent</li>
              <li>Modification d'une cotisation</li>
              <li>Suppression d'une cotisation</li>
            </ul>
          </div>

          {/* Carte Mise à jour du logiciel (Effacement total des données - Mot de passe 1111) */}
          <div className="bg-rose-50/80 border-2 border-rose-300 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center space-x-2 text-rose-900">
              <RefreshCw className="w-5 h-5 text-rose-700 animate-spin-slow" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                Mise à jour du Logiciel
              </h3>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed">
              Bouton officiel de <strong>mise à jour du logiciel</strong> qui efface toutes les données enregistrées
              (adhérents, cotisations, dossiers CNPS) pour démarrer un nouveau cycle propre.
            </p>
            <div className="p-2.5 bg-white/90 rounded-xl border border-rose-200 text-[11px] text-rose-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Mot de passe de validation :</span>
                <span className="font-mono font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-xs">
                  1111
                </span>
              </div>
              <p className="text-[10px] text-rose-600">
                Permet ensuite de renseigner le nouveau paramétrage (utilisateurs, postes et codes d'accès).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMiseAJourModalOpen(true)}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Mettre à jour le logiciel (Code 1111)</span>
            </button>
          </div>

          {/* Réinitialisation aux données démo */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Jeu de Démonstration COSITI
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Si vous souhaitez recharger le jeu de données d'exemple complet (adhérents du secteur informel, cotisations 700/1000F, CNPS).
            </p>
            <button
              type="button"
              disabled={!permissions.canResetDemo}
              onClick={() => {
                if (!permissions.canResetDemo) return;
                if (confirm('Voulez-vous recharger les données de démonstration ?')) {
                  resetToDemoData();
                  alert('Données de démonstration rechargées.');
                }
              }}
              className={`w-full py-2 text-xs font-bold rounded-xl transition-colors ${
                permissions.canResetDemo
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {permissions.canResetDemo ? 'Recharger les données de démo' : 'Réservé à la DG / DGA'}
            </button>
          </div>
        </div>
      </div>

      {/* Matrice des Profils & Habilitations COSITI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Matrice des Profils & Droits d'Accès COSITI</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Habilitations strictes selon la gouvernance de la coopérative. Cliquez sur un profil pour simuler sa session.
            </p>
          </div>

          <div className="text-xs text-slate-500 flex items-center space-x-1.5 self-start sm:self-auto">
            <span>Session active :</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
              {currentUser.nom} ({currentUser.role})
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Profil & Rôle</th>
                <th className="px-4 py-3">Type d'accès</th>
                <th className="px-4 py-3">Consultation</th>
                <th className="px-4 py-3">Enregistrement (Adhérents / Cotisations)</th>
                <th className="px-4 py-3">Modif. / Suppr. (Code 0000)</th>
                <th className="px-4 py-3">Immatriculation & Dossiers</th>
                <th className="px-4 py-3">Configuration & Audit</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {utilisateurs.map((u) => {
                const isCurrent = u.id === currentUser.id;
                const userPerms = getUserPermissions(u);

                const getRoleBadgeColor = () => {
                  switch (u.role) {
                    case 'DG':
                    case 'DGA':
                      return 'bg-purple-100 text-purple-800 border-purple-200';
                    case 'DAF':
                      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
                    case 'PCA':
                      return 'bg-amber-100 text-amber-900 border-amber-200';
                    case 'Conseil de Surveillance':
                      return 'bg-teal-100 text-teal-800 border-teal-200';
                    default:
                      return 'bg-blue-100 text-blue-800 border-blue-200';
                  }
                };

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isCurrent ? 'bg-emerald-50/50 font-medium' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {u.nom.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{u.nom}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">
                                Actif
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-0.5 ${getRoleBadgeColor()}`}
                          >
                            {u.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          u.typeAcces === 'Consultation'
                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                            : u.typeAcces === 'Administrateur, enregistrement et consultation' || u.typeAcces === 'Administrateur et enregistrement'
                            ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                            : u.typeAcces === 'Administrateur et consultation'
                            ? 'bg-purple-100 text-purple-900 border-purple-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {u.typeAcces}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {u.role === 'DAF' ? (
                        <span className="inline-flex items-center text-indigo-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                          Oui (Analytique & financière)
                        </span>
                      ) : u.role === 'DG' || u.role === 'DGA' ? (
                        <span className="inline-flex items-center text-purple-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          Oui (Supervision globale)
                        </span>
                      ) : u.role === 'PCA' || u.role === 'Conseil de Surveillance' ? (
                        <span className="inline-flex items-center text-amber-800 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          Oui (Lecture seule & audit)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Oui (Registres caisse)
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {userPerms.canRecord ? (
                        <span className="inline-flex items-center text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Autorisé
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-[11px]">
                          Désactivé
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {userPerms.canEditRecords ? (
                        <span className="inline-flex items-center text-purple-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          Oui (Code 0000)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-[11px]">
                          Non autorisé
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {userPerms.canImmatriculer ? (
                        <span className="inline-flex items-center text-blue-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          Validation active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-[11px]">
                          Lecture seule
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {userPerms.canConfigure ? (
                        <span className="inline-flex items-center text-purple-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          Complet (DG)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-[11px]">
                          Lecture seule
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {isCurrent ? (
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-end space-x-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Session en cours</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTargetUserForSwitch(u)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Basculer (1111)
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Fiches explicatives de gouvernance COSITI */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Gouvernance & Répartition des Habilitations COSITI
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLES_CONFIG.map((roleConf) => (
              <div
                key={roleConf.id}
                className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900">{roleConf.nomRole}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleConf.couleurBadge}`}>
                      {roleConf.typeAcces}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {roleConf.description}
                  </p>
                </div>
                <div className="border-t border-slate-200/80 pt-2 text-[11px] space-y-1">
                  <div className="font-semibold text-slate-700 text-[10px] uppercase">Droits clés :</div>
                  {roleConf.droitsCles.slice(0, 3).map((droit, idx) => (
                    <div key={idx} className="flex items-start text-slate-600 space-x-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{droit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Mise à jour du Logiciel (Effacement de toutes les données - Code 1111) */}
      <MiseAJourLogicielModal
        isOpen={isMiseAJourModalOpen}
        onClose={() => setIsMiseAJourModalOpen(false)}
        onOpenParametrageUsers={() => {
          setActiveTab('utilisateurs');
        }}
      />

      {/* Modal de Changement d'Utilisateur Sécurisé (Code 1111) */}
      <UserSwitchModal
        isOpen={Boolean(targetUserForSwitch)}
        onClose={() => setTargetUserForSwitch(null)}
        targetUser={targetUserForSwitch}
      />
    </div>
  );
};
