import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alerte } from "@/components/cositi/alerte";
import { useFinaliserAdherent, usePacks } from "@/hooks/useAdherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateSaisie } from "@/lib/format";

interface DialogueFinaliserAdherentProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  adherentId: string;
  nomAdherent: string;
}

/**
 * Complète un adhérent {@code PREINSCRIT} (saisi par un Agent, §5) en dossier définitif — réservée à la
 * Gestionnaire des comptes. Ouvre le pack et enregistre l'allocation Sécurité Sociale/Épargne (§7-§8) : à
 * défaut de saisie manuelle, le serveur applique le plancher 700 FCFA puis Épargne.
 */
export function DialogueFinaliserAdherent({
  ouvert,
  onOuvertChange,
  adherentId,
  nomAdherent,
}: DialogueFinaliserAdherentProps) {
  const { data: packs } = usePacks();
  const finaliser = useFinaliserAdherent(adherentId);

  const [packId, setPackId] = useState("");
  const [dateAdhesion, setDateAdhesion] = useState(formaterDateSaisie(new Date().toISOString()));
  const [montantReference, setMontantReference] = useState("");
  const [allocationSecuriteSociale, setAllocationSecuriteSociale] = useState("");
  const [allocationEpargne, setAllocationEpargne] = useState("");

  useEffect(() => {
    if (ouvert) {
      setPackId("");
      setDateAdhesion(formaterDateSaisie(new Date().toISOString()));
      setMontantReference("");
      setAllocationSecuriteSociale("");
      setAllocationEpargne("");
    }
  }, [ouvert]);

  const montantInvalide = montantReference.trim() === "" || Number(montantReference) <= 0;

  async function confirmer() {
    if (!packId || montantInvalide) return;
    try {
      await finaliser.mutateAsync({
        dateAdhesion,
        packId,
        montantReference: Number(montantReference),
        allocationSecuriteSociale: allocationSecuriteSociale ? Number(allocationSecuriteSociale) : undefined,
        allocationEpargne: allocationEpargne ? Number(allocationEpargne) : undefined,
        consentementDonnees: true,
      });
      toast.success("Dossier finalisé.");
      onOuvertChange(false);
    } catch (e) {
      toast.error(estErreurApi(e) ? e.message : "La finalisation a échoué.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finaliser le dossier de {nomAdherent}</DialogTitle>
          <DialogDescription>
            Choisissez le pack et le montant de référence. L'allocation Sécurité Sociale/Épargne est
            facultative : sans saisie, le serveur applique 700 FCFA minimum vers la Sécurité Sociale puis le
            reste vers l'Épargne.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="finalisation-pack">Pack de cotisation</Label>
            <Select value={packId} onValueChange={setPackId}>
              <SelectTrigger id="finalisation-pack">
                <SelectValue placeholder="Sélectionner un pack" />
              </SelectTrigger>
              <SelectContent>
                {(packs ?? [])
                  .filter((p) => p.actif)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.libelle}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="finalisation-date">Date d'adhésion</Label>
              <Input
                id="finalisation-date"
                type="date"
                value={dateAdhesion}
                onChange={(e) => setDateAdhesion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalisation-montant">Montant de référence (FCFA)</Label>
              <Input
                id="finalisation-montant"
                type="number"
                min="0"
                aria-invalid={montantInvalide}
                value={montantReference}
                onChange={(e) => setMontantReference(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="finalisation-secu">Allocation Sécurité Sociale (FCFA, ≥ 700, facultatif)</Label>
              <Input
                id="finalisation-secu"
                type="number"
                min="700"
                value={allocationSecuriteSociale}
                onChange={(e) => setAllocationSecuriteSociale(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalisation-epargne">Allocation Épargne (FCFA, facultatif)</Label>
              <Input
                id="finalisation-epargne"
                type="number"
                min="0"
                value={allocationEpargne}
                onChange={(e) => setAllocationEpargne(e.target.value)}
              />
            </div>
          </div>

          {finaliser.isError && (
            <Alerte teinte="danger">
              <p>{estErreurApi(finaliser.error) ? finaliser.error.message : "La finalisation a échoué."}</p>
            </Alerte>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => void confirmer()} disabled={!packId || montantInvalide || finaliser.isPending}>
            {finaliser.isPending ? "Envoi en cours…" : "Finaliser le dossier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
