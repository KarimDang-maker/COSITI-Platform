import { useState } from "react";
import { useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useZones } from "@/hooks/useOrganisation";
import { useActivites, usePreinscrireAdherent, useVerifierDoublon } from "@/hooks/useAdherents";
import type { CandidatDoublon } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterNomComplet } from "@/lib/format";

const schema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire."),
  prenoms: z.string().trim().optional(),
  numeroCni: z.string().trim().optional(),
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
  localisation: z.string().trim().min(1, "La localisation est obligatoire."),
  quartier: z.string().trim().optional(),
  ville: z.string().trim().optional(),
});

type ValeursFormulaire = z.infer<typeof schema>;

function sansVide(valeur: string | undefined): string | undefined {
  const nettoye = valeur?.trim();
  return nettoye ? nettoye : undefined;
}

/**
 * `/adherents/preinscription` — Saisie préparatoire par l'Agent de terrain (correctif COSITI V1 §5).
 *
 * Volontairement plus courte que {@link NouvelAdherent} : ni pack, ni date d'adhésion, ni allocation —
 * ce n'est jamais une création définitive. La Gestionnaire des comptes complète ensuite le dossier
 * (`POST /adherents/{id}/finaliser`, depuis la fiche adhérent).
 */
export function PreinscrireAdherent() {
  const navigate = useNavigate();
  const { data: zones } = useZones();
  const { data: activites } = useActivites();
  const verifierDoublon = useVerifierDoublon();
  const preinscrire = usePreinscrireAdherent();
  const [candidatsIgnores, setCandidatsIgnores] = useState<readonly CandidatDoublon[] | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    control,
    formState: { errors },
  } = useForm<ValeursFormulaire>({ resolver: zodResolver(schema), defaultValues: { zoneId: "", activiteId: "" } });

  async function soumettre(confirmationDoublonIgnore = false) {
    const valeurs = getValues();
    if (!confirmationDoublonIgnore) {
      const resultat = await verifierDoublon.mutateAsync({
        nomComplet: formaterNomComplet(valeurs.nom, valeurs.prenoms),
        telephonePrincipal: valeurs.telephonePrincipal,
        numeroCni: sansVide(valeurs.numeroCni),
        zoneId: valeurs.zoneId,
      });
      if (resultat.candidats.length > 0) {
        setCandidatsIgnores(resultat.candidats);
        return;
      }
    }
    try {
      const adherent = await preinscrire.mutateAsync({
        ...valeurs,
        prenoms: sansVide(valeurs.prenoms),
        telephoneSecondaire: sansVide(valeurs.telephoneSecondaire),
        numeroCni: sansVide(valeurs.numeroCni),
        quartier: sansVide(valeurs.quartier),
        ville: sansVide(valeurs.ville),
        confirmationDoublonIgnore: confirmationDoublonIgnore || undefined,
      });
      toast.success("Adhérent préinscrit. La Gestionnaire des comptes complètera son dossier.");
      navigate(`/adherents/${adherent.id}`);
    } catch (e) {
      if (estErreurApi(e) && e.code === "ADHERENT_DOUBLON_POTENTIEL") {
        const candidats = Array.isArray(e.details?.candidats) ? (e.details.candidats as CandidatDoublon[]) : [];
        setCandidatsIgnores(candidats);
      }
    }
  }

  return (
    <CoquilleApplication titre="Préinscrire un adhérent">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1>Préinscrire un adhérent</h1>
          <p className="text-texte-doux">
            Saisie préparatoire de terrain : identité et contact seulement. La Gestionnaire des comptes
            complètera le pack et l'allocation depuis la fiche adhérent.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="space-y-6"
          noValidate
        >
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
              <Label htmlFor="numeroCni">Numéro CNI</Label>
              <Input id="numeroCni" {...register("numeroCni")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephonePrincipal">Téléphone principal</Label>
              <Input
                id="telephonePrincipal"
                aria-invalid={!!errors.telephonePrincipal}
                {...register("telephonePrincipal")}
              />
              {errors.telephonePrincipal && (
                <p className="text-sm text-danger-fort">{errors.telephonePrincipal.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephoneSecondaire">Téléphone secondaire</Label>
              <Input id="telephoneSecondaire" {...register("telephoneSecondaire")} />
            </div>
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
          </div>

          <div className="flex justify-end border-t border-bordure pt-4">
            <Button
              type="button"
              onClick={() => void handleSubmit(() => soumettre(false))()}
              disabled={preinscrire.isPending || verifierDoublon.isPending}
            >
              {preinscrire.isPending ? "Enregistrement en cours…" : "Préinscrire"}
            </Button>
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
              la préinscription malgré tout ?
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
        libelleConfirmation="Préinscrire quand même"
        enCours={preinscrire.isPending}
        onConfirmer={async () => {
          await soumettre(true);
          setCandidatsIgnores(null);
        }}
      />
    </CoquilleApplication>
  );
}
