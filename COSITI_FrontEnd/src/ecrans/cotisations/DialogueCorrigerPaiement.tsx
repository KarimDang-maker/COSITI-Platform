import { useId, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alerte } from "@/components/cositi/alerte";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { ChampDate } from "@/components/cositi/champ-date";
import { useCorrigerPaiement } from "@/hooks/usePaiements";
import { estErreurApi } from "@/api/erreurs";
import { estModeMobileMoney, type CorpsCorrectionPaiement, type Paiement } from "@/api/paiements";
import { formaterDate, formaterDateSaisie, formaterMontant } from "@/lib/format";

interface DialogueCorrigerPaiementProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  paiement: Paiement;
  nomAdherent: string;
}

/**
 * Correction d'un paiement (#19). Deux étapes : saisie, puis revue **avant / après** de chaque champ
 * modifié avant l'envoi. Motif obligatoire, sauf pour un brouillon modifié par son auteur (règle serveur,
 * rappelée ici pour ne pas bloquer une saisie que l'API accepte). L'opération est journalisée.
 */
export function DialogueCorrigerPaiement({ ouvert, onOuvertChange, paiement, nomAdherent }: DialogueCorrigerPaiementProps) {
  const [montant, setMontant] = useState(String(paiement.montant));
  const [datePaiement, setDatePaiement] = useState(formaterDateSaisie(paiement.datePaiement));
  const [referenceTransaction, setReferenceTransaction] = useState(paiement.referenceTransaction ?? "");
  const [motif, setMotif] = useState("");
  // V22 : une cotisation répartie se corrige avec sa répartition (`COTISATION_REPARTITION_REQUISE` sinon).
  const repartie = paiement.montantSecuriteSociale !== null && paiement.montantSecuriteSociale !== undefined;
  const [montantSs, setMontantSs] = useState(String(paiement.montantSecuriteSociale ?? ""));
  const [montantEp, setMontantEp] = useState(String(paiement.montantEpargne ?? ""));
  const [etape, setEtape] = useState<"saisie" | "revue">("saisie");
  const idMotif = useId();
  const corriger = useCorrigerPaiement();

  const brouillon = paiement.statut === "BROUILLON";
  const motifInvalide = !brouillon && motif.trim() === "";
  const montantInvalide = !(Number(montant) > 0);
  const referenceManquante = estModeMobileMoney(paiement.modePaiement) && referenceTransaction.trim() === "";
  const repartitionModifiee =
    repartie && (Number(montantSs) !== paiement.montantSecuriteSociale || Number(montantEp) !== (paiement.montantEpargne ?? 0));
  // Aide à la saisie : la somme est contrôlée par le serveur (minimums compris), qui reste l'autorité.
  const repartitionIncoherente =
    repartie && (Number(montant) !== paiement.montant || repartitionModifiee) && Number(montantSs) + Number(montantEp) !== Number(montant);


  const changements = [
    Number(montant) !== paiement.montant && {
      champ: "Montant",
      avant: formaterMontant(paiement.montant),
      apres: formaterMontant(Number(montant)),
    },
    datePaiement !== formaterDateSaisie(paiement.datePaiement) && {
      champ: "Date du paiement",
      avant: formaterDate(paiement.datePaiement),
      apres: formaterDate(datePaiement),
    },
    repartitionModifiee && {
      champ: "Sécurité Sociale / Épargne",
      avant: `${formaterMontant(paiement.montantSecuriteSociale)} / ${formaterMontant(paiement.montantEpargne ?? 0)}`,
      apres: `${formaterMontant(Number(montantSs))} / ${formaterMontant(Number(montantEp))}`,
    },
    referenceTransaction.trim() !== (paiement.referenceTransaction ?? "") && {
      champ: "Référence de transaction",
      avant: paiement.referenceTransaction ?? "—",
      apres: referenceTransaction.trim() || "—",
    },
  ].filter((c): c is { champ: string; avant: string; apres: string } => !!c);

  async function confirmer() {
    if (motifInvalide || corriger.isPending) return;
    // Seuls les champs modifiés sont envoyés : le serveur n'applique que les valeurs non nulles.
    const corps: CorpsCorrectionPaiement = {
      montant: Number(montant) !== paiement.montant ? Number(montant) : undefined,
      // La répartition accompagne toute correction du montant d'une cotisation répartie.
      montantSecuriteSociale: repartie && (repartitionModifiee || Number(montant) !== paiement.montant) ? Number(montantSs) : undefined,
      montantEpargne: repartie && (repartitionModifiee || Number(montant) !== paiement.montant) ? Number(montantEp) : undefined,
      datePaiement: datePaiement !== formaterDateSaisie(paiement.datePaiement) ? datePaiement : undefined,
      referenceTransaction:
        referenceTransaction.trim() !== (paiement.referenceTransaction ?? "") ? referenceTransaction.trim() : undefined,
      motif: motif.trim() || undefined,
    };
    try {
      await corriger.mutateAsync({ id: paiement.id, corps });
      toast.success(brouillon ? "Brouillon modifié." : "Paiement corrigé.");
      onOuvertChange(false);
    } catch (e) {
      setEtape("saisie");
      toast.error(estErreurApi(e) ? e.message : "La correction a échoué.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {brouillon ? "Modifier le brouillon" : "Corriger le paiement"} {paiement.numeroRecu}
          </DialogTitle>
          <DialogDescription>
            Adhérent : {nomAdherent}. {brouillon ? "Motif facultatif." : "Le motif est obligatoire."} L'opération est journalisée.
          </DialogDescription>
        </DialogHeader>

        {etape === "saisie" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChampFormulaire
                id="correction-montant"
                libelle="Montant (FCFA)"
                erreur={montantInvalide ? "Le montant doit être strictement positif." : undefined}
              >
                {(attributs) => <ChampMontant {...attributs} value={montant} onChange={(e) => setMontant(e.target.value)} />}
              </ChampFormulaire>
              <ChampFormulaire id="correction-date" libelle="Date du paiement">
                {(attributs) => <ChampDate {...attributs} value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} />}
              </ChampFormulaire>
            </div>
            {repartie && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ChampFormulaire id="correction-ss" libelle="Sécurité Sociale (FCFA)">
                  {(attributs) => <ChampMontant {...attributs} value={montantSs} onChange={(e) => setMontantSs(e.target.value)} />}
                </ChampFormulaire>
                <ChampFormulaire
                  id="correction-epargne"
                  libelle="Épargne (FCFA)"
                  erreur={repartitionIncoherente ? "La répartition doit correspondre au montant total de la cotisation." : undefined}
                >
                  {(attributs) => <ChampMontant {...attributs} value={montantEp} onChange={(e) => setMontantEp(e.target.value)} />}
                </ChampFormulaire>
              </div>
            )}
            <ChampFormulaire
              id="correction-reference"
              libelle="Référence de transaction"
              erreur={referenceManquante ? "La référence est obligatoire pour un paiement Orange Money ou MTN MoMo." : undefined}
            >
              {(attributs) => (
                <Input className="ref" {...attributs} value={referenceTransaction} onChange={(e) => setReferenceTransaction(e.target.value)} />
              )}
            </ChampFormulaire>
            <ChampFormulaire
              id={idMotif}
              libelle="Motif de la correction"
              obligatoire={!brouillon}
              facultatif={brouillon}
              erreur={motifInvalide && motif !== "" ? "Le motif est obligatoire." : undefined}
            >
              {(attributs) => <Textarea {...attributs} value={motif} onChange={(e) => setMotif(e.target.value)} />}
            </ChampFormulaire>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">Vérifiez les modifications avant de confirmer :</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Champ</TableHead>
                  <TableHead>Avant</TableHead>
                  <TableHead>
                    <span className="sr-only">devient</span>
                  </TableHead>
                  <TableHead>Après</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changements.map((c) => (
                  <TableRow key={c.champ}>
                    <TableCell className="font-semibold">{c.champ}</TableCell>
                    <TableCell className="chiffre">{c.avant}</TableCell>
                    <TableCell>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </TableCell>
                    <TableCell className="chiffre font-bold">{c.apres}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {motif.trim() && (
              <p className="text-sm">
                <span className="font-semibold">Motif :</span> {motif.trim()}
              </p>
            )}
          </div>
        )}

        {corriger.isError && (
          <Alerte teinte="danger">
            <p>{estErreurApi(corriger.error) ? corriger.error.message : "La correction a échoué."}</p>
          </Alerte>
        )}

        <DialogFooter>
          {etape === "saisie" ? (
            <>
              <Button variant="outline" onClick={() => onOuvertChange(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => setEtape("revue")}
                disabled={motifInvalide || montantInvalide || referenceManquante || repartitionIncoherente || changements.length === 0}
              >
                {changements.length === 0 ? "Aucune modification" : "Vérifier les modifications"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtape("saisie")} disabled={corriger.isPending}>
                Retour
              </Button>
              <Button onClick={() => void confirmer()} disabled={corriger.isPending}>
                {corriger.isPending ? "Envoi en cours…" : "Confirmer la correction"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
