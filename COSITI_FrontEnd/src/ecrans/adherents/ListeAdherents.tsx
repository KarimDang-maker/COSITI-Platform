import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/auth/ContexteAuth";
import { useAdherents } from "@/hooks/useAdherents";
import type { Adherent, StatutAdherent } from "@/api/adherents";
import { formaterDate, formaterNomComplet, formaterTelephone } from "@/lib/format";
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

  const colonnes = useMemo<ColumnDef<Adherent>[]>(
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
        accessorFn: (a) => formaterNomComplet(a.nom, a.prenoms),
        enableSorting: true,
        cell: ({ row }) => formaterNomComplet(row.original.nom, row.original.prenoms),
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1>Adhérents</h1>
          {peutCreer && (
            <Button onClick={() => navigate("/adherents/nouveau")}>
              <Plus className="size-4" aria-hidden="true" />
              Nouvel adhérent
            </Button>
          )}
        </div>

        <BarreFiltres>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-recherche">Rechercher</Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-texte-doux" aria-hidden="true" />
              <Input
                id="filtre-recherche"
                placeholder="Matricule, nom, téléphone, CNI"
                defaultValue={recherche}
                className="w-72 pl-8"
                onChange={(evenement) => mettreAJourParametre("recherche", evenement.target.value)}
              />
            </div>
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
          <>
            <TableauDonnees
              colonnes={colonnes}
              lignes={data.contenu}
              cleLigne={(a) => a.id}
              tri={tri}
              onChangerTri={setTri}
              onActiverLigne={(a) => navigate(`/adherents/${a.id}`)}
              libelleLigne={(a) => `Ouvrir la fiche de ${formaterNomComplet(a.nom, a.prenoms)}`}
            />

            <div className="flex items-center justify-between text-sm text-texte-doux">
              <p>{data.totalElements} adhérents</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => changerPage(page - 1)}>
                  Précédent
                </Button>
                <span>
                  Page {page + 1} sur {Math.max(data.totalPages, 1)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= data.totalPages}
                  onClick={() => changerPage(page + 1)}
                >
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
