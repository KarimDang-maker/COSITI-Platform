import { useRef, useState } from "react";
import { PERMISSION_FINANCES } from "@/lib/acces";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";
import { Search } from "lucide-react";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { ChampDate } from "@/components/cositi/champ-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/auth/ContexteAuth";
import { usePacks } from "@/hooks/useAdherents";
import { fraisAdhesionValide, useFraisAdhesionAdherent } from "@/hooks/useAdhesion";
import { useAgents } from "@/hooks/useOrganisation";
import { useContexteCotisation, useEnregistrerPaiement, useVerifierDoublonPaiement } from "@/hooks/usePaiements";
import {
  estModeMobileMoney,
  type ContexteCotisation,
  type CorpsEnregistrementPaiement,
  type Paiement,
} from "@/api/paiements";
import { estErreurApi } from "@/api/erreurs";
import { definitionStatut } from "@/lib/statuts";
import { cn } from "@/lib/utils";
import { formaterDate, formaterMontant, formaterNomComplet } from "@/lib/format";
import { aujourdhui } from "@/ecrans/cotisations/dates";

/** Type de paiement fixe en V1 : cet écran ne saisit que des cotisations (hors mandat : autres types de paiement). */
const TYPE_PAIEMENT = "COTISATION";

const CHAMPS_FORMULAIRE: readonly string[] = [
  "datePaiement",
  "montant",
  "montantSecuriteSociale",
  "montantEpargne",
  "packId",
  "modePaiement",
  "referenceTransaction",
];

