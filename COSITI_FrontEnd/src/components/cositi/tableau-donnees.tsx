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
}

export function TableauDonnees<T>({
  colonnes,
  lignes,
  cleLigne,
  tri,
  onChangerTri,
  onActiverLigne,
  libelleLigne,
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
    <div className="overflow-x-auto rounded-lg border border-bordure">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-surface-douce">
          {table.getHeaderGroups().map((groupe) => (
            <TableRow key={groupe.id}>
              {groupe.headers.map((entete) => {
                const triable = entete.column.getCanSort();
                const sens = entete.column.getIsSorted();
                return (
                  <TableHead
                    key={entete.id}
                    className={cn(triable && "cursor-pointer select-none")}
                    aria-sort={sens === "asc" ? "ascending" : sens === "desc" ? "descending" : undefined}
                    onClick={triable ? entete.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(entete.column.columnDef.header, entete.getContext())}
                      {triable &&
                        (sens === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : sens === "desc" ? (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
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
                onActiverLigne && "cursor-pointer outline-none hover:bg-surface-survol focus-visible:bg-surface-survol",
              )}
            >
              {ligne.getVisibleCells().map((cellule) => (
                <TableCell key={cellule.id}>{flexRender(cellule.column.columnDef.cell, cellule.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
