import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Download, Plus, Search, Users, X } from "lucide-react";
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
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/auth/ContexteAuth";
import { useAdherents, useRechercherParMatricule } from "@/hooks/useAdherents";
import { useAgents } from "@/hooks/useOrganisation";
import { useLancerExport } from "@/hooks/useExports";
import { useValeurTemporisee } from "@/hooks/useValeurTemporisee";
import type { AdherentResume, ChampTriAdherent, DirectionTri, StatutAdherent } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { STATUTS, definitionStatut } from "@/lib/statuts";
import { formaterDate, formaterTelephone } from "@/lib/format";
import { VueSeuilCnps } from "@/ecrans/adherents/VueSeuilCnps";

const TAILLE_PAGE = 25;

/** Libellés lus dans `lib/statuts.ts` : l'ordre suit le cycle de vie, jamais une liste recopiée ici. */
const OPTIONS_STATUT = Object.keys(STATUTS.adherent) as StatutAdherent[];

/**
 * Plages de complétion proposées (#7). Ce ne sont que des bornes de requête : l'appartenance d'un
 * adhérent à une plage est décidée par la formule serveur (`completionMin`/`completionMax`).
 */
const PLAGES_COMPLETION = [
  { valeur: "0-49", libelle: "Moins de 50 %", min: 0, max: 49 },
  { valeur: "50-79", libelle: "De 50 à 79 %", min: 50, max: 79 },
  { valeur: "80-99", libelle: "De 80 à 99 %", min: 80, max: 99 },
  { valeur: "100-100", libelle: "Dossier complet (100 %)", min: 100, max: 100 },
] as const;

/** Colonne du tableau → champ de la liste blanche serveur (#8). */
const TRI_PAR_COLONNE: Readonly<Record<string, ChampTriAdherent>> = {
  matricule: "MATRICULE",
  nom: "NOM",
  dateAdhesion: "DATE_ADHESION",
  statut: "STATUT",
};
const COLONNE_PAR_TRI = Object.fromEntries(Object.entries(TRI_PAR_COLONNE).map(([c, t]) => [t, c]));

type Vue = "tous" | "proches" | "eligibles";

