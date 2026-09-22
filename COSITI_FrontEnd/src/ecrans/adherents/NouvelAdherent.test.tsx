import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { fireEvent, rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT } from "@/test/msw/donnees";
import { NouvelAdherent } from "@/ecrans/adherents/NouvelAdherent";

function simulerSessionActive() {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: JETON_AGENT })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/adherents/nouveau" element={<NouvelAdherent />} />
      <Route path="/adherents/:id" element={<p>Fiche affichée</p>} />
    </Routes>
  );
}

async function remplirIdentite(utilisateur: ReturnType<typeof userEvent.setup>, telephone: string) {
  await utilisateur.type(screen.getByLabelText("Nom"), "NDONGO");
  await utilisateur.type(screen.getByLabelText("Téléphone principal"), telephone);
  await utilisateur.click(screen.getByRole("button", { name: "Suivant" }));
}

async function remplirRattachement(utilisateur: ReturnType<typeof userEvent.setup>) {
  await utilisateur.click(screen.getByRole("combobox"));
  const popup = await screen.findByRole("listbox");
  await utilisateur.click(within(popup).getByText("Douala - Bonabéri"));
  await utilisateur.type(screen.getByLabelText("Code d'activité"), "ACT-01");
  await utilisateur.type(screen.getByLabelText("Localisation"), "Marché central");
  fireEvent.change(screen.getByLabelText("Date d'adhésion"), { target: { value: "2026-01-15" } });
  await utilisateur.click(screen.getByRole("button", { name: "Suivant" }));
}

describe("NouvelAdherent", () => {
  it("bloque le passage à l'étape suivante tant que les champs obligatoires manquent", async () => {
    simulerSessionActive();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/nouveau" });

    await utilisateur.click(await screen.findByRole("button", { name: "Suivant" }));

    expect(await screen.findByText("Le nom est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le téléphone principal est obligatoire.")).toBeInTheDocument();
  });

  it("signale un doublon potentiel de façon non bloquante puis crée l'adhérent après confirmation", async () => {
    simulerSessionActive();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/nouveau" });

    await screen.findByLabelText("Nom");
    await remplirIdentite(utilisateur, "677000937"); // téléphone de l'adhérent fixture adh-1
    await remplirRattachement(utilisateur);

    // Étape 3 : le bandeau de doublon est informatif, il ne bloque rien.
    expect(await screen.findByText("Doublons potentiels détectés")).toBeInTheDocument();
    expect(screen.getByText(/COSITI-00001/)).toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: "Créer l'adhérent" }));

    // La création sans confirmation renvoie 409 : un dialogue de confirmation s'ouvre.
    expect(await screen.findByText("Doublon potentiel détecté")).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: "Créer quand même" }));

    await waitFor(() => expect(screen.getByText("Fiche affichée")).toBeInTheDocument());
  });

  it("crée l'adhérent directement en l'absence de doublon", async () => {
    simulerSessionActive();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/nouveau" });

    await screen.findByLabelText("Nom");
    await remplirIdentite(utilisateur, "699887766");
    await remplirRattachement(utilisateur);

    expect(screen.queryByText("Doublons potentiels détectés")).not.toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: "Créer l'adhérent" }));

    await waitFor(() => expect(screen.getByText("Fiche affichée")).toBeInTheDocument());
  });
});
