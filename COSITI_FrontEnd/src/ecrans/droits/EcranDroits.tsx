import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRetardataires } from "@/hooks/useDroits";
import { useAuth } from "@/auth/ContexteAuth";
import { DialogueCreerCampagne } from "@/ecrans/droits/DialogueCreerCampagne";
import { useAgents, useZones } from "@/hooks/useOrganisation";
import type { Retardataire } from "@/api/droits";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterNombre } from "@/lib/format";

const TAILLE_PAGE = 25;

/**
 * `/droits` — Liste des retardataires (J6). `03_SPECIFICATIONS_API.md §5`
 * ne détaille pas la forme de la réponse ; vérifié dans le code backend réel
 * (`AdherentEnRetardDto`, `ServiceRegulariteImpl`) une fois celui-ci livré
 * par la session backend, en cours de ce même lot — voir `src/api/droits.ts`
 * pour le détail de l'écart avec l'exemple du pack (colonnes pack, cumul
 * cotisé, agent, zone et statut de régularité demandées par le mandat de
 * session mais absentes de la réponse réelle : non affichées plutôt
 * qu'inventées).
 *
 * Le tri par retard décroissant est fixe côté serveur
 * (`ServiceRegulariteImpl.retardataires`, non paramétrable) : pas de bascule
 * de tri proposée ici, contrairement à `ListeAdherents` (J2).
 *
 * Jalon J8 : la création d'une campagne de relance, laissée désactivée en J6
 * faute d'endpoint (`TODO [A]`), est désormais branchée sur
 * `POST /campagnes-relance`. Les filtres actifs deviennent les critères
 * enregistrés de la campagne — une trace, jamais un ciblage rejoué.
 */
export function EcranDroits() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();

  const zoneId = parametres.get("zoneId") ?? undefined;
  const agentId = parametres.get("agentId") ?? undefined;
  const joursRetardMinTexte = parametres.get("joursRetardMin") ?? "";
  const page = Number(parametres.get("page") ?? "0");

  const { data: zones } = useZones();
  const { data: agents } = useAgents();

  const filtres = useMemo(
    () => ({
      zoneId,
      agentId,
      joursRetardMin: joursRetardMinTexte ? Number(joursRetardMinTexte) : undefined,
      page,
      taille: TAILLE_PAGE,
    }),
    [zoneId, agentId, joursRetardMinTexte, page],
  );

  const { data, isLoading, isError, error } = useRetardataires(filtres);
  const { aLaPermission } = useAuth();
  const [campagneOuverte, setCampagneOuverte] = useState(false);
  const peutCreerCampagne = aLaPermission("RELANCE:GERER_CAMPAGNE");

  const optionsZones = useMemo(() => (zones ?? []).map((z) => ({ valeur: z.id, libelle: z.libelle })), [zones]);
  const optionsAgents = useMemo(() => (agents ?? []).map((a) => ({ valeur: a.id, libelle: a.nomComplet })), [agents]);

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

  const colonnes = useMemo<ColumnDef<Retardataire>[]>(
    () => [
      { id: "matricule", header: "Matricule", cell: ({ row }) => <span className="ref">{row.original.matricule}</span> },
      { id: "nomComplet", header: "Adhérent", cell: ({ row }) => row.original.nomComplet },
      { id: "couvertJusquAu", header: "Couvert jusqu'au", cell: ({ row }) => formaterDate(row.original.couvertJusquAu) },
      {
        id: "joursRetard",
        header: "Jours de retard",
        cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.joursRetard)}</span>,
      },
    ],
    [],
  );

  return (
    <CoquilleApplication titre="Droits">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1>Droits et régularité</h1>
            <p className="text-texte-doux">Retardataires, triés par retard décroissant (tri serveur fixe).</p>
          </div>

          {peutCreerCampagne && (
            <Button onClick={() => setCampagneOuverte(true)}>Créer une campagne de relance</Button>
          )}
        </div>

        <BarreFiltres>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-jours-retard-min">Jours de retard minimum</Label>
            <Input
              id="filtre-jours-retard-min"
              type="number"
              min="0"
              className="w-40"
              defaultValue={joursRetardMinTexte}
              onChange={(evenement) => mettreAJourParametre("joursRetardMin", evenement.target.value || undefined)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filtre-zone">Zone</Label>
            <SelectRecherche
              id="filtre-zone"
              options={optionsZones}
              valeur={zoneId}
              onChange={(valeur) => mettreAJourParametre("zoneId", valeur)}
              placeholder="Toutes les zones"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filtre-agent">Agent</Label>
            <SelectRecherche
              id="filtre-agent"
              options={optionsAgents}
              valeur={agentId}
              onChange={(valeur) => mettreAJourParametre("agentId", valeur)}
              placeholder="Tous les agents"
            />
          </div>
        </BarreFiltres>

        {data && data.avertissements.length > 0 && <AvertissementRegle avertissements={data.avertissements} />}

        {isLoading && <SqueletteTableau colonnes={4} />}

        {isError && (
          <Alerte teinte="danger" titre="Impossible de charger les retardataires">
            <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {data && data.contenu.length === 0 && (
          <EtatVide
            titre="Aucun retardataire ne correspond à ces critères"
            description="Modifiez les filtres pour élargir la recherche."
          />
        )}

        {data && data.contenu.length > 0 && (
          <>
            <TableauDonnees
              colonnes={colonnes}
              lignes={data.contenu}
              cleLigne={(r) => r.adherentId}
              onActiverLigne={(r) => navigate(`/adherents/${r.adherentId}`)}
              libelleLigne={(r) => `Ouvrir la fiche de ${r.nomComplet}`}
            />

            <div className="flex items-center justify-between text-sm text-texte-doux">
              <p>{data.totalElements} retardataires</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => changerPage(page - 1)}>
                  Précédent
                </Button>
                <span>
                  Page {page + 1} sur {Math.max(data.totalPages, 1)}
                </span>
                <Button variant="outline" size="sm" disabled={page + 1 >= data.totalPages} onClick={() => changerPage(page + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <DialogueCreerCampagne
        ouvert={campagneOuverte}
        onOuvertChange={setCampagneOuverte}
        criteres={{
          joursRetardMin: joursRetardMinTexte || undefined,
          zoneId,
          agentId,
        }}
        nbRetardataires={data?.totalElements ?? 0}
      />
    </CoquilleApplication>
  );
}
