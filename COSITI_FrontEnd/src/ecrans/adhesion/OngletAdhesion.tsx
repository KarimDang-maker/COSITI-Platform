import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ArrowRight, Check, Coins, Send, ShieldCheck } from "lucide-react";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { EtatVide } from "@/components/cositi/etat-vide";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/auth/ContexteAuth";
import { useControlesAdherent, useSoumettreAuControleDga, useSyntheseWorkflowAdherent } from "@/hooks/useAdhesion";
import { useAgentResponsable } from "@/hooks/useAdherents";
import type { ControleDga, SyntheseWorkflowAdherent } from "@/api/adhesion";
import { estErreurApi } from "@/api/erreurs";
import { cn } from "@/lib/utils";
import { formaterDate, formaterDateHeure, formaterEcart, formaterMontant, formaterNombre } from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";
import { ActionsFrais, DialogueEnregistrerFrais } from "@/ecrans/adhesion/DialoguesFrais";
import { ChecklistDocumentaire } from "@/ecrans/adhesion/ChecklistDocumentaire";
import { DialogueActivation } from "@/ecrans/adhesion/DialogueActivation";

interface Etape {
  libelle: string;
  faite: boolean;
  detail: string;
}

/** Étapes du parcours, lues de la synthèse serveur : affichage seul, aucune règle recalculée. */
function etapesParcours(s: SyntheseWorkflowAdherent): Etape[] {
  const frais = s.fraisAdhesion?.frais ?? null;
  const dga = s.activation.statutControleDga;
  return [
    {
      libelle: "Frais d'adhésion enregistré",
      faite: !!s.fraisAdhesion?.enregistre,
      detail: frais ? `${formaterMontant(frais.montantRecu)} le ${formaterDate(frais.dateCollecte)}` : "À enregistrer",
    },
    {
      libelle: "Adhérent activé",
      faite: !!s.activation.activeLe,
      detail: s.activation.activeLe ? formaterDateHeure(s.activation.activeLe) : "Par le Gestionnaire des comptes",
    },
    {
      libelle: "Transmis à la DGA",
      faite: dga !== "NON_SOUMIS",
      detail: s.activation.derniereSoumissionDgaLe ? formaterDateHeure(s.activation.derniereSoumissionDgaLe) : "Automatique à l'activation",
    },
    {
      libelle: "Documents contrôlés",
      faite: dga === "VALIDE" || dga === "REJETE",
      detail: dga === "VALIDE" ? "Documents conformes" : dga === "REJETE" ? "Rejeté" : "Par la DGA",
    },
  ];
}

function FriseParcours({ etapes }: { etapes: Etape[] }) {
  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-4" aria-label="Étapes du parcours d'adhésion">
      {etapes.map((e, i) => (
        <li
          key={e.libelle}
          className={cn("rounded-lg border p-3", e.faite ? "border-succes-trait bg-succes-doux" : "border-bordure bg-fond")}
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full text-xs",
                e.faite ? "bg-succes-fort text-surface" : "bg-neutre-doux text-neutre-fort",
              )}
            >
              {e.faite ? <Check className="size-3.5" /> : i + 1}
            </span>
            {e.libelle}
            <span className="sr-only">{e.faite ? " — fait" : " — à faire"}</span>
          </p>
          <p className="mt-1 text-xs text-texte-doux-fort">{e.detail}</p>
        </li>
      ))}
    </ol>
  );
}

function ResumeControle({ controle }: { controle: ControleDga }) {
  const c = controle.compteurs;
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <LigneChamp libelle="Documents vérifiés" valeur={`${formaterNombre(c.documentsConformes + c.documentsEnAnomalie)} / ${formaterNombre(c.documents)}`} />
      <LigneChamp libelle="Informations vérifiées" valeur={`${formaterNombre(c.champsVerifies)} / ${formaterNombre(c.champs)}`} />
      <LigneChamp libelle="Anomalies" valeur={formaterNombre(c.anomalies)} />
      <LigneChamp libelle="Non vérifiables" valeur={formaterNombre(c.nonVerifiables)} />
    </dl>
  );
}

/**
 * Onglet « Adhésion » de la fiche : frais d'adhésion, activation par le Gestionnaire et contrôle documentaire
 * DGA, à partir de `GET /adherents/{id}/synthese-workflow`. Le statut du compte et l'état du contrôle DGA sont
 * deux badges distincts (un adhérent peut être actif et en attente DGA). Chaque action n'apparaît que pour la
 * permission correspondante ; le serveur reste seul juge.
 */
