import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Download, Plus, Wallet, X } from "lucide-react";
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
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { ChampRecherche } from "@/components/cositi/champ-recherche";
import { ChampDate } from "@/components/cositi/champ-date";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/auth/ContexteAuth";
import { usePaiements } from "@/hooks/usePaiements";
import { useAgents } from "@/hooks/useOrganisation";
import { useLancerExport } from "@/hooks/useExports";
import { useValeurTemporisee } from "@/hooks/useValeurTemporisee";
import type { ChampTriPaiement, ModePaiement, StatutPaiement } from "@/api/paiements";
import { estErreurApi } from "@/api/erreurs";
import { STATUTS, definitionStatut } from "@/lib/statuts";
import { formaterDate } from "@/lib/format";
import {
  COLONNE_PAR_TRI_PAIEMENT,
  TRI_PAR_COLONNE_PAIEMENT,
  colonnesPaiementBase,
} from "@/ecrans/cotisations/colonnesPaiement";
import { VueStatistiquesJour } from "@/ecrans/cotisations/VueStatistiquesJour";
import { aujourdhui } from "@/ecrans/cotisations/dates";

/** Statuts et modes officiels, lus dans `lib/statuts.ts` — jamais une liste recopiée ici. */
const OPTIONS_STATUT = Object.keys(STATUTS.paiement) as StatutPaiement[];
const OPTIONS_MODE = Object.keys(STATUTS.modePaiement) as ModePaiement[];

const TAILLE_PAGE = 25;

/**
 * Journal des cotisations (module cotisations, #1 à #7) et statistiques du jour (#27). Recherche, filtres,
 * tri et page vivent dans l'URL et sont appliqués par le serveur, dans le périmètre du demandeur.
 */
