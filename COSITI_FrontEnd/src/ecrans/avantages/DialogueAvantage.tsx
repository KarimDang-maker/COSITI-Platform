import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Alerte } from "@/components/cositi/alerte";
import { useCreerAvantage, useModifierAvantage } from "@/hooks/useAvantages";
import {
  BRANCHES_AVANTAGE,
  CATEGORIES_PIECE,
  TYPES_CRITERE,
  type Avantage,
  type CorpsAvantage,
} from "@/api/avantages";
import { estErreurApi } from "@/api/erreurs";

const TYPES_AVEC_VALEUR = new Set<string>(TYPES_CRITERE.filter((t) => t.avecValeur).map((t) => t.type));

/**
 * Seuls le format et la présence des champs sont contrôlés ici. Le code, l'unicité, les types de critères et leurs
 * valeurs sont validés par l'API, dont le message est affiché tel quel.
 */
const schema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Le code est obligatoire.")
    .regex(/^[A-Z0-9_]+$/, "Le code ne contient que des majuscules, des chiffres et des tirets bas."),
  libelle: z.string().trim().min(1, "Le libellé est obligatoire."),
  branche: z.string().min(1, "La branche est obligatoire."),
  description: z.string().optional(),
  actif: z.boolean(),
  criteres: z
    .array(z.object({ type: z.string().min(1, "Choisissez un type."), valeur: z.string().trim().optional() }))
    .superRefine((criteres, ctx) => {
      criteres.forEach((critere, index) => {
        if (TYPES_AVEC_VALEUR.has(critere.type) && !critere.valeur) {
          ctx.addIssue({ code: "custom", path: [index, "valeur"], message: "Ce critère exige une valeur." });
        }
      });
    }),
  pieces: z.array(
    z.object({ categorie: z.string().min(1), libelle: z.string().trim().min(1, "Le libellé de la pièce est obligatoire.") }),
  ),
});

type Valeurs = z.infer<typeof schema>;

const VALEURS_VIDES: Valeurs = {
  code: "",
  libelle: "",
  branche: "",
  description: "",
  actif: true,
  criteres: [],
  pieces: [],
};

