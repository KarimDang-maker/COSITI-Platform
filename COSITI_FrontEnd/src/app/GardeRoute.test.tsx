import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DGA } from "@/test/msw/donnees";
import { GardeRoute } from "@/app/GardeRoute";

/** Simule une session déjà active (cookie de rafraîchissement valide) au montage. */
function simulerSessionActive(jeton: string) {
  serveur.use(
    http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })),
  );
}

function arbreProtege(permission?: string) {
  return (
    <Routes>
      <Route
        path="/prive"
        element={
          <GardeRoute permission={permission}>
            <p>Contenu protégé</p>
          </GardeRoute>
        }
      />
      <Route path="/connexion" element={<p>Écran de connexion</p>} />
    </Routes>
  );
}

describe("GardeRoute", () => {
  it("redirige vers /connexion quand aucune session n'est active", async () => {
    rendreAvecProviders(arbreProtege(), { routeInitiale: "/prive" });

    await waitFor(() => expect(screen.getByText("Écran de connexion")).toBeInTheDocument());
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("refuse l'accès quand la session est active mais la permission manque", async () => {
    simulerSessionActive(JETON_DGA); // DGA : ADHERENT:LIRE, PAIEMENT:LIRE — pas PAIEMENT:VALIDER
    rendreAvecProviders(arbreProtege("PAIEMENT:VALIDER"), { routeInitiale: "/prive" });

    expect(await screen.findByText("Accès non autorisé")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("affiche le contenu quand la session est active et la permission est présente", async () => {
    simulerSessionActive(JETON_DGA);
    rendreAvecProviders(arbreProtege("ADHERENT:LIRE"), { routeInitiale: "/prive" });

    expect(await screen.findByText("Contenu protégé")).toBeInTheDocument();
  });
});
