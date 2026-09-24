import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Alerte } from "@/components/cositi/alerte";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSituationsImmatriculation } from "@/hooks/useCnps";
import { useOuvrirDossierCnps } from "@/hooks/useCnps";
import { usePermission } from "@/auth/ContexteAuth";
import { estErreurApi } from "@/api/erreurs";
import { formaterMatricule, formaterMontant, formaterPourcentage, formaterTelephone, formaterDate } from "@/lib/format";
import type { SituationImmatriculationCnps } from "@/api/cnps";

type Onglet = "urgent" | "cycle" | "immatricules";

/**
 * `/immatriculations` — Gestion des Immatriculations CNPS (module Gestionnaire des comptes, 3 onglets,
 * `Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V1.md` §7-§13).
 *
 * Les 3 onglets sont dérivés côté client d'un seul appel réel (`GET /cnps/immatriculations`) :
 *  - « À immatriculer d'urgence » = `numeroCnps` absent (seuil du pack franchi, pas encore immatriculé) ;
 *  - « Déjà immatriculés CNPS » = `numeroCnps` présent ;
 *  - « Vérification cycle 15/30 » — **hypothèse `[A]`, à valider par la COSITI** : aucun champ backend ne
 *    trace la date du contrôle bimensuel réel (ni ici ni sur aucun DTO CNPS). Cet onglet montre donc
 *    l'ensemble des adhérents suivis par le mécanisme de seuil, immatriculés ou non — l'union des deux
 *    autres onglets — plutôt qu'une date fabriquée. Voir `Conception/SUIVI_EXECUTION.md`.
 */
