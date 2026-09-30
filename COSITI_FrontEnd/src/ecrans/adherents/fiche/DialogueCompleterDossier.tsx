import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampDate } from "@/components/cositi/champ-date";
import { Alerte } from "@/components/cositi/alerte";
import { useChampsManquants, useCompleterProfil } from "@/hooks/useAdherents";
import type { CorpsCompletionProfil, Sexe } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { schemaLatitude, schemaLongitude, schemaTelephoneFacultatif, sansVide, texteVersNombre } from "@/ecrans/adherents/schemas";

/**
 * Clés du paramètre `[V]` `CHAMPS_COMPLETION_ADHERENT` que ce formulaire sait saisir. Une clé renvoyée par
 * le serveur et absente d'ici (paramètre modifié côté administration) est listée sans champ, avec une
 * invitation à passer par la modification de la fiche — jamais ignorée en silence.
 */
const CLES_SAISISSABLES = new Set([
  "DATE_NAISSANCE",
  "SEXE",
  "TELEPHONE_SECONDAIRE",
  "NUMERO_CNI",
  "NUMERO_CNPS",
  "QUARTIER",
  "VILLE",
  "GEOLOCALISATION",
  "CONSENTEMENT",
]);

const schema = z.object({
  dateNaissance: z.string().optional(),
  sexe: z.enum(["M", "F"]).optional(),
  telephoneSecondaire: schemaTelephoneFacultatif,
  numeroCni: z.string().trim().optional(),
  numeroCnps: z.string().trim().optional(),
  quartier: z.string().trim().optional(),
  ville: z.string().trim().optional(),
  latitude: schemaLatitude,
  longitude: schemaLongitude,
  consentementDonnees: z.boolean(),
});

type Valeurs = z.infer<typeof schema>;

