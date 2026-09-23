import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alerte } from "@/components/cositi/alerte";
import { client } from "@/api/client";
import { estErreurApi } from "@/api/erreurs";
import { useAuth } from "@/auth/ContexteAuth";

/**
 * Aucune règle de complexité n'est affirmée ici (longueur minimale, jeux de
 * caractères…) : c'est une politique de sécurité, décidée et appliquée par
 * l'API (`AGENTS.md` règle 2). Le formulaire ne vérifie que la présence des
 * champs et la concordance de la confirmation ; toute règle de robustesse
 * refusée est renvoyée par l'API et affichée telle quelle.
 */
const schema = z
  .object({
    ancienMotDePasse: z.string().min(1, "Le mot de passe actuel est obligatoire."),
    nouveauMotDePasse: z.string().min(1, "Le nouveau mot de passe est obligatoire."),
    confirmation: z.string().min(1, "La confirmation est obligatoire."),
  })
  .refine((valeurs) => valeurs.nouveauMotDePasse === valeurs.confirmation, {
    message: "La confirmation ne correspond pas au nouveau mot de passe.",
    path: ["confirmation"],
  });

type FormulaireChangement = z.infer<typeof schema>;

export function EcranChangerMotDePasse() {
  const { rafraichirProfil } = useAuth();
  const navigate = useNavigate();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormulaireChangement>({ resolver: zodResolver(schema) });

  async function soumettre(valeurs: FormulaireChangement) {
    setErreur(null);
    setEnCours(true);
    try {
      await client.post("/auth/mot-de-passe/changer", {
        ancienMotDePasse: valeurs.ancienMotDePasse,
        nouveauMotDePasse: valeurs.nouveauMotDePasse,
      });
      setSucces(true);
      await rafraichirProfil();
      navigate("/", { replace: true });
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "Le changement de mot de passe a échoué.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-fond p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-bordure bg-surface p-8 shadow-[var(--shadow-carte)]">
        <h1 className="text-center">Changer de mot de passe</h1>

        {erreur && (
          <Alerte teinte="danger">
            <p>{erreur}</p>
          </Alerte>
        )}
        {succes && (
          <Alerte teinte="succes">
            <p>Mot de passe modifié.</p>
          </Alerte>
        )}

        <form onSubmit={(event) => void handleSubmit(soumettre)(event)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="ancienMotDePasse">Mot de passe actuel</Label>
            <Input
              id="ancienMotDePasse"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.ancienMotDePasse}
              aria-describedby={errors.ancienMotDePasse ? "ancien-erreur" : undefined}
              {...register("ancienMotDePasse")}
            />
            {errors.ancienMotDePasse && (
              <p id="ancien-erreur" className="text-sm text-danger-fort">
                {errors.ancienMotDePasse.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nouveauMotDePasse">Nouveau mot de passe</Label>
            <Input
              id="nouveauMotDePasse"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.nouveauMotDePasse}
              aria-describedby={errors.nouveauMotDePasse ? "nouveau-erreur" : undefined}
              {...register("nouveauMotDePasse")}
            />
            {errors.nouveauMotDePasse && (
              <p id="nouveau-erreur" className="text-sm text-danger-fort">
                {errors.nouveauMotDePasse.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmation}
              aria-describedby={errors.confirmation ? "confirmation-erreur" : undefined}
              {...register("confirmation")}
            />
            {errors.confirmation && (
              <p id="confirmation-erreur" className="text-sm text-danger-fort">
                {errors.confirmation.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={enCours}>
            {enCours ? "Envoi en cours…" : "Valider"}
          </Button>
        </form>
      </div>
    </div>
  );
}
