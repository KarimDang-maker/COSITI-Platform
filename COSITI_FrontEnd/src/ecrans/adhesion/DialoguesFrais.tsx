import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, OctagonAlert, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alerte } from "@/components/cositi/alerte";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { ChampDate } from "@/components/cositi/champ-date";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { useAuth, usePermission } from "@/auth/ContexteAuth";
import { useAgents } from "@/hooks/useOrganisation";
import {
  useEnregistrerFraisAdhesion,
  useResoudreAnomalieFrais,
  useSignalerAnomalieFrais,
  useValiderFraisAdhesion,
} from "@/hooks/useAdhesion";
import type { FraisAdhesion } from "@/api/adhesion";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateLongue, formaterEcart, formaterMontant } from "@/lib/format";
import { aujourdhui } from "@/ecrans/cotisations/dates";

/** Montant saisi en texte : entier ou décimal positif (virgule ou point), sans séparateur de milliers. */
function analyserMontant(saisie: string): number | null {
  const nettoye = saisie.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(nettoye)) return null;
  const valeur = Number(nettoye);
  return valeur > 0 ? valeur : null;
}

/**
 * Enregistrement du frais d'adhésion collecté par un agent (Gestionnaire, `FRAIS_ADHESION:ENREGISTRER`). Le
 * montant attendu est celui du serveur (`montantRequis`, paramètre `MONTANT_INSCRIPTION`) : il est proposé, jamais
 * calculé. Un montant reçu différent est accepté et signalé par le serveur comme écart. Deux étapes : saisie puis
 * relecture en grands chiffres. La clé d'idempotence est conservée après une erreur réseau : un second envoi rend
 * le frais déjà créé au lieu d'en créer un autre.
 */
