import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { ChampDate } from "@/components/cositi/champ-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/auth/ContexteAuth";
import { useAdherent, useAdherents } from "@/hooks/useAdherents";
import { useAgents } from "@/hooks/useOrganisation";
import { useEnregistrerPaiement, useVerifierDoublonPaiement } from "@/hooks/usePaiements";
import { estModeMobileMoney, type CorpsEnregistrementPaiement, type Paiement } from "@/api/paiements";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterMontant, formaterNomComplet } from "@/lib/format";
import { aujourdhui } from "@/ecrans/cotisations/dates";

const schema = z
  .object({
    adherentId: z.string().min(1, "L'adhérent est obligatoire."),
    datePaiement: z.string().min(1, "La date de paiement est obligatoire."),
    montant: z
      .string()
      .min(1, "Le montant est obligatoire.")
      .refine((v) => Number(v) > 0, "Le montant doit être strictement positif."),
    modePaiement: z.enum(["ESPECES", "ORANGE_MONEY", "MTN_MOMO", "VIREMENT"], {
      message: "Le mode de paiement est obligatoire.",
    }),
    referenceTransaction: z.string().trim().optional(),
    agentEncaisseurId: z.string().optional(),
  })
  .superRefine((valeurs, ctx) => {
    if (estModeMobileMoney(valeurs.modePaiement) && !valeurs.referenceTransaction) {
      ctx.addIssue({
        code: "custom",
        path: ["referenceTransaction"],
        message:
          "La référence de transaction est obligatoire pour un paiement Orange Money ou MTN MoMo. Saisissez-la depuis le message de confirmation reçu.",
      });
    }
  });

type Valeurs = z.infer<typeof schema>;

const CHAMPS_FORMULAIRE: readonly string[] = ["adherentId", "datePaiement", "montant", "modePaiement", "referenceTransaction"];

/** Type de paiement fixe en V1 : cet écran ne saisit que des cotisations (hors mandat : autres types de paiement). */
const TYPE_PAIEMENT = "COTISATION";

interface DoublonsEnAttente {
  readonly paiements: readonly Paiement[];
  readonly corps: CorpsEnregistrementPaiement;
  readonly brouillon: boolean;
}

/**
 * Saisie d'une cotisation (module cotisations, #9 à #14, #35). Les contrôles de forme préviennent
 * l'utilisateur ; le serveur refait tous les contrôles (adhérent, montant, date, référence, doublon) et
 * génère le numéro de reçu.
 */
