import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_DGA } from "@/test/msw/donnees";
import { EcranOrganisation } from "@/ecrans/organisation/EcranOrganisation";

function simulerSessionActive(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

describe("EcranOrganisation", () => {
  it("masque les actions réservées à la DGA quand la permission manque", async () => {
    simulerSessionActive(JETON_AGENT); // ORGANISATION:LIRE seul, pas GERER/DESIGNER_CHEF/AFFECTER_PORTEFEUILLE
    rendreAvecProviders(<EcranOrganisation />, { routeInitiale: "/organisation" });

    await screen.findByText("AG-00001");

    expect(screen.queryByRole("button", { name: "Ajouter un agent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Désigner Chef/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Portefeuille/ })).not.toBeInTheDocument();
  });

  it("affiche le formulaire d'ajout d'un agent et révèle le mot de passe initial après création", async () => {
    simulerSessionActive(JETON_DGA);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<EcranOrganisation />, { routeInitiale: "/organisation" });

    await utilisateur.click(await screen.findByRole("button", { name: "Ajouter un agent" }));

    const dialogue = await screen.findByRole("dialog");
    await utilisateur.type(within(dialogue).getByLabelText("Identifiant de connexion"), "nouvel.agent");
    await utilisateur.type(within(dialogue).getByLabelText("Nom complet"), "Fouda Eric");
    await utilisateur.type(within(dialogue).getByLabelText("Téléphone"), "677000099");
    await utilisateur.click(within(dialogue).getByRole("combobox"));
    const listeZones = await screen.findByRole("listbox");
    await utilisateur.click(within(listeZones).getByText("Douala - Bonabéri"));

    await utilisateur.click(within(dialogue).getByRole("button", { name: "Créer l'agent" }));

    expect(await screen.findByText(/Mot de passe initial/)).toBeInTheDocument();
  });

  it("demande confirmation avant de remplacer le Chef, en rappelant l'ancien Chef", async () => {
    simulerSessionActive(JETON_DGA);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<EcranOrganisation />, { routeInitiale: "/organisation" });

    await screen.findByText("Mengue Sophie");
    const ligneSophie = screen.getByText("Mengue Sophie").closest("tr")!;
    await utilisateur.click(within(ligneSophie).getByRole("button", { name: /Désigner Chef/ }));

    const titreDialogue = await screen.findByText("Remplacer le Chef des agents de terrain");
    const dialogueConfirmation = titreDialogue.closest("[role='alertdialog']") as HTMLElement;
    expect(within(dialogueConfirmation).getByText(/Ateba Jean/)).toBeInTheDocument();

    await utilisateur.type(screen.getByLabelText("Motif de la désignation"), "Réorganisation de la zone");
    await utilisateur.click(screen.getByRole("button", { name: "Remplacer le Chef" }));

    await waitFor(() =>
      expect(screen.queryByText("Remplacer le Chef des agents de terrain")).not.toBeInTheDocument(),
    );
  });
});
