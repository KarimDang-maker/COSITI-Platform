import { useQuery } from "@tanstack/react-query";
import {
  obtenirTableauBordDaf,
  obtenirTableauBordDg,
  obtenirTableauBordDga,
  obtenirTableauBordGestionnaire,
  obtenirTableauBordPca,
  obtenirTableauBordSuperAdmin,
  type FiltresTableauBord,
} from "@/api/tableauxDeBord";

const CLE = "tableaux-de-bord" as const;

/**
 * Les dashboards lisent des vues matérialisées rafraîchies périodiquement côté
 * serveur : les re-demander à chaque montage n'apporterait rien. `staleTime` de
 * 5 minutes, aligné sur cet ordre de grandeur, et pas de rafraîchissement au
 * retour de focus — la connexion terrain est lente.
 */
const OPTIONS = { staleTime: 5 * 60_000, refetchOnWindowFocus: false } as const;

export function useTableauBordPca(filtres: FiltresTableauBord = {}) {
  return useQuery({ queryKey: [CLE, "pca", filtres], queryFn: () => obtenirTableauBordPca(filtres), ...OPTIONS });
}

export function useTableauBordDg(filtres: FiltresTableauBord = {}) {
  return useQuery({ queryKey: [CLE, "dg", filtres], queryFn: () => obtenirTableauBordDg(filtres), ...OPTIONS });
}

export function useTableauBordDga(filtres: FiltresTableauBord = {}) {
  return useQuery({ queryKey: [CLE, "dga", filtres], queryFn: () => obtenirTableauBordDga(filtres), ...OPTIONS });
}

export function useTableauBordDaf(filtres: FiltresTableauBord = {}) {
  return useQuery({ queryKey: [CLE, "daf", filtres], queryFn: () => obtenirTableauBordDaf(filtres), ...OPTIONS });
}

export function useTableauBordGestionnaire(filtres: FiltresTableauBord = {}) {
  return useQuery({
    queryKey: [CLE, "gestionnaire", filtres],
    queryFn: () => obtenirTableauBordGestionnaire(filtres),
    ...OPTIONS,
  });
}

export function useTableauBordSuperAdmin(filtres: FiltresTableauBord = {}) {
  return useQuery({
    queryKey: [CLE, "super-admin", filtres],
    queryFn: () => obtenirTableauBordSuperAdmin(filtres),
    ...OPTIONS,
  });
}
