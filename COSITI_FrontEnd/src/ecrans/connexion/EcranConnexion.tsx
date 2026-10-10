import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate, type Location } from "react-router";
import { Lock, LogIn, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alerte } from "@/components/cositi/alerte";
import { CadreAuthentification } from "@/components/cositi/cadre-authentification";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampIcone } from "@/components/cositi/champ-icone";
import { ChampMotDePasse } from "@/components/cositi/champ-mot-de-passe";
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
    <CadreAuthentification titre="Connexion" sousTitre="Back-office de la coopérative COSITI COOP-CA.">
      <div className="space-y-6">
        {erreur && (
          <Alerte teinte="danger">
            <p>{erreur}</p>
          </Alerte>
        )}

        <form onSubmit={(event) => void handleSubmit(soumettre)(event)} className="space-y-5" noValidate>
          <ChampFormulaire id="identifiant" libelle="Identifiant" erreur={errors.identifiant?.message}>
            {(attributs) => (
              <ChampIcone icone={UserRound} autoComplete="username" {...attributs} {...register("identifiant")} />
            )}
          </ChampFormulaire>

          <ChampFormulaire id="motDePasse" libelle="Mot de passe" erreur={errors.motDePasse?.message}>
            {(attributs) => (
              <ChampMotDePasse icone={Lock} autoComplete="current-password" {...attributs} {...register("motDePasse")} />
            )}
          </ChampFormulaire>

          <Button type="submit" size="lg" className="w-full" disabled={enCours}>
            {enCours ? "Connexion en cours…" : "Se connecter"}
            {!enCours && <LogIn aria-hidden="true" />}
          </Button>
        </form>
      </div>
    </CadreAuthentification>
  );
}
