import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DAF, JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { EcranAvantages } from "@/ecrans/avantages/EcranAvantages";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/avantages" element={<EcranAvantages />} />
    </Routes>
  );
}

describe("EcranAvantages", () => {
  it("affiche le catalogue et les bénéficiaires acquis du premier avantage", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/avantages" });

    expect(await screen.findByText("Bénéficiaires — Allocations familiales")).toBeInTheDocument();
    expect(await screen.findByText("MBARGA Alice")).toBeInTheDocument();
    // Le statut EN_COURS n'est pas servi par défaut.
    expect(screen.queryByText("OWONA Serge")).not.toBeInTheDocument();
    expect(screen.getByText("Pension de vieillesse")).toBeInTheDocument();
  });

  it("filtre les bénéficiaires par statut", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/avantages?statut=EN_COURS" });

    expect(await screen.findByText("OWONA Serge")).toBeInTheDocument();
    // Les critères manquants viennent du serveur.
    expect(screen.getAllByText("Immatriculé à la CNPS").length).toBeGreaterThan(0);
    expect(screen.queryByText("MBARGA Alice")).not.toBeInTheDocument();
  });

  it("filtre le catalogue par branche", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/avantages?branche=PENSIONS&statut=SUSPENDU" });

    expect(await screen.findByText("Bénéficiaires — Pension de vieillesse")).toBeInTheDocument();
    expect(await screen.findByText("NKODO Pierre")).toBeInTheDocument();
    expect(screen.queryByText("Allocations familiales")).not.toBeInTheDocument();
  });

  it("lance le recalcul après confirmation et affiche le résultat serveur", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    let appels = 0;
    serveur.use(
      http.post("/api/v1/avantages/recalculer", () => {
        appels += 1;
        return HttpResponse.json({ adherentsEvalues: 172, avantagesEvalues: 4, changements: 3 });
      }),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/avantages" });

    await utilisateur.click(await screen.findByRole("button", { name: /Recalculer les avantages/ }));
    await utilisateur.click(await screen.findByRole("button", { name: "Lancer le recalcul" }));

    await screen.findByText(/Recalcul terminé/);
    expect(appels).toBe(1);
  });

  it("réserve la gestion du catalogue au DAF : le Gestionnaire recalcule mais ne gère pas", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/avantages" });
    await screen.findByText("MBARGA Alice");
    expect(screen.getByRole("button", { name: /Recalculer les avantages/ })).toBeInTheDocument();
    // Le Gestionnaire ne gère pas le catalogue.
    expect(screen.queryByRole("button", { name: "Nouvel avantage" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Modifier l'avantage/ })).not.toBeInTheDocument();
  });

  it("permet au DAF de créer un avantage et affiche le refus de l'API tel quel", async () => {
    simulerSession(JETON_DAF);
    let corpsEnvoye: { code?: string; criteres?: { type: string }[] } | null = null;
    serveur.use(
      http.post("/api/v1/avantages", async ({ request }) => {
        corpsEnvoye = (await request.json()) as typeof corpsEnvoye;
        return HttpResponse.json(
          { code: "AVANTAGE_CODE_EXISTANT", message: "Un avantage porte déjà ce code.", champ: "code", traceId: "t-409" },
          { status: 409 },
        );
      }),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/avantages" });

    await utilisateur.click(await screen.findByRole("button", { name: "Nouvel avantage" }));
    await utilisateur.click(await screen.findByRole("button", { name: "Enregistrer" }));
    await screen.findByText("Le code est obligatoire.");
    expect(corpsEnvoye).toBeNull();

    await utilisateur.type(screen.getByLabelText(/^Code/), "PF_TEST");
    await utilisateur.type(screen.getByLabelText(/^Libellé/), "Avantage de test");
    await utilisateur.click(screen.getByRole("combobox", { name: /Branche/ }));
    await utilisateur.click(await screen.findByRole("option", { name: "Pensions" }));
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));

    await screen.findByText("Un avantage porte déjà ce code.");
    await waitFor(() => expect(corpsEnvoye?.code).toBe("PF_TEST"));
  });

  it("affiche l'erreur de l'API plutôt qu'un catalogue vide", async () => {
    simulerSession(JETON_DGA);
    serveur.use(
      http.get("/api/v1/avantages", () =>
        HttpResponse.json({ code: "ACCES_REFUSE", message: "Accès refusé.", traceId: "t-1" }, { status: 403 }),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/avantages" });

    await screen.findByText("Impossible de charger le catalogue des avantages");
    expect(screen.getByText("Accès refusé.")).toBeInTheDocument();
  });
});
