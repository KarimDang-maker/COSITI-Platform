import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ajouterPiece,
  ajouterPiecePrestation,
  changerStatutDossier,
  changerStatutDossierPrestation,
  journalDossierPrestation,
  listerDeclarations,
  listerDossiers,
  listerDossiersPrestation,
  listerEligiblesNonImmatricules,
  listerOffres,
  listerSituationsImmatriculation,
  modifierObservationsPrestation,
  obtenirDossier,
  obtenirDossierPrestation,
  ouvrirDossier,
  ouvrirDossierPrestation,
  preparerDeclaration,
  transmettreDeclaration,
  type CreationDossierPrestation,
  type FiltresDossiers,
  type FiltresDossiersPrestation,
  type RubriqueCnps,
  type StatutDossierCnps,
  type StatutDossierPrestationCnps,
  type TypePieceCnps,
} from "@/api/cnps";

const CLE = "cnps" as const;

export function useDossiersCnps(filtres: FiltresDossiers) {
  return useQuery({
    queryKey: [CLE, "dossiers", filtres],
    queryFn: () => listerDossiers(filtres),
    placeholderData: (precedente) => precedente,
  });
}

export function useDossierCnps(dossierId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "dossier", dossierId],
    queryFn: () => obtenirDossier(dossierId!),
    enabled: !!dossierId,
  });
}

export function useEligiblesNonImmatricules(zoneId?: string) {
  return useQuery({
    queryKey: [CLE, "eligibles", zoneId],
    queryFn: () => listerEligiblesNonImmatricules(zoneId),
  });
}

export function useDeclarationsCnps(dossierId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "declarations", dossierId],
    queryFn: () => listerDeclarations(dossierId!),
    enabled: !!dossierId,
  });
}

/**
 * Après toute écriture, on invalide l'ensemble du domaine `cnps` plutôt que la seule clé touchée :
 * l'ouverture d'un dossier change aussi la liste des éligibles (`dossierOuvert`), et rattacher une pièce
 * change les pièces manquantes du dossier. Invalider trop large coûte un rechargement ; invalider trop
 * étroit affiche une donnée périmée sur un dossier qu'on vient de modifier.
 */
function useInvalidationCnps() {
  const clientRequetes = useQueryClient();
  return () => clientRequetes.invalidateQueries({ queryKey: [CLE] });
}

export function useOuvrirDossierCnps() {
  const invalider = useInvalidationCnps();
  return useMutation({
    mutationFn: (adherentId: string) => ouvrirDossier(adherentId),
    onSuccess: invalider,
  });
}

export function useAjouterPieceCnps(dossierId: string) {
  const invalider = useInvalidationCnps();
  return useMutation({
    mutationFn: (variables: { documentId: string; typePiece: TypePieceCnps }) =>
      ajouterPiece(dossierId, variables.documentId, variables.typePiece),
    onSuccess: invalider,
  });
}

export function useChangerStatutDossier(dossierId: string) {
  const invalider = useInvalidationCnps();
  return useMutation({
    mutationFn: (variables: { statut: StatutDossierCnps; commentaire?: string }) =>
      changerStatutDossier(dossierId, variables.statut, variables.commentaire),
    onSuccess: invalider,
  });
}

export function usePreparerDeclaration(dossierId: string) {
  const invalider = useInvalidationCnps();
  return useMutation({
    mutationFn: (periode: string) => preparerDeclaration(dossierId, periode),
    onSuccess: invalider,
  });
}

export function useTransmettreDeclaration() {
  const invalider = useInvalidationCnps();
  return useMutation({
    mutationFn: (variables: { declarationId: string; accuseDocumentId?: string }) =>
      transmettreDeclaration(variables.declarationId, variables.accuseDocumentId),
    onSuccess: invalider,
  });
}

/* ============================================================================
 * Dossiers de prestation CNPS — même domaine de clé (`cnps`) et même stratégie
 * d'invalidation large que ci-dessus : ouvrir un dossier de prestation change
 * aussi le compteur `nombreDossiers` du référentiel des offres.
 * ========================================================================== */

export function useOffresCnps(rubrique?: RubriqueCnps) {
  return useQuery({
    queryKey: [CLE, "offres", rubrique],
    queryFn: () => listerOffres(rubrique),
  });
}

export function useDossiersPrestation(filtres: FiltresDossiersPrestation) {
  return useQuery({
    queryKey: [CLE, "dossiers-prestation", filtres],
    queryFn: () => listerDossiersPrestation(filtres),
    placeholderData: (precedente) => precedente,
  });
}

export function useDossierPrestation(dossierId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "dossier-prestation", dossierId],
    queryFn: () => obtenirDossierPrestation(dossierId!),
    enabled: !!dossierId,
  });
}

export function useJournalDossierPrestation(dossierId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "journal-prestation", dossierId],
    queryFn: () => journalDossierPrestation(dossierId!),
    enabled: !!dossierId,
  });
}

export function useSituationsImmatriculation(zoneId?: string) {
  return useQuery({
    queryKey: [CLE, "immatriculations", zoneId],
    queryFn: () => listerSituationsImmatriculation(zoneId),
  });
}

export function useOuvrirDossierPrestation() {
  const invalider = useInvalidationCnps();
  return useMutation({
    mutationFn: (dto: CreationDossierPrestation) => ouvrirDossierPrestation(dto),
    onSuccess: invalider,
  });
}

export function useAjouterPiecePrestation(dossierId: string) {
  const invalider = useInvalidationCnps();
  return useMutation({
    mutationFn: (variables: { documentId: string; pieceOffreId: string }) =>
      ajouterPiecePrestation(dossierId, variables.documentId, variables.pieceOffreId),
    onSuccess: invalider,
  });
}

export function useChangerStatutDossierPrestation(dossierId: string) {
  const invalider = useInvalidationCnps();
  return useMutation({
    mutationFn: (variables: { statut: StatutDossierPrestationCnps; commentaire?: string }) =>
      changerStatutDossierPrestation(dossierId, variables.statut, variables.commentaire),
    onSuccess: invalider,
  });
}

export function useModifierObservationsPrestation(dossierId: string) {
  const invalider = useInvalidationCnps();
  return useMutation({
    mutationFn: (variables: { observations?: string; prochaineRelanceLe?: string }) =>
      modifierObservationsPrestation(dossierId, variables.observations, variables.prochaineRelanceLe),
    onSuccess: invalider,
  });
}
