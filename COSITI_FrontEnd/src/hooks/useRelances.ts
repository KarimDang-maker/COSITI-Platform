import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changerStatutCampagne,
  creerCampagne,
  enregistrerRelance,
  listerCampagnes,
  listerRelances,
  listerRelancesAdherent,
  type SaisieRelance,
  type StatutCampagne,
} from "@/api/relances";

const CLE = "relances" as const;

export function useRelances(filtres: { campagneId?: string; page?: number; taille?: number }) {
  return useQuery({
    queryKey: [CLE, "liste", filtres],
    queryFn: () => listerRelances(filtres),
    placeholderData: (precedente) => precedente,
  });
}

export function useRelancesAdherent(adherentId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "adherent", adherentId],
    queryFn: () => listerRelancesAdherent(adherentId!),
    enabled: !!adherentId,
  });
}

export function useCampagnes(filtres: { statut?: StatutCampagne; page?: number; taille?: number }) {
  return useQuery({
    queryKey: [CLE, "campagnes", filtres],
    queryFn: () => listerCampagnes(filtres),
    placeholderData: (precedente) => precedente,
  });
}

function useInvalidation() {
  const clientRequetes = useQueryClient();
  return () => clientRequetes.invalidateQueries({ queryKey: [CLE] });
}

export function useEnregistrerRelance() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (saisie: SaisieRelance) => enregistrerRelance(saisie),
    onSuccess: invalider,
  });
}

export function useCreerCampagne() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (variables: { libelle: string; critere: Record<string, unknown>; dateDebut?: string }) =>
      creerCampagne(variables.libelle, variables.critere, variables.dateDebut),
    onSuccess: invalider,
  });
}

export function useChangerStatutCampagne() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (variables: { id: string; statut: StatutCampagne }) =>
      changerStatutCampagne(variables.id, variables.statut),
    onSuccess: invalider,
  });
}
