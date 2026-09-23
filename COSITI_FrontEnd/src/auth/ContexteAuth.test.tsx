import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import { serveur } from "@/test/msw/serveur";
import { AuthProvider, useAuth } from "@/auth/ContexteAuth";
import { UTILISATEURS } from "@/test/msw/donnees";

function Temoin() {
  const { statut } = useAuth();
  return <p>statut : {statut}</p>;
}

/**
 * Régression du jalon J12, constatée en recette E2E.
 *
 * `StrictMode` monte, démonte puis remonte en développement : l'effet de reprise de
 * session partait donc deux fois. Le serveur faisant tourner le jeton de rafraîchissement
 * à chaque usage, le second appel présentait un jeton déjà consommé — traité comme un vol
 * probable, il révoquait **toute la famille** et déconnectait l'utilisateur
 * (`ServiceJetonImpl.rafraichir`). Le même enchaînement se produit en production avec deux
 * onglets restaurés ensemble ; ce n'est pas un artefact de développement.
 */
describe("AuthProvider — reprise de session", () => {
  it("ne lance qu'une reprise même sous le double montage de StrictMode", async () => {
    const jeton = Object.keys(UTILISATEURS)[0];
    let appels = 0;
    serveur.use(
      http.post("/api/v1/auth/rafraichir", async () => {
        appels += 1;
        await new Promise((resoudre) => setTimeout(resoudre, 20));
        return HttpResponse.json({ jetonAcces: jeton });
      }),
    );

    render(
      <StrictMode>
        <AuthProvider>
          <Temoin />
        </AuthProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByText(/statut : connecte/)).toBeInTheDocument());
    expect(appels).toBe(1);
  });
});
