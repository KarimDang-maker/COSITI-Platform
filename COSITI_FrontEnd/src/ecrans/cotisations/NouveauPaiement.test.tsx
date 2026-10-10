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

/** V22 : recherche de l'adhérent par matricule, puis passage à la saisie. */
async function choisirAdherent(utilisateur: ReturnType<typeof userEvent.setup>) {
  await utilisateur.type(await screen.findByLabelText(/^Matricule COSITI/), "COSITI-00001");
  await utilisateur.click(screen.getByRole("button", { name: "Rechercher" }));
  await utilisateur.click(await screen.findByRole("button", { name: "Saisir la cotisation de cet adhérent" }));
}

async function remplirMontants(utilisateur: ReturnType<typeof userEvent.setup>, date: string, montant: string, ss: string, ep: string) {
  await utilisateur.type(await screen.findByLabelText(/^Date du paiement/), date);
  await utilisateur.type(screen.getByLabelText(/^Montant total/), montant);
  await utilisateur.type(screen.getByLabelText(/^Sécurité Sociale/), ss);
  await utilisateur.type(screen.getByLabelText(/^Épargne/), ep);
}

/** Le `Select` shadcn (Radix) n'expose pas de nom accessible fiable sur son déclencheur en jsdom : sélection par position. */
async function choisirModePaiement(utilisateur: ReturnType<typeof userEvent.setup>, libelle: string) {
  const comboboxes = screen.getAllByRole("combobox");
  await utilisateur.click(comboboxes[0]!);
  await utilisateur.click(await screen.findByRole("option", { name: libelle }));
}

describe("NouveauPaiement", () => {
  it("exige une référence de transaction pour un paiement Orange Money", async () => {
    simulerSessionActive();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await choisirAdherent(utilisateur);
    await remplirMontants(utilisateur, "2026-09-10", "5000", "700", "4300");

    await choisirModePaiement(utilisateur, "Orange Money");

    await utilisateur.click(screen.getByRole("button", { name: "Vérifier et enregistrer" }));

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
    await remplirMontants(utilisateur, "2026-09-10", "5000", "700", "4300");
    await choisirModePaiement(utilisateur, "Espèces");

    await utilisateur.click(screen.getByRole("button", { name: "Vérifier et enregistrer" }));
    const recap = await screen.findByRole("alertdialog");
    await utilisateur.click(within(recap).getByRole("button", { name: "Enregistrer la cotisation" }));

    await waitFor(() => expect(screen.getByText("Détail du paiement affiché")).toBeInTheDocument());
    expect(cleRecue).toBeTruthy();
    expect(cleRecue).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
