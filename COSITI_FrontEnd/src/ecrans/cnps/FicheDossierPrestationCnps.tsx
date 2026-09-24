import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { ListePiecesDossierPrestation } from "@/components/cositi/cnps/liste-pieces-dossier-prestation";
import { JournalActiviteDossier } from "@/components/cositi/cnps/journal-activite-dossier";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChangerStatutDossierPrestation,
  useDossierPrestation,
  useJournalDossierPrestation,
  useModifierObservationsPrestation,
} from "@/hooks/useCnps";
import { useAuth } from "@/auth/ContexteAuth";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterDateSaisie, formaterMatricule } from "@/lib/format";
import type { StatutDossierPrestationCnps } from "@/api/cnps";

/**
 * Transitions proposées à l'écran — le graphe qui fait foi est celui du serveur
 * (`StatutDossierPrestationCnps.transitionsAutorisees`). Ordre = ordre de progression normale : la
 * première transition listée est la seule affichée en action primaire (`docs/02_DESIGN_SYSTEM.md §1.4`).
 */
const TRANSITIONS: Readonly<Record<StatutDossierPrestationCnps, readonly StatutDossierPrestationCnps[]>> = {
  INCOMPLET: ["COMPLET"],
  COMPLET: ["TRANSMIS_CNPS", "INCOMPLET"],
  TRANSMIS_CNPS: ["TRAITE", "REJETE"],
  REJETE: ["INCOMPLET"],
  TRAITE: [],
};

const LIBELLES_TRANSITION: Readonly<Record<StatutDossierPrestationCnps, string>> = {
  INCOMPLET: "Repasser incomplet",
  COMPLET: "Déclarer complet",
  TRANSMIS_CNPS: "Marquer transmis à la CNPS",
  TRAITE: "Marquer traité",
  REJETE: "Enregistrer un rejet CNPS",
};

