import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router";
import { http, HttpResponse } from "msw";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { FicheDossierPrestationCnps } from "@/ecrans/cnps/FicheDossierPrestationCnps";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/dossiers-cnps/:id" element={<FicheDossierPrestationCnps />} />
    </Routes>
  );
}

describe("FicheDossierPrestationCnps", () => {
  it("affiche l'identité de l'adhérent, les pièces et le journal du dossier", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/dossiers-cnps/dp-1" });

    await screen.findByText(/Dossier CNPS : Allocations Familiales/);
    expect(screen.getByText("NDONGO Marie Claire")).toBeInTheDocument();
    expect(screen.getByText("CNPS : CNPS-2026-98432")).toBeInTheDocument();

    expect(screen.getByText(/Pièces constitutives du dossier \(1\/2\)/)).toBeInTheDocument();
    expect(screen.getByText("Certificats de scolarité")).toBeInTheDocument();

    expect(screen.getByText(/Ouverture — statut/)).toBeInTheDocument();
  });

  it("affiche un message d'erreur si le dossier n'existe pas", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/dossiers-cnps/inconnu" });

    await screen.findByText("Impossible de charger le dossier");
  });
});
