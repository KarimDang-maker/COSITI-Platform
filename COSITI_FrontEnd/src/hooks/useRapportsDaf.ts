import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listerRapportsDaf,
  obtenirRapportDaf,
  produireRapportDaf,
  transmettreRapportDaf,
  type ProductionRapport,
  type StatutRapportDaf,
} from "@/api/rapportsDaf";

const CLE = "rapports-daf" as const;

export function useRapportsDaf(filtres: { statut?: StatutRapportDaf; page?: number; taille?: number }) {
  return useQuery({
    queryKey: [CLE, "liste", filtres],
    queryFn: () => listerRapportsDaf(filtres),
    placeholderData: (precedente) => precedente,
  });
}

export function useRapportDaf(id: string | undefined) {
  return useQuery({
    queryKey: [CLE, "detail", id],
    queryFn: () => obtenirRapportDaf(id!),
    enabled: !!id,
  });
}

function useInvalidation() {
  const clientRequetes = useQueryClient();
  return () => clientRequetes.invalidateQueries({ queryKey: [CLE] });
}

export function useProduireRapportDaf() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (production: ProductionRapport) => produireRapportDaf(production),
    onSuccess: invalider,
  });
}

export function useTransmettreRapportDaf() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (id: string) => transmettreRapportDaf(id),
    onSuccess: invalider,
  });
}
