import { AlertTriangle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { estModeMobileMoney, type ChampTriPaiement, type Paiement } from "@/api/paiements";
import { formaterDate, formaterMontant } from "@/lib/format";
import { CelluleAdherentPaiement } from "@/ecrans/cotisations/CelluleAdherentPaiement";


/**
 * Colonnes communes du domaine « Paiement » (J4, réutilisées par le contrôle
 * DAF en J5 — `AGENTS.md` règle 2 : ne pas dupliquer une règle métier côté
 * client, y compris de présentation. La mise en évidence d'une référence
 * mobile money manquante est une règle métier au même titre qu'un calcul :
 * un seul endroit la définit, tous les écrans qui listent des paiements la
 * consomment.
 */
/**
 * Colonne triable → champ de la liste blanche `CHAMPS_TRI` de `GET /paiements`. Le tri est toujours serveur :
 * un écran qui affiche ces colonnes traduit le tri du tableau avec {@link triServeurPaiement}.
 */
export const TRI_PAR_COLONNE_PAIEMENT: Readonly<Record<string, ChampTriPaiement>> = {
  numeroRecu: "NUMERO_RECU",
  datePaiement: "DATE_PAIEMENT",
  montant: "MONTANT",
  statut: "STATUT",
};

export const COLONNE_PAR_TRI_PAIEMENT: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(TRI_PAR_COLONNE_PAIEMENT).map(([colonne, champ]) => [champ, colonne]),
);

export function colonnesPaiementBase(): ColumnDef<Paiement>[] {
  return [
    { id: "numeroRecu", header: "Reçu", accessorKey: "numeroRecu", enableSorting: true, cell: ({ row }) => <span className="ref">{row.original.numeroRecu}</span> },
    {
      id: "adherentId",
      header: "Adhérent",
      cell: ({ row }) => <CelluleAdherentPaiement adherentId={row.original.adherentId} />,
    },
    {
      id: "datePaiement",
      // Sans accesseur, TanStack ne déclare pas la colonne triable : le clic de tri était sans effet.
      accessorKey: "datePaiement",
      header: "Date",
      enableSorting: true,
      cell: ({ row }) => formaterDate(row.original.datePaiement),
    },
    {
      id: "montant",
      // Sans accesseur, TanStack ne déclare pas la colonne triable : le clic de tri était sans effet.
      accessorKey: "montant",
      header: "Montant",
      enableSorting: true,
      cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.montant)}</span>,
    },
    {
      id: "modePaiement",
      header: "Mode",
      cell: ({ row }) => <BadgeStatut domaine="modePaiement" code={row.original.modePaiement} />,
    },
    {
      id: "referenceTransaction",
      header: "Référence",
      cell: ({ row }) => {
        const paiement = row.original;
        const sansReference = estModeMobileMoney(paiement.modePaiement) && !paiement.referenceTransaction;
        if (!sansReference) return <span className="ref">{paiement.referenceTransaction ?? "—"}</span>;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 font-semibold text-danger-fort">
                <AlertTriangle className="size-4" aria-hidden="true" />
                Manquante
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Un paiement Orange Money ou MTN MoMo sans référence de transaction doit être corrigé.
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: "statut",
      // Sans accesseur, TanStack ne déclare pas la colonne triable : le clic de tri était sans effet.
      accessorKey: "statut",
      header: "Statut",
      enableSorting: true,
      cell: ({ row }) => <BadgeStatut domaine="paiement" code={row.original.statut} />,
    },
  ];
}
