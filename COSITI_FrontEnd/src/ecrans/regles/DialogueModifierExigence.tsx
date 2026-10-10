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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alerte } from "@/components/cositi/alerte";
import { ChampDate } from "@/components/cositi/champ-date";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { useModifierExigence } from "@/hooks/useRegles";
import type { ExigenceDocumentaire, NiveauExigence } from "@/api/adhesion";
import { estConflitVersion } from "@/api/workflow";
import { estErreurApi } from "@/api/erreurs";
import { STATUTS } from "@/lib/statuts";

const NIVEAUX = Object.keys(STATUTS.niveauExigence) as NiveauExigence[];

/**
 * Modification d'une exigence documentaire (`PUT /regles/exigences/{id}`, `REGLE:VALIDER`) : niveau, condition,
 * contrôle DGA, période d'effet, activation. La modification **ne confirme pas** la règle ; elle est tracée
 * `EXIGENCE_DOCUMENTAIRE_MODIFICATION` avec son motif. Version transmise : un conflit est signalé.
 */
export function DialogueModifierExigence({ exigence, onFermer }: { exigence: ExigenceDocumentaire; onFermer: () => void }) {
  const modifier = useModifierExigence();
  const [niveau, setNiveau] = useState<NiveauExigence>(exigence.niveau);
  const [condition, setCondition] = useState(exigence.conditionApplication ?? "");
  const [verificationDga, setVerificationDga] = useState(exigence.verificationDga);
  const [actif, setActif] = useState(exigence.actif);
  const [effectifDu, setEffectifDu] = useState(exigence.effectifDu ?? "");
  const [effectifJusquau, setEffectifJusquau] = useState(exigence.effectifJusquau ?? "");
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    if (!motif.trim()) return;
    setErreur(null);
    try {
      await modifier.mutateAsync({
        id: exigence.id,
        corps: {
          niveau,
          conditionApplication: condition.trim() || undefined,
          verificationDga,
          actif,
          effectifDu: effectifDu || undefined,
          effectifJusquau: effectifJusquau || undefined,
          motif: motif.trim(),
          version: exigence.version,
        },
      });
      toast.success("Exigence modifiée.");
      onFermer();
    } catch (e) {
      setErreur(
        estConflitVersion(e)
          ? "Cette exigence a été modifiée entre-temps. Fermez et rouvrez-la pour partir de sa version à jour."
          : estErreurApi(e)
            ? e.message
            : "La modification a échoué.",
      );
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier : {exigence.libelle}</DialogTitle>
          <DialogDescription>
            {exigence.rubrique} — <span className="ref">{exigence.code}</span>. La modification ne confirme pas la règle.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exigence-niveau">Niveau</Label>
            <Select value={niveau} onValueChange={(v) => setNiveau(v as NiveauExigence)}>
              <SelectTrigger id="exigence-niveau">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEAUX.map((n) => (
                  <SelectItem key={n} value={n}>
                    {STATUTS.niveauExigence[n].libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ChampFormulaire id="exigence-condition" libelle="Condition d'application" facultatif aide="Ex. : « si l'adhérent déclare une activité salariée antérieure ».">
            {(attributs) => <Textarea {...attributs} maxLength={1000} value={condition} onChange={(e) => setCondition(e.target.value)} />}
          </ChampFormulaire>
          <div className="flex items-center gap-2">
            <Checkbox id="exigence-dga" checked={verificationDga} onCheckedChange={(v) => setVerificationDga(v === true)} />
            <Label htmlFor="exigence-dga">Contrôlée par la DGA</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="exigence-actif" checked={actif} onCheckedChange={(v) => setActif(v === true)} />
            <Label htmlFor="exigence-actif">Exigence active</Label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ChampFormulaire id="exigence-du" libelle="En vigueur du" facultatif>
              {(attributs) => <ChampDate {...attributs} value={effectifDu} onChange={(e) => setEffectifDu(e.target.value)} />}
            </ChampFormulaire>
            <ChampFormulaire id="exigence-au" libelle="Jusqu'au" facultatif>
              {(attributs) => <ChampDate {...attributs} value={effectifJusquau} onChange={(e) => setEffectifJusquau(e.target.value)} />}
            </ChampFormulaire>
          </div>
          <ChampFormulaire id="exigence-motif" libelle="Motif de la modification" obligatoire>
            {(attributs) => <Textarea {...attributs} maxLength={1000} value={motif} onChange={(e) => setMotif(e.target.value)} />}
          </ChampFormulaire>
        </div>
        {erreur && (
          <Alerte teinte="danger" titre="Modification refusée">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button disabled={!motif.trim() || modifier.isPending} onClick={() => void enregistrer()}>
            {modifier.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
