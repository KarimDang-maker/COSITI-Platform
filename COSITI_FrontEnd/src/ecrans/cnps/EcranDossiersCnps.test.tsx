import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router";
import userEvent from "@testing-library/user-event";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { http, HttpResponse } from "msw";
import { EcranDossiersCnps } from "@/ecrans/cnps/EcranDossiersCnps";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/dossiers-cnps" element={<EcranDossiersCnps />} />
    </Routes>
  );
}

describe("EcranDossiersCnps", () => {
  it("affiche les 4 cartes de rubrique et le dossier de test dans la vue transverse", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/dossiers-cnps" });

    await screen.findByText("Prestations Familiales");
    expect(screen.getByText("Risques Professionnels")).toBeInTheDocument();
    expect(screen.getByText("PVID (Retraite & Décès)")).toBeInTheDocument();
    expect(screen.getByText("Tous les Dossiers CNPS")).toBeInTheDocument();

    await screen.findByText("NDONGO Marie Claire");
    expect(screen.getByText("Consulter")).toBeInTheDocument();
  });

  it("affiche les offres d'une rubrique quand elle est sélectionnée", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/dossiers-cnps" });

    await screen.findByText("Prestations Familiales");
    await utilisateur.click(screen.getByText("Prestations Familiales"));

    await screen.findByText("Toutes les offres");
    // Le libellé de l'offre apparaît à la fois sur sa tuile et dans la colonne « Rubrique & offre » du
    // tableau (le dossier de test dp-1 est justement rattaché à cette offre) : plusieurs occurrences sont
    // attendues, pas une anomalie.
    expect(screen.getAllByText("Allocations Familiales (Enfants scolarisés & à charge)").length).toBeGreaterThan(0);
  });
});
