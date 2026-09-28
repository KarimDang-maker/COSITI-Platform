import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT } from "@/test/msw/donnees";
import { NouveauPaiement } from "@/ecrans/cotisations/NouveauPaiement";

function simulerSessionActive() {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: JETON_AGENT })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/cotisations/nouveau" element={<NouveauPaiement />} />
      <Route path="/cotisations/:id" element={<p>Détail du paiement affiché</p>} />
    </Routes>
  );
}

async function choisirAdherent(utilisateur: ReturnType<typeof userEvent.setup>) {
  const comboboxes = await screen.findAllByRole("combobox");
  await utilisateur.click(comboboxes[0]!);
  const liste = await screen.findByRole("listbox");
  await utilisateur.click(within(liste).getByText(/NDONGO/));
}

/** Le `Select` shadcn (Radix) n'expose pas de nom accessible fiable sur son déclencheur en jsdom : sélection par position. */
async function choisirModePaiement(utilisateur: ReturnType<typeof userEvent.setup>, libelle: string) {
  const comboboxes = screen.getAllByRole("combobox");
  await utilisateur.click(comboboxes[1]!);
  await utilisateur.click(await screen.findByRole("option", { name: libelle }));
}

describe("NouveauPaiement", () => {
  it("exige une référence de transaction pour un paiement Orange Money", async () => {
    simulerSessionActive();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await choisirAdherent(utilisateur);
    await utilisateur.type(screen.getByLabelText("Date du paiement"), "2026-09-10");
    await utilisateur.type(screen.getByLabelText("Montant (FCFA)"), "5000");

    await choisirModePaiement(utilisateur, "Orange Money");

    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer le paiement" }));

    expect(
      await screen.findByText(/La référence de transaction est obligatoire pour un paiement Orange Money/),
    ).toBeInTheDocument();
  });

  it("enregistre un paiement en espèces avec un en-tête Idempotency-Key généré au montage", async () => {
    simulerSessionActive();
    let cleRecue: string | null = null;
    serveur.use(
      http.post("/api/v1/paiements", async ({ request }) => {
        cleRecue = request.headers.get("Idempotency-Key");
        return HttpResponse.json(
          {
            id: "pai-nouveau",
            adherentId: "adh-1",
            numeroRecu: "REC-000099",
            datePaiement: "2026-09-10",
            montant: 5000,
            modePaiement: "ESPECES",
            referenceTransaction: null,
            typePaiement: "COTISATION",
            agentEncaisseurId: null,
            statut: "A_CONTROLER",
            validePar: null,
            version: 0,
          },
          { status: 201 },
        );
      }),
    );

    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await choisirAdherent(utilisateur);
    await utilisateur.type(screen.getByLabelText("Date du paiement"), "2026-09-10");
    await utilisateur.type(screen.getByLabelText("Montant (FCFA)"), "5000");
    await choisirModePaiement(utilisateur, "Espèces");

    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer le paiement" }));

    await waitFor(() => expect(screen.getByText("Détail du paiement affiché")).toBeInTheDocument());
    expect(cleRecue).toBeTruthy();
    expect(cleRecue).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
