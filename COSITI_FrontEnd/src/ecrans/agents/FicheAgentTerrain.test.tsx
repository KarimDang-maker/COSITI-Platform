import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_DGA, JETON_GESTIONNAIRE, JETON_PCA } from "@/test/msw/donnees";
import { FicheAgentTerrain } from "@/ecrans/agents/FicheAgentTerrain";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function espionnerEcritures() {
  const ecritures: { methode: string; chemin: string; corps: unknown }[] = [];
  serveur.events.on("request:start", async ({ request }) => {
    if (request.method === "GET") return;
    const texte = await request.clone().text();
    ecritures.push({ methode: request.method, chemin: new URL(request.url).pathname, corps: texte ? JSON.parse(texte) : undefined });
  });
  return ecritures;
}

function arbre() {
  return (
    <Routes>
      <Route path="/agents/:id" element={<FicheAgentTerrain />} />
      <Route path="/adherents/:id" element={<p>Fiche adhérent ouverte</p>} />
      <Route path="/adherents" element={<p>Liste des adhérents filtrée</p>} />
    </Routes>
  );
}

describe("FicheAgentTerrain", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("affiche l'identité, les indicateurs de portefeuille et la dernière activité (#3, #8, #10, #11, #22)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-2" });

    expect(await screen.findByRole("heading", { level: 1, name: "Mengue Sophie" })).toBeInTheDocument();
    expect(screen.getByText("AG-00002")).toBeInTheDocument();
    expect(await screen.findByText("Adhérents suivis")).toBeInTheDocument();
    expect(screen.getByText("Dossiers incomplets")).toBeInTheDocument();
    expect(screen.getByText("1 sur 2")).toBeInTheDocument();
    expect(await screen.findByText("Modification du profil")).toBeInTheDocument();
    expect(screen.getByText(/par dga\.test/)).toBeInTheDocument();
  });

  it("ouvre la liste des adhérents filtrée par agent et complétion depuis l'indicateur (#11)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-2" });

    const lien = await screen.findByRole("link", { name: /Voir les dossiers incomplets/ });
    expect(lien).toHaveAttribute("href", "/adherents?agentId=agent-2&completion=0-99");
    await utilisateur.click(lien);
    expect(await screen.findByText("Liste des adhérents filtrée")).toBeInTheDocument();
  });

  it("recharge les cotisations de l'agent pour le mois choisi (#14, #15) et la charge (#20)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-1" });

    expect(await screen.findByText("168 000 FCFA")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    // Charge : collecte validée rapportée à l'objectif serveur.
    expect(await screen.findByText(/sur l'objectif de 500 000 FCFA/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Période"), { target: { value: "2026-08" } });
    expect(await screen.findByText("4 200 FCFA")).toBeInTheDocument();
  });

  it("réserve modification, (dés)activation et désignation du Chef à la DGA ; aucune action pour le PCA", async () => {
    simulerSession(JETON_DGA);
    const { unmount } = rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-2" });
    expect(await screen.findByRole("button", { name: /Modifier/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Désactiver/ })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Désigner Chef/ })).toBeInTheDocument();
    unmount();

    simulerSession(JETON_PCA);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-2" });
    await screen.findByRole("heading", { level: 1, name: "Mengue Sophie" });
    await screen.findByText("Adhérents suivis");
    expect(screen.queryByRole("button", { name: /Modifier/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Désactiver/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Désigner Chef/ })).not.toBeInTheDocument();
  });

  it("désactive un agent après confirmation de l'état cible et motif obligatoire (#6)", async () => {
    simulerSession(JETON_DGA);
    const ecritures = espionnerEcritures();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-2" });

    await utilisateur.click(await screen.findByRole("button", { name: /Désactiver/ }));
    const dialogue = await screen.findByRole("alertdialog");
    expect(within(dialogue).getByText("Actif")).toBeInTheDocument();
    expect(within(dialogue).getByText("Inactif")).toBeInTheDocument();
    const confirmer = within(dialogue).getByRole("button", { name: "Désactiver" });
    expect(confirmer).toBeDisabled();
    await utilisateur.type(within(dialogue).getByLabelText("Motif"), "Départ de la coopérative");
    await utilisateur.click(confirmer);

    await waitFor(() =>
      expect(ecritures).toContainEqual({
        methode: "POST",
        chemin: "/api/v1/agents/agent-2/statut",
        corps: { actif: false, motif: "Départ de la coopérative" },
      }),
    );
    expect(await screen.findByText("Agent désactivé.")).toBeInTheDocument();
  });

  it("valide la forme du profil puis envoie la modification (#5)", async () => {
    simulerSession(JETON_DGA);
    const ecritures = espionnerEcritures();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-2" });

    await utilisateur.click(await screen.findByRole("button", { name: /Modifier/ }));
    const dialogue = await screen.findByRole("dialog");
    const telephone = within(dialogue).getByLabelText(/Téléphone/);
    await utilisateur.clear(telephone);
    await utilisateur.type(telephone, "123");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer" }));
    expect(await within(dialogue).findByText("Le numéro doit comporter 9 chiffres (format camerounais).")).toBeInTheDocument();

    await utilisateur.clear(telephone);
    await utilisateur.type(telephone, "677000099");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(ecritures).toContainEqual({
        methode: "PUT",
        chemin: "/api/v1/agents/agent-2",
        corps: { nomComplet: "Mengue Sophie", telephone: "677000099", zoneId: "zone-1", objectifCollecteMensuel: 400000 },
      }),
    );
  });

  it("affiche le portefeuille paginé et ouvre la fiche adhérent (#9)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-1?onglet=portefeuille" });

    expect(await screen.findByText("NDONGO Marie Claire")).toBeInTheDocument();
    expect(screen.getByText("2 adhérents")).toBeInTheDocument();
    await utilisateur.click(screen.getByText("ATANGANA Paul"));
    expect(await screen.findByText("Fiche adhérent ouverte")).toBeInTheDocument();
  });

  it("affecte un adhérent sans agent de la zone après confirmation (#16)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const ecritures = espionnerEcritures();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-1?onglet=portefeuille" });

    await utilisateur.click(await screen.findByRole("button", { name: /Affecter un adhérent/ }));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByLabelText("Adhérent"));
    await utilisateur.click(within(await screen.findByRole("listbox")).getByText("OWONA Serge (COSITI-00003)"));
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Continuer" }));
    expect(within(dialogue).getByText("OWONA Serge")).toBeInTheDocument();
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Confirmer l'affectation" }));

    await waitFor(() =>
      expect(ecritures).toContainEqual({
        methode: "POST",
        chemin: "/api/v1/portefeuilles/affecter",
        corps: { adherentId: "adh-3", agentId: "agent-1" },
      }),
    );
  });

  it("retire un adhérent avec motif obligatoire (#17)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const ecritures = espionnerEcritures();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-1?onglet=portefeuille" });

    const ligne = (await screen.findByText("ATANGANA Paul")).closest("tr") as HTMLElement;
    await utilisateur.click(within(ligne).getByRole("button", { name: "Retirer" }));
    const dialogue = await screen.findByRole("alertdialog");
    await utilisateur.type(within(dialogue).getByLabelText("Motif du retrait"), "Adhérent déménagé");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Retirer" }));

    await waitFor(() =>
      expect(ecritures).toContainEqual({
        methode: "POST",
        chemin: "/api/v1/portefeuilles/retirer",
        corps: { adherentId: "adh-2", motif: "Adhérent déménagé" },
      }),
    );
    // Le clic sur un bouton de ligne n'a pas ouvert la fiche adhérent.
    expect(screen.queryByText("Fiche adhérent ouverte")).not.toBeInTheDocument();
  });

  it("réaffecte un adhérent en montrant agent actuel et nouvel agent (#18)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const ecritures = espionnerEcritures();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-1?onglet=portefeuille" });

    const ligne = (await screen.findByText("NDONGO Marie Claire")).closest("tr") as HTMLElement;
    await utilisateur.click(within(ligne).getByRole("button", { name: "Réaffecter" }));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByLabelText("Nouvel agent"));
    const options = await screen.findByRole("listbox");
    // Ni l'agent actuel ni un agent inactif ne sont proposés.
    expect(within(options).queryByText(/Fouda Luc/)).not.toBeInTheDocument();
    await utilisateur.click(within(options).getByText("Mengue Sophie (AG-00002)"));
    await utilisateur.type(within(dialogue).getByLabelText(/Motif/), "Rééquilibrage");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Continuer" }));
    expect(within(dialogue).getByText("Ateba Jean")).toBeInTheDocument();
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Confirmer la réaffectation" }));

    await waitFor(() =>
      expect(ecritures).toContainEqual({
        methode: "POST",
        chemin: "/api/v1/portefeuilles/transferer",
        corps: { adherentIds: ["adh-1"], nouvelAgentId: "agent-2", motif: "Rééquilibrage" },
      }),
    );
  });

  it("montre le suivi CNPS du portefeuille avec CNPS:LIRE, et le masque à l'Agent (#12, #13)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const { unmount } = rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-1?onglet=cnps" });
    expect(await screen.findByText("9 000 FCFA sur 10 500 FCFA")).toBeInTheDocument();
    expect(screen.getByText("Aucun adhérent éligible non immatriculé")).toBeInTheDocument();
    unmount();

    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-2" });
    await screen.findByRole("heading", { level: 1, name: "Mengue Sophie" });
    expect(screen.queryByRole("tab", { name: "CNPS" })).not.toBeInTheDocument();
    // Lecture seule du portefeuille pour l'Agent : aucun mouvement proposé.
    expect(screen.queryByRole("button", { name: /Affecter un adhérent/ })).not.toBeInTheDocument();
  });

  it("filtre l'activité par période, seul filtre accepté par l'API (#7, #23)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes: URL[] = [];
    serveur.events.on("request:start", ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/operations")) requetes.push(url);
    });
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-1?onglet=activite" });

    expect(await screen.findByText("Création par la DGA")).toBeInTheDocument();
    expect(screen.getByText("Motif : Créé par la DGA dga.test")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Du"), { target: { value: "2026-09-01" } });
    await waitFor(() => expect(requetes.at(-1)?.searchParams.get("depuis")).toBeTruthy());
  });

  it("liste l'historique du portefeuille, y compris un adhérent hors périmètre (#24)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-1?onglet=historique" });

    expect(await screen.findByText("NDONGO Marie Claire")).toBeInTheDocument();
    expect(screen.getByText("En cours")).toBeInTheDocument();
    expect(await screen.findByText("Adhérent hors de votre périmètre")).toBeInTheDocument();
    expect(screen.getByText("Changement de secteur")).toBeInTheDocument();
  });

  it("affiche un message clair pour un agent introuvable", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/inconnu" });
    expect(await screen.findByText("Agent introuvable")).toBeInTheDocument();
  });
});
