import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, UserRoundSearch, X } from "lucide-react";
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
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/auth/ContexteAuth";
import { useAgentsPagines, useDistributionPortefeuilles, useZones } from "@/hooks/useOrganisation";
import { useValeurTemporisee } from "@/hooks/useValeurTemporisee";
import type { Agent, ChampTriAgent } from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";
import { definitionStatut } from "@/lib/statuts";
import { formaterNombre, formaterTelephone } from "@/lib/format";
import { DialogueAjouterAgent } from "@/ecrans/organisation/DialogueAjouterAgent";
import { VueRepartition } from "@/ecrans/agents/VueRepartition";

const TAILLE_PAGE = 25;

/** Colonne du tableau → champ de la liste blanche serveur (`NOM`, `CODE_AGENT`, `ZONE`). */
const TRI_PAR_COLONNE: Readonly<Record<string, ChampTriAgent>> = {
  code: "CODE_AGENT",
  agent: "NOM",
  zone: "ZONE",
};
const COLONNE_PAR_TRI = Object.fromEntries(Object.entries(TRI_PAR_COLONNE).map(([c, t]) => [t, c]));

type Vue = "agents" | "repartition";

/**
 * Liste des agents de terrain (module agents, #1, #2, #21) et répartition des portefeuilles (#19).
 * Recherche, statut, zone, page et tri vivent dans l'URL ; la liste et le tri sont serveur.
 */
