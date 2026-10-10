import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DAF, JETON_DGA } from "@/test/msw/donnees";
import { EcranParametresCnps } from "@/ecrans/cnps/EcranParametresCnps";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/cnps/parametres" element={<EcranParametresCnps />} />
    </Routes>
  );
}

describe("EcranParametresCnps", () => {
  it("charge les paramètres et exige un motif avant d'enregistrer", async () => {
    simulerSession(JETON_DAF);
    let envois = 0;
    serveur.use(
      http.put("/api/v1/cnps/parametres", async ({ request }) => {
        envois += 1;
        return HttpResponse.json({ ...((await request.json()) as object), motif: null });
      }),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parametres" });

    const quota = await screen.findByLabelText(/Quota de préimmatriculation/);
    await waitFor(() => expect(quota).toHaveValue(10500));

    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer les paramètres" }));
    await screen.findByText("Le motif est obligatoire.");
    expect(envois).toBe(0);

    await utilisateur.type(screen.getByLabelText(/Motif de la modification/), "Décision du comité");
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer les paramètres" }));

    await screen.findByText("Paramètres CNPS enregistrés.");
    expect(envois).toBe(1);
  });

  it("affiche le refus de l'API tel quel", async () => {
    simulerSession(JETON_DAF);
    serveur.use(
      http.put("/api/v1/cnps/parametres", () =>
        HttpResponse.json(
          { code: "CNPS_JOUR_COUPURE_INVALIDE", message: "Le jour de coupure doit être compris entre 1 et 28.", traceId: "t-400" },
          { status: 400 },
        ),
      ),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parametres" });

    await waitFor(async () => expect(await screen.findByLabelText(/Jour de coupure/)).toHaveValue(15));
    await utilisateur.type(screen.getByLabelText(/Motif de la modification/), "Test");
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer les paramètres" }));

    await screen.findByText("Le jour de coupure doit être compris entre 1 et 28.");
  });

  it("reste en lecture seule sans la permission CNPS:PARAMETRER", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/parametres" });

    const quota = await screen.findByLabelText(/Quota de préimmatriculation/);
    expect(quota).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Enregistrer les paramètres" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Motif de la modification/)).not.toBeInTheDocument();
  });
});
