import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { useDemanderChangementStatutAgent } from "@/hooks/useWorkflow";
import type { Agent } from "@/api/organisation";
import { estConflitVersion } from "@/api/workflow";
import { estErreurApi } from "@/api/erreurs";

interface DialogueDemandeStatutAgentProps {
  agent: Agent;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

/**
 * Demande de changement de statut d'un agent **validé** (§21). Ce n'est pas une modification visuelle : le
 * statut officiel reste celui d'aujourd'hui jusqu'à l'approbation par un validateur habilité (`AGENT:VALIDER`,
 * jamais le demandeur). Motif obligatoire.
 */
export function DialogueDemandeStatutAgent({ agent, ouvert, onOuvertChange }: DialogueDemandeStatutAgentProps) {
  const demander = useDemanderChangementStatutAgent(agent.id);
  const [cle, setCle] = useState(() => crypto.randomUUID());
  const cible = !agent.actif;

  return (
    <DialogueConfirmation
      ouvert={ouvert}
      onOuvertChange={(valeur) => {
        if (!valeur) setCle(crypto.randomUUID());
        onOuvertChange(valeur);
      }}
      titre="Demande de changement de statut"
      description={
        <div className="space-y-3 text-left">
          <p>
            <strong>{agent.nomComplet}</strong> (<span className="ref">{agent.codeAgent}</span>)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">Statut actuel :</span>
            <BadgeStatut domaine="agent" code={agent.actif ? "ACTIF" : "INACTIF"} />
            <ArrowRight className="size-4" aria-hidden="true" />
            <span className="text-sm">Statut proposé :</span>
            <BadgeStatut domaine="agent" code={cible ? "ACTIF" : "INACTIF"} />
          </div>
          <p className="text-sm">
            Le statut officiel reste <strong>{agent.actif ? "Actif" : "Inactif"}</strong> jusqu'à la validation de la demande.
          </p>
        </div>
      }
      motifRequis
      libelleMotif="Motif de la demande"
      libelleConfirmation="Soumettre la demande"
      enCours={demander.isPending}
      onConfirmer={async (motif) => {
        try {
          const demande = await demander.mutateAsync({
            corps: { actif: cible, motif: motif ?? "", versionBase: agent.version ?? undefined },
            cle,
          });
          toast.success(`Demande ${demande.reference} soumise : en attente de validation.`);
          onOuvertChange(false);
        } catch (e) {
          toast.error(
            estConflitVersion(e)
              ? "Le profil a été modifié entre-temps : rechargez la fiche avant de continuer."
              : estErreurApi(e)
                ? e.message
                : "La demande n'a pas pu être créée.",
          );
        }
      }}
    />
  );
}