export function DialogueEnregistrerFrais({
  adherentId,
  designation,
  montantRequis,
  agentParDefaut,
  ouvert,
  onOuvertChange,
}: {
  adherentId: string;
  designation: string;
  montantRequis: number;
  agentParDefaut?: string | null;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  const enregistrer = useEnregistrerFraisAdhesion(adherentId);
  const { data: agents, isLoading: chargementAgents } = useAgents(ouvert);
  const [agentId, setAgentId] = useState<string | undefined>(agentParDefaut ?? undefined);
  const [montant, setMontant] = useState(String(montantRequis));
  const [dateCollecte, setDateCollecte] = useState(aujourdhui());
  const [commentaire, setCommentaire] = useState("");
  const [etape, setEtape] = useState<"saisie" | "relecture">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);
  const [cle, setCle] = useState(() => crypto.randomUUID());
  const valeur = analyserMontant(montant);
  const agent = agents?.find((a) => a.id === agentId);
  const different = valeur !== null && valeur !== montantRequis;

  function fermer(valeurOuvert: boolean) {
    if (!valeurOuvert) {
      setAgentId(agentParDefaut ?? undefined);
      setMontant(String(montantRequis));
      setDateCollecte(aujourdhui());
      setCommentaire("");
      setEtape("saisie");
      setErreur(null);
      setCle(crypto.randomUUID());
    }
    onOuvertChange(valeurOuvert);
  }

  async function confirmer() {
    if (!agentId || valeur === null || enregistrer.isPending) return;
    setErreur(null);
    try {
      await enregistrer.mutateAsync({
        agentId,
        montantRecu: valeur,
        dateCollecte,
        commentaire: commentaire.trim() || undefined,
        cleIdempotence: cle,
      });
      toast.success("Frais d'adhésion enregistré. Il attend la validation de l'encaissement par le DAF.");
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "Le frais n'a pas pu être enregistré.");
      setEtape("saisie");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer le frais d'adhésion</DialogTitle>
          <DialogDescription>{designation}</DialogDescription>
        </DialogHeader>

        {etape === "saisie" ? (
          <div className="space-y-5">
            <p className="rounded-lg bg-fond p-3 text-sm">
              Montant attendu (fixé par la coopérative) : <strong className="chiffre">{formaterMontant(montantRequis)}</strong>
            </p>
            <ChampFormulaire id="frais-agent" libelle="Agent qui a collecté le frais" obligatoire aide="L'agent qui a reçu l'argent de l'adhérent sur le terrain.">
              {(attributs) => (
                <SelectRecherche
                  id={attributs.id}
                  ariaDescribedBy={attributs["aria-describedby"]}
                  options={(agents ?? []).map((a) => ({ valeur: a.id, libelle: `${a.nomComplet} (${a.codeAgent})` }))}
                  valeur={agentId}
                  onChange={setAgentId}
                  placeholder={chargementAgents ? "Chargement des agents…" : "Choisir un agent"}
                  texteVide="Aucun agent trouvé"
                  disabled={chargementAgents}
                />
              )}
            </ChampFormulaire>
            <ChampFormulaire
              id="frais-montant"
              libelle="Montant effectivement reçu (FCFA)"
              obligatoire
              aide={different ? "Ce montant diffère du montant attendu : l'écart sera enregistré et signalé." : undefined}
              erreur={montant !== "" && valeur === null ? "Saisissez un montant positif, sans séparateur (ex. 1000)." : undefined}
            >
              {(attributs) => <ChampMontant {...attributs} value={montant} onChange={(e) => setMontant(e.target.value)} />}
            </ChampFormulaire>
            <ChampFormulaire id="frais-date" libelle="Date de collecte" obligatoire>
              {(attributs) => (
                <ChampDate {...attributs} value={dateCollecte} max={aujourdhui()} onChange={(e) => setDateCollecte(e.target.value)} />
              )}
            </ChampFormulaire>
            <ChampFormulaire id="frais-commentaire" libelle="Commentaire" facultatif>
              {(attributs) => (
                <Textarea {...attributs} maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
              )}
            </ChampFormulaire>
          </div>
        ) : (
          <div className="space-y-4">
            <p>Relisez avant d'enregistrer :</p>
            <dl className="grid grid-cols-2 gap-4 rounded-lg bg-fond p-4">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Attendu</dt>
                <dd className="chiffre text-2xl font-bold">{formaterMontant(montantRequis)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Reçu</dt>
                <dd className="chiffre text-2xl font-bold">{formaterMontant(valeur)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Collecté par</dt>
                <dd className="font-semibold">
                  {agent ? `${agent.nomComplet} (${agent.codeAgent})` : "—"} — le {formaterDateLongue(dateCollecte)}
                </dd>
              </div>
            </dl>
            {different && (
              <Alerte teinte="attention" titre="Montant différent du montant attendu">
                <p>L'écart sera enregistré tel quel et signalé au DAF. Il ne sera jamais corrigé automatiquement.</p>
              </Alerte>
            )}
          </div>
        )}

        {erreur && (
          <Alerte teinte="danger" titre="Enregistrement refusé">
            <p>{erreur}</p>
          </Alerte>
        )}

        <DialogFooter>
          {etape === "saisie" ? (
            <>
              <Button variant="outline" onClick={() => fermer(false)}>
                Annuler
              </Button>
              <Button disabled={!agentId || valeur === null || !dateCollecte} onClick={() => setEtape("relecture")}>
                Relire avant d'enregistrer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtape("saisie")} disabled={enregistrer.isPending}>
                Retour
              </Button>
              <Button onClick={() => void confirmer()} disabled={enregistrer.isPending}>
                {enregistrer.isPending ? "Enregistrement…" : "Enregistrer le frais"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Résolution motivée d'une anomalie (DAF). Une correction du montant est tracée avant/après par le serveur. */
function DialogueResoudreAnomalie({
  frais,
  ouvert,
  onOuvertChange,
}: {
  frais: FraisAdhesion;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  const resoudre = useResoudreAnomalieFrais();
  const [resolution, setResolution] = useState("");
  const [montant, setMontant] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const valeur = montant === "" ? undefined : analyserMontant(montant);

  function fermer(valeurOuvert: boolean) {
    if (!valeurOuvert) {
      setResolution("");
      setMontant("");
      setErreur(null);
    }
    onOuvertChange(valeurOuvert);
  }

  async function confirmer() {
    if (!resolution.trim() || valeur === null) return;
    setErreur(null);
    try {
      await resoudre.mutateAsync({
        id: frais.id,
        corps: { resolution: resolution.trim(), montantRecuCorrige: valeur },
      });
      toast.success("Anomalie résolue. Le frais peut de nouveau être validé.");
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La résolution a échoué.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Résoudre l'anomalie</DialogTitle>
          <DialogDescription>
            Frais <span className="ref">{frais.reference}</span> — anomalie : {frais.motifAnomalie ?? "—"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <ChampFormulaire id="resolution-texte" libelle="Résolution" obligatoire aide="Ce qui a été constaté et décidé. Conservé dans l'historique.">
            {(attributs) => (
              <Textarea {...attributs} maxLength={1000} value={resolution} onChange={(e) => setResolution(e.target.value)} />
            )}
          </ChampFormulaire>
          <ChampFormulaire
            id="resolution-montant"
            libelle="Montant reçu corrigé (FCFA)"
            facultatif
            aide={`Actuellement enregistré : ${formaterMontant(frais.montantRecu)}. Laissez vide pour ne pas le modifier.`}
            erreur={valeur === null ? "Saisissez un montant positif, sans séparateur." : undefined}
          >
            {(attributs) => <ChampMontant {...attributs} value={montant} onChange={(e) => setMontant(e.target.value)} />}
          </ChampFormulaire>
        </div>
        {erreur && (
          <Alerte teinte="danger" titre="Résolution refusée">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => fermer(false)}>
            Annuler
          </Button>
          <Button disabled={!resolution.trim() || valeur === null || resoudre.isPending} onClick={() => void confirmer()}>
            {resoudre.isPending ? "Enregistrement…" : "Résoudre l'anomalie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Actions du DAF (et de la DGA pour le signalement) sur un frais. Masquage de confort uniquement : le serveur
 * refuse la validation par l'auteur de l'enregistrement (`FRAIS_ADHESION_AUTO_VALIDATION_INTERDITE`) et tout
 * passage d'état invalide.
 */
export function ActionsFrais({ frais, compact = false }: { frais: FraisAdhesion; compact?: boolean }) {
  const { utilisateur } = useAuth();
  const peutValider = usePermission("FRAIS_ADHESION:VALIDER");
  const peutSignaler = usePermission("FRAIS_ADHESION:SIGNALER");
  const valider = useValiderFraisAdhesion();
  const signaler = useSignalerAnomalieFrais();
  const [validationOuverte, setValidationOuverte] = useState(false);
  const [anomalieOuverte, setAnomalieOuverte] = useState(false);
  const [resolutionOuverte, setResolutionOuverte] = useState(false);
  const estAuteur = !!utilisateur && frais.enregistrePar === utilisateur.id;
  const taille = compact ? "sm" : "default";

  const actions = {
    valider: peutValider && frais.statut === "ENREGISTRE" && !estAuteur,
    signaler: peutSignaler && frais.statut === "ENREGISTRE",
    resoudre: peutValider && frais.statut === "ANOMALIE" && !estAuteur,
  };
  if (!actions.valider && !actions.signaler && !actions.resoudre) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.valider && (
        <Button size={taille} onClick={() => setValidationOuverte(true)}>
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Valider l'encaissement
        </Button>
      )}
      {actions.signaler && (
        <Button size={taille} variant="outline" onClick={() => setAnomalieOuverte(true)}>
          <OctagonAlert className="size-4" aria-hidden="true" />
          Signaler une anomalie
        </Button>
      )}
      {actions.resoudre && (
        <Button size={taille} variant="outline" onClick={() => setResolutionOuverte(true)}>
          <Wrench className="size-4" aria-hidden="true" />
          Résoudre l'anomalie
        </Button>
      )}

      <DialogueConfirmation
        ouvert={validationOuverte}
        onOuvertChange={setValidationOuverte}
        titre="Valider l'encaissement"
        description={
          <div className="space-y-2">
            <p>
              Frais <span className="ref">{frais.reference}</span> — {frais.adherentNom ?? "adhérent"}, collecté par{" "}
              {frais.agentNom ?? "—"}.
            </p>
            <p>
              Attendu <strong className="chiffre">{formaterMontant(frais.montantAttendu)}</strong>, reçu{" "}
              <strong className="chiffre">{formaterMontant(frais.montantRecu)}</strong>
              {frais.ecart !== 0 && (
                <>
                  , écart <strong className="chiffre">{formaterEcart(frais.ecart)}</strong>
                </>
              )}
              .
            </p>
          </div>
        }
        libelleConfirmation="Valider"
        enCours={valider.isPending}
        onConfirmer={async () => {
          try {
            await valider.mutateAsync({ id: frais.id, version: frais.version });
            toast.success("Encaissement du frais d'adhésion validé.");
            setValidationOuverte(false);
          } catch (e) {
            toast.error(estErreurApi(e) ? e.message : "La validation a échoué.");
          }
        }}
      />
      <DialogueConfirmation
        ouvert={anomalieOuverte}
        onOuvertChange={setAnomalieOuverte}
        titre="Signaler une anomalie"
        description={
          <p>
            Frais <span className="ref">{frais.reference}</span>. Le DAF et l'auteur de l'enregistrement seront prévenus ; le
            frais ne pourra pas être validé avant résolution.
          </p>
        }
        motifRequis
        libelleMotif="Motif de l'anomalie"
        varianteDestructive
        libelleConfirmation="Signaler"
        enCours={signaler.isPending}
        onConfirmer={async (motif) => {
          try {
            await signaler.mutateAsync({ id: frais.id, motif: motif ?? "" });
            toast.success("Anomalie signalée.");
            setAnomalieOuverte(false);
          } catch (e) {
            toast.error(estErreurApi(e) ? e.message : "Le signalement a échoué.");
          }
        }}
      />
      {actions.resoudre && (
        <DialogueResoudreAnomalie frais={frais} ouvert={resolutionOuverte} onOuvertChange={setResolutionOuverte} />
      )}
    </div>
  );
}
