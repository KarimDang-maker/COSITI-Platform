import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { useCotisationsARemettre, useDeclarerRemiseCaisse } from "@/hooks/useRemisesCaisse";
import { estErreurApi } from "@/api/erreurs";
import { definitionStatut } from "@/lib/statuts";
import { formaterDate, formaterMontant } from "@/lib/format";

interface DialogueRemiseCaisseProps {
  agentId: string;
  nomAgent: string;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

/**
 * Déclaration d'une remise de caisse (`POST /remises-caisse`, `PAIEMENT:CREER`) : le Gestionnaire coche les cotisations
 * que l'agent lui remet. La liste vient du serveur (`/remises-caisse/a-remettre`) : cotisations encaissées par cet
 * agent, pas encore remises, ni annulées, ni rejetées. Les espèces sont cochées par défaut ; le mobile money, déjà
 * versé sur un compte, ne l'est pas. La DAF réceptionne ensuite la remise et constate un éventuel écart.
 */
export function DialogueRemiseCaisse({ agentId, nomAgent, ouvert, onOuvertChange }: DialogueRemiseCaisseProps) {
  const aRemettre = useCotisationsARemettre(agentId, ouvert);
  const declarer = useDeclarerRemiseCaisse();
  // Choix explicites de l'utilisateur ; à défaut, les espèces sont cochées et le mobile money ne l'est pas.
  // Le dialogue est monté à l'ouverture (voir la fiche agent) : ces états repartent à zéro à chaque déclaration.
  const [choix, setChoix] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [erreur, setErreur] = useState<string | null>(null);

  const coches = useMemo(
    () =>
      new Set(
        (aRemettre.data ?? []).filter((p) => choix.get(p.id) ?? p.modePaiement === "ESPECES").map((p) => p.id),
      ),
    [aRemettre.data, choix],
  );

  const total = useMemo(
    () => (aRemettre.data ?? []).filter((p) => coches.has(p.id)).reduce((somme, p) => somme + p.montant, 0),
    [aRemettre.data, coches],
  );

  function basculer(id: string, coche: boolean) {
    setChoix((precedent) => new Map(precedent).set(id, coche));
  }

  async function confirmer() {
    if (coches.size === 0 || declarer.isPending) return;
    setErreur(null);
    try {
      await declarer.mutateAsync({ agentId, paiementIds: [...coches] });
      toast.success(`Remise de ${formaterMontant(total)} déclarée : la DAF est notifiée.`);
      onOuvertChange(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La remise n'a pas pu être déclarée.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Déclarer une remise de caisse</DialogTitle>
          <DialogDescription>Cotisations collectées par {nomAgent} et pas encore remises.</DialogDescription>
        </DialogHeader>

        {aRemettre.isLoading && <Skeleton className="h-32 w-full" />}
        {aRemettre.isError && (
          <Alerte teinte="danger" titre="Liste indisponible">
            <p>{estErreurApi(aRemettre.error) ? aRemettre.error.message : "Les cotisations n'ont pas pu être chargées."}</p>
          </Alerte>
        )}
        {aRemettre.data && aRemettre.data.length === 0 && (
          <EtatVide titre="Rien à remettre" description="Toutes les cotisations de cet agent ont déjà été remises." icone={Wallet} />
        )}
        {aRemettre.data && aRemettre.data.length > 0 && (
          <ul className="max-h-80 space-y-1 overflow-y-auto" aria-label="Cotisations à remettre">
            {aRemettre.data.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-md border border-bordure px-3 py-2 text-sm">
                <Checkbox
                  id={`remise-${p.id}`}
                  checked={coches.has(p.id)}
                  onCheckedChange={(valeur) => basculer(p.id, valeur === true)}
                  aria-label={`Inclure ${p.numeroRecu}`}
                />
                <label htmlFor={`remise-${p.id}`} className="flex flex-1 flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="ref">{p.numeroRecu}</span> — {formaterDate(p.datePaiement)} —{" "}
                    {definitionStatut("modePaiement", p.modePaiement).libelle}
                  </span>
                  <span className="flex items-center gap-2">
                    <BadgeStatut domaine="paiement" code={p.statut} />
                    <span className="chiffre font-semibold">{formaterMontant(p.montant)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {aRemettre.data && aRemettre.data.length > 0 && (
          <p className="text-sm">
            Montant déclaré : <strong className="chiffre">{formaterMontant(total)}</strong> ({coches.size} cotisation
            {coches.size > 1 ? "s" : ""})
          </p>
        )}
        {erreur && (
          <Alerte teinte="danger" titre="Déclaration refusée">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOuvertChange(false)}>
            Annuler
          </Button>
          <Button disabled={coches.size === 0 || declarer.isPending} onClick={() => void confirmer()}>
            {declarer.isPending ? "Déclaration…" : "Déclarer la remise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
