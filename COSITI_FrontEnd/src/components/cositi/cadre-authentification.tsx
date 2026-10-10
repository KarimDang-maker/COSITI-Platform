import type { ReactNode } from "react";
import { LogoCositi } from "@/components/cositi/logo-cositi";

interface CadreAuthentificationProps {
  titre: string;
  sousTitre?: string;
  children: ReactNode;
}

/**
 * Écran hors coquille — connexion, changement de mot de passe (gabarit :
 * `login-card`). Carte centrée de 448 px sur le fond de page, logo vertical
 * de la charte au-dessus du titre. Aucune décoration de fond : la charte
 * interdit de poser le logo couleur sur un fond chargé.
 */
export function CadreAuthentification({ titre, sousTitre, children }: CadreAuthentificationProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-fond p-6">
      <main className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-flottante sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-5 text-center">
          <LogoCositi contexte="connexion-verticale" className="h-24 w-auto" />
          <div className="space-y-1.5">
            <h1 className="text-2xl">{titre}</h1>
            {sousTitre && <p className="text-sm text-texte-doux">{sousTitre}</p>}
          </div>
        </div>
        {children}
      </main>
      <p className="text-center text-xs text-texte-doux-fort">
        COSITI COOP-CA — Coopération · action · confiance
      </p>
    </div>
  );
}
