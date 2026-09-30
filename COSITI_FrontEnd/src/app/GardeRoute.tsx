import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/auth/ContexteAuth";
import type { CodePermission } from "@/auth/types";
import { AccesNonAutorise } from "@/ecrans/AccesNonAutorise";

interface GardeRouteProps {
  /** Permission requise pour cette route. Absente = simple exigence de session active. */
  permission?: CodePermission;
  children: ReactNode;
}

/**
 * Garde de route. Redirige vers `/connexion` sans session active, affiche
 * « accès non autorisé » sans la permission requise.
 *
 * Rappel (`AGENTS.md` règle 1) : cette garde est un confort de navigation,
 * pas une protection. Elle évite d'afficher un écran dont les appels
 * échoueront de toute façon en `403` — l'autorisation réelle reste décidée
 * par l'API à chaque requête.
 */
export function GardeRoute({ permission, children }: GardeRouteProps) {
  const { statut, aLaPermission } = useAuth();
  const emplacement = useLocation();

  if (statut === "initialisation") {
    return (
      <div role="status" aria-live="polite" className="flex h-dvh items-center justify-center text-texte-doux">
        Vérification de la session…
      </div>
    );
  }

  if (statut === "anonyme") {
    return <Navigate to="/connexion" replace state={{ depuis: emplacement }} />;
  }

  if (permission && !aLaPermission(permission)) {
    return <AccesNonAutorise />;
  }

  return <>{children}</>;
}
