import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Mêmes classes que `CardTitle` : le titre de carte porte un vrai niveau de titre. */
const CLASSES_TITRE_CARTE = "text-lg leading-snug font-bold tracking-normal text-titre";

interface CarteSectionProps {
  titre?: ReactNode;
  description?: ReactNode;
  /** Actions de la carte : `MenuActions`, bouton secondaire, légende. */
  actions?: ReactNode;
  /** Niveau du titre. `h2` par défaut ; `h3` pour une carte imbriquée dans une section titrée. */
  niveauTitre?: "h2" | "h3";
  /**
   * Contenu collé aux bords de la carte — tableau, liste pleine largeur. Sans
   * cela, le contenu reçoit les marges internes de 24 px.
   */
  contenuPleineLargeur?: boolean;
  pied?: ReactNode;
  className?: string;
  contenuClassName?: string;
  children: ReactNode;
}

/**
 * Conteneur de section du gabarit : carte blanche sans bordure, rayon 24 px,
 * ombre douce ; titre à gauche, actions à droite. Compose `ui/card.tsx` —
 * c'est la seule manière de poser une carte dans un écran COSITI.
 *
 * Titre de carte : 18 px, graisse 700, vert foncé (`docs/02 §6`). Le `h2`
 * hors carte garde les 22 px de la charte.
 */
export function CarteSection({
  titre,
  description,
  actions,
  niveauTitre = "h2",
  contenuPleineLargeur = false,
  pied,
  className,
  contenuClassName,
  children,
}: CarteSectionProps) {
  const NiveauTitre = niveauTitre;
  const aUnEnTete = titre !== undefined || description !== undefined || actions !== undefined;

  return (
    <Card
      className={cn(
        contenuPleineLargeur && "overflow-hidden pb-0",
        contenuPleineLargeur && !aUnEnTete && "pt-0",
        className,
      )}
    >
      {aUnEnTete && (
        <CardHeader>
          {titre !== undefined && (
            <NiveauTitre data-slot="card-title" className={CLASSES_TITRE_CARTE}>
              {titre}
            </NiveauTitre>
          )}
          {description !== undefined && <CardDescription>{description}</CardDescription>}
          {actions !== undefined && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={cn(contenuPleineLargeur && "px-0", contenuClassName)}>{children}</CardContent>
      {pied !== undefined && (
        <CardFooter className={cn("border-t", contenuPleineLargeur && "py-4")}>{pied}</CardFooter>
      )}
    </Card>
  );
}
