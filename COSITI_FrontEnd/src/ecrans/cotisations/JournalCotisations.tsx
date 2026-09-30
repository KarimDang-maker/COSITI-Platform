import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, Wallet } from "lucide-react";
import type { SortingState } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { Pagination } from "@/components/cositi/pagination";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/auth/ContexteAuth";
import { usePaiements } from "@/hooks/usePaiements";
import type { ModePaiement, StatutPaiement } from "@/api/paiements";
import { estErreurApi } from "@/api/erreurs";
import { colonnesPaiementBase } from "@/ecrans/cotisations/colonnesPaiement";

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

  const colonnes = useMemo(() => colonnesPaiementBase(), []);

  return (
    <CoquilleApplication titre="Cotisations">
      <div className="space-y-6">
        <EnTetePage
          titre="Cotisations"
          actions={
            peutCreer && (
              <Button onClick={() => navigate("/cotisations/nouveau")}>
                <Plus className="size-4" aria-hidden="true" />
                Nouveau paiement
              </Button>
            )
          }
        />

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

        {/* Barre hors du tableau : elle reste visible quand le journal est vide ou en chargement,
            puisque l'état vide invite justement à modifier les filtres. */}
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
            icone={Wallet}
          />
        )}

        {data && data.contenu.length > 0 && (
          <TableauDonnees
            colonnes={colonnes}
            lignes={data.contenu}
            cleLigne={(p) => p.id}
            tri={tri}
            onChangerTri={setTri}
            onActiverLigne={(p) => navigate(`/cotisations/${p.id}`)}
            libelleLigne={(p) => `Ouvrir le paiement ${p.numeroRecu}`}
            pied={
              <Pagination
                page={page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                libelleElements="paiements"
                onChangerPage={changerPage}
              />
            }
          />
        )}
      </div>
    </CoquilleApplication>
  );
}
