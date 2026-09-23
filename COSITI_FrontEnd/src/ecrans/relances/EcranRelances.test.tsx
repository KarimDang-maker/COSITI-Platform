import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { EcranRelances } from "@/ecrans/relances/EcranRelances";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/relances" element={<EcranRelances />} />
    </Routes>
  );
}

describe("EcranRelances", () => {
  it("affiche les campagnes avec leurs critères enregistrés", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/relances" });

    await screen.findByText("Retards de septembre");
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Clôturée")).toBeInTheDocument();

    // Les critères sont affichés tels quels, sans être réinterprétés.
    expect(screen.getByText(/joursRetardMin : 30/)).toBeInTheDocument();
    expect(screen.getByText("Aucun critère enregistré")).toBeInTheDocument();
  });

  it("ne propose pas de clôturer une campagne déjà clôturée", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/relances" });

    await screen.findByText("Retards de septembre");
    // Deux campagnes affichées, une seule est clôturable.
    expect(screen.getAllByRole("button", { name: "Clôturer" })).toHaveLength(1);
  });

  it("masque la clôture pour un rôle sans gestion de campagne", async () => {
    // L'Agent de terrain a RELANCE:LIRE et RELANCE:ENREGISTRER, pas RELANCE:GERER_CAMPAGNE (V10).
    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/relances" });

    await screen.findByText("Retards de septembre");
    expect(screen.queryByRole("button", { name: "Clôturer" })).not.toBeInTheDocument();
  });

  it("clôture une campagne après confirmation", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/relances" });

    await utilisateur.click(await screen.findByRole("button", { name: "Clôturer" }));
    // Le dialogue rappelle ce qui est en jeu avant une action irréversible.
    await screen.findByText(/ne peut pas être rouverte/);

    await utilisateur.click(screen.getAllByRole("button", { name: "Clôturer" }).at(-1)!);
    await screen.findByText("Campagne clôturée.");
  });

  it("affiche les relances effectuées avec leur résultat", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/relances" });

    await utilisateur.click(await screen.findByRole("tab", { name: "Relances effectuées" }));

    await screen.findByText("Promesse");
    expect(screen.getByText("Déménagé")).toBeInTheDocument();
    expect(screen.getByText("Promet de payer après la vente")).toBeInTheDocument();
  });

  it("filtre les relances d'une campagne puis permet de revenir à toutes", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/relances" });

    await utilisateur.click(await screen.findAllByRole("button", { name: "Voir les relances" }).then((b) => b[0]!));

    await screen.findByText("Promesse");
    expect(screen.getByRole("button", { name: "Voir toutes les relances" })).toBeInTheDocument();
  });
});
