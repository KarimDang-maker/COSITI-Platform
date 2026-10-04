import { useEffect, useState } from "react";
import { Maximize, Menu, Minimize, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/auth/ContexteAuth";
import { BoutonEntete } from "@/components/cositi/bouton-entete";
import { ClocheNotifications } from "@/components/cositi/cloche-notifications";
import { IndicateurTempsReel } from "@/components/cositi/indicateur-temps-reel";
import { MenuCreation } from "@/components/cositi/menu-creation";
import { MenuUtilisateur } from "@/components/cositi/menu-utilisateur";

/**
 * Plein écran (gabarit : `btn-fullscreen`) — fonction du navigateur, sans
 * donnée. Masqué sur écran étroit et quand le navigateur ne la propose pas.
 */
function BoutonPleinEcran() {
  const [actif, setActif] = useState(false);
  useEffect(() => {
    const suivre = () => setActif(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", suivre);
    return () => document.removeEventListener("fullscreenchange", suivre);
  }, []);
  if (typeof document === "undefined" || !document.fullscreenEnabled) return null;

  return (
    <BoutonEntete
      aria-label={actif ? "Quitter le plein écran" : "Passer en plein écran"}
      aria-pressed={actif}
      className="hidden md:inline-flex"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      }}
    >
      {actif ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
    </BoutonEntete>
  );
}

interface EnteteApplicationProps {
  navigationRepliee: boolean;
  /** Replie ou déplie la navigation fixe (écran large). */
  onBasculerNavigation: () => void;
  /** Ouvre le tiroir de navigation (écran étroit). */
  onOuvrirTiroir: () => void;
}

/**
 * En-tête collant de la coquille (gabarit : `navbar-custom`) — fond de page
 * translucide ; à gauche, repli de la navigation et menu « Créer » ; à
 * droite, état de la mise à jour en direct, notifications et menu utilisateur
 * avec rappel du rôle.
 *
 * La recherche globale du gabarit n'est pas reprise : aucun écran de
 * `docs/03_SPECIFICATIONS_ECRANS.md` ne la spécifie (`AGENTS.md` règle 10 —
 * ne pas inventer un écran). Le titre de l'écran n'est pas répété ici : il vit
 * dans le `h1` de `EnTetePage`.
 */
export function EnteteApplication({ navigationRepliee, onBasculerNavigation, onOuvrirTiroir }: EnteteApplicationProps) {
  const { utilisateur } = useAuth();
  if (!utilisateur) return null;

  return (
    <header className="sticky top-0 z-(--z-entete) flex h-(--hauteur-entete) shrink-0 items-center justify-between gap-4 border-b border-bordure/70 bg-entete-fond px-(--marge-page-compacte) backdrop-blur-md xl:px-(--marge-page)">
      <div className="flex items-center gap-3">
        <BoutonEntete aria-label="Ouvrir la navigation" className="lg:hidden" onClick={onOuvrirTiroir}>
          <Menu aria-hidden="true" />
        </BoutonEntete>
        <BoutonEntete
          aria-label={navigationRepliee ? "Déplier la navigation" : "Replier la navigation"}
          aria-expanded={!navigationRepliee}
          className="hidden lg:inline-flex"
          onClick={onBasculerNavigation}
        >
          {navigationRepliee ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </BoutonEntete>
        <MenuCreation />
      </div>

      <div className="flex items-center gap-3">
        <IndicateurTempsReel />
        <BoutonPleinEcran />
        <ClocheNotifications />
        <MenuUtilisateur />
      </div>
    </header>
  );
}
