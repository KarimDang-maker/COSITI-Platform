import { useState, type ReactNode } from "react";
import { PERMISSION_FINANCES } from "@/lib/acces";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { BarreProgression } from "@/components/cositi/barre-progression";
import { EtatVide } from "@/components/cositi/etat-vide";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth, usePermission } from "@/auth/ContexteAuth";
import {
  useAnnulerPaiement,
  useConfirmerParChefPaiement,
  useAffectationsPaiement,
  useHistoriqueStatutsPaiement,
  usePaiement,
  useRejeterPaiement,
  useSignalerIncoherencePaiement,
  useSoumettrePaiement,
  useValiderPaiement,
} from "@/hooks/usePaiements";
import { useAdherent, useResumeCotisations } from "@/hooks/useAdherents";
import { useAgents } from "@/hooks/useOrganisation";
import { estErreurApi } from "@/api/erreurs";
import type { Paiement } from "@/api/paiements";
import {
  formaterDate,
  formaterDateHeure,
  formaterMontant,
  formaterNomComplet,
  formaterNombre,
  formaterTelephone,
} from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";
import { DialogueCorrigerPaiement } from "@/ecrans/cotisations/DialogueCorrigerPaiement";
import { DialogueRecu } from "@/ecrans/cotisations/DialogueRecu";
import { BandeauWorkflow, HistoriqueValidation } from "@/ecrans/workflow/BandeauWorkflow";
import { DialogueDemandeModification } from "@/ecrans/workflow/DialogueDemandeModification";
import { useStatutValidation } from "@/hooks/useWorkflow";

type DialogueOuvert = "soumission" | "validation" | "rejet" | "correction" | "demandeCorrection" | "annulation" | "incoherence" | "recu" | null;

/**
 * Fiche d'une cotisation (#8) et ses actions (#14 soumettre, #16 valider, #17 rejeter, #19 corriger,
 * annuler, signaler une incohérence, confirmation du Chef). Seules les actions que le statut courant rend
 * possibles sont proposées, selon les permissions de `GET /auth/moi` ; le serveur reste seul juge des
 * transitions et refuse toute action hors règle — son message est affiché tel quel.
 */
