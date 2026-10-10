import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { EcranParcoursCnps } from "@/ecrans/cnps/EcranParcoursCnps";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/cnps/parcours" element={<EcranParcoursCnps />} />
      <Route path="/adherents/:id" element={<p>Fiche de l'adhérent</p>} />
    </Routes>
  );
}

describe("EcranParcoursCnps", () => {
  it("affiche les situations, la fenêtre courante et les règles lues du résumé", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await screen.findByText("OWONA Serge");
    expect(screen.getByText("MBARGA Estelle")).toBeInTheDocument();
    // Fenêtre courante et paramètres : valeurs du serveur, jamais écrites en dur.
    expect(await screen.findByText("Fenêtre 2 en cours")).toBeInTheDocument();
    expect(screen.getByText(/Quota de préimmatriculation/)).toHaveTextContent(/10\s?500/);
    // Délai de dépôt : jours restants, et alerte quand le serveur déclare le délai dépassé.
    expect(screen.getByText("12 j restants")).toBeInTheDocument();
    expect(screen.getByText("Délai de dépôt dépassé")).toBeInTheDocument();
    expect(screen.getByText("Reporté")).toBeInTheDocument();
  });

  it("filtre la liste par un clic sur un indicateur", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await screen.findByText("OWONA Serge");
    const carte = await screen.findByRole("button", { name: "Filtrer : En retard" });
    expect(carte).toHaveAttribute("aria-pressed", "false");

    await utilisateur.click(carte);

    await waitFor(() => expect(screen.queryByText("OWONA Serge")).not.toBeInTheDocument());
    expect(screen.getByText("ATANGANA Paul")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtrer : En retard" })).toHaveAttribute("aria-pressed", "true");
  });

  it("propose les actions du parcours au Gestionnaire, selon l'étape de chaque adhérent", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await screen.findByText("OWONA Serge");
    expect(screen.getByRole("button", { name: "Préimmatriculer — OWONA Serge" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer le dépôt au CPS — MBARGA Estelle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Immatriculer — TCHOUA Boris" })).toBeInTheDocument();
    // Un adhérent déjà immatriculé n'a plus d'action.
    expect(screen.queryByRole("button", { name: /BELINGA Ruth/ })).not.toBeInTheDocument();
  });

  it("n'affiche aucune action en consultation seule, mais garde l'accès à la fiche", async () => {
    // La DGA a CNPS:LIRE sans CNPS:GERER.
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await screen.findByText("OWONA Serge");
    expect(screen.queryByRole("button", { name: /Préimmatriculer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Immatriculer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enregistrer le dépôt/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fiche adhérent — OWONA Serge" })).toBeInTheDocument();
  });

  it("donne accès au rapport des dossiers à archivage incomplet", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await utilisateur.click(await screen.findByRole("tab", { name: "Dossiers à archivage incomplet" }));

    await screen.findByText("TCHOUA Boris");
    expect(screen.getByText("Cni recto, Acte naissance")).toBeInTheDocument();
  });

  it("affiche l'erreur renvoyée par l'API plutôt qu'un tableau vide", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.get("/api/v1/cnps/parcours", () =>
        HttpResponse.json({ code: "ACCES_REFUSE", message: "Accès refusé.", traceId: "t-1" }, { status: 403 }),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await screen.findByText("Impossible de charger le parcours CNPS");
    expect(screen.getByText("Accès refusé.")).toBeInTheDocument();
  });
});