export function ListeAdherents() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const peutCreer = usePermission("ADHERENT:CREER");
  const peutExporter = usePermission("EXPORT:ADHERENTS");
  const peutLireOrganisation = usePermission("ORGANISATION:LIRE");
  const peutLireCnps = usePermission("CNPS:LIRE");
  const lancerExport = useLancerExport();
  const [exportOuvert, setExportOuvert] = useState(false);

  const vueDemandee = (parametres.get("vue") as Vue | null) ?? "tous";
  const vue: Vue = !peutLireCnps && vueDemandee !== "tous" ? "tous" : vueDemandee;
  const statut = (parametres.get("statut") as StatutAdherent | null) ?? undefined;
  const agentId = parametres.get("agentId") ?? undefined;
  const plage = PLAGES_COMPLETION.find((p) => p.valeur === parametres.get("completion"));
  const page = Number(parametres.get("page") ?? "0");
  const triParam = parametres.get("tri") as ChampTriAdherent | null;
  const direction = (parametres.get("direction") as DirectionTri | null) ?? "ASC";

  // Les champs texte gardent leur propre état : l'URL n'est mise à jour qu'après temporisation,
  // pour ne pas envoyer une requête (ni réécrire l'historique) à chaque frappe.
  const [saisieRecherche, setSaisieRecherche] = useState(parametres.get("recherche") ?? "");
  const [saisieTelephone, setSaisieTelephone] = useState(parametres.get("telephone") ?? "");
  const recherche = useValeurTemporisee(saisieRecherche.trim());
  const telephone = useValeurTemporisee(saisieTelephone.replace(/\D/g, ""));

  const { data: agents } = useAgents();

  function mettreAJourParametres(valeurs: Record<string, string | undefined>, conserverPage = false) {
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
    if ((parametres.get("recherche") ?? "") !== recherche) mettreAJourParametres({ recherche: recherche || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seule la valeur temporisée déclenche la synchronisation
  }, [recherche]);

  useEffect(() => {
    if ((parametres.get("telephone") ?? "") !== telephone) mettreAJourParametres({ telephone: telephone || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idem
  }, [telephone]);

  const rechercheUrl = parametres.get("recherche") ?? undefined;
  const telephoneUrl = parametres.get("telephone") ?? undefined;

  const filtres = useMemo(
    () => ({
      recherche: rechercheUrl,
      telephone: telephoneUrl,
      statut,
      agentId,
      completionMin: plage?.min,
      completionMax: plage?.max,
      page,
      taille: TAILLE_PAGE,
      tri: triParam ?? undefined,
      direction: triParam ? direction : undefined,
    }),
    [rechercheUrl, telephoneUrl, statut, agentId, plage, page, triParam, direction],
  );

  const { data, isLoading, isError, error, isFetching } = useAdherents(filtres);

  const tri: SortingState = triParam && COLONNE_PAR_TRI[triParam]
    ? [{ id: COLONNE_PAR_TRI[triParam]!, desc: direction === "DESC" }]
    : [];

  function changerTri(suivant: SortingState) {
    const premier = suivant[0];
    const champ = premier ? TRI_PAR_COLONNE[premier.id] : undefined;
    mettreAJourParametres({ tri: champ, direction: champ ? (premier?.desc ? "DESC" : "ASC") : undefined });
  }

  const agentSelectionne = agents?.find((a) => a.id === agentId);

  /** Filtres actifs, chacun retirable individuellement (UX #5, #6). */
  const filtresActifs: { cle: string; libelle: string; retirer: () => void }[] = [];
  if (rechercheUrl)
    filtresActifs.push({
      cle: "recherche",
      libelle: `Recherche : « ${rechercheUrl} »`,
      retirer: () => {
        setSaisieRecherche("");
        mettreAJourParametres({ recherche: undefined });
      },
    });
  if (telephoneUrl)
    filtresActifs.push({
      cle: "telephone",
      libelle: `Téléphone : ${formaterTelephone(telephoneUrl)}`,
      retirer: () => {
        setSaisieTelephone("");
        mettreAJourParametres({ telephone: undefined });
      },
    });
  if (statut)
    filtresActifs.push({
      cle: "statut",
      libelle: `Statut : ${definitionStatut("adherent", statut).libelle}`,
      retirer: () => mettreAJourParametres({ statut: undefined }),
    });
  if (agentId)
    filtresActifs.push({
      cle: "agentId",
      libelle: `Agent : ${agentSelectionne?.nomComplet ?? "sélectionné"}`,
      retirer: () => mettreAJourParametres({ agentId: undefined }),
    });
  if (plage)
    filtresActifs.push({
      cle: "completion",
      libelle: `Complétion : ${plage.libelle}`,
      retirer: () => mettreAJourParametres({ completion: undefined }),
    });

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
        enableSorting: false,
        cell: ({ row }) => <span className="ref">{formaterTelephone(row.original.telephonePrincipal)}</span>,
      },
      {
        id: "zoneLibelle",
        header: "Zone",
        enableSorting: false,
        cell: ({ row }) => row.original.zoneLibelle ?? "—",
      },
      {
        id: "dateAdhesion",
        header: "Adhésion",
        accessorKey: "dateAdhesion",
        enableSorting: true,
        cell: ({ row }) => formaterDate(row.original.dateAdhesion),
      },
      {
        id: "statut",
        header: "Statut",
        accessorKey: "statut",
        enableSorting: true,
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
          description="Les adhérents de votre périmètre : recherche, suivi du dossier et accès à chaque fiche."
          actions={
            <>
              {peutExporter && (
                <Button variant="outline" disabled={lancerExport.isPending} onClick={() => setExportOuvert(true)}>
                  <Download className="size-4" aria-hidden="true" />
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

        <AccesParMatricule />

        <Tabs value={vue} onValueChange={(valeur) => mettreAJourParametres({ vue: valeur === "tous" ? undefined : valeur })}>
          {peutLireCnps && (
            <TabsList>
              <TabsTrigger value="tous">Tous les adhérents</TabsTrigger>
              <TabsTrigger value="proches">Proches du seuil CNPS</TabsTrigger>
              <TabsTrigger value="eligibles">Éligibles CNPS</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="tous" className="space-y-6">
            {/* Barre hors du tableau : elle reste visible quand la liste est vide ou en chargement,
                puisque l'état vide invite justement à modifier les filtres. */}
            <BarreFiltres>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-recherche">Nom, prénoms ou matricule</Label>
                <ChampRecherche
                  id="filtre-recherche"
                  value={saisieRecherche}
                  className="sm:w-72"
                  onChange={(evenement) => setSaisieRecherche(evenement.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filtre-telephone">Téléphone</Label>
                <Input
                  id="filtre-telephone"
                  type="tel"
                  inputMode="tel"
                  className="w-44"
                  value={saisieTelephone}
                  onChange={(evenement) => setSaisieTelephone(evenement.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filtre-statut">Statut</Label>
                <Select
                  value={statut ?? "TOUS"}
                  onValueChange={(valeur) => mettreAJourParametres({ statut: valeur === "TOUS" ? undefined : valeur })}
                >
                  <SelectTrigger id="filtre-statut" className="w-48">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous les statuts</SelectItem>
                    {OPTIONS_STATUT.map((code) => (
                      <SelectItem key={code} value={code}>
                        {definitionStatut("adherent", code).libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {peutLireOrganisation && (
                <div className="space-y-1.5">
                  <Label htmlFor="filtre-agent">Agent de terrain</Label>
                  <div className="w-56">
                    <SelectRecherche
                      id="filtre-agent"
                      options={(agents ?? []).map((a) => ({ valeur: a.id, libelle: `${a.nomComplet} (${a.codeAgent})` }))}
                      valeur={agentId}
                      onChange={(valeur) => mettreAJourParametres({ agentId: valeur || undefined })}
                      placeholder="Tous les agents"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="filtre-completion">Complétion du dossier</Label>
                <Select
                  value={plage?.valeur ?? "TOUTES"}
                  onValueChange={(valeur) =>
                    mettreAJourParametres({ completion: valeur === "TOUTES" ? undefined : valeur })
                  }
                >
                  <SelectTrigger id="filtre-completion" className="w-52">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUTES">Toutes</SelectItem>
                    {PLAGES_COMPLETION.map((p) => (
                      <SelectItem key={p.valeur} value={p.valeur}>
                        {p.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {isLoading && <SqueletteTableau colonnes={6} />}

            {isError && (
              <Alerte teinte="danger" titre="Impossible de charger les adhérents">
                <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
              </Alerte>
            )}

            {/* Le total réel est porté par le pied de pagination ; ici, seulement le signal de rechargement,
                sans vider le tableau (la page précédente reste affichée). */}
            <p className="sr-only" aria-live="polite">
              {isFetching && !isLoading ? "Mise à jour de la liste…" : ""}
            </p>

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
                onChangerTri={changerTri}
                onActiverLigne={(a) => navigate(`/adherents/${a.id}`)}
                libelleLigne={(a) => `Ouvrir la fiche de ${a.nomComplet}`}
                legende="Liste des adhérents"
                pied={
                  <Pagination
                    page={page}
                    totalPages={data.totalPages}
                    totalElements={data.totalElements}
                    libelleElements="adhérents"
                    onChangerPage={(nouvelle) => mettreAJourParametres({ page: String(nouvelle) }, true)}
                  />
                }
              />
            )}
          </TabsContent>

          {peutLireCnps && (
            <>
              <TabsContent value="proches">{vue === "proches" && <VueSeuilCnps mode="proches" />}</TabsContent>
              <TabsContent value="eligibles">{vue === "eligibles" && <VueSeuilCnps mode="eligibles" />}</TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <DialogueConfirmation
        ouvert={exportOuvert}
        onOuvertChange={setExportOuvert}
        titre="Exporter la liste des adhérents"
        description={
          <div className="space-y-2 text-left">
            <p>
              Le fichier CSV est produit par le serveur, limité à votre périmètre, et l'export est journalisé.
            </p>
            <p>
              Critère appliqué : <strong>{statut ? definitionStatut("adherent", statut).libelle : "tous les statuts"}</strong>.
            </p>
            {filtresActifs.some((f) => f.cle !== "statut") && (
              <p className="text-sm text-texte-doux-fort">
                Les autres filtres affichés (recherche, téléphone, agent, complétion) ne sont pas pris en charge par
                l'export : le fichier contiendra tous les adhérents de ce statut.
              </p>
            )}
          </div>
        }
        libelleConfirmation="Exporter"
        enCours={lancerExport.isPending}
        onConfirmer={async () => {
          await lancerExport.mutateAsync({ type: "adherents", filtres: { statut } }).catch(() => undefined);
          setExportOuvert(false);
        }}
      />
    </CoquilleApplication>
  );
}

/**
 * Accès direct à une fiche par son matricule (#3) : recherche exacte, côté serveur. Un matricule inexistant
 * ou hors périmètre donne le même message — l'API ne distingue pas les deux, et l'écran non plus.
 */
function AccesParMatricule() {
  const navigate = useNavigate();
  const rechercher = useRechercherParMatricule();
  const [matricule, setMatricule] = useState("");

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    const saisie = matricule.trim();
    if (!saisie || rechercher.isPending) return;
    rechercher.mutate(saisie.toUpperCase(), { onSuccess: (adherent) => navigate(`/adherents/${adherent.id}`) });
  }

  return (
    <form onSubmit={soumettre} className="flex flex-wrap items-end gap-3" aria-label="Accès direct par matricule">
      <div className="space-y-1.5">
        <Label htmlFor="acces-matricule">Ouvrir une fiche par matricule</Label>
        <Input
          id="acces-matricule"
          className="ref w-56"
          value={matricule}
          onChange={(evenement) => {
            setMatricule(evenement.target.value);
            if (rechercher.isError) rechercher.reset();
          }}
          aria-invalid={rechercher.isError}
          aria-describedby={rechercher.isError ? "acces-matricule-erreur" : undefined}
        />
      </div>
      <Button type="submit" variant="outline" disabled={!matricule.trim() || rechercher.isPending}>
        <Search className="size-4" aria-hidden="true" />
        {rechercher.isPending ? "Recherche…" : "Ouvrir"}
      </Button>
      <div aria-live="polite" className="basis-full">
        {rechercher.isError && (
          <p id="acces-matricule-erreur" className="text-sm font-semibold text-danger-fort">
            {estErreurApi(rechercher.error) && rechercher.error.statut === 404
              ? "Aucun adhérent de votre périmètre ne porte ce matricule. Vérifiez la saisie."
              : estErreurApi(rechercher.error)
                ? rechercher.error.message
                : "La recherche a échoué."}
          </p>
        )}
      </div>
    </form>
  );
}
