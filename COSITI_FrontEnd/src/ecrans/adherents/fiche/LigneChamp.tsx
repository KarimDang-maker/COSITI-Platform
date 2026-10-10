import type { ReactNode } from "react";

/** Paire libellé / valeur d'une fiche en lecture. À placer dans un `<dl>`. */
export function LigneChamp({ libelle, valeur }: { libelle: string; valeur: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">{libelle}</dt>
      <dd className="text-texte">{valeur}</dd>
    </div>
  );
}
