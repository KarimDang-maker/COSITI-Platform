import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampagnes, useChangerStatutCampagne, useRelances } from "@/hooks/useRelances";
import { useAuth } from "@/auth/ContexteAuth";
import type { CampagneRelance, Relance } from "@/api/relances";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterDateHeure, formaterNombre } from "@/lib/format";

const TAILLE_PAGE = 25;

/**
 * `/relances` — Relances effectuées et campagnes (J8).
 *
 * Les critères d'une campagne sont affichés **tels qu'ils ont été enregistrés** :
 * ils tracent ce qui a motivé la campagne, ils ne sont pas rejoués pour en
 * recalculer la cible. Aucune relance n'est planifiée ni envoyée par le
 * système — ce sont des actions humaines consignées après coup.
 */
export function EcranRelances() {
  const [parametres, definirParametres] = useSearchParams();
  const { aLaPermission } = useAuth();

  const onglet = parametres.get("onglet") ?? "campagnes";
  const page = Number(parametres.get("page") ?? "0");
  const campagneId = parametres.get("campagneId") ?? undefined;

  const peutGererCampagne = aLaPermission("RELANCE:GERER_CAMPAGNE");

  const campagnes = useCampagnes({ page: onglet === "campagnes" ? page : 0, taille: TAILLE_PAGE });
  const relances = useRelances({ campagneId, page: onglet === "relances" ? page : 0, taille: TAILLE_PAGE });
  const changerStatut = useChangerStatutCampagne();

  const [aCloturer, setACloturer] = useState<CampagneRelance | null>(null);

  function changerOnglet(valeur: string) {
    const suivants = new URLSearchParams(parametres);
    suivants.set("onglet", valeur);
    suivants.delete("page");
    definirParametres(suivants, { replace: true });
  }

  function voirRelancesDeLaCampagne(campagne: CampagneRelance) {
    const suivants = new URLSearchParams();
    suivants.set("onglet", "relances");
    suivants.set("campagneId", campagne.id);
    definirParametres(suivants, { replace: true });
  }

  /** Les critères sont un JSON libre : affichés en clair, sans interprétation. */
  function resumerCriteres(critereJson: string): string {
    try {
      const critere = JSON.parse(critereJson) as Record<string, unknown>;
      const entrees = Object.entries(critere);
      if (entrees.length === 0) return "Aucun critère enregistré";
      return entrees.map(([cle, valeur]) => `${cle} : ${String(valeur)}`).join(" · ");
    } catch {
      return critereJson;
    }
  }

  const colonnesCampagnes = useMemo<ColumnDef<CampagneRelance>[]>(
    () => [
      { id: "libelle", header: "Campagne", cell: ({ row }) => row.original.libelle },
      {
        id: "statut",
        header: "Statut",
        cell: ({ row }) => <BadgeStatut domaine="campagneRelance" code={row.original.statut} />,
      },
      {
        id: "critere",
        header: "Critères retenus",
        cell: ({ row }) => (
          <span className="text-sm text-texte-doux">{resumerCriteres(row.original.critereJson)}</span>
        ),
      },
      {
        id: "nbRelances",
        header: "Relances",
        cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.nbRelances)}</span>,
      },
      { id: "dateDebut", header: "Début", cell: ({ row }) => formaterDate(row.original.dateDebut) },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => voirRelancesDeLaCampagne(row.original)}>
              Voir les relances
            </Button>
            {peutGererCampagne && row.original.statut !== "CLOTUREE" && (
              <Button variant="outline" size="sm" onClick={() => setACloturer(row.original)}>
                Clôturer
              </Button>
            )}
          </div>
        ),
      },
    ],
    // `voirRelancesDeLaCampagne` referme sur les paramètres d'URL courants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [peutGererCampagne, parametres],
  );

  const colonnesRelances = useMemo<ColumnDef<Relance>[]>(
    () => [
      {
        id: "dateContact",
        header: "Contact",
        cell: ({ row }) => formaterDateHeure(row.original.dateContact),
      },
      {
        id: "canal",
        header: "Canal",
        cell: ({ row }) => <BadgeStatut domaine="canalRelance" code={row.original.canal} />,
      },
      {
        id: "resultat",
        header: "Résultat",
        cell: ({ row }) => <BadgeStatut domaine="resultatRelance" code={row.original.resultat} />,
      },
      {
        id: "prochaineActionLe",
        header: "Prochaine action",
        cell: ({ row }) => formaterDate(row.original.prochaineActionLe),
      },
      {
        id: "commentaire",
        header: "Commentaire",
        cell: ({ row }) => (
          <span className="text-sm text-texte-doux">{row.original.commentaire ?? "—"}</span>
        ),
      },
    ],
    [],
  );

  const donnees = onglet === "campagnes" ? campagnes : relances;

  return (
    <CoquilleApplication titre="Relances">
      <div className="space-y-4">
        <div>
          <h1>Relances</h1>
          <p className="text-texte-doux">
            Campagnes et contacts effectués auprès des adhérents en retard. Aucune relance n'est envoyée
            automatiquement : ce journal consigne des actions humaines.
          </p>
        </div>

        <Tabs value={onglet} onValueChange={changerOnglet}>
          <TabsList>
            <TabsTrigger value="campagnes">Campagnes</TabsTrigger>
            <TabsTrigger value="relances">Relances effectuées</TabsTrigger>
          </TabsList>

          <TabsContent value="campagnes" className="space-y-4">
            {campagnes.isLoading && <SqueletteTableau colonnes={6} />}
            {campagnes.isError && (
              <Alerte teinte="danger" titre="Impossible de charger les campagnes">
                <p>
                  {estErreurApi(campagnes.error)
                    ? campagnes.error.message
                    : "Une erreur inattendue est survenue."}
                </p>
              </Alerte>
            )}
            {campagnes.data && campagnes.data.contenu.length === 0 && (
              <EtatVide
                titre="Aucune campagne de relance"
                description="Une campagne se crée depuis l'écran Droits, à partir de la liste des retardataires."
              />
            )}
            {campagnes.data && campagnes.data.contenu.length > 0 && (
              <TableauDonnees
                colonnes={colonnesCampagnes}
                lignes={campagnes.data.contenu}
                cleLigne={(c) => c.id}
              />
            )}
          </TabsContent>

          <TabsContent value="relances" className="space-y-4">
            {campagneId && (
              <div className="flex items-center justify-between rounded-lg border border-bordure p-3">
                <p className="text-sm text-texte-doux">Relances d'une campagne précise.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const suivants = new URLSearchParams(parametres);
                    suivants.delete("campagneId");
                    definirParametres(suivants, { replace: true });
                  }}
                >
                  Voir toutes les relances
                </Button>
              </div>
            )}

            {relances.isLoading && <SqueletteTableau colonnes={5} />}
            {relances.isError && (
              <Alerte teinte="danger" titre="Impossible de charger les relances">
                <p>
                  {estErreurApi(relances.error)
                    ? relances.error.message
                    : "Une erreur inattendue est survenue."}
                </p>
              </Alerte>
            )}
            {relances.data && relances.data.contenu.length === 0 && (
              <EtatVide
                titre="Aucune relance enregistrée"
                description="Une relance se saisit depuis la fiche d'un adhérent, après le contact."
              />
            )}
            {relances.data && relances.data.contenu.length > 0 && (
              <TableauDonnees
                colonnes={colonnesRelances}
                lignes={relances.data.contenu}
                cleLigne={(r) => r.id}
              />
            )}
          </TabsContent>
        </Tabs>

        {donnees.data && donnees.data.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-texte-doux">
            <p>{donnees.data.totalElements} éléments</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => {
                  const suivants = new URLSearchParams(parametres);
                  suivants.set("page", String(page - 1));
                  definirParametres(suivants, { replace: true });
                }}
              >
                Précédent
              </Button>
              <span>
                Page {page + 1} sur {Math.max(donnees.data.totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= donnees.data.totalPages}
                onClick={() => {
                  const suivants = new URLSearchParams(parametres);
                  suivants.set("page", String(page + 1));
                  definirParametres(suivants, { replace: true });
                }}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      <DialogueConfirmation
        ouvert={!!aCloturer}
        onOuvertChange={(ouvert) => !ouvert && setACloturer(null)}
        titre="Clôturer cette campagne"
        description={
          aCloturer
            ? `« ${aCloturer.libelle} » — ${formaterNombre(aCloturer.nbRelances)} relance(s) enregistrée(s). Une campagne clôturée n'accepte plus de nouvelle relance et ne peut pas être rouverte.`
            : ""
        }
        libelleConfirmation="Clôturer"
        varianteDestructive
        enCours={changerStatut.isPending}
        onConfirmer={() => {
          if (!aCloturer) return;
          changerStatut.mutate(
            { id: aCloturer.id, statut: "CLOTUREE" },
            {
              onSuccess: () => {
                toast.success("Campagne clôturée.");
                setACloturer(null);
              },
              onError: (erreur) =>
                toast.error(estErreurApi(erreur) ? erreur.message : "La clôture a échoué."),
            },
          );
        }}
      />
    </CoquilleApplication>
  );
}
