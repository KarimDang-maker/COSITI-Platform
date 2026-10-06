import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alerte } from "@/components/cositi/alerte";
import { ChampDate } from "@/components/cositi/champ-date";
import { usePacks, useChangerPackAdherent } from "@/hooks/useAdherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterMontant } from "@/lib/format";

interface DialogueChangerPackProps {
  adherentId: string;
  packActuelId: string;
  packActuelLibelle: string | null;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Changement de pack d'un adhérent qui en a déjà un (`POST /adherents/{id}/pack`, `ADHERENT:MODIFIER`). Le premier pack
 * se choisit à la première cotisation (V22). L'adhésion en cours est clôturée la veille de la date d'effet ; les droits
 * déjà acquis ne sont pas recalculés — le serveur le trace, l'écran le dit avant la confirmation.
 */
export function DialogueChangerPack({ adherentId, packActuelId, packActuelLibelle, ouvert, onOuvertChange }: DialogueChangerPackProps) {
  const packs = usePacks();
  const changer = useChangerPackAdherent(adherentId);
  const [packId, setPackId] = useState<string>("");
  const [effetLe, setEffetLe] = useState<string>(aujourdhui());
  const [erreur, setErreur] = useState<string | null>(null);

  const options = (packs.data ?? []).filter((p) => p.actif && p.id !== packActuelId);

  function fermer(valeur: boolean) {
    if (!valeur) {
      setPackId("");
      setEffetLe(aujourdhui());
      setErreur(null);
    }
    onOuvertChange(valeur);
  }

  async function confirmer() {
    if (!packId || !effetLe || changer.isPending) return;
    setErreur(null);
    try {
      await changer.mutateAsync({ packId, effetLe });
      toast.success("Pack changé.");
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "Le pack n'a pas pu être changé.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer de pack</DialogTitle>
          <DialogDescription>Pack actuel : {packActuelLibelle ?? "—"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {packs.data && options.length === 0 && (
            <Alerte teinte="info" titre="Aucun autre pack disponible">
              <p>Le pack actuel est le seul pack actif du référentiel.</p>
            </Alerte>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="nouveau-pack">Nouveau pack</Label>
            <Select value={packId} onValueChange={setPackId}>
              <SelectTrigger id="nouveau-pack">
                <SelectValue placeholder="Choisir un pack" />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.libelle} — {formaterMontant(p.montantJournalier)} / jour
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="effet-pack">Date d'effet</Label>
            <ChampDate id="effet-pack" value={effetLe} onChange={(e) => setEffetLe(e.target.value)} />
          </div>
          <Alerte teinte="attention" titre="Droits déjà acquis">
            <p>Les périodes de droits déjà ouvertes ne sont pas recalculées ; le changement est journalisé.</p>
          </Alerte>
        </div>
        {erreur && (
          <Alerte teinte="danger" titre="Changement refusé">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => fermer(false)}>
            Annuler
          </Button>
          <Button disabled={!packId || !effetLe || changer.isPending} onClick={() => void confirmer()}>
            {changer.isPending ? "Envoi en cours…" : "Changer de pack"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
