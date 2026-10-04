import type { ReactNode } from "react";
import { useAuth } from "@/auth/ContexteAuth";
import { ContexteTempsReel } from "@/app/contexteTempsReel";
import { useTempsReel } from "@/hooks/useTempsReel";

/**
 * Un seul flux temps réel par onglet, ouvert tant que la session est connectée. Placé au-dessus du routeur :
 * changer d'écran ne rouvre pas la connexion.
 */
export function FournisseurTempsReel({ children }: { children: ReactNode }) {
  const { statut } = useAuth();
  const etat = useTempsReel(statut === "connecte");
  return <ContexteTempsReel.Provider value={etat}>{children}</ContexteTempsReel.Provider>;
}
