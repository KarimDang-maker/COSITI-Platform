import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompteRendu, useControlerCompteRendu, useTransmettreCompteRendu } from "@/hooks/useComptesRendus";
import { useAuth } from "@/auth/ContexteAuth";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure, formaterMontant, formaterNombre, formaterPeriode } from "@/lib/format";

/**
 * `/comptes-rendus/:id` — Détail d'un compte rendu terrain ou consolidé (J8).
 *
 * Les actions proposées suivent le statut réel renvoyé par l'API, jamais une
 * copie locale du cycle de vie : transmettre n'apparaît que sur un brouillon
 * dont on est l'auteur, contrôler que sur un compte rendu transmis.
 */
export function FicheCompteRendu() {
  const { id } = useParams<{ id: string }>();
  const { utilisateur, aLaPermission } = useAuth();

  const { data: compteRendu, isLoading, isError, error } = useCompteRendu(id);
  const transmettre = useTransmettreCompteRendu();
  const controler = useControlerCompteRendu();

  const [transmissionOuverte, setTransmissionOuverte] = useState(false);
  const [controleOuvert, setControleOuvert] = useState(false);

  if (isLoading) {
    return (
      <CoquilleApplication titre="Compte rendu">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </CoquilleApplication>
    );
  }

  if (isError || !compteRendu) {
    return (
      <CoquilleApplication titre="Compte rendu">
        <Alerte teinte="danger" titre="Impossible de charger le compte rendu">
          <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  const estAuteur = utilisateur?.id === compteRendu.auteurUtilisateurId;
  const peutTransmettre = estAuteur && compteRendu.statut === "BROUILLON";
  const peutControler =
    aLaPermission("COMPTE_RENDU:CONTROLER") &&
    compteRendu.type === "TERRAIN" &&
    compteRendu.statut === "TRANSMIS" &&
    !estAuteur;

  // Préposition contractée ici, et non concaténée à l'affichage : les quatre usages ci-dessous
  // suivent tous un « à », et « à le Gestionnaire » s'affichait tel quel à l'écran.
  const destinataire = compteRendu.type === "CONSOLIDE" ? "à la DGA" : "au Gestionnaire des comptes";

  return (
    <CoquilleApplication titre="Compte rendu">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1>
              {compteRendu.type === "CONSOLIDE" ? "Compte rendu consolidé" : "Compte rendu terrain"}
            </h1>
            <div className="flex items-center gap-2">
              <BadgeStatut domaine="compteRendu" code={compteRendu.statut} />
              <span className="text-texte-doux">
                {formaterPeriode(compteRendu.periodeDebut, compteRendu.periodeFin)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {peutTransmettre && (
              <Button onClick={() => setTransmissionOuverte(true)}>Transmettre {destinataire}</Button>
            )}
            {peutControler && (
              <Button variant="outline" onClick={() => setControleOuvert(true)}>
                Contrôler
              </Button>
            )}
          </div>
        </div>

        {estAuteur && compteRendu.statut === "BROUILLON" && (
          <Alerte teinte="info" titre="Brouillon non transmis">
            <p>
              Ce compte rendu n'est visible que par vous. Il ne parviendra {destinataire} qu'après
              transmission.
            </p>
          </Alerte>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Activité déclarée</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Indicateur libelle="Visites" valeur={formaterNombre(compteRendu.nbVisites)} />
            <Indicateur
              libelle="Adhérents rencontrés"
              valeur={formaterNombre(compteRendu.nbAdherentsRencontres)}
            />
            <Indicateur
              libelle="Nouveaux adhérents"
              valeur={formaterNombre(compteRendu.nbAdherentsCrees)}
            />
            <Indicateur
              libelle="Paiements enregistrés"
              valeur={formaterNombre(compteRendu.nbPaiementsEnregistres)}
            />
            <Indicateur
              libelle="Montant collecté"
              valeur={formaterMontant(compteRendu.montantCollecte)}
            />
          </CardContent>
        </Card>

        {(compteRendu.synthese || compteRendu.difficultes) && (
          <Card>
            <CardHeader>
              <CardTitle>Observations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {compteRendu.synthese && (
                <div>
                  <p className="text-sm font-semibold">Synthèse</p>
                  <p className="whitespace-pre-line text-texte-doux">{compteRendu.synthese}</p>
                </div>
              )}
              {compteRendu.difficultes && (
                <div>
                  <p className="text-sm font-semibold">Difficultés remontées</p>
                  <p className="whitespace-pre-line text-texte-doux">{compteRendu.difficultes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {compteRendu.controleLe && (
          <Card>
            <CardHeader>
              <CardTitle>Contrôle du Gestionnaire des comptes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="whitespace-pre-line">{compteRendu.observationControle ?? "Sans observation."}</p>
              <p className="text-sm text-texte-doux">
                Contrôlé par {compteRendu.controlePar} le {formaterDateHeure(compteRendu.controleLe)}
              </p>
            </CardContent>
          </Card>
        )}

        {compteRendu.sourceIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Comptes rendus consolidés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-texte-doux">
                Les totaux ci-dessus sont la somme de ces {compteRendu.sourceIds.length} comptes rendus
                terrain, consultables un par un.
              </p>
              <ul className="list-disc space-y-1 pl-4">
                {compteRendu.sourceIds.map((sourceId) => (
                  <li key={sourceId}>
                    <Link className="underline" to={`/comptes-rendus/${sourceId}`}>
                      Compte rendu {sourceId.split("-")[0]}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <DialogueConfirmation
        ouvert={transmissionOuverte}
        onOuvertChange={setTransmissionOuverte}
        titre={`Transmettre ${destinataire}`}
        description={`Une fois transmis, ce compte rendu ne sera plus modifiable. Période ${formaterPeriode(compteRendu.periodeDebut, compteRendu.periodeFin)}, ${formaterMontant(compteRendu.montantCollecte)} collectés.`}
        libelleConfirmation="Transmettre"
        enCours={transmettre.isPending}
        onConfirmer={() =>
          transmettre.mutate(compteRendu.id, {
            onSuccess: () => {
              toast.success(`Compte rendu transmis ${destinataire}.`);
              setTransmissionOuverte(false);
            },
            onError: (erreur) =>
              toast.error(estErreurApi(erreur) ? erreur.message : "La transmission a échoué."),
          })
        }
      />

      <DialogueConfirmation
        ouvert={controleOuvert}
        onOuvertChange={setControleOuvert}
        titre="Contrôler ce compte rendu"
        description="Votre observation est conservée avec le compte rendu et son auteur en est informé."
        libelleConfirmation="Marquer contrôlé"
        motifRequis
        libelleMotif="Observation de contrôle"
        enCours={controler.isPending}
        onConfirmer={(observation) =>
          controler.mutate(
            { id: compteRendu.id, observation },
            {
              onSuccess: () => {
                toast.success("Compte rendu contrôlé.");
                setControleOuvert(false);
              },
              onError: (erreur) =>
                toast.error(estErreurApi(erreur) ? erreur.message : "Le contrôle a échoué."),
            },
          )
        }
      />
    </CoquilleApplication>
  );
}

function Indicateur({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <p className="text-sm text-texte-doux">{libelle}</p>
      <p className="chiffre text-2xl font-semibold">{valeur}</p>
    </div>
  );
}
