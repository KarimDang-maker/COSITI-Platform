import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { useRecuPaiement } from "@/hooks/usePaiements";
import { estErreurApi } from "@/api/erreurs";
import { definitionStatut } from "@/lib/statuts";
import { formaterDate, formaterDateHeure, formaterMontant } from "@/lib/format";

interface DialogueRecuProps {
  paiementId: string;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-bordure py-1.5 last:border-0">
      <dt className="text-texte-doux-fort">{libelle}</dt>
      <dd className="text-right font-medium">{valeur}</dd>
    </div>
  );
}

/**
 * Reçu d'une cotisation (`GET /paiements/{id}/recu`), tel que le serveur l'émet : identité de l'adhérent, montant,
 * répartition Sécurité sociale / Épargne, mode et référence. Une cotisation non encore validée par le DAF est
 * imprimée avec sa mention de statut : le reçu atteste la saisie, pas la validation.
 */
export function DialogueRecu({ paiementId, ouvert, onOuvertChange }: DialogueRecuProps) {
  const recu = useRecuPaiement(paiementId, ouvert);
  const r = recu.data;
  const nonValide = r && r.statut !== "VALIDE" && r.statut !== "RAPPROCHE";

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent className="zone-impression">
        <DialogHeader>
          <DialogTitle>Reçu de cotisation {r?.numeroRecu ?? ""}</DialogTitle>
          <DialogDescription>COSITI COOP-CA — reçu édité par la plateforme</DialogDescription>
        </DialogHeader>

        {recu.isLoading && <Skeleton className="h-48 w-full" />}
        {recu.isError && (
          <Alerte teinte="danger" titre="Reçu indisponible">
            <p>{estErreurApi(recu.error) ? recu.error.message : "Le reçu n'a pas pu être chargé."}</p>
          </Alerte>
        )}
        {r && (
          <div className="space-y-3">
            {nonValide && (
              <Alerte teinte="attention" titre="Cotisation non encore validée">
                <p>Ce reçu atteste l'enregistrement ; la cotisation est en attente de contrôle par le DAF.</p>
              </Alerte>
            )}
            <dl className="text-sm" aria-label="Contenu du reçu">
              <Ligne libelle="Numéro de reçu" valeur={<span className="ref">{r.numeroRecu}</span>} />
              <Ligne libelle="Adhérent" valeur={r.adherentNom ?? "—"} />
              <Ligne libelle="Matricule" valeur={<span className="ref">{r.adherentMatricule ?? "—"}</span>} />
              <Ligne libelle="Date de paiement" valeur={formaterDate(r.datePaiement)} />
              <Ligne libelle="Montant" valeur={<span className="chiffre">{formaterMontant(r.montant)}</span>} />
              {r.montantSecuriteSociale !== null && (
                <Ligne libelle="dont Sécurité sociale" valeur={<span className="chiffre">{formaterMontant(r.montantSecuriteSociale)}</span>} />
              )}
              {r.montantEpargne !== null && (
                <Ligne libelle="dont Épargne" valeur={<span className="chiffre">{formaterMontant(r.montantEpargne)}</span>} />
              )}
              <Ligne libelle="Mode" valeur={definitionStatut("modePaiement", r.modePaiement).libelle} />
              {r.referenceTransaction && <Ligne libelle="Référence de transaction" valeur={<span className="ref">{r.referenceTransaction}</span>} />}
              <Ligne libelle="Statut" valeur={<BadgeStatut domaine="paiement" code={r.statut} />} />
              <Ligne libelle="Enregistré par" valeur={r.enregistrePar ?? "—"} />
              <Ligne libelle="Enregistré le" valeur={formaterDateHeure(r.enregistreLe)} />
              <Ligne libelle="Édité le" valeur={formaterDateHeure(r.editeLe)} />
            </dl>
          </div>
        )}

        <DialogFooter className="masquer-impression">
          <Button variant="outline" onClick={() => onOuvertChange(false)}>
            Fermer
          </Button>
          <Button onClick={() => window.print()} disabled={!r}>
            <Printer className="size-4" aria-hidden="true" />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
