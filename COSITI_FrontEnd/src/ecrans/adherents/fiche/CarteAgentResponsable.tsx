import { useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CarteSection } from "@/components/cositi/carte-section";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Alerte } from "@/components/cositi/alerte";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgentResponsable } from "@/hooks/useAdherents";
import { useAffecterPortefeuille, useAgents, useTransfererPortefeuille } from "@/hooks/useOrganisation";
import type { AgentResponsable } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterTelephone } from "@/lib/format";

interface CarteAgentResponsableProps {
  adherentId: string;
  nomAdherent: string;
  /** `ORGANISATION:AFFECTER_PORTEFEUILLE` — Gestionnaire des comptes et DGA. */
  peutAffecter: boolean;
}

/**
 * Agent responsable (#22) et son affectation (#23) ou réaffectation (#24). L'information affichée ne sert
 * qu'à la lecture : aucune permission n'en est déduite, l'API contrôle chaque accès au portefeuille.
 */
export function CarteAgentResponsable({ adherentId, nomAdherent, peutAffecter }: CarteAgentResponsableProps) {
  const { data: agent, isLoading, isError, error } = useAgentResponsable(adherentId);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);

  return (
    <CarteSection
      titre="Agent responsable"
      actions={
        peutAffecter && !isLoading && !isError ? (
          <Button size="sm" variant="outline" onClick={() => setDialogueOuvert(true)}>
            {agent ? "Réaffecter" : "Affecter un agent"}
          </Button>
        ) : undefined
      }
    >
      {isLoading && <Skeleton className="h-12 w-full" />}
      {isError && (
        <Alerte teinte="danger">
          <p>{estErreurApi(error) ? error.message : "L'agent responsable n'a pas pu être chargé."}</p>
        </Alerte>
      )}
      {agent === null && (
        <p className="flex items-center gap-2 text-texte-doux-fort">
          <UserRound className="size-4" aria-hidden="true" />
          Aucun agent n'est actuellement affecté à cet adhérent.
        </p>
      )}
      {agent && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CelluleIdentite nom={agent.nomComplet} detail={`${agent.codeAgent} · ${formaterTelephone(agent.telephone)}`} />
          {!agent.actif && <span className="text-sm font-semibold text-attention-fort">Agent désactivé</span>}
        </div>
      )}

      {peutAffecter && agent !== undefined && (
        <DialogueAffectation
          ouvert={dialogueOuvert}
          onOuvertChange={setDialogueOuvert}
          adherentId={adherentId}
          nomAdherent={nomAdherent}
          agentActuel={agent}
        />
      )}
    </CarteSection>
  );
}

function DialogueAffectation({
  ouvert,
  onOuvertChange,
  adherentId,
  nomAdherent,
  agentActuel,
}: {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  adherentId: string;
  nomAdherent: string;
  agentActuel: AgentResponsable | null;
}) {
  const { data: agents, isLoading } = useAgents();
  const affecter = useAffecterPortefeuille();
  const transferer = useTransfererPortefeuille();
  const [agentId, setAgentId] = useState<string | undefined>();
  const [motif, setMotif] = useState("");
  const [etape, setEtape] = useState<"saisie" | "confirmation">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);

  const reaffectation = agentActuel !== null;
  const enCours = affecter.isPending || transferer.isPending;
  const cible = agents?.find((a) => a.id === agentId);
  // Le motif n'est exigé que pour la réaffectation : le serveur le refuse vide (PORTEFEUILLE_MOTIF_REQUIS).
  const motifManquant = reaffectation && motif.trim() === "";

  function fermer(valeur: boolean) {
    if (!valeur) {
      setAgentId(undefined);
      setMotif("");
      setEtape("saisie");
      setErreur(null);
    }
    onOuvertChange(valeur);
  }

  async function confirmer() {
    if (!agentId || enCours) return;
    setErreur(null);
    try {
      if (reaffectation) {
        await transferer.mutateAsync({ adherentIds: [adherentId], nouvelAgentId: agentId, motif: motif.trim() });
      } else {
        await affecter.mutateAsync({ adherentId, agentId, motif: motif.trim() || undefined });
      }
      toast.success(reaffectation ? "Adhérent réaffecté." : "Agent affecté.");
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "L'affectation n'a pas pu être enregistrée.");
      setEtape("saisie");
    }
  }

  const options = (agents ?? [])
    .filter((a) => a.actif && a.id !== agentActuel?.id)
    .map((a) => ({ valeur: a.id, libelle: `${a.nomComplet} (${a.codeAgent})` }));

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reaffectation ? "Réaffecter l'adhérent" : "Affecter un agent"}</DialogTitle>
          <DialogDescription>{nomAdherent}</DialogDescription>
        </DialogHeader>

        {etape === "saisie" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="affectation-agent">{reaffectation ? "Nouvel agent" : "Agent de terrain"}</Label>
              <SelectRecherche
                id="affectation-agent"
                options={options}
                valeur={agentId}
                onChange={(valeur) => setAgentId(valeur || undefined)}
                placeholder={isLoading ? "Chargement des agents…" : "Choisir un agent"}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="affectation-motif">
                Motif {reaffectation ? <span className="font-medium text-texte-doux">(obligatoire)</span> : <span className="font-medium text-texte-doux">(facultatif)</span>}
              </Label>
              <Textarea id="affectation-motif" value={motif} onChange={(e) => setMotif(e.target.value)} />
            </div>
          </div>
        )}

        {etape === "confirmation" && cible && (
          <div className="space-y-3">
            <p>Vérifiez l'affectation avant de confirmer :</p>
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-fond p-4">
              <span>{agentActuel ? agentActuel.nomComplet : "Aucun agent"}</span>
              <ArrowRight className="size-4" aria-label="devient" />
              <strong>{cible.nomComplet}</strong>
            </div>
            {motif.trim() && (
              <p className="text-sm">
                <span className="font-semibold">Motif :</span> {motif.trim()}
              </p>
            )}
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
              <Button disabled={!agentId || motifManquant} onClick={() => setEtape("confirmation")}>
                Continuer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtape("saisie")} disabled={enCours}>
                Retour
              </Button>
              <Button onClick={() => void confirmer()} disabled={enCours}>
                {enCours ? "Envoi en cours…" : "Confirmer"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
