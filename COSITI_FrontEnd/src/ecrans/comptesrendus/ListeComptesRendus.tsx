import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useComptesRendus, useConsoliderComptesRendus, useControlerCompteRendu } from "@/hooks/useComptesRendus";
import { useAuth } from "@/auth/ContexteAuth";
import type { CompteRendu } from "@/api/comptesRendus";
import { estErreurApi } from "@/api/erreurs";
import { formaterMontant, formaterNombre, formaterPeriode } from "@/lib/format";
import type { ColumnDef } from "@tanstack/react-table";

const TAILLE_PAGE = 25;

/**
 * `/comptes-rendus` — Chaîne Agent → Gestionnaire → DGA (J8).
 *
 * Un seul écran pour les trois rôles, parce qu'ils regardent le même objet à
 * trois moments différents ; les onglets suivent les permissions réelles :
 *
 *  - « Mes comptes rendus » : ce que l'utilisateur a produit (tout rôle) ;
 *  - « À contrôler » : file de travail du Gestionnaire (`COMPTE_RENDU:CONTROLER`) ;
 *  - « À consolider » : comptes rendus contrôlés, prêts à être agrégés puis
 *    transmis à la DGA (`COMPTE_RENDU:CONSOLIDER`).
 *
 * Les totaux d'un consolidé sont calculés par l'API. Aucune addition n'est
 * faite ici (`AGENTS.md` règle 2), y compris pour l'aperçu de sélection.
 */