/** `/dossiers-cnps/:id` — détail d'un dossier de prestation CNPS (module Gestionnaire des comptes). */
export function FicheDossierPrestationCnps() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { aLaPermission } = useAuth();

  const { data: dossier, isLoading, isError, error } = useDossierPrestation(id);
  const { data: journal } = useJournalDossierPrestation(id);
  const changerStatut = useChangerStatutDossierPrestation(id ?? "");
  const modifierObservations = useModifierObservationsPrestation(id ?? "");

  const [transitionEnCours, setTransitionEnCours] = useState<StatutDossierPrestationCnps | null>(null);
  const [observations, setObservations] = useState<string | null>(null);
  const [prochaineRelanceLe, setProchaineRelanceLe] = useState<string | null>(null);

  const peutGerer = aLaPermission("CNPS:GERER");
  const peutChangerStatut = aLaPermission("CNPS:CHANGER_STATUT");

  if (isLoading) {
    return (
      <CoquilleApplication titre="Dossier CNPS">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </CoquilleApplication>
    );
  }

  if (isError || !dossier) {
    return (
      <CoquilleApplication titre="Dossier CNPS">
        <Alerte teinte="danger" titre="Impossible de charger le dossier">
          <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  const transitionsPossibles = TRANSITIONS[dossier.statut];
  const motifObligatoire = transitionEnCours === "REJETE";
  const observationsAffichees = observations ?? dossier.observations ?? "";
  const relanceAffichee = prochaineRelanceLe ?? formaterDateSaisie(dossier.prochaineRelanceLe);

  function confirmerTransition(motif: string | undefined) {
    if (!transitionEnCours) return;
    changerStatut.mutate(
      { statut: transitionEnCours, commentaire: motif },
      {
        onSuccess: () => {
          toast.success("Statut du dossier mis à jour.");
          setTransitionEnCours(null);
        },
        onError: (erreur) =>
          toast.error(estErreurApi(erreur) ? erreur.message : "Le statut n'a pas pu être modifié."),
      },
    );
  }

  function enregistrerObservations() {
    modifierObservations.mutate(
      { observations: observationsAffichees || undefined, prochaineRelanceLe: relanceAffichee || undefined },
      {
        onSuccess: () => toast.success("Observations enregistrées."),
        onError: (erreur) =>
          toast.error(estErreurApi(erreur) ? erreur.message : "Les observations n'ont pas pu être enregistrées."),
      },
    );
  }

  return (
    <CoquilleApplication titre="Dossier CNPS">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              ← Retour
            </Button>
            <h1>Dossier CNPS : {dossier.offreLibelle}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-texte-doux">
              <span className="ref">{formaterMatricule(dossier.adherentMatricule)}</span>
              {dossier.adherentNomComplet && <span>{dossier.adherentNomComplet}</span>}
              {dossier.numeroCnps && <span className="ref">CNPS : {dossier.numeroCnps}</span>}
              <BadgeStatut domaine="dossierPrestationCnps" code={dossier.statut} />
            </div>
          </div>

          {peutChangerStatut && transitionsPossibles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {transitionsPossibles.map((cible, indice) => (
                <Button
                  key={cible}
                  variant={indice === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTransitionEnCours(cible)}
                >
                  {LIBELLES_TRANSITION[cible]}
                </Button>
              ))}
            </div>
          )}
        </div>

        {dossier.motifRejet && (
          <Alerte teinte="danger" titre="Dossier rejeté par la CNPS">
            <p>{dossier.motifRejet}</p>
          </Alerte>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pièces du dossier</CardTitle>
          </CardHeader>
          <CardContent>
            <ListePiecesDossierPrestation dossier={dossier} peutGerer={peutGerer} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates et suivi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-texte-doux-fort">Date dépôt à la COSITI</p>
                <p className="text-sm text-texte">{formaterDate(dossier.dateDepot)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-texte-doux-fort">Date transmission CNPS</p>
                <p className="text-sm text-texte">{formaterDate(dossier.dateTransmissionCnps)}</p>
              </div>
              {peutGerer ? (
                <div className="space-y-1.5">
                  <Label htmlFor="prochaine-relance">Prochaine relance</Label>
                  <Input
                    id="prochaine-relance"
                    type="date"
                    value={relanceAffichee}
                    onChange={(evenement) => setProchaineRelanceLe(evenement.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold uppercase text-texte-doux-fort">Prochaine relance</p>
                  <p className="text-sm text-texte">{formaterDate(dossier.prochaineRelanceLe)}</p>
                </div>
              )}
            </div>

            {peutGerer && (
              <div className="space-y-1.5">
                <Label htmlFor="observations">Observations administratives &amp; suivi</Label>
                <Textarea
                  id="observations"
                  rows={3}
                  value={observationsAffichees}
                  onChange={(evenement) => setObservations(evenement.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={modifierObservations.isPending}
                  onClick={enregistrerObservations}
                >
                  {modifierObservations.isPending ? "Enregistrement…" : "Enregistrer les observations"}
                </Button>
              </div>
            )}
            {!peutGerer && dossier.observations && (
              <div>
                <p className="text-xs font-semibold uppercase text-texte-doux-fort">Observations</p>
                <p className="text-sm text-texte">{dossier.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Journal d'activité du dossier</CardTitle>
          </CardHeader>
          <CardContent>
            <JournalActiviteDossier entrees={journal ?? []} />
          </CardContent>
        </Card>
      </div>

      <DialogueConfirmation
        ouvert={!!transitionEnCours}
        onOuvertChange={(ouvert) => !ouvert && setTransitionEnCours(null)}
        titre={transitionEnCours ? LIBELLES_TRANSITION[transitionEnCours] : ""}
        description="Ce changement de statut est historisé et audité."
        motifRequis={motifObligatoire}
        libelleMotif="Motif du rejet CNPS"
        enCours={changerStatut.isPending}
        onConfirmer={confirmerTransition}
      />
    </CoquilleApplication>
  );
}
