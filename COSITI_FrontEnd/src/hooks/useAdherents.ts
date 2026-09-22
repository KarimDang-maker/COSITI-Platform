import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  creerAdherent,
  listerAdherents,
  obtenirAdherent,
  obtenirSituationAdherent,
  verifierDoublon,
  type CorpsCreationAdherent,
  type CorpsVerificationDoublon,
  type FiltresAdherents,
} from "@/api/adherents";

const CLE_ADHERENTS = "adherents" as const;

export function useAdherents(filtres: FiltresAdherents) {
  return useQuery({
    queryKey: [CLE_ADHERENTS, "liste", filtres],
    queryFn: () => listerAdherents(filtres),
    placeholderData: (precedente) => precedente,
  });
}

export function useAdherent(id: string | undefined) {
  return useQuery({
    queryKey: [CLE_ADHERENTS, "detail", id],
    queryFn: () => obtenirAdherent(id!),
    enabled: !!id,
  });
}

export function useSituationAdherent(id: string | undefined) {
  return useQuery({
    queryKey: [CLE_ADHERENTS, "situation", id],
    queryFn: () => obtenirSituationAdherent(id!),
    enabled: !!id,
  });
}

/** Vérification de doublon — appelée à l'initiative de l'écran, jamais bloquante. */
export function useVerifierDoublon() {
  return useMutation({
    mutationFn: (corps: CorpsVerificationDoublon) => verifierDoublon(corps),
  });
}

export function useCreerAdherent() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (corps: CorpsCreationAdherent) => creerAdherent(corps),
    onSuccess: () => {
      void clientRequetes.invalidateQueries({ queryKey: [CLE_ADHERENTS, "liste"] });
    },
  });
}
