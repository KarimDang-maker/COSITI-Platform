import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { CarteSection } from "@/components/cositi/carte-section";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/auth/ContexteAuth";
import { useHistoriqueValidation, useSoumettreEntite, useStatutValidation } from "@/hooks/useWorkflow";
import { estConflitVersion, type DemandeValidation, type TypeEntiteWorkflow } from "@/api/workflow";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure } from "@/lib/format";
import { DialogueDecisionDemande } from "@/ecrans/workflow/DialogueDecisionDemande";
import type { ActionDecision } from "@/hooks/useWorkflow";

interface BandeauWorkflowProps {
  typeEntite: TypeEntiteWorkflow;
  entiteId: string;
  /** Désignation de la donnée (nom, n° de reçu) pour les confirmations. */
  designation: string;
  /** Permission de soumettre (création contrôlée : dossier adhérent ou profil d'agent). */
  peutSoumettre?: boolean;
  /** Ouvre la demande de modification d'une donnée officielle ; absent = action non proposée. */
  onDemanderModification?: () => void;
  libelleDemandeModification?: string;
  /** Vérification avant soumission (complétude, pièces…) affichée dans la confirmation. */
  verification?: ReactNode;
  /**
   * Autre voie d'officialisation que la soumission générique. Dossier adhérent (V20) : `POST /adherents/{id}/soumettre`
   * est refusé (`ADHERENT_VALIDATION_PAR_CONTROLE_DGA`), le dossier devient officiel par activation puis contrôle DGA.
   */
  officialisation?: { texte: string; libelleAction: string; onAction: () => void };
}

/**
 * Bandeau d'état de validation d'une donnée (§13, §19.3, §42) : brouillon à soumettre, en attente (verrouillée),
 * correction demandée, rejetée, officielle protégée. Le statut est toujours écrit en toutes lettres ; les
 * actions proposées suivent `modifiableDirectement` et la demande ouverte renvoyés par le serveur.
 */