interface DialogueCompleterDossierProps {
  adherentId: string;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

/**
 * Parcours de complétion (#16). Ne propose **que** les champs que le serveur déclare manquants (#15) ;
 * après l'envoi, la complétion est recalculée par le serveur et relue — jamais estimée ici.
 */
export function DialogueCompleterDossier({ adherentId, ouvert, onOuvertChange }: DialogueCompleterDossierProps) {
  const { data: manquants, isLoading, isError } = useChampsManquants(adherentId, ouvert);
  const completer = useCompleterProfil(adherentId);
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Valeurs>({ resolver: zodResolver(schema), defaultValues: { consentementDonnees: false } });

  useEffect(() => {
    if (ouvert) {
      reset({ consentementDonnees: false });
    }
  }, [ouvert, reset]);

  const cles = new Set((manquants ?? []).map((c) => c.cle));
  const nonSaisissables = (manquants ?? []).filter((c) => !CLES_SAISISSABLES.has(c.cle));
  const libelle = (cle: string, defaut: string) => manquants?.find((c) => c.cle === cle)?.libelle ?? defaut;

  async function soumettre(valeurs: Valeurs) {
    setErreurServeur(null);
    const corps: CorpsCompletionProfil = {
      dateNaissance: sansVide(valeurs.dateNaissance),
      sexe: valeurs.sexe as Sexe | undefined,
      telephoneSecondaire: sansVide(valeurs.telephoneSecondaire),
      numeroCni: sansVide(valeurs.numeroCni),
      numeroCnps: sansVide(valeurs.numeroCnps),
      quartier: sansVide(valeurs.quartier),
      ville: sansVide(valeurs.ville),
      latitude: texteVersNombre(valeurs.latitude) ?? undefined,
      longitude: texteVersNombre(valeurs.longitude) ?? undefined,
      consentementDonnees: valeurs.consentementDonnees,
    };
    const renseigne = Object.entries(corps).some(([cle, valeur]) =>
      cle === "consentementDonnees" ? valeur === true : valeur !== undefined,
    );
    if (!renseigne) {
      setErreurServeur("Renseignez au moins une information avant d'enregistrer.");
      return;
    }
    try {
      await completer.mutateAsync(corps);
      toast.success("Dossier complété. Le taux de complétion a été recalculé.");
      onOuvertChange(false);
    } catch (e) {
      setErreurServeur(estErreurApi(e) ? e.message : "La complétion n'a pas pu être enregistrée.");
    }
  }

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(valeur) => {
        if (!valeur) setErreurServeur(null);
        onOuvertChange(valeur);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compléter le dossier</DialogTitle>
          <DialogDescription>
            Seules les informations encore manquantes sont proposées. Les champs laissés vides ne sont pas modifiés.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && (
          <Alerte teinte="danger">
            <p>Impossible de charger la liste des informations manquantes.</p>
          </Alerte>
        )}

        {manquants && manquants.length === 0 && (
          <Alerte teinte="succes" titre="Dossier complet">
            <p>Toutes les informations prises en compte pour la complétion sont renseignées.</p>
          </Alerte>
        )}

        {manquants && manquants.length > 0 && (
          <form id="form-completion" noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {cles.has("DATE_NAISSANCE") && (
                <ChampFormulaire id="c-dateNaissance" libelle={libelle("DATE_NAISSANCE", "Date de naissance")}>
                  {(attributs) => <ChampDate {...attributs} {...register("dateNaissance")} />}
                </ChampFormulaire>
              )}
              {cles.has("SEXE") && (
                <ChampFormulaire id="c-sexe" libelle={libelle("SEXE", "Sexe")}>
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
              )}
              {cles.has("TELEPHONE_SECONDAIRE") && (
                <ChampFormulaire
                  id="c-telephoneSecondaire"
                  libelle={libelle("TELEPHONE_SECONDAIRE", "Téléphone secondaire")}
                  erreur={errors.telephoneSecondaire?.message}
                >
                  {(attributs) => <Input type="tel" {...attributs} {...register("telephoneSecondaire")} />}
                </ChampFormulaire>
              )}
              {cles.has("NUMERO_CNI") && (
                <ChampFormulaire id="c-numeroCni" libelle={libelle("NUMERO_CNI", "Numéro CNI")}>
                  {(attributs) => <Input {...attributs} {...register("numeroCni")} />}
                </ChampFormulaire>
              )}
              {cles.has("NUMERO_CNPS") && (
                <ChampFormulaire id="c-numeroCnps" libelle={libelle("NUMERO_CNPS", "Numéro CNPS")}>
                  {(attributs) => <Input {...attributs} {...register("numeroCnps")} />}
                </ChampFormulaire>
              )}
              {cles.has("QUARTIER") && (
                <ChampFormulaire id="c-quartier" libelle={libelle("QUARTIER", "Quartier")}>
                  {(attributs) => <Input {...attributs} {...register("quartier")} />}
                </ChampFormulaire>
              )}
              {cles.has("VILLE") && (
                <ChampFormulaire id="c-ville" libelle={libelle("VILLE", "Ville")}>
                  {(attributs) => <Input {...attributs} {...register("ville")} />}
                </ChampFormulaire>
              )}
              {cles.has("GEOLOCALISATION") && (
                <>
                  <ChampFormulaire id="c-latitude" libelle="Latitude" erreur={errors.latitude?.message}>
                    {(attributs) => <Input inputMode="decimal" {...attributs} {...register("latitude")} />}
                  </ChampFormulaire>
                  <ChampFormulaire id="c-longitude" libelle="Longitude" erreur={errors.longitude?.message}>
                    {(attributs) => <Input inputMode="decimal" {...attributs} {...register("longitude")} />}
                  </ChampFormulaire>
                </>
              )}
            </div>

            {cles.has("CONSENTEMENT") && (
              <Controller
                control={control}
                name="consentementDonnees"
                render={({ field }) => (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="c-consentement"
                      checked={field.value}
                      onCheckedChange={(valeur) => field.onChange(valeur === true)}
                    />
                    <Label htmlFor="c-consentement" className="leading-snug font-normal">
                      L'adhérent a donné son consentement au traitement de ses données personnelles.
                    </Label>
                  </div>
                )}
              />
            )}

            {nonSaisissables.length > 0 && (
              <Alerte teinte="info" titre="À renseigner depuis la fiche">
                <ul className="list-disc pl-5">
                  {nonSaisissables.map((c) => (
                    <li key={c.cle}>{c.libelle}</li>
                  ))}
                </ul>
                {/* TODO [V] : aucun référentiel d'associations n'est exposé par l'API — l'association ne
                    peut donc pas être choisie dans une liste. À confirmer avec la COSITI. */}
                <p className="mt-2 text-sm">Ces informations ne peuvent pas être saisies dans ce parcours.</p>
              </Alerte>
            )}

            {erreurServeur && (
              <Alerte teinte="danger">
                <p>{erreurServeur}</p>
              </Alerte>
            )}
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => {
              setErreurServeur(null);
              onOuvertChange(false);
            }} disabled={completer.isPending}>
            Annuler
          </Button>
          {manquants && manquants.length > 0 && (
            <Button type="submit" form="form-completion" disabled={completer.isPending}>
              {completer.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
