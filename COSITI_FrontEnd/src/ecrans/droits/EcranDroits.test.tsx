import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { EcranDroits } from "@/ecrans/droits/EcranDroits";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/droits" element={<EcranDroits />} />
    </Routes>
  );
}

describe("EcranDroits", () => {
  it("affiche les retardataires triés par retard décroissant (tri serveur fixe)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/droits" });

    await screen.findByText("OWONA Serge");
    expect(screen.getByText("ATANGANA Paul")).toBeInTheDocument();

    const lignes = screen.getAllByRole("row");
    const texteLignes = lignes.map((ligne) => ligne.textContent ?? "");
    const indexOwona = texteLignes.findIndex((t) => t.includes("OWONA Serge"));
    const indexAtangana = texteLignes.findIndex((t) => t.includes("ATANGANA Paul"));
    // OWONA (220 jours de retard) doit précéder ATANGANA (14 jours).
    expect(indexOwona).toBeGreaterThan(0);
    expect(indexOwona).toBeLessThan(indexAtangana);
  });

  it("filtre par jours de retard minimum", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/droits" });

    await screen.findByText("OWONA Serge");
    await utilisateur.type(screen.getByLabelText("Jours de retard minimum"), "100");

    await waitFor(() => expect(screen.queryByText("ATANGANA Paul")).not.toBeInTheDocument());
    expect(screen.getByText("OWONA Serge")).toBeInTheDocument();
  });

  it("désactive la création de campagne de relance (endpoint non construit, TODO [A])", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/droits" });

    await screen.findByText("OWONA Serge");
    expect(screen.getByRole("button", { name: "Créer une campagne de relance" })).toBeDisabled();
  });
});
