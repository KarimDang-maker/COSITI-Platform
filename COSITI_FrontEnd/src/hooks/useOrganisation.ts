import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  affecterPortefeuille,
  changerStatutAgent,
  creerAgent,
  designerChef,
  listerAgents,
  listerAgentsPagines,
  listerEligiblesCnpsPortefeuille,
  listerOperationsAgent,
  listerProchesSeuilPortefeuille,
  listerSansAgentReferent,
  listerZones,
  modifierAgent,
  obtenirAgent,
  obtenirChargeAgent,
  obtenirChefCourant,
  obtenirDistributionPortefeuilles,
  obtenirHistoriquePortefeuille,
  obtenirPortefeuilleAgent,
  obtenirResumeCotisationsAgent,
  obtenirResumePortefeuille,
  remplacerChef,
  retirerPortefeuille,
  transfererPortefeuille,
  type CorpsCreationAgent,
  type CorpsModificationAgent,
  type FiltresAgents,
} from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";

const CLE = "organisation" as const;

export function useZones() {
  return useQuery({ queryKey: [CLE, "zones"], queryFn: listerZones, staleTime: 5 * 60 * 1000 });
}

/** Référentiel des agents pour les sélecteurs (tableau simple, jusqu'à 200 agents). */
export function useAgents(actif = true) {
  return useQuery({ queryKey: [CLE, "agents", "referentiel"], queryFn: listerAgents, enabled: actif });
}

/** #1, #2, #21 — liste paginée de l'écran « Agents de terrain » ; la page précédente reste affichée. */
export function useAgentsPagines(filtres: FiltresAgents) {
  return useQuery({
    queryKey: [CLE, "agents", "liste", filtres],
    queryFn: () => listerAgentsPagines(filtres),
    placeholderData: (precedente) => precedente,
  });
}

/** #3 — toutes les lectures de la fiche agent partagent le préfixe `[organisation, "agent", id]`. */
export function useAgent(agentId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "agent", agentId],
    queryFn: () => obtenirAgent(agentId!),
    enabled: !!agentId,
  });
}

/** #20 */
export function useChargeAgent(agentId: string, periode: string) {
  return useQuery({
    queryKey: [CLE, "charge", agentId, periode],
    queryFn: () => obtenirChargeAgent(agentId, periode),
  });
}

/** #9 */
export function usePortefeuilleAgent(agentId: string | undefined, page = 0, taille = 25) {
  return useQuery({
    queryKey: [CLE, "portefeuille", agentId, page, taille],
    queryFn: () => obtenirPortefeuilleAgent(agentId!, page, taille),
    enabled: !!agentId,
    placeholderData: (precedente) => precedente,
  });
}

/** #8, #10, #11 */
export function useResumePortefeuille(agentId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "agent", agentId, "resume-portefeuille"],
    queryFn: () => obtenirResumePortefeuille(agentId!),
    enabled: !!agentId,
  });
}

/** #24 */
export function useHistoriquePortefeuille(agentId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "agent", agentId, "historique-portefeuille"],
    queryFn: () => obtenirHistoriquePortefeuille(agentId!),
    enabled: !!agentId && actif,
  });
}

/** #12 (`proches`) et #13 (`eligibles`) — `actif` faux sans `CNPS:LIRE`. */
export function useCnpsPortefeuille(agentId: string | undefined, mode: "proches" | "eligibles", actif = true) {
  return useQuery({
    queryKey: [CLE, "agent", agentId, "cnps", mode],
    queryFn: () =>
      mode === "proches" ? listerProchesSeuilPortefeuille(agentId!) : listerEligiblesCnpsPortefeuille(agentId!),
    enabled: !!agentId && actif,
  });
}

/** #14, #15 — `actif` faux sans `PAIEMENT:LIRE` (le résumé lit le journal des paiements). */
export function useResumeCotisationsAgent(agentId: string | undefined, periode: string, actif = true) {
  return useQuery({
    queryKey: [CLE, "agent", agentId, "cotisations", periode],
    queryFn: () => obtenirResumeCotisationsAgent(agentId!, periode),
    enabled: !!agentId && actif,
    placeholderData: (precedente) => precedente,
  });
}

/** #7, #22, #23 */
export function useOperationsAgent(agentId: string | undefined, depuis?: string, jusqua?: string) {
  return useQuery({
    queryKey: [CLE, "agent", agentId, "operations", depuis, jusqua],
    queryFn: () => listerOperationsAgent(agentId!, depuis, jusqua),
    enabled: !!agentId,
  });
}

/** #19 */
export function useDistributionPortefeuilles(actif = true) {
  return useQuery({
    queryKey: [CLE, "distribution"],
    queryFn: obtenirDistributionPortefeuilles,
    enabled: actif,
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
  // Une affectation change aussi l'agent responsable affiché sur la fiche adhérent (#22) et le
  // filtre « agent » de la liste (#6) : ces clés vivent dans le domaine `adherents`.
  void clientRequetes.invalidateQueries({ queryKey: ["adherents"] });
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

/** #17 */
export function useRetirerPortefeuille() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ adherentId, motif }: { adherentId: string; motif: string }) => retirerPortefeuille(adherentId, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}

/** #5 */
export function useModifierAgent(agentId: string) {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (corps: CorpsModificationAgent) => modifierAgent(agentId, corps),
    onSuccess: () => invalider(clientRequetes),
  });
}

/** #6 — rafraîchit la liste, la fiche, la répartition (agents actifs seulement) et les sélecteurs. */
export function useChangerStatutAgent(agentId: string) {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ actif, motif }: { actif: boolean; motif: string }) => changerStatutAgent(agentId, actif, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}
