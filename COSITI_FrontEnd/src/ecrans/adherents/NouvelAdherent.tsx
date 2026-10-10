import { useState } from "react";
import { useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { Alerte } from "@/components/cositi/alerte";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActivites, useCreerAdherent, useVerifierDoublon } from "@/hooks/useAdherents";
import type { CandidatDoublon } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { ChampDate } from "@/components/cositi/champ-date";
import { formaterNomComplet, masquerTelephone } from "@/lib/format";
import { schemaEmailFacultatif, schemaTelephoneFacultatif } from "@/ecrans/adherents/schemas";

const schema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire."),
  prenoms: z.string().trim().optional(),
  dateNaissance: z.string().optional(),
  sexe: z.enum(["M", "F"]).optional(),
  numeroCni: z.string().trim().optional(),
  numeroCnps: z.string().trim().optional(),
  telephonePrincipal: z
    .string()
    .trim()
    .min(1, "Le téléphone principal est obligatoire.")
    .refine(
      (valeur) => valeur.replace(/\D/g, "").replace(/^237/, "").length === 9,
      "Le numéro doit comporter 9 chiffres (format camerounais).",
    ),
  telephoneSecondaire: z.string().trim().optional(),
  // V22 : coordonnées complémentaires, facultatives.
  whatsapp: schemaTelephoneFacultatif,
  email: schemaEmailFacultatif,
  activiteId: z.string().min(1, "L'activité est obligatoire."),
  associationId: z.string().trim().optional(),
  quartier: z.string().trim().optional(),
  ville: z.string().trim().optional(),
  dateAdhesion: z.string().min(1, "La date d'adhésion est obligatoire."),
  // V22 : aucun pack à la création — il se choisit à la première cotisation.
});

type ValeursFormulaire = z.infer<typeof schema>;

const CHAMPS_ETAPE = [
  ["nom", "prenoms", "dateNaissance", "sexe", "numeroCni", "numeroCnps", "telephonePrincipal", "telephoneSecondaire", "whatsapp", "email"],
  // V23 : ni zone de rattachement ni localisation à la création — seuls le quartier et la ville sont saisis.
  ["activiteId", "associationId", "quartier", "ville", "dateAdhesion"],
  [],
] as const satisfies readonly (readonly (keyof ValeursFormulaire)[])[];

/** Un champ facultatif laissé vide vaut « absent », jamais la chaîne vide. */
function sansVide(valeur: string | undefined): string | undefined {
  const nettoye = valeur?.trim();
  return nettoye ? nettoye : undefined;
}

const TITRES_ETAPE = ["Identité et contact", "Rattachement", "Vérification et confirmation"] as const;

