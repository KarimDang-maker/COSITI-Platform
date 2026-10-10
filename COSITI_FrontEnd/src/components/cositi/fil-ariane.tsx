import { Fragment } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

export interface MaillonAriane {
  libelle: string;
  /** Absent pour le dernier maillon (page courante) ou un niveau sans écran. */
  chemin?: string;
}

interface FilArianeProps {
  maillons: readonly MaillonAriane[];
}

/**
 * Fil d'Ariane (gabarit : « Accueil › Section › Page »). Le dernier maillon
 * est la page courante, annoncée par `aria-current`. Un niveau sans écran est
 * écrit sans lien — jamais un lien mort.
 */
export function FilAriane({ maillons }: FilArianeProps) {
  if (maillons.length === 0) return null;
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-texte-doux-fort">
        {maillons.map((maillon, index) => {
          const dernier = index === maillons.length - 1;
          return (
            <Fragment key={`${maillon.libelle}-${index}`}>
              <li>
                {maillon.chemin && !dernier ? (
                  <Link
                    to={maillon.chemin}
                    className="rounded-sm font-medium transition-colors hover:text-primaire"
                  >
                    {maillon.libelle}
                  </Link>
                ) : (
                  <span
                    className={dernier ? "font-semibold text-texte" : undefined}
                    aria-current={dernier ? "page" : undefined}
                  >
                    {maillon.libelle}
                  </span>
                )}
              </li>
              {!dernier && (
                <li aria-hidden="true" className="text-texte-inactif">
                  <ChevronRight className="size-3.5" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
