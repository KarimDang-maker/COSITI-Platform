import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampDate } from "@/components/cositi/champ-date";
import { Alerte } from "@/components/cositi/alerte";
import { useModifierAdherent } from "@/hooks/useAdherents";
import type { Adherent } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { corpsModificationDepuisFiche, schemaIdentite, type ValeursIdentite } from "@/ecrans/adherents/schemas";

interface DialogueModifierIdentiteProps {
  adherent: Adherent;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

/**
 * Modification de l'identité (#13, `PUT /adherents/{id}`). Les coordonnées et les informations
 * professionnelles ont leurs propres formulaires ; ce `PUT` remplaçant toute la fiche, les autres champs
 * sont renvoyés tels qu'ils ont été lus. L'utilisateur reste sur la fiche après l'enregistrement.
 */
export function DialogueModifierIdentite({ adherent, ouvert, onOuvertChange }: DialogueModifierIdentiteProps) {
  const modifier = useModifierAdherent(adherent.id);
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ValeursIdentite>({ resolver: zodResolver(schemaIdentite) });

  useEffect(() => {
    if (ouvert) {
      reset({
        nom: adherent.nom,
        prenoms: adherent.prenoms ?? "",
        dateNaissance: adherent.dateNaissance ?? "",
        sexe: adherent.sexe ?? undefined,
      });
    }
  }, [ouvert, adherent, reset]);

  async function soumettre(valeurs: ValeursIdentite) {
    setErreurServeur(null);
    try {
      await modifier.mutateAsync(corpsModificationDepuisFiche(adherent, valeurs));
      toast.success("Fiche enregistrée.");
      onOuvertChange(false);
    } catch (e) {
      if (estErreurApi(e) && e.champ && ["nom", "prenoms", "dateNaissance", "sexe"].includes(e.champ)) {
        setError(e.champ as keyof ValeursIdentite, { message: e.message });
      } else if (estErreurApi(e) && e.statut === 409) {
        setErreurServeur(`${e.message} Rechargez la fiche pour voir la version à jour avant de modifier.`);
      } else {
        setErreurServeur(estErreurApi(e) ? e.message : "La fiche n'a pas pu être enregistrée.");
      }
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier l'identité</DialogTitle>
          <DialogDescription>Le matricule et la zone ne se modifient pas.</DialogDescription>
        </DialogHeader>

        <form id="form-identite" noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ChampFormulaire id="id-nom" libelle="Nom" obligatoire erreur={errors.nom?.message} className="sm:col-span-2">
              {(attributs) => <Input {...attributs} {...register("nom")} />}
            </ChampFormulaire>
            <ChampFormulaire id="id-prenoms" libelle="Prénoms" facultatif className="sm:col-span-2">
              {(attributs) => <Input {...attributs} {...register("prenoms")} />}
            </ChampFormulaire>
            <ChampFormulaire id="id-dateNaissance" libelle="Date de naissance" facultatif erreur={errors.dateNaissance?.message}>
              {(attributs) => <ChampDate {...attributs} {...register("dateNaissance")} />}
            </ChampFormulaire>
            <ChampFormulaire id="id-sexe" libelle="Sexe" facultatif>
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
          </div>
          {erreurServeur && (
            <Alerte teinte="danger" titre="Enregistrement refusé">
              <p>{erreurServeur}</p>
            </Alerte>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
              setErreurServeur(null);
              onOuvertChange(false);
            }} disabled={modifier.isPending}>
            Annuler
          </Button>
          <Button type="submit" form="form-identite" disabled={modifier.isPending}>
            {modifier.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
