import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { serveur } from "@/test/msw/serveur";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { JETON_AGENT, JETON_GESTIONNAIRE, JETON_PCA } from "@/test/msw/donnees";
import { ListeAdherents } from "@/ecrans/adherents/ListeAdherents";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/adherents" element={<ListeAdherents />} />
      <Route path="/adherents/:id" element={<p>Fiche ouverte</p>} />
    </Routes>
  );
}

/** Capture la dernière requête `GET /adherents`, pour vérifier les paramètres réellement envoyés. */
function espionnerListe() {
  const requetes: URL[] = [];
  serveur.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/v1/adherents") requetes.push(url);
  });
  return requetes;
}

describe("ListeAdherents", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("affiche un squelette de chargement avant la réponse de l'API", () => {
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });
    expect(screen.getByLabelText("Chargement des données")).toBeInTheDocument();
  });

  it("affiche les adhérents renvoyés par l'API", async () => {
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });
    expect(await screen.findByText("COSITI-00001")).toBeInTheDocument();
    expect(screen.getByText("COSITI-00002")).toBeInTheDocument();
    expect(screen.getByText("2 adhérents")).toBeInTheDocument();
  });

  it("affiche un état vide explicite quand aucun adhérent ne correspond", async () => {
    serveur.use(
      http.get("/api/v1/adherents", () =>
        HttpResponse.json({ contenu: [], page: 0, taille: 25, totalElements: 0, totalPages: 0, avertissements: [] }),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });
    expect(await screen.findByText("Aucun adhérent ne correspond à ces critères")).toBeInTheDocument();
  });

  it("affiche un message d'erreur explicite en cas d'échec de l'API", async () => {
    serveur.use(
      http.get("/api/v1/adherents", () =>
        HttpResponse.json(
          { code: "ERREUR_TECHNIQUE", message: "Une erreur technique est survenue.", traceId: "t", avertissements: [] },
          { status: 500 },
        ),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });
    expect(await screen.findByText("Impossible de charger les adhérents")).toBeInTheDocument();
  });

  it("envoie le tri au format de la liste blanche serveur (#8)", async () => {
    const requetes = espionnerListe();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });

    await screen.findByText("COSITI-00001");
    await utilisateur.click(screen.getByRole("columnheader", { name: /Matricule/ }));

    await waitFor(() => expect(requetes.at(-1)?.searchParams.get("tri")).toBe("MATRICULE"));
    expect(requetes.at(-1)?.searchParams.get("direction")).toMatch(/^(ASC|DESC)$/);
    // Le serveur aurait répondu 400 à un tri hors liste blanche : la liste reste affichée.
    expect(screen.getByText("COSITI-00001")).toBeInTheDocument();
  });

  it("reprend les filtres de l'URL, les affiche et permet de les retirer un par un (#5, #7)", async () => {
    const requetes = espionnerListe();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents?statut=EN_RETARD&completion=50-79" });

    const puceStatut = await screen.findByRole("button", { name: "Retirer le filtre Statut : En retard" });
    expect(screen.getByRole("button", { name: /Retirer le filtre Complétion/ })).toBeInTheDocument();
    await waitFor(() => {
      const derniere = requetes.at(-1);
      expect(derniere?.searchParams.get("statut")).toBe("EN_RETARD");
      expect(derniere?.searchParams.get("completionMin")).toBe("50");
      expect(derniere?.searchParams.get("completionMax")).toBe("79");
    });

    await utilisateur.click(puceStatut);
    await waitFor(() => expect(requetes.at(-1)?.searchParams.get("statut")).toBeNull());
    expect(requetes.at(-1)?.searchParams.get("completionMin")).toBe("50");
  });

  it("recherche par téléphone côté serveur, après temporisation (#4)", async () => {
    const requetes = espionnerListe();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });

    await screen.findByText("COSITI-00001");
    await utilisateur.type(screen.getByLabelText("Téléphone"), "690 11 22 33");

    await waitFor(() => expect(requetes.at(-1)?.searchParams.get("telephone")).toBe("690112233"));
    await waitFor(() => expect(screen.queryByText("COSITI-00001")).not.toBeInTheDocument());
    expect(screen.getByText("COSITI-00002")).toBeInTheDocument();
  });

  it("ouvre directement la fiche d'un matricule existant (#3)", async () => {
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });

    await utilisateur.type(screen.getByLabelText("Ouvrir une fiche par matricule"), "cositi-00002");
    await utilisateur.click(screen.getByRole("button", { name: "Ouvrir" }));

    expect(await screen.findByText("Fiche ouverte")).toBeInTheDocument();
  });

  it("annonce clairement un matricule introuvable (#3)", async () => {
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });

    await utilisateur.type(screen.getByLabelText("Ouvrir une fiche par matricule"), "COSITI-09999");
    await utilisateur.click(screen.getByRole("button", { name: "Ouvrir" }));

    expect(await screen.findByText(/Aucun adhérent de votre périmètre ne porte ce matricule/)).toBeInTheDocument();
  });

  it("propose export, création et vues CNPS au Gestionnaire des comptes", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });

    expect(await screen.findByRole("button", { name: /Exporter \(CSV\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nouvel adhérent/ })).toBeInTheDocument();

    await utilisateur.click(screen.getByRole("tab", { name: "Proches du seuil CNPS" }));
    expect(await screen.findByText("ATANGANA Paul")).toBeInTheDocument();
    expect(screen.getByText("9 000 FCFA sur 10 500 FCFA")).toBeInTheDocument();
  });

  it("confirme les critères avant l'export journalisé (#34)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents?statut=ACTIF&agentId=agent-1" });

    await utilisateur.click(await screen.findByRole("button", { name: /Exporter \(CSV\)/ }));

    const dialogue = await screen.findByRole("alertdialog");
    expect(dialogue).toHaveTextContent("Actif");
    expect(dialogue).toHaveTextContent(/ne sont pas pris en charge par l'export/);
  });

  it("ne propose ni création ni export à l'Agent de terrain (ADHERENT:CREER retirée en V14)", async () => {
    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });

    await screen.findByText("COSITI-00001");
    await waitFor(() => expect(screen.getByLabelText("Agent de terrain")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Nouvel adhérent/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Exporter/ })).not.toBeInTheDocument();
    // Aucune permission CNPS : pas d'onglets de suivi du seuil.
    expect(screen.queryByRole("tab", { name: "Proches du seuil CNPS" })).not.toBeInTheDocument();
  });

  it("donne au PCA la consultation et les vues CNPS, sans aucune action d'écriture", async () => {
    simulerSession(JETON_PCA);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents" });

    expect(await screen.findByRole("tab", { name: "Éligibles CNPS" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nouvel adhérent/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Exporter/ })).not.toBeInTheDocument();
  });
});
