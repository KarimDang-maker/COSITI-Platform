import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router";
import { http, HttpResponse } from "msw";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { EcranImmatriculations } from "@/ecrans/cnps/EcranImmatriculations";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/immatriculations" element={<EcranImmatriculations />} />
    </Routes>
  );
}

describe("EcranImmatriculations", () => {
  it("répartit les adhérents entre « à immatriculer d'urgence » et « déjà immatriculés »", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/immatriculations" });

    await screen.findByText("OWONA Serge");
    expect(screen.getByText("Seuil atteint")).toBeInTheDocument();
    expect(screen.getByText("À immatriculer d'urgence (1)")).toBeInTheDocument();
    expect(screen.getByText("Déjà immatriculés CNPS (1)")).toBeInTheDocument();
    expect(screen.getByText("Vérification cycle 15/30 (2)")).toBeInTheDocument();
  });
});
