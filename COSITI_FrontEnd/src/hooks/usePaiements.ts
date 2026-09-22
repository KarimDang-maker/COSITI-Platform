import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annulerPaiement,
  corrigerPaiement,
  enregistrerPaiement,
  listerPaiements,
  obtenirPaiement,
  validerPaiement,
  type CorpsCorrectionPaiement,
  type CorpsEnregistrementPaiement,
  type FiltresPaiements,
} from "@/api/paiements";

const CLE = "paiements" as const;

export function usePaiements(filtres: FiltresPaiements) {
  return useQuery({
    queryKey: [CLE, "liste", filtres],
    queryFn: () => listerPaiements(filtres),
    placeholderData: (precedente) => precedente,
  });
}

export function usePaiement(id: string | undefined) {
  return useQuery({
    queryKey: [CLE, "detail", id],
    queryFn: () => obtenirPaiement(id!),
    enabled: !!id,
  });
}

export function useEnregistrerPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ corps, cleIdempotence }: { corps: CorpsEnregistrementPaiement; cleIdempotence: string }) =>
      enregistrerPaiement(corps, cleIdempotence),
    onSuccess: () => void clientRequetes.invalidateQueries({ queryKey: [CLE, "liste"] }),
  });
}

function invalider(clientRequetes: ReturnType<typeof useQueryClient>, id: string) {
  void clientRequetes.invalidateQueries({ queryKey: [CLE] });
  void clientRequetes.invalidateQueries({ queryKey: [CLE, "detail", id] });
}

export function useValiderPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => validerPaiement(id),
    onSuccess: (_donnees, id) => invalider(clientRequetes, id),
  });
}

export function useCorrigerPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, corps }: { id: string; corps: CorpsCorrectionPaiement }) => corrigerPaiement(id, corps),
    onSuccess: (_donnees, { id }) => invalider(clientRequetes, id),
  });
}

export function useAnnulerPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => annulerPaiement(id, motif),
    onSuccess: (_donnees, { id }) => invalider(clientRequetes, id),
  });
}
