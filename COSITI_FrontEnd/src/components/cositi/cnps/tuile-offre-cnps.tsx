import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OffreCnps } from "@/api/cnps";

interface TuileOffreCnpsProps {
  offre: OffreCnps;
  selectionnee: boolean;
  onSelectionner: () => void;
}

/** Une tuile d'offre — réutilisée à l'identique pour les 4 offres de chacune des 3 rubriques (PF/RP/PVID). */
export function TuileOffreCnps({ offre, selectionnee, onSelectionner }: TuileOffreCnpsProps) {
  return (
    <button
      type="button"
      onClick={onSelectionner}
      aria-pressed={selectionnee}
      className={cn(
        "flex w-56 shrink-0 flex-col gap-1 rounded-lg border bg-surface p-3 text-left transition-colors",
        selectionnee ? "border-primaire ring-1 ring-primaire" : "border-bordure hover:bg-surface-survol",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-texte">{offre.libelle}</p>
        {selectionnee && <Check className="size-4 shrink-0 text-primaire" aria-hidden="true" />}
      </div>
      {offre.description && <p className="text-xs text-texte-doux">{offre.description}</p>}
      <p className="chiffre text-xs text-texte-doux">{offre.nombreDossiers} dossier(s)</p>
    </button>
  );
}

interface TuileToutesLesOffresProps {
  selectionnee: boolean;
  onSelectionner: () => void;
}

/** Tuile « Toutes les offres » — toujours première de la rangée, sans statistique propre. */
export function TuileToutesLesOffres({ selectionnee, onSelectionner }: TuileToutesLesOffresProps) {
  return (
    <button
      type="button"
      onClick={onSelectionner}
      aria-pressed={selectionnee}
      className={cn(
        "flex w-40 shrink-0 items-center justify-center rounded-lg border bg-surface p-3 text-sm font-semibold transition-colors",
        selectionnee ? "border-primaire text-primaire ring-1 ring-primaire" : "border-bordure text-texte hover:bg-surface-survol",
      )}
    >
      Toutes les offres
    </button>
  );
}
