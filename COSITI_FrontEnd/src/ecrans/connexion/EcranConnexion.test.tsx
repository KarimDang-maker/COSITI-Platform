import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { EcranConnexion } from "@/ecrans/connexion/EcranConnexion";

function arbreDeTest() {
  return (
    <Routes>
      <Route path="/connexion" element={<EcranConnexion />} />
      <Route path="/" element={<p>Zone protégée</p>} />
      <Route path="/mot-de-passe/changer" element={<p>Changer le mot de passe</p>} />
    </Routes>
  );
}

describe("EcranConnexion", () => {
  it("affiche un message d'erreur unique pour un identifiant ou un mot de passe incorrect", async () => {
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbreDeTest(), { routeInitiale: "/connexion" });

    await utilisateur.type(screen.getByLabelText("Identifiant"), "inconnu");
    await utilisateur.type(screen.getByLabelText("Mot de passe"), "mauvais-mot-de-passe");
    await utilisateur.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Identifiant ou mot de passe incorrect.")).toBeInTheDocument();
  });

  it("connecte l'utilisateur et redirige vers la page d'origine", async () => {
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbreDeTest(), { routeInitiale: "/connexion" });

    await utilisateur.type(screen.getByLabelText("Identifiant"), "agent.test");
    await utilisateur.type(screen.getByLabelText("Mot de passe"), "MotDePasse#1");
    await utilisateur.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(screen.getByText("Zone protégée")).toBeInTheDocument());
  });

  it("redirige vers le changement de mot de passe quand il est requis", async () => {
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbreDeTest(), { routeInitiale: "/connexion" });

    await utilisateur.type(screen.getByLabelText("Identifiant"), "primo.test");
    await utilisateur.type(screen.getByLabelText("Mot de passe"), "MotDePasse#1");
    await utilisateur.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(screen.getByText("Changer le mot de passe")).toBeInTheDocument());
  });

  it("affiche un message dédié en cas de verrouillage temporaire", async () => {
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbreDeTest(), { routeInitiale: "/connexion" });

    await utilisateur.type(screen.getByLabelText("Identifiant"), "verrouille.test");
    await utilisateur.type(screen.getByLabelText("Mot de passe"), "peu-importe");
    await utilisateur.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Trop de tentatives. Réessayez dans quelques minutes.")).toBeInTheDocument();
  });
});
