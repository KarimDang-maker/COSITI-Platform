import { Link } from "react-router";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formaterNombre } from "@/lib/format";

/** Forme exacte de `Alerte` (backend, jalon J9). */
export interface AlerteTableauBord {
  readonly code: string;
  readonly niveau: string;
  readonly libelle: string;
  readonly nombre: number;
  readonly chemin: string | null;
}

/**
 * Les couleurs d'état ne sont jamais seules porteuses de l'information : chaque
 * alerte a son icône et son libellé écrit (`docs/02_DESIGN_SYSTEM.md`).
 */
const STYLES: Readonly<Record<string, { classe: string; icone: typeof Info; libelleNiveau: string }>> = {
  INFO: { classe: "bg-info-doux text-info-fort border-info-trait", icone: Info, libelleNiveau: "Information" },
  ATTENTION: {
    classe: "bg-attention-doux text-attention-fort border-attention-trait",
    icone: AlertTriangle,
    libelleNiveau: "À traiter",
  },
  CRITIQUE: {
    classe: "bg-danger-doux text-danger-fort border-danger-trait",
    icone: OctagonAlert,
    libelleNiveau: "Critique",
  },
};

interface ListeAlertesProps {
  alertes: readonly AlerteTableauBord[];
}

/**
 * Points nécessitant attention d'un tableau de bord (UC-PCA-06, UC-DG-08,
 * UC-DGA-11, UC-GC-16).
 *
 * Une alerte sans écran pour la traiter ne devient pas un lien : un lien mort
 * vaut moins qu'un simple constat.
 */
export function ListeAlertes({ alertes }: ListeAlertesProps) {
  if (alertes.length === 0) {
    return (
      <p className="rounded-lg border border-succes-trait bg-succes-doux p-4 text-succes-fort">
        Aucun point nécessitant attention.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {alertes.map((alerte) => {
        const style = STYLES[alerte.niveau] ?? STYLES.INFO!;
        const Icone = style.icone;
        const contenu = (
          <span className="flex items-center gap-3">
            <Icone className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">
              <span className="font-semibold">{alerte.libelle}</span>
              <span className="sr-only"> — {style.libelleNiveau}</span>
            </span>
            <span className="chiffre text-lg font-semibold">{formaterNombre(alerte.nombre)}</span>
          </span>
        );

        return (
          <li key={alerte.code}>
            {alerte.chemin ? (
              <Link
                to={alerte.chemin}
                className={cn(
                  "block rounded-lg border p-3 outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-anneau",
                  style.classe,
                )}
              >
                {contenu}
              </Link>
            ) : (
              <div className={cn("rounded-lg border p-3", style.classe)}>{contenu}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