export function JournalCotisations() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const peutCreer = usePermission("PAIEMENT:CREER");
  const peutExporter = usePermission("EXPORT:PAIEMENTS");
  const peutLireOrganisation = usePermission("ORGANISATION:LIRE");
  const lancerExport = useLancerExport();
  const [exportOuvert, setExportOuvert] = useState(false);

  const vue = parametres.get("vue") === "statistiques" ? "statistiques" : "journal";
  const adherentId = parametres.get("adherentId") ?? undefined;
  const agentId = parametres.get("agentId") ?? undefined;
  const statut = (parametres.get("statut") as StatutPaiement | null) ?? undefined;
  const modePaiement = (parametres.get("modePaiement") as ModePaiement | null) ?? undefined;
  const dateDu = parametres.get("dateDu") ?? undefined;
  const dateAu = parametres.get("dateAu") ?? undefined;
  const page = Number(parametres.get("page") ?? "0");
  const triParam = parametres.get("tri") as ChampTriPaiement | null;
  const direction: "ASC" | "DESC" = parametres.get("direction") === "ASC" ? "ASC" : "DESC";
  const periodeInvalide = !!dateDu && !!dateAu && dateDu > dateAu;

  const [saisieMatricule, setSaisieMatricule] = useState(parametres.get("adherentMatricule") ?? "");
  const [saisieReference, setSaisieReference] = useState(parametres.get("reference") ?? "");
  const matricule = useValeurTemporisee(saisieMatricule.trim().toUpperCase());
  const reference = useValeurTemporisee(saisieReference.trim());

  const { data: agents } = useAgents(peutLireOrganisation);

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
    if ((parametres.get("adherentMatricule") ?? "") !== matricule) mettreAJour({ adherentMatricule: matricule || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seule la valeur temporisée déclenche la synchronisation
  }, [matricule]);

  useEffect(() => {
    if ((parametres.get("reference") ?? "") !== reference) mettreAJour({ reference: reference || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idem
  }, [reference]);

  const matriculeUrl = parametres.get("adherentMatricule") ?? undefined;
  const referenceUrl = parametres.get("reference") ?? undefined;

  const filtres = useMemo(
    () => ({
      adherentId,
      adherentMatricule: matriculeUrl,
      agentId,
      reference: referenceUrl,
      statut,
      modePaiement,
      // Une période inversée n'est pas envoyée : le serveur la refuserait (400), l'écran l'explique.
      dateDu: periodeInvalide ? undefined : dateDu,
      dateAu: periodeInvalide ? undefined : dateAu,
      page,
      taille: TAILLE_PAGE,
      tri: triParam ?? undefined,
      direction: triParam ? direction : undefined,
    }),
    [adherentId, matriculeUrl, agentId, referenceUrl, statut, modePaiement, dateDu, dateAu, periodeInvalide, page, triParam, direction],
  );

  const { data, isLoading, isError, error, isFetching } = usePaiements(filtres, vue === "journal");
  const colonnes = useMemo(() => colonnesPaiementBase(), []);

  const tri: SortingState =
    triParam && COLONNE_PAR_TRI_PAIEMENT[triParam] ? [{ id: COLONNE_PAR_TRI_PAIEMENT[triParam]!, desc: direction === "DESC" }] : [];

  function changerTri(suivant: SortingState) {
    const premier = suivant[0];
    const champ = premier ? TRI_PAR_COLONNE_PAIEMENT[premier.id] : undefined;
    mettreAJour({ tri: champ, direction: champ ? (premier?.desc ? "DESC" : "ASC") : undefined });
  }

  const agentSelectionne = agents?.find((a) => a.id === agentId);

  const filtresActifs: { cle: string; libelle: string; retirer: () => void }[] = [];
  if (adherentId) filtresActifs.push({ cle: "adherentId", libelle: "Adhérent sélectionné", retirer: () => mettreAJour({ adherentId: undefined }) });
  if (matriculeUrl)
    filtresActifs.push({
      cle: "adherentMatricule",
      libelle: `Matricule : ${matriculeUrl}`,
      retirer: () => {
        setSaisieMatricule("");
        mettreAJour({ adherentMatricule: undefined });
      },
    });
  if (referenceUrl)
    filtresActifs.push({
      cle: "reference",
      libelle: `Référence : ${referenceUrl}`,
      retirer: () => {
        setSaisieReference("");
        mettreAJour({ reference: undefined });
      },
    });
  if (agentId)
    filtresActifs.push({ cle: "agentId", libelle: `Agent : ${agentSelectionne?.nomComplet ?? "sélectionné"}`, retirer: () => mettreAJour({ agentId: undefined }) });
  if (statut)
    filtresActifs.push({ cle: "statut", libelle: `Statut : ${definitionStatut("paiement", statut).libelle}`, retirer: () => mettreAJour({ statut: undefined }) });
  if (modePaiement)
    filtresActifs.push({
      cle: "modePaiement",
      libelle: `Mode : ${definitionStatut("modePaiement", modePaiement).libelle}`,
      retirer: () => mettreAJour({ modePaiement: undefined }),
    });
  if (dateDu || dateAu)
    filtresActifs.push({
      cle: "periode",
      libelle: `Période : ${dateDu ? formaterDate(dateDu) : "…"} → ${dateAu ? formaterDate(dateAu) : "…"}`,
      retirer: () => mettreAJour({ dateDu: undefined, dateAu: undefined }),
    });

  const filtresNonExportes = filtresActifs.filter((f) => !["statut", "periode"].includes(f.cle));

  return (
    <CoquilleApplication titre="Cotisations">
      <div className="space-y-6">
        <EnTetePage
          titre="Cotisations"
          description="Journal des paiements de votre périmètre : recherche, contrôle et suivi."
          actions={
            <>
              {peutExporter && (
                <Button variant="outline" disabled={lancerExport.isPending} onClick={() => setExportOuvert(true)}>
                  <Download className="size-4" aria-hidden="true" />
                  {lancerExport.isPending ? "Export en cours…" : "Exporter (CSV)"}
                </Button>
              )}
              {peutCreer && (
                <Button onClick={() => navigate("/cotisations/nouveau")}>
                  <Plus className="size-4" aria-hidden="true" />
                  Nouveau paiement
                </Button>
              )}
            </>
          }
        />

        <Tabs value={vue} onValueChange={(valeur) => mettreAJour({ vue: valeur === "journal" ? undefined : valeur })}>
          <TabsList>
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="statistiques">Statistiques du jour</TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="space-y-6">
            <BarreFiltres>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-matricule">Matricule de l'adhérent</Label>
                <ChampRecherche
                  id="filtre-matricule"
                  className="ref sm:w-52"
                  value={saisieMatricule}
                  onChange={(e) => setSaisieMatricule(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-reference">N° de reçu ou référence</Label>
                <Input
                  id="filtre-reference"
                  className="ref w-52"
                  value={saisieReference}
                  onChange={(e) => setSaisieReference(e.target.value)}
                />
              </div>
              {peutLireOrganisation && (
                <div className="space-y-1.5">
                  <Label htmlFor="filtre-agent">Agent encaisseur</Label>
                  <div className="w-56">
                    <SelectRecherche
                      id="filtre-agent"
                      options={(agents ?? []).map((a) => ({ valeur: a.id, libelle: `${a.nomComplet} (${a.codeAgent})` }))}
                      valeur={agentId}
                      onChange={(valeur) => mettreAJour({ agentId: valeur || undefined })}
                      placeholder="Tous les agents"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="filtre-statut">Statut</Label>
                <Select value={statut ?? "TOUS"} onValueChange={(valeur) => mettreAJour({ statut: valeur === "TOUS" ? undefined : valeur })}>
                  <SelectTrigger id="filtre-statut" className="w-52">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous les statuts</SelectItem>
                    {OPTIONS_STATUT.map((code) => (
                      <SelectItem key={code} value={code}>
                        {definitionStatut("paiement", code).libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-mode">Mode de paiement</Label>
                <Select
                  value={modePaiement ?? "TOUS"}
                  onValueChange={(valeur) => mettreAJour({ modePaiement: valeur === "TOUS" ? undefined : valeur })}
                >
                  <SelectTrigger id="filtre-mode" className="w-48">
                    <SelectValue placeholder="Tous les modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous les modes</SelectItem>
                    {OPTIONS_MODE.map((code) => (
                      <SelectItem key={code} value={code}>
                        {definitionStatut("modePaiement", code).libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-du">Du</Label>
                <ChampDate id="filtre-du" value={dateDu ?? ""} max={aujourdhui()} onChange={(e) => mettreAJour({ dateDu: e.target.value || undefined })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-au">Au</Label>
                <ChampDate id="filtre-au" value={dateAu ?? ""} max={aujourdhui()} onChange={(e) => mettreAJour({ dateAu: e.target.value || undefined })} />
              </div>
            </BarreFiltres>

            {periodeInvalide && (
              <Alerte teinte="attention">
                <p>La date de début doit précéder la date de fin : la période n'est pas appliquée.</p>
              </Alerte>
            )}

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

            {/* #28 : les statistiques par agent vivent sur sa fiche (module agents). */}
            {agentId && peutLireOrganisation && (
              <p className="text-sm">
                <Link to={`/agents/${agentId}`} className="font-medium text-primaire underline underline-offset-2">
                  Voir la synthèse des cotisations de {agentSelectionne?.nomComplet ?? "cet agent"}
                </Link>
              </p>
            )}

            {data && data.avertissements.length > 0 && <AvertissementRegle avertissements={data.avertissements} />}
            {isLoading && <SqueletteTableau colonnes={7} />}
            {isError && (
              <Alerte teinte="danger" titre="Impossible de charger le journal des cotisations">
                <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
              </Alerte>
            )}
            <p className="sr-only" aria-live="polite">
              {isFetching && !isLoading ? "Mise à jour du journal…" : ""}
            </p>

            {data && data.contenu.length === 0 && (
              <EtatVide
                titre={
                  referenceUrl
                    ? "Aucune cotisation de votre périmètre ne porte ce numéro de reçu ou cette référence"
                    : "Aucun paiement ne correspond à ces critères"
                }
                description="Vérifiez la saisie ou modifiez les filtres."
                icone={Wallet}
              />
            )}

            {data && data.contenu.length > 0 && (
              <TableauDonnees
                colonnes={colonnes}
                lignes={data.contenu}
                cleLigne={(p) => p.id}
                tri={tri}
                onChangerTri={changerTri}
                onActiverLigne={(p) => navigate(`/cotisations/${p.id}`)}
                libelleLigne={(p) => `Ouvrir le paiement ${p.numeroRecu}`}
                legende="Journal des cotisations"
                pied={
                  <Pagination
                    page={page}
                    totalPages={data.totalPages}
                    totalElements={data.totalElements}
                    libelleElements="paiements"
                    onChangerPage={(nouvelle) => mettreAJour({ page: String(nouvelle) }, true)}
                  />
                }
              />
            )}
          </TabsContent>

          <TabsContent value="statistiques">{vue === "statistiques" && <VueStatistiquesJour />}</TabsContent>
        </Tabs>
      </div>

      <DialogueConfirmation
        ouvert={exportOuvert}
        onOuvertChange={setExportOuvert}
        titre="Exporter les cotisations"
        description={
          <div className="space-y-2 text-left">
            <p>Le fichier CSV est produit par le serveur, limité à votre périmètre, et l'export est journalisé.</p>
            <p>
              Critères appliqués : statut <strong>{statut ? definitionStatut("paiement", statut).libelle : "tous"}</strong>, période{" "}
              <strong>
                {!periodeInvalide && (dateDu || dateAu) ? `${dateDu ? formaterDate(dateDu) : "…"} → ${dateAu ? formaterDate(dateAu) : "…"}` : "complète"}
              </strong>
              .
            </p>
            {filtresNonExportes.length > 0 && (
              <p className="text-sm text-texte-doux-fort">
                Les autres filtres affichés ({filtresNonExportes.map((f) => f.libelle).join(", ")}) ne sont pas pris en charge par
                l'export.
              </p>
            )}
          </div>
        }
        libelleConfirmation="Exporter"
        enCours={lancerExport.isPending}
        onConfirmer={async () => {
          await lancerExport
            .mutateAsync({
              type: "paiements",
              filtres: { statut, du: periodeInvalide ? undefined : dateDu, au: periodeInvalide ? undefined : dateAu },
            })
            .catch(() => undefined);
          setExportOuvert(false);
        }}
      />
    </CoquilleApplication>
  );
}
