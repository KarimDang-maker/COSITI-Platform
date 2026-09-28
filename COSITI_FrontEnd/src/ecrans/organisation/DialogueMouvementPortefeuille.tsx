import { useId, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { useAffecterPortefeuille, useTransfererPortefeuille } from "@/hooks/useOrganisation";
import { estErreurApi } from "@/api/erreurs";
import type { Agent, AdherentResume } from "@/api/organisation";

interface DialogueMouvementPortefeuilleProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  mode: "affecter" | "transferer";
  adherent: AdherentResume | null;
  agentActuelNom?: string;
  agents: readonly Agent[];
}

/**
 * Affectation (adhérent sans agent référent) ou transfert (adhérent déjà
 * suivi par un agent) de portefeuille. Rappelle systématiquement les valeurs
 * concernées (`docs/02_DESIGN_SYSTEM.md §9.1`) ; motif obligatoire pour un
 * transfert (`TransfererPortefeuilleDto`), facultatif pour une première
 * affectation (`AffecterPortefeuilleDto`).
 */
export function DialogueMouvementPortefeuille({
  ouvert,
  onOuvertChange,
  mode,
  adherent,
  agentActuelNom,
  agents,
}: DialogueMouvementPortefeuilleProps) {
  const [agentId, setAgentId] = useState("");
  const [motif, setMotif] = useState("");
  const idMotif = useId();
  const affecter = useAffecterPortefeuille();
  const transferer = useTransfererPortefeuille();
  const enCours = affecter.isPending || transferer.isPending;
  const motifInvalide = mode === "transferer" && motif.trim() === "";

  if (!adherent) return null;

  const agentCible = agents.find((a) => a.id === agentId);

  function reinitialiser() {
    setAgentId("");
    setMotif("");
  }

  async function confirmer() {
    if (!agentId || motifInvalide) return;
    try {
      if (mode === "affecter") {
        await affecter.mutateAsync({ adherentId: adherent!.id, agentId, motif: motif.trim() || undefined });
      } else {
        await transferer.mutateAsync({ adherentIds: [adherent!.id], nouvelAgentId: agentId, motif: motif.trim() });
      }
      toast.success(`Portefeuille de ${adherent!.nomComplet} mis à jour.`);
      reinitialiser();
      onOuvertChange(false);
    } catch (e) {
      toast.error(estErreurApi(e) ? e.message : "L'opération a échoué.");
    }
  }

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(valeur) => {
        if (!valeur) reinitialiser();
        onOuvertChange(valeur);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "affecter" ? "Affecter un portefeuille" : "Transférer un portefeuille"}</DialogTitle>
          <DialogDescription>
            {mode === "affecter"
              ? `${adherent.nomComplet} n'a actuellement aucun agent référent.`
              : `${adherent.nomComplet} est actuellement suivi par ${agentActuelNom ?? "un agent"}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-cible">Nouvel agent référent</Label>
            <SelectRecherche
              id="agent-cible"
              options={agents.filter((a) => a.actif).map((a) => ({ valeur: a.id, libelle: `${a.codeAgent} — ${a.nomComplet}` }))}
              valeur={agentId}
              onChange={setAgentId}
              placeholder="Sélectionner un agent"
            />
          </div>

          {mode === "transferer" && (
            <div className="space-y-2">
              <Label htmlFor={idMotif}>Motif du transfert</Label>
              <Textarea
                id={idMotif}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                aria-invalid={motifInvalide}
                required
              />
              {motifInvalide && <p className="text-sm text-danger-fort">Le motif est obligatoire pour un transfert.</p>}
            </div>
          )}

          {agentId && (
            <Alerte teinte="info">
              <p>
                Confirmez : {adherent.nomComplet} sera suivi par{" "}
                <strong>{agentCible?.nomComplet}</strong>.
              </p>
            </Alerte>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => void confirmer()} disabled={!agentId || motifInvalide || enCours}>
            {enCours ? "Envoi en cours…" : mode === "affecter" ? "Affecter" : "Transférer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
