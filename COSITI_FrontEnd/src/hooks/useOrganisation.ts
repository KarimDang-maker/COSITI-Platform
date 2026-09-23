import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  affecterPortefeuille,
  creerAgent,
  designerChef,
  listerAgents,
  listerSansAgentReferent,
  listerZones,
  obtenirChargeAgent,
  obtenirChefCourant,
  obtenirPortefeuilleAgent,
  remplacerChef,
  transfererPortefeuille,
  type CorpsCreationAgent,
} from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";

const CLE = "organisation" as const;

export function useZones() {
  return useQuery({ queryKey: [CLE, "zones"], queryFn: listerZones, staleTime: 5 * 60 * 1000 });
}

export function useAgents() {
  return useQuery({ queryKey: [CLE, "agents"], queryFn: listerAgents });
}

export function useChargeAgent(agentId: string, periode: string) {
  return useQuery({
    queryKey: [CLE, "charge", agentId, periode],
    queryFn: () => obtenirChargeAgent(agentId, periode),
  });
}

export function usePortefeuilleAgent(agentId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "portefeuille", agentId],
    queryFn: () => obtenirPortefeuilleAgent(agentId!),
    enabled: !!agentId,
  });
}

export function useSansAgentReferent(zoneId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "sans-agent", zoneId],
    queryFn: () => listerSansAgentReferent(zoneId!),
    enabled: !!zoneId,
  });
}

/** Renvoie `undefined` (jamais une erreur) quand aucun Chef n'est encore désigné pour la zone. */
export function useChefCourant(zoneId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "chef", zoneId],
    queryFn: async () => {
      try {
        return await obtenirChefCourant(zoneId!);
      } catch (e) {
        if (estErreurApi(e) && e.statut === 404) return null;
        throw e;
      }
    },
    enabled: !!zoneId,
  });
}

export function useCreerAgent() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (corps: CorpsCreationAgent) => creerAgent(corps),
    onSuccess: () => void clientRequetes.invalidateQueries({ queryKey: [CLE, "agents"] }),
  });
}

function invalider(clientRequetes: ReturnType<typeof useQueryClient>) {
  void clientRequetes.invalidateQueries({ queryKey: [CLE] });
}

export function useDesignerChef() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, motif }: { agentId: string; motif: string }) => designerChef(agentId, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}

export function useRemplacerChef() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, motif }: { agentId: string; motif: string }) => remplacerChef(agentId, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}

export function useAffecterPortefeuille() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ adherentId, agentId, motif }: { adherentId: string; agentId: string; motif?: string }) =>
      affecterPortefeuille(adherentId, agentId, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}

export function useTransfererPortefeuille() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({
      adherentIds,
      nouvelAgentId,
      motif,
    }: {
      adherentIds: readonly string[];
      nouvelAgentId: string;
      motif: string;
    }) => transfererPortefeuille(adherentIds, nouvelAgentId, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}
