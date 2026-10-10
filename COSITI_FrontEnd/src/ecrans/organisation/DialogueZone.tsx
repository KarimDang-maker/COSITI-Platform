import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alerte } from "@/components/cositi/alerte";
import { useEnregistrerZone } from "@/hooks/useOrganisation";
import type { Zone } from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";

interface DialogueZoneProps {
  /** Zone à modifier ; `null` pour une création. */
  zone: Zone | null;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

const CHAMPS = [
  { cle: "code", libelle: "Code" },
  { cle: "libelle", libelle: "Libellé" },
  { cle: "ville", libelle: "Ville" },
  { cle: "region", libelle: "Région" },
] as const;

type Valeurs = Record<(typeof CHAMPS)[number]["cle"], string>;

const VIDE: Valeurs = { code: "", libelle: "", ville: "", region: "" };

/**
 * Création ou modification d'une zone (`POST` / `PUT /zones`, `ORGANISATION:GERER_ZONES`). Les quatre champs sont
 * obligatoires côté serveur ; un code déjà utilisé est refusé par le serveur et son message est affiché tel quel.
 */
export function DialogueZone({ zone, ouvert, onOuvertChange }: DialogueZoneProps) {
  const enregistrer = useEnregistrerZone();
  // Monté à l'ouverture (voir EcranOrganisation) : les valeurs partent de la zone éditée, ou du vide.
  const [valeurs, setValeurs] = useState<Valeurs>(() =>
    zone ? { code: zone.code, libelle: zone.libelle, ville: zone.ville ?? "", region: zone.region ?? "" } : VIDE,
  );
  const [erreur, setErreur] = useState<string | null>(null);

  const complet = CHAMPS.every(({ cle }) => valeurs[cle].trim() !== "");

  async function soumettre() {
    if (!complet || enregistrer.isPending) return;
    setErreur(null);
    const corps = {
      code: valeurs.code.trim(),
      libelle: valeurs.libelle.trim(),
      ville: valeurs.ville.trim(),
      region: valeurs.region.trim(),
      zoneParenteId: zone?.zoneParenteId ?? null,
    };
    try {
      await enregistrer.mutateAsync({ id: zone?.id, corps });
      toast.success(zone ? "Zone modifiée." : "Zone créée.");
      onOuvertChange(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La zone n'a pas pu être enregistrée.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{zone ? "Modifier la zone" : "Nouvelle zone"}</DialogTitle>
          <DialogDescription>Référentiel des zones de collecte.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CHAMPS.map(({ cle, libelle }) => (
            <div key={cle} className="space-y-1.5">
              <Label htmlFor={`zone-${cle}`}>{libelle}</Label>
              <Input
                id={`zone-${cle}`}
                value={valeurs[cle]}
                onChange={(e) => setValeurs((v) => ({ ...v, [cle]: e.target.value }))}
                // Le code identifie la zone : il ne se modifie pas (refus serveur ZONE_CODE_NON_MODIFIABLE).
                disabled={cle === "code" && !!zone}
                required
              />
            </div>
          ))}
        </div>
        {erreur && (
          <Alerte teinte="danger" titre="Enregistrement refusé">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOuvertChange(false)}>
            Annuler
          </Button>
          <Button disabled={!complet || enregistrer.isPending} onClick={() => void soumettre()}>
            {enregistrer.isPending ? "Enregistrement…" : zone ? "Enregistrer" : "Créer la zone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
