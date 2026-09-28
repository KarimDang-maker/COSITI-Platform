import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate, type Location } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alerte } from "@/components/cositi/alerte";
import { LogoCositi } from "@/components/cositi/logo-cositi";
import { useAuth } from "@/auth/ContexteAuth";
import { estErreurApi } from "@/api/erreurs";

const schemaConnexion = z.object({
  identifiant: z.string().trim().min(1, "L'identifiant est obligatoire."),
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire."),
});

type FormulaireConnexion = z.infer<typeof schemaConnexion>;

interface EtatEmplacement {
  depuis?: Location;
}

/**
 * Écran de connexion. Le message d'erreur est unique et ne distingue jamais
 * un identifiant inconnu d'un mot de passe incorrect — cette distinction
 * faciliterait l'énumération de comptes.
 */
export function EcranConnexion() {
  const { connecter } = useAuth();
  const navigate = useNavigate();
  const emplacement = useLocation();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormulaireConnexion>({ resolver: zodResolver(schemaConnexion) });

  async function soumettre(valeurs: FormulaireConnexion) {
    setErreur(null);
    setEnCours(true);
    try {
      const { doitChangerMotDePasse } = await connecter(valeurs.identifiant, valeurs.motDePasse);
      if (doitChangerMotDePasse) {
        navigate("/mot-de-passe/changer", { replace: true });
        return;
      }
      const etat = emplacement.state as EtatEmplacement | null;
      const destination = etat?.depuis ? `${etat.depuis.pathname}${etat.depuis.search}` : "/";
      navigate(destination, { replace: true });
    } catch (e) {
      // Message générique volontaire : ne jamais indiquer si l'identifiant
      // existe ou si c'est le mot de passe qui est incorrect.
      setErreur("Identifiant ou mot de passe incorrect.");
      if (estErreurApi(e) && e.statut === 429) {
        setErreur("Trop de tentatives. Réessayez dans quelques minutes.");
      }
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-fond p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-bordure bg-surface p-8 shadow-[var(--shadow-carte)]">
        <div className="flex flex-col items-center gap-4">
          <LogoCositi contexte="connexion-verticale" className="h-20 w-auto" />
          <h1 className="text-center">Connexion</h1>
        </div>

        {erreur && (
          <Alerte teinte="danger">
            <p>{erreur}</p>
          </Alerte>
        )}

        <form onSubmit={(event) => void handleSubmit(soumettre)(event)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="identifiant">Identifiant</Label>
            <Input
              id="identifiant"
              autoComplete="username"
              aria-invalid={!!errors.identifiant}
              aria-describedby={errors.identifiant ? "identifiant-erreur" : undefined}
              {...register("identifiant")}
            />
            {errors.identifiant && (
              <p id="identifiant-erreur" className="text-sm text-danger-fort">
                {errors.identifiant.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motDePasse">Mot de passe</Label>
            <Input
              id="motDePasse"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.motDePasse}
              aria-describedby={errors.motDePasse ? "mot-de-passe-erreur" : undefined}
              {...register("motDePasse")}
            />
            {errors.motDePasse && (
              <p id="mot-de-passe-erreur" className="text-sm text-danger-fort">
                {errors.motDePasse.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={enCours}>
            {enCours ? "Connexion en cours…" : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
