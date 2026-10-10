import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Attributs à étaler sur le contrôle : ils relient libellé, aide et erreur. */
export interface AttributsChamp {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
}

interface ChampFormulaireProps {
  id: string;
  libelle: ReactNode;
  /** Aide permanente sous le champ — jamais un texte indicatif dans le champ. */
  aide?: ReactNode;
  /** Message d'erreur : ce qui s'est passé, puis ce que l'utilisateur peut faire. */
  erreur?: string;
  /** Écrit « (obligatoire) » après le libellé. */
  obligatoire?: boolean;
  /** Écrit « (facultatif) » après le libellé. */
  facultatif?: boolean;
  className?: string;
  /**
   * Le contrôle, qui reçoit les attributs d'accessibilité :
   * `{(attributs) => <Input {...attributs} {...register("montant")} />}`.
   */
  children: (attributs: AttributsChamp) => ReactNode;
}

/**
 * Champ de formulaire complet (gabarit : `form-label-custom` +
 * `form-feedback-custom`) : libellé toujours visible, aide sous le champ,
 * erreur reliée par `aria-describedby` et annoncée par une région live
 * (`docs/02 §14`, exigences 5). Un écran n'assemble plus ces trois morceaux à
 * la main.
 */
export function ChampFormulaire({
  id,
  libelle,
  aide,
  erreur,
  obligatoire = false,
  facultatif = false,
  className,
  children,
}: ChampFormulaireProps) {
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const decrit = [idErreur, idAide].filter(Boolean).join(" ") || undefined;

  // Marges portées par les éléments présents, pas par le conteneur : la région
  // live, vide tant qu'il n'y a pas d'erreur, n'ajoute ainsi aucun espace sous
  // le champ (un bouton aligné en bas d'une rangée reste à niveau).
  return (
    <div className={cn("flex flex-col", className)}>
      <Label htmlFor={id} className="mb-2">
        {libelle}
        {obligatoire && <span className="font-medium text-texte-doux">(obligatoire)</span>}
        {facultatif && <span className="font-medium text-texte-doux">(facultatif)</span>}
      </Label>
      {children({
        id,
        "aria-invalid": Boolean(erreur),
        "aria-describedby": decrit,
        "aria-required": obligatoire || undefined,
      })}
      {aide && (
        <p id={idAide} className="mt-2 text-xs text-texte-doux">
          {aide}
        </p>
      )}
      <div aria-live="polite">
        {erreur && (
          <p id={idErreur} className="mt-2 text-sm font-semibold text-danger-fort">
            {erreur}
          </p>
        )}
      </div>
    </div>
  );
}
