import { createContext, useContext } from "react";
import type { EtatTempsReel } from "@/hooks/useTempsReel";

/** Fourni par `FournisseurTempsReel` ; « inactif » hors session ou hors fournisseur (tests de composant). */
export const ContexteTempsReel = createContext<EtatTempsReel>("inactif");

export function useEtatTempsReel(): EtatTempsReel {
  return useContext(ContexteTempsReel);
}
