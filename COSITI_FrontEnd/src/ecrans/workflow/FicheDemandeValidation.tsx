import { useState } from "react";
import { Link, useParams } from "react-router";
import { Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { EtatVide } from "@/components/cositi/etat-vide";
import { DialogueTeleverserDocument } from "@/components/cositi/dialogue-televerser-document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth, usePermission } from "@/auth/ContexteAuth";
import { useDecisionsDemande, useDemande, useJoindreJustificatif, type ActionDecision } from "@/hooks/useWorkflow";
import { useActivites } from "@/hooks/useAdherents";
import { useZones } from "@/hooks/useOrganisation";
import { useTelechargerDocument } from "@/hooks/useDocuments";
import {
  PERMISSION_DECISION,
  STATUTS_DEMANDE_OUVERTS,
  type DemandeValidation,
  type PropositionChamp,
  type TypeEntiteWorkflow,
} from "@/api/workflow";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure } from "@/lib/format";
import { ComparaisonChangements } from "@/ecrans/workflow/ComparaisonChangements";
import { DialogueDecisionDemande } from "@/ecrans/workflow/DialogueDecisionDemande";
import { libelleChamp, type Referentiels } from "@/ecrans/workflow/champsWorkflow";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";

/** Fiche de la donnée concernée par une demande. */
function cheminEntite(type: TypeEntiteWorkflow, id: string): string {
  if (type === "ADHERENT") return `/adherents/${id}`;
  if (type === "AGENT") return `/agents/${id}`;
  return `/cotisations/${id}`;
}

const LIBELLE_ENTITE: Readonly<Record<TypeEntiteWorkflow, string>> = {
  ADHERENT: "Ouvrir le dossier de l'adhérent",
  AGENT: "Ouvrir le profil de l'agent",
  PAIEMENT: "Ouvrir la cotisation",
};

/**
 * Détail d'une demande de validation ou de modification. Vue du validateur (§14) : demandeur, valeurs
 * comparées, justificatifs, historique, puis « Demander correction / Rejeter / Approuver ». Vue du demandeur :
 * suivi, soumission, resoumission après correction, annulation. Chaque bouton n'est qu'un raccourci : la
 * politique serveur (habilitation, auteur ≠ validateur, état, version) tranche à l'appel.
 */
