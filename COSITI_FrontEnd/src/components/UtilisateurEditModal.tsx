import React, { useState, useEffect } from 'react';
import { Utilisateur, RoleUtilisateur, TypeAcces } from '../types';
import { useApp } from '../context/AppContext';
import { User, Mail, Phone, Briefcase, KeyRound, Shield, X, Check, Lock } from 'lucide-react';

interface UtilisateurEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: Utilisateur | null;
}

const ROLES_LIST: { role: RoleUtilisateur; defaultType: TypeAcces; description: string }[] = [
  {
    role: 'DG',
    defaultType: 'Administrateur et consultation',
    description: 'Directeur Général — Administration générale et supervision',
  },
  {
    role: 'DGA',
    defaultType: 'Administrateur et consultation',
    description: 'Directrice Générale Adjointe — Coordination et supervision',
  },
  {
    role: 'DAF',
    defaultType: 'Administrateur, enregistrement et consultation',
    description: 'Directeur Administratif et Financier — Enregistrement, consultation et finance',
  },
  {
    role: 'Caissière & Agent d\'enregistrement',
    defaultType: 'Enregistrement',
    description: 'Opérations de caisse, encaissements et immatriculations',
  },
  {
    role: 'PCA',
    defaultType: 'Consultation',
    description: 'Président du Conseil d\'Administration — Consultation et gouvernance',
  },
  {
    role: 'Conseil de Surveillance',
    defaultType: 'Consultation',
    description: 'Conseil de Surveillance — Contrôle et audit',
  },
  {
    role: 'Administrateur',
    defaultType: 'Administrateur et consultation',
    description: 'Gestion technique et paramétrage applicatif',
  },
  {
    role: 'Agent d\'enregistrement',
    defaultType: 'Enregistrement',
    description: 'Saisie des adhésions et cotisations de terrain',
  },
  {
    role: 'Agent de consultation',
    defaultType: 'Consultation',
    description: 'Consultation des fiches et statistiques',
  },
];

const TYPES_ACCES_LIST: TypeAcces[] = [
  'Consultation',
  'Enregistrement',
  'Administrateur et consultation',
  'Administrateur et enregistrement',
  'Administrateur, enregistrement et consultation',
];

export const UtilisateurEditModal: React.FC<UtilisateurEditModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
}) => {
  const { addUtilisateur, updateUtilisateur } = useApp();

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [poste, setPoste] = useState('');
  const [role, setRole] = useState<RoleUtilisateur>('Caissière & Agent d\'enregistrement');
  const [typeAcces, setTypeAcces] = useState<TypeAcces>('Enregistrement');
  const [codeAcces, setCodeAcces] = useState('1111');
  const [descriptionAcces, setDescriptionAcces] = useState('');
  const [actif, setActif] = useState(true);

  useEffect(() => {
    if (userToEdit) {
      setNom(userToEdit.nom);
      setEmail(userToEdit.email);
      setTelephone(userToEdit.telephone || '');
      setPoste(userToEdit.poste || userToEdit.titreComplet || '');
      setRole(userToEdit.role);
      setTypeAcces(userToEdit.typeAcces);
      setCodeAcces(userToEdit.codeAcces || userToEdit.codePin || '1111');
      setDescriptionAcces(userToEdit.descriptionAcces || '');
      setActif(userToEdit.actif);
    } else {
      setNom('');
      setEmail('');
      setTelephone('+225 ');
      setPoste('');
      setRole('Caissière & Agent d\'enregistrement');
      setTypeAcces('Enregistrement');
      setCodeAcces('1111');
      setDescriptionAcces('Encaissement des cotisations et adhésions');
      setActif(true);
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: RoleUtilisateur) => {
    setRole(newRole);
    const found = ROLES_LIST.find((r) => r.role === newRole);
    if (found) {
      setTypeAcces(found.defaultType);
      if (!descriptionAcces || descriptionAcces === found.description) {
        setDescriptionAcces(found.description);
      }
      if (!poste) {
        setPoste(found.role);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !poste.trim()) {
      alert('Veuillez renseigner le nom complet et le poste de l\'utilisateur.');
      return;
    }

    const cleanedCode = codeAcces.trim() || '1111';

    if (userToEdit) {
      updateUtilisateur(userToEdit.id, {
        nom: nom.trim(),
        email: email.trim() || `${nom.toLowerCase().replace(/\s+/g, '.')}@cositi-ci.org`,
        telephone: telephone.trim(),
        poste: poste.trim(),
        titreComplet: poste.trim(),
        role,
        typeAcces,
        codeAcces: cleanedCode,
        codePin: cleanedCode,
        descriptionAcces: descriptionAcces.trim(),
        actif,
      });
    } else {
      addUtilisateur({
        nom: nom.trim(),
        email: email.trim() || `${nom.toLowerCase().replace(/\s+/g, '.')}@cositi-ci.org`,
        telephone: telephone.trim(),
        poste: poste.trim(),
        titreComplet: poste.trim(),
        role,
        typeAcces,
        codeAcces: cleanedCode,
        codePin: cleanedCode,
        descriptionAcces: descriptionAcces.trim(),
        actif,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {userToEdit ? 'Modifier les Informations de l\'Utilisateur' : 'Nouveau Paramétrage : Ajouter un Utilisateur'}
              </h3>
              <p className="text-xs text-emerald-300">
                Informations personnelles, poste occupé et code d'accès
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-400 hover:text-white p-1 rounded-lg hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom complet */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nom & Prénoms de l'utilisateur *
              </label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: KOUASSI Yao Jean"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* Poste / Fonction */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Poste / Fonction occupée *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={poste}
                  onChange={(e) => setPoste(e.target.value)}
                  placeholder="Ex: Caissière Principale, Directeur Administratif et Financier..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Adresse Email professionnelle
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@cositi-ci.org"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Numéro de Téléphone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+225 07 12 34 56 78"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Rôle COSITI */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Rôle système COSITI *
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as RoleUtilisateur)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {ROLES_LIST.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Type d'accès */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Type d'accès habilité *
              </label>
              <select
                value={typeAcces}
                onChange={(e) => setTypeAcces(e.target.value as TypeAcces)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {TYPES_ACCES_LIST.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Code d'accès (Code PIN) */}
            <div className="sm:col-span-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span>Code d'accès de l'utilisateur (Pour changer d'utilisateur) *</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                  Défaut : 1111
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={codeAcces}
                  onChange={(e) => setCodeAcces(e.target.value)}
                  placeholder="1111"
                  className="w-full px-3 py-2 text-sm font-mono font-bold tracking-widest bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                Ce code d'accès (ou le code universel <strong>1111</strong>) sera requis pour
                sélectionner ou basculer vers cet utilisateur.
              </p>
            </div>

            {/* Statut actif */}
            <div className="sm:col-span-2 flex items-center space-x-3 pt-1">
              <input
                type="checkbox"
                id="user-actif"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="user-actif" className="text-xs font-medium text-slate-700 cursor-pointer">
                Compte utilisateur actif et disponible dans le sélecteur de profils
              </label>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{userToEdit ? 'Enregistrer les modifications' : 'Ajouter l\'utilisateur'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
