import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formaterNombre } from "@/lib/format";

interface PaginationProps {
  /** Page courante, indexée à partir de 0 comme l'API (`?page=`). */
  page: number;
  totalPages: number;
  /** Total réel renvoyé par l'API — « 172 adhérents », jamais la taille de la page. */
  totalElements: number;
  /** Nom des éléments au pluriel : « adhérents », « paiements ». */
  libelleElements: string;
  onChangerPage: (page: number) => void;
  /** Désactive la navigation pendant un rechargement. */
  enCours?: boolean;
  className?: string;
}

/** Pages affichées : la première, la dernière, et deux voisines de la courante. */
function pagesVisibles(page: number, total: number): (number | "ellipse")[] {
  const pages = new Set<number>([0, total - 1, page - 1, page, page + 1]);
  const triees = [...pages].filter((p) => p >= 0 && p < total).sort((a, b) => a - b);
  const resultat: (number | "ellipse")[] = [];
  for (const p of triees) {
    const precedente = resultat[resultat.length - 1];
    if (typeof precedente === "number" && p - precedente > 1) resultat.push("ellipse");
    resultat.push(p);
  }
  return resultat;
}

/**
 * Pied de liste paginée **côté serveur** (`docs/02 §9.1`, gabarit :
 * `table-footer-control`). Écrit le total réel et la page courante ; les
 * boutons « Précédent » et « Suivant » gardent leur libellé, les numéros de
 * page sont annoncés « Page 3 ».
 */
export function Pagination({
  page,
  totalPages,
  totalElements,
  libelleElements,
  onChangerPage,
  enCours = false,
  className,
}: PaginationProps) {
  const total = Math.max(totalPages, 1);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3 text-sm text-texte-doux-fort", className)}
    >
      <p>
        {/* Total et libellé dans le même élément : « 172 adhérents » se lit — et se cherche — d'un bloc. */}
        <span className="chiffre font-bold text-texte">
          {formaterNombre(totalElements)} {libelleElements}
        </span>
        <span aria-hidden="true"> · </span>
        <span>
          Page {page + 1} sur {total}
        </span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={enCours || page <= 0}
          onClick={() => onChangerPage(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          Précédent
        </Button>
        <ul className="hidden items-center gap-1 sm:flex">
          {pagesVisibles(page, total).map((element, index) =>
            element === "ellipse" ? (
              <li key={`ellipse-${index}`} aria-hidden="true" className="px-1 text-texte-doux">
                …
              </li>
            ) : (
              <li key={element}>
                {/* Page courante en vert doux, pas en `default` : l'action primaire reste celle de l'écran (§1 règle 4). */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Page ${element + 1}`}
                  aria-current={element === page ? "page" : undefined}
                  disabled={enCours}
                  onClick={() => element !== page && onChangerPage(element)}
                  className={cn(
                    "chiffre",
                    element === page && "bg-primaire-doux font-bold text-titre hover:bg-primaire-doux",
                  )}
                >
                  {element + 1}
                </Button>
              </li>
            ),
          )}
        </ul>
        <Button
          variant="outline"
          size="sm"
          disabled={enCours || page + 1 >= totalPages}
          onClick={() => onChangerPage(page + 1)}
        >
          Suivant
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
