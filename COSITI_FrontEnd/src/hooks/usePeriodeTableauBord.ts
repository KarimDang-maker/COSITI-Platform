import { useSearchParams } from "react-router";
import type { FiltresTableauBord } from "@/api/tableauxDeBord";
import type { Periode } from "@/components/cositi/selecteur-periode";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Période d'un tableau de bord, portée par l'URL (`?du=2026-09-01&au=2026-09-28`)
 * pour qu'un lien partagé montre les mêmes chiffres. Sans période, rien n'est
 * envoyé : l'API applique sa propre valeur par défaut (le mois civil en cours,
 * `CritereTableauBord` côté serveur) — le client ne la recalcule pas.
 */
export function usePeriodeTableauBord() {
  const [parametres, definirParametres] = useSearchParams();
  const du = parametres.get("du");
  const au = parametres.get("au");
  const periode: Periode | undefined = du && au && ISO.test(du) && ISO.test(au) && du <= au ? { du, au } : undefined;

  const filtres: FiltresTableauBord = periode ? { du: periode.du, au: periode.au } : {};

  function changer(nouvelle: Periode | undefined) {
    const suivants = new URLSearchParams(parametres);
    if (nouvelle) {
      suivants.set("du", nouvelle.du);
      suivants.set("au", nouvelle.au);
    } else {
      suivants.delete("du");
      suivants.delete("au");
    }
    definirParametres(suivants, { replace: true });
  }

  return { periode, filtres, changer };
}
