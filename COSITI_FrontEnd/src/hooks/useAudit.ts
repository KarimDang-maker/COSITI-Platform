import { useQuery } from "@tanstack/react-query";
import { listerAudit, type FiltresAudit } from "@/api/audit";

/** Lecture seule : aucune mutation n'existe sur le journal d'audit. */
export function useAudit(filtres: FiltresAudit) {
  return useQuery({
    queryKey: ["audit", filtres],
    queryFn: () => listerAudit(filtres),
    placeholderData: (precedente) => precedente,
  });
}