interface DialogueAvantageProps {
  /** `null` = création. */
  avantage: Avantage | null;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

/**
 * Création et modification d'un avantage du catalogue (`POST`/`PUT /avantages`, `AVANTAGE:GERER`). Les critères sont
 * des données : l'écran ne connaît aucun seuil, il transmet ce que le DAF saisit.
 */
export function DialogueAvantage({ avantage, ouvert, onOuvertChange }: DialogueAvantageProps) {
  const creer = useCreerAvantage();
  const modifier = useModifierAvantage(avantage?.id ?? "");
  const enCours = creer.isPending || modifier.isPending;
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Valeurs>({ resolver: zodResolver(schema), defaultValues: VALEURS_VIDES });
  const criteres = useFieldArray({ control, name: "criteres" });
  const pieces = useFieldArray({ control, name: "pieces" });
  const criteresSaisis = useWatch({ control, name: "criteres" });

  useEffect(() => {
    if (!ouvert) return;
    reset(
      avantage
        ? {
            code: avantage.code,
            libelle: avantage.libelle,
            branche: avantage.branche,
            description: avantage.description ?? "",
            actif: avantage.actif,
            criteres: avantage.criteres.map((c) => ({ type: c.type, valeur: c.valeur ?? "" })),
            pieces: avantage.pieces.map((p) => ({ categorie: p.categorie, libelle: p.libelle })),
          }
        : VALEURS_VIDES,
    );
  }, [ouvert, avantage, reset]);

  function fermer(valeur: boolean) {
    if (!valeur) setErreurServeur(null);
    onOuvertChange(valeur);
  }

  async function soumettre(valeurs: Valeurs) {
    setErreurServeur(null);
    const corps: CorpsAvantage = {
      code: valeurs.code.trim(),
      libelle: valeurs.libelle.trim(),
      branche: valeurs.branche as CorpsAvantage["branche"],
      description: valeurs.description?.trim() || undefined,
      actif: valeurs.actif,
      criteres: valeurs.criteres.map((c) => ({
        type: c.type as CorpsAvantage["criteres"][number]["type"],
        valeur: TYPES_AVEC_VALEUR.has(c.type) ? c.valeur?.trim() : undefined,
      })),
      pieces: valeurs.pieces.map((p) => ({ categorie: p.categorie as "CONSTITUTION" | "MAINTIEN", libelle: p.libelle.trim() })),
    };
    try {
      if (avantage) await modifier.mutateAsync(corps);
      else await creer.mutateAsync(corps);
      toast.success(avantage ? "Avantage modifié." : "Avantage créé.");
      fermer(false);
    } catch (e) {
      if (estErreurApi(e) && e.champ && ["code", "libelle", "branche", "description"].includes(e.champ)) {
        setError(e.champ as "code" | "libelle" | "branche" | "description", { message: e.message });
      } else {
        setErreurServeur(estErreurApi(e) ? e.message : "L'avantage n'a pas pu être enregistré.");
      }
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{avantage ? "Modifier l'avantage" : "Nouvel avantage"}</DialogTitle>
          <DialogDescription>
            Les critères sont des données du catalogue : la modification s'applique au prochain recalcul, sans
            redéploiement. Action réservée au DAF, journalisée.
          </DialogDescription>
        </DialogHeader>

        <form id="form-avantage" noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <ChampFormulaire id="av-code" libelle="Code" obligatoire erreur={errors.code?.message} aide="Majuscules, chiffres et tirets bas.">
              {(attributs) => <Input className="ref" {...attributs} {...register("code")} />}
            </ChampFormulaire>
            <ChampFormulaire id="av-branche" libelle="Branche" obligatoire erreur={errors.branche?.message}>
              {(attributs) => (
                <Controller
                  control={control}
                  name="branche"
                  render={({ field }) => (
                    <SelectRecherche
                      id={attributs.id}
                      ariaInvalid={attributs["aria-invalid"]}
                      ariaDescribedBy={attributs["aria-describedby"]}
                      options={BRANCHES_AVANTAGE.map((b) => ({ valeur: b.valeur, libelle: b.libelle }))}
                      valeur={field.value}
                      onChange={field.onChange}
                      placeholder="Sélectionner une branche"
                    />
                  )}
                />
              )}
            </ChampFormulaire>
          </div>
          <ChampFormulaire id="av-libelle" libelle="Libellé" obligatoire erreur={errors.libelle?.message}>
            {(attributs) => <Input {...attributs} {...register("libelle")} />}
          </ChampFormulaire>
          <ChampFormulaire id="av-description" libelle="Description" facultatif erreur={errors.description?.message}>
            {(attributs) => <Textarea {...attributs} {...register("description")} />}
          </ChampFormulaire>
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="actif"
              render={({ field }) => (
                <Switch id="av-actif" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="av-actif">Avantage actif (pris en compte au recalcul)</Label>
          </div>

          <fieldset className="space-y-3">
            <legend className="font-semibold text-titre">Critères d'attribution</legend>
            {criteres.fields.length === 0 && (
              <p className="text-sm text-texte-doux">Aucun critère : l'avantage serait acquis à tous les adhérents.</p>
            )}
            {criteres.fields.map((champ, index) => {
              const type = criteresSaisis?.[index]?.type;
              const definition = TYPES_CRITERE.find((t) => t.type === type);
              return (
                <div key={champ.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <ChampFormulaire id={`av-critere-type-${index}`} libelle={`Critère ${index + 1}`} erreur={errors.criteres?.[index]?.type?.message}>
                    {(attributs) => (
                      <Controller
                        control={control}
                        name={`criteres.${index}.type`}
                        render={({ field }) => (
                          <SelectRecherche
                            id={attributs.id}
                            ariaInvalid={attributs["aria-invalid"]}
                            ariaDescribedBy={attributs["aria-describedby"]}
                            options={TYPES_CRITERE.map((t) => ({ valeur: t.type, libelle: t.libelle }))}
                            valeur={field.value}
                            onChange={field.onChange}
                            placeholder="Type de critère"
                          />
                        )}
                      />
                    )}
                  </ChampFormulaire>
                  {definition?.avecValeur ? (
                    <ChampFormulaire
                      id={`av-critere-valeur-${index}`}
                      libelle={`Valeur du critère ${index + 1}`}
                      aide={definition.aide}
                      erreur={errors.criteres?.[index]?.valeur?.message}
                    >
                      {(attributs) => <Input {...attributs} {...register(`criteres.${index}.valeur`)} />}
                    </ChampFormulaire>
                  ) : (
                    <p className="pt-8 text-sm text-texte-doux">{definition ? "Aucune valeur à saisir." : ""}</p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-7"
                    aria-label={`Retirer le critère ${index + 1}`}
                    onClick={() => criteres.remove(index)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
            <Button type="button" variant="outline" onClick={() => criteres.append({ type: "", valeur: "" })}>
              <Plus className="size-4" aria-hidden="true" /> Ajouter un critère
            </Button>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-semibold text-titre">Pièces du dossier</legend>
            {pieces.fields.map((champ, index) => (
              <div key={champ.id} className="grid items-start gap-3 sm:grid-cols-[14rem_1fr_auto]">
                <ChampFormulaire id={`av-piece-categorie-${index}`} libelle={`Catégorie de la pièce ${index + 1}`}>
                  {(attributs) => (
                    <Controller
                      control={control}
                      name={`pieces.${index}.categorie`}
                      render={({ field }) => (
                        <SelectRecherche
                          id={attributs.id}
                          options={CATEGORIES_PIECE.map((c) => ({ valeur: c.valeur, libelle: c.libelle }))}
                          valeur={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  )}
                </ChampFormulaire>
                <ChampFormulaire id={`av-piece-libelle-${index}`} libelle={`Libellé de la pièce ${index + 1}`} erreur={errors.pieces?.[index]?.libelle?.message}>
                  {(attributs) => <Input {...attributs} {...register(`pieces.${index}.libelle`)} />}
                </ChampFormulaire>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-7"
                  aria-label={`Retirer la pièce ${index + 1}`}
                  onClick={() => pieces.remove(index)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => pieces.append({ categorie: "CONSTITUTION", libelle: "" })}>
              <Plus className="size-4" aria-hidden="true" /> Ajouter une pièce
            </Button>
          </fieldset>

          {erreurServeur && (
            <Alerte teinte="danger" titre="Enregistrement refusé">
              <p>{erreurServeur}</p>
            </Alerte>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => fermer(false)} disabled={enCours}>
            Annuler
          </Button>
          <Button type="submit" form="form-avantage" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