export function NouveauPaiement() {
  const navigate = useNavigate();
  // Générée une seule fois au montage — aucune valeur de repli si `crypto.randomUUID` est indisponible :
  // un identifiant faible romprait la garantie d'idempotence sur une écriture financière.
  const [cleIdempotence] = useState(() => crypto.randomUUID());
  const peutLireOrganisation = usePermission("ORGANISATION:LIRE");
  const { data: adherents } = useAdherents({ taille: 200 });
  const { data: agents } = useAgents(peutLireOrganisation);
  const enregistrer = useEnregistrerPaiement();
  const verifierDoublon = useVerifierDoublonPaiement();
  const [doublons, setDoublons] = useState<DoublonsEnAttente | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<Valeurs>({ resolver: zodResolver(schema) });

  const modeSelectionne = watch("modePaiement");
  const adherentSelectionneId = watch("adherentId");
  // #12 : l'adhérent est identifié (nom, matricule, statut) avant l'envoi.
  const { data: adherentSelectionne } = useAdherent(adherentSelectionneId || undefined);
  const envoiEnCours = enregistrer.isPending || verifierDoublon.isPending;

  async function envoyer(corps: CorpsEnregistrementPaiement, brouillon: boolean) {
    try {
      // #35 : la même clé accompagne un nouvel essai après une erreur réseau — le serveur rend alors le
      // paiement déjà créé (200) au lieu d'en créer un second.
      const paiement = await enregistrer.mutateAsync({ corps, cleIdempotence, brouillon });
      // #10 : le numéro de reçu est généré par le serveur ; il n'est connu qu'ici.
      toast.success(
        brouillon
          ? `Brouillon ${paiement.numeroRecu} enregistré — à soumettre au contrôle.`
          : `Paiement ${paiement.numeroRecu} enregistré.`,
      );
      navigate(`/cotisations/${paiement.id}`);
    } catch (e) {
      if (estErreurApi(e) && e.champ && CHAMPS_FORMULAIRE.includes(e.champ)) {
        setError(e.champ as keyof Valeurs, { message: e.message });
      }
      // Sinon : affiché via `enregistrer.error` ci-dessous.
    }
  }

  async function soumettre(valeurs: Valeurs, brouillon: boolean) {
    if (envoiEnCours) return;
    const corps: CorpsEnregistrementPaiement = {
      adherentId: valeurs.adherentId,
      datePaiement: valeurs.datePaiement,
      montant: Number(valeurs.montant),
      modePaiement: valeurs.modePaiement,
      referenceTransaction: valeurs.referenceTransaction || undefined,
      typePaiement: TYPE_PAIEMENT,
      agentEncaisseurId: valeurs.agentEncaisseurId || undefined,
    };

    // #13 : contrôle de doublon serveur avant l'envoi. S'il échoue techniquement, l'enregistrement reste
    // possible : le serveur refait de toute façon le contrôle bloquant (référence déjà utilisée).
    try {
      const resultat = await verifierDoublon.mutateAsync({
        adherentId: corps.adherentId,
        datePaiement: corps.datePaiement,
        montant: corps.montant,
        modePaiement: corps.modePaiement,
        referenceTransaction: corps.referenceTransaction,
      });
      if (resultat.referenceDejaUtilisee) {
        setError("referenceTransaction", {
          message:
            "Cette référence de transaction est déjà enregistrée pour ce mode de paiement. Vérifiez le message de confirmation reçu.",
        });
        return;
      }
      if (resultat.doublonsPotentiels.length > 0) {
        setDoublons({ paiements: resultat.doublonsPotentiels, corps, brouillon });
        return;
      }
    } catch {
      // Contrôle préalable indisponible : le serveur tranche à l'enregistrement.
    }
    await envoyer(corps, brouillon);
  }

  return (
    <CoquilleApplication titre="Nouveau paiement">
      <div className="mx-auto max-w-2xl space-y-6">
        <EnTetePage
          titre="Nouveau paiement"
          filAriane={[{ libelle: "Cotisations", chemin: "/cotisations" }, { libelle: "Nouveau paiement" }]}
        />

        <CarteSection>
          <form onSubmit={(e) => void handleSubmit((v) => soumettre(v, false))(e)} className="space-y-5" noValidate>
            <ChampFormulaire id="adherentId" libelle="Adhérent" erreur={errors.adherentId?.message}>
              {(attributs) => (
                <Controller
                  control={control}
                  name="adherentId"
                  render={({ field }) => (
                    <SelectRecherche
                      id={attributs.id}
                      options={(adherents?.contenu ?? []).map((a) => ({
                        valeur: a.id,
                        // La réponse de liste porte `nomComplet`, pas `nom`/`prenoms` : le sélecteur
                        // d'adhérent n'affichait donc que le matricule.
                        libelle: `${a.matricule} — ${a.nomComplet}`,
                      }))}
                      valeur={field.value}
                      onChange={field.onChange}
                      ariaInvalid={attributs["aria-invalid"]}
                      ariaDescribedBy={attributs["aria-describedby"]}
                      placeholder="Sélectionner un adhérent"
                    />
                  )}
                />
              )}
            </ChampFormulaire>

            {adherentSelectionne && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-fond p-4" aria-live="polite">
                <strong>{formaterNomComplet(adherentSelectionne.nom, adherentSelectionne.prenoms)}</strong>
                <span className="ref">{adherentSelectionne.matricule}</span>
                <BadgeStatut domaine="adherent" code={adherentSelectionne.statut} />
                {adherentSelectionne.zoneLibelle && <span className="text-sm text-texte-doux-fort">{adherentSelectionne.zoneLibelle}</span>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChampFormulaire id="datePaiement" libelle="Date du paiement" erreur={errors.datePaiement?.message}>
                {(attributs) => <ChampDate {...attributs} max={aujourdhui()} {...register("datePaiement")} />}
              </ChampFormulaire>
              <ChampFormulaire id="montant" libelle="Montant (FCFA)" erreur={errors.montant?.message}>
                {(attributs) => <ChampMontant {...attributs} {...register("montant")} />}
              </ChampFormulaire>
            </div>

            <ChampFormulaire id="modePaiement" libelle="Mode de paiement" erreur={errors.modePaiement?.message}>
              {(attributs) => (
                <Controller
                  control={control}
                  name="modePaiement"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger {...attributs}>
                        <SelectValue placeholder="Sélectionner un mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ESPECES">Espèces</SelectItem>
                        <SelectItem value="ORANGE_MONEY">Orange Money</SelectItem>
                        <SelectItem value="MTN_MOMO">MTN MoMo</SelectItem>
                        <SelectItem value="VIREMENT">Virement</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </ChampFormulaire>

            {/* Mention « (obligatoire) / (facultative) » écrite dans le libellé plutôt que par les
                drapeaux de `ChampFormulaire` : elle dépend du mode choisi, et le féminin
                « facultative » s'accorde avec « référence ». */}
            <ChampFormulaire
              id="referenceTransaction"
              libelle={`Référence de transaction${
                modeSelectionne && estModeMobileMoney(modeSelectionne) ? " (obligatoire)" : " (facultative)"
              }`}
              erreur={errors.referenceTransaction?.message}
            >
              {(attributs) => <Input className="ref" {...attributs} {...register("referenceTransaction")} />}
            </ChampFormulaire>

            {peutLireOrganisation && (
              <ChampFormulaire id="agentEncaisseurId" libelle="Agent encaisseur (facultatif)">
                {(attributs) => (
                  <Controller
                    control={control}
                    name="agentEncaisseurId"
                    render={({ field }) => (
                      <SelectRecherche
                        id={attributs.id}
                        options={(agents ?? []).map((a) => ({ valeur: a.id, libelle: `${a.codeAgent} — ${a.nomComplet}` }))}
                        valeur={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Sélectionner un agent"
                      />
                    )}
                  />
                )}
              </ChampFormulaire>
            )}

            {enregistrer.isError && (
              <Alerte teinte="danger">
                <p>{estErreurApi(enregistrer.error) ? enregistrer.error.message : "L'enregistrement a échoué."}</p>
              </Alerte>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={envoiEnCours} className="sm:flex-1">
                {envoiEnCours ? "Enregistrement en cours…" : "Enregistrer le paiement"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={envoiEnCours}
                onClick={() => void handleSubmit((v) => soumettre(v, true))()}
              >
                Enregistrer comme brouillon
              </Button>
            </div>
            <p className="text-xs text-texte-doux">
              Un paiement enregistré entre directement dans la file de contrôle. Un brouillon reste modifiable par son auteur et
              n'y entre qu'une fois soumis.
            </p>
          </form>
        </CarteSection>
      </div>

      <DialogueConfirmation
        ouvert={doublons !== null}
        onOuvertChange={(ouvert) => {
          if (!ouvert) setDoublons(null);
        }}
        titre="Paiement similaire déjà enregistré"
        description={
          <div className="space-y-2 text-left">
            <p>
              Le serveur signale {doublons?.paiements.length ?? 0} paiement(s) du même adhérent, à la même date, du même montant et
              par le même mode. Vérifiez qu'il ne s'agit pas d'une double saisie.
            </p>
            <ul className="space-y-1">
              {doublons?.paiements.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="ref">{p.numeroRecu}</span> — {formaterDate(p.datePaiement)} —{" "}
                  <span className="chiffre">{formaterMontant(p.montant)}</span>
                  <BadgeStatut domaine="paiement" code={p.statut} />
                </li>
              ))}
            </ul>
          </div>
        }
        libelleConfirmation="Enregistrer quand même"
        enCours={enregistrer.isPending}
        onConfirmer={async () => {
          if (!doublons) return;
          const { corps, brouillon } = doublons;
          setDoublons(null);
          await envoyer(corps, brouillon);
        }}
      />
    </CoquilleApplication>
  );
}
