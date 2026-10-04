import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { useActiverAdherent, useVerificationActivation } from "@/hooks/useAdhesion";
import { ChecklistDocumentaire } from "@/ecrans/adhesion/ChecklistDocumentaire";
import type { ConditionActivation } from "@/api/adhesion";
import { estErreurApi } from "@/api/erreurs";

function LigneCondition({ condition }: { condition: ConditionActivation }) {
  const Icone = condition.satisfaite ? CheckCircle2 : condition.bloquant ? XCircle : CircleAlert;
  return (
    <li className="flex gap-3 py-2">
      <Icone
        aria-hidden="true"
        className={
          condition.satisfaite ? "size-5 shrink-0 text-succes-fort" : condition.bloquant ? "size-5 shrink-0 text-danger-fort" : "size-5 shrink-0 text-attention-fort"
        }
      />
      <div>
        <p className="font-semibold">
          {condition.libelle}{" "}
          <span className="sr-only">
            {condition.satisfaite ? "— satisfaite" : condition.bloquant ? "— non satisfaite, bloquante" : "— à vérifier, non bloquante"}
          </span>
        </p>
        {!condition.satisfaite && (
          <p className="text-sm text-texte-doux-fort">
            {condition.bloquant ? "Bloquant. " : "Non bloquant. "}
            {condition.detail}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Activation par le Gestionnaire (`ADHERENT:ACTIVER`) précédée de la vérification calculée par le serveur
 * (`GET /adherents/{id}/activation`) : identité, statut, doublons, documents, frais d'adhésion. L'écran affiche
 * chaque condition et son caractère bloquant tels que renvoyés ; le bouton suit `activable`, jamais un calcul local.
 * Un doublon potentiel, seul blocage restant, peut être levé par une confirmation explicite, tracée par le serveur.
 */
export function DialogueActivation({
  adherentId,
  designation,
  version,
  ouvert,
  onOuvertChange,
}: {
  adherentId: string;
  designation: string;
  version: number | null | undefined;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  const verification = useVerificationActivation(adherentId, ouvert);
  const activer = useActiverAdherent(adherentId);
  const [ignorerDoublons, setIgnorerDoublons] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const donnees = verification.data;
  // Contrat serveur : quand le seul blocage est un doublon potentiel, l'activation est acceptée avec
  // `ignorerDoublons=true` (sinon 409 ADHERENT_DOUBLON_POTENTIEL). L'écran ne fait que lire les conditions.
  const blocages = donnees?.conditions.filter((c) => c.bloquant && !c.satisfaite) ?? [];
  const seulDoublon = blocages.length === 1 && blocages[0]?.code === "DOUBLON";
  const activablePourEcran = !!donnees && (donnees.activable || (seulDoublon && ignorerDoublons));

  function fermer(valeur: boolean) {
    if (!valeur) {
      setIgnorerDoublons(false);
      setErreur(null);
    }
    onOuvertChange(valeur);
  }

  async function confirmer() {
    setErreur(null);
    try {
      const resultat = await activer.mutateAsync({ versionBase: version ?? undefined, ignorerDoublons });
      toast.success(
        resultat.dejaActive
          ? "Ce dossier était déjà activé : aucune modification."
          : "Adhérent activé et transmis au contrôle documentaire de la DGA.",
      );
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "L'activation a échoué.");
      void verification.refetch();
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Activer l'adhérent</DialogTitle>
          <DialogDescription>{designation}</DialogDescription>
        </DialogHeader>

        {verification.isLoading && (
          <div className="space-y-2" aria-busy="true" aria-label="Vérification du dossier en cours">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        )}
        {verification.isError && (
          <Alerte teinte="danger" titre="Vérification impossible">
            <p>{estErreurApi(verification.error) ? verification.error.message : "Le serveur n'a pas pu vérifier le dossier."}</p>
          </Alerte>
        )}
        {donnees && (
          <div className="space-y-4">
            {donnees.dejaActive ? (
              <Alerte teinte="info" titre="Dossier déjà activé">
                <p>Ce dossier a déjà été activé. Aucune action n'est nécessaire.</p>
              </Alerte>
            ) : (
              <>
                <p className="text-sm">Vérification effectuée par la plateforme avant activation :</p>
                <ul className="divide-y divide-bordure rounded-lg border border-bordure px-4" aria-label="Conditions d'activation">
                  {donnees.conditions.map((c) => (
                    <LigneCondition key={c.code} condition={c} />
                  ))}
                </ul>
                {donnees.avertissements.length > 0 && <AvertissementRegle avertissements={donnees.avertissements} />}
                <details className="rounded-lg border border-bordure px-4 py-2">
                  <summary className="cursor-pointer py-1 text-sm font-semibold">Pièces à traiter (checklist documentaire)</summary>
                  <div className="pt-3">
                    <ChecklistDocumentaire adherentId={adherentId} compacte />
                  </div>
                </details>
                {!donnees.activable && !seulDoublon && (
                  <Alerte teinte="danger" titre="Activation impossible pour le moment">
                    <p>Corrigez les conditions bloquantes ci-dessus, puis relancez la vérification.</p>
                  </Alerte>
                )}
                {seulDoublon && (
                  <div className="flex items-start gap-3 rounded-lg bg-attention-doux p-3">
                    <Checkbox
                      id="activation-doublons"
                      checked={ignorerDoublons}
                      onCheckedChange={(v) => setIgnorerDoublons(v === true)}
                    />
                    <Label htmlFor="activation-doublons" className="leading-snug">
                      J'ai vérifié les doublons potentiels : il s'agit bien d'une personne différente. Cette décision est
                      enregistrée dans l'historique.
                    </Label>
                  </div>
                )}
                <p className="text-sm text-texte-doux-fort">
                  Après activation, le compte passe « Actif » et le dossier est transmis automatiquement à la DGA pour le
                  contrôle des documents. Les deux états restent distincts.
                </p>
              </>
            )}
          </div>
        )}

        {erreur && (
          <Alerte teinte="danger" titre="Activation refusée">
            <p>{erreur}</p>
          </Alerte>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => fermer(false)}>
            {donnees?.dejaActive ? "Fermer" : "Annuler"}
          </Button>
          {donnees && !donnees.dejaActive && (
            <Button
              disabled={!activablePourEcran || activer.isPending}
              onClick={() => void confirmer()}
            >
              {activer.isPending ? "Activation…" : "Activer et transmettre à la DGA"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
