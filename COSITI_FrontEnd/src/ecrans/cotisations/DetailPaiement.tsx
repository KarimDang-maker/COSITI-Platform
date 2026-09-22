import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth, usePermission } from "@/auth/ContexteAuth";
import { usePaiement, useValiderPaiement, useAnnulerPaiement } from "@/hooks/usePaiements";
import { useAdherent } from "@/hooks/useAdherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterMontant, formaterNomComplet, formaterTelephone } from "@/lib/format";
import { DialogueCorrigerPaiement } from "@/ecrans/cotisations/DialogueCorrigerPaiement";

function LigneChamp({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">{libelle}</dt>
      <dd className="text-texte">{valeur}</dd>
    </div>
  );
}

export function DetailPaiement() {
  const { id } = useParams<{ id: string }>();
  const { utilisateur } = useAuth();
  const peutValider = usePermission("PAIEMENT:VALIDER");
  const peutCorriger = usePermission("PAIEMENT:CORRIGER");
  const peutAnnuler = usePermission("PAIEMENT:ANNULER");

  const { data: paiement, isLoading, isError, error } = usePaiement(id);
  const { data: adherent } = useAdherent(paiement?.adherentId);
  const valider = useValiderPaiement();
  const annuler = useAnnulerPaiement();

  const [dialogueCorrectionOuvert, setDialogueCorrectionOuvert] = useState(false);
  const [dialogueAnnulationOuvert, setDialogueAnnulationOuvert] = useState(false);

  if (isLoading) {
    return (
      <CoquilleApplication titre="Détail du paiement">
        <Skeleton className="h-64 w-full" />
      </CoquilleApplication>
    );
  }

  if (isError || !paiement) {
    return (
      <CoquilleApplication titre="Détail du paiement">
        <Alerte teinte="danger" titre="Impossible de charger ce paiement">
          <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  const nomAdherent = adherent ? formaterNomComplet(adherent.nom, adherent.prenoms) : "—";
  // `creePar` est désormais exposé par `PaiementDto` (backend). L'API reste l'autorité finale : ce
  // masquage n'est qu'un confort, elle refuse de toute façon l'auto-validation (403
  // `PAIEMENT_AUTO_VALIDATION_INTERDITE`) si l'action est malgré tout tentée.
  const estCreateur = !!paiement.creePar && !!utilisateur && paiement.creePar === utilisateur.identifiant;

  const rappelValeurs = (
    <p>
      Paiement <strong>{formaterMontant(paiement.montant)}</strong> du <strong>{formaterDate(paiement.datePaiement)}</strong> pour{" "}
      <strong>{nomAdherent}</strong>.
    </p>
  );

  return (
    <CoquilleApplication titre="Détail du paiement">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1>Paiement {paiement.numeroRecu}</h1>
            <p className="text-texte-doux">{nomAdherent}</p>
          </div>
          <BadgeStatut domaine="paiement" code={paiement.statut} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LigneChamp libelle="Montant" valeur={formaterMontant(paiement.montant)} />
              <LigneChamp libelle="Date du paiement" valeur={formaterDate(paiement.datePaiement)} />
              <div>
                <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Mode de paiement</dt>
                <dd>
                  <BadgeStatut domaine="modePaiement" code={paiement.modePaiement} />
                </dd>
              </div>
              <LigneChamp libelle="Référence" valeur={paiement.referenceTransaction ?? "—"} />
              <LigneChamp libelle="Adhérent" valeur={nomAdherent} />
              <LigneChamp libelle="Téléphone" valeur={adherent ? formaterTelephone(adherent.telephonePrincipal) : "—"} />
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          {peutValider &&
            (estCreateur ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button disabled>Valider</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Vous ne pouvez pas valider un paiement que vous avez vous-même saisi.</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                disabled={valider.isPending}
                onClick={() => {
                  valider.mutate(paiement.id, {
                    onSuccess: () => toast.success("Paiement validé."),
                    onError: (e) => toast.error(estErreurApi(e) ? e.message : "La validation a échoué."),
                  });
                }}
              >
                {valider.isPending ? "Validation en cours…" : "Valider"}
              </Button>
            ))}

          {peutCorriger && (
            <Button variant="outline" onClick={() => setDialogueCorrectionOuvert(true)}>
              Corriger
            </Button>
          )}

          {peutAnnuler && (
            <Button variant="destructive" onClick={() => setDialogueAnnulationOuvert(true)}>
              Annuler
            </Button>
          )}
        </div>
      </div>

      <DialogueCorrigerPaiement
        ouvert={dialogueCorrectionOuvert}
        onOuvertChange={setDialogueCorrectionOuvert}
        paiement={paiement}
        nomAdherent={nomAdherent}
      />

      <DialogueConfirmation
        ouvert={dialogueAnnulationOuvert}
        onOuvertChange={setDialogueAnnulationOuvert}
        titre="Annuler ce paiement"
        description={rappelValeurs}
        motifRequis
        libelleMotif="Motif de l'annulation"
        libelleConfirmation="Annuler le paiement"
        varianteDestructive
        enCours={annuler.isPending}
        onConfirmer={async (motif) => {
          try {
            await annuler.mutateAsync({ id: paiement.id, motif: motif! });
            toast.success("Paiement annulé.");
            setDialogueAnnulationOuvert(false);
          } catch (e) {
            toast.error(estErreurApi(e) ? e.message : "L'annulation a échoué.");
          }
        }}
      />
    </CoquilleApplication>
  );
}