export function EcranImmatriculations() {
  const navigate = useNavigate();
  const [parametresUrl, definirParametres] = useSearchParams();
  const onglet = (parametresUrl.get("onglet") as Onglet | null) ?? "urgent";
  const recherche = parametresUrl.get("recherche") ?? "";
  const peutGerer = usePermission("CNPS:GERER");

  const situations = useSituationsImmatriculation();
  const ouvrirDossier = useOuvrirDossierCnps();
  const [aImmatriculer, setAImmatriculer] = useState<SituationImmatriculationCnps | null>(null);

  function changerOnglet(valeur: string) {
    const suivants = new URLSearchParams(parametresUrl);
    suivants.set("onglet", valeur);
    definirParametres(suivants, { replace: true });
  }

  function mettreAJourRecherche(valeur: string) {
    const suivants = new URLSearchParams(parametresUrl);
    if (valeur) suivants.set("recherche", valeur);
    else suivants.delete("recherche");
    definirParametres(suivants, { replace: true });
  }

  const urgent = useMemo(() => (situations.data ?? []).filter((s) => !s.numeroCnps), [situations.data]);
  const immatricules = useMemo(() => (situations.data ?? []).filter((s) => !!s.numeroCnps), [situations.data]);
  const cycle = situations.data ?? [];

  const contenuOnglet = onglet === "urgent" ? urgent : onglet === "immatricules" ? immatricules : cycle;
  const filtre = recherche.trim().toLowerCase();
  const lignes = filtre
    ? contenuOnglet.filter(
        (s) => s.matricule.toLowerCase().includes(filtre) || s.nomComplet.toLowerCase().includes(filtre),
      )
    : contenuOnglet;

  const colonnes = useMemo<ColumnDef<SituationImmatriculationCnps>[]>(
    () => [
      {
        id: "matricule",
        header: "Matricule",
        cell: ({ row }) => <span className="ref">{formaterMatricule(row.original.matricule)}</span>,
      },
      { id: "nom", header: "Nom & prénom(s)", cell: ({ row }) => row.original.nomComplet },
      {
        id: "metier",
        header: "Métier & contact",
        cell: ({ row }) => (
          <div>
            <p>{row.original.profession ?? "—"}</p>
            <p className="text-xs text-texte-doux">{formaterTelephone(row.original.telephone)}</p>
          </div>
        ),
      },
      {
        id: "cumul",
        header: "Cumul cotisé",
        cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.cumulCotise)}</span>,
      },
      {
        id: "progression",
        header: "Progression seuil",
        cell: ({ row }) => (
          <span className="chiffre">
            {formaterPourcentage(
              row.original.seuilEligibilite > 0
                ? Math.min(1, row.original.cumulCotise / row.original.seuilEligibilite)
                : 0,
            )}{" "}
            / {formaterMontant(row.original.seuilEligibilite)}
          </span>
        ),
      },
      {
        id: "numeroCnps",
        header: "Numéro CNPS",
        cell: ({ row }) =>
          row.original.numeroCnps ? (
            <div>
              <p className="ref">{row.original.numeroCnps}</p>
              {row.original.dateImmatriculation && (
                <p className="text-xs text-texte-doux">Immat. le {formaterDate(row.original.dateImmatriculation)}</p>
              )}
            </div>
          ) : (
            <span className="rounded-sm border border-succes-trait bg-succes-doux px-1.5 py-0.5 text-xs font-semibold text-succes-fort">
              Seuil atteint
            </span>
          ),
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) =>
          row.original.numeroCnps ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/dossiers-cnps?recherche=${encodeURIComponent(row.original.matricule)}`)}
            >
              Dossier Allocations
            </Button>
          ) : row.original.dossierOuvert ? (
            <span className="text-sm text-texte-doux">Dossier déjà ouvert</span>
          ) : (
            peutGerer && (
              <Button variant="outline" size="sm" onClick={() => setAImmatriculer(row.original)}>
                Éligible CNPS
              </Button>
            )
          ),
      },
    ],
    [navigate, peutGerer],
  );

  return (
    <CoquilleApplication titre="Immatriculations">
      <div className="space-y-6">
        <div>
          <h1>Gestion des Immatriculations CNPS</h1>
          <p className="text-texte-doux">
            Seuil réglementaire du pack de l'adhérent • Contrôle cyclique au 15 et au 30 du mois
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primaire-doux bg-succes-doux p-4">
          <div>
            <p className="text-xs font-semibold uppercase text-texte-doux-fort">Règle métier COSITI</p>
            <p className="font-semibold text-texte">Contrôle automatique au 15 et au 30 de chaque mois</p>
            <p className="text-sm text-texte-doux">
              Le seuil d'éligibilité CNPS est propre au pack de chaque adhérent — jamais une valeur unique.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-texte-doux-fort">Adhérents éligibles en attente</p>
            <p className="chiffre text-3xl font-bold text-titre">{urgent.length}</p>
          </div>
        </div>

        <Tabs value={onglet} onValueChange={changerOnglet}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="urgent">À immatriculer d'urgence ({urgent.length})</TabsTrigger>
              <TabsTrigger value="cycle">Vérification cycle 15/30 ({cycle.length})</TabsTrigger>
              <TabsTrigger value="immatricules">Déjà immatriculés CNPS ({immatricules.length})</TabsTrigger>
            </TabsList>
            <BarreFiltres>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-immatriculations">Filtrer la liste</Label>
                <Input
                  id="filtre-immatriculations"
                  className="w-64"
                  placeholder="Matricule ou nom…"
                  defaultValue={recherche}
                  onChange={(evenement) => mettreAJourRecherche(evenement.target.value)}
                />
              </div>
            </BarreFiltres>
          </div>

          <TabsContent value={onglet} className="mt-4">
            {situations.isLoading && <SqueletteTableau colonnes={7} />}
            {situations.isError && (
              <Alerte teinte="danger" titre="Impossible de charger les situations d'immatriculation">
                <p>{estErreurApi(situations.error) ? situations.error.message : "Une erreur inattendue est survenue."}</p>
              </Alerte>
            )}
            {situations.data && lignes.length === 0 && (
              <EtatVide titre="Aucun adhérent trouvé pour ces critères." />
            )}
            {situations.data && lignes.length > 0 && (
              <TableauDonnees colonnes={colonnes} lignes={lignes} cleLigne={(s) => s.adherentId} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <DialogueConfirmation
        ouvert={!!aImmatriculer}
        onOuvertChange={(ouvert) => !ouvert && setAImmatriculer(null)}
        titre="Ouvrir un dossier d'immatriculation CNPS"
        description={
          aImmatriculer
            ? `Un dossier d'immatriculation sera ouvert pour ${aImmatriculer.nomComplet} (${formaterMatricule(aImmatriculer.matricule)}).`
            : ""
        }
        libelleConfirmation="Ouvrir le dossier"
        enCours={ouvrirDossier.isPending}
        onConfirmer={() => {
          if (!aImmatriculer) return;
          ouvrirDossier.mutate(aImmatriculer.adherentId, {
            onSuccess: () => {
              toast.success(`Dossier d'immatriculation ouvert pour ${aImmatriculer.nomComplet}.`);
              setAImmatriculer(null);
            },
            onError: (erreur) =>
              toast.error(estErreurApi(erreur) ? erreur.message : "Le dossier n'a pas pu être ouvert."),
          });
        }}
      />
    </CoquilleApplication>
  );
}
