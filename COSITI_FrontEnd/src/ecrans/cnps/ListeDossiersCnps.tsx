import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDossiersCnps, useEligiblesNonImmatricules, useOuvrirDossierCnps } from "@/hooks/useCnps";
import { useAuth } from "@/auth/ContexteAuth";
import type { AdherentEligibleCnps, DossierCnps, StatutDossierCnps } from "@/api/cnps";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterMatricule, formaterMontant } from "@/lib/format";
import { toast } from "sonner";

const TAILLE_PAGE = 25;

const STATUTS: readonly { valeur: StatutDossierCnps; libelle: string }[] = [
  { valeur: "BROUILLON", libelle: "Brouillon" },
  { valeur: "INCOMPLET", libelle: "Incomplet" },
  { valeur: "PRET", libelle: "Prêt" },
  { valeur: "TRANSMIS", libelle: "Transmis" },
  { valeur: "TRAITE", libelle: "Traité" },
  { valeur: "REJETE", libelle: "Rejeté" },
];

/**
 * `/cnps` — Suivi CNPS (J7). Deux onglets, qui répondent à deux questions
 * différentes du Gestionnaire des comptes (`Roles des acteurs.md §7`, UC-GC-08
 * à UC-GC-10) :
 *
 *  - « où en sont les dossiers ouverts ? » (onglet Dossiers) ;
 *  - « qui devrait avoir un dossier et n'en a pas ? » (onglet Éligibles),
 *    c'est-à-dire les adhérents qui ont franchi le seuil d'éligibilité **de
 *    leur pack** sans être immatriculés.
 *
 * Le seuil, le cumul cotisé et l'éligibilité sont calculés par l'API. Cet
 * écran ne compare aucun montant lui-même (`AGENTS.md` règle 2).
 */
