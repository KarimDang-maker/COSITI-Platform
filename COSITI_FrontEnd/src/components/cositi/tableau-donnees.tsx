import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface TableauDonneesProps<T> {
  colonnes: ColumnDef<T>[];
  lignes: readonly T[];
  cleLigne: (ligne: T, index: number) => string;
  /** Tri **serveur** — `@tanstack/react-table` ne fait que rendre l'en-tête et exposer le clic, jamais retrier localement (`docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md §4`). */
  tri?: SortingState;
  onChangerTri?: (tri: SortingState) => void;
  onActiverLigne?: (ligne: T) => void;
  libelleLigne?: (ligne: T) => string;
  /** Barre d'outils au-dessus du tableau (gabarit : recherche + filtres + export). */
  barreOutils?: ReactNode;
  /** Pied du tableau : `Pagination` en général. */
  pied?: ReactNode;
  /** Légende accessible du tableau, lue avant les données. */
  legende?: string;
  className?: string;
}

/**
 * Tableau de données du gabarit (`table-card-custom`) : carte blanche, barre
 * d'outils, en-tête en petites capitales, pied de pagination. Tri et
 * pagination restent **serveur** ; la ligne est activable au clavier.
 */
export function TableauDonnees<T>({
  colonnes,
  lignes,
  cleLigne,
  tri,
  onChangerTri,
  onActiverLigne,
  libelleLigne,
  barreOutils,
  pied,
  legende,
  className,
}: TableauDonneesProps<T>) {
  const table = useReactTable({
    data: lignes as T[],
    columns: colonnes,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: tri ? { sorting: tri } : undefined,
    onSortingChange: onChangerTri
      ? (miseAJour) => {
          const prochain = typeof miseAJour === "function" ? miseAJour(tri ?? []) : miseAJour;
          onChangerTri(prochain);
        }
      : undefined,
  });

  return (
    <div className={cn("overflow-hidden rounded-xl bg-surface shadow-carte", className)}>
      {barreOutils && (
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bordure p-5">{barreOutils}</div>
      )}
      <Table>
        {legende && <caption className="sr-only">{legende}</caption>}
        <TableHeader className="sticky top-0 z-10">
          {table.getHeaderGroups().map((groupe) => (
            <TableRow key={groupe.id}>
              {groupe.headers.map((entete) => {
                const triable = entete.column.getCanSort();
                const sens = entete.column.getIsSorted();
                return (
                  <TableHead
                    key={entete.id}
                    className={cn(triable && "cursor-pointer select-none hover:text-texte")}
                    aria-sort={sens === "asc" ? "ascending" : sens === "desc" ? "descending" : undefined}
                    onClick={triable ? entete.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(entete.column.columnDef.header, entete.getContext())}
                      {triable &&
                        (sens === "asc" ? (
                          <ArrowUp className="size-3.5 text-primaire" aria-hidden="true" />
                        ) : sens === "desc" ? (
                          <ArrowDown className="size-3.5 text-primaire" aria-hidden="true" />
                        ) : (
                          <ArrowUpDown className="size-3.5 text-texte-inactif" aria-hidden="true" />
                        ))}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((ligne) => (
            <TableRow
              key={cleLigne(ligne.original, ligne.index)}
              tabIndex={onActiverLigne ? 0 : undefined}
              aria-label={onActiverLigne && libelleLigne ? libelleLigne(ligne.original) : undefined}
              onClick={
                onActiverLigne
                  ? (evenement) => {
                      if (cibleInteractive(evenement.target)) return;
                      onActiverLigne(ligne.original);
                    }
                  : undefined
              }
              onKeyDown={
                onActiverLigne
                  ? (evenement) => {
                      if (evenement.key !== "Enter") return;
                      if (cibleInteractive(evenement.target)) return;
                      onActiverLigne(ligne.original);
                    }
                  : undefined
              }
              className={cn(
                onActiverLigne &&
                  "cursor-pointer outline-none hover:bg-surface-survol focus-visible:bg-surface-survol focus-visible:shadow-[inset_3px_0_0_var(--anneau)]",
              )}
            >
              {ligne.getVisibleCells().map((cellule) => (
                <TableCell key={cellule.id}>{flexRender(cellule.column.columnDef.cell, cellule.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pied && <div className="border-t border-bordure px-5 py-4">{pied}</div>}
    </div>
  );
}

/**
 * `true` si l'évènement vient d'un élément interactif situé **dans** la ligne : bouton, lien, champ de
 * saisie, case à cocher…
 *
 * <p>Sans ce garde-fou, un clic sur une action de ligne (« Ouvrir un dossier », « Marquer transmise »)
 * déclenchait aussi l'activation de la ligne entière par propagation, et la navigation écrasait
 * silencieusement l'action demandée. Bug réel trouvé au jalon J7, invisible jusque-là parce qu'aucun
 * tableau livré n'avait encore de bouton dans ses cellules.</p>
 */
function cibleInteractive(cible: EventTarget | null): boolean {
  if (!(cible instanceof Element)) return false;
  return cible.closest("button, a, input, select, textarea, [role='button'], [role='checkbox']") !== null;
}
