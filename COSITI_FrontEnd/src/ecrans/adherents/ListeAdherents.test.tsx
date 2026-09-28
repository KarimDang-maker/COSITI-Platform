import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { serveur } from "@/test/msw/serveur";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { ListeAdherents } from "@/ecrans/adherents/ListeAdherents";

describe("ListeAdherents", () => {
  it("affiche un squelette de chargement avant la réponse de l'API", () => {
    rendreAvecProviders(<ListeAdherents />, { routeInitiale: "/adherents" });
    expect(screen.getByLabelText("Chargement des données")).toBeInTheDocument();
  });

  it("affiche les adhérents renvoyés par l'API", async () => {
    rendreAvecProviders(<ListeAdherents />, { routeInitiale: "/adherents" });
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
    rendreAvecProviders(<ListeAdherents />, { routeInitiale: "/adherents" });
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
    rendreAvecProviders(<ListeAdherents />, { routeInitiale: "/adherents" });
    expect(await screen.findByText("Impossible de charger les adhérents")).toBeInTheDocument();
  });
});
