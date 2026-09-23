import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { ListeDossiersCnps } from "@/ecrans/cnps/ListeDossiersCnps";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/cnps" element={<ListeDossiersCnps />} />
      <Route path="/cnps/:id" element={<p>Fiche du dossier</p>} />
    </Routes>
  );
}

describe("ListeDossiersCnps", () => {
  it("affiche les dossiers et remonte l'avertissement de règle non validée", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps" });

    await screen.findByText("CNPS-778812");
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
    expect(screen.getByText("Transmis")).toBeInTheDocument();

    // Le bandeau [V] n'est jamais masqué : la composition du dossier n'est pas validée par la COSITI.
    expect(screen.getByText(/PIECES_CNPS_OBLIGATOIRES/)).toBeInTheDocument();
  });

  it("filtre les dossiers par statut", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps" });

    await screen.findByText("CNPS-778812");
    await utilisateur.click(screen.getByLabelText("Statut"));
    await utilisateur.click(await screen.findByRole("option", { name: "Transmis" }));

    await waitFor(() => expect(screen.queryByText("Brouillon")).not.toBeInTheDocument());
    expect(screen.getByText("CNPS-778812")).toBeInTheDocument();
  });

  it("propose d'ouvrir un dossier pour un adhérent éligible qui n'en a pas", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps?onglet=eligibles" });

    await screen.findByText("OWONA Serge");

    // L'adhérent qui a déjà un dossier n'offre pas l'action.
    expect(screen.getByText("Dossier déjà ouvert")).toBeInTheDocument();

    const boutons = screen.getAllByRole("button", { name: "Ouvrir un dossier" });
    expect(boutons).toHaveLength(1);

    await utilisateur.click(boutons[0]!);
    await screen.findByText("Fiche du dossier");
  });

  it("masque l'ouverture de dossier pour un rôle en consultation seule", async () => {
    // La DGA a CNPS:LIRE mais pas CNPS:GERER (V9__permissions_j7_cnps_documents.sql).
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps?onglet=eligibles" });

    await screen.findByText("OWONA Serge");
    expect(screen.queryByRole("button", { name: "Ouvrir un dossier" })).not.toBeInTheDocument();
  });

  it("affiche l'erreur renvoyée par l'API plutôt qu'un tableau vide", async () => {
    simulerSession(JETON_AGENT);
    serveur.use(
      http.get("/api/v1/cnps/dossiers", () =>
        HttpResponse.json(
          { code: "ACCES_REFUSE", message: "Accès refusé.", traceId: "t-1" },
          { status: 403 },
        ),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps" });

    await screen.findByText("Impossible de charger les dossiers CNPS");
    expect(screen.getByText("Accès refusé.")).toBeInTheDocument();
  });
});