/** Montant saisi en texte (chiffres, virgule ou point) ; `null` si la saisie n'est pas un nombre. */
function lireMontant(saisie: string | undefined): number | null {
  const nettoye = (saisie ?? "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(nettoye)) return null;
  return Number(nettoye);
}

/**
 * Schéma construit à partir des minimums **renvoyés par le serveur** (`ContexteCotisationDto`) : aucun seuil n'est
 * codé ici. Ces contrôles aident la saisie ; le serveur refait chacun d'eux et reste l'autorité.
 */
function creerSchema(contexte: ContexteCotisation) {
  const minSs = contexte.minimumSecuriteSociale;
  const minEp = contexte.minimumEpargne;
  return z
    .object({
      datePaiement: z.string().min(1, "La date de paiement est obligatoire."),
      montant: z.string().min(1, "Le montant est obligatoire."),
      montantSecuriteSociale: z.string().min(1, "Indiquez le montant affecté à la Sécurité Sociale."),
      montantEpargne: z.string().min(1, "Indiquez le montant affecté à l'Épargne (0 si aucun)."),
      packId: z.string().optional(),
      modePaiement: z.enum(["ESPECES", "ORANGE_MONEY", "MTN_MOMO", "VIREMENT"], {
        message: "Le mode de paiement est obligatoire.",
      }),
      referenceTransaction: z.string().trim().optional(),
      agentEncaisseurId: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      const total = lireMontant(v.montant);
      const ss = lireMontant(v.montantSecuriteSociale);
      const ep = lireMontant(v.montantEpargne);
      if (v.montant && (total === null || total <= 0)) {
        ctx.addIssue({ code: "custom", path: ["montant"], message: "Le montant doit être un nombre strictement positif (ex. 1000)." });
      }
      if (v.montantSecuriteSociale && ss === null) {
        ctx.addIssue({ code: "custom", path: ["montantSecuriteSociale"], message: "Saisissez un montant valide (ex. 700)." });
      } else if (ss !== null && ss < minSs) {
        ctx.addIssue({
          code: "custom",
          path: ["montantSecuriteSociale"],
          message: `Le montant affecté à la Sécurité Sociale doit être au minimum de ${formaterMontant(minSs)}.`,
        });
      }
      if (v.montantEpargne && ep === null) {
        ctx.addIssue({ code: "custom", path: ["montantEpargne"], message: "Saisissez un montant valide (ex. 300)." });
      } else if (ep !== null && (ep > 0 || !contexte.epargneFacultative) && ep < minEp) {
        ctx.addIssue({
          code: "custom",
          path: ["montantEpargne"],
          message: `Le montant affecté à l'Épargne doit être au minimum de ${formaterMontant(minEp)}.`,
        });
      }
      if (total !== null && ss !== null && ep !== null && Math.round((ss + ep) * 100) !== Math.round(total * 100)) {
        ctx.addIssue({
          code: "custom",
          path: ["montantEpargne"],
          message: "La répartition doit correspondre au montant total de la cotisation.",
        });
      }
      if (contexte.packRequis && !v.packId) {
        ctx.addIssue({
          code: "custom",
          path: ["packId"],
          message: "Première cotisation de cet adhérent : choisissez son pack de cotisation.",
        });
      }
      if (estModeMobileMoney(v.modePaiement) && !v.referenceTransaction) {
        ctx.addIssue({
          code: "custom",
          path: ["referenceTransaction"],
          message:
            "La référence de transaction est obligatoire pour un paiement Orange Money ou MTN MoMo. Saisissez-la depuis le message de confirmation reçu.",
        });
      }
    });
}

type Valeurs = z.infer<ReturnType<typeof creerSchema>>;

/** Résumé de l'adhérent trouvé, avant toute saisie financière. */
function ResumeAdherent({ contexte }: { contexte: ContexteCotisation }) {
  return (
    <div className="space-y-2 rounded-lg bg-fond p-4" aria-live="polite" aria-label="Adhérent sélectionné">
      <p className="flex flex-wrap items-center gap-3">
        <strong>{formaterNomComplet(contexte.nom, contexte.prenoms)}</strong>
        <span className="ref">{contexte.matricule}</span>
        <BadgeStatut domaine="adherent" code={contexte.statut} />
        {contexte.statutValidation && <BadgeStatut domaine="statutValidation" code={contexte.statutValidation} />}
      </p>
      <p className="text-sm text-texte-doux-fort">
        {contexte.zoneLibelle ?? "Zone non renseignée"}
        {contexte.packLibelle ? ` — pack ${contexte.packLibelle}` : " — aucun pack encore choisi"}
      </p>
    </div>
  );
}

/**
 * Étape 1 : recherche par matricule (`GET /paiements/contexte-adherent`). Le matricule est normalisé et validé par
 * le serveur (`ADHERENT_MATRICULE_INVALIDE`), qui répond 404 pour un matricule inconnu ou hors périmètre.
 */
function RechercheMatricule({
  matriculeInitial,
  onTrouve,
}: {
  matriculeInitial: string;
  onTrouve: (contexte: ContexteCotisation) => void;
}) {
  const [saisie, setSaisie] = useState(matriculeInitial);
  const [recherche, setRecherche] = useState<string | undefined>(matriculeInitial || undefined);
  const [erreurSaisie, setErreurSaisie] = useState<string | null>(null);
  const contexte = useContexteCotisation(recherche);

  function rechercher() {
    const valeur = saisie.trim();
    if (!valeur) {
      setErreurSaisie("Saisissez le matricule COSITI de l'adhérent (ex. COSITI-00001).");
      return;
    }
    setErreurSaisie(null);
    setRecherche(valeur);
    if (valeur === recherche) void contexte.refetch();
  }

  const introuvable = contexte.isError && estErreurApi(contexte.error) && contexte.error.statut === 404;
  const donnees = contexte.data;
  // V23 : aucune cotisation tant que le DAF n'a pas validé l'encaissement du frais d'adhésion (1 000 FCFA).
  const frais = useFraisAdhesionAdherent(donnees?.adherentId);
  const fraisValide = fraisAdhesionValide(frais.data, donnees?.statut);

  return (
    <CarteSection titre="1. Adhérent" description="Recherchez l'adhérent par son matricule avant toute saisie financière.">
      <div className="space-y-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            rechercher();
          }}
          noValidate
        >
          <ChampFormulaire id="matricule" libelle="Matricule COSITI" obligatoire erreur={erreurSaisie ?? undefined} className="flex-1">
            {(attributs) => (
              <Input className="ref" {...attributs} value={saisie} onChange={(e) => setSaisie(e.target.value)} autoComplete="off" />
            )}
          </ChampFormulaire>
          <Button type="submit" disabled={contexte.isFetching}>
            <Search className="size-4" aria-hidden="true" />
            {contexte.isFetching ? "Recherche…" : "Rechercher"}
          </Button>
        </form>

        {contexte.isFetching && <Skeleton className="h-16 w-full" />}
        {!contexte.isFetching && introuvable && (
          <Alerte teinte="attention" titre="Adhérent introuvable">
            <p>Aucun adhérent de votre périmètre ne porte ce matricule. Vérifiez la saisie.</p>
          </Alerte>
        )}
        {!contexte.isFetching && contexte.isError && !introuvable && (
          <Alerte teinte="danger" titre="Recherche impossible">
            <p>{estErreurApi(contexte.error) ? contexte.error.message : "La recherche a échoué. Réessayez."}</p>
          </Alerte>
        )}
        {!contexte.isFetching && donnees && (
          <div className="space-y-3">
            <ResumeAdherent contexte={donnees} />
            {donnees.avertissements.length > 0 && <AvertissementRegle avertissements={donnees.avertissements} />}
            {donnees.cotisable && frais.isLoading ? (
              <Skeleton className="h-10 w-64" />
            ) : donnees.cotisable && !fraisValide ? (
              <Alerte teinte="attention" titre="Frais d'adhésion non validé par le DAF">
                <p>
                  {frais.data?.frais
                    ? "Le frais d'adhésion de cet adhérent est enregistré mais son encaissement n'est pas encore validé par le DAF."
                    : "Aucun frais d'adhésion n'est enregistré pour cet adhérent."}{" "}
                  Les cotisations pourront être saisies une fois l'encaissement validé par le DAF.
                </p>
              </Alerte>
            ) : donnees.cotisable ? (
              <Button onClick={() => onTrouve(donnees)}>Saisir la cotisation de cet adhérent</Button>
            ) : (
              <Alerte teinte="danger" titre="Cet adhérent ne peut pas cotiser pour le moment">
                <ul className="list-disc pl-5">
                  {donnees.motifsBlocage.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </Alerte>
            )}
          </div>
        )}
      </div>
    </CarteSection>
  );
}

