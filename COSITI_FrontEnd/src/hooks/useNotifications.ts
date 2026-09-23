import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  compterNonLues,
  listerNotifications,
  marquerNotificationLue,
} from "@/api/notifications";

const CLE = "notifications" as const;

export function useNotifications(filtres: { seulementNonLues?: boolean; page?: number; taille?: number } = {}) {
  return useQuery({
    queryKey: [CLE, "liste", filtres],
    queryFn: () => listerNotifications(filtres),
  });
}

/**
 * Compteur affiché dans l'en-tête. Rafraîchi à intervalle régulier parce qu'une notification arrive d'une
 * action faite par quelqu'un d'autre : sans cela, un Gestionnaire ne verrait un compte rendu reçu qu'en
 * rechargeant la page. Intervalle volontairement long — la connexion terrain est lente (voir
 * `outils/dev/README.md`), et ce compteur n'est pas une donnée temps réel.
 */
export function useCompteNonLues() {
  return useQuery({
    queryKey: [CLE, "non-lues"],
    queryFn: () => compterNonLues(),
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarquerNotificationLue() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marquerNotificationLue(id),
    onSuccess: () => clientRequetes.invalidateQueries({ queryKey: [CLE] }),
  });
}
