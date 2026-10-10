import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changerPieceArchivage,
  enregistrerDepotDossier,
  immatriculer,
  listerDossiersArchivageIncomplets,
  listerParcours,
  modifierParametresCnps,
  obtenirChecklistArchivage,
  obtenirParametresCnps,
  obtenirParcoursAdherent,
  obtenirResumeParcours,
  preimmatriculer,
  type CorpsChangementArchivage,
  type CorpsDepotDossier,
  type CorpsImmatriculation,
  type CorpsParametresCnps,
  type CorpsPreimmatriculation,
  type FiltreParcours,
} from "@/api/parcoursCnps";

/** Même famille de clés que `useCnps` : le flux temps réel (`CLES_PAR_DOMAINE`) et les invalidations la recouvrent. */
const CLE = "cnps" as const;

/** `actif` : faux quand l'écran appelant sait déjà que l'appel serait refusé (permission absente). */
export function useParcoursCnps(filtre: FiltreParcours, zoneId?: string, actif = true) {
  return useQuery({
    queryKey: [CLE, "parcours", "liste", filtre, zoneId],
    queryFn: () => listerParcours(filtre, zoneId),
    placeholderData: (precedente) => precedente,
    enabled: actif,
  });
}

export function useResumeParcours(zoneId?: string, actif = true) {
  return useQuery({
    queryKey: [CLE, "parcours", "resume", zoneId],
    queryFn: () => obtenirResumeParcours(zoneId),
    enabled: actif,
  });
}

export function useParcoursAdherent(adherentId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "parcours", "adherent", adherentId],
    queryFn: () => obtenirParcoursAdherent(adherentId!),
    enabled: actif && !!adherentId,
  });
}

export function useParametresCnps(actif = true) {
  return useQuery({ queryKey: [CLE, "parametres"], queryFn: obtenirParametresCnps, enabled: actif });
}

export function useChecklistArchivage(dossierId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "archivage", "checklist", dossierId],
    queryFn: () => obtenirChecklistArchivage(dossierId!),
    enabled: actif && !!dossierId,
  });
}

export function useDossiersArchivageIncomplets(actif = true) {
  return useQuery({
    queryKey: [CLE, "archivage", "incomplets"],
    queryFn: listerDossiersArchivageIncomplets,
    enabled: actif,
  });
}

/**
 * Une écriture du parcours change la liste, le résumé, la situation de l'adhérent, l'éligibilité, les dossiers et,
 * à l'immatriculation, le numéro CNPS de l'adhérent et les tableaux de bord : on invalide les familles concernées
 * plutôt que de deviner laquelle est périmée.
 */
function useInvalidationParcours() {
  const clientRequetes = useQueryClient();
  return () =>
    Promise.all([
      clientRequetes.invalidateQueries({ queryKey: [CLE] }),
      clientRequetes.invalidateQueries({ queryKey: ["adherents"] }),
      clientRequetes.invalidateQueries({ queryKey: ["tableaux-de-bord"] }),
    ]);
}

export function usePreimmatriculer() {
  const invalider = useInvalidationParcours();
  return useMutation({
    mutationFn: (variables: { adherentId: string; corps: CorpsPreimmatriculation }) =>
      preimmatriculer(variables.adherentId, variables.corps),
    onSuccess: invalider,
  });
}

export function useEnregistrerDepotDossier() {
  const invalider = useInvalidationParcours();
  return useMutation({
    mutationFn: (variables: { adherentId: string; corps: CorpsDepotDossier }) =>
      enregistrerDepotDossier(variables.adherentId, variables.corps),
    onSuccess: invalider,
  });
}

export function useImmatriculer() {
  const invalider = useInvalidationParcours();
  return useMutation({
    mutationFn: (variables: { adherentId: string; corps: CorpsImmatriculation }) =>
      immatriculer(variables.adherentId, variables.corps),
    onSuccess: invalider,
  });
}

export function useModifierParametresCnps() {
  const invalider = useInvalidationParcours();
  return useMutation({
    mutationFn: (corps: CorpsParametresCnps) => modifierParametresCnps(corps),
    onSuccess: invalider,
  });
}

export function useChangerPieceArchivage(dossierId: string) {
  const invalider = useInvalidationParcours();
  return useMutation({
    mutationFn: (variables: { codePiece: string; corps: CorpsChangementArchivage }) =>
      changerPieceArchivage(dossierId, variables.codePiece, variables.corps),
    onSuccess: invalider,
  });
}
