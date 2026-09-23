import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { ListeComptesRendus } from "@/ecrans/comptesrendus/ListeComptesRendus";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/comptes-rendus" element={<ListeComptesRendus />} />
      <Route path="/comptes-rendus/nouveau" element={<p>Formulaire de compte rendu</p>} />
      <Route path="/comptes-rendus/:id" element={<p>Fiche du compte rendu</p>} />
    </Routes>
  );
}

describe("ListeComptesRendus", () => {
  it("propose à l'agent de produire un compte rendu, sans onglet de contrôle", async () => {
    simulerSession(JETON_AGENT);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/comptes-rendus" });

    await screen.findByRole("button", { name: "Produire un compte rendu" });

    // L'Agent n'a ni COMPTE_RENDU:CONTROLER ni COMPTE_RENDU:CONSOLIDER (V10).
    expect(screen.queryByRole("tab", { name: "À contrôler" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "À consolider" })).not.toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: "Produire un compte rendu" }));
    await screen.findByText("Formulaire de compte rendu");
  });

  it("ouvre le Gestionnaire directement sur sa file de contrôle", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/comptes-rendus" });

    // L'onglet par défaut suit la permission : contrôler est le travail attendu du Gestionnaire.
    await screen.findByRole("tab", { name: "À contrôler", selected: true });
    expect(await screen.findByRole("button", { name: "Contrôler" })).toBeInTheDocument();
  });

  it("le Gestionnaire contrôle un compte rendu avec une observation obligatoire", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/comptes-rendus" });

    await utilisateur.click(await screen.findByRole("button", { name: "Contrôler" }));

    const confirmer = await screen.findByRole("button", { name: "Marquer contrôlé" });
    expect(confirmer).toBeDisabled();

    await utilisateur.type(
      screen.getByLabelText("Observation de contrôle"),
      "Chiffres cohérents avec les paiements",
    );
    await waitFor(() => expect(confirmer).toBeEnabled());

    await utilisateur.click(confirmer);
    await screen.findByText("Compte rendu contrôlé.");
  });

  it("n'autorise la consolidation qu'une fois des comptes rendus sélectionnés", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/comptes-rendus?onglet=a-consolider" });

    const consolider = await screen.findByRole("button", {
      name: "Consolider et préparer pour la DGA",
    });
    expect(consolider).toBeDisabled();

    await utilisateur.click(await screen.findByRole("checkbox"));
    await waitFor(() => expect(consolider).toBeEnabled());

    await utilisateur.click(consolider);
    await utilisateur.type(screen.getByLabelText("Synthèse pour la DGA"), "Quinzaine conforme");
    await utilisateur.click(screen.getByRole("button", { name: "Consolider" }));

    // Redirige vers le consolidé créé, pour que le Gestionnaire le transmette ensuite.
    await screen.findByText("Fiche du compte rendu");
  });

  it("la DGA consulte sans onglet de contrôle ni de consolidation", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/comptes-rendus" });

    await screen.findByRole("tab", { name: "Mes comptes rendus" });
    expect(screen.queryByRole("tab", { name: "À contrôler" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Produire un compte rendu" })).not.toBeInTheDocument();
  });

  it("affiche l'erreur de l'API plutôt qu'une liste vide", async () => {
    simulerSession(JETON_AGENT);
    serveur.use(
      http.get("/api/v1/comptes-rendus", () =>
        HttpResponse.json(
          { code: "ACCES_REFUSE", message: "Accès refusé.", traceId: "t-1" },
          { status: 403 },
        ),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/comptes-rendus" });

    await screen.findByText("Impossible de charger les comptes rendus");
    expect(screen.getByText("Accès refusé.")).toBeInTheDocument();
  });
});
