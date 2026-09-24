import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import {
  CarteRubriqueCnps,
  DEFINITIONS_RUBRIQUE,
  type RubriqueSelection,
} from "@/components/cositi/cnps/carte-rubrique-cnps";
import { TuileOffreCnps, TuileToutesLesOffres } from "@/components/cositi/cnps/tuile-offre-cnps";
import { DetailOffreCnps } from "@/components/cositi/cnps/detail-offre-cnps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDossiersPrestation, useOffresCnps } from "@/hooks/useCnps";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterMatricule } from "@/lib/format";
import { definitionStatut } from "@/lib/statuts";
import type { DossierPrestationCnps, StatutDossierPrestationCnps } from "@/api/cnps";

const STATUTS: readonly StatutDossierPrestationCnps[] = ["INCOMPLET", "COMPLET", "TRANSMIS_CNPS", "TRAITE", "REJETE"];
const TAILLE_PAGE = 25;

/**
 * `/dossiers-cnps` — dossiers CNPS organisés par rubrique (PF/RP/PVID) et offre, avec vue transverse
 * « Tous les Dossiers CNPS » (`Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V2.md`).
 */
export function EcranDossiersCnps() {
  const navigate = useNavigate();
  const [parametresUrl, definirParametres] = useSearchParams();
  const rubrique = (parametresUrl.get("rubrique") as RubriqueSelection | null) ?? "TOUS";
  const offreId = parametresUrl.get("offre") ?? undefined;
  const statut = (parametresUrl.get("statut") as StatutDossierPrestationCnps | null) ?? undefined;
  const recherche = parametresUrl.get("recherche") ?? "";
  const page = Number(parametresUrl.get("page") ?? "0");

  // Toutes les offres (sans filtre) sont chargées une fois : les 4 cartes KPI ont besoin du total de
  // chaque rubrique, pas seulement de celle actuellement sélectionnée.
  const offres = useOffresCnps();
  const dossiers = useDossiersPrestation({
    rubrique: rubrique === "TOUS" ? undefined : rubrique,
    offreId,
    statut,
    recherche: recherche || undefined,
    page,
    taille: TAILLE_PAGE,
  });

  function mettreAJour(cle: string, valeur: string | undefined) {
    const suivants = new URLSearchParams(parametresUrl);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    suivants.delete("page");
    definirParametres(suivants, { replace: true });
  }

  function selectionnerRubrique(cible: RubriqueSelection) {
    const suivants = new URLSearchParams(parametresUrl);
    if (cible === "TOUS") suivants.delete("rubrique");
    else suivants.set("rubrique", cible);
    suivants.delete("offre");
    suivants.delete("page");
    definirParametres(suivants, { replace: true });
  }

  const totauxParRubrique = useMemo(() => {
    const totaux: Record<RubriqueSelection, number> = { PF: 0, RP: 0, PVID: 0, TOUS: 0 };
    for (const offre of offres.data ?? []) {
      totaux[offre.rubrique] += offre.nombreDossiers;
      totaux.TOUS += offre.nombreDossiers;
    }
    return totaux;
  }, [offres.data]);

  const offresDeLaRubrique = useMemo(
    () => (rubrique === "TOUS" ? [] : (offres.data ?? []).filter((o) => o.rubrique === rubrique)),
    [offres.data, rubrique],
  );
  const offreSelectionnee = offresDeLaRubrique.find((o) => o.id === offreId) ?? null;

  const colonnes = useMemo<ColumnDef<DossierPrestationCnps>[]>(
    () => [
      {
        id: "matricule",
        header: "Matricule COSITI",
        cell: ({ row }) => <span className="ref">{formaterMatricule(row.original.adherentMatricule)}</span>,
      },
      {
        id: "adherent",
        header: "Adhérent & famille",
        cell: ({ row }) => (
          <div>
            <p>{row.original.adherentNomComplet ?? "—"}</p>
            {row.original.nombrePersonnesACharge != null && (
              <p className="text-xs text-texte-doux">{row.original.nombrePersonnesACharge} personne(s) à charge</p>
            )}
          </div>
        ),
      },
      {
        id: "numeroCnps",
        header: "Matricule CNPS",
        cell: ({ row }) => <span className="ref">{row.original.numeroCnps ?? "—"}</span>,
      },
      {
        id: "offre",
        header: "Rubrique & offre",
        cell: ({ row }) => (
          <div>
            <p className="text-xs font-semibold text-texte-doux">{DEFINITIONS_RUBRIQUE[row.original.rubrique].badge}</p>
            <p>{row.original.offreLibelle}</p>
          </div>
        ),
      },
      {
        id: "statut",
        header: "Statut dossier",
        cell: ({ row }) => <BadgeStatut domaine="dossierPrestationCnps" code={row.original.statut} />,
      },
      {
        id: "pieces",
        header: "Pièces réunies",
        cell: ({ row }) => {
          const total = row.original.pieces.length;
          const fournies = row.original.pieces.filter((p) => p.statut === "FOURNIE" || p.statut === "VALIDEE").length;
          const teinte = total > 0 && fournies === total ? "succes" : "attention";
          return (
            <div className="w-24">
              <p className="chiffre text-sm">{fournies}/{total}</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-douce">
                <div
                  className={teinte === "succes" ? "h-full bg-succes-fort" : "h-full bg-attention-fort"}
                  style={{ width: total > 0 ? `${(fournies / total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: "transmission",
        header: "Transmission / dépôt",
        cell: ({ row }) =>
          row.original.dateTransmissionCnps
            ? `Transmis le ${formaterDate(row.original.dateTransmissionCnps)}`
            : row.original.dateDepot
              ? `Déposé le ${formaterDate(row.original.dateDepot)}`
              : "—",
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => navigate(`/dossiers-cnps/${row.original.id}`)}>
            Consulter
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <CoquilleApplication titre="Dossiers CNPS">
      <div className="space-y-6">
        <div>
          <h1>Dossiers CNPS</h1>
          <p className="text-texte-doux">
            Organisation des dossiers sous les 3 rubriques techniques : Prestations familiales, Risques
            professionnels et PVID, avec le détail des offres de chaque rubrique.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["PF", "RP", "PVID", "TOUS"] as const).map((cle) => (
            <CarteRubriqueCnps
              key={cle}
              rubrique={cle}
              total={totauxParRubrique[cle]}
              selectionnee={rubrique === cle}
              onSelectionner={() => selectionnerRubrique(cle)}
            />
          ))}
        </div>

        {rubrique !== "TOUS" && (
          <section className="space-y-3">
            <div>
              <h2>{DEFINITIONS_RUBRIQUE[rubrique].libelle}</h2>
              <p className="text-sm text-texte-doux">
                Sous-rubriques des différentes offres ({offresDeLaRubrique.length} offre(s) disponible(s))
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <TuileToutesLesOffres selectionnee={!offreId} onSelectionner={() => mettreAJour("offre", undefined)} />
              {offresDeLaRubrique.map((offre) => (
                <TuileOffreCnps
                  key={offre.id}
                  offre={offre}
                  selectionnee={offreId === offre.id}
                  onSelectionner={() => mettreAJour("offre", offre.id)}
                />
              ))}
            </div>
            {offreSelectionnee && <DetailOffreCnps offre={offreSelectionnee} />}
          </section>
        )}

        <BarreFiltres>
          <div className="space-y-1.5">
            <Label htmlFor="recherche-dossier">Rechercher</Label>
            <Input
              id="recherche-dossier"
              className="w-64"
              placeholder="Matricule, adhérent, n° CNPS…"
              defaultValue={recherche}
              onChange={(evenement) => mettreAJour("recherche", evenement.target.value || undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-statut-dossier">Statut du dossier</Label>
            <Select value={statut ?? "TOUS"} onValueChange={(valeur) => mettreAJour("statut", valeur === "TOUS" ? undefined : valeur)}>
              <SelectTrigger id="filtre-statut-dossier" className="w-56">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous les statuts</SelectItem>
                {STATUTS.map((code) => (
                  <SelectItem key={code} value={code}>
                    {definitionStatut("dossierPrestationCnps", code).libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </BarreFiltres>

        {dossiers.isLoading && <SqueletteTableau colonnes={8} />}
        {dossiers.isError && (
          <Alerte teinte="danger" titre="Impossible de charger les dossiers">
            <p>{estErreurApi(dossiers.error) ? dossiers.error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}
        {dossiers.data && dossiers.data.contenu.length === 0 && (
          <EtatVide
            titre="Aucun dossier CNPS trouvé pour ces critères."
            description="Ouvrez un dossier depuis l'écran Immatriculations, pour un adhérent déjà immatriculé CNPS."
          />
        )}
        {dossiers.data && dossiers.data.contenu.length > 0 && (
          <TableauDonnees
            colonnes={colonnes}
            lignes={dossiers.data.contenu}
            cleLigne={(d) => d.id}
            onActiverLigne={(d) => navigate(`/dossiers-cnps/${d.id}`)}
            libelleLigne={(d) => `Consulter le dossier de ${d.adherentNomComplet ?? d.adherentMatricule}`}
          />
        )}
      </div>
    </CoquilleApplication>
  );
}
