import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { Pagination } from "@/components/cositi/pagination";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAffecterPortefeuille,
  useAgents,
  usePortefeuilleAgent,
  useRetirerPortefeuille,
  useSansAgentReferent,
  useTransfererPortefeuille,
} from "@/hooks/useOrganisation";
import type { AdherentResume, Agent } from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";
import { formaterTelephone } from "@/lib/format";

const TAILLE_PAGE = 25;

interface OngletPortefeuilleProps {
  agent: Agent;
  /** `ORGANISATION:AFFECTER_PORTEFEUILLE` — Gestionnaire des comptes et DGA. */
  peutAffecter: boolean;
}

/**
 * Portefeuille de l'agent (#9, paginé serveur), avec affectation (#16), retrait (#17) et réaffectation
 * (#18). Chaque mouvement est confirmé, avec l'adhérent et le ou les agents visibles avant l'envoi.
 */
export function OngletPortefeuille({ agent, peutAffecter }: OngletPortefeuilleProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, error } = usePortefeuilleAgent(agent.id, page, TAILLE_PAGE);
  const retirer = useRetirerPortefeuille();

  const [affectationOuverte, setAffectationOuverte] = useState(false);
  const [aRetirer, setARetirer] = useState<AdherentResume | null>(null);
  const [aReaffecter, setAReaffecter] = useState<AdherentResume | null>(null);

  const colonnes = useMemo<ColumnDef<AdherentResume>[]>(
    () => [
      { id: "matricule", header: "Matricule", cell: ({ row }) => <span className="ref">{row.original.matricule}</span> },
      {
        id: "adherent",
        header: "Adhérent",
        cell: ({ row }) => (
          <CelluleIdentite nom={row.original.nomComplet} detail={<span className="ref">{formaterTelephone(row.original.telephonePrincipal)}</span>} />
        ),
      },
      { id: "zone", header: "Zone", cell: ({ row }) => row.original.zoneLibelle ?? "—" },
      { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="adherent" code={row.original.statut} /> },
      ...(peutAffecter
        ? [
            {
              id: "actions",
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }: { row: { original: AdherentResume } }) => (
                // Les boutons ne doivent pas déclencher l'ouverture de la fiche portée par la ligne.
                <div
                  className="flex justify-end gap-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <Button size="sm" variant="outline" onClick={() => setAReaffecter(row.original)}>
                    Réaffecter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setARetirer(row.original)}>
                    Retirer
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<AdherentResume>,
          ]
        : []),
    ],
    [peutAffecter],
  );

  return (
    <div className="space-y-4">
      {peutAffecter && (
        <div className="flex justify-end">
          <Button onClick={() => setAffectationOuverte(true)} disabled={!agent.actif}>
            <UserPlus className="size-4" aria-hidden="true" />
            Affecter un adhérent
          </Button>
        </div>
      )}
      {peutAffecter && !agent.actif && (
        <p className="text-sm text-texte-doux-fort">Un agent désactivé ne reçoit pas de nouvelle affectation.</p>
      )}

      {isLoading && <SqueletteTableau colonnes={5} />}
      {isError && (
        <Alerte teinte="danger" titre="Impossible de charger le portefeuille">
          <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
        </Alerte>
      )}
      {data && data.contenu.length === 0 && (
        <EtatVide icone={Users} titre="Portefeuille vide" description="Aucun adhérent n'est actuellement affecté à cet agent." />
      )}
      {data && data.contenu.length > 0 && (
        <TableauDonnees
          colonnes={colonnes}
          lignes={data.contenu}
          cleLigne={(a) => a.id}
          onActiverLigne={(a) => navigate(`/adherents/${a.id}`)}
          libelleLigne={(a) => `Ouvrir la fiche de ${a.nomComplet}`}
          legende={`Portefeuille de ${agent.nomComplet}`}
          pied={
            <Pagination
              page={page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              libelleElements="adhérents"
              onChangerPage={setPage}
            />
          }
        />
      )}

      {peutAffecter && (
        <>
          <DialogueAffecterAdherent agent={agent} ouvert={affectationOuverte} onOuvertChange={setAffectationOuverte} />
          <DialogueReaffecter
            adherent={aReaffecter}
            agentActuel={agent}
            onFermer={() => setAReaffecter(null)}
          />
          <DialogueConfirmation
            ouvert={aRetirer !== null}
            onOuvertChange={(ouvert) => !ouvert && setARetirer(null)}
            titre="Retirer l'adhérent du portefeuille"
            description={
              aRetirer && (
                <p>
                  Retirer <strong>{aRetirer.nomComplet}</strong> (<span className="ref">{aRetirer.matricule}</span>) du
                  portefeuille de <strong>{agent.nomComplet}</strong> ? L'adhérent n'aura plus d'agent responsable ;
                  l'affectation est clôturée et conservée dans l'historique.
                </p>
              )
            }
            motifRequis
            libelleMotif="Motif du retrait"
            varianteDestructive
            libelleConfirmation="Retirer"
            enCours={retirer.isPending}
            onConfirmer={async (motif) => {
              if (!aRetirer) return;
              try {
                await retirer.mutateAsync({ adherentId: aRetirer.id, motif: motif ?? "" });
                toast.success(`${aRetirer.nomComplet} retiré du portefeuille.`);
                setARetirer(null);
              } catch (e) {
                toast.error(estErreurApi(e) ? e.message : "Le retrait a échoué.");
              }
            }}
          />
        </>
      )}
    </div>
  );
}

