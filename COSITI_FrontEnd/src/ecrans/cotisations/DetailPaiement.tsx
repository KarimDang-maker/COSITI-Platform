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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth, usePermission } from "@/auth/ContexteAuth";
import {
  usePaiement,
  useValiderPaiement,
  useAnnulerPaiement,
  useSignalerIncoherencePaiement,
  useConfirmerParChefPaiement,
  useAffectationsPaiement,
  useRecuPaiement,
} from "@/hooks/usePaiements";
import { useAdherent } from "@/hooks/useAdherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure, formaterDate, formaterMontant, formaterNomComplet, formaterTelephone } from "@/lib/format";
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
  const peutSignalerIncoherence = usePermission("PAIEMENT:SIGNALER_INCOHERENCE");
  // UC-CHEF-10 : confirmation hiérarchique du Chef, distincte de « Valider »
  // (permission, rôle et endpoint différents — voir `api/paiements.ts`).
  const peutConfirmerChef = usePermission("PAIEMENT:CONFIRMER_CHEF");

  const { data: paiement, isLoading, isError, error } = usePaiement(id);
  const { data: adherent } = useAdherent(paiement?.adherentId);
  const paiementValide = paiement?.statut === "VALIDE" || paiement?.statut === "RAPPROCHE";
  const { data: affectations } = useAffectationsPaiement(paiementValide ? id : undefined);
  const valider = useValiderPaiement();
  const annuler = useAnnulerPaiement();
  const signaler = useSignalerIncoherencePaiement();
  const confirmerChef = useConfirmerParChefPaiement();

  const [dialogueCorrectionOuvert, setDialogueCorrectionOuvert] = useState(false);
  const [dialogueAnnulationOuvert, setDialogueAnnulationOuvert] = useState(false);
  const [dialogueIncoherenceOuvert, setDialogueIncoherenceOuvert] = useState(false);
  const [recuOuvert, setRecuOuvert] = useState(false);
  const { data: recu } = useRecuPaiement(id, recuOuvert);

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

        {paiement.statut === "INCOHERENCE" && paiement.motifIncoherence && (
          <Alerte teinte="danger" titre="Incohérence signalée par le DAF">
            <p>{paiement.motifIncoherence}</p>
          </Alerte>
        )}

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
              <LigneChamp
                libelle="Confirmation hiérarchique (Chef)"
                valeur={paiement.confirmeLe ? `Confirmée le ${formaterDateHeure(paiement.confirmeLe)}` : "Non confirmée"}
              />
            </dl>
          </CardContent>
        </Card>

        {paiementValide && affectations && affectations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Répartition Sécurité Sociale / Épargne</CardTitle>
            </CardHeader>
            <CardContent>
              {/* §8 : « afficher clairement cette répartition lors de l'enregistrement et du contrôle
                  d'un paiement ». */}
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {affectations.map((a) => (
                  <LigneChamp
                    key={a.id}
                    libelle={a.composanteCode === "EPARGNE" ? "Épargne" : "Sécurité Sociale"}
                    valeur={formaterMontant(a.montant)}
                  />
                ))}
              </dl>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setRecuOuvert(true)}>
            Voir le reçu
          </Button>

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

          {peutSignalerIncoherence && (
            <Button variant="destructive" onClick={() => setDialogueIncoherenceOuvert(true)}>
              Signaler une incohérence
            </Button>
          )}

          {peutConfirmerChef &&
            (paiement.confirmeParChefId || paiement.statut === "ANNULE" || paiement.statut === "INCOHERENCE" ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" disabled>
                      Confirmer la collecte
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {paiement.confirmeParChefId
                    ? "Ce paiement a déjà été confirmé par un Chef."
                    : "Un paiement annulé ou incohérent ne peut pas être confirmé par le Chef."}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                disabled={confirmerChef.isPending}
                onClick={() => {
                  confirmerChef.mutate(
                    { id: paiement.id },
                    {
                      onSuccess: () => toast.success("Collecte confirmée."),
                      onError: (e) => toast.error(estErreurApi(e) ? e.message : "La confirmation a échoué."),
                    },
                  );
                }}
              >
                {confirmerChef.isPending ? "Confirmation en cours…" : "Confirmer la collecte"}
              </Button>
            ))}
        </div>
      </div>

      <Dialog open={recuOuvert} onOpenChange={setRecuOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reçu {recu?.numeroRecu ?? paiement.numeroRecu}</DialogTitle>
            <DialogDescription>
              {recu?.provisoire
                ? "Reçu provisoire : ce paiement n'est pas encore validé par le DAF. Le reçu définitif sera disponible après validation."
                : "Reçu définitif : ce paiement a été validé."}
            </DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <LigneChamp libelle="Montant" valeur={formaterMontant(recu?.montant ?? paiement.montant)} />
            <LigneChamp libelle="Date du paiement" valeur={formaterDate(recu?.datePaiement ?? paiement.datePaiement)} />
            <LigneChamp libelle="Adhérent" valeur={nomAdherent} />
            <LigneChamp
              libelle="Statut"
              valeur={recu?.provisoire ? "Provisoire" : "Définitif"}
            />
          </dl>
        </DialogContent>
      </Dialog>

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

      <DialogueConfirmation
        ouvert={dialogueIncoherenceOuvert}
        onOuvertChange={setDialogueIncoherenceOuvert}
        titre="Signaler une incohérence"
        description={rappelValeurs}
        motifRequis
        libelleMotif="Motif de l'incohérence"
        libelleConfirmation="Signaler l'incohérence"
        varianteDestructive
        enCours={signaler.isPending}
        onConfirmer={async (motif) => {
          try {
            await signaler.mutateAsync({ id: paiement.id, motif: motif! });
            toast.success("Incohérence signalée.");
            setDialogueIncoherenceOuvert(false);
          } catch (e) {
            toast.error(estErreurApi(e) ? e.message : "Le signalement a échoué.");
          }
        }}
      />
    </CoquilleApplication>
  );
}
