import { useState } from "react";
import { useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useZones } from "@/hooks/useOrganisation";
import { useActivites, useCreerAdherent, usePacks, useVerifierDoublon } from "@/hooks/useAdherents";
import type { CandidatDoublon } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterNomComplet, masquerTelephone } from "@/lib/format";

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
  zoneId: z.string().min(1, "La zone est obligatoire."),
  activiteId: z.string().min(1, "L'activité est obligatoire."),
  associationId: z.string().trim().optional(),
  localisation: z.string().trim().min(1, "La localisation est obligatoire."),
  quartier: z.string().trim().optional(),
  ville: z.string().trim().optional(),
  dateAdhesion: z.string().min(1, "La date d'adhésion est obligatoire."),
  packId: z.string().min(1, "Le pack est obligatoire."),
});

type ValeursFormulaire = z.infer<typeof schema>;

const CHAMPS_ETAPE = [
  ["nom", "prenoms", "dateNaissance", "sexe", "numeroCni", "numeroCnps", "telephonePrincipal", "telephoneSecondaire"],
  ["zoneId", "activiteId", "associationId", "localisation", "quartier", "ville", "dateAdhesion", "packId"],
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
  const { data: zones } = useZones();
  const { data: activites } = useActivites();
  const { data: packs } = usePacks();
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
  } = useForm<ValeursFormulaire>({ resolver: zodResolver(schema), defaultValues: { zoneId: "", activiteId: "", packId: "" } });

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
        zoneId: valeurs.zoneId,
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
        numeroCni: sansVide(valeurs.numeroCni),
        numeroCnps: sansVide(valeurs.numeroCnps),
        associationId: sansVide(valeurs.associationId),
        quartier: sansVide(valeurs.quartier),
        ville: sansVide(valeurs.ville),
        confirmationDoublonIgnore: confirmationDoublonIgnore || undefined,
      });
      toast.success("Adhérent créé.");
      navigate(`/adherents/${adherent.id}`);
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
        <h1>Nouvel adhérent</h1>

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
          className="space-y-6"
          noValidate
        >
          {etape === 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" aria-invalid={!!errors.nom} {...register("nom")} />
                {errors.nom && <p className="text-sm text-danger-fort">{errors.nom.message}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="prenoms">Prénoms</Label>
                <Input id="prenoms" {...register("prenoms")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateNaissance">Date de naissance</Label>
                <Input id="dateNaissance" type="date" {...register("dateNaissance")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sexe">Sexe</Label>
                <Controller
                  control={control}
                  name="sexe"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="sexe">
                        <SelectValue placeholder="Non renseigné" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroCni">Numéro CNI</Label>
                <Input id="numeroCni" {...register("numeroCni")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroCnps">Numéro CNPS</Label>
                <Input id="numeroCnps" {...register("numeroCnps")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephonePrincipal">Téléphone principal</Label>
                <Input
                  id="telephonePrincipal"
                  aria-invalid={!!errors.telephonePrincipal}
                  aria-describedby={errors.telephonePrincipal ? "telephonePrincipal-erreur" : undefined}
                  {...register("telephonePrincipal")}
                />
                {errors.telephonePrincipal && (
                  <p id="telephonePrincipal-erreur" className="text-sm text-danger-fort">
                    {errors.telephonePrincipal.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephoneSecondaire">Téléphone secondaire</Label>
                <Input id="telephoneSecondaire" {...register("telephoneSecondaire")} />
              </div>
            </div>
          )}

          {etape === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="zoneId">Zone</Label>
                <Controller
                  control={control}
                  name="zoneId"
                  render={({ field }) => (
                    <SelectRecherche
                      id="zoneId"
                      options={(zones ?? []).map((z) => ({ valeur: z.id, libelle: z.libelle }))}
                      valeur={field.value}
                      onChange={field.onChange}
                      ariaInvalid={!!errors.zoneId}
                      placeholder="Sélectionner une zone"
                    />
                  )}
                />
                {errors.zoneId && <p className="text-sm text-danger-fort">{errors.zoneId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="activiteId">Activité</Label>
                <Controller
                  control={control}
                  name="activiteId"
                  render={({ field }) => (
                    <SelectRecherche
                      id="activiteId"
                      options={(activites ?? []).map((a) => ({ valeur: a.id, libelle: a.libelle }))}
                      valeur={field.value}
                      onChange={field.onChange}
                      ariaInvalid={!!errors.activiteId}
                      placeholder="Sélectionner une activité"
                    />
                  )}
                />
                {errors.activiteId && <p className="text-sm text-danger-fort">{errors.activiteId.message}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="localisation">Localisation</Label>
                <Input id="localisation" aria-invalid={!!errors.localisation} {...register("localisation")} />
                {errors.localisation && <p className="text-sm text-danger-fort">{errors.localisation.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quartier">Quartier</Label>
                <Input id="quartier" {...register("quartier")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" {...register("ville")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateAdhesion">Date d'adhésion</Label>
                <Input id="dateAdhesion" type="date" aria-invalid={!!errors.dateAdhesion} {...register("dateAdhesion")} />
                {errors.dateAdhesion && <p className="text-sm text-danger-fort">{errors.dateAdhesion.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="packId">Pack de cotisation</Label>
                <Controller
                  control={control}
                  name="packId"
                  render={({ field }) => (
                    <SelectRecherche
                      id="packId"
                      /* Seuls les packs actifs sont proposables : un pack retiré du catalogue
                         reste renvoyé par l'API pour l'affichage des adhérents existants, mais
                         il ne doit plus être souscrit. */
                      options={(packs ?? [])
                        .filter((p) => p.actif)
                        .map((p) => ({ valeur: p.id, libelle: p.libelle }))}
                      valeur={field.value}
                      onChange={field.onChange}
                      ariaInvalid={!!errors.packId}
                      placeholder="Sélectionner un pack"
                    />
                  )}
                />
                {errors.packId && <p className="text-sm text-danger-fort">{errors.packId.message}</p>}
              </div>
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

              <dl className="grid grid-cols-1 gap-3 rounded-lg border border-bordure bg-surface p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Adhérent</dt>
                  <dd>{formaterNomComplet(getValues("nom"), getValues("prenoms"))}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Téléphone</dt>
                  <dd className="ref">{masquerTelephone(getValues("telephonePrincipal"))}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-texte-doux-fort uppercase">Localisation</dt>
                  <dd>{getValues("localisation")}</dd>
                </div>
              </dl>

              {creerAdherent.isError && !candidatsIgnores && (
                <Alerte teinte="danger">
                  <p>{estErreurApi(creerAdherent.error) ? creerAdherent.error.message : "La création a échoué."}</p>
                </Alerte>
              )}
            </div>
          )}

          <div className="flex justify-between border-t border-bordure pt-4">
            <Button type="button" variant="outline" onClick={etapePrecedente} disabled={etape === 0}>
              Précédent
            </Button>
            {etape < TITRES_ETAPE.length - 1 ? (
              <Button type="button" onClick={() => void etapeSuivante()}>
                Suivant
              </Button>
            ) : (
              <Button type="button" onClick={() => void handleSubmit(() => soumettre(false))()} disabled={creerAdherent.isPending}>
                {creerAdherent.isPending ? "Création en cours…" : "Créer l'adhérent"}
              </Button>
            )}
          </div>
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
