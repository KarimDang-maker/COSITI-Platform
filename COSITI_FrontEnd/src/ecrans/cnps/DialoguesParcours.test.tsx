import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_GESTIONNAIRE } from "@/test/msw/donnees";
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

describe("Dialogues du parcours CNPS", () => {
  it("préimmatricule un adhérent éligible", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await utilisateur.click(await screen.findByRole("button", { name: "Préimmatriculer — OWONA Serge" }));
    await utilisateur.type(await screen.findByLabelText(/Numéro temporaire/), "TMP-0100");
    await utilisateur.click(screen.getByRole("button", { name: "Préimmatriculer" }));

    await screen.findByText("Préimmatriculation enregistrée pour OWONA Serge.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exige le numéro temporaire avant tout envoi", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await utilisateur.click(await screen.findByRole("button", { name: "Préimmatriculer — OWONA Serge" }));
    await utilisateur.click(await screen.findByRole("button", { name: "Préimmatriculer" }));

    await screen.findByText("Le numéro temporaire est obligatoire.");
  });

  it("affiche le refus métier CNPS_PREIMMAT_NON_ELIGIBLE sans fermer le dialogue", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.post("/api/v1/cnps/parcours/adherents/:id/preimmatriculer", () =>
        HttpResponse.json(
          {
            code: "CNPS_PREIMMAT_NON_ELIGIBLE",
            message: "L'adhérent n'a pas atteint le quota de cotisations validées.",
            traceId: "t-409",
          },
          { status: 409 },
        ),
      ),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await utilisateur.click(await screen.findByRole("button", { name: "Préimmatriculer — OWONA Serge" }));
    await utilisateur.type(await screen.findByLabelText(/Numéro temporaire/), "TMP-0100");
    await utilisateur.click(screen.getByRole("button", { name: "Préimmatriculer" }));

    await screen.findByText("Action refusée");
    expect(screen.getByText("L'adhérent n'a pas atteint le quota de cotisations validées.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("propose d'ouvrir le dossier quand l'immatriculation répond CNPS_DOSSIER_REQUIS", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.post("/api/v1/cnps/parcours/adherents/:id/immatriculer", () =>
        HttpResponse.json(
          { code: "CNPS_DOSSIER_REQUIS", message: "Ouvrez d'abord le dossier CNPS de l'adhérent.", traceId: "t-409" },
          { status: 409 },
        ),
      ),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await utilisateur.click(await screen.findByRole("button", { name: "Immatriculer — TCHOUA Boris" }));
    await utilisateur.type(await screen.findByLabelText(/Numéro d'immatriculation/), "CNPS-123456");
    await utilisateur.click(screen.getByRole("button", { name: "Immatriculer" }));

    await screen.findByText("Ouvrez d'abord le dossier CNPS de l'adhérent.");
    await utilisateur.click(screen.getByRole("button", { name: "Ouvrir le dossier CNPS" }));

    await screen.findByText("Le dossier existe maintenant : relancez l'immatriculation.");
  });

  it("enregistre le dépôt du dossier au CPS", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parcours" });

    await utilisateur.click(await screen.findByRole("button", { name: "Enregistrer le dépôt au CPS — MBARGA Estelle" }));
    await utilisateur.type(await screen.findByLabelText(/CPS de dépôt/), "CPS Douala 2");
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer le dépôt" }));

    await screen.findByText("Dépôt du dossier enregistré pour MBARGA Estelle.");
  });
});
