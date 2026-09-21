import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AdherentsView } from './components/AdherentsView';
import { CotisationsView } from './components/CotisationsView';
import { ImmatriculationsView } from './components/ImmatriculationsView';
import { DossiersView } from './components/DossiersView';
import { AlertesView } from './components/AlertesView';
import { RapportsView } from './components/RapportsView';
import { UtilisateursView } from './components/UtilisateursView';
import { ParametresView } from './components/ParametresView';
import { JournalView } from './components/JournalView';
import { DepensesView } from './components/finance/DepensesView';
import { AgendaView } from './components/direction/AgendaView';
import { GestionnairesView } from './components/GestionnairesView';

// Modals
import { PinConfirmModal } from './components/PinConfirmModal';
import { ReceiptModal } from './components/ReceiptModal';
import { AdherentModal } from './components/AdherentModal';
import { CotisationModal } from './components/CotisationModal';
import { AdherentDetailsModal } from './components/AdherentDetailsModal';
import { ImmatriculationModal } from './components/ImmatriculationModal';
import { DossierAllocationsModal } from './components/DossierAllocationsModal';

import { Adherent, Cotisation, DossierAllocations } from './types';

const MainApp: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    adherents,
    cotisations,
    dossiers,
    deleteAdherent,
    deleteCotisation,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals States
  const [isAdherentModalOpen, setIsAdherentModalOpen] = useState(false);
  const [adherentToEdit, setAdherentToEdit] = useState<Adherent | null>(null);

  const [isCotisationModalOpen, setIsCotisationModalOpen] = useState(false);
  const [cotisationToEdit, setCotisationToEdit] = useState<Cotisation | null>(null);
  const [cotisationPreselectedAdherentId, setCotisationPreselectedAdherentId] = useState<
    string | null
  >(null);

  const [selectedAdherentId, setSelectedAdherentId] = useState<string | null>(null);
  const [isAdherentDetailsOpen, setIsAdherentDetailsOpen] = useState(false);

  const [selectedReceiptCotisation, setSelectedReceiptCotisation] =
    useState<Cotisation | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [immatriculationTargetAdherent, setImmatriculationTargetAdherent] =
    useState<Adherent | null>(null);
  const [isImmatriculationModalOpen, setIsImmatriculationModalOpen] = useState(false);

  const [selectedDossier, setSelectedDossier] = useState<DossierAllocations | null>(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);

  // Sécurité PIN modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalTitle, setPinModalTitle] = useState('');
  const [pinModalDesc, setPinModalDesc] = useState('');
  const [pendingPinAction, setPendingPinAction] = useState<(() => void) | null>(null);

  const requestPinConfirm = (action: () => void, title: string, desc: string) => {
    setPendingPinAction(() => action);
    setPinModalTitle(title);
    setPinModalDesc(desc);
    setIsPinModalOpen(true);
  };

  const handlePinSuccess = () => {
    if (pendingPinAction) {
      pendingPinAction();
    }
    setIsPinModalOpen(false);
    setPendingPinAction(null);
  };

  // Actions transversales
  const handleOpenNewAdherent = () => {
    setAdherentToEdit(null);
    setIsAdherentModalOpen(true);
  };

  const handleEditAdherent = (adh: Adherent) => {
    setAdherentToEdit(adh);
    setIsAdherentModalOpen(true);
  };

  const handleDeleteAdherent = (adh: Adherent) => {
    requestPinConfirm(
      () => {
        const res = deleteAdherent(adh.id, '0000');
        if (res.success) {
          setIsAdherentDetailsOpen(false);
        } else {
          alert(res.error);
        }
      },
      'Suppression d\'adhérent (Code 0000)',
      `Êtes-vous certain de vouloir supprimer définitivement l'adhérent ${adh.matricule} (${adh.nom} ${adh.prenom}) ? Cette action est irréversible.`
    );
  };

  const handleOpenNewCotisation = (preselectedAdhId?: string) => {
    setCotisationToEdit(null);
    setCotisationPreselectedAdherentId(preselectedAdhId || null);
    setIsCotisationModalOpen(true);
  };

  const handleEditCotisation = (cot: Cotisation) => {
    setCotisationToEdit(cot);
    setIsCotisationModalOpen(true);
  };

  const handleDeleteCotisation = (cot: Cotisation) => {
    requestPinConfirm(
      () => {
        const res = deleteCotisation(cot.id, '0000');
        if (!res.success) {
          alert(res.error);
        }
      },
      'Suppression de versement (Code 0000)',
      `Voulez-vous supprimer le versement de ${cot.montant} FCFA enregistré pour ${cot.matricule} ?`
    );
  };

  const handleSelectAdherent = (id: string) => {
    setSelectedAdherentId(id);
    setIsAdherentDetailsOpen(true);
  };

  const handleViewReceipt = (cot: Cotisation) => {
    setSelectedReceiptCotisation(cot);
    setIsReceiptModalOpen(true);
  };

  const handleImmatriculerAdherent = (adh: Adherent) => {
    setImmatriculationTargetAdherent(adh);
    setIsImmatriculationModalOpen(true);
  };

  const handleOpenDossier = (adh: Adherent) => {
    const existingDossier = dossiers.find(
      (d) => d.adherentId === adh.id || d.matricule === adh.matricule
    );
    if (existingDossier) {
      setSelectedDossier(existingDossier);
      setIsDossierModalOpen(true);
    } else {
      setActiveTab('dossiers');
    }
  };

  const handleSelectDossier = (dossier: DossierAllocations) => {
    setSelectedDossier(dossier);
    setIsDossierModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800 antialiased selection:bg-emerald-200">
      {/* Barre latérale */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Zone de contenu principale */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* En-tête supérieur */}
        <Header
          onToggleMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onToggleCollapseSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
          onOpenNewAdherent={handleOpenNewAdherent}
          onOpenNewCotisation={() => handleOpenNewCotisation()}
          onSelectAdherent={handleSelectAdherent}
        />

        {/* Vue active */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-16 sm:pb-20">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                onOpenNewAdherent={handleOpenNewAdherent}
                onOpenNewCotisation={() => handleOpenNewCotisation()}
                onSelectAdherent={handleSelectAdherent}
                onViewReceipt={handleViewReceipt}
              />
            )}

            {activeTab === 'adherents' && (
              <AdherentsView
                onOpenNewAdherent={handleOpenNewAdherent}
                onSelectAdherent={handleSelectAdherent}
                onEditAdherent={handleEditAdherent}
                onDeleteAdherent={handleDeleteAdherent}
                onNewCotisationForAdherent={(adh) => handleOpenNewCotisation(adh.id)}
                onImmatriculerAdherent={handleImmatriculerAdherent}
              />
            )}

            {activeTab === 'gestionnaires' && <GestionnairesView />}

            {activeTab === 'cotisations' && (
              <CotisationsView
                onOpenNewCotisation={() => handleOpenNewCotisation()}
                onSelectAdherent={handleSelectAdherent}
                onViewReceipt={handleViewReceipt}
                onEditCotisation={handleEditCotisation}
                onDeleteCotisation={handleDeleteCotisation}
              />
            )}

            {activeTab === 'finances' && (
              <DepensesView onRequestPinConfirm={requestPinConfirm} />
            )}

            {activeTab === 'immatriculations' && (
              <ImmatriculationsView
                onSelectAdherent={handleSelectAdherent}
                onImmatriculerAdherent={handleImmatriculerAdherent}
                onOpenDossier={handleOpenDossier}
              />
            )}

            {activeTab === 'dossiers' && (
              <DossiersView
                onSelectDossier={handleSelectDossier}
                onSelectAdherent={handleSelectAdherent}
              />
            )}

            {activeTab === 'agenda' && <AgendaView />}

            {activeTab === 'alertes' && (
              <AlertesView
                onSelectAdherent={handleSelectAdherent}
                onNewCotisationForAdherent={(adh) => handleOpenNewCotisation(adh.id)}
                onImmatriculerAdherent={handleImmatriculerAdherent}
                onOpenDossier={handleOpenDossier}
              />
            )}

            {activeTab === 'rapports' && <RapportsView />}

            {activeTab === 'utilisateurs' && <UtilisateursView />}

            {activeTab === 'parametres' && <ParametresView />}

            {activeTab === 'journal' && <JournalView />}
          </div>
        </main>
      </div>

      {/* --- MODALES --- */}

      {/* Modale d'ajout / modification d'adhérent */}
      <AdherentModal
        isOpen={isAdherentModalOpen}
        onClose={() => setIsAdherentModalOpen(false)}
        adherentToEdit={adherentToEdit}
        onRequestPinConfirm={requestPinConfirm}
      />

      {/* Modale d'enregistrement / modification de cotisation */}
      <CotisationModal
        isOpen={isCotisationModalOpen}
        onClose={() => setIsCotisationModalOpen(false)}
        preselectedAdherentId={cotisationPreselectedAdherentId}
        cotisationToEdit={cotisationToEdit}
        onRequestPinConfirm={requestPinConfirm}
        onSuccessCreated={(newCot) => {
          setSelectedReceiptCotisation(newCot);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Modale Fiche Détails d'adhérent & Historique */}
      <AdherentDetailsModal
        isOpen={isAdherentDetailsOpen}
        onClose={() => setIsAdherentDetailsOpen(false)}
        adherentId={selectedAdherentId}
        onEditAdherent={handleEditAdherent}
        onDeleteAdherent={handleDeleteAdherent}
        onNewCotisationForAdherent={(adh) => handleOpenNewCotisation(adh.id)}
        onViewReceipt={handleViewReceipt}
        onOpenImmatriculer={handleImmatriculerAdherent}
        onOpenDossier={handleOpenDossier}
      />

      {/* Modale de validation d'immatriculation CNPS */}
      <ImmatriculationModal
        isOpen={isImmatriculationModalOpen}
        onClose={() => setIsImmatriculationModalOpen(false)}
        adherent={immatriculationTargetAdherent}
      />

      {/* Modale Dossier d'allocations familiales */}
      <DossierAllocationsModal
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        dossier={selectedDossier}
      />

      {/* Modale Reçu Officiel imprimable */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        cotisation={selectedReceiptCotisation}
      />

      {/* Modale de Sécurité Code PIN 0000 */}
      <PinConfirmModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingPinAction(null);
        }}
        onConfirm={handlePinSuccess}
        title={pinModalTitle}
        description={pinModalDesc}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
