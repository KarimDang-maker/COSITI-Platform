import { useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
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
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { useCreerAgent, useZones } from "@/hooks/useOrganisation";
import { estErreurApi } from "@/api/erreurs";

const schema = z.object({
  identifiantConnexion: z.string().trim().min(1, "L'identifiant de connexion est obligatoire."),
  nomComplet: z.string().trim().min(1, "Le nom complet est obligatoire."),
  telephone: z.string().trim().min(1, "Le téléphone est obligatoire."),
  zoneId: z.string().min(1, "La zone est obligatoire."),
  objectifCollecteMensuel: z.string().optional(),
});

type Valeurs = z.infer<typeof schema>;

interface DialogueAjouterAgentProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  /** Appelé à la fermeture, une fois le mot de passe initial affiché : ouverture de la fiche du nouvel agent (#4). */
  onAgentCree?: (agentId: string) => void;
}

/** DGA-F01 : ajout d'un Agent de terrain. Réservé à `ORGANISATION:GERER` (masqué par l'appelant si absent). */
export function DialogueAjouterAgent({ ouvert, onOuvertChange, onAgentCree }: DialogueAjouterAgentProps) {
  const { data: zones } = useZones();
  const creerAgent = useCreerAgent();
  const [motDePasseInitial, setMotDePasseInitial] = useState<string | null>(null);
  const [agentCreeId, setAgentCreeId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<Valeurs>({ resolver: zodResolver(schema) });

  async function soumettre(valeurs: Valeurs) {
    try {
      const agent = await creerAgent.mutateAsync({
        identifiantConnexion: valeurs.identifiantConnexion,
        nomComplet: valeurs.nomComplet,
        telephone: valeurs.telephone,
        zoneId: valeurs.zoneId,
        objectifCollecteMensuel: valeurs.objectifCollecteMensuel ? Number(valeurs.objectifCollecteMensuel) : undefined,
      });
      toast.success(`Agent ${agent.nomComplet} créé.`);
      setMotDePasseInitial(agent.motDePasseInitial ?? null);
      setAgentCreeId(agent.id);
      reset();
    } catch {
      // L'erreur est affichée via creerAgent.error ci-dessous.
    }
  }

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(valeur) => {
        if (!valeur) {
          setMotDePasseInitial(null);
          if (agentCreeId) onAgentCree?.(agentCreeId);
          setAgentCreeId(null);
        }
        onOuvertChange(valeur);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un Agent de terrain</DialogTitle>
          <DialogDescription>Action réservée à la DGA, journalisée dans l'audit.</DialogDescription>
        </DialogHeader>

        {motDePasseInitial ? (
          <div className="space-y-4">
            <Alerte teinte="succes" titre="Agent créé">
              <p>
                Mot de passe initial (à transmettre à l'agent, il ne sera plus jamais affiché) :{" "}
                <span className="ref font-semibold">{motDePasseInitial}</span>
              </p>
            </Alerte>
            <DialogFooter>
              <Button
                onClick={() => {
                  setMotDePasseInitial(null);
                  if (agentCreeId) onAgentCree?.(agentCreeId);
                  setAgentCreeId(null);
                  onOuvertChange(false);
                }}
              >
                Fermer
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-5" noValidate>
            <ChampFormulaire
              id="identifiantConnexion"
              libelle="Identifiant de connexion"
              erreur={errors.identifiantConnexion?.message}
            >
              {(attributs) => <Input {...attributs} {...register("identifiantConnexion")} />}
            </ChampFormulaire>
            <div className="grid gap-5 sm:grid-cols-2">
              <ChampFormulaire id="nomComplet" libelle="Nom complet" erreur={errors.nomComplet?.message}>
                {(attributs) => <Input {...attributs} {...register("nomComplet")} />}
              </ChampFormulaire>
              <ChampFormulaire id="telephone" libelle="Téléphone" erreur={errors.telephone?.message}>
                {(attributs) => <Input {...attributs} {...register("telephone")} />}
              </ChampFormulaire>
            </div>
            <ChampFormulaire id="zoneId" libelle="Zone" erreur={errors.zoneId?.message}>
              {(attributs) => (
                <Controller
                  control={control as Control<Valeurs>}
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
            <ChampFormulaire id="objectifCollecteMensuel" libelle="Objectif de collecte mensuel (FCFA, facultatif)">
              {(attributs) => <Input {...attributs} type="number" min="0" {...register("objectifCollecteMensuel")} />}
            </ChampFormulaire>

            {creerAgent.isError && (
              <Alerte teinte="danger">
                <p>{estErreurApi(creerAgent.error) ? creerAgent.error.message : "La création a échoué."}</p>
              </Alerte>
            )}

            <DialogFooter>
              <Button type="submit" disabled={creerAgent.isPending}>
                {creerAgent.isPending ? "Création en cours…" : "Créer l'agent"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
