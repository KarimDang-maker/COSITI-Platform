import { useState } from "react";
import { ArrowRight } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { useChangerStatutAdherent } from "@/hooks/useAdherents";
import type { StatutAdherent } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { STATUTS, definitionStatut } from "@/lib/statuts";

interface DialogueChangerStatutProps {
  adherentId: string;
  nomAdherent: string;
  statutActuel: StatutAdherent;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

/**
 * Changement de statut du dossier (#33). Le serveur est seul juge des transitions : un refus (statut
 * inchangé, adhérent radié…) est affiché tel qu'il le formule, sans règle recopiée ici. Le motif est
 * obligatoire et demandé avant la confirmation, jamais après.
 */
export function DialogueChangerStatut({ adherentId, nomAdherent, statutActuel, ouvert, onOuvertChange }: DialogueChangerStatutProps) {
  const changer = useChangerStatutAdherent(adherentId);
  const [statut, setStatut] = useState<StatutAdherent | undefined>();
  const [motif, setMotif] = useState("");
  const [etape, setEtape] = useState<"saisie" | "confirmation">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);

  const options = (Object.keys(STATUTS.adherent) as StatutAdherent[]).filter((code) => code !== statutActuel);

  function fermer(valeur: boolean) {
    if (!valeur) {
      setStatut(undefined);
      setMotif("");
      setEtape("saisie");
      setErreur(null);
    }
    onOuvertChange(valeur);
  }

  async function confirmer() {
    if (!statut || changer.isPending) return;
    setErreur(null);
    try {
      await changer.mutateAsync({ statut, motif: motif.trim() });
      toast.success(`Statut changé : ${definitionStatut("adherent", statut).libelle}.`);
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "Le statut n'a pas pu être changé.");
      setEtape("saisie");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le statut du dossier</DialogTitle>
          <DialogDescription>{nomAdherent}</DialogDescription>
        </DialogHeader>

        {etape === "saisie" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nouveau-statut">Nouveau statut</Label>
              <Select value={statut ?? ""} onValueChange={(valeur) => setStatut(valeur as StatutAdherent)}>
                <SelectTrigger id="nouveau-statut">
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((code) => (
                    <SelectItem key={code} value={code}>
                      {definitionStatut("adherent", code).libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motif-statut">
                Motif <span className="font-medium text-texte-doux">(obligatoire)</span>
              </Label>
              <Textarea id="motif-statut" value={motif} onChange={(e) => setMotif(e.target.value)} required />
            </div>
          </div>
        ) : (
          statut && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-fond p-4">
                <BadgeStatut domaine="adherent" code={statutActuel} />
                <ArrowRight className="size-4" aria-label="devient" />
                <BadgeStatut domaine="adherent" code={statut} />
              </div>
              <p className="text-sm">
                <span className="font-semibold">Motif :</span> {motif.trim()}
              </p>
              <p className="text-sm text-texte-doux-fort">Ce changement est journalisé.</p>
            </div>
          )
        )}

        {erreur && (
          <Alerte teinte="danger" titre="Changement refusé">
            <p>{erreur}</p>
          </Alerte>
        )}

        <DialogFooter>
          {etape === "saisie" ? (
            <>
              <Button variant="outline" onClick={() => fermer(false)}>
                Annuler
              </Button>
              <Button disabled={!statut || motif.trim() === ""} onClick={() => setEtape("confirmation")}>
                Continuer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtape("saisie")} disabled={changer.isPending}>
                Retour
              </Button>
              <Button onClick={() => void confirmer()} disabled={changer.isPending}>
                {changer.isPending ? "Envoi en cours…" : "Confirmer le changement"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
