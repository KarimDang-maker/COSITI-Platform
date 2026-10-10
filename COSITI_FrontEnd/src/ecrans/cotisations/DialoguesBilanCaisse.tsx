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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alerte } from "@/components/cositi/alerte";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { useSaisirCaissePhysique, useValiderBilanCaisse } from "@/hooks/usePaiements";
import type { RapprochementCaisse } from "@/api/bilansCaisse";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateLongue, formaterEcart, formaterMontant } from "@/lib/format";

/** Montant physique saisi en texte : entier ou décimal positif (virgule ou point), sans séparateur de milliers. */
function analyserMontant(saisie: string): number | null {
  const nettoye = saisie.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(nettoye)) return null;
  return Number(nettoye);
}

/**
 * Saisie du montant physique compté (#30). Deux étapes : saisie, puis relecture en grands chiffres du
 * montant numérique et du montant compté avant l'envoi. L'écart est calculé et enregistré par le serveur.
 */
export function DialogueSaisieCaisse({
  date,
  montantNumerique,
  ressaisie,
  ouvert,
  onOuvertChange,
}: {
  date: string;
  montantNumerique: number;
  /** Nouvelle saisie après une anomalie signalée par le DAF. */
  ressaisie: boolean;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  const saisir = useSaisirCaissePhysique();
  const [montant, setMontant] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [etape, setEtape] = useState<"saisie" | "relecture">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);
  const valeur = analyserMontant(montant);

  function fermer(valeurOuvert: boolean) {
    if (!valeurOuvert) {
      setMontant("");
      setCommentaire("");
      setEtape("saisie");
      setErreur(null);
    }
    onOuvertChange(valeurOuvert);
  }

  async function confirmer() {
    if (valeur === null || saisir.isPending) return;
    setErreur(null);
    try {
      await saisir.mutateAsync({ date, montantPhysique: valeur, commentaire: commentaire.trim() || undefined });
      toast.success("Montant physique enregistré. Le bilan attend la validation du DAF.");
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La saisie n'a pas pu être enregistrée.");
      setEtape("saisie");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ressaisie ? "Ressaisir la caisse physique" : "Saisir la caisse physique"}</DialogTitle>
          <DialogDescription>Bilan du {formaterDateLongue(date)} — montant réellement compté en caisse.</DialogDescription>
        </DialogHeader>

        {etape === "saisie" ? (
          <div className="space-y-5">
            <ChampFormulaire
              id="caisse-montant"
              libelle="Montant compté (FCFA)"
              obligatoire
              erreur={montant !== "" && valeur === null ? "Saisissez un montant positif, sans séparateur (ex. 125000)." : undefined}
            >
              {(attributs) => <ChampMontant {...attributs} value={montant} onChange={(e) => setMontant(e.target.value)} />}
            </ChampFormulaire>
            <div className="space-y-1.5">
              <Label htmlFor="caisse-commentaire">
                Commentaire <span className="font-medium text-texte-doux">(facultatif)</span>
              </Label>
              <Textarea id="caisse-commentaire" maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p>Relisez les deux montants avant d'enregistrer :</p>
            <dl className="grid grid-cols-2 gap-4 rounded-lg bg-fond p-4">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Numérique (plateforme)</dt>
                <dd className="chiffre text-2xl font-bold">{formaterMontant(montantNumerique)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Compté en caisse</dt>
                <dd className="chiffre text-2xl font-bold">{formaterMontant(valeur)}</dd>
              </div>
            </dl>
            <p className="text-sm text-texte-doux-fort">L'écart est calculé par le serveur à l'enregistrement. Un seul bilan par date.</p>
          </div>
        )}

        {erreur && (
          <Alerte teinte="danger" titre="Saisie refusée">
            <p>{erreur}</p>
          </Alerte>
        )}

        <DialogFooter>
          {etape === "saisie" ? (
            <>
              <Button variant="outline" onClick={() => fermer(false)}>
                Annuler
              </Button>
              <Button disabled={valeur === null} onClick={() => setEtape("relecture")}>
                Relire avant d'enregistrer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtape("saisie")} disabled={saisir.isPending}>
                Retour
              </Button>
              <Button onClick={() => void confirmer()} disabled={saisir.isPending}>
                {saisir.isPending ? "Enregistrement…" : "Enregistrer le montant"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Validation du bilan par le DAF (#32) : total numérique, caisse et écart rappelés avant la décision,
 * commentaire facultatif, `version` transmise pour refuser une validation sur un bilan modifié entre-temps.
 */
export function DialogueValiderBilan({
  rapprochement,
  ouvert,
  onOuvertChange,
}: {
  rapprochement: RapprochementCaisse;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  const valider = useValiderBilanCaisse();
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  function fermer(valeur: boolean) {
    if (!valeur) {
      setCommentaire("");
      setErreur(null);
    }
    onOuvertChange(valeur);
  }

  async function confirmer() {
    if (valider.isPending) return;
    setErreur(null);
    try {
      await valider.mutateAsync({
        date: rapprochement.date,
        commentaire: commentaire.trim() || undefined,
        version: rapprochement.version,
      });
      toast.success("Bilan de caisse validé.");
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La validation a échoué.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider le bilan de caisse</DialogTitle>
          <DialogDescription>Bilan du {formaterDateLongue(rapprochement.date)} — décision définitive et journalisée.</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-4 rounded-lg bg-fond p-4">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Numérique</dt>
            <dd className="chiffre text-lg font-bold">{formaterMontant(rapprochement.montantNumerique)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Caisse</dt>
            <dd className="chiffre text-lg font-bold">{formaterMontant(rapprochement.montantPhysique)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Écart</dt>
            <dd className="chiffre text-lg font-bold">{formaterEcart(rapprochement.ecart)}</dd>
          </div>
        </dl>

        {rapprochement.numeriqueModifieDepuisSaisie && (
          <Alerte teinte="attention" titre="Des paiements ont changé depuis la saisie">
            <p>
              Montant numérique actuel : <span className="chiffre font-semibold">{formaterMontant(rapprochement.montantNumeriqueActuel)}</span>.
              Envisagez de signaler une anomalie pour faire recompter la caisse.
            </p>
          </Alerte>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="validation-commentaire">
            Commentaire <span className="font-medium text-texte-doux">(facultatif)</span>
          </Label>
          <Textarea id="validation-commentaire" maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
        </div>

        {erreur && (
          <Alerte teinte="danger" titre="Validation refusée">
            <p>{erreur}</p>
          </Alerte>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => fermer(false)} disabled={valider.isPending}>
            Annuler
          </Button>
          <Button onClick={() => void confirmer()} disabled={valider.isPending}>
            {valider.isPending ? "Validation…" : "Valider le bilan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
