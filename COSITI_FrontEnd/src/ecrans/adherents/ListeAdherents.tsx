import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, Users } from "lucide-react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { Pagination } from "@/components/cositi/pagination";
import { ChampRecherche } from "@/components/cositi/champ-recherche";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/auth/ContexteAuth";
import { useAdherents } from "@/hooks/useAdherents";
import { useLancerExport } from "@/hooks/useExports";
import type { AdherentResume, StatutAdherent } from "@/api/adherents";
import { formaterDate, formaterTelephone } from "@/lib/format";
import { estErreurApi } from "@/api/erreurs";

const OPTIONS_STATUT: readonly { valeur: StatutAdherent; libelle: string }[] = [
  { valeur: "PREINSCRIT", libelle: "Préinscrit" },
  { valeur: "ACTIF", libelle: "Actif" },
  { valeur: "EN_RETARD", libelle: "En retard" },
  { valeur: "INACTIF", libelle: "Inactif" },
  { valeur: "REACTIVE", libelle: "Réactivé" },
  { valeur: "RADIE", libelle: "Radié" },
];

const TAILLE_PAGE = 25;

export function ListeAdherents() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const peutCreer = usePermission("ADHERENT:CREER");
  const peutExporter = usePermission("EXPORT:ADHERENTS");
  const lancerExport = useLancerExport();
  const [tri, setTri] = useState<SortingState>([]);

  const recherche = parametres.get("recherche") ?? "";
  const statut = (parametres.get("statut") as StatutAdherent | null) ?? undefined;
  const page = Number(parametres.get("page") ?? "0");

  const filtres = useMemo(
    () => ({
      recherche: recherche || undefined,
      statut,
      page,
      taille: TAILLE_PAGE,
      tri: tri[0] ? `${tri[0].id},${tri[0].desc ? "desc" : "asc"}` : undefined,
    }),
    [recherche, statut, page, tri],
  );

  const { data, isLoading, isError, error } = useAdherents(filtres);

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

  const colonnes = useMemo<ColumnDef<AdherentResume>[]>(
    () => [
      {
        id: "matricule",
        header: "Matricule",
        accessorKey: "matricule",
        enableSorting: true,
        cell: ({ row }) => <span className="ref">{row.original.matricule}</span>,
      },
      {
        id: "nom",
        header: "Adhérent",
        // `nomComplet` est assemblé par le serveur : la réponse de liste ne porte ni `nom`
        // ni `prenoms`, et les lire ici affichait un tiret sur chaque ligne.
        accessorKey: "nomComplet",
        enableSorting: true,
        cell: ({ row }) => <CelluleIdentite nom={row.original.nomComplet} />,
      },
      {
        id: "telephonePrincipal",
        header: "Téléphone",
        cell: ({ row }) => <span className="ref">{formaterTelephone(row.original.telephonePrincipal)}</span>,
      },
      {
        id: "zoneLibelle",
        header: "Zone",
        cell: ({ row }) => row.original.zoneLibelle ?? "—",
      },
      {
        id: "dateAdhesion",
        header: "Adhésion",
        enableSorting: true,
        cell: ({ row }) => formaterDate(row.original.dateAdhesion),
      },
      {
        id: "statut",
        header: "Statut",
        cell: ({ row }) => <BadgeStatut domaine="adherent" code={row.original.statut} />,
      },
    ],
    [],
  );

  return (
    <CoquilleApplication titre="Adhérents">
      <div className="space-y-6">
        <EnTetePage
          titre="Adhérents"
          actions={
            <>
              {peutExporter && (
                <Button
                  variant="outline"
                  disabled={lancerExport.isPending}
                  // Les filtres actifs sont repris : on exporte ce qu'on voit, pas la base entière.
                  onClick={() =>
                    lancerExport.mutate({ type: "adherents", filtres: { statut: statut || undefined } })
                  }
                >
                  {lancerExport.isPending ? "Export en cours…" : "Exporter (CSV)"}
                </Button>
              )}
              {peutCreer && (
                <Button onClick={() => navigate("/adherents/nouveau")}>
                  <Plus className="size-4" aria-hidden="true" />
                  Nouvel adhérent
                </Button>
              )}
            </>
          }
        />

        {/* Barre hors du tableau : elle reste visible quand la liste est vide ou en chargement,
            puisque l'état vide invite justement à modifier les filtres. */}
        <BarreFiltres>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-recherche">Rechercher</Label>
            <ChampRecherche
              id="filtre-recherche"
              placeholder="Matricule, nom, téléphone, CNI"
              defaultValue={recherche}
              className="sm:w-72"
              onChange={(evenement) => mettreAJourParametre("recherche", evenement.target.value)}
            />
          </div>

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
        </BarreFiltres>

        {data && data.avertissements.length > 0 && <AvertissementRegle avertissements={data.avertissements} />}

        {isLoading && <SqueletteTableau colonnes={6} />}

        {isError && (
          <Alerte teinte="danger" titre="Impossible de charger les adhérents">
            <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {data && data.contenu.length === 0 && (
          <EtatVide
            titre="Aucun adhérent ne correspond à ces critères"
            description="Modifiez les filtres, ou créez un nouvel adhérent si c'est le premier de la liste."
            icone={Users}
            action={
              peutCreer && (
                <Button variant="outline" onClick={() => navigate("/adherents/nouveau")}>
                  Nouvel adhérent
                </Button>
              )
            }
          />
        )}

        {data && data.contenu.length > 0 && (
          <TableauDonnees
            colonnes={colonnes}
            lignes={data.contenu}
            cleLigne={(a) => a.id}
            tri={tri}
            onChangerTri={setTri}
            onActiverLigne={(a) => navigate(`/adherents/${a.id}`)}
            libelleLigne={(a) => `Ouvrir la fiche de ${a.nomComplet}`}
            pied={
              <Pagination
                page={page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                libelleElements="adhérents"
                onChangerPage={changerPage}
              />
            }
          />
        )}
      </div>
    </CoquilleApplication>
  );
}
