import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  declarerRemiseCaisse,
  listerCotisationsARemettre,
  listerRemisesCaisse,
  receptionnerRemiseCaisse,
  type FiltresRemises,
} from "@/api/remisesCaisse";

const CLE = "remises-caisse" as const;

/** Liste des remises (DAF, `FINANCES:CONSULTER`). */
export function useRemisesCaisse(filtres: FiltresRemises, actif = true) {
  return useQuery({
    queryKey: [CLE, "liste", filtres],
    queryFn: () => listerRemisesCaisse(filtres),
    placeholderData: (precedente) => precedente,
    enabled: actif,
  });
}

/** Cotisations encaissées par l'agent et pas encore remises (`PAIEMENT:CREER`). */
export function useCotisationsARemettre(agentId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "a-remettre", agentId],
    queryFn: () => listerCotisationsARemettre(agentId!),
    enabled: actif && !!agentId,
  });
}

export function useDeclarerRemiseCaisse() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: declarerRemiseCaisse,
    onSuccess: () => void clientRequetes.invalidateQueries({ queryKey: [CLE] }),
  });
}

export function useReceptionnerRemiseCaisse() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, montantRecu }: { id: string; montantRecu: number }) => receptionnerRemiseCaisse(id, montantRecu),
    onSuccess: () => void clientRequetes.invalidateQueries({ queryKey: [CLE] }),
  });
}
