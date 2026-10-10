import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
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
import { Alerte } from "@/components/cositi/alerte";
import { useDecisionDemande, type ActionDecision } from "@/hooks/useWorkflow";
import { estConflitVersion, type DemandeValidation, type PropositionChamp } from "@/api/workflow";
import { estErreurApi } from "@/api/erreurs";

interface Configuration {
  titre: string;
  explication: string;
  libelleConfirmation: string;
  motifObligatoire: boolean;
  libelleMotif: string;
  destructive: boolean;
  succes: (demande: DemandeValidation) => string;
}

const CONFIGURATIONS: Readonly<Record<ActionDecision, Configuration>> = {
  approuver: {
    titre: "Approuver la demande",
    explication: "Cette action rend la proposition officielle et l'applique immédiatement. Elle est définitive et journalisée.",
    libelleConfirmation: "Approuver",
    motifObligatoire: false,
    libelleMotif: "Commentaire",
    destructive: false,
    succes: (d) => `Demande ${d.reference} approuvée : la modification est appliquée.`,
  },
  rejeter: {
    titre: "Rejeter la demande",
    explication: "La valeur officielle reste inchangée. Le motif est communiqué au demandeur.",
    libelleConfirmation: "Rejeter",
    motifObligatoire: true,
    libelleMotif: "Motif du rejet",
    destructive: true,
    succes: (d) => `Demande ${d.reference} rejetée.`,
  },
  corriger: {
    titre: "Demander une correction",
    explication: "Expliquez précisément les informations à corriger ou à compléter. Le demandeur pourra resoumettre.",
    libelleConfirmation: "Envoyer la demande de correction",
    motifObligatoire: true,
    libelleMotif: "Informations à corriger",
    destructive: false,
    succes: (d) => `Correction demandée sur ${d.reference}.`,
  },
  soumettre: {
    titre: "Soumettre la demande",
    explication: "Après soumission, la demande n'est plus modifiable jusqu'à la décision du validateur.",
    libelleConfirmation: "Soumettre pour validation",
    motifObligatoire: false,
    libelleMotif: "Commentaire",
    destructive: false,
    succes: (d) => `Demande ${d.reference} soumise : en attente de validation.`,
  },
  resoumettre: {
    titre: "Resoumettre après correction",
    explication: "La demande repart en validation avec les éléments corrigés.",
    libelleConfirmation: "Resoumettre",
    motifObligatoire: false,
    libelleMotif: "Commentaire pour le validateur",
    destructive: false,
    succes: (d) => `Demande ${d.reference} resoumise.`,
  },
  annuler: {
    titre: "Annuler la demande",
    explication: "La demande est close sans effet. La valeur officielle reste inchangée.",
    libelleConfirmation: "Annuler la demande",
    motifObligatoire: false,
    libelleMotif: "Raison de l'annulation",
    destructive: true,
    succes: (d) => `Demande ${d.reference} annulée.`,
  },
};

interface DialogueDecisionDemandeProps {
  demande: DemandeValidation;
  action: ActionDecision | null;
  onFermer: () => void;
  /** Résumé à relire avant la décision (comparaison, montants…). */
  resume?: ReactNode;
  /** Propositions corrigées (resoumission d'une demande de modification). */
  elements?: PropositionChamp[];
}

/**
 * Décision ou transition d'une demande (§31). Motif obligatoire pour un rejet et une demande de correction.
 * Une clé d'idempotence est fixée à l'ouverture : un double clic ou un nouvel essai ne déclenche jamais deux
 * décisions. Conflit de version : la donnée a changé, l'utilisateur doit recharger avant de décider (§34).
 */