export function BandeauWorkflow({
  typeEntite,
  entiteId,
  designation,
  peutSoumettre = false,
  onDemanderModification,
  libelleDemandeModification = "Demander une modification",
  verification,
  officialisation,
}: BandeauWorkflowProps) {
  const { utilisateur } = useAuth();
  const { data: etat, isLoading, isError } = useStatutValidation(typeEntite, entiteId);
  const [soumissionOuverte, setSoumissionOuverte] = useState(false);
  const [action, setAction] = useState<{ demande: DemandeValidation; action: ActionDecision } | null>(null);

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  // Une erreur (403, ancienne API sans workflow) n'empêche pas la consultation de la fiche.
  if (isError || !etat) return null;

  const ouverte = etat.demandeOuverte;
  const estDemandeur = !!ouverte && !!utilisateur && ouverte.demandePar === utilisateur.id;
  const statut = etat.statutValidation;
  const lienDemande = ouverte && (
    <Link to={`/validations/${ouverte.id}`} className="font-medium text-primaire underline underline-offset-2">
      Ouvrir la demande {ouverte.reference}
    </Link>
  );
  const actionsDemandeur = ouverte && estDemandeur && (
    <div className="mt-3 flex flex-wrap gap-2">
      {ouverte.statut === "CORRECTION_DEMANDEE" && (
        <Button size="sm" onClick={() => setAction({ demande: ouverte, action: "resoumettre" })}>
          Resoumettre après correction
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => setAction({ demande: ouverte, action: "annuler" })}>
        Annuler ma demande
      </Button>
    </div>
  );

  let bandeau: ReactNode = null;
  if (typeEntite !== "PAIEMENT" && statut === "BROUILLON") {
    bandeau = (
      <Alerte teinte="info" titre="Brouillon — non soumis à validation">
        <p>{officialisation?.texte ?? "Cette donnée n'est pas encore officielle. Vérifiez-la, puis soumettez-la pour validation."}</p>
        {officialisation && (
          <Button size="sm" className="mt-3" onClick={officialisation.onAction}>
            {officialisation.libelleAction}
          </Button>
        )}
        {peutSoumettre && !officialisation && (
          <Button size="sm" className="mt-3" onClick={() => setSoumissionOuverte(true)}>
            Soumettre pour validation
          </Button>
        )}
      </Alerte>
    );
  } else if (typeEntite !== "PAIEMENT" && statut === "REJETE") {
    bandeau = (
      <Alerte teinte="danger" titre="Rejeté par le validateur">
        <p>{etat.derniereDemande?.commentaireValidateur ?? "Motif non communiqué."}</p>
        <p className="mt-1 text-sm">Corrigez la donnée puis soumettez-la de nouveau.</p>
        {peutSoumettre && !officialisation && (
          <Button size="sm" className="mt-3" onClick={() => setSoumissionOuverte(true)}>
            Soumettre de nouveau
          </Button>
        )}
      </Alerte>
    );
  } else if (ouverte?.statut === "CORRECTION_DEMANDEE") {
    bandeau = (
      <Alerte teinte="attention" titre={`Correction demandée — ${ouverte.reference}`}>
        <p>{ouverte.commentaireValidateur ?? "Le validateur demande une correction."}</p>
        <p className="mt-1 text-sm">{lienDemande}</p>
        {actionsDemandeur}
      </Alerte>
    );
  } else if (ouverte) {
    bandeau = (
      <Alerte teinte="attention" titre={`En attente de validation — ${ouverte.reference}`}>
        <p>
          Soumise par <strong>{ouverte.demandeParIdentifiant ?? "—"}</strong>
          {ouverte.soumiseLe ? ` le ${formaterDateHeure(ouverte.soumiseLe)}` : ""}. Validateur attendu : un utilisateur habilité,
          autre que le demandeur.
        </p>
        <p className="mt-1 text-sm">
          {etat.modifiableDirectement
            ? "La valeur officielle reste en vigueur jusqu'à la décision."
            : "Les modifications directes sont temporairement désactivées."}{" "}
          {lienDemande}
        </p>
        {actionsDemandeur}
      </Alerte>
    );
  } else if (typeEntite !== "PAIEMENT" && statut === "VALIDE") {
    bandeau = (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bordure bg-surface p-4">
        <p className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-5 text-succes-fort" aria-hidden="true" />
          <span>
            <strong>Donnée officielle protégée.</strong> Toute modification passe par une demande validée par un autre utilisateur.
          </span>
        </p>
        {onDemanderModification && (
          <Button size="sm" variant="outline" onClick={onDemanderModification}>
            {libelleDemandeModification}
          </Button>
        )}
      </div>
    );
  } else if (typeEntite === "PAIEMENT" && onDemanderModification && !etat.modifiableDirectement) {
    bandeau = (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bordure bg-surface p-4">
        <p className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-5 text-succes-fort" aria-hidden="true" />
          <span>
            <strong>Cotisation soumise : champs verrouillés.</strong> Une correction passe par une demande validée par le DAF.
          </span>
        </p>
        <Button size="sm" variant="outline" onClick={onDemanderModification}>
          {libelleDemandeModification}
        </Button>
      </div>
    );
  }

  return (
    <>
      {bandeau}
      {(typeEntite === "ADHERENT" || typeEntite === "AGENT") && (
        <DialogueSoumissionEntite
          typeEntite={typeEntite}
          entiteId={entiteId}
          designation={designation}
          version={etat.version}
          ouvert={soumissionOuverte}
          onOuvertChange={setSoumissionOuverte}
          verification={verification}
        />
      )}
      {action && (
        <DialogueDecisionDemande demande={action.demande} action={action.action} onFermer={() => setAction(null)} />
      )}
    </>
  );
}

/** Soumission d'un dossier ou d'un profil (§12) : confirmation explicite, vérification rappelée. */
function DialogueSoumissionEntite({
  typeEntite,
  entiteId,
  designation,
  version,
  ouvert,
  onOuvertChange,
  verification,
}: {
  typeEntite: "ADHERENT" | "AGENT";
  entiteId: string;
  designation: string;
  version: number | null;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  verification?: ReactNode;
}) {
  const soumettre = useSoumettreEntite(typeEntite, entiteId);
  const [motif, setMotif] = useState("");
  const [cle, setCle] = useState(() => crypto.randomUUID());
  const [erreur, setErreur] = useState<string | null>(null);

  function fermer(valeur: boolean) {
    if (!valeur) {
      setMotif("");
      setErreur(null);
      setCle(crypto.randomUUID());
    }
    onOuvertChange(valeur);
  }

  async function confirmer() {
    if (soumettre.isPending) return;
    setErreur(null);
    try {
      const demande = await soumettre.mutateAsync({ corps: { motif: motif.trim() || undefined, versionBase: version }, cle });
      toast.success(`Demande ${demande.reference} soumise : en attente de validation.`);
      for (const avertissement of demande.avertissements) toast.warning(avertissement);
      fermer(false);
    } catch (e) {
      setErreur(
        estConflitVersion(e)
          ? "La donnée a été modifiée entre-temps. Rechargez la fiche avant de soumettre."
          : estErreurApi(e)
            ? e.message
            : "La soumission a échoué.",
      );
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{typeEntite === "ADHERENT" ? "Soumettre le dossier ?" : "Soumettre le profil ?"}</DialogTitle>
          <DialogDescription>
            {designation} — après soumission, vous ne pourrez plus modifier directement les informations jusqu'à la décision
            du validateur.
          </DialogDescription>
        </DialogHeader>
        {verification}
        <div className="space-y-1.5">
          <Label htmlFor="soumission-motif">
            Commentaire pour le validateur <span className="font-medium text-texte-doux">(facultatif)</span>
          </Label>
          <Textarea id="soumission-motif" maxLength={1000} value={motif} onChange={(e) => setMotif(e.target.value)} />
        </div>
        {erreur && (
          <Alerte teinte="danger" titre="Soumission refusée">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => fermer(false)} disabled={soumettre.isPending}>
            Annuler
          </Button>
          <Button onClick={() => void confirmer()} disabled={soumettre.isPending}>
            {soumettre.isPending ? "Soumission…" : "Soumettre pour validation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Historique des demandes de validation et de modification d'une donnée (§17) — consultatif, jamais modifiable. */
export function HistoriqueValidation({ typeEntite, entiteId }: { typeEntite: TypeEntiteWorkflow; entiteId: string }) {
  const { data, isLoading, isError, error } = useHistoriqueValidation(typeEntite, entiteId);
  return (
    <CarteSection
      titre="Validations et demandes de modification"
      description="Chaque demande, sa décision et son auteur. Ouvrez une demande pour voir le détail des changements."
      contenuPleineLargeur={!!data && data.length > 0}
    >
      {isLoading && <Skeleton className="h-20 w-full" />}
      {isError && (
        <Alerte teinte="danger">
          <p>{estErreurApi(error) ? error.message : "L'historique de validation n'a pas pu être chargé."}</p>
        </Alerte>
      )}
      {data && data.length === 0 && <EtatVide titre="Aucune demande enregistrée" description="Aucune validation ni modification n'a encore été demandée." />}
      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Demandée par</TableHead>
              <TableHead>Le</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((demande) => (
              <TableRow key={demande.id}>
                <TableCell>
                  <Link to={`/validations/${demande.id}`} className="ref font-medium text-primaire underline underline-offset-2">
                    {demande.reference}
                  </Link>
                </TableCell>
                <TableCell>
                  <BadgeStatut domaine="operationWorkflow" code={demande.typeOperation} />
                </TableCell>
                <TableCell>{demande.demandeParIdentifiant ?? "—"}</TableCell>
                <TableCell>{formaterDateHeure(demande.demandeLe)}</TableCell>
                <TableCell>
                  <BadgeStatut domaine="statutDemande" code={demande.statut} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CarteSection>
  );
}