export function OngletAdhesion({
  adherentId,
  designation,
  onVoirDocuments,
}: {
  adherentId: string;
  designation: string;
  /** Ouvre l'onglet Documents pour ajouter ou remplacer une pièce. */
  onVoirDocuments?: () => void;
}) {
  const synthese = useSyntheseWorkflowAdherent(adherentId);
  const peutLireControle = usePermission("CONTROLE_DGA:LIRE");
  const historique = useControlesAdherent(adherentId, peutLireControle);
  const peutActiver = usePermission("ADHERENT:ACTIVER");
  const peutEnregistrerFrais = usePermission("FRAIS_ADHESION:ENREGISTRER");
  const { data: agentResponsable } = useAgentResponsable(adherentId, peutEnregistrerFrais);
  const soumettre = useSoumettreAuControleDga(adherentId);
  const [fraisOuvert, setFraisOuvert] = useState(false);
  const [activationOuverte, setActivationOuverte] = useState(false);
  const [soumissionOuverte, setSoumissionOuverte] = useState(false);

  if (synthese.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (synthese.isError || !synthese.data) {
    return (
      <Alerte teinte="danger" titre="Parcours d'adhésion indisponible">
        <p>{estErreurApi(synthese.error) ? synthese.error.message : "Le parcours n'a pas pu être chargé."}</p>
      </Alerte>
    );
  }

  const s = synthese.data;
  const frais = s.fraisAdhesion?.frais ?? null;
  const dga = s.activation.statutControleDga;
  const controle = s.controleCourant;
  const peutTransmettre = peutActiver && !!s.activation.activeLe && (dga === "NON_SOUMIS" || dga === "CORRECTION_DEMANDEE");

  return (
    <div className="space-y-6">
      <CarteSection
        titre="Parcours d'adhésion"
        description="Du frais collecté sur le terrain jusqu'au contrôle des documents par la DGA."
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-texte-doux-fort">Compte :</span>
            <BadgeStatut domaine="adherent" code={s.activation.statut} />
            <span className="text-texte-doux-fort">Contrôle DGA :</span>
            <BadgeStatut domaine="controleDgaAdherent" code={dga} />
          </div>
        }
      >
        <FriseParcours etapes={etapesParcours(s)} />
        {s.demandeModificationOuverte && (
          <Alerte teinte="attention" titre="Demande de modification en cours" className="mt-4">
            <p>Une demande de modification attend une décision : l'activation reste bloquée jusque-là.</p>
          </Alerte>
        )}
      </CarteSection>

      <CarteSection
        titre="Frais d'adhésion"
        actions={
          !frais && peutEnregistrerFrais && s.fraisAdhesion ? (
            <Button onClick={() => setFraisOuvert(true)}>
              <Coins className="size-4" aria-hidden="true" />
              Enregistrer le frais
            </Button>
          ) : undefined
        }
      >
        {!frais ? (
          <EtatVide
            icone={Coins}
            titre="Aucun frais d'adhésion enregistré"
            description={
              s.fraisAdhesion
                ? `Montant attendu : ${formaterMontant(s.fraisAdhesion.montantRequis)}. Il doit être enregistré avant l'activation.`
                : "Information non disponible pour votre profil."
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ref">{frais.reference}</span>
              <BadgeStatut domaine="fraisAdhesion" code={frais.statut} />
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <LigneChamp libelle="Montant attendu" valeur={<span className="chiffre">{formaterMontant(frais.montantAttendu)}</span>} />
              <LigneChamp libelle="Montant reçu" valeur={<span className="chiffre">{formaterMontant(frais.montantRecu)}</span>} />
              <LigneChamp
                libelle="Écart"
                valeur={
                  <span className={cn("chiffre", frais.ecart !== 0 && "font-bold text-danger-fort")}>
                    {frais.ecart === 0 ? "Aucun écart" : formaterEcart(frais.ecart)}
                  </span>
                }
              />
              <LigneChamp libelle="Collecté par" valeur={frais.agentNom ?? "—"} />
              <LigneChamp libelle="Date de collecte" valeur={formaterDate(frais.dateCollecte)} />
              <LigneChamp libelle="Enregistré le" valeur={formaterDateHeure(frais.enregistreLe)} />
              {frais.valideLe && <LigneChamp libelle="Encaissement validé le" valeur={formaterDateHeure(frais.valideLe)} />}
            </dl>
            {frais.motifAnomalie && (
              <Alerte teinte={frais.statut === "ANOMALIE" ? "danger" : "info"} titre={frais.statut === "ANOMALIE" ? "Anomalie signalée" : "Anomalie résolue"}>
                <p>Motif : {frais.motifAnomalie}</p>
                {frais.resolutionAnomalie && <p>Résolution : {frais.resolutionAnomalie}</p>}
              </Alerte>
            )}
            <ActionsFrais frais={frais} />
          </div>
        )}
      </CarteSection>

      <CarteSection
        titre="Pièces justificatives"
        description="Checklist tirée de la matrice documentaire : seules les pièces obligatoires confirmées bloquent l'activation."
        actions={
          onVoirDocuments ? (
            <Button size="sm" variant="outline" onClick={onVoirDocuments}>
              Gérer les pièces
            </Button>
          ) : undefined
        }
      >
        <ChecklistDocumentaire adherentId={adherentId} compacte />
      </CarteSection>

      <CarteSection
        titre="Activation et contrôle des documents"
        actions={
          <div className="flex flex-wrap gap-2">
            {peutActiver && !s.activation.activeLe && (
              <Button onClick={() => setActivationOuverte(true)}>
                <ShieldCheck className="size-4" aria-hidden="true" />
                Vérifier et activer
              </Button>
            )}
            {peutTransmettre && (
              <Button variant={dga === "CORRECTION_DEMANDEE" ? "default" : "outline"} onClick={() => setSoumissionOuverte(true)}>
                <Send className="size-4" aria-hidden="true" />
                {dga === "CORRECTION_DEMANDEE" ? "Retransmettre à la DGA" : "Transmettre à la DGA"}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LigneChamp libelle="Activé le" valeur={formaterDateHeure(s.activation.activeLe)} />
            <LigneChamp libelle="Première transmission DGA" valeur={formaterDateHeure(s.activation.premiereSoumissionDgaLe)} />
            <LigneChamp libelle="Dernière transmission DGA" valeur={formaterDateHeure(s.activation.derniereSoumissionDgaLe)} />
          </dl>
          {controle ? (
            <div className="space-y-3 rounded-lg border border-bordure p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  Contrôle <span className="ref">{controle.reference}</span> — tour {formaterNombre(controle.tour)}
                  <BadgeStatut domaine="tourControleDga" code={controle.statut} />
                </p>
                {peutLireControle && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/controles-dga/${controle.id}`}>
                      Ouvrir le contrôle <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </div>
              <ResumeControle controle={controle} />
              {controle.commentaireDecision && (
                <Alerte teinte={controle.statut === "VALIDE" ? "succes" : controle.statut === "REJETE" ? "danger" : "attention"} titre="Décision de la DGA">
                  <p>{controle.commentaireDecision}</p>
                </Alerte>
              )}
            </div>
          ) : (
            <p className="text-sm text-texte-doux-fort">Aucun contrôle documentaire DGA pour ce dossier.</p>
          )}
        </div>
      </CarteSection>

      {peutLireControle && (historique.data?.length ?? 0) > 1 && (
        <CarteSection titre="Historique des contrôles DGA" description="Chaque transmission ouvre un nouveau tour ; les précédents restent consultables.">
          <ul className="divide-y divide-bordure">
            {historique.data?.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="ref">{c.reference}</span> tour {formaterNombre(c.tour)}
                  <BadgeStatut domaine="tourControleDga" code={c.statut} />
                </span>
                <span className="text-sm text-texte-doux-fort">
                  Transmis {formaterDateHeure(c.soumisLe)}
                  {c.termineLe ? ` — décidé ${formaterDateHeure(c.termineLe)}` : ""}
                </span>
                <Link className="text-sm font-semibold text-primaire underline-offset-4 hover:underline" to={`/controles-dga/${c.id}`}>
                  Consulter
                </Link>
              </li>
            ))}
          </ul>
        </CarteSection>
      )}

      {peutEnregistrerFrais && s.fraisAdhesion && (
        <DialogueEnregistrerFrais
          key={agentResponsable?.id ?? "sans-agent"}
          adherentId={adherentId}
          designation={designation}
          montantRequis={s.fraisAdhesion.montantRequis}
          agentParDefaut={agentResponsable?.id}
          ouvert={fraisOuvert}
          onOuvertChange={setFraisOuvert}
        />
      )}
      {peutActiver && (
        <DialogueActivation
          adherentId={adherentId}
          designation={designation}
          version={s.activation.version}
          ouvert={activationOuverte}
          onOuvertChange={setActivationOuverte}
        />
      )}
      {peutTransmettre && (
        <DialogueConfirmation
          ouvert={soumissionOuverte}
          onOuvertChange={setSoumissionOuverte}
          titre={dga === "CORRECTION_DEMANDEE" ? "Retransmettre à la DGA" : "Transmettre à la DGA"}
          description={
            <p>
              {dga === "CORRECTION_DEMANDEE"
                ? "Confirmez que les corrections demandées par la DGA ont été apportées. Un nouveau tour de contrôle sera ouvert."
                : "Le dossier rejoindra la file de contrôle documentaire de la DGA."}
            </p>
          }
          libelleConfirmation="Transmettre"
          enCours={soumettre.isPending}
          onConfirmer={async () => {
            try {
              await soumettre.mutateAsync(undefined);
              toast.success("Dossier transmis au contrôle documentaire de la DGA.");
              setSoumissionOuverte(false);
            } catch (e) {
              toast.error(estErreurApi(e) ? e.message : "La transmission a échoué.");
            }
          }}
        />
      )}
    </div>
  );
}
