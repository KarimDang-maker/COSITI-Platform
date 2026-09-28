import { useEffect, useId, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Alerte } from "@/components/cositi/alerte";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { useCorrigerPaiement } from "@/hooks/usePaiements";
import { estErreurApi } from "@/api/erreurs";
import type { Paiement } from "@/api/paiements";
import { ChampDate } from "@/components/cositi/champ-date";
import { formaterDateSaisie } from "@/lib/format";

interface DialogueCorrigerPaiementProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  paiement: Paiement;
  nomAdherent: string;
}

/**
 * Correction d'un paiement. Motif obligatoire, la confirmation rappelle
 * montant, date et adhérent concernés avant l'envoi (mandat de session J4).
 */
export function DialogueCorrigerPaiement({ ouvert, onOuvertChange, paiement, nomAdherent }: DialogueCorrigerPaiementProps) {
  const [montant, setMontant] = useState(String(paiement.montant));
  const [datePaiement, setDatePaiement] = useState(formaterDateSaisie(paiement.datePaiement));
  const [referenceTransaction, setReferenceTransaction] = useState(paiement.referenceTransaction ?? "");
  const [motif, setMotif] = useState("");
  const idMotif = useId();
  const corriger = useCorrigerPaiement();
  const motifInvalide = motif.trim() === "";

  useEffect(() => {
    if (ouvert) {
      setMontant(String(paiement.montant));
      setDatePaiement(formaterDateSaisie(paiement.datePaiement));
      setReferenceTransaction(paiement.referenceTransaction ?? "");
      setMotif("");
    }
  }, [ouvert, paiement]);

  async function confirmer() {
    if (motifInvalide) return;
    try {
      await corriger.mutateAsync({
        id: paiement.id,
        corps: {
          montant: Number(montant),
          datePaiement,
          referenceTransaction: referenceTransaction || undefined,
          motif: motif.trim(),
        },
      });
      toast.success("Paiement corrigé.");
      onOuvertChange(false);
    } catch (e) {
      toast.error(estErreurApi(e) ? e.message : "La correction a échoué.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corriger le paiement {paiement.numeroRecu}</DialogTitle>
          <DialogDescription>
            Adhérent : {nomAdherent}. Le motif est obligatoire et l'opération est journalisée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ChampFormulaire id="correction-montant" libelle="Montant (FCFA)">
              {(attributs) => <ChampMontant {...attributs} value={montant} onChange={(e) => setMontant(e.target.value)} />}
            </ChampFormulaire>
            <ChampFormulaire id="correction-date" libelle="Date du paiement">
              {(attributs) => (
                <ChampDate {...attributs} value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} />
              )}
            </ChampFormulaire>
          </div>
          <ChampFormulaire id="correction-reference" libelle="Référence de transaction">
            {(attributs) => (
              <Input
                className="ref"
                {...attributs}
                value={referenceTransaction}
                onChange={(e) => setReferenceTransaction(e.target.value)}
              />
            )}
          </ChampFormulaire>
          <ChampFormulaire
            id={idMotif}
            libelle="Motif de la correction"
            erreur={motifInvalide ? "Le motif est obligatoire." : undefined}
          >
            {(attributs) => <Textarea {...attributs} value={motif} onChange={(e) => setMotif(e.target.value)} required />}
          </ChampFormulaire>

          {corriger.isError && (
            <Alerte teinte="danger">
              <p>{estErreurApi(corriger.error) ? corriger.error.message : "La correction a échoué."}</p>
            </Alerte>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => void confirmer()} disabled={motifInvalide || corriger.isPending}>
            {corriger.isPending ? "Envoi en cours…" : "Confirmer la correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
