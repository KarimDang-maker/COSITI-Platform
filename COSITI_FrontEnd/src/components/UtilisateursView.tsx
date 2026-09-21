import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Utilisateur, RoleUtilisateur, TypeAcces } from '../types';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  KeyRound,
  Shield,
  Briefcase,
  Mail,
  Phone,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Check,
  X,
  UserCheck,
  Eye,
  Lock,
} from 'lucide-react';
import { getUserPermissions } from '../utils/permissions';
import { UtilisateurEditModal } from './UtilisateurEditModal';
import { UserSwitchModal } from './UserSwitchModal';

export const UtilisateursView: React.FC = () => {
  const {
    utilisateurs,
    currentUser,
    setCurrentUser,
    deleteUtilisateur,
    nouveauParametrageUtilisateurs,
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<Utilisateur | null>(null);
  const [targetUserForSwitch, setTargetUserForSwitch] = useState<Utilisateur | null>(null);

  // Mode "Nouveau Paramétrage Global"
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkUsers, setBulkUsers] = useState<Utilisateur[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const permissions = getUserPermissions(currentUser);

  const startBulkConfiguration = () => {
    // Cloner la liste actuelle pour édition en masse
    setBulkUsers(JSON.parse(JSON.stringify(utilisateurs)));
    setIsBulkMode(true);
    setSaveSuccess(false);
    setSaveError('');
  };

  const handleBulkChange = (index: number, field: keyof Utilisateur, value: string | boolean) => {
    setBulkUsers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addBulkRow = () => {
    const newUser: Utilisateur = {
      id: `usr_${Date.now()}`,
      nom: '',
      email: '',
      telephone: '+225 ',
      poste: '',
      titreComplet: '',
      role: 'Agent d\'enregistrement',
      typeAcces: 'Enregistrement',
      codeAcces: '1111',
      codePin: '1111',
      actif: true,
      descriptionAcces: 'Enregistrement des adhésions et cotisations',
    };
    setBulkUsers((prev) => [...prev, newUser]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkUsers.length <= 1) {
      alert('Il doit subsister au moins un utilisateur configuré.');
      return;
    }
    setBulkUsers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveBulk = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation minimale
    for (let i = 0; i < bulkUsers.length; i++) {
      const u = bulkUsers[i];
      if (!u.nom.trim() || !u.poste?.trim()) {
        setSaveError(`La ligne ${i + 1} nécessite un nom complet et un poste valides.`);
        return;
      }
    }

    const res = nouveauParametrageUtilisateurs(bulkUsers);
    if (res.success) {
      setSaveSuccess(true);
      setSaveError('');
      setTimeout(() => {
        setIsBulkMode(false);
        setSaveSuccess(false);
      }, 1500);
    } else {
      setSaveError(res.error || 'Erreur lors du paramétrage.');
    }
  };

  const permissionsMatrix = [
    {
      action: 'Consulter le tableau de bord et les statistiques globales',
      dg: true,
      daf: true,
      caissiere: true,
      pca: true,
    },
    {
      action: 'Rechercher et filtrer les adhérents et cotisations',
      dg: true,
      daf: true,
      caissiere: true,
      pca: true,
    },
    {
      action: 'Générer et exporter les rapports financiers (Excel / PDF)',
      dg: true,
      daf: true,
      caissiere: true,
      pca: true,
    },
    {
      action: 'Enregistrer un nouvel adhérent (Matricule automatique)',
      dg: true,
      daf: true,
      caissiere: true,
      pca: false,
    },
    {
      action: 'Encaisser une cotisation journalière et imprimer le reçu',
      dg: true,
      daf: true,
      caissiere: true,
      pca: false,
    },
    {
      action: 'Modifier un adhérent ou une cotisation (Code 0000 requis)',
      dg: true,
      daf: true,
      caissiere: true,
      pca: false,
    },
    {
      action: 'Renseigner le Numéro Matricule CNPS (Agent enregistreur)',
      dg: true,
      daf: true,
      caissiere: true,
      pca: false,
    },
    {
      action: 'Gérer les dossiers CNPS (Prestations, Risques pro, PVID)',
      dg: true,
      daf: true,
      caissiere: true,
      pca: false,
    },
    {
      action: 'Supprimer un adhérent ou une cotisation (Code 0000 requis)',
      dg: true,
      daf: false,
      caissiere: false,
      pca: false,
    },
    {
      action: 'Paramètres du système, seuils et mise à jour (Code 1111)',
      dg: true,
      daf: false,
      caissiere: false,
      pca: false,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header avec boutons d'action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Gestion des Utilisateurs & Nouveau Paramétrage</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Renseignez les informations de vos équipes, leurs postes et leurs codes d'accès (Validation <strong>1111</strong>)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isBulkMode ? (
            <>
              <button
                type="button"
                onClick={startBulkConfiguration}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Nouveau Paramétrage Global</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedUserToEdit(null);
                  setIsEditModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Ajouter un Utilisateur</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsBulkMode(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Retour à la liste standard
            </button>
          )}
        </div>
      </div>

      {/* Profil actif actuel avec bascule protégée par code 1111 */}
      <div className="p-5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Session Actuellement Active (Sécurisée par Code 1111)</span>
          </span>
          <div className="flex items-center space-x-2.5 mt-1.5">
            <span className="text-lg font-extrabold text-white">{currentUser.nom}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-700 text-emerald-100 border border-emerald-600">
              {currentUser.poste || currentUser.titreComplet || currentUser.role}
            </span>
          </div>
          <p className="text-xs text-emerald-200/90 mt-1">
            <strong>Type d'accès :</strong> {currentUser.typeAcces}. Tout changement de profil requiert le code de validation <strong>1111</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {utilisateurs.map((u) => {
            const isSelected = currentUser.id === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  if (!isSelected) {
                    setTargetUserForSwitch(u);
                  }
                }}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-white text-emerald-950 shadow-xs ring-2 ring-emerald-400'
                    : 'bg-emerald-800/80 text-emerald-100 hover:bg-emerald-700'
                }`}
              >
                <span>{u.nom.split(' ')[0]}</span>
                <span className="text-[10px] opacity-80">({u.role})</span>
                {!isSelected && <KeyRound className="w-3 h-3 text-emerald-300" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Nouveau Paramétrage Global des Utilisateurs */}
      {isBulkMode ? (
        <form onSubmit={handleSaveBulk} className="bg-white rounded-2xl border-2 border-emerald-500 shadow-md p-6 space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-900 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Nouveau Paramétrage : Informations des Utilisateurs, Postes et Codes d'Accès</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Renseignez directement chaque membre de l'équipe, leur fonction officielle et leur code de validation (1111 par défaut).
              </p>
            </div>
            <button
              type="button"
              onClick={addBulkRow}
              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 self-start cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Ajouter une ligne</span>
            </button>
          </div>

          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Nouveau paramétrage enregistré avec succès !</span>
            </div>
          )}

          <div className="space-y-4">
            {bulkUsers.map((user, idx) => (
              <div
                key={user.id || idx}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {user.nom || 'Nouvel Utilisateur'}
                    </span>
                  </div>
                  {bulkUsers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBulkRow(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                      title="Supprimer cette ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Nom complet */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Nom et Prénoms *
                    </label>
                    <input
                      type="text"
                      required
                      value={user.nom}
                      onChange={(e) => handleBulkChange(idx, 'nom', e.target.value)}
                      placeholder="Ex: KOUASSI Yao Jean"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  {/* Poste */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Poste / Fonction *
                    </label>
                    <input
                      type="text"
                      required
                      value={user.poste || user.titreComplet || ''}
                      onChange={(e) => {
                        handleBulkChange(idx, 'poste', e.target.value);
                        handleBulkChange(idx, 'titreComplet', e.target.value);
                      }}
                      placeholder="Ex: Caissière Principale, DAF..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  {/* Rôle */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Rôle Système
                    </label>
                    <select
                      value={user.role}
                      onChange={(e) => {
                        const newRole = e.target.value as RoleUtilisateur;
                        handleBulkChange(idx, 'role', newRole);
                        if (newRole === 'DAF') {
                          handleBulkChange(idx, 'typeAcces', 'Administrateur, enregistrement et consultation');
                        } else if (newRole === 'PCA' || newRole === 'Conseil de Surveillance') {
                          handleBulkChange(idx, 'typeAcces', 'Consultation');
                        } else if (newRole === 'DG' || newRole === 'DGA') {
                          handleBulkChange(idx, 'typeAcces', 'Administrateur et consultation');
                        } else {
                          handleBulkChange(idx, 'typeAcces', 'Enregistrement');
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                    >
                      <option value="DG">DG (Directeur Général)</option>
                      <option value="DGA">DGA (Directrice Générale Adjointe)</option>
                      <option value="DAF">DAF (Directeur Admin. et Financier)</option>
                      <option value="Caissière & Agent d'enregistrement">Caissière & Agent d'enregistrement</option>
                      <option value="PCA">PCA (Président CA)</option>
                      <option value="Conseil de Surveillance">Conseil de Surveillance</option>
                      <option value="Agent d'enregistrement">Agent d'enregistrement</option>
                      <option value="Agent de consultation">Agent de consultation</option>
                    </select>
                  </div>

                  {/* Code d'accès */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                      <span>Code d'accès *</span>
                      <span className="font-mono text-emerald-700">1111</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={user.codeAcces || user.codePin || '1111'}
                        onChange={(e) => {
                          handleBulkChange(idx, 'codeAcces', e.target.value);
                          handleBulkChange(idx, 'codePin', e.target.value);
                        }}
                        placeholder="1111"
                        className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Email et Téléphone optionnels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                      Email professionnel
                    </label>
                    <input
                      type="email"
                      value={user.email || ''}
                      onChange={(e) => handleBulkChange(idx, 'email', e.target.value)}
                      placeholder="nom@cositi-ci.org"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      value={user.telephone || ''}
                      onChange={(e) => handleBulkChange(idx, 'telephone', e.target.value)}
                      placeholder="+225 07 12 34 56 78"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsBulkMode(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Valider et Enregistrer le Nouveau Paramétrage</span>
            </button>
          </div>
        </form>
      ) : (
        /* Liste des utilisateurs enregistrés */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Comptes Configurés ({utilisateurs.length})</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Chaque profil possède son poste attribué et son code d'accès de validation (1111)
              </p>
            </div>
            <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              Protection par Code : 1111
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {utilisateurs.map((u) => {
              const isCurrent = u.id === currentUser.id;
              const uPerms = getUserPermissions(u);

              return (
                <div
                  key={u.id}
                  className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    isCurrent ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {u.nom.charAt(0)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xs font-bold text-slate-900 truncate">{u.nom}</h3>
                        {isCurrent && (
                          <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            Session active
                          </span>
                        )}
                      </div>

                      {/* Poste officiel */}
                      <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          <strong>Poste :</strong> {u.poste || u.titreComplet || u.role}
                        </span>
                      </div>

                      {/* Rôle et contact */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        {u.email && (
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{u.email}</span>
                          </span>
                        )}
                        {u.telephone && (
                          <span className="flex items-center space-x-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.telephone}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1 text-amber-800 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded">
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          <span>Code : {u.codeAcces || u.codePin || '1111'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                    {/* Badge type d'accès */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${uPerms.badgeBgColor} ${uPerms.badgeTextColor} ${uPerms.badgeBorderColor}`}
                    >
                      {uPerms.typeAcces}
                    </span>

                    {/* Bouton basculer */}
                    {isCurrent ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1 px-3 py-1.5 bg-emerald-100/60 rounded-xl">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Actif</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTargetUserForSwitch(u)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-xs"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Basculer (1111)</span>
                      </button>
                    )}

                    {/* Bouton modifier */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserToEdit(u);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Modifier les informations et code d'accès"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Bouton supprimer */}
                    {utilisateurs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Confirmer la suppression du compte de ${u.nom} ?`)) {
                            deleteUtilisateur(u.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Supprimer cet utilisateur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Matrice des droits & permissions détaillée */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Matrice des Privilèges & Droits d'Accès COSITI
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Détail des fonctionnalités autorisées par niveau de rôle utilisateur
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Fonctionnalité / Action</th>
                <th className="px-4 py-3 text-center">DG / DGA</th>
                <th className="px-4 py-3 text-center">DAF</th>
                <th className="px-4 py-3 text-center">Caissière & Enregistrement</th>
                <th className="px-4 py-3 text-center">PCA / Conseil Surveillance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.action}</td>
                  <td className="px-4 py-3 text-center">
                    {item.dg ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-rose-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.daf ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-rose-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.caissiere ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-rose-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.pca ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-rose-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'édition d'utilisateur individuel */}
      <UtilisateurEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUserToEdit(null);
        }}
        userToEdit={selectedUserToEdit}
      />

      {/* Modal de changement d'utilisateur sécurisé (Code 1111) */}
      <UserSwitchModal
        isOpen={Boolean(targetUserForSwitch)}
        onClose={() => setTargetUserForSwitch(null)}
        targetUser={targetUserForSwitch}
      />
    </div>
  );
};