export function NouvelAdherent() {
  const navigate = useNavigate();
  const [etape, setEtape] = useState(0);
  const { data: activites } = useActivites();
  const verifierDoublon = useVerifierDoublon();
  const creerAdherent = useCreerAdherent();
  const [candidatsIgnores, setCandidatsIgnores] = useState<readonly CandidatDoublon[] | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    control,
    formState: { errors },
  } = useForm<ValeursFormulaire>({ resolver: zodResolver(schema), defaultValues: { activiteId: "" } });

  async function etapeSuivante() {
    const champs = CHAMPS_ETAPE[etape] ?? [];
    const valide = champs.length === 0 || (await trigger(champs));
    if (!valide) return;
    if (etape === 1) {
      const valeurs = getValues();
      verifierDoublon.mutate({
        nomComplet: formaterNomComplet(valeurs.nom, valeurs.prenoms),
        telephonePrincipal: valeurs.telephonePrincipal,
        numeroCni: sansVide(valeurs.numeroCni),
      });
    }
    setEtape((e) => Math.min(e + 1, TITRES_ETAPE.length - 1));
  }

  function etapePrecedente() {
    setEtape((e) => Math.max(e - 1, 0));
  }

  async function soumettre(confirmationDoublonIgnore = false) {
    const valeurs = getValues();
    try {
      const adherent = await creerAdherent.mutateAsync({
        ...valeurs,
        // Un champ facultatif laissé vide n'est pas « une valeur vide », c'est « pas de valeur ».
        // Envoyée telle quelle, la chaîne vide était enregistrée en base et l'index unique partiel
        // sur `numero_cni` la traitait comme une valeur : le **deuxième** adhérent sans CNI faisait
        // échouer l'insertion. Constaté en recette E2E.
        prenoms: sansVide(valeurs.prenoms),
        dateNaissance: sansVide(valeurs.dateNaissance),
        telephoneSecondaire: sansVide(valeurs.telephoneSecondaire),
        whatsapp: sansVide(valeurs.whatsapp),
        email: sansVide(valeurs.email),
        numeroCni: sansVide(valeurs.numeroCni),
        numeroCnps: sansVide(valeurs.numeroCnps),
        associationId: sansVide(valeurs.associationId),
        quartier: sansVide(valeurs.quartier),
        ville: sansVide(valeurs.ville),
        confirmationDoublonIgnore: confirmationDoublonIgnore || undefined,
      });
      // Le matricule est généré par le serveur (#11) : il n'est connu qu'ici, on l'annonce aussitôt.
      // V20/V21 : le dossier devient officiel par le parcours d'adhésion (frais, activation, contrôle DGA). La fiche
      // s'ouvre directement sur l'onglet « Adhésion », où le frais collecté par l'agent s'enregistre aussitôt — sans
      // trancher la question `[V]` D-10 (saisie du frais dans le formulaire de création).
      // V22 : aucun pack n'est choisi ici ; il le sera à la première cotisation.
      toast.success(`Adhérent créé — matricule ${adherent.matricule}. Enregistrez maintenant le frais d'adhésion collecté.`);
      navigate(`/adherents/${adherent.id}?onglet=adhesion`);
    } catch (e) {
      if (estErreurApi(e) && e.code === "ADHERENT_DOUBLON_POTENTIEL") {
        const candidats = Array.isArray(e.details?.candidats) ? (e.details.candidats as CandidatDoublon[]) : [];
        setCandidatsIgnores(candidats);
      }
    }
  }

  return (
    <CoquilleApplication titre="Nouvel adhérent">
      <div className="mx-auto max-w-3xl space-y-6">
        <EnTetePage
          titre="Nouvel adhérent"
          filAriane={[{ libelle: "Adhérents", chemin: "/adherents" }, { libelle: "Nouvel adhérent" }]}
        />

        <ol className="flex gap-4 text-sm">
          {TITRES_ETAPE.map((titre, index) => (
            <li key={titre} className={index === etape ? "font-semibold text-primaire" : "text-texte-doux"}>
              {index + 1}. {titre}
            </li>
          ))}
        </ol>

        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          noValidate
        >
          {/* La carte enveloppe tout le formulaire : les boutons de navigation, posés dans son
              pied, restent ainsi à l'intérieur du `<form>`. */}
          <CarteSection
            titre={TITRES_ETAPE[etape]}
            pied={
              <div className="flex w-full justify-between">
                <Button type="button" variant="outline" onClick={etapePrecedente} disabled={etape === 0}>
                  Précédent
                </Button>
                {etape < TITRES_ETAPE.length - 1 ? (
                  <Button type="button" onClick={() => void etapeSuivante()}>
                    Suivant
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void handleSubmit(() => soumettre(false))()}
                    disabled={creerAdherent.isPending}
                  >
                    {creerAdherent.isPending ? "Création en cours…" : "Créer l'adhérent"}
                  </Button>
                )}
              </div>
            }
          >
            {etape === 0 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ChampFormulaire id="nom" libelle="Nom" erreur={errors.nom?.message} className="sm:col-span-2">
                  {(attributs) => <Input {...attributs} {...register("nom")} />}
                </ChampFormulaire>
                <ChampFormulaire id="prenoms" libelle="Prénoms" className="sm:col-span-2">
                  {(attributs) => <Input {...attributs} {...register("prenoms")} />}
                </ChampFormulaire>
                <ChampFormulaire id="dateNaissance" libelle="Date de naissance">
                  {(attributs) => <ChampDate {...attributs} {...register("dateNaissance")} />}
                </ChampFormulaire>
                <ChampFormulaire id="sexe" libelle="Sexe">
                  {(attributs) => (
                    <Controller
                      control={control}
                      name="sexe"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger {...attributs}>
                            <SelectValue placeholder="Non renseigné" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculin</SelectItem>
                            <SelectItem value="F">Féminin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </ChampFormulaire>
                <ChampFormulaire id="numeroCni" libelle="Numéro CNI">
                  {(attributs) => <Input {...attributs} {...register("numeroCni")} />}
                </ChampFormulaire>
                <ChampFormulaire id="numeroCnps" libelle="Numéro CNPS">
                  {(attributs) => <Input {...attributs} {...register("numeroCnps")} />}
                </ChampFormulaire>
                <ChampFormulaire
                  id="telephonePrincipal"
                  libelle="Téléphone principal"
                  erreur={errors.telephonePrincipal?.message}
                >
                  {(attributs) => <Input {...attributs} {...register("telephonePrincipal")} />}
                </ChampFormulaire>
                <ChampFormulaire id="telephoneSecondaire" libelle="Téléphone secondaire">
                  {(attributs) => <Input {...attributs} {...register("telephoneSecondaire")} />}
                </ChampFormulaire>
                <ChampFormulaire id="whatsapp" libelle="WhatsApp" facultatif erreur={errors.whatsapp?.message}>
                  {(attributs) => <Input type="tel" {...attributs} {...register("whatsapp")} />}
                </ChampFormulaire>
                <ChampFormulaire id="email" libelle="E-mail" facultatif erreur={errors.email?.message}>
                  {(attributs) => <Input type="email" autoComplete="off" {...attributs} {...register("email")} />}
                </ChampFormulaire>
              </div>
            )}

            {etape === 1 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ChampFormulaire id="activiteId" libelle="Activité" erreur={errors.activiteId?.message}>
                  {(attributs) => (
                    <Controller
                      control={control}
                      name="activiteId"
                      render={({ field }) => (
                        <SelectRecherche
                          id={attributs.id}
                          options={(activites ?? []).map((a) => ({ valeur: a.id, libelle: a.libelle }))}
                          valeur={field.value}
                          onChange={field.onChange}
                          ariaInvalid={attributs["aria-invalid"]}
                          ariaDescribedBy={attributs["aria-describedby"]}
                          placeholder="Sélectionner une activité"
                        />
                      )}
                    />
                  )}
                </ChampFormulaire>
                <ChampFormulaire id="quartier" libelle="Quartier">
                  {(attributs) => <Input {...attributs} {...register("quartier")} />}
                </ChampFormulaire>
                <ChampFormulaire id="ville" libelle="Ville">
                  {(attributs) => <Input {...attributs} {...register("ville")} />}
                </ChampFormulaire>
                <ChampFormulaire id="dateAdhesion" libelle="Date d'adhésion" erreur={errors.dateAdhesion?.message}>
                  {(attributs) => <ChampDate {...attributs} {...register("dateAdhesion")} />}
                </ChampFormulaire>
              </div>
            )}

            {etape === 2 && (
              <div className="space-y-4">
                {verifierDoublon.data && verifierDoublon.data.candidats.length > 0 && (
                  <Alerte teinte="attention" titre="Doublons potentiels détectés">
                    <p className="mb-2">
                      Ces résultats sont informatifs : vérifiez qu'il ne s'agit pas de la même personne avant de
                      continuer. La création reste possible.
                    </p>
                    <ul className="space-y-1">
                      {verifierDoublon.data.candidats.map((candidat) => (
                        <li key={candidat.adherentId} className="ref">
                          {candidat.matricule} — {candidat.nomComplet} — {candidat.telephone} (
                          {candidat.motifCorrespondance})
                        </li>
                      ))}
                    </ul>
                  </Alerte>
                )}

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Adhérent</dt>
                    <dd>{formaterNomComplet(getValues("nom"), getValues("prenoms"))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Téléphone</dt>
                    <dd className="ref">{masquerTelephone(getValues("telephonePrincipal"))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Quartier / ville</dt>
                    <dd>{[getValues("quartier"), getValues("ville")].filter(Boolean).join(", ") || "—"}</dd>
                  </div>
                </dl>
                <p className="text-sm text-texte-doux-fort">
                  Le pack de cotisation sera choisi lors de la première cotisation de l'adhérent.
                </p>

                {creerAdherent.isError && !candidatsIgnores && (
                  <Alerte teinte="danger">
                    <p>{estErreurApi(creerAdherent.error) ? creerAdherent.error.message : "La création a échoué."}</p>
                  </Alerte>
                )}
              </div>
            )}
          </CarteSection>
        </form>
      </div>

      <DialogueConfirmation
        ouvert={!!candidatsIgnores}
        onOuvertChange={(ouvert) => {
          if (!ouvert) setCandidatsIgnores(null);
        }}
        titre="Doublon potentiel détecté"
        description={
          <div className="space-y-2 text-left">
            <p>
              L'API a identifié {candidatsIgnores?.length ?? 0} adhérent(s) proche(s) de cette saisie. Confirmez-vous
              la création malgré tout ?
            </p>
            <ul className="space-y-1">
              {candidatsIgnores?.map((candidat) => (
                <li key={candidat.adherentId} className="ref text-sm">
                  {candidat.matricule} — {candidat.nomComplet} — {candidat.telephone}
                </li>
              ))}
            </ul>
          </div>
        }
        libelleConfirmation="Créer quand même"
        enCours={creerAdherent.isPending}
        onConfirmer={async () => {
          await soumettre(true);
          setCandidatsIgnores(null);
        }}
      />
    </CoquilleApplication>
  );
}
