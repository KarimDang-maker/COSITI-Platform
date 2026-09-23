import { useId, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DialogueConfirmationProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  titre: string;
  /** Rappelle toujours les valeurs concernées (montant, date, adhérent…) — `docs/02_DESIGN_SYSTEM.md §9.1`. */
  description: ReactNode;
  libelleConfirmation?: string;
  varianteDestructive?: boolean;
  /** Annulation ou correction : le champ motif est dans le dialogue, jamais après coup. */
  motifRequis?: boolean;
  libelleMotif?: string;
  enCours?: boolean;
  onConfirmer: (motif: string | undefined) => void | Promise<void>;
}

/**
 * Confirmation d'action sensible. Le motif, quand il est requis, bloque la
 * confirmation tant qu'il est vide — jamais une saisie demandée après coup.
 */
export function DialogueConfirmation({
  ouvert,
  onOuvertChange,
  titre,
  description,
  libelleConfirmation = "Confirmer",
  varianteDestructive = false,
  motifRequis = false,
  libelleMotif = "Motif",
  enCours = false,
  onConfirmer,
}: DialogueConfirmationProps) {
  const [motif, setMotif] = useState("");
  const idMotif = useId();
  const motifInvalide = motifRequis && motif.trim() === "";

  async function confirmer() {
    if (motifInvalide || enCours) return;
    await onConfirmer(motifRequis ? motif.trim() : undefined);
    setMotif("");
  }

  return (
    <AlertDialog
      open={ouvert}
      onOpenChange={(valeur) => {
        if (!valeur) setMotif("");
        onOuvertChange(valeur);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titre}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {motifRequis && (
          <div className="space-y-2 text-left">
            <Label htmlFor={idMotif}>{libelleMotif}</Label>
            <Textarea
              id={idMotif}
              value={motif}
              onChange={(evenement) => setMotif(evenement.target.value)}
              aria-describedby={motifInvalide ? `${idMotif}-erreur` : undefined}
              aria-invalid={motifInvalide}
              required
            />
            {motifInvalide && (
              <p id={`${idMotif}-erreur`} className="text-sm text-danger-fort">
                Le motif est obligatoire.
              </p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enCours}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant={varianteDestructive ? "destructive" : "default"}
            disabled={motifInvalide || enCours}
            onClick={(evenement) => {
              evenement.preventDefault();
              void confirmer();
            }}
          >
            {enCours ? "Envoi en cours…" : libelleConfirmation}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
