import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { serveur } from "@/test/msw/serveur";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { JETON_AGENT, JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { ListeAgentsTerrain } from "@/ecrans/agents/ListeAgentsTerrain";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/agents" element={<ListeAgentsTerrain />} />
      <Route path="/agents/:id" element={<p>Fiche agent ouverte</p>} />
    </Routes>
  );
}

function espionnerListe() {
  const requetes: URL[] = [];
  serveur.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/v1/agents") requetes.push(url);
  });
  return requetes;
}

describe("ListeAgentsTerrain", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("liste les agents avec zone, statut et volume de portefeuille serveur (#1)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents" });

    const ligne = (await screen.findByText("Ateba Jean")).closest("tr") as HTMLElement;
    expect(within(ligne).getByText("AG-00001")).toBeInTheDocument();
    expect(within(ligne).getByText("42")).toBeInTheDocument();
    expect(within(ligne).getByText("Actif")).toBeInTheDocument();
    // Agent inactif : absent de la répartition serveur, aucun volume inventé.
    const inactif = screen.getByText("Fouda Luc").closest("tr") as HTMLElement;
    expect(within(inactif).getByText("Inactif")).toBeInTheDocument();
    expect(within(inactif).getByText("—")).toBeInTheDocument();
    expect(screen.getByText("3 agents")).toBeInTheDocument();
  });

  it("reprend le filtre de statut de l'URL, l'envoie au serveur et permet de le retirer (#21)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionnerListe();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents?statut=INACTIF" });

    expect(await screen.findByText("Fouda Luc")).toBeInTheDocument();
    expect(screen.queryByText("Ateba Jean")).not.toBeInTheDocument();
    expect(requetes.at(-1)?.searchParams.get("actif")).toBe("false");

    await utilisateur.click(screen.getByRole("button", { name: "Retirer le filtre Statut : Inactif" }));
    expect(await screen.findByText("Ateba Jean")).toBeInTheDocument();
    expect(requetes.at(-1)?.searchParams.get("actif")).toBeNull();
  });

  it("recherche côté serveur après temporisation (#2)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionnerListe();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents" });

    await screen.findByText("Ateba Jean");
    await utilisateur.type(screen.getByLabelText("Nom, code ou téléphone"), "mengue");

    await waitFor(() => expect(requetes.at(-1)?.searchParams.get("recherche")).toBe("mengue"));
    await waitFor(() => expect(screen.queryByText("Ateba Jean")).not.toBeInTheDocument());
    expect(screen.getByText("Mengue Sophie")).toBeInTheDocument();
  });

  it("trie avec la liste blanche du serveur et ouvre la fiche au clic sur une ligne (#3)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionnerListe();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents" });

    await screen.findByText("Ateba Jean");
    await utilisateur.click(screen.getByRole("columnheader", { name: /Code/ }));
    await waitFor(() => expect(requetes.at(-1)?.searchParams.get("tri")).toBe("CODE_AGENT"));

    await utilisateur.click(screen.getByText("Mengue Sophie"));
    expect(await screen.findByText("Fiche agent ouverte")).toBeInTheDocument();
  });

  it("affiche la répartition des portefeuilles sans classement (#19)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents" });

    await utilisateur.click(await screen.findByRole("tab", { name: "Répartition des portefeuilles" }));
    expect(await screen.findByText("Agents actifs")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("42 adhérents")).toBeInTheDocument();
    expect(screen.queryByText("Fouda Luc")).not.toBeInTheDocument();
  });

  it("réserve « Ajouter un agent » à la DGA (#4)", async () => {
    simulerSession(JETON_DGA);
    const { unmount } = rendreAvecProviders(arbre(), { routeInitiale: "/agents" });
    expect(await screen.findByRole("button", { name: /Ajouter un agent/ })).toBeInTheDocument();
    unmount();

    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents" });
    // « Ateba Jean » est aussi le nom de l'utilisateur connecté (carte profil) : on attend la ligne par son code.
    await screen.findByText("AG-00001");
    expect(screen.queryByRole("button", { name: /Ajouter un agent/ })).not.toBeInTheDocument();
  });

  it("affiche une erreur explicite si la liste échoue", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.get("/api/v1/agents", () =>
        HttpResponse.json({ code: "ERREUR", message: "Service indisponible.", traceId: "t", avertissements: [] }, { status: 500 }),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/agents" });
    expect(await screen.findByText("Impossible de charger les agents")).toBeInTheDocument();
  });
});
