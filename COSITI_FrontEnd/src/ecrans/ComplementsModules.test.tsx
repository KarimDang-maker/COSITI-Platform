import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DAF, JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { PACKS_TEST } from "@/test/msw/handlers.adherents";
import { DetailPaiement } from "@/ecrans/cotisations/DetailPaiement";
import { FicheAdherent } from "@/ecrans/adherents/FicheAdherent";
import { EcranOrganisation } from "@/ecrans/organisation/EcranOrganisation";
import { FicheAgentTerrain } from "@/ecrans/agents/FicheAgentTerrain";
import { RemisesCaisse } from "@/ecrans/daf/RemisesCaisse";

/**
 * Fonctionnalités des 3 modules qui n'avaient pas d'écran (recette du 05/10/2026) : reçu de cotisation, changement de
 * pack, gestion des zones, adhérents sans agent hors zone (V23), remise de caisse (déclaration et réception).
 */

const ATTENTE = { timeout: 4000 };

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

type Requete = { methode: string; url: URL; corps: unknown };

function espionner() {
  const requetes: Requete[] = [];
  serveur.events.on("request:start", async ({ request }) => {
    const texte = request.method === "GET" ? "" : await request.clone().text();
    requetes.push({ methode: request.method, url: new URL(request.url), corps: texte ? JSON.parse(texte) : undefined });
  });
  return requetes;
}

afterEach(() => {
  serveur.events.removeAllListeners();
  document.body.style.pointerEvents = "";
});

describe("Reçu de cotisation", () => {
  it("affiche le reçu émis par le serveur, avec la répartition, et propose l'impression", async () => {
    simulerSession(JETON_DAF);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(
      <Routes>
        <Route path="/cotisations/:id" element={<DetailPaiement />} />
      </Routes>,
      { routeInitiale: "/cotisations/pai-1" },
    );

    await utilisateur.click(await screen.findByRole("button", { name: "Reçu" }, ATTENTE));
    const dialogue = await screen.findByRole("dialog");
    const contenu = await within(dialogue).findByLabelText("Contenu du reçu");
    expect(within(contenu).getByText("COSITI-00001")).toBeInTheDocument();
    expect(within(contenu).getByText("NDONGO Marie Claire")).toBeInTheDocument();
    expect(within(contenu).getByText("dont Sécurité sociale")).toBeInTheDocument();
    expect(within(contenu).getByText("dont Épargne")).toBeInTheDocument();
    expect(within(dialogue).getByRole("button", { name: "Imprimer" })).toBeEnabled();
  });
});

describe("Changement de pack", () => {
  it("change le pack d'un adhérent qui en a déjà un, avec date d'effet", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.get("/api/v1/packs", () =>
        HttpResponse.json([
          ...PACKS_TEST,
          { id: "55555555-5555-4555-8555-555555555555", code: "PACK_1000", libelle: "Pack Confort 1000 F/jour", montantJournalier: 1000, montantMensuelEquivalent: 30000, seuilEligibiliteCnps: 15000, actif: true },
        ]),
      ),
    );
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(
      <Routes>
        <Route path="/adherents/:id" element={<FicheAdherent />} />
      </Routes>,
      { routeInitiale: "/adherents/adh-1" },
    );

    await utilisateur.click(await screen.findByRole("button", { name: "Changer" }, ATTENTE));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByRole("combobox"));
    await utilisateur.click(await screen.findByRole("option", { name: /Pack Confort 1000/ }));
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Changer de pack" }));

    expect(await screen.findByText("Pack changé.", undefined, ATTENTE)).toBeInTheDocument();
    const appel = requetes.find((r) => r.methode === "POST" && r.url.pathname === "/api/v1/adherents/adh-1/pack");
    expect(appel?.corps).toMatchObject({ packId: "55555555-5555-4555-8555-555555555555", effetLe: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
  });
});