export function ListeComptesRendus() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const { aLaPermission } = useAuth();

  const peutProduire = aLaPermission("COMPTE_RENDU:PRODUIRE");
  const peutControler = aLaPermission("COMPTE_RENDU:CONTROLER");
  const peutConsolider = aLaPermission("COMPTE_RENDU:CONSOLIDER");

  const ongletParDefaut = peutControler ? "a-controler" : "miens";
  const onglet = parametres.get("onglet") ?? ongletParDefaut;
  const page = Number(parametres.get("page") ?? "0");

  const [selection, setSelection] = useState<readonly string[]>([]);
  const [consolidationOuverte, setConsolidationOuverte] = useState(false);
  const [aControler, setAControler] = useState<CompteRendu | null>(null);

  const filtres = useMemo(() => {
    if (onglet === "a-controler") {
      return { type: "TERRAIN" as const, statut: "TRANSMIS" as const, recus: true, page, taille: TAILLE_PAGE };
    }
    if (onglet === "a-consolider") {
      return { type: "TERRAIN" as const, statut: "CONTROLE" as const, page, taille: TAILLE_PAGE };
    }
    return { page, taille: TAILLE_PAGE };
  }, [onglet, page]);

  const { data, isLoading, isError, error } = useComptesRendus(filtres);
  const controler = useControlerCompteRendu();
  const consolider = useConsoliderComptesRendus();

  function changerOnglet(valeur: string) {
    const suivants = new URLSearchParams(parametres);
    suivants.set("onglet", valeur);
    suivants.delete("page");
    definirParametres(suivants, { replace: true });
    setSelection([]);
  }

  function basculerSelection(id: string) {
    setSelection((precedente) =>
      precedente.includes(id) ? precedente.filter((x) => x !== id) : [...precedente, id],
    );
  }

  function confirmerControle(observation: string | undefined) {
    if (!aControler) return;
    controler.mutate(
      { id: aControler.id, observation },
      {
        onSuccess: () => {
          toast.success("Compte rendu contrôlé.");
          setAControler(null);
        },
        onError: (erreur) =>
          toast.error(estErreurApi(erreur) ? erreur.message : "Le contrôle n'a pas pu être enregistré."),
      },
    );
  }

  function confirmerConsolidation(synthese: string | undefined) {
    consolider.mutate(
      { ids: selection, synthese },
      {
        onSuccess: (consolide) => {
          toast.success(`${selection.length} comptes rendus consolidés.`);
          setConsolidationOuverte(false);
          setSelection([]);
          navigate(`/comptes-rendus/${consolide.id}`);
        },
        onError: (erreur) =>
          toast.error(estErreurApi(erreur) ? erreur.message : "La consolidation a échoué."),
      },
    );
  }

  const colonnes = useMemo<ColumnDef<CompteRendu>[]>(() => {
    const base: ColumnDef<CompteRendu>[] = [
      {
        id: "periode",
        header: "Période",
        cell: ({ row }) => formaterPeriode(row.original.periodeDebut, row.original.periodeFin),
      },
      {
        id: "statut",
        header: "Statut",
        cell: ({ row }) => <BadgeStatut domaine="compteRendu" code={row.original.statut} />,
      },
      {
        id: "nbVisites",
        header: "Visites",
        cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.nbVisites)}</span>,
      },
      {
        id: "nbPaiements",
        header: "Paiements",
        cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.nbPaiementsEnregistres)}</span>,
      },
      {
        id: "montantCollecte",
        header: "Montant collecté",
        cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.montantCollecte)}</span>,
      },
    ];

    if (onglet === "a-consolider" && peutConsolider) {
      base.unshift({
        id: "selection",
        header: "",
        cell: ({ row }) => (
          <Checkbox
            checked={selection.includes(row.original.id)}
            onCheckedChange={() => basculerSelection(row.original.id)}
            aria-label={`Sélectionner le compte rendu du ${row.original.periodeDebut}`}
          />
        ),
      });
    }

    if (onglet === "a-controler" && peutControler) {
      base.push({
        id: "action",
        header: "",
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => setAControler(row.original)}>
            Contrôler
          </Button>
        ),
      });
    }

    return base;
  }, [onglet, peutConsolider, peutControler, selection]);

  return (
    <CoquilleApplication titre="Comptes rendus">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1>Comptes rendus</h1>
            <p className="text-texte-doux">
              Remontées du terrain vers le Gestionnaire des comptes, puis consolidation vers la DGA.
            </p>
          </div>
          {peutProduire && (
            <Button onClick={() => navigate("/comptes-rendus/nouveau")}>Produire un compte rendu</Button>
          )}
        </div>

        <Tabs value={onglet} onValueChange={changerOnglet}>
          <TabsList>
            <TabsTrigger value="miens">Mes comptes rendus</TabsTrigger>
            {peutControler && <TabsTrigger value="a-controler">À contrôler</TabsTrigger>}
            {peutConsolider && <TabsTrigger value="a-consolider">À consolider</TabsTrigger>}
          </TabsList>

          <TabsContent value={onglet} className="space-y-4">
            {onglet === "a-consolider" && peutConsolider && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-bordure p-3">
                <p className="text-sm text-texte-doux">
                  {selection.length === 0
                    ? "Sélectionnez les comptes rendus contrôlés à consolider."
                    : `${selection.length} compte(s) rendu(s) sélectionné(s).`}
                </p>
                <Button
                  variant="outline"
                  disabled={selection.length === 0}
                  onClick={() => setConsolidationOuverte(true)}
                >
                  Consolider et préparer pour la DGA
                </Button>
              </div>
            )}

            {isLoading && <SqueletteTableau colonnes={5} />}

            {isError && (
              <Alerte teinte="danger" titre="Impossible de charger les comptes rendus">
                <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
              </Alerte>
            )}

            {data && data.contenu.length === 0 && (
              <EtatVide
                titre={
                  onglet === "a-controler"
                    ? "Aucun compte rendu en attente de contrôle"
                    : onglet === "a-consolider"
                      ? "Aucun compte rendu contrôlé à consolider"
                      : "Vous n'avez produit aucun compte rendu"
                }
                description={
                  onglet === "miens" && peutProduire
                    ? "Un compte rendu résume votre activité sur une période : visites, adhérents rencontrés, collectes."
                    : undefined
                }
              />
            )}

            {data && data.contenu.length > 0 && (
              <>
                <TableauDonnees
                  colonnes={colonnes}
                  lignes={data.contenu}
                  cleLigne={(c) => c.id}
                  onActiverLigne={(c) => navigate(`/comptes-rendus/${c.id}`)}
                  libelleLigne={(c) => `Ouvrir le compte rendu du ${c.periodeDebut} au ${c.periodeFin}`}
                />
                <div className="flex items-center justify-between text-sm text-texte-doux">
                  <p>{data.totalElements} comptes rendus</p>
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
                      Page {page + 1} sur {Math.max(data.totalPages, 1)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page + 1 >= data.totalPages}
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <DialogueConfirmation
        ouvert={!!aControler}
        onOuvertChange={(ouvert) => !ouvert && setAControler(null)}
        titre="Contrôler ce compte rendu"
        description={
          aControler
            ? `Période du ${aControler.periodeDebut} au ${aControler.periodeFin} — ${formaterNombre(aControler.nbVisites)} visites, ${formaterMontant(aControler.montantCollecte)} collectés. Votre observation est conservée avec le compte rendu.`
            : ""
        }
        libelleConfirmation="Marquer contrôlé"
        motifRequis
        libelleMotif="Observation de contrôle"
        enCours={controler.isPending}
        onConfirmer={confirmerControle}
      />

      <DialogueConfirmation
        ouvert={consolidationOuverte}
        onOuvertChange={setConsolidationOuverte}
        titre="Consolider pour la DGA"
        description={`${selection.length} compte(s) rendu(s) seront agrégés en un compte rendu consolidé. Les totaux sont calculés par le serveur à partir des sources, qui restent consultables.`}
        libelleConfirmation="Consolider"
        motifRequis
        libelleMotif="Synthèse pour la DGA"
        enCours={consolider.isPending}
        onConfirmer={confirmerConsolidation}
      />
    </CoquilleApplication>
  );
}