/** #16 — ne propose que les adhérents **sans agent** de la zone de l'agent (`GET /portefeuilles/sans-agent`). */
function DialogueAffecterAdherent({
  agent,
  ouvert,
  onOuvertChange,
}: {
  agent: Agent;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  const { data: candidats, isLoading } = useSansAgentReferent(ouvert ? (agent.zoneId ?? undefined) : undefined);
  const affecter = useAffecterPortefeuille();
  const [adherentId, setAdherentId] = useState<string | undefined>();
  const [motif, setMotif] = useState("");
  const [etape, setEtape] = useState<"saisie" | "confirmation">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);
  const choisi = candidats?.find((a) => a.id === adherentId);

  function fermer(valeur: boolean) {
    if (!valeur) {
      setAdherentId(undefined);
      setMotif("");
      setEtape("saisie");
      setErreur(null);
    }
    onOuvertChange(valeur);
  }

  async function confirmer() {
    if (!adherentId || affecter.isPending) return;
    setErreur(null);
    try {
      await affecter.mutateAsync({ adherentId, agentId: agent.id, motif: motif.trim() || undefined });
      toast.success(`${choisi?.nomComplet ?? "Adhérent"} affecté à ${agent.nomComplet}.`);
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "L'affectation a échoué.");
      setEtape("saisie");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Affecter un adhérent</DialogTitle>
          <DialogDescription>
            Au portefeuille de {agent.nomComplet} — adhérents sans agent de sa zone.
          </DialogDescription>
        </DialogHeader>

        {!agent.zoneId && (
          <Alerte teinte="attention">
            <p>Cet agent n'est rattaché à aucune zone : aucun adhérent ne peut lui être proposé.</p>
          </Alerte>
        )}

        {etape === "saisie" && agent.zoneId && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="affecter-adherent">Adhérent</Label>
              <SelectRecherche
                id="affecter-adherent"
                options={(candidats ?? []).map((a) => ({ valeur: a.id, libelle: `${a.nomComplet} (${a.matricule})` }))}
                valeur={adherentId}
                onChange={(valeur) => setAdherentId(valeur || undefined)}
                placeholder={isLoading ? "Chargement…" : "Choisir un adhérent"}
                texteVide="Aucun adhérent sans agent dans cette zone."
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="affecter-motif">
                Motif <span className="font-medium text-texte-doux">(facultatif)</span>
              </Label>
              <Textarea id="affecter-motif" value={motif} onChange={(e) => setMotif(e.target.value)} />
            </div>
          </div>
        )}

        {etape === "confirmation" && choisi && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-fond p-4">
              <strong>{choisi.nomComplet}</strong>
              <span className="ref">{choisi.matricule}</span>
              <ArrowRight className="size-4" aria-label="affecté à" />
              <strong>{agent.nomComplet}</strong>
            </div>
            <p className="text-sm text-texte-doux-fort">Cette opération est journalisée.</p>
          </div>
        )}

        {erreur && (
          <Alerte teinte="danger" titre="Affectation refusée">
            <p>{erreur}</p>
          </Alerte>
        )}

        <DialogFooter>
          {etape === "saisie" ? (
            <>
              <Button variant="outline" onClick={() => fermer(false)}>
                Annuler
              </Button>
              <Button disabled={!adherentId} onClick={() => setEtape("confirmation")}>
                Continuer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtape("saisie")} disabled={affecter.isPending}>
                Retour
              </Button>
              <Button onClick={() => void confirmer()} disabled={affecter.isPending}>
                {affecter.isPending ? "Envoi en cours…" : "Confirmer l'affectation"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** #18 — action distincte d'une édition : agent actuel et nouvel agent affichés, motif obligatoire. */
function DialogueReaffecter({
  adherent,
  agentActuel,
  onFermer,
}: {
  adherent: AdherentResume | null;
  agentActuel: Agent;
  onFermer: () => void;
}) {
  const { data: agents, isLoading } = useAgents(adherent !== null);
  const transferer = useTransfererPortefeuille();
  const [agentId, setAgentId] = useState<string | undefined>();
  const [motif, setMotif] = useState("");
  const [etape, setEtape] = useState<"saisie" | "confirmation">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);
  const cible = agents?.find((a) => a.id === agentId);

  function fermer() {
    setAgentId(undefined);
    setMotif("");
    setEtape("saisie");
    setErreur(null);
    onFermer();
  }

  async function confirmer() {
    if (!adherent || !agentId || transferer.isPending) return;
    setErreur(null);
    try {
      await transferer.mutateAsync({ adherentIds: [adherent.id], nouvelAgentId: agentId, motif: motif.trim() });
      toast.success(`${adherent.nomComplet} réaffecté à ${cible?.nomComplet ?? "un autre agent"}.`);
      fermer();
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La réaffectation a échoué.");
      setEtape("saisie");
    }
  }

  const options = (agents ?? [])
    .filter((a) => a.actif && a.id !== agentActuel.id)
    .map((a) => ({ valeur: a.id, libelle: `${a.nomComplet} (${a.codeAgent})` }));

  return (
    <Dialog open={adherent !== null} onOpenChange={(ouvert) => !ouvert && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réaffecter l'adhérent</DialogTitle>
          <DialogDescription>
            {adherent?.nomComplet} (<span className="ref">{adherent?.matricule}</span>)
          </DialogDescription>
        </DialogHeader>

        {etape === "saisie" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reaffecter-agent">Nouvel agent</Label>
              <SelectRecherche
                id="reaffecter-agent"
                options={options}
                valeur={agentId}
                onChange={(valeur) => setAgentId(valeur || undefined)}
                placeholder={isLoading ? "Chargement des agents…" : "Choisir un agent"}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reaffecter-motif">
                Motif <span className="font-medium text-texte-doux">(obligatoire)</span>
              </Label>
              <Textarea id="reaffecter-motif" value={motif} onChange={(e) => setMotif(e.target.value)} required />
            </div>
          </div>
        ) : (
          cible && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-fond p-4">
                <span>{agentActuel.nomComplet}</span>
                <ArrowRight className="size-4" aria-label="devient" />
                <strong>{cible.nomComplet}</strong>
              </div>
              <p className="text-sm">
                <span className="font-semibold">Motif :</span> {motif.trim()}
              </p>
            </div>
          )
        )}

        {erreur && (
          <Alerte teinte="danger" titre="Réaffectation refusée">
            <p>{erreur}</p>
          </Alerte>
        )}

        <DialogFooter>
          {etape === "saisie" ? (
            <>
              <Button variant="outline" onClick={fermer}>
                Annuler
              </Button>
              <Button disabled={!agentId || motif.trim() === ""} onClick={() => setEtape("confirmation")}>
                Continuer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtape("saisie")} disabled={transferer.isPending}>
                Retour
              </Button>
              <Button onClick={() => void confirmer()} disabled={transferer.isPending}>
                {transferer.isPending ? "Envoi en cours…" : "Confirmer la réaffectation"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