interface DoublonsEnAttente {
  readonly paiements: readonly Paiement[];
  readonly corps: CorpsEnregistrementPaiement;
  readonly brouillon: boolean;
}

/**
 * Étape 2 : saisie de la cotisation pour l'adhérent choisi — montant total, répartition Sécurité Sociale /
 * Épargne (choisie ici, jamais à la création de l'adhérent), pack à la première cotisation, mode et référence.
 */
function FormulaireCotisation({ contexte, onChangerAdherent }: { contexte: ContexteCotisation; onChangerAdherent: () => void }) {
  const navigate = useNavigate();
  const peutLireOrganisation = usePermission("ORGANISATION:LIRE");
  const { data: agents } = useAgents(peutLireOrganisation);
  const { data: packs } = usePacks();
  const enregistrer = useEnregistrerPaiement();
  const verifierDoublon = useVerifierDoublonPaiement();
  const [recapitulatif, setRecapitulatif] = useState<{ corps: CorpsEnregistrementPaiement; brouillon: boolean } | null>(null);
  const [doublons, setDoublons] = useState<DoublonsEnAttente | null>(null);
  // Une clé `Idempotency-Key` par saisie : la même accompagne un nouvel essai de la même saisie (le serveur rend
  // alors la cotisation déjà créée) ; une saisie modifiée en reçoit une nouvelle (sinon 409 IDEMPOTENCY_KEY_CONFLIT).
  const idempotence = useRef<{ cle: string; empreinte: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<Valeurs>({
    resolver: zodResolver(creerSchema(contexte)),
    defaultValues: { packId: contexte.packId ?? "" },
  });

  const modeSelectionne = watch("modePaiement");
  const total = lireMontant(watch("montant"));
  const ss = lireMontant(watch("montantSecuriteSociale"));
  const ep = lireMontant(watch("montantEpargne"));
  // Affichage d'aide uniquement : la cohérence est contrôlée par le serveur.
  const reparti = (ss ?? 0) + (ep ?? 0);
  const ecart = total !== null ? total - reparti : null;
  const envoiEnCours = enregistrer.isPending || verifierDoublon.isPending;

  function cleIdempotence(corps: CorpsEnregistrementPaiement, brouillon: boolean): string {
    const empreinte = JSON.stringify({ corps, brouillon });
    if (!idempotence.current || idempotence.current.empreinte !== empreinte) {
      idempotence.current = { cle: crypto.randomUUID(), empreinte };
    }
    return idempotence.current.cle;
  }

  async function envoyer(corps: CorpsEnregistrementPaiement, brouillon: boolean) {
    try {
      const paiement = await enregistrer.mutateAsync({ corps, cleIdempotence: cleIdempotence(corps, brouillon), brouillon });
      // Le statut affiché est celui renvoyé par le serveur, jamais « Validée » parce que la requête a réussi.
      const statut = definitionStatut("paiement", paiement.statut).libelle;
      toast.success(`Cotisation ${paiement.numeroRecu} enregistrée — statut : ${statut}.`);
      setRecapitulatif(null);
      navigate(`/cotisations/${paiement.id}`);
    } catch (e) {
      setRecapitulatif(null);
      if (estErreurApi(e) && e.champ && CHAMPS_FORMULAIRE.includes(e.champ)) {
        setError(e.champ as keyof Valeurs, { message: e.message });
      }
      // Sinon : affiché via `enregistrer.error` ci-dessous.
    }
  }

  /** Après le récapitulatif : contrôle de doublon serveur, puis envoi. */
  async function confirmer(corps: CorpsEnregistrementPaiement, brouillon: boolean) {
    if (envoiEnCours) return;
    try {
      const resultat = await verifierDoublon.mutateAsync({
        adherentId: corps.adherentId,
        datePaiement: corps.datePaiement,
        montant: corps.montant,
        modePaiement: corps.modePaiement,
        referenceTransaction: corps.referenceTransaction,
      });
      if (resultat.referenceDejaUtilisee) {
        setRecapitulatif(null);
        setError("referenceTransaction", {
          message: "Cette référence de transaction est déjà enregistrée pour ce mode de paiement. Vérifiez le message de confirmation reçu.",
        });
        return;
      }
      if (resultat.doublonsPotentiels.length > 0) {
        setRecapitulatif(null);
        setDoublons({ paiements: resultat.doublonsPotentiels, corps, brouillon });
        return;
      }
    } catch {
      // Contrôle préalable indisponible : le serveur tranche à l'enregistrement.
    }
    await envoyer(corps, brouillon);
  }

  function preparer(v: Valeurs, brouillon: boolean) {
    const corps: CorpsEnregistrementPaiement = {
      adherentId: contexte.adherentId,
      datePaiement: v.datePaiement,
      montant: lireMontant(v.montant) ?? 0,
      montantSecuriteSociale: lireMontant(v.montantSecuriteSociale) ?? 0,
      montantEpargne: lireMontant(v.montantEpargne) ?? 0,
      packId: contexte.packRequis ? v.packId || undefined : undefined,
      modePaiement: v.modePaiement,
      referenceTransaction: v.referenceTransaction || undefined,
      typePaiement: TYPE_PAIEMENT,
      agentEncaisseurId: v.agentEncaisseurId || undefined,
    };
    setRecapitulatif({ corps, brouillon });
  }

  const packChoisi = packs?.find((p) => p.id === recapitulatif?.corps.packId);

  return (
    <>
      <CarteSection
        titre="1. Adhérent"
        actions={
          <Button variant="outline" size="sm" onClick={onChangerAdherent} disabled={envoiEnCours}>
            Changer d'adhérent
          </Button>
        }
      >
        <ResumeAdherent contexte={contexte} />
      </CarteSection>

      <CarteSection titre="2. Cotisation">
        <form onSubmit={(e) => void handleSubmit((v) => preparer(v, false))(e)} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ChampFormulaire id="datePaiement" libelle="Date du paiement" obligatoire erreur={errors.datePaiement?.message}>
              {(attributs) => <ChampDate {...attributs} max={aujourdhui()} {...register("datePaiement")} />}
            </ChampFormulaire>
            <ChampFormulaire id="montant" libelle="Montant total (FCFA)" obligatoire erreur={errors.montant?.message}>
              {(attributs) => <ChampMontant {...attributs} {...register("montant")} />}
            </ChampFormulaire>
          </div>

          <fieldset className="space-y-4 rounded-lg border border-bordure p-4">
            <legend className="px-1 text-sm font-semibold">Répartition du montant</legend>
            <p className="text-sm text-texte-doux-fort">
              Sécurité Sociale : au minimum {formaterMontant(contexte.minimumSecuriteSociale)}. Épargne :{" "}
              {contexte.epargneFacultative
                ? `facultative, au minimum ${formaterMontant(contexte.minimumEpargne)} si elle est alimentée.`
                : `au minimum ${formaterMontant(contexte.minimumEpargne)}.`}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChampFormulaire
                id="montantSecuriteSociale"
                libelle="Sécurité Sociale (FCFA)"
                obligatoire
                erreur={errors.montantSecuriteSociale?.message}
              >
                {(attributs) => <ChampMontant {...attributs} {...register("montantSecuriteSociale")} />}
              </ChampFormulaire>
              <ChampFormulaire id="montantEpargne" libelle="Épargne (FCFA)" obligatoire erreur={errors.montantEpargne?.message}>
                {(attributs) => <ChampMontant {...attributs} {...register("montantEpargne")} />}
              </ChampFormulaire>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-sm" aria-live="polite" aria-label="Contrôle de la répartition">
              <div>
                <dt className="text-texte-doux-fort">Montant total</dt>
                <dd className="chiffre font-semibold">{total !== null ? formaterMontant(total) : "—"}</dd>
              </div>
              <div>
                <dt className="text-texte-doux-fort">Réparti</dt>
                <dd className="chiffre font-semibold">{formaterMontant(reparti)}</dd>
              </div>
              <div>
                <dt className="text-texte-doux-fort">Reste à répartir</dt>
                <dd className={cn("chiffre font-semibold", ecart !== null && ecart !== 0 && "text-danger-fort")}>
                  {ecart !== null ? formaterMontant(ecart) : "—"}
                </dd>
              </div>
            </dl>
          </fieldset>

          {contexte.packRequis && (
            <ChampFormulaire
              id="packId"
              libelle="Pack de cotisation"
              obligatoire
              erreur={errors.packId?.message}
              aide="Première cotisation de cet adhérent : le pack choisi ouvre son adhésion."
            >
              {(attributs) => (
                <Controller
                  control={control}
                  name="packId"
                  render={({ field }) => (
                    <SelectRecherche
                      id={attributs.id}
                      options={(packs ?? []).filter((p) => p.actif).map((p) => ({ valeur: p.id, libelle: p.libelle }))}
                      valeur={field.value}
                      onChange={field.onChange}
                      ariaInvalid={attributs["aria-invalid"]}
                      ariaDescribedBy={attributs["aria-describedby"]}
                      placeholder="Sélectionner un pack"
                    />
                  )}
                />
              )}
            </ChampFormulaire>
          )}

          <ChampFormulaire id="modePaiement" libelle="Mode de paiement" obligatoire erreur={errors.modePaiement?.message}>
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

          {/* Mention « (obligatoire) / (facultative) » écrite dans le libellé : elle dépend du mode choisi. */}
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
            <ChampFormulaire id="agentEncaisseurId" libelle="Agent encaisseur" facultatif>
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
            <Alerte teinte="danger" titre="Cotisation non enregistrée">
              <p>{estErreurApi(enregistrer.error) ? enregistrer.error.message : "L'enregistrement a échoué. Réessayez."}</p>
            </Alerte>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={envoiEnCours} className="sm:flex-1">
              {envoiEnCours ? "Enregistrement en cours…" : "Vérifier et enregistrer"}
            </Button>
            <Button type="button" variant="outline" disabled={envoiEnCours} onClick={() => void handleSubmit((v) => preparer(v, true))()}>
              Enregistrer comme brouillon
            </Button>
          </div>
          <p className="text-xs text-texte-doux">
            Une cotisation enregistrée entre dans la file de contrôle du DAF : elle n'est créditée aux comptes qu'une fois
            validée. Un brouillon reste modifiable par son auteur.
          </p>
        </form>
      </CarteSection>

      <DialogueConfirmation
        ouvert={recapitulatif !== null}
        onOuvertChange={(ouvert) => {
          if (!ouvert && !envoiEnCours) setRecapitulatif(null);
        }}
        titre={recapitulatif?.brouillon ? "Enregistrer le brouillon ?" : "Confirmer la cotisation"}
        description={
          recapitulatif && (
            <dl className="grid grid-cols-2 gap-3 text-left" aria-label="Récapitulatif de la cotisation">
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Adhérent</dt>
                <dd>
                  {formaterNomComplet(contexte.nom, contexte.prenoms)} — <span className="ref">{contexte.matricule}</span>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Montant total</dt>
                <dd className="chiffre text-2xl font-bold">{formaterMontant(recapitulatif.corps.montant)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Sécurité Sociale</dt>
                <dd className="chiffre text-lg font-bold">{formaterMontant(recapitulatif.corps.montantSecuriteSociale)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Épargne</dt>
                <dd className="chiffre text-lg font-bold">{formaterMontant(recapitulatif.corps.montantEpargne)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Date</dt>
                <dd>{formaterDate(recapitulatif.corps.datePaiement)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Mode</dt>
                <dd>{definitionStatut("modePaiement", recapitulatif.corps.modePaiement).libelle}</dd>
              </div>
              {packChoisi && (
                <div className="col-span-2">
                  <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Pack (ouverture de l'adhésion)</dt>
                  <dd>{packChoisi.libelle}</dd>
                </div>
              )}
            </dl>
          )
        }
        libelleConfirmation={recapitulatif?.brouillon ? "Enregistrer le brouillon" : "Enregistrer la cotisation"}
        enCours={envoiEnCours}
        onConfirmer={async () => {
          if (recapitulatif) await confirmer(recapitulatif.corps, recapitulatif.brouillon);
        }}
      />

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
    </>
  );
}

/**
 * Saisie d'une cotisation (module cotisations, #9 à #14, #35 ; V22 : recherche par matricule, répartition Sécurité
 * Sociale / Épargne, pack à la première cotisation, récapitulatif). `?matricule=` pré-remplit la recherche (lien
 * depuis la fiche adhérent). Le serveur refait tous les contrôles et génère le numéro de reçu.
 */
export function NouveauPaiement() {
  const [parametres] = useSearchParams();
  const [contexte, setContexte] = useState<ContexteCotisation | null>(null);
  // V23 : le journal des cotisations (rubrique Finances) est réservé au DAF.
  const peutOuvrirJournal = usePermission(PERMISSION_FINANCES);

  return (
    <CoquilleApplication titre="Nouvelle cotisation">
      <div className="mx-auto max-w-2xl space-y-6">
        <EnTetePage
          titre="Nouvelle cotisation"
          filAriane={
            peutOuvrirJournal
              ? [{ libelle: "Cotisations", chemin: "/cotisations" }, { libelle: "Nouvelle cotisation" }]
              : [{ libelle: "Adhérents", chemin: "/adherents" }, { libelle: "Nouvelle cotisation" }]
          }
        />
        {contexte ? (
          <FormulaireCotisation key={contexte.adherentId} contexte={contexte} onChangerAdherent={() => setContexte(null)} />
        ) : (
          <RechercheMatricule matriculeInitial={parametres.get("matricule") ?? ""} onTrouve={setContexte} />
        )}
      </div>
    </CoquilleApplication>
  );
}