export function DialogueDecisionDemande({ demande, action, onFermer, resume, elements }: DialogueDecisionDemandeProps) {
  const decision = useDecisionDemande(demande.typeEntite);
  const clientRequetes = useQueryClient();
  const [commentaire, setCommentaire] = useState("");
  const [cle, setCle] = useState(() => crypto.randomUUID());
  const [doublonsSignales, setDoublonsSignales] = useState<string | null>(null);
  const [ignorerDoublons, setIgnorerDoublons] = useState(false);
  const [erreur, setErreur] = useState<{ message: string; conflit: boolean } | null>(null);

  if (!action) return null;
  const configuration = CONFIGURATIONS[action];
  const motifManquant = configuration.motifObligatoire && commentaire.trim() === "";

  function fermer() {
    setCommentaire("");
    setDoublonsSignales(null);
    setIgnorerDoublons(false);
    setErreur(null);
    setCle(crypto.randomUUID());
    onFermer();
  }

  async function confirmer() {
    if (!action || motifManquant || decision.isPending) return;
    setErreur(null);
    try {
      const resultat = await decision.mutateAsync({
        id: demande.id,
        action,
        corps: { commentaire: commentaire.trim() || undefined, ignorerDoublons: ignorerDoublons || undefined },
        elements,
        cle,
      });
      toast.success(configuration.succes(resultat));
      for (const avertissement of resultat.avertissements) toast.warning(avertissement);
      fermer();
    } catch (e) {
      if (estErreurApi(e) && e.code === "ADHERENT_DOUBLON_POTENTIEL") {
        // Décision explicite et tracée : le validateur doit cocher l'approbation malgré les doublons.
        setDoublonsSignales(e.message);
        setCle(crypto.randomUUID());
        return;
      }
      setErreur({ message: estErreurApi(e) ? e.message : "L'opération a échoué.", conflit: estConflitVersion(e) });
    }
  }

  return (
    <Dialog open onOpenChange={(ouvert) => !ouvert && fermer()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{configuration.titre}</DialogTitle>
          <DialogDescription>
            Demande <span className="ref">{demande.reference}</span> — {configuration.explication}
          </DialogDescription>
        </DialogHeader>

        {resume}

        <div className="space-y-1.5">
          <Label htmlFor="decision-commentaire">
            {configuration.libelleMotif}{" "}
            <span className="font-medium text-texte-doux">{configuration.motifObligatoire ? "(obligatoire)" : "(facultatif)"}</span>
          </Label>
          <Textarea
            id="decision-commentaire"
            maxLength={1000}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            aria-invalid={motifManquant && commentaire !== ""}
          />
        </div>

        {doublonsSignales && (
          <Alerte teinte="attention" titre="Doublons potentiels détectés au recontrôle">
            <p>{doublonsSignales}</p>
            <div className="mt-3 flex items-start gap-3">
              <Checkbox id="ignorer-doublons" checked={ignorerDoublons} onCheckedChange={(v) => setIgnorerDoublons(v === true)} />
              <Label htmlFor="ignorer-doublons" className="leading-snug font-normal">
                J'ai vérifié : il ne s'agit pas de la même personne. Approuver malgré tout (décision tracée).
              </Label>
            </div>
          </Alerte>
        )}

        {erreur && (
          <Alerte teinte={erreur.conflit ? "attention" : "danger"} titre={erreur.conflit ? "La donnée a été modifiée entre-temps" : "Opération refusée"}>
            <p>{erreur.conflit ? "Rechargez les informations avant de continuer." : erreur.message}</p>
            {erreur.conflit && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  void clientRequetes.invalidateQueries({ queryKey: ["workflow"] });
                  fermer();
                }}
              >
                Recharger
              </Button>
            )}
          </Alerte>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={fermer} disabled={decision.isPending}>
            Fermer
          </Button>
          <Button
            variant={configuration.destructive ? "destructive" : "default"}
            onClick={() => void confirmer()}
            disabled={motifManquant || decision.isPending || (!!doublonsSignales && !ignorerDoublons)}
          >
            {decision.isPending ? "Envoi en cours…" : configuration.libelleConfirmation}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