export function ListeDossiersCnps() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const { aLaPermission } = useAuth();

  const statut = (parametres.get("statut") as StatutDossierCnps | null) ?? undefined;
  const page = Number(parametres.get("page") ?? "0");
  const onglet = parametres.get("onglet") ?? "dossiers";

  const filtres = useMemo(() => ({ statut, page, taille: TAILLE_PAGE }), [statut, page]);
  const { data, isLoading, isError, error } = useDossiersCnps(filtres);
  const eligibles = useEligiblesNonImmatricules();
  const ouvrirDossier = useOuvrirDossierCnps();

  const peutGerer = aLaPermission("CNPS:GERER");

  function mettreAJourParametre(cle: string, valeur: string | undefined) {
    const suivants = new URLSearchParams(parametres);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    if (cle !== "page") suivants.delete("page");
    definirParametres(suivants, { replace: true });
  }

  function ouvrirPourAdherent(ligne: AdherentEligibleCnps) {
    ouvrirDossier.mutate(ligne.adherentId, {
      onSuccess: (dossier) => {
        toast.success(`Dossier CNPS ouvert pour ${ligne.nomComplet}`);
        navigate(`/cnps/${dossier.id}`);
      },
      onError: (erreur) => {
        toast.error(
          estErreurApi(erreur) ? erreur.message : "Le dossier n'a pas pu être ouvert.",
        );
      },
    });
  }

  const colonnesDossiers = useMemo<ColumnDef<DossierCnps>[]>(
    () => [
      {
        id: "statut",
        header: "Statut",
        cell: ({ row }) => <BadgeStatut domaine="dossierCnps" code={row.original.statut} />,
      },
      {
        id: "numeroImmatriculation",
        header: "N° d'immatriculation",
        cell: ({ row }) => (
          <span className="ref">{row.original.numeroImmatriculation ?? "—"}</span>
        ),
      },
      {
        id: "piecesManquantes",
        header: "Pièces manquantes",
        cell: ({ row }) => (
          <span className="chiffre">{row.original.piecesManquantes.length}</span>
        ),
      },
      {
        id: "creeLe",
        header: "Ouvert le",
        cell: ({ row }) => formaterDate(row.original.creeLe),
      },
    ],
    [],
  );

  const colonnesEligibles = useMemo<ColumnDef<AdherentEligibleCnps>[]>(
    () => [
      {
        id: "matricule",
        header: "Matricule",
        cell: ({ row }) => <span className="ref">{formaterMatricule(row.original.matricule)}</span>,
      },
      { id: "nomComplet", header: "Adhérent", cell: ({ row }) => row.original.nomComplet },
      { id: "packCode", header: "Pack", cell: ({ row }) => row.original.packCode },
      {
        id: "cumulCotise",
        header: "Cumul cotisé",
        cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.cumulCotise)}</span>,
      },
      {
        id: "seuilEligibilite",
        header: "Seuil du pack",
        cell: ({ row }) => (
          <span className="chiffre">{formaterMontant(row.original.seuilEligibilite)}</span>
        ),
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) =>
          row.original.dossierOuvert ? (
            <span className="text-sm text-texte-doux">Dossier déjà ouvert</span>
          ) : peutGerer ? (
            <Button
              size="sm"
              variant="outline"
              disabled={ouvrirDossier.isPending}
              onClick={() => ouvrirPourAdherent(row.original)}
            >
              Ouvrir un dossier
            </Button>
          ) : null,
      },
    ],
    // `ouvrirPourAdherent` referme sur la mutation : la dépendance suit son état de chargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [peutGerer, ouvrirDossier.isPending],
  );

  return (
    <CoquilleApplication titre="CNPS">
      <div className="space-y-4">
        <div>
          <h1>Suivi CNPS</h1>
          <p className="text-texte-doux">
            Dossiers d'immatriculation, pièces et déclarations mensuelles.
          </p>
        </div>

        <Tabs value={onglet} onValueChange={(valeur) => mettreAJourParametre("onglet", valeur)}>
          <TabsList>
            <TabsTrigger value="dossiers">Dossiers</TabsTrigger>
            <TabsTrigger value="eligibles">Éligibles non immatriculés</TabsTrigger>
          </TabsList>

          <TabsContent value="dossiers" className="space-y-4">
            <BarreFiltres>
              <div className="space-y-1.5">
                <Label htmlFor="filtre-statut-dossier">Statut</Label>
                <SelectRecherche
                  id="filtre-statut-dossier"
                  options={STATUTS.map((s) => ({ valeur: s.valeur, libelle: s.libelle }))}
                  valeur={statut}
                  onChange={(valeur) => mettreAJourParametre("statut", valeur)}
                  placeholder="Tous les statuts"
                />
              </div>
            </BarreFiltres>

            {data && data.avertissements.length > 0 && (
              <AvertissementRegle avertissements={data.avertissements} />
            )}

            {isLoading && <SqueletteTableau colonnes={4} />}

            {isError && (
              <Alerte teinte="danger" titre="Impossible de charger les dossiers CNPS">
                <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
              </Alerte>
            )}

            {data && data.contenu.length === 0 && (
              <EtatVide
                titre="Aucun dossier CNPS ne correspond à ces critères"
                description="Ouvrez un dossier depuis l'onglet « Éligibles non immatriculés »."
              />
            )}

            {data && data.contenu.length > 0 && (
              <>
                <TableauDonnees
                  colonnes={colonnesDossiers}
                  lignes={data.contenu}
                  cleLigne={(d) => d.id}
                  onActiverLigne={(d) => navigate(`/cnps/${d.id}`)}
                  libelleLigne={(d) => `Ouvrir le dossier CNPS ${d.id}`}
                />
                <div className="flex items-center justify-between text-sm text-texte-doux">
                  <p>{data.totalElements} dossiers</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 0}
                      onClick={() => mettreAJourParametre("page", String(page - 1))}
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
                      onClick={() => mettreAJourParametre("page", String(page + 1))}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="eligibles" className="space-y-4">
            <p className="text-sm text-texte-doux">
              Adhérents dont le cumul cotisé a franchi le seuil d'éligibilité de leur propre pack, et
              qui n'ont pas encore de numéro d'immatriculation CNPS.
            </p>

            {eligibles.isLoading && <SqueletteTableau colonnes={6} />}

            {eligibles.isError && (
              <Alerte teinte="danger" titre="Impossible de charger les adhérents éligibles">
                <p>
                  {estErreurApi(eligibles.error)
                    ? eligibles.error.message
                    : "Une erreur inattendue est survenue."}
                </p>
              </Alerte>
            )}

            {eligibles.data && eligibles.data.length === 0 && (
              <EtatVide
                titre="Aucun adhérent éligible en attente d'immatriculation"
                description="Tous les adhérents ayant franchi le seuil de leur pack ont un dossier ou un numéro CNPS."
              />
            )}

            {eligibles.data && eligibles.data.length > 0 && (
              <TableauDonnees
                colonnes={colonnesEligibles}
                lignes={eligibles.data}
                cleLigne={(a) => a.adherentId}
                onActiverLigne={(a) => navigate(`/adherents/${a.adherentId}`)}
                libelleLigne={(a) => `Ouvrir la fiche de ${a.nomComplet}`}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CoquilleApplication>
  );
}
