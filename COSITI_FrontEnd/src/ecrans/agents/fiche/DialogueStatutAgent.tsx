import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { useChangerStatutAgent } from "@/hooks/useOrganisation";
import type { Agent } from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";

interface DialogueStatutAgentProps {
  agent: Agent;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

/**
 * Activation / désactivation d'un agent (#6) : état actuel et cible affichés, motif obligatoire dans les
 * deux sens (règle serveur), refus éventuel affiché tel que formulé par l'API.
 */
export function DialogueStatutAgent({ agent, ouvert, onOuvertChange }: DialogueStatutAgentProps) {
  const changer = useChangerStatutAgent(agent.id);
  const cible = !agent.actif;

  return (
    <DialogueConfirmation
      ouvert={ouvert}
      onOuvertChange={onOuvertChange}
      titre={cible ? "Réactiver l'agent" : "Désactiver l'agent"}
      description={
        <div className="space-y-3 text-left">
          <p>
            <strong>{agent.nomComplet}</strong> (<span className="ref">{agent.codeAgent}</span>)
          </p>
          <div className="flex items-center gap-3">
            <BadgeStatut domaine="agent" code={agent.actif ? "ACTIF" : "INACTIF"} />
            <ArrowRight className="size-4" aria-label="devient" />
            <BadgeStatut domaine="agent" code={cible ? "ACTIF" : "INACTIF"} />
          </div>
          {!cible && (
            <p className="text-sm">
              Un agent désactivé ne figure plus dans la répartition des portefeuilles. Ses adhérents restent affectés
              tant qu'ils ne sont pas réaffectés.
            </p>
          )}
        </div>
      }
      motifRequis
      libelleMotif="Motif"
      varianteDestructive={!cible}
      libelleConfirmation={cible ? "Réactiver" : "Désactiver"}
      enCours={changer.isPending}
      onConfirmer={async (motif) => {
        try {
          await changer.mutateAsync({ actif: cible, motif: motif ?? "" });
          toast.success(cible ? "Agent réactivé." : "Agent désactivé.");
          onOuvertChange(false);
        } catch (e) {
          toast.error(estErreurApi(e) ? e.message : "Le statut de l'agent n'a pas pu être changé.");
        }
      }}
    />
  );
}
