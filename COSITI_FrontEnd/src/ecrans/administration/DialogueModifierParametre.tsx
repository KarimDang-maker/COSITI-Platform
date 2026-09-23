import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { useModifierParametre } from "@/hooks/useAdministration";
import type { ParametreAdmin } from "@/api/administration";
import { estErreurApi } from "@/api/erreurs";

interface DialogueModifierParametreProps {
  parametre: ParametreAdmin;
  onFermer: () => void;
}

/**
 * Modification d'une règle de paramétrage (UC-SA-06, J11).
 *
 * Le motif est **obligatoire** : une règle métier ne change jamais sans raison, et
 * l'audit conserve la valeur d'avant, celle d'après et cette raison. Le type
 * attendu est rappelé à l'écran, mais c'est le serveur qui refuse une valeur
 * incompatible — un `DELAI_RETARD_JOURS` à « trente » ferait échouer le calcul de
 * régularité en pleine nuit, loin de l'écran qui l'a saisi.
 */
export function DialogueModifierParametre({ parametre, onFermer }: DialogueModifierParametreProps) {
  const modifier = useModifierParametre();
  const [valeur, setValeur] = useState(parametre.valeur);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre() {
    setErreur(null);
    if (!motif.trim()) {
      setErreur("Le motif est obligatoire.");
      return;
    }
    try {
      await modifier.mutateAsync({ cle: parametre.cle, valeur: valeur.trim(), motif: motif.trim() });
      toast.success(`Règle ${parametre.cle} mise à jour.`);
      onFermer();
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La règle n'a pas pu être modifiée.");
    }
  }

  return (
    <Dialog open onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parametre.libelle}</DialogTitle>
          <DialogDescription>
            <span className="ref">{parametre.cle}</span> — type attendu : {parametre.typeValeur}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BadgeStatut domaine="validationParametre" code={parametre.statutValidation} />
            {parametre.statutValidation === "V" && (
              <span className="text-sm text-texte-doux">
                Cette règle n'est pas validée par la COSITI : les résultats qui en dépendent restent
                provisoires.
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="valeur-parametre">Valeur</Label>
            <Input
              id="valeur-parametre"
              value={valeur}
              onChange={(evenement) => setValeur(evenement.target.value)}
            />
            <p className="text-sm text-texte-doux">Valeur actuelle : {parametre.valeur}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motif-parametre">Motif (obligatoire)</Label>
            <Textarea
              id="motif-parametre"
              rows={3}
              value={motif}
              onChange={(evenement) => setMotif(evenement.target.value)}
              placeholder="Arbitrage du DAF du 23/09, réunion de direction…"
            />
          </div>

          {erreur && (
            <Alerte teinte="danger" titre="Modification refusée">
              <p>{erreur}</p>
            </Alerte>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button onClick={soumettre} disabled={modifier.isPending || !motif.trim()}>
            {modifier.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
