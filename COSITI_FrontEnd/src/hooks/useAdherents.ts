import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  creerAdherent,
  finaliserAdherent,
  listerAdherents,
  obtenirAdherent,
  obtenirComptesAdherent,
  preinscrireAdherent,
  verifierDoublon,
  type CorpsCreationAdherent,
  type CorpsFinalisationAdherent,
  type CorpsPreinscriptionAdherent,
  type CorpsVerificationDoublon,
  type FiltresAdherents,
  listerActivites,
  listerPacks,
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

/** Saisie préparatoire par l'Agent de terrain (§5) — jamais une création définitive. */
export function usePreinscrireAdherent() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (corps: CorpsPreinscriptionAdherent) => preinscrireAdherent(corps),
    onSuccess: () => {
      void clientRequetes.invalidateQueries({ queryKey: [CLE_ADHERENTS, "liste"] });
    },
  });
}

/** Complète un adhérent préinscrit en dossier définitif — réservée à la Gestionnaire (§5). */
export function useFinaliserAdherent(id: string) {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (corps: CorpsFinalisationAdherent) => finaliserAdherent(id, corps),
    onSuccess: () => {
      void clientRequetes.invalidateQueries({ queryKey: [CLE_ADHERENTS, "detail", id] });
      void clientRequetes.invalidateQueries({ queryKey: [CLE_ADHERENTS, "liste"] });
      void clientRequetes.invalidateQueries({ queryKey: [CLE_ADHERENTS, "comptes", id] });
    },
  });
}

/** État des deux comptes métier (Sécurité Sociale/Épargne) de l'adhérent, sur un seul dossier (§7). */
export function useComptesAdherent(id: string | undefined) {
  return useQuery({
    queryKey: [CLE_ADHERENTS, "comptes", id],
    queryFn: () => obtenirComptesAdherent(id!),
    enabled: !!id,
  });
}

/** Référentiel des activités. Stable : mis en cache cinq minutes, comme les zones. */
export function useActivites() {
  return useQuery({
    queryKey: ["adherents", "activites"],
    queryFn: listerActivites,
    staleTime: 5 * 60 * 1000,
  });
}

/** Référentiel des packs de cotisation. Stable : même mise en cache que les activités. */
export function usePacks() {
  return useQuery({
    queryKey: ["adherents", "packs"],
    queryFn: listerPacks,
    staleTime: 5 * 60 * 1000,
  });
}
