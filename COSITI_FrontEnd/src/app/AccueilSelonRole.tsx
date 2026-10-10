import { Navigate } from "react-router";
import { useAuth } from "@/auth/ContexteAuth";
import { cheminTableauBord } from "@/api/tableauxDeBord";

/**
 * Racine `/` — redirige chacun vers son point d'entrée réel (J9).
 *
 * La destination est déduite des **permissions** renvoyées par `GET /auth/moi`,
 * jamais du rôle : c'est l'API qui décide de ce qui est accessible, le client ne
 * fait que suivre (`AGENTS.md` règle 1).
 *
 * L'Agent de terrain et le Chef des agents de terrain n'ont pas de tableau de
 * bord en V1 (`Roles des acteurs.md §16`) : ils arrivent sur la liste des
 * adhérents, qui est leur écran de travail.
 *
 * Tant que le profil n'est pas chargé, aucune redirection n'est décidée : les
 * permissions sont alors vides, et rediriger à ce moment enverrait **tout le
 * monde** sur l'écran de repli, quel que soit son rôle.
 */
export function AccueilSelonRole() {
  const { statut, utilisateur } = useAuth();

  if (statut === "initialisation") {
    return (
      <div role="status" aria-live="polite" className="flex h-dvh items-center justify-center text-texte-doux">
        Ouverture de votre espace…
      </div>
    );
  }

  const chemin = cheminTableauBord(utilisateur?.permissions ?? []);
  return <Navigate to={chemin ?? "/adherents"} replace />;
}
