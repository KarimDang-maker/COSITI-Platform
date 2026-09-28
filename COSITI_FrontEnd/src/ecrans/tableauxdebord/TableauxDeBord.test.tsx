import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_DAF, JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { TableauBordDga } from "@/ecrans/tableauxdebord/TableauBordDga";
import { TableauBordDaf } from "@/ecrans/tableauxdebord/TableauBordDaf";
import { TableauBordGestionnaire } from "@/ecrans/tableauxdebord/TableauBordGestionnaire";
import { AccueilSelonRole } from "@/app/AccueilSelonRole";
import { cheminTableauBord } from "@/api/tableauxDeBord";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

describe("cheminTableauBord", () => {
  it("dirige chaque rôle vers son propre tableau de bord", () => {
    expect(cheminTableauBord(["TABLEAU_BORD:PCA"])).toBe("/tableaux-de-bord/pca");
    expect(cheminTableauBord(["TABLEAU_BORD:DAF"])).toBe("/tableaux-de-bord/daf");
    expect(cheminTableauBord(["TABLEAU_BORD:SUPER_ADMIN"])).toBe("/tableaux-de-bord/super-admin");
  });

  it("ne renvoie aucun tableau de bord pour l'Agent de terrain ni pour le Chef", () => {
    // Roles des acteurs.md §16 : ces deux rôles n'ont pas de dashboard en V1.
    expect(cheminTableauBord(["ADHERENT:LIRE", "PAIEMENT:CREER"])).toBeNull();
    expect(cheminTableauBord([])).toBeNull();
  });
});

describe("AccueilSelonRole", () => {
  function arbre() {
    return (
      <Routes>
        <Route path="/" element={<AccueilSelonRole />} />
        <Route path="/adherents" element={<p>Liste des adhérents</p>} />
        <Route path="/tableaux-de-bord/dga" element={<p>Dashboard DGA</p>} />
        <Route path="/tableaux-de-bord/gestionnaire" element={<p>Dashboard Gestionnaire</p>} />
      </Routes>
    );
  }

  it("redirige la DGA vers son tableau de bord", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/" });

    await screen.findByText("Dashboard DGA");
  });

  it("redirige l'Agent de terrain vers son écran de travail, faute de dashboard", async () => {
    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/" });

    await screen.findByText("Liste des adhérents");
  });
});

describe("TableauBordDga", () => {
  function arbre() {
    return (
      <Routes>
        <Route path="/tableaux-de-bord/dga" element={<TableauBordDga />} />
      </Routes>
    );
  }

  it("affiche le taux d'activation mis en forme depuis le ratio renvoyé par l'API", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/tableaux-de-bord/dga" });

    // Le serveur renvoie 0,3314 ; l'affichage est « 33,1 % ». Le client met en forme, il ne calcule pas.
    await screen.findByText("33,1 %");
    expect(screen.getByText("172")).toBeInTheDocument();
  });

  it("remonte les alertes avec leur libellé écrit, jamais une couleur seule", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/tableaux-de-bord/dga" });

    await screen.findByText("Adhérents n'ayant jamais cotisé");
    expect(screen.getByText("115")).toBeInTheDocument();
  });

  it("propose le tableau des chiffres derrière le graphique des zones", async () => {
    simulerSession(JETON_DGA);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/tableaux-de-bord/dga" });

    await screen.findByRole("heading", { name: /Taux d'activation par zone/ });
    await utilisateur.click(screen.getByRole("button", { name: "Voir le tableau" }));

    // Le tableau donne les valeurs exactes qu'un graphique ne permet pas de lire.
    await screen.findByRole("columnheader", { name: "Cumul collecté" });
    expect(screen.getAllByText("Douala Centre").length).toBeGreaterThan(0);
  });

  it("change la mesure comparée sans jamais afficher deux échelles à la fois", async () => {
    simulerSession(JETON_DGA);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/tableaux-de-bord/dga" });

    await screen.findByRole("heading", { name: /Taux d'activation par zone/ });
    await utilisateur.click(screen.getByRole("button", { name: "Cumul collecté" }));

    await screen.findByRole("heading", { name: /Cumul collecté par zone/ });
    expect(screen.queryByRole("heading", { name: /Taux d'activation par zone/ })).not.toBeInTheDocument();
  });

  it("indique que les objectifs terrain ne sont pas suivis faute de besoin confirmé", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/tableaux-de-bord/dga" });

    await screen.findByText(/Objectifs terrain : non suivis en V1/);
  });
});

describe("TableauBordDaf", () => {
  function arbre() {
    return (
      <Routes>
        <Route path="/tableaux-de-bord/daf" element={<TableauBordDaf />} />
      </Routes>
    );
  }

  it("rappelle que COSITI n'exécute aucun mouvement de fonds", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(arbre(), { routeInitiale: "/tableaux-de-bord/daf" });

    await screen.findByText(/n'exécute aucun mouvement de fonds/);
  });

  it("donne un accès direct à la file de contrôle avec son volume", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(arbre(), { routeInitiale: "/tableaux-de-bord/daf" });

    await screen.findByRole("link", { name: "Ouvrir la file de contrôle (7)" });
  });
});

describe("TableauBordGestionnaire", () => {
  function arbre() {
    return (
      <Routes>
        <Route path="/tableaux-de-bord/gestionnaire" element={<TableauBordGestionnaire />} />
      </Routes>
    );
  }

  it("liste le travail en attente avec un lien vers l'écran qui le traite", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/tableaux-de-bord/gestionnaire" });

    await screen.findByText("Dossiers CNPS incomplets");
    expect(screen.getByText("Comptes rendus à contrôler")).toBeInTheDocument();
    expect(screen.getByText("Éligibles non immatriculés")).toBeInTheDocument();
  });

  it("affiche le refus de l'API plutôt qu'un tableau de bord vide", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.get("/api/v1/tableaux-de-bord/gestionnaire", () =>
        HttpResponse.json(
          { code: "ACCES_REFUSE", message: "Accès refusé.", traceId: "t-1" },
          { status: 403 },
        ),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/tableaux-de-bord/gestionnaire" });

    await screen.findByText("Impossible de charger le tableau de bord");
    expect(screen.getByText("Accès refusé.")).toBeInTheDocument();
  });
});