export function ListeAgentsTerrain() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const peutGerer = usePermission("ORGANISATION:GERER");
  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  const vue: Vue = parametres.get("vue") === "repartition" ? "repartition" : "agents";
  const statutParam = parametres.get("statut");
  const actif = statutParam === "ACTIF" ? true : statutParam === "INACTIF" ? false : undefined;
  const zoneId = parametres.get("zoneId") ?? undefined;
  const page = Number(parametres.get("page") ?? "0");
  const triParam = parametres.get("tri") as ChampTriAgent | null;
  const direction: "ASC" | "DESC" = parametres.get("direction") === "DESC" ? "DESC" : "ASC";

  const [saisie, setSaisie] = useState(parametres.get("recherche") ?? "");
  const recherche = useValeurTemporisee(saisie.trim());

  const { data: zones } = useZones();
  const distribution = useDistributionPortefeuilles(vue === "agents");

  function mettreAJour(valeurs: Record<string, string | undefined>, conserverPage = false) {
    definirParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        for (const [cle, valeur] of Object.entries(valeurs)) {
          if (valeur) suivants.set(cle, valeur);
          else suivants.delete(cle);
        }
        if (!conserverPage) suivants.delete("page");
        return suivants;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if ((parametres.get("recherche") ?? "") !== recherche) mettreAJour({ recherche: recherche || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seule la valeur temporisée déclenche la synchronisation
  }, [recherche]);

  const rechercheUrl = parametres.get("recherche") ?? undefined;
  const filtres = useMemo(
    () => ({
      recherche: rechercheUrl,
      actif,
      zoneId,
      page,
      taille: TAILLE_PAGE,
      tri: triParam ?? undefined,
      direction: triParam ? direction : undefined,
    }),
    [rechercheUrl, actif, zoneId, page, triParam, direction],
  );
  const { data, isLoading, isError, error, isFetching } = useAgentsPagines(filtres);

  const volumes = useMemo(
    () => new Map((distribution.data ?? []).map((ligne) => [ligne.agentId, ligne.nombreAdherents])),
    [distribution.data],
  );
  const libelleZone = (id: string | null) => zones?.find((z) => z.id === id)?.libelle ?? "—";

  const tri: SortingState =
    triParam && COLONNE_PAR_TRI[triParam] ? [{ id: COLONNE_PAR_TRI[triParam]!, desc: direction === "DESC" }] : [];

  function changerTri(suivant: SortingState) {
    const premier = suivant[0];
    const champ = premier ? TRI_PAR_COLONNE[premier.id] : undefined;
    mettreAJour({ tri: champ, direction: champ ? (premier?.desc ? "DESC" : "ASC") : undefined });
  }

  const filtresActifs: { cle: string; libelle: string; retirer: () => void }[] = [];
  if (rechercheUrl)
    filtresActifs.push({
      cle: "recherche",
      libelle: `Recherche : « ${rechercheUrl} »`,
      retirer: () => {
        setSaisie("");
        mettreAJour({ recherche: undefined });
      },
    });
  if (statutParam && actif !== undefined)
    filtresActifs.push({
      cle: "statut",
      libelle: `Statut : ${definitionStatut("agent", statutParam).libelle}`,
      retirer: () => mettreAJour({ statut: undefined }),
    });
  if (zoneId)
    filtresActifs.push({ cle: "zoneId", libelle: `Zone : ${libelleZone(zoneId)}`, retirer: () => mettreAJour({ zoneId: undefined }) });

  const colonnes = useMemo<ColumnDef<Agent>[]>(
    () => [
      {
        id: "code",
        header: "Code",
        accessorKey: "codeAgent",
        enableSorting: true,
        cell: ({ row }) => <span className="ref">{row.original.codeAgent}</span>,
      },
      {
        id: "agent",
        header: "Agent",
        accessorKey: "nomComplet",
        enableSorting: true,
        // Le téléphone accompagne le nom : deux agents homonymes restent distinguables.
        cell: ({ row }) => (
          <CelluleIdentite nom={row.original.nomComplet} detail={<span className="ref">{formaterTelephone(row.original.telephone)}</span>} />
        ),
      },
      {
        id: "zone",
        header: "Zone",
        accessorKey: "zoneId",
        enableSorting: true,
        cell: ({ row }) => libelleZone(row.original.zoneId),
      },
      {
        id: "portefeuille",
        header: "Adhérents suivis",
        enableSorting: false,
        cell: ({ row }) => {
          // La répartition serveur ne porte que sur les agents actifs.
          const volume = volumes.get(row.original.id);
          return <span className="chiffre">{volume === undefined ? "—" : formaterNombre(volume)}</span>;
        },
      },
      {
        id: "statut",
        header: "Statut",
        enableSorting: false,
        cell: ({ row }) => <BadgeStatut domaine="agent" code={row.original.actif ? "ACTIF" : "INACTIF"} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `libelleZone` dépend de `zones`
    [volumes, zones],
  );

  return (
    <CoquilleApplication titre="Agents de terrain">
      <div className="space-y-6">
        <EnTetePage
          titre="Agents de terrain"
          description="Agents, portefeuilles et activité — consultation comparative, sans classement."
          actions={
            peutGerer && (
              <Button onClick={() => setAjoutOuvert(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Ajouter un agent
              </Button>
            )
          }
        />

        <Tabs value={vue} onValueChange={(valeur) => mettreAJour({ vue: valeur === "agents" ? undefined : valeur })}>
          <TabsList>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="repartition">Répartition des portefeuilles</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-6">
            <BarreFiltres>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-agent-recherche">Nom, code ou téléphone</Label>
                <ChampRecherche
                  id="filtre-agent-recherche"
                  value={saisie}
                  className="sm:w-72"
                  onChange={(evenement) => setSaisie(evenement.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-agent-statut">Statut</Label>
                <Select value={statutParam ?? "TOUS"} onValueChange={(valeur) => mettreAJour({ statut: valeur === "TOUS" ? undefined : valeur })}>
                  <SelectTrigger id="filtre-agent-statut" className="w-44">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous les statuts</SelectItem>
                    <SelectItem value="ACTIF">{definitionStatut("agent", "ACTIF").libelle}</SelectItem>
                    <SelectItem value="INACTIF">{definitionStatut("agent", "INACTIF").libelle}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-agent-zone">Zone</Label>
                <div className="w-56">
                  <SelectRecherche
                    id="filtre-agent-zone"
                    options={(zones ?? []).map((z) => ({ valeur: z.id, libelle: z.libelle }))}
                    valeur={zoneId}
                    onChange={(valeur) => mettreAJour({ zoneId: valeur || undefined })}
                    placeholder="Toutes les zones"
                  />
                </div>
              </div>
            </BarreFiltres>

            {filtresActifs.length > 0 && (
              <ul className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
                {filtresActifs.map((filtre) => (
                  <li key={filtre.cle}>
                    <Button variant="outline" size="sm" onClick={filtre.retirer} aria-label={`Retirer le filtre ${filtre.libelle}`}>
                      {filtre.libelle}
                      <X className="size-3.5" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {data && data.avertissements.length > 0 && <AvertissementRegle avertissements={data.avertissements} />}
            {isLoading && <SqueletteTableau colonnes={5} />}
            {isError && (
              <Alerte teinte="danger" titre="Impossible de charger les agents">
                <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
              </Alerte>
            )}
            <p className="sr-only" aria-live="polite">
              {isFetching && !isLoading ? "Mise à jour de la liste…" : ""}
            </p>

            {data && data.contenu.length === 0 && (
              <EtatVide
                icone={UserRoundSearch}
                titre="Aucun agent ne correspond à ces critères"
                description="Modifiez la recherche ou les filtres."
              />
            )}

            {data && data.contenu.length > 0 && (
              <TableauDonnees
                colonnes={colonnes}
                lignes={data.contenu}
                cleLigne={(a) => a.id}
                tri={tri}
                onChangerTri={changerTri}
                onActiverLigne={(a) => navigate(`/agents/${a.id}`)}
                libelleLigne={(a) => `Ouvrir la fiche de ${a.nomComplet}`}
                legende="Liste des agents de terrain"
                pied={
                  <Pagination
                    page={page}
                    totalPages={data.totalPages}
                    totalElements={data.totalElements}
                    libelleElements="agents"
                    onChangerPage={(nouvelle) => mettreAJour({ page: String(nouvelle) }, true)}
                  />
                }
              />
            )}
          </TabsContent>

          <TabsContent value="repartition">{vue === "repartition" && <VueRepartition />}</TabsContent>
        </Tabs>
      </div>

      {peutGerer && (
        <DialogueAjouterAgent
          ouvert={ajoutOuvert}
          onOuvertChange={setAjoutOuvert}
          onAgentCree={(agentId) => navigate(`/agents/${agentId}`)}
        />
      )}
    </CoquilleApplication>
  );
}
