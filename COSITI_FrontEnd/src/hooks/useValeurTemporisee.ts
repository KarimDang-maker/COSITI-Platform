import { useEffect, useState } from "react";

/**
 * Renvoie `valeur` après `delai` ms sans changement. Sert aux recherches serveur (nom, téléphone) :
 * une requête par intention de recherche, pas une par frappe.
 */
export function useValeurTemporisee<T>(valeur: T, delai = 300): T {
  const [temporisee, setTemporisee] = useState(valeur);
  useEffect(() => {
    const minuteur = setTimeout(() => setTemporisee(valeur), delai);
    return () => clearTimeout(minuteur);
  }, [valeur, delai]);
  return temporisee;
}
