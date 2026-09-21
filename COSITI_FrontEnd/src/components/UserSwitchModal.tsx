import React, { useState } from 'react';
import { Utilisateur } from '../types';
import { useApp } from '../context/AppContext';
import { getUserPermissions } from '../utils/permissions';
import { Lock, ShieldCheck, UserCheck, X, AlertTriangle } from 'lucide-react';

interface UserSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: Utilisateur | null;
  onSuccess?: () => void;
}

export const UserSwitchModal: React.FC<UserSwitchModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}) => {
  const { setCurrentUser, currentUser } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !targetUser) return null;

  const targetPerms = getUserPermissions(targetUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Veuillez saisir le code de validation.');
      return;
    }

    // Le code requis par défaut est 1111, ou le code d'accès spécifique défini pour l'utilisateur
    const expectedMasterCode = '1111';
    const userSpecificCode = targetUser.codeAcces || targetUser.codePin;

    const isCodeValid =
      code.trim() === expectedMasterCode ||
      (userSpecificCode && code.trim() === userSpecificCode.trim());

    if (!isCodeValid) {
      setError('Code de validation incorrect. Le code requis est 1111.');
      return;
    }

    // Basculer l'utilisateur
    setCurrentUser(targetUser);
    setCode('');
    setError('');
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* En-tête */}
        <div className="p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-700/80 rounded-xl text-white">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Validation de Changement d'Utilisateur
              </h3>
              <p className="text-xs text-emerald-200">
                Code de sécurité requis : <strong>1111</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Fiche de l'utilisateur cible */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Profil sélectionné :
            </div>
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-xl ${targetPerms.badgeBgColor} ${targetPerms.badgeTextColor} flex items-center justify-center font-bold text-sm border ${targetPerms.badgeBorderColor}`}
              >
                {targetUser.nom.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-slate-900 truncate">
                  {targetUser.nom}
                </div>
                <div className="text-xs text-slate-600 font-medium truncate">
                  {targetUser.poste || targetUser.titreComplet || targetUser.role}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${targetPerms.badgeBgColor} ${targetPerms.badgeTextColor} border ${targetPerms.badgeBorderColor}`}
                  >
                    {targetPerms.typeAcces}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Rôle : {targetUser.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed">
            Pour basculer vers cette session et activer les habilitations associées,
            veuillez renseigner le <strong>code de validation (1111)</strong>.
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Code de validation (1111) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError('');
                }}
                placeholder="Saisissez 1111"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 flex items-center justify-between px-1">
              <span>Code universel de validation : <strong className="text-emerald-700 font-mono">1111</strong></span>
              <span>4 chiffres</span>
            </p>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Boutons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Valider le basculement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
