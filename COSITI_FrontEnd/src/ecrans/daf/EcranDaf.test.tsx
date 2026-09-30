import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_DAF } from "@/test/msw/donnees";
import { EcranDaf } from "@/ecrans/daf/EcranDaf";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/daf" element={<EcranDaf />} />
    </Routes>
  );
}

describe("EcranDaf", () => {
  it("ne montre aucune action de contrôle à un utilisateur sans permission dédiée", async () => {
    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/daf" });

    await screen.findByText("REC-000001");
    expect(screen.queryByRole("button", { name: "Confirmer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Signaler une incohérence" })).not.toBeInTheDocument();
  });

  it("permet au DAF de confirmer un paiement de la file, qui en sort ensuite", async () => {
    simulerSession(JETON_DAF);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/daf" });

    // pai-1 a été saisi par "agent.test" : le DAF connecté ("daf.test") n'en
    // est pas le créateur, le bouton lui est donc actif (pai-2, saisi par le
    // DAF lui-même, reste désactivé — même garde-fou que `DetailPaiement`).
    await screen.findByText("REC-000001");
    const boutonsConfirmer = await screen.findAllByRole("button", { name: "Confirmer" });
    const boutonActif = boutonsConfirmer.find((bouton) => !bouton.hasAttribute("disabled"));
    expect(boutonActif).toBeDefined();

    await utilisateur.click(boutonActif!);

    await waitFor(() => expect(screen.queryByText("REC-000001")).not.toBeInTheDocument());
  });

  it("exige un motif pour signaler une incohérence et rappelle le paiement concerné", async () => {
    simulerSession(JETON_DAF);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/daf" });

    await screen.findByText("REC-000002");
    const lignes = screen.getAllByRole("button", { name: "Signaler une incohérence" });
    await utilisateur.click(lignes[lignes.length - 1]!);

    const titreDialogue = await screen.findByText(/Signaler une incohérence — REC-0000/);
    const dialogue = titreDialogue.closest("[role='alertdialog']") as HTMLElement;
    expect(dialogue).toBeInTheDocument();

    const confirmer = within(dialogue).getByRole("button", { name: "Signaler l'incohérence" });
    expect(confirmer).toBeDisabled();

    await utilisateur.type(within(dialogue).getByLabelText("Motif de l'incohérence"), "Montant incohérent avec le carnet papier");
    expect(confirmer).toBeEnabled();
    await utilisateur.click(confirmer);

    await waitFor(() => expect(screen.queryByText("REC-000002")).not.toBeInTheDocument());
  });
});
