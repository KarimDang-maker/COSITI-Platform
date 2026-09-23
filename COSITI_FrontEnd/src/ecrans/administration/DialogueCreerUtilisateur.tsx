import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Label } from "@/components/ui/label";
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { useCreerUtilisateur, useRolesAdmin } from "@/hooks/useAdministration";
import type { CodeRole } from "@/auth/types";
import { estErreurApi } from "@/api/erreurs";

const schema = z.object({
  identifiant: z.string().trim().min(1, "L'identifiant de connexion est obligatoire."),
  nomComplet: z.string().trim().min(1, "Le nom complet est obligatoire."),
  email: z.string().email("Adresse électronique invalide.").optional().or(z.literal("")),
  telephone: z.string().optional(),
});

type Valeurs = z.infer<typeof schema>;

interface DialogueCreerUtilisateurProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}

/**
 * Création d'un compte (UC-SA-01, J11).
 *
 * **Aucun champ de mot de passe.** Il est généré par le serveur et affiché une
 * seule fois à la fin : laisser l'administrateur le choisir en ferait un secret
 * partagé dès la création du compte. Même principe qu'à l'ajout d'un agent par
 * la DGA (jalon J3).
 */
export function DialogueCreerUtilisateur({ ouvert, onOuvertChange }: DialogueCreerUtilisateurProps) {
  const { data: roles } = useRolesAdmin();
  const creer = useCreerUtilisateur();

  const [roleChoisi, setRoleChoisi] = useState<CodeRole | undefined>();
  const [motDePasseInitial, setMotDePasseInitial] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Valeurs>({ resolver: zodResolver(schema) });

  function fermer(ouvertSuivant: boolean) {
    if (!ouvertSuivant) {
      reset();
      setRoleChoisi(undefined);
      setMotDePasseInitial(null);
      setErreur(null);
    }
    onOuvertChange(ouvertSuivant);
  }

  async function soumettre(valeurs: Valeurs) {
    setErreur(null);
    if (!roleChoisi) {
      setErreur("Un compte doit porter au moins un rôle.");
      return;
    }
    try {
      const cree = await creer.mutateAsync({
        identifiant: valeurs.identifiant,
        nomComplet: valeurs.nomComplet,
        email: valeurs.email || undefined,
        telephone: valeurs.telephone || undefined,
        roles: [roleChoisi],
      });
      setMotDePasseInitial(cree.motDePasseInitial);
      toast.success(`Compte ${cree.utilisateur.identifiant} créé.`);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "Le compte n'a pas pu être créé.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        {motDePasseInitial ? (
          <>
            <DialogHeader>
              <DialogTitle>Compte créé</DialogTitle>
              <DialogDescription>
                Transmettez ce mot de passe à son détenteur par un canal sûr. Il ne sera plus affiché après
                la fermeture de cette fenêtre, et son détenteur devra le changer à la première connexion.
              </DialogDescription>
            </DialogHeader>

            <p className="ref select-all rounded-lg border border-bordure bg-surface-douce p-4 text-center text-lg">
              {motDePasseInitial}
            </p>

            <DialogFooter>
              <Button onClick={() => fermer(false)}>J'ai noté le mot de passe</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit(soumettre)} noValidate>
            <DialogHeader>
              <DialogTitle>Créer un compte</DialogTitle>
              <DialogDescription>
                Le mot de passe est généré par le serveur et affiché une seule fois à la fin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="identifiant-compte">Identifiant de connexion</Label>
                <Input id="identifiant-compte" {...register("identifiant")} />
                {errors.identifiant && (
                  <p className="text-sm text-danger-fort">{errors.identifiant.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nom-compte">Nom complet</Label>
                <Input id="nom-compte" {...register("nomComplet")} />
                {errors.nomComplet && (
                  <p className="text-sm text-danger-fort">{errors.nomComplet.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-compte">Adresse électronique</Label>
                <Input id="email-compte" type="email" {...register("email")} />
                {errors.email && <p className="text-sm text-danger-fort">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-compte">Rôle</Label>
                <SelectRecherche
                  id="role-compte"
                  options={(roles ?? []).map((role) => ({ valeur: role.code, libelle: role.libelle }))}
                  valeur={roleChoisi}
                  onChange={(valeur) => setRoleChoisi(valeur as CodeRole | undefined)}
                  placeholder="Choisir un rôle"
                />
              </div>

              {erreur && (
                <Alerte teinte="danger" titre="Création impossible">
                  <p>{erreur}</p>
                </Alerte>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => fermer(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={creer.isPending}>
                {creer.isPending ? "Création…" : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
