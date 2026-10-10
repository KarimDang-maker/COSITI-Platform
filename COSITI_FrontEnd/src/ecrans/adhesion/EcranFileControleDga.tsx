import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { FileSearch } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { CarteIndicateur } from "@/components/cositi/carte-indicateur";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { ChampDate } from "@/components/cositi/champ-date";
import { EtatVide } from "@/components/cositi/etat-vide";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { Pagination } from "@/components/cositi/pagination";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFileControleDga, useSyntheseControleDga } from "@/hooks/useAdhesion";
import type { LigneFileControleDga, StatutControle } from "@/api/adhesion";
import { estErreurApi } from "@/api/erreurs";
import { definitionStatut, STATUTS } from "@/lib/statuts";
import { formaterDateHeure, formaterMatricule, formaterNombre } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Regroupements de filtre : « à traiter » est le choix par défaut de la DGA. */
const FILTRES_STATUT: Readonly<Record<string, { libelle: string; statuts: readonly StatutControle[] | undefined }>> = {
  A_TRAITER: { libelle: "À traiter (en attente ou en cours)", statuts: ["EN_ATTENTE", "EN_COURS"] },
  TOUS: { libelle: "Tous les contrôles", statuts: undefined },
  ...Object.fromEntries(
    (Object.keys(STATUTS.tourControleDga) as StatutControle[]).map((s) => [
      s,
      { libelle: definitionStatut("tourControleDga", s).libelle, statuts: [s] },
    ]),
  ),
};

/**
 * File de contrôle documentaire DGA (`GET /controles-dga`, `CONTROLE_DGA:LIRE`). Le nombre de dossiers distincts
 * soumis vient de `GET /controles-dga/synthese`, calculé par le serveur sans double comptage : une resoumission
 * après correction est comptée à part, jamais comme un nouveau dossier.
 */
