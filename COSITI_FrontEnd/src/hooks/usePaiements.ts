import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annulerPaiement,
  confirmerParChefPaiement,
  corrigerPaiement,
  enregistrerPaiement,
  listerAffectationsPaiement,
  listerPaiements,
  obtenirPaiement,
  obtenirRecu,
  signalerIncoherencePaiement,
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

/** Contrôle DAF (J5) — signalement d'incohérence, voir `api/paiements.ts`. */
export function useSignalerIncoherencePaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => signalerIncoherencePaiement(id, motif),
    onSuccess: (_donnees, { id }) => invalider(clientRequetes, id),
  });
}

/** Confirmation hiérarchique du Chef (UC-CHEF-10, J5) — voir `api/paiements.ts`. */
export function useConfirmerParChefPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif?: string }) => confirmerParChefPaiement(id, motif),
    onSuccess: (_donnees, { id }) => invalider(clientRequetes, id),
  });
}

/** Répartition Sécurité Sociale/Épargne (§7-§8) — n'existe qu'une fois le paiement validé. */
export function useAffectationsPaiement(id: string | undefined) {
  return useQuery({
    queryKey: [CLE, "affectations", id],
    queryFn: () => listerAffectationsPaiement(id!),
    enabled: !!id,
  });
}

/** Reçu provisoire (avant validation) ou définitif (après) — RAPORT_V1.md §6.2 point 8. */
export function useRecuPaiement(id: string | undefined, active: boolean) {
  return useQuery({
    queryKey: [CLE, "recu", id],
    queryFn: () => obtenirRecu(id!),
    enabled: !!id && active,
  });
}
