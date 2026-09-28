import { toast } from "sonner";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { useDesignerChef, useRemplacerChef } from "@/hooks/useOrganisation";
import { estErreurApi } from "@/api/erreurs";
import type { Agent } from "@/api/organisation";

interface DialogueDesignerChefProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  /** Agent candidat à devenir (ou rester) Chef de sa zone. */
  candidat: Agent | null;
  /** Chef actuel de la zone du candidat, ou `null` si aucun n'est encore désigné. */
  chefActuel: Agent | null | undefined;
}

/**
 * DGA-F03/DGA-F04 : désignation initiale ou remplacement du Chef des agents
 * de terrain. Le remplacement rappelle explicitement l'ancien Chef
 * (`docs/03_SPECIFICATIONS_ECRANS.md`, mandat de session J3).
 */
export function DialogueDesignerChef({ ouvert, onOuvertChange, candidat, chefActuel }: DialogueDesignerChefProps) {
  const designer = useDesignerChef();
  const remplacer = useRemplacerChef();
  const remplacement = !!chefActuel && chefActuel.id !== candidat?.id;
  const enCours = designer.isPending || remplacer.isPending;

  if (!candidat) return null;

  return (
    <DialogueConfirmation
      ouvert={ouvert}
      onOuvertChange={onOuvertChange}
      titre={remplacement ? "Remplacer le Chef des agents de terrain" : "Désigner le Chef des agents de terrain"}
      description={
        remplacement ? (
          <p>
            <strong>{candidat.nomComplet}</strong> remplacera <strong>{chefActuel?.nomComplet}</strong> comme Chef
            des agents de terrain de cette zone. L'historique de désignation est conservé.
          </p>
        ) : (
          <p>
            <strong>{candidat.nomComplet}</strong> deviendra Chef des agents de terrain de sa zone. Cette action est
            journalisée.
          </p>
        )
      }
      motifRequis
      libelleMotif="Motif de la désignation"
      libelleConfirmation={remplacement ? "Remplacer le Chef" : "Désigner le Chef"}
      enCours={enCours}
      onConfirmer={async (motif) => {
        try {
          if (remplacement) {
            await remplacer.mutateAsync({ agentId: candidat.id, motif: motif! });
            toast.success(`${candidat.nomComplet} est désormais Chef des agents de terrain.`);
          } else {
            await designer.mutateAsync({ agentId: candidat.id, motif: motif! });
            toast.success(`${candidat.nomComplet} est désormais Chef des agents de terrain.`);
          }
          onOuvertChange(false);
        } catch (e) {
          toast.error(estErreurApi(e) ? e.message : "L'action a échoué.");
        }
      }}
    />
  );
}
