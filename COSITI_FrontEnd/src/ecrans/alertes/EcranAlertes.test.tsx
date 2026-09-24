import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router";
import { http, HttpResponse } from "msw";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { EcranAlertes } from "@/ecrans/alertes/EcranAlertes";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/alertes" element={<EcranAlertes />} />
    </Routes>
  );
}

describe("EcranAlertes", () => {
  it("compose les alertes des 3 domaines réels (retard, seuil CNPS, dossiers incomplets)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/alertes" });

    await screen.findByText(/Adhérent non à jour : ATANGANA Paul/);
    expect(screen.getByText(/Seuil CNPS atteint : OWONA Serge/)).toBeInTheDocument();
    expect(screen.getByText(/Dossier Prestations Familiales : NDONGO Marie Claire/)).toBeInTheDocument();

    const actions = screen.getAllByText("Traiter l'alerte →");
    expect(actions.length).toBeGreaterThan(0);
  });
});