export function DetailPaiement() {
  const { id } = useParams<{ id: string }>();
  const { data: paiement, isLoading, isError, error } = usePaiement(id);

  if (isLoading) {
    return (
      <CoquilleApplication titre="Détail du paiement">
        <Skeleton className="h-64 w-full" />
      </CoquilleApplication>
    );
  }

  if (isError || !paiement) {
    const introuvable = estErreurApi(error) && error.statut === 404;
    return (
      <CoquilleApplication titre="Détail du paiement">
        <Alerte teinte="danger" titre={introuvable ? "Paiement introuvable" : "Impossible de charger ce paiement"}>
          <p>
            {introuvable
              ? "Ce paiement n'existe pas ou ne fait pas partie de votre périmètre."
              : estErreurApi(error)
                ? error.message
                : "Une erreur inattendue est survenue."}
          </p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  return <ContenuPaiement paiement={paiement} />;
}

function ContenuPaiement({ paiement }: { paiement: Paiement }) {
  const peutOuvrirJournal = usePermission(PERMISSION_FINANCES);
  const { utilisateur } = useAuth();
  const peutCreer = usePermission("PAIEMENT:CREER");
  const peutValider = usePermission("PAIEMENT:VALIDER");
  const peutCorriger = usePermission("PAIEMENT:CORRIGER");
  const peutAnnuler = usePermission("PAIEMENT:ANNULER");
  const peutSignalerIncoherence = usePermission("PAIEMENT:SIGNALER_INCOHERENCE");
  // UC-CHEF-10 : confirmation hiérarchique du Chef, distincte de « Valider »
  // (permission, rôle et endpoint différents — voir `api/paiements.ts`).
  const peutConfirmerChef = usePermission("PAIEMENT:CONFIRMER_CHEF");
  const peutLireDroits = usePermission("DROITS:LIRE");
  const peutLirePaiements = usePermission("PAIEMENT:LIRE");
  const peutLireResume = peutLireDroits && peutLirePaiements;
  const peutLireOrganisation = usePermission("ORGANISATION:LIRE");

  const { data: adherent } = useAdherent(paiement.adherentId);
  const { data: agents } = useAgents(peutLireOrganisation && !!paiement.agentEncaisseurId);
  const soumettre = useSoumettrePaiement();
  const valider = useValiderPaiement();
  const rejeter = useRejeterPaiement();
  const annuler = useAnnulerPaiement();
  const signaler = useSignalerIncoherencePaiement();
  const confirmerChef = useConfirmerParChefPaiement();
  const [dialogue, setDialogue] = useState<DialogueOuvert>(null);

  const nomAdherent = adherent ? formaterNomComplet(adherent.nom, adherent.prenoms) : "—";
  const agent = agents?.find((a) => a.id === paiement.agentEncaisseurId);
  // `creePar` est exposé par `PaiementDto`. Ce masquage n'est qu'un confort : l'API refuse de toute façon
  // l'auto-validation et l'auto-rejet (403) si l'action est malgré tout tentée.
  const estCreateur = !!paiement.creePar && !!utilisateur && paiement.creePar === utilisateur.identifiant;
  const statut = paiement.statut;
  const brouillon = statut === "BROUILLON";
  const aControler = statut === "A_CONTROLER";
  const incoherent = statut === "INCOHERENCE";

  // Workflow V19 : une cotisation soumise ou validée ne se corrige plus directement (409
  // PAIEMENT_CORRECTION_PAR_DEMANDE) ; la correction passe par une demande validée par le DAF. Tant qu'une
  // demande est ouverte, la validation est refusée par le serveur (PAIEMENT_DEMANDE_CORRECTION_EN_COURS).
  const { data: etatWorkflow } = useStatutValidation("PAIEMENT", paiement.id);
  const correctionEnCours = !!etatWorkflow?.demandeOuverte;
  const corrigeableParDemande = aControler || incoherent || statut === "VALIDE";

  const actionPossible = {
    soumettre: peutCreer && brouillon,
    valider: peutValider && aControler,
    rejeter: peutValider && (aControler || incoherent),
    corriger: brouillon && (peutCorriger || (peutCreer && estCreateur)),
    demanderCorrection: (peutCorriger || peutCreer) && corrigeableParDemande && !correctionEnCours,
    annuler: peutAnnuler && statut !== "ANNULE" && statut !== "REJETE",
    signaler: peutSignalerIncoherence && aControler,
    confirmerChef: peutConfirmerChef,
  };

  function fermer(ouvert: boolean) {
    if (!ouvert) setDialogue(null);
  }

  /** Résumé de contrôle, toujours rappelé dans les confirmations (`docs/02_DESIGN_SYSTEM.md §9.1`). */
  const rappelValeurs = (
    <dl className="grid grid-cols-2 gap-2 text-left text-sm">
      <dt className="font-semibold">Reçu</dt>
      <dd className="ref">{paiement.numeroRecu}</dd>
      <dt className="font-semibold">Adhérent</dt>
      <dd>
        {nomAdherent} {adherent && <span className="ref">({adherent.matricule})</span>}
      </dd>
      <dt className="font-semibold">Montant</dt>
      <dd className="chiffre font-bold">{formaterMontant(paiement.montant)}</dd>
      {paiement.montantSecuriteSociale !== null && paiement.montantSecuriteSociale !== undefined && (
        <>
          <dt className="font-semibold">Sécurité Sociale / Épargne</dt>
          <dd className="chiffre">
            {formaterMontant(paiement.montantSecuriteSociale)} / {formaterMontant(paiement.montantEpargne ?? 0)}
          </dd>
        </>
      )}
      <dt className="font-semibold">Date</dt>
      <dd>{formaterDate(paiement.datePaiement)}</dd>
      <dt className="font-semibold">Mode</dt>
      <dd>
        <BadgeStatut domaine="modePaiement" code={paiement.modePaiement} />
      </dd>
      <dt className="font-semibold">Référence</dt>
      <dd className="ref">{paiement.referenceTransaction ?? "—"}</dd>
    </dl>
  );

  function boutonReserveAuteur(libelle: string, raison: string, action: () => void, variante: "default" | "destructive" | "outline") {
    if (estCreateur) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant={variante} disabled>
                {libelle}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{raison}</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Button variant={variante} onClick={action}>
        {libelle}
      </Button>
    );
  }

  return (
    <CoquilleApplication titre="Détail du paiement">
      <div className="space-y-6">
        <EnTetePage
          titre={<>Paiement {paiement.numeroRecu}</>}
          description={nomAdherent}
          statut={<BadgeStatut domaine="paiement" code={statut} />}
          // V23 : hors DAF, le journal financier n'est pas accessible — retour vers la fiche de l'adhérent.
          filAriane={
            peutOuvrirJournal
              ? [{ libelle: "Cotisations", chemin: "/cotisations" }, { libelle: "Détail du paiement" }]
              : [{ libelle: "Fiche adhérent", chemin: `/adherents/${paiement.adherentId}` }, { libelle: "Détail du paiement" }]
          }
          actions={
            <>
              {/* Reçu imprimable : toute personne qui peut lire la cotisation (PAIEMENT:LIRE + périmètre). */}
              <Button variant="outline" onClick={() => setDialogue("recu")}>
                Reçu
              </Button>
              {actionPossible.soumettre && <Button onClick={() => setDialogue("soumission")}>Soumettre au contrôle</Button>}
              {actionPossible.valider && correctionEnCours && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button disabled>Valider</Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Une demande de correction est en cours : elle doit être traitée d'abord.</TooltipContent>
                </Tooltip>
              )}
              {actionPossible.valider &&
                !correctionEnCours &&
                boutonReserveAuteur(
                  "Valider",
                  "Vous ne pouvez pas valider un paiement que vous avez vous-même saisi.",
                  () => setDialogue("validation"),
                  "default",
                )}
              {actionPossible.rejeter &&
                boutonReserveAuteur(
                  "Rejeter",
                  "Vous ne pouvez pas rejeter un paiement que vous avez vous-même saisi.",
                  () => setDialogue("rejet"),
                  "destructive",
                )}
              {actionPossible.corriger && (
                <Button variant="outline" onClick={() => setDialogue("correction")}>
                  Modifier
                </Button>
              )}
              {actionPossible.demanderCorrection && (
                <Button variant="outline" onClick={() => setDialogue("demandeCorrection")}>
                  Demander une correction
                </Button>
              )}
              {actionPossible.annuler && (
                <Button variant="destructive" onClick={() => setDialogue("annulation")}>
                  Annuler
                </Button>
              )}
              {actionPossible.signaler && (
                <Button variant="destructive" onClick={() => setDialogue("incoherence")}>
                  Signaler une incohérence
                </Button>
              )}
              {actionPossible.confirmerChef &&
                (paiement.confirmeParChefId || statut === "ANNULE" || statut === "INCOHERENCE" || statut === "REJETE" ? (
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
                        : "Un paiement annulé, rejeté ou incohérent ne peut pas être confirmé par le Chef."}
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
            </>
          }
        />

        <BandeauWorkflow
          typeEntite="PAIEMENT"
          entiteId={paiement.id}
          designation={`Paiement ${paiement.numeroRecu}`}
          onDemanderModification={actionPossible.demanderCorrection ? () => setDialogue("demandeCorrection") : undefined}
          libelleDemandeModification="Demander une correction"
        />
        {brouillon && (
          <Alerte teinte="info" titre="Brouillon">
            <p>Ce paiement n'est pas encore dans la file de contrôle : son auteur doit le soumettre.</p>
          </Alerte>
        )}
        {incoherent && paiement.motifIncoherence && (
          <Alerte teinte="danger" titre="Incohérence signalée par le DAF">
            <p>{paiement.motifIncoherence}</p>
          </Alerte>
        )}
        {statut === "REJETE" && (
          <Alerte teinte="danger" titre="Paiement rejeté">
            <p>{paiement.motifRejet ?? "Motif non communiqué."}</p>
            {paiement.rejeteLe && <p className="mt-1 text-sm">Rejeté le {formaterDateHeure(paiement.rejeteLe)}.</p>}
          </Alerte>
        )}

        <CarteSection titre="Informations">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LigneChamp libelle="Montant" valeur={<span className="chiffre text-lg font-bold">{formaterMontant(paiement.montant)}</span>} />
            {/* V22 : répartition enregistrée avec la cotisation ; non créditée tant que la cotisation n'est pas validée. */}
            {paiement.montantSecuriteSociale !== null && paiement.montantSecuriteSociale !== undefined && (
              <LigneChamp libelle="Sécurité Sociale" valeur={<span className="chiffre">{formaterMontant(paiement.montantSecuriteSociale)}</span>} />
            )}
            {paiement.montantEpargne !== null && paiement.montantEpargne !== undefined && (
              <LigneChamp libelle="Épargne" valeur={<span className="chiffre">{formaterMontant(paiement.montantEpargne)}</span>} />
            )}
            <LigneChamp libelle="Date du paiement" valeur={formaterDate(paiement.datePaiement)} />
            <LigneChamp libelle="Mode de paiement" valeur={<BadgeStatut domaine="modePaiement" code={paiement.modePaiement} />} />
            <LigneChamp libelle="Référence de transaction" valeur={<span className="ref">{paiement.referenceTransaction ?? "—"}</span>} />
            <LigneChamp
              libelle="Adhérent"
              valeur={
                adherent ? (
                  <Link to={`/adherents/${adherent.id}`} className="font-medium text-primaire underline underline-offset-2">
                    {nomAdherent} <span className="ref">({adherent.matricule})</span>
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <LigneChamp libelle="Téléphone" valeur={adherent ? formaterTelephone(adherent.telephonePrincipal) : "—"} />
            <LigneChamp
              libelle="Agent encaisseur"
              valeur={
                agent ? (
                  <Link to={`/agents/${agent.id}`} className="font-medium text-primaire underline underline-offset-2">
                    {agent.nomComplet}
                  </Link>
                ) : paiement.agentEncaisseurId ? (
                  "Agent renseigné"
                ) : (
                  "Aucun"
                )
              }
            />
            <LigneChamp
              libelle="Saisi par"
              valeur={`${paiement.creePar ?? "—"}${paiement.creeLe ? ` · ${formaterDateHeure(paiement.creeLe)}` : ""}`}
            />
            <LigneChamp
              libelle="Confirmation hiérarchique (Chef)"
              valeur={paiement.confirmeLe ? `Confirmée le ${formaterDateHeure(paiement.confirmeLe)}` : "Non confirmée"}
            />
          </dl>
        </CarteSection>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {peutLireResume && <ResumeAdherent adherentId={paiement.adherentId} />}
          <HistoriqueStatuts paiementId={paiement.id} />
        </div>

        {(paiement.statut === "VALIDE" || paiement.statut === "RAPPROCHE") && <RepartitionVersement paiementId={paiement.id} />}

        <HistoriqueValidation typeEntite="PAIEMENT" entiteId={paiement.id} />
      </div>

      <DialogueRecu paiementId={paiement.id} ouvert={dialogue === "recu"} onOuvertChange={(o) => !o && setDialogue(null)} />

      <DialogueConfirmation
        ouvert={dialogue === "soumission"}
        onOuvertChange={fermer}
        titre="Soumettre au contrôle"
        description={
          <div className="space-y-3">
            <p>
              Le paiement passera au statut <BadgeStatut domaine="paiement" code="A_CONTROLER" /> et ne sera plus modifiable par son
              auteur.
            </p>
            {rappelValeurs}
          </div>
        }
        libelleConfirmation="Soumettre"
        enCours={soumettre.isPending}
        onConfirmer={async () => {
          await executer(() => soumettre.mutateAsync(paiement.id), "Paiement soumis au contrôle.", "La soumission a échoué.");
        }}
      />

      <DialogueConfirmation
        ouvert={dialogue === "validation"}
        onOuvertChange={fermer}
        titre="Valider ce paiement"
        description={
          <div className="space-y-3">
            <p>Contrôlez chaque valeur avant de valider. La validation impute les droits de l'adhérent et est journalisée.</p>
            {rappelValeurs}
          </div>
        }
        libelleConfirmation="Confirmer la validation"
        enCours={valider.isPending}
        onConfirmer={async () => {
          await executer(() => valider.mutateAsync(paiement.id), "Paiement validé.", "La validation a échoué.");
        }}
      />

      <DialogueConfirmation
        ouvert={dialogue === "rejet"}
        onOuvertChange={fermer}
        titre="Rejeter ce paiement"
        description={
          <div className="space-y-3">
            <p>Le rejet est définitif. Le motif sera visible dans l'historique du paiement.</p>
            {rappelValeurs}
          </div>
        }
        motifRequis
        libelleMotif="Motif du rejet"
        libelleConfirmation="Rejeter le paiement"
        varianteDestructive
        enCours={rejeter.isPending}
        onConfirmer={async (motif) => {
          await executer(() => rejeter.mutateAsync({ id: paiement.id, motif: motif ?? "" }), "Paiement rejeté.", "Le rejet a échoué.");
        }}
      />

      {dialogue === "demandeCorrection" && (
        <DialogueDemandeModification
          ouvert
          onOuvertChange={fermer}
          typeEntite="PAIEMENT"
          operation="PAIEMENT_CORRECTION"
          entiteId={paiement.id}
          designation={`Paiement ${paiement.numeroRecu} — ${nomAdherent}`}
          valeursActuelles={{
            montant: String(paiement.montant),
            datePaiement: paiement.datePaiement,
            modePaiement: paiement.modePaiement,
            referenceTransaction: paiement.referenceTransaction,
          }}
          version={paiement.version}
          cibleDocument={{ paiementId: paiement.id }}
        />
      )}
      {/* Monté à chaque ouverture : le formulaire repart des valeurs actuelles du paiement. */}
      {dialogue === "correction" && (
        <DialogueCorrigerPaiement ouvert onOuvertChange={fermer} paiement={paiement} nomAdherent={nomAdherent} />
      )}

      <DialogueConfirmation
        ouvert={dialogue === "annulation"}
        onOuvertChange={fermer}
        titre="Annuler ce paiement"
        description={
          <p>
            Paiement <strong>{formaterMontant(paiement.montant)}</strong> du <strong>{formaterDate(paiement.datePaiement)}</strong> pour{" "}
            <strong>{nomAdherent}</strong>.
          </p>
        }
        motifRequis
        libelleMotif="Motif de l'annulation"
        libelleConfirmation="Annuler le paiement"
        varianteDestructive
        enCours={annuler.isPending}
        onConfirmer={async (motif) => {
          await executer(() => annuler.mutateAsync({ id: paiement.id, motif: motif ?? "" }), "Paiement annulé.", "L'annulation a échoué.");
        }}
      />

      <DialogueConfirmation
        ouvert={dialogue === "incoherence"}
        onOuvertChange={fermer}
        titre="Signaler une incohérence"
        description={rappelValeurs}
        motifRequis
        libelleMotif="Motif de l'incohérence"
        libelleConfirmation="Signaler l'incohérence"
        varianteDestructive
        enCours={signaler.isPending}
        onConfirmer={async (motif) => {
          await executer(
            () => signaler.mutateAsync({ id: paiement.id, motif: motif ?? "" }),
            "Incohérence signalée.",
            "Le signalement a échoué.",
          );
        }}
      />
    </CoquilleApplication>
  );

  async function executer(action: () => Promise<unknown>, succes: string, echec: string) {
    try {
      await action();
      toast.success(succes);
      setDialogue(null);
    } catch (e) {
      toast.error(estErreurApi(e) ? e.message : echec);
    }
  }
}

/**
 * Situation de l'adhérent au regard de ses cotisations (#20 total validé, #21 en attente, #22 reste avant le
 * seuil, #23 progression, #26 résumé) — valeurs du serveur, jamais recalculées. L'éligibilité se lit dans le
 * libellé fourni par l'API, pas dans la longueur de la barre.
 */
function ResumeAdherent({ adherentId }: { adherentId: string }) {
  const peutOuvrirJournal = usePermission(PERMISSION_FINANCES);
  const { data, isLoading, isError } = useResumeCotisations(adherentId);
  return (
    <CarteSection titre="Cotisations de l'adhérent" contenuClassName="space-y-4">
      {isLoading && <Skeleton className="h-24 w-full" />}
      {isError && <p className="text-sm text-texte-doux-fort">Le résumé des cotisations n'est pas disponible.</p>}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-4">
            <LigneChamp libelle="Total validé" valeur={<span className="chiffre">{formaterMontant(data.montantValide)}</span>} />
            <LigneChamp
              libelle="En attente de contrôle"
              valeur={
                peutOuvrirJournal ? (
                  <Link
                    to={`/cotisations?adherentId=${adherentId}&statut=A_CONTROLER`}
                    className="chiffre font-medium text-primaire underline underline-offset-2"
                  >
                    {formaterMontant(data.montantEnAttente)}
                  </Link>
                ) : (
                  <span className="chiffre">{formaterMontant(data.montantEnAttente)}</span>
                )
              }
            />
            <LigneChamp libelle="Reste avant le seuil CNPS" valeur={<span className="chiffre">{formaterMontant(data.resteAvantSeuil)}</span>} />
            <LigneChamp libelle="Éligibilité CNPS" valeur={data.eligibleCnps ? "Seuil atteint" : "Seuil non atteint"} />
          </dl>
          {data.pourcentageProgression !== null && (
            <BarreProgression
              libelle="Progression vers le seuil CNPS"
              ratio={data.pourcentageProgression / 100}
              valeur={`${formaterNombre(data.pourcentageProgression)} %`}
              teinte={data.eligibleCnps ? "primaire" : "marque"}
            />
          )}
          <Link to={`/adherents/${adherentId}?onglet=cotisations`} className="text-sm font-medium text-primaire underline underline-offset-2">
            Voir la fiche de l'adhérent
          </Link>
        </>
      )}
    </CarteSection>
  );
}

/** Historique des statuts (#18) : transitions chronologiques avec date, acteur et motif. */
/** Libellés des règles de répartition renvoyées par le serveur ; une règle inconnue s'affiche telle quelle. */
const REGLES_REPARTITION: Readonly<Record<string, string>> = {
  SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE: "700 FCFA minimum pour la Sécurité sociale, le reste en Épargne (règle confirmée)",
};

/**
 * Répartition du versement entre composantes, calculée par le serveur à la validation (V21). Les montants et la
 * règle appliquée sont lus tels quels ; aucune ventilation n'est recalculée ici.
 */
function RepartitionVersement({ paiementId }: { paiementId: string }) {
  const { data, isLoading, isError } = useAffectationsPaiement(paiementId);
  let contenu: ReactNode = null;
  if (isLoading) contenu = <Skeleton className="h-16 w-full" />;
  else if (isError) contenu = <p className="text-sm text-texte-doux-fort">La répartition n'a pas pu être chargée.</p>;
  else if (data && data.length === 0) contenu = <EtatVide titre="Aucune répartition enregistrée" />;
  else if (data) {
    const regle = data.find((l) => l.regleAppliquee)?.regleAppliquee;
    contenu = (
      <div className="space-y-3">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Répartition du versement">
          {data.map((ligne) => (
            <div key={ligne.id} className="rounded-lg border border-bordure p-4">
              <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">
                {ligne.composanteLibelle ?? "Composante"}
              </dt>
              <dd className="chiffre text-2xl font-bold">{formaterMontant(ligne.montant)}</dd>
            </div>
          ))}
        </dl>
        {regle && <p className="text-sm text-texte-doux-fort">Règle appliquée : {REGLES_REPARTITION[regle] ?? regle}</p>}
      </div>
    );
  }
  return <CarteSection titre="Répartition du versement">{contenu}</CarteSection>;
}

function HistoriqueStatuts({ paiementId }: { paiementId: string }) {
  const { data, isLoading, isError } = useHistoriqueStatutsPaiement(paiementId);
  let contenu: ReactNode = null;
  if (isLoading) contenu = <Skeleton className="h-24 w-full" />;
  else if (isError) contenu = <p className="text-sm text-texte-doux-fort">L'historique n'a pas pu être chargé.</p>;
  else if (data && data.length === 0) contenu = <EtatVide titre="Aucune transition enregistrée" />;
  else if (data)
    contenu = (
      <ol className="relative space-y-4 border-l border-bordure pl-6" aria-label="Historique des statuts">
        {data.map((etape, index) => (
          <li key={`${etape.horodatage}-${index}`} className="relative">
            <span className="absolute top-1.5 left-[-1.9rem] size-3 rounded-full border-2 border-surface bg-primaire" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-2">
              <BadgeStatut domaine="operationPaiement" code={etape.typeOperation} />
              <time dateTime={etape.horodatage} className="text-sm text-texte-doux-fort">
                {formaterDateHeure(etape.horodatage)}
              </time>
            </div>
            {(etape.statutAvant || etape.statutApres) && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                {etape.statutAvant && <BadgeStatut domaine="paiement" code={etape.statutAvant} />}
                {etape.statutAvant && etape.statutApres && <span aria-label="devient">→</span>}
                {etape.statutApres && <BadgeStatut domaine="paiement" code={etape.statutApres} />}
              </p>
            )}
            <p className="mt-1 text-sm">
              Par <span className="font-semibold">{etape.acteur ?? "système"}</span>
            </p>
            {etape.motif && <p className="mt-1 text-sm text-texte-doux-fort">Motif : {etape.motif}</p>}
          </li>
        ))}
      </ol>
    );
  return <CarteSection titre="Historique des statuts">{contenu}</CarteSection>;
}
