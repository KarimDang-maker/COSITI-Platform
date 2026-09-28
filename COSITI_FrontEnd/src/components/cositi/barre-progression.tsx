import { cn } from "@/lib/utils";
import { CLASSES_REMPLISSAGE } from "@/lib/statuts";

interface BarreProgressionProps {
  libelle: string;
  /**
   * Part remplie, entre 0 et 1, **fournie par l'API** ou issue d'un simple
   * rapport d'affichage entre deux valeurs serveur — jamais d'un calcul métier.
   */
  ratio: number;
  /** Valeur écrite à droite du libellé, déjà mise en forme par `lib/format.ts`. */
  valeur: string;
  teinte?: keyof typeof CLASSES_REMPLISSAGE;
  className?: string;
}

/**
 * Barre de progression du gabarit (« Product Overview ») : libellé et valeur
 * au-dessus, barre pleine arrondie en dessous. La valeur est toujours écrite :
 * la longueur de la barre n'est qu'un repère visuel.
 */
export function BarreProgression({ libelle, ratio, valeur, teinte = "primaire", className }: BarreProgressionProps) {
  const pourcentage = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-texte">{libelle}</span>
        <span className="chiffre font-bold text-texte-doux-fort">{valeur}</span>
      </div>
      <div
        role="progressbar"
        aria-label={libelle}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pourcentage}
        aria-valuetext={valeur}
        className="h-2.5 overflow-hidden rounded-full bg-fond"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-(--duree-base)", CLASSES_REMPLISSAGE[teinte])}
          style={{ width: `${pourcentage}%` }}
        />
      </div>
    </div>
  );
}
