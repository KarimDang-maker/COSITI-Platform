import { useEffect, useState, type ReactNode } from "react";
import { NavigationLaterale } from "@/components/cositi/navigation-laterale";
import { EnteteApplication } from "@/components/cositi/entete-application";
import { PiedPage } from "@/components/cositi/pied-page";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface CoquilleApplicationProps {
  /** Titre de l'écran : repris dans l'onglet du navigateur (« Adhérents — COSITI »). */
  titre: string;
  children: ReactNode;
}

/**
 * Préférence d'affichage uniquement — jamais une donnée métier ni un jeton
 * (`AGENTS.md` règle 3). Lecture protégée : un stockage bloqué ou absent
 * (navigation privée, tests) laisse simplement la navigation dépliée.
 */
const CLE_PREFERENCE = "cositi.navigation.repliee";

function lirePreference(): boolean {
  try {
    return window.localStorage.getItem(CLE_PREFERENCE) === "1";
  } catch {
    return false;
  }
}

function ecrirePreference(repliee: boolean) {
  try {
    window.localStorage.setItem(CLE_PREFERENCE, repliee ? "1" : "0");
  } catch {
    // Stockage indisponible : la préférence ne survit pas au rechargement, sans autre conséquence.
  }
}

/**
 * Gabarit fixe des six tableaux de bord et de tous les écrans internes
 * (`docs/02_DESIGN_SYSTEM.md §8`, gabarit Spark) :
 *
 * - navigation latérale fixe de 280 px, repliable à 80 px au-delà de 1024 px ;
 * - sous 1024 px, navigation en tiroir ouvert depuis l'en-tête ;
 * - en-tête collant de 72 px, contenu de 1440 px au plus, pied de page.
 */
export function CoquilleApplication({ titre, children }: CoquilleApplicationProps) {
  const [repliee, setRepliee] = useState(lirePreference);
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  useEffect(() => {
    const precedent = document.title;
    document.title = `${titre} — COSITI`;
    return () => {
      document.title = precedent;
    };
  }, [titre]);

  function basculerNavigation() {
    setRepliee((valeur) => {
      ecrirePreference(!valeur);
      return !valeur;
    });
  }

  return (
    <div className="min-h-dvh bg-fond">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-(--z-nav) hidden transition-[width] duration-(--duree-base) ease-cositi lg:block",
          repliee ? "w-(--largeur-nav-repliee)" : "w-(--largeur-nav)",
        )}
      >
        <NavigationLaterale repliee={repliee} />
      </aside>

      <Sheet open={tiroirOuvert} onOpenChange={setTiroirOuvert}>
        <SheetContent
          side="left"
          className="w-(--largeur-nav) max-w-[85vw] gap-0 border-0 bg-nav-fond p-0 text-nav-contenu sm:max-w-(--largeur-nav) [&>button]:text-nav-contenu"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Accès aux écrans autorisés pour votre compte.</SheetDescription>
          <NavigationLaterale onNaviguer={() => setTiroirOuvert(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          "flex min-h-dvh min-w-0 flex-col transition-[padding] duration-(--duree-base) ease-cositi",
          repliee ? "lg:pl-(--largeur-nav-repliee)" : "lg:pl-(--largeur-nav)",
        )}
      >
        <EnteteApplication
          navigationRepliee={repliee}
          onBasculerNavigation={basculerNavigation}
          onOuvrirTiroir={() => setTiroirOuvert(true)}
        />
        <main className="flex-1">
          <div className="mx-auto flex min-h-full w-full max-w-(--largeur-contenu-max) flex-col gap-8 px-(--marge-page-compacte) py-8 xl:px-(--marge-page)">
            <div className="flex-1">{children}</div>
            <PiedPage />
          </div>
        </main>
      </div>
    </div>
  );
}