export function FicheDemandeValidation() {
  const { id } = useParams<{ id: string }>();
  const { data: demande, isLoading, isError, error } = useDemande(id);

  if (isLoading) {
    return (
      <CoquilleApplication titre="Demande de validation">
        <Skeleton className="h-64 w-full" />
      </CoquilleApplication>
    );
  }

  if (isError || !demande) {
    const refuse = estErreurApi(error) && error.statut === 403;
    const introuvable = estErreurApi(error) && error.statut === 404;
    return (
      <CoquilleApplication titre="Demande de validation">
        <Alerte teinte="danger" titre={refuse ? "Accès non autorisé" : introuvable ? "Demande introuvable" : "Impossible de charger la demande"}>
          <p>
            {refuse
              ? "Cette demande porte sur une donnée hors de votre périmètre ou de vos habilitations."
              : introuvable
                ? "Cette demande n'existe pas."
                : estErreurApi(error)
                  ? error.message
                  : "Une erreur inattendue est survenue."}
          </p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  return <ContenuDemande demande={demande} />;
}

function ContenuDemande({ demande }: { demande: DemandeValidation }) {
  const { utilisateur } = useAuth();
  const peutDeciderOperation = usePermission(PERMISSION_DECISION[demande.typeOperation]);
  const peutLireZones = usePermission("ORGANISATION:LIRE");
  const peutTeleverser = usePermission("DOCUMENT:TELEVERSER");
  const { data: activites } = useActivites();
  const { data: zones } = useZones();
  const decisions = useDecisionsDemande(demande.id);
  const telecharger = useTelechargerDocument();
  const joindre = useJoindreJustificatif(demande.id);
  const [action, setAction] = useState<ActionDecision | null>(null);
  const [depotOuvert, setDepotOuvert] = useState(false);

  const referentiels: Referentiels = { activites, zones: peutLireZones ? zones : undefined };
  const estDemandeur = !!utilisateur && demande.demandePar === utilisateur.id;
  const ouverte = STATUTS_DEMANDE_OUVERTS.includes(demande.statut);
  const enAttente = demande.statut === "EN_ATTENTE_VALIDATION";
  const instantane = demande.typeOperation === "ADHERENT_VALIDATION_DOSSIER" || demande.typeOperation === "AGENT_VALIDATION_PROFIL";
  const avecElementsModifiables = !instantane && demande.typeOperation !== "AGENT_CHANGEMENT_STATUT";
  // Le document n'a de rattachement possible qu'à un adhérent ou un paiement (API des documents).
  const cibleDocument =
    demande.typeEntite === "ADHERENT" ? { adherentId: demande.entiteId } : demande.typeEntite === "PAIEMENT" ? { paiementId: demande.entiteId } : undefined;

  const [corrections, setCorrections] = useState<Record<string, string>>(() =>
    Object.fromEntries(demande.elements.map((e) => [e.champ, e.valeurProposee ?? ""])),
  );
  const elementsResoumis: PropositionChamp[] | undefined =
    avecElementsModifiables && demande.statut === "CORRECTION_DEMANDEE"
      ? demande.elements.map((e) => ({ champ: e.champ, valeurProposee: corrections[e.champ]?.trim() || null }))
      : undefined;

  const resume = (
    <div className="space-y-2">
      <ComparaisonChangements
        elements={
          elementsResoumis
            ? demande.elements.map((e) => ({ ...e, valeurProposee: corrections[e.champ]?.trim() || null }))
            : demande.elements
        }
        statut={demande.statut}
        instantane={instantane}
        referentiels={referentiels}
      />
    </div>
  );

  const boutonDecision = (libelle: string, actionCible: ActionDecision, variante: "default" | "destructive" | "outline") =>
    estDemandeur ? (
      <Tooltip key={actionCible}>
        <TooltipTrigger asChild>
          <span>
            <Button variant={variante} disabled>
              {libelle}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Vous ne pouvez pas décider de votre propre demande.</TooltipContent>
      </Tooltip>
    ) : (
      <Button key={actionCible} variant={variante} onClick={() => setAction(actionCible)}>
        {libelle}
      </Button>
    );

  return (
    <CoquilleApplication titre="Demande de validation">
      <div className="space-y-6">
        <EnTetePage
          titre={<>Demande {demande.reference}</>}
          description={<BadgeStatut domaine="operationWorkflow" code={demande.typeOperation} />}
          statut={<BadgeStatut domaine="statutDemande" code={demande.statut} />}
          filAriane={[{ libelle: "Centre de validation", chemin: "/validations" }, { libelle: "Demande" }]}
          actions={
            <>
              {enAttente && peutDeciderOperation && (
                <>
                  {boutonDecision("Demander correction", "corriger", "outline")}
                  {boutonDecision("Rejeter", "rejeter", "destructive")}
                  {boutonDecision("Approuver", "approuver", "default")}
                </>
              )}
              {estDemandeur && demande.statut === "BROUILLON" && <Button onClick={() => setAction("soumettre")}>Soumettre</Button>}
              {estDemandeur && demande.statut === "CORRECTION_DEMANDEE" && (
                <Button onClick={() => setAction("resoumettre")}>Resoumettre</Button>
              )}
              {estDemandeur && ouverte && (
                <Button variant="outline" onClick={() => setAction("annuler")}>
                  Annuler la demande
                </Button>
              )}
            </>
          }
        />

        {enAttente && !peutDeciderOperation && !estDemandeur && (
          <Alerte teinte="info" titre="Action non disponible">
            <p>Cette opération nécessite une validation par un utilisateur disposant de l'autorité correspondante.</p>
          </Alerte>
        )}
        {demande.statut === "CORRECTION_DEMANDEE" && (
          <Alerte teinte="attention" titre="Correction demandée par le validateur">
            <p>{demande.commentaireValidateur ?? "—"}</p>
            {estDemandeur && instantane && (
              <p className="mt-1 text-sm">Corrigez la donnée depuis sa fiche, puis resoumettez la demande.</p>
            )}
          </Alerte>
        )}
        {(demande.statut === "REJETEE" || demande.statut === "APPROUVEE") && demande.commentaireValidateur && (
          <Alerte teinte={demande.statut === "REJETEE" ? "danger" : "succes"} titre={demande.statut === "REJETEE" ? "Motif du rejet" : "Commentaire du validateur"}>
            <p>{demande.commentaireValidateur}</p>
          </Alerte>
        )}
        {demande.avertissements.length > 0 && <AvertissementRegle avertissements={demande.avertissements} />}

        <CarteSection titre="Demande">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LigneChamp
              libelle="Donnée concernée"
              valeur={
                <Link to={cheminEntite(demande.typeEntite, demande.entiteId)} className="font-medium text-primaire underline underline-offset-2">
                  {LIBELLE_ENTITE[demande.typeEntite]}
                </Link>
              }
            />
            <LigneChamp libelle="Demandée par" valeur={demande.demandeParIdentifiant ?? "—"} />
            <LigneChamp libelle="Créée le" valeur={formaterDateHeure(demande.demandeLe)} />
            <LigneChamp libelle="Soumise le" valeur={demande.soumiseLe ? formaterDateHeure(demande.soumiseLe) : "—"} />
            <LigneChamp libelle="Décidée le" valeur={demande.examineeLe ? formaterDateHeure(demande.examineeLe) : "—"} />
            <LigneChamp libelle="Appliquée le" valeur={demande.appliqueeLe ? formaterDateHeure(demande.appliqueeLe) : "—"} />
            <div className="sm:col-span-3">
              <LigneChamp libelle="Motif" valeur={demande.motif ?? "—"} />
            </div>
          </dl>
        </CarteSection>

        <CarteSection
          titre={instantane ? "Données soumises" : "Changements demandés"}
          description={!instantane && ouverte ? "La valeur officielle reste en vigueur tant que la demande n'est pas approuvée." : undefined}
          contenuPleineLargeur
        >
          <ComparaisonChangements elements={demande.elements} statut={demande.statut} instantane={instantane} referentiels={referentiels} />
        </CarteSection>

        {estDemandeur && elementsResoumis && (
          <CarteSection titre="Corriger les valeurs proposées" description="Ces valeurs remplaceront les propositions à la resoumission.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {demande.elements.map((e) => (
                <div key={e.champ} className="space-y-1.5">
                  <Label htmlFor={`correction-${e.champ}`}>{libelleChamp(e.champ)}</Label>
                  <Input
                    id={`correction-${e.champ}`}
                    value={corrections[e.champ] ?? ""}
                    onChange={(ev) => setCorrections((p) => ({ ...p, [e.champ]: ev.target.value }))}
                  />
                </div>
              ))}
            </div>
          </CarteSection>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CarteSection
            titre="Justificatifs"
            actions={
              estDemandeur && ouverte && cibleDocument && peutTeleverser ? (
                <Button size="sm" variant="outline" onClick={() => setDepotOuvert(true)}>
                  <FileUp className="size-4" aria-hidden="true" />
                  Joindre un justificatif
                </Button>
              ) : undefined
            }
          >
            {demande.documents.length === 0 ? (
              <p className="text-sm text-texte-doux-fort">Aucun justificatif joint.</p>
            ) : (
              <ul className="space-y-2">
                {demande.documents.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-fond p-3">
                    <span className="text-sm">
                      {document.typeDocument ?? "Document"} — ajouté le {formaterDateHeure(document.ajouteLe)}
                      {document.obligatoire ? " (obligatoire)" : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={telecharger.isPending}
                      onClick={() =>
                        telecharger.mutate(document.documentId, {
                          onError: (e) => toast.error(estErreurApi(e) ? e.message : "Le téléchargement a échoué."),
                        })
                      }
                    >
                      <Download className="size-4" aria-hidden="true" />
                      Voir le document
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CarteSection>

          <CarteSection titre="Historique de la demande" description="Consultatif : chaque transition est conservée.">
            {decisions.isLoading && <Skeleton className="h-24 w-full" />}
            {decisions.data && decisions.data.length === 0 && <EtatVide titre="Aucune transition enregistrée" />}
            {decisions.data && decisions.data.length > 0 && (
              <ol className="relative space-y-4 border-l border-bordure pl-6" aria-label="Historique de la demande">
                {decisions.data.map((d) => (
                  <li key={d.id} className="relative">
                    <span className="absolute top-1.5 left-[-1.9rem] size-3 rounded-full border-2 border-surface bg-primaire" aria-hidden="true" />
                    <div className="flex flex-wrap items-center gap-2">
                      <BadgeStatut domaine="actionWorkflow" code={d.action} />
                      <time dateTime={d.decideLe} className="text-sm text-texte-doux-fort">
                        {formaterDateHeure(d.decideLe)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm">
                      Par <span className="font-semibold">{d.decideParIdentifiant ?? "système"}</span>
                    </p>
                    {d.commentaire && <p className="mt-1 text-sm text-texte-doux-fort">« {d.commentaire} »</p>}
                  </li>
                ))}
              </ol>
            )}
          </CarteSection>
        </div>
      </div>

      <DialogueDecisionDemande
        demande={demande}
        action={action}
        onFermer={() => setAction(null)}
        resume={action === "approuver" || action === "resoumettre" ? resume : undefined}
        elements={action === "resoumettre" ? elementsResoumis : undefined}
      />

      {cibleDocument && (
        <DialogueTeleverserDocument
          ouvert={depotOuvert}
          onOuvertChange={setDepotOuvert}
          cible={cibleDocument}
          onTeleverse={(document) =>
            joindre.mutate(document.id, {
              onSuccess: () => toast.success("Justificatif joint à la demande."),
              onError: (e) => toast.error(estErreurApi(e) ? e.message : "Le justificatif n'a pas pu être joint."),
            })
          }
        />
      )}
    </CoquilleApplication>
  );
}
