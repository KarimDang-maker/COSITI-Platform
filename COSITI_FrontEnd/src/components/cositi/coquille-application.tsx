import type { ReactNode } from "react";
import { NavigationLaterale } from "@/components/cositi/navigation-laterale";
import { EnteteApplication } from "@/components/cositi/entete-application";

interface CoquilleApplicationProps {
  titre: string;
  children: ReactNode;
}

/**
 * Gabarit fixe des six tableaux de bord et de tous les écrans internes
 * (`docs/02_DESIGN_SYSTEM.md §8`) : navigation latérale + en-tête + contenu,
 * largeur de contenu maximale `--largeur-contenu-max`.
 */
export function CoquilleApplication({ titre, children }: CoquilleApplicationProps) {
  return (
    <div className="flex h-dvh bg-fond">
      <NavigationLaterale />
      <div className="flex min-w-0 flex-1 flex-col">
        <EnteteApplication titre={titre} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-(--largeur-contenu-max) p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
