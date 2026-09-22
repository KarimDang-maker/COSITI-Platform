import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AlertTriangle, Plus } from "lucide-react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission } from "@/auth/ContexteAuth";
import { usePaiements } from "@/hooks/usePaiements";
import { estModeMobileMoney, type ModePaiement, type Paiement, type StatutPaiement } from "@/api/paiements";
import { estErreurApi } from "@/api/erreurs";
import { abregerIdentifiant, formaterDate, formaterMontant } from "@/lib/format";

const OPTIONS_STATUT: readonly { valeur: StatutPaiement; libelle: string }[] = [
  { valeur: "A_CONTROLER", libelle: "À contrôler" },
  { valeur: "VALIDE", libelle: "Validé" },
  { valeur: "RAPPROCHE", libelle: "Rapproché" },
  { valeur: "ANNULE", libelle: "Annulé" },
  { valeur: "INCOHERENCE", libelle: "Incohérence signalée" },
];

const OPTIONS_MODE: readonly { valeur: ModePaiement; libelle: string }[] = [
  { valeur: "ESPECES", libelle: "Espèces" },
  { valeur: "ORANGE_MONEY", libelle: "Orange Money" },
  { valeur: "MTN_MOMO", libelle: "MTN MoMo" },
  { valeur: "VIREMENT", libelle: "Virement" },
];

const TAILLE_PAGE = 25;

export function JournalCotisations() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const peutCreer = usePermission("PAIEMENT:CREER");
  const [tri, setTri] = useState<SortingState>([]);

  const adherentId = parametres.get("adherentId") ?? undefined;
  const statut = (parametres.get("statut") as StatutPaiement | null) ?? undefined;
  const modePaiement = (parametres.get("modePaiement") as ModePaiement | null) ?? undefined;
  const page = Number(parametres.get("page") ?? "0");

  const filtres = useMemo(
    () => ({ adherentId, statut, modePaiement, page, taille: TAILLE_PAGE }),
    [adherentId, statut, modePaiement, page],
  );

  const { data, isLoading, isError, error } = usePaiements(filtres);

  function mettreAJourParametre(cle: string, valeur: string | undefined) {
    const suivants = new URLSearchParams(parametres);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    suivants.delete("page");
    definirParametres(suivants, { replace: true });
  }

  function changerPage(nouvellePage: number) {
    const suivants = new URLSearchParams(parametres);
    suivants.set("page", String(nouvellePage));
    definirParametres(suivants, { replace: true });
  }

  const colonnes = useMemo<ColumnDef<Paiement>[]>(
    () => [
      { id: "numeroRecu", header: "Reçu", cell: ({ row }) => <span className="ref">{row.original.numeroRecu}</span> },
      {
        id: "adherentId",
        header: "Adhérent",
        cell: ({ row }) => <span className="ref">{abregerIdentifiant(row.original.adherentId)}</span>,
      },
      { id: "datePaiement", header: "Date", enableSorting: true, cell: ({ row }) => formaterDate(row.original.datePaiement) },
      {
        id: "montant",
        header: "Montant",
        enableSorting: true,
        cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.montant)}</span>,
      },
      { id: "modePaiement", header: "Mode", cell: ({ row }) => <BadgeStatut domaine="modePaiement" code={row.original.modePaiement} /> },
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
    ],
    [],
  );

  return (
    <CoquilleApplication titre="Cotisations">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1>Cotisations</h1>
          {peutCreer && (
            <Button onClick={() => navigate("/cotisations/nouveau")}>
              <Plus className="size-4" aria-hidden="true" />
              Nouveau paiement
            </Button>
          )}
        </div>

        {adherentId && (
          <Alerte teinte="info">
            <p>
              Filtré sur un adhérent.{" "}
              <button type="button" className="underline" onClick={() => mettreAJourParametre("adherentId", undefined)}>
                Retirer ce filtre
              </button>
            </p>
          </Alerte>
        )}

        <BarreFiltres>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-statut">Statut</Label>
            <Select value={statut ?? "TOUS"} onValueChange={(valeur) => mettreAJourParametre("statut", valeur === "TOUS" ? undefined : valeur)}>
              <SelectTrigger id="filtre-statut" className="w-56">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous les statuts</SelectItem>
                {OPTIONS_STATUT.map((option) => (
                  <SelectItem key={option.valeur} value={option.valeur}>
                    {option.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filtre-mode">Mode de paiement</Label>
            <Select
              value={modePaiement ?? "TOUS"}
              onValueChange={(valeur) => mettreAJourParametre("modePaiement", valeur === "TOUS" ? undefined : valeur)}
            >
              <SelectTrigger id="filtre-mode" className="w-56">
                <SelectValue placeholder="Tous les modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous les modes</SelectItem>
                {OPTIONS_MODE.map((option) => (
                  <SelectItem key={option.valeur} value={option.valeur}>
                    {option.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </BarreFiltres>

        {data && data.avertissements.length > 0 && <AvertissementRegle avertissements={data.avertissements} />}

        {isLoading && <SqueletteTableau colonnes={7} />}

        {isError && (
          <Alerte teinte="danger" titre="Impossible de charger le journal des cotisations">
            <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {data && data.contenu.length === 0 && (
          <EtatVide
            titre="Aucun paiement ne correspond à ces critères"
            description="Modifiez les filtres, ou enregistrez un nouveau paiement."
          />
        )}

        {data && data.contenu.length > 0 && (
          <>
            <TableauDonnees
              colonnes={colonnes}
              lignes={data.contenu}
              cleLigne={(p) => p.id}
              tri={tri}
              onChangerTri={setTri}
              onActiverLigne={(p) => navigate(`/cotisations/${p.id}`)}
              libelleLigne={(p) => `Ouvrir le paiement ${p.numeroRecu}`}
            />

            <div className="flex items-center justify-between text-sm text-texte-doux">
              <p>{data.totalElements} paiements</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => changerPage(page - 1)}>
                  Précédent
                </Button>
                <span>
                  Page {page + 1} sur {Math.max(data.totalPages, 1)}
                </span>
                <Button variant="outline" size="sm" disabled={page + 1 >= data.totalPages} onClick={() => changerPage(page + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </CoquilleApplication>
  );
}
