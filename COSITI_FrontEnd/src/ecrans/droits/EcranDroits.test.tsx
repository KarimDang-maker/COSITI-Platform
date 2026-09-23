import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
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

  it("crée une campagne de relance à partir des filtres actifs (TODO [A] de J6 levé en J8)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/droits?joursRetardMin=100" });

    const bouton = await screen.findByRole("button", { name: "Créer une campagne de relance" });
    // L'endpoint `POST /campagnes-relance` existe depuis le jalon J8 : le bouton n'est plus désactivé.
    expect(bouton).toBeEnabled();
    await utilisateur.click(bouton);

    // Les filtres actifs deviennent les critères enregistrés de la campagne.
    await screen.findByText(/joursRetardMin : 100/);

    await utilisateur.type(screen.getByLabelText("Nom de la campagne"), "Retards longs");
    await utilisateur.click(screen.getByRole("button", { name: "Créer la campagne" }));

    await screen.findByText("Campagne de relance créée.");
  });

  it("masque la création de campagne pour un rôle sans RELANCE:GERER_CAMPAGNE", async () => {
    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/droits" });

    await screen.findByText("OWONA Serge");
    expect(
      screen.queryByRole("button", { name: "Créer une campagne de relance" }),
    ).not.toBeInTheDocument();
  });
});
