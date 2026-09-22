import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DAF } from "@/test/msw/donnees";
import { DetailPaiement } from "@/ecrans/cotisations/DetailPaiement";

function simulerSessionDaf() {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: JETON_DAF })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/cotisations/:id" element={<DetailPaiement />} />
    </Routes>
  );
}

describe("DetailPaiement", () => {
  it("désactive le bouton Valider, avec explication, quand l'utilisateur est le créateur du paiement", async () => {
    simulerSessionDaf();
    // pai-2 a été saisi par "daf.test" dans le jeu de données de test.
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-2" });

    const bouton = await screen.findByRole("button", { name: "Valider" });
    expect(bouton).toBeDisabled();
  });

  it("permet de valider un paiement saisi par quelqu'un d'autre", async () => {
    simulerSessionDaf();
    const utilisateur = userEvent.setup();
    // pai-1 a été saisi par "agent.test", pas par le DAF connecté.
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-1" });

    const bouton = await screen.findByRole("button", { name: "Valider" });
    expect(bouton).toBeEnabled();
    await utilisateur.click(bouton);

    await waitFor(() => expect(screen.getByText("Validé")).toBeInTheDocument());
  });

  it("exige un motif avant de confirmer l'annulation, en rappelant montant/date/adhérent", async () => {
    simulerSessionDaf();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-1" });

    await utilisateur.click(await screen.findByRole("button", { name: "Annuler" }));

    const titreDialogue = await screen.findByText("Annuler ce paiement");
    const dialogue = titreDialogue.closest("[role='alertdialog']") as HTMLElement;
    expect(dialogue).toBeInTheDocument();
    // Rappel des valeurs concernées dans le dialogue.
    expect(within(dialogue).getByText(/5 000 FCFA/)).toBeInTheDocument();

    const confirmer = within(dialogue).getByRole("button", { name: "Annuler le paiement" });
    expect(confirmer).toBeDisabled();

    await utilisateur.type(within(dialogue).getByLabelText("Motif de l'annulation"), "Erreur de saisie du montant");
    expect(confirmer).toBeEnabled();
    await utilisateur.click(confirmer);

    await waitFor(() => expect(screen.getByText("Annulé")).toBeInTheDocument());
  });
});
