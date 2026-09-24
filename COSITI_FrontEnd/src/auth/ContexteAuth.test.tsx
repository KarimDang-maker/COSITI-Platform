import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { serveur } from "@/test/msw/serveur";
import { AuthProvider, useAuth } from "@/auth/ContexteAuth";
import { UTILISATEURS } from "@/test/msw/donnees";

function Temoin() {
  const { statut } = useAuth();
  return <p>statut : {statut}</p>;
}

/**
 * Régression du jalon J12, constatée en recette E2E.
 *
 * `StrictMode` monte, démonte puis remonte en développement : l'effet de reprise de
 * session partait donc deux fois. Le serveur faisant tourner le jeton de rafraîchissement
 * à chaque usage, le second appel présentait un jeton déjà consommé — traité comme un vol
 * probable, il révoquait **toute la famille** et déconnectait l'utilisateur
 * (`ServiceJetonImpl.rafraichir`). Le même enchaînement se produit en production avec deux
 * onglets restaurés ensemble ; ce n'est pas un artefact de développement.
 */
describe("AuthProvider — reprise de session", () => {
  it("ne lance qu'une reprise même sous le double montage de StrictMode", async () => {
    const jeton = Object.keys(UTILISATEURS)[0];
    let appels = 0;
    serveur.use(
      http.post("/api/v1/auth/rafraichir", async () => {
        appels += 1;
        await new Promise((resoudre) => setTimeout(resoudre, 20));
        return HttpResponse.json({ jetonAcces: jeton });
      }),
    );

    // `AuthProvider` appelle `useQueryClient()` (purge du cache à la déconnexion) : un
    // `QueryClientProvider` ancêtre est désormais requis, comme partout ailleurs dans l'application.
    const clientRequetes = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <StrictMode>
        <QueryClientProvider client={clientRequetes}>
          <AuthProvider>
            <Temoin />
          </AuthProvider>
        </QueryClientProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByText(/statut : connecte/)).toBeInTheDocument());
    expect(appels).toBe(1);
  });
});

/**
 * Nettoyage de cache demandé pour les postes partagés COSITI : aucune donnée d'un compte ne doit rester
 * disponible en mémoire (React Query) après sa déconnexion, pour la session suivante sur le même poste.
 */
describe("AuthProvider — nettoyage du cache à la déconnexion", () => {
  it("purge tout le cache TanStack Query quand deconnecter() est appelé", async () => {
    function TemoinConnexionEtDeconnexion() {
      const { statut, connecter, deconnecter } = useAuth();
      return (
        <div>
          <p>statut : {statut}</p>
          <button onClick={() => void connecter("gestionnaire.test", "MotDePasse#1")}>Se connecter</button>
          <button onClick={() => void deconnecter()}>Se déconnecter</button>
        </div>
      );
    }

    const clientRequetes = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Simule une donnée déjà en cache, comme un écran métier en aurait laissé une avant la déconnexion.
    clientRequetes.setQueryData(["adherents", "liste-simulee"], { contenu: ["donnee-sensible"] });
    expect(clientRequetes.getQueryCache().getAll().length).toBeGreaterThan(0);

    const utilisateur = userEvent.setup();

    render(
      <QueryClientProvider client={clientRequetes}>
        <AuthProvider>
          <TemoinConnexionEtDeconnexion />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await utilisateur.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(screen.getByText(/statut : connecte/)).toBeInTheDocument());

    await utilisateur.click(screen.getByRole("button", { name: "Se déconnecter" }));
    await waitFor(() => expect(screen.getByText(/statut : anonyme/)).toBeInTheDocument());

    expect(clientRequetes.getQueryCache().getAll()).toHaveLength(0);
  });
});