describe("Zones", () => {
  it("crée une zone, affiche un refus du serveur, et modifie une zone existante", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<EcranOrganisation />, { routeInitiale: "/organisation" });

    await utilisateur.click(await screen.findByRole("button", { name: "Nouvelle zone" }, ATTENTE));
    let dialogue = await screen.findByRole("dialog");
    await utilisateur.type(within(dialogue).getByLabelText("Code"), "Z01");
    await utilisateur.type(within(dialogue).getByLabelText("Libellé"), "Doublon");
    await utilisateur.type(within(dialogue).getByLabelText("Ville"), "Douala");
    await utilisateur.type(within(dialogue).getByLabelText("Région"), "Littoral");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Créer la zone" }));
    expect(await within(dialogue).findByText("Ce code de zone est déjà utilisé.")).toBeInTheDocument();

    await utilisateur.clear(within(dialogue).getByLabelText("Code"));
    await utilisateur.type(within(dialogue).getByLabelText("Code"), "Z09");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Créer la zone" }));
    expect(await screen.findByText("Zone créée.")).toBeInTheDocument();
    expect(requetes.filter((r) => r.methode === "POST" && r.url.pathname === "/api/v1/zones").at(-1)?.corps).toMatchObject({
      code: "Z09",
      libelle: "Doublon",
      ville: "Douala",
      region: "Littoral",
    });

    await utilisateur.click(await screen.findByRole("button", { name: "Modifier la zone Douala - Bonabéri" }));
    dialogue = await screen.findByRole("dialog");
    expect(within(dialogue).getByLabelText("Code")).toHaveValue("Z01");
    await utilisateur.clear(within(dialogue).getByLabelText("Libellé"));
    await utilisateur.type(within(dialogue).getByLabelText("Libellé"), "Douala - Bonabéri Nord");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Zone modifiée.")).toBeInTheDocument();
    expect(requetes.find((r) => r.methode === "PUT" && r.url.pathname === "/api/v1/zones/zone-1")?.corps).toMatchObject({
      libelle: "Douala - Bonabéri Nord",
    });
  });

  it("liste les adhérents sans agent de toutes les zones, y compris ceux créés sans zone (V23)", async () => {
    simulerSession(JETON_DGA);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<EcranOrganisation />, { routeInitiale: "/organisation" });

    const champ = await screen.findByRole("combobox", { name: "Zone" }, ATTENTE);
    await utilisateur.click(champ);
    await utilisateur.click(await screen.findByRole("option", { name: "Toutes les zones (y compris sans zone)" }));

    expect(await screen.findByText("MBIDA Rose", undefined, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Affecter un agent" })).toBeInTheDocument();
  });
});

describe("Remise de caisse", () => {
  it("déclare une remise depuis la fiche agent : espèces cochées par défaut, total serveur des cotisations cochées", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(
      <Routes>
        <Route path="/agents/:id" element={<FicheAgentTerrain />} />
      </Routes>,
      { routeInitiale: "/agents/agent-1" },
    );

    await utilisateur.click(await screen.findByRole("button", { name: "Déclarer une remise de caisse" }, ATTENTE));
    const dialogue = await screen.findByRole("dialog");
    expect(await within(dialogue).findByText("REC-000101")).toBeInTheDocument();
    expect(within(dialogue).getByRole("checkbox", { name: "Inclure REC-000101" })).toBeChecked();
    expect(within(dialogue).getByRole("checkbox", { name: "Inclure REC-000103" })).not.toBeChecked(); // mobile money
    expect(within(dialogue).getByText(/3\s500/)).toBeInTheDocument();

    await utilisateur.click(within(dialogue).getByRole("button", { name: "Déclarer la remise" }));
    expect(await screen.findByText(/déclarée : la DAF est notifiée/)).toBeInTheDocument();
    expect(requetes.find((r) => r.methode === "POST" && r.url.pathname === "/api/v1/remises-caisse")?.corps).toEqual({
      agentId: "agent-1",
      paiementIds: ["pai-r1", "pai-r2"],
    });
  });

  it("n'offre pas la déclaration sans la permission de saisie (DGA)", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(
      <Routes>
        <Route path="/agents/:id" element={<FicheAgentTerrain />} />
      </Routes>,
      { routeInitiale: "/agents/agent-1" },
    );
    await screen.findAllByText(/AG-00001/, undefined, ATTENTE);
    expect(screen.queryByRole("button", { name: "Déclarer une remise de caisse" })).not.toBeInTheDocument();
  });

  it("la DAF réceptionne une remise et voit l'écart annoncé avant de confirmer", async () => {
    simulerSession(JETON_DAF);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<RemisesCaisse />);

    await utilisateur.click(await screen.findByRole("button", { name: "Réceptionner" }, ATTENTE));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.type(within(dialogue).getByLabelText("Montant réellement reçu (FCFA)"), "6000");
    expect(await within(dialogue).findByText(/Écart de/)).toBeInTheDocument();
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Confirmer la réception" }));

    expect(await screen.findByText(/réceptionnée avec un écart/)).toBeInTheDocument();
    await waitFor(() =>
      expect(requetes.find((r) => r.methode === "POST" && r.url.pathname === "/api/v1/remises-caisse/rem-1/receptionner")?.corps).toEqual({
        montantRecu: 6000,
      }),
    );
  });
});
