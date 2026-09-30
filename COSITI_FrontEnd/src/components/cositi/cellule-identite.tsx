import type { ReactNode } from "react";
import { AvatarUtilisateur } from "@/components/cositi/avatar-utilisateur";

interface CelluleIdentiteProps {
  /** Nom déjà mis en forme (`formaterNomComplet`, ou `nomComplet` du serveur). */
  nom: string;
  /** Seconde ligne : matricule, code agent, téléphone. */
  detail?: ReactNode;
}

/**
 * Cellule « personne » d'un tableau (gabarit : `table-user-cell`) — avatar à
 * initiales, nom en gras, précision en dessous.
 */
export function CelluleIdentite({ nom, detail }: CelluleIdentiteProps) {
  return (
    <span className="flex items-center gap-3">
      <AvatarUtilisateur nomComplet={nom} taille="sm" />
      <span className="min-w-0">
        <span className="block truncate font-bold text-texte">{nom}</span>
        {detail && <span className="block truncate text-xs text-texte-doux">{detail}</span>}
      </span>
    </span>
  );
}