export function EcranFileControleDga() {
  const navigate = useNavigate();
  const [parametres, definirParametres] = useSearchParams();
  const filtre = parametres.get("statut") ?? "A_TRAITER";
  const du = parametres.get("du") ?? undefined;
  const au = parametres.get("au") ?? undefined;
  const avecAnomalie = parametres.get("anomalies") === "1";
  const page = Number(parametres.get("page") ?? "0");

  const file = useFileControleDga({
    statut: FILTRES_STATUT[filtre]?.statuts,
    du,
    au,
    avecAnomalie,
    page,
    taille: 25,
  });
  const synthese = useSyntheseControleDga({ du, au });

  function mettreAJour(valeurs: Record<string, string | undefined>) {
    definirParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        for (const [cle, valeur] of Object.entries(valeurs)) {
          if (valeur) suivants.set(cle, valeur);
          else suivants.delete(cle);
        }
        if (!("page" in valeurs)) suivants.delete("page");
        return suivants;
      },
      { replace: true },
    );
  }

  const colonnes = useMemo<ColumnDef<LigneFileControleDga>[]>(
    () => [
      { id: "reference", header: "Contrôle", cell: ({ row }) => <span className="ref">{row.original.reference}</span> },
      {
        id: "adherent",
        header: "Adhérent",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.nom ?? "—"}</p>
            <p className="ref text-xs">{formaterMatricule(row.original.matricule)}</p>
          </div>
        ),
      },
      { id: "agent", header: "Agent collecteur", cell: ({ row }) => row.original.agentCollecteur ?? "—" },
      { id: "gestionnaire", header: "Gestionnaire", cell: ({ row }) => row.original.gestionnaire ?? "—" },
      { id: "soumis", header: "Transmis le", cell: ({ row }) => formaterDateHeure(row.original.soumisLe) },
      { id: "tour", header: "Tour", cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.tour)}</span> },
      {
        id: "progression",
        header: "Documents vérifiés",
        cell: ({ row }) => (
          <span className="chiffre">
            {formaterNombre(row.original.nombreDocumentsVerifies)} / {formaterNombre(row.original.nombreDocuments)}
          </span>
        ),
      },
      {
        id: "anomalies",
        header: "Anomalies",
        cell: ({ row }) => (
          <span className={cn("chiffre", row.original.nombreAnomalies > 0 && "font-bold text-danger-fort")}>
            {formaterNombre(row.original.nombreAnomalies)}
          </span>
        ),
      },
      { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="tourControleDga" code={row.original.statut} /> },
    ],
    [],
  );

  const s = synthese.data;

  return (
    <CoquilleApplication titre="Contrôle DGA">
      <div className="space-y-6">
        <EnTetePage
          titre="Contrôle documentaire DGA"
          description="Dossiers activés par le Gestionnaire, à comparer avec les documents physiques."
        />

        {s && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CarteIndicateur
              principal
              indicateur={{ cle: "distincts", libelle: "Dossiers distincts soumis", valeur: s.dossiersDistinctsSoumis, unite: "NOMBRE" }}
            />
            <CarteIndicateur indicateur={{ cle: "resoumissions", libelle: "Retransmissions après correction", valeur: s.resoumissions, unite: "NOMBRE" }} />
            <CarteIndicateur
              indicateur={{
                cle: "attente",
                libelle: "En attente de contrôle DGA",
                valeur: s.parStatutControle.EN_ATTENTE_DGA ?? 0,
                unite: "NOMBRE",
              }}
            />
            <CarteIndicateur indicateur={{ cle: "anomalies", libelle: "Informations en anomalie", valeur: s.champsEnAnomalie, unite: "NOMBRE" }} />
          </div>
        )}

        <CarteSection contenuPleineLargeur>
          <BarreFiltres integree>
            <div className="space-y-1.5">
              <Label htmlFor="file-statut">Statut</Label>
              <Select value={filtre} onValueChange={(v) => mettreAJour({ statut: v === "A_TRAITER" ? undefined : v })}>
                <SelectTrigger id="file-statut" className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FILTRES_STATUT).map(([cle, f]) => (
                    <SelectItem key={cle} value={cle}>
                      {f.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file-du">Transmis du</Label>
              <ChampDate id="file-du" value={du ?? ""} onChange={(e) => mettreAJour({ du: e.target.value || undefined })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file-au">au</Label>
              <ChampDate id="file-au" value={au ?? ""} onChange={(e) => mettreAJour({ au: e.target.value || undefined })} />
            </div>
            <div className="flex items-center gap-2 self-end pb-2">
              <Checkbox id="file-anomalies" checked={avecAnomalie} onCheckedChange={(v) => mettreAJour({ anomalies: v === true ? "1" : undefined })} />
              <Label htmlFor="file-anomalies">Avec anomalie seulement</Label>
            </div>
          </BarreFiltres>

          {file.isLoading ? (
            <SqueletteTableau />
          ) : file.isError ? (
            <div className="p-4">
              <Alerte teinte="danger" titre="File indisponible">
                <p>{estErreurApi(file.error) ? file.error.message : "La file de contrôle n'a pas pu être chargée."}</p>
              </Alerte>
            </div>
          ) : !file.data || file.data.contenu.length === 0 ? (
            <EtatVide icone={FileSearch} titre="Aucun dossier dans cette file" description="Modifiez les filtres pour voir d'autres contrôles." />
          ) : (
            <TableauDonnees
              legende="File de contrôle documentaire DGA"
              colonnes={colonnes}
              lignes={file.data.contenu}
              cleLigne={(l) => l.controleId}
              onActiverLigne={(l) => navigate(`/controles-dga/${l.controleId}`)}
              libelleLigne={(l) => `Ouvrir le contrôle ${l.reference} de ${l.nom ?? "l'adhérent"}`}
              pied={
                <Pagination
                  page={file.data.page}
                  totalPages={file.data.totalPages}
                  totalElements={file.data.totalElements}
                  libelleElements="contrôles"
                  onChangerPage={(p) => mettreAJour({ page: p > 0 ? String(p) : undefined })}
                  enCours={file.isFetching}
                />
              }
            />
          )}
        </CarteSection>
      </div>
    </CoquilleApplication>
  );
}
