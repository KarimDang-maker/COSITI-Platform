import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ajouterPiece,
  changerStatutDossier,
  listerDeclarations,
  listerDossiers,
  listerEligiblesNonImmatricules,
  listerProchesSeuilCnps,
  obtenirDossier,
  ouvrirDossier,
  preparerDeclaration,
  transmettreDeclaration,
  type FiltresDossiers,
  type StatutDossierCnps,
  type TypePieceCnps,
} from "@/api/cnps";

const CLE = "cnps" as const;

/** `actif` : faux quand l'écran appelant sait déjà que l'appel serait refusé (permission absente). */
export function useDossiersCnps(filtres: FiltresDossiers, actif = true) {
  return useQuery({
    queryKey: [CLE, "dossiers", filtres],
    queryFn: () => listerDossiers(filtres),
    placeholderData: (precedente) => precedente,
    enabled: actif,
  });
}

export function useDossierCnps(dossierId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "dossier", dossierId],
    queryFn: () => obtenirDossier(dossierId!),
    enabled: !!dossierId,
  });
}

export function useEligiblesNonImmatricules(zoneId?: string, actif = true) {
  return useQuery({
    queryKey: [CLE, "eligibles", zoneId],
    queryFn: () => listerEligiblesNonImmatricules(zoneId),
    enabled: actif,
  });
}

/** Adhérents proches du quota CNPS (#25) — bande calculée par le serveur. */
export function useProchesSeuilCnps(zoneId?: string, actif = true) {
  return useQuery({
    queryKey: [CLE, "proches-seuil", zoneId],
    queryFn: () => listerProchesSeuilCnps(zoneId),
    enabled: actif,
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
