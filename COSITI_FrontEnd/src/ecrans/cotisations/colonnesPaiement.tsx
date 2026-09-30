import { AlertTriangle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { estModeMobileMoney, type Paiement } from "@/api/paiements";
import { abregerIdentifiant, formaterDate, formaterMontant } from "@/lib/format";

/**
 * Colonnes communes du domaine « Paiement » (J4, réutilisées par le contrôle
 * DAF en J5 — `AGENTS.md` règle 2 : ne pas dupliquer une règle métier côté
 * client, y compris de présentation. La mise en évidence d'une référence
 * mobile money manquante est une règle métier au même titre qu'un calcul :
 * un seul endroit la définit, tous les écrans qui listent des paiements la
 * consomment.
 */
export function colonnesPaiementBase(): ColumnDef<Paiement>[] {
  return [
    { id: "numeroRecu", header: "Reçu", cell: ({ row }) => <span className="ref">{row.original.numeroRecu}</span> },
    {
      id: "adherentId",
      header: "Adhérent",
      cell: ({ row }) => <span className="ref">{abregerIdentifiant(row.original.adherentId)}</span>,
    },
    {
      id: "datePaiement",
      header: "Date",
      enableSorting: true,
      cell: ({ row }) => formaterDate(row.original.datePaiement),
    },
    {
      id: "montant",
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
    { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="paiement" code={row.original.statut} /> },
  ];
}
