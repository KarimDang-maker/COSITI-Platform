import logoInverse from "@marque/COSITI_logo_inverse.png";
import icone from "@marque/COSITI_icon_hd.png";
import logoHorizontal from "@marque/COSITI_logo_horizontal_hd.png";
import logoVertical from "@marque/COSITI_logo_vertical_hd.png";

type ContexteLogo = "nav" | "nav-repliee" | "entete" | "connexion-verticale";

const SOURCES: Readonly<Record<ContexteLogo, string>> = {
  nav: logoInverse,
  "nav-repliee": icone,
  entete: logoHorizontal,
  "connexion-verticale": logoVertical,
};

interface LogoCositiProps {
  contexte: ContexteLogo;
  className?: string;
}

/**
 * Sélectionne la bonne variante de logo selon le contexte
 * (`docs/02_DESIGN_SYSTEM.md §12`). Ne jamais recolorer, étirer ni incliner
 * le fichier renvoyé — ce composant n'est qu'un point de sélection.
 */
export function LogoCositi({ contexte, className }: LogoCositiProps) {
  return <img src={SOURCES[contexte]} alt="COSITI" className={className} />;
}
