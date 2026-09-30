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
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Alerte } from "@/components/cositi/alerte";
import { useModifierAgent, useZones } from "@/hooks/useOrganisation";
import type { Agent } from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";
import { schemaTelephoneObligatoire } from "@/ecrans/adherents/schemas";

const schema = z.object({
  nomComplet: z.string().trim().min(1, "Le nom complet est obligatoire."),
  telephone: schemaTelephoneObligatoire,
  zoneId: z.string().min(1, "La zone est obligatoire."),
  objectifCollecteMensuel: z
    .string()
    .trim()
    .optional()
    .refine((valeur) => !valeur || (/^\d+$/.test(valeur) && Number(valeur) > 0), "Saisissez un montant entier positif, en FCFA."),
});

type Valeurs = z.infer<typeof schema>;

interface DialogueModifierAgentProps {
  agent: Agent;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

/**
 * Modification du profil d'un agent (#5, `PUT /agents/{id}`) — réservée DGA. Les erreurs du serveur sont
 * placées sur le champ concerné quand l'API le désigne ; la saisie est conservée.
 */
export function DialogueModifierAgent({ agent, ouvert, onOuvertChange }: DialogueModifierAgentProps) {
  const { data: zones } = useZones();
  const modifier = useModifierAgent(agent.id);
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Valeurs>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (ouvert) {
      reset({
        nomComplet: agent.nomComplet,
        telephone: agent.telephone,
        zoneId: agent.zoneId ?? "",
        objectifCollecteMensuel: agent.objectifCollecteMensuel === null ? "" : String(agent.objectifCollecteMensuel),
      });
    }
  }, [ouvert, agent, reset]);

  function fermer(valeur: boolean) {
    if (!valeur) setErreurServeur(null);
    onOuvertChange(valeur);
  }

  async function soumettre(valeurs: Valeurs) {
    setErreurServeur(null);
    try {
      await modifier.mutateAsync({
        nomComplet: valeurs.nomComplet.trim(),
        telephone: valeurs.telephone.trim(),
        zoneId: valeurs.zoneId,
        objectifCollecteMensuel: valeurs.objectifCollecteMensuel ? Number(valeurs.objectifCollecteMensuel) : null,
      });
      toast.success("Profil de l'agent enregistré.");
      fermer(false);
    } catch (e) {
      if (estErreurApi(e) && e.champ && ["nomComplet", "telephone", "zoneId", "objectifCollecteMensuel"].includes(e.champ)) {
        setError(e.champ as keyof Valeurs, { message: e.message });
      } else {
        setErreurServeur(estErreurApi(e) ? e.message : "Le profil n'a pas pu être enregistré.");
      }
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier le profil de l'agent</DialogTitle>
          <DialogDescription>
            Code <span className="ref">{agent.codeAgent}</span> — action réservée à la DGA, journalisée.
          </DialogDescription>
        </DialogHeader>

        <form id="form-agent" noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-5">
          <ChampFormulaire id="ag-nomComplet" libelle="Nom complet" obligatoire erreur={errors.nomComplet?.message}>
            {(attributs) => <Input {...attributs} {...register("nomComplet")} />}
          </ChampFormulaire>
          <div className="grid gap-5 sm:grid-cols-2">
            <ChampFormulaire id="ag-telephone" libelle="Téléphone" obligatoire erreur={errors.telephone?.message}>
              {(attributs) => <Input type="tel" {...attributs} {...register("telephone")} />}
            </ChampFormulaire>
            <ChampFormulaire id="ag-zoneId" libelle="Zone" obligatoire erreur={errors.zoneId?.message}>
              {(attributs) => (
                <Controller
                  control={control}
                  name="zoneId"
                  render={({ field }) => (
                    <SelectRecherche
                      id={attributs.id}
                      ariaInvalid={attributs["aria-invalid"]}
                      ariaDescribedBy={attributs["aria-describedby"]}
                      options={(zones ?? []).map((z) => ({ valeur: z.id, libelle: z.libelle }))}
                      valeur={field.value}
                      onChange={field.onChange}
                      placeholder="Sélectionner une zone"
                    />
                  )}
                />
              )}
            </ChampFormulaire>
          </div>
          <ChampFormulaire
            id="ag-objectif"
            libelle="Objectif de collecte mensuel (FCFA)"
            facultatif
            erreur={errors.objectifCollecteMensuel?.message}
            aide="Laisser vide pour ne fixer aucun objectif."
          >
            {(attributs) => <Input inputMode="numeric" className="chiffre" {...attributs} {...register("objectifCollecteMensuel")} />}
          </ChampFormulaire>
          {erreurServeur && (
            <Alerte teinte="danger" titre="Enregistrement refusé">
              <p>{erreurServeur}</p>
            </Alerte>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => fermer(false)} disabled={modifier.isPending}>
            Annuler
          </Button>
          <Button type="submit" form="form-agent" disabled={modifier.isPending}>
            {modifier.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
