import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { OngletAvantages } from "@/ecrans/adherents/fiche/OngletAvantages";

describe("OngletAvantages", () => {
  it("affiche le statut et les critères manquants calculés par le serveur", async () => {
    rendreAvecProviders(<OngletAvantages adherentId="adh-2" />);

    expect(await screen.findByText("Allocations familiales")).toBeInTheDocument();
    expect(screen.getByText("En cours d'acquisition")).toBeInTheDocument();
    expect(screen.getByText("Un enfant de 21 ans ou moins")).toBeInTheDocument();
    expect(screen.getByText("Immatriculé à la CNPS")).toBeInTheDocument();
  });

  it("signale l'absence d'évaluation", async () => {
    serveur.use(http.get("/api/v1/adherents/:id/avantages", () => HttpResponse.json([])));
    rendreAvecProviders(<OngletAvantages adherentId="adh-2" />);

    expect(await screen.findByText("Aucun avantage évalué")).toBeInTheDocument();
  });

  it("affiche l'erreur de l'API", async () => {
    serveur.use(
      http.get("/api/v1/adherents/:id/avantages", () =>
        HttpResponse.json({ code: "ACCES_REFUSE", message: "Accès refusé.", traceId: "t-1" }, { status: 403 }),
      ),
    );
    rendreAvecProviders(<OngletAvantages adherentId="adh-2" />);

    expect(await screen.findByText("Impossible de charger les avantages de l'adhérent")).toBeInTheDocument();
  });
});
