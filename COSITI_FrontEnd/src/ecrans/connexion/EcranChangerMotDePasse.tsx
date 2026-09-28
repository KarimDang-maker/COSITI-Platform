import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Alerte } from "@/components/cositi/alerte";
import { CadreAuthentification } from "@/components/cositi/cadre-authentification";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMotDePasse } from "@/components/cositi/champ-mot-de-passe";
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
    <CadreAuthentification titre="Changer de mot de passe">
      <div className="space-y-6">
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

        <form onSubmit={(event) => void handleSubmit(soumettre)(event)} className="space-y-5" noValidate>
          <ChampFormulaire
            id="ancienMotDePasse"
            libelle="Mot de passe actuel"
            erreur={errors.ancienMotDePasse?.message}
          >
            {(attributs) => (
              <ChampMotDePasse autoComplete="current-password" {...attributs} {...register("ancienMotDePasse")} />
            )}
          </ChampFormulaire>

          <ChampFormulaire
            id="nouveauMotDePasse"
            libelle="Nouveau mot de passe"
            erreur={errors.nouveauMotDePasse?.message}
          >
            {(attributs) => (
              <ChampMotDePasse autoComplete="new-password" {...attributs} {...register("nouveauMotDePasse")} />
            )}
          </ChampFormulaire>

          <ChampFormulaire
            id="confirmation"
            libelle="Confirmer le nouveau mot de passe"
            erreur={errors.confirmation?.message}
          >
            {(attributs) => (
              <ChampMotDePasse autoComplete="new-password" {...attributs} {...register("confirmation")} />
            )}
          </ChampFormulaire>

          <Button type="submit" size="lg" className="w-full" disabled={enCours}>
            {enCours ? "Envoi en cours…" : "Valider"}
          </Button>
        </form>
      </div>
    </CadreAuthentification>
  );
}
