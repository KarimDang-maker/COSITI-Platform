import { useQuery } from "@tanstack/react-query";
import {
  listerRetardataires,
  obtenirPeriodesDroits,
  obtenirSituationDroits,
  type FiltresRetardataires,
} from "@/api/droits";

const CLE = "droits" as const;

export function useSituationDroits(adherentId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "situation", adherentId],
    queryFn: () => obtenirSituationDroits(adherentId!),
    enabled: !!adherentId,
  });
}

export function usePeriodesDroits(adherentId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "periodes", adherentId],
    queryFn: () => obtenirPeriodesDroits(adherentId!),
    enabled: !!adherentId,
  });
}

export function useRetardataires(filtres: FiltresRetardataires) {
  return useQuery({
    queryKey: [CLE, "retardataires", filtres],
    queryFn: () => listerRetardataires(filtres),
    placeholderData: (precedente) => precedente,
  });
}
