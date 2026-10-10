import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_DAF, JETON_DGA, JETON_GESTIONNAIRE, JETON_PCA } from "@/test/msw/donnees";
import { FicheAdherent } from "@/ecrans/adherents/FicheAdherent";
import { NavigationLaterale } from "@/components/cositi/navigation-laterale";
import { GardeRoute } from "@/app/GardeRoute";
import { EcranCentreValidation } from "@/ecrans/workflow/EcranCentreValidation";

/**
 * V22 : dossier adhérent (comptes Sécurité Sociale / Épargne, coordonnées WhatsApp / e-mail), historiques général
 * et financier (filtres, pagination, ordre, refus), et retrait des accès DAF / file DGA au Gestionnaire.
 */

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

function arbre() {
  return (
    <Routes>
      <Route path="/adherents/:id" element={<FicheAdherent />} />
      <Route path="/cotisations/nouveau" element={<p>Saisie de cotisation</p>} />
    </Routes>
  );
}

const ATTENTE = { timeout: 4000 };

afterEach(() => {
  serveur.events.removeAllListeners();
  // Un test qui se termine sur une sélection Radix laisse `pointer-events: none` sur <body> le temps de la
  // fermeture ; le test suivant verrait alors ses clics ignorés.
  document.body.style.pointerEvents = "";
});

describe("V22 — dossier adhérent", () => {
  it("affiche les comptes Sécurité Sociale et Épargne fournis par le serveur, et la saisie d'une cotisation", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1" });

    const ss = await screen.findByRole("region", { name: "Compte Sécurité Sociale" }, ATTENTE);
    expect(within(ss).getByText(/2\s100/)).toBeInTheDocument();
    const ep = screen.getByRole("region", { name: "Compte Épargne" });
    expect(within(ep).getByText(/900/)).toBeInTheDocument();
    expect(screen.getByText(/reste/)).toHaveTextContent(/7\s500/);

    await utilisateur.click(screen.getByRole("link", { name: /Enregistrer une cotisation/ }));
    expect(await screen.findByText("Saisie de cotisation")).toBeInTheDocument();
  });

  it("signale une erreur des comptes avec possibilité de réessayer", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.get("/api/v1/adherents/:id/synthese-cotisations", () =>
        HttpResponse.json({ code: "ERREUR_INTERNE", message: "Synthèse indisponible.", traceId: "t", avertissements: [] }, { status: 500 }),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1" });
    expect(await screen.findByText("Comptes indisponibles", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });

  it("affiche WhatsApp et e-mail, et les renvoie au PUT des coordonnées", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    expect(await screen.findByText("paul.atangana@exemple.cm", {}, ATTENTE)).toBeInTheDocument();
    const boutons = screen.getAllByRole("button", { name: "Modifier" });
    await utilisateur.click(boutons[0]!);
    const email = await screen.findByLabelText(/^E-mail/);
    await utilisateur.clear(email);
    await utilisateur.type(email, "nouvelle@exemple.cm");
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(
      () =>
        expect(requetes.find((r) => r.methode === "PUT" && r.url.pathname === "/api/v1/adherents/adh-2/coordonnees")?.corps).toMatchObject({
          whatsapp: "690112233",
          email: "nouvelle@exemple.cm",
        }),
      ATTENTE,
    );
  });

  it("ouvre l'historique depuis le bouton de l'en-tête", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    await utilisateur.click(await screen.findByRole("button", { name: "Historique" }, ATTENTE));
    expect(await screen.findByRole("tab", { name: "Historique général" }, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Historique financier" })).toBeInTheDocument();
  });
});

describe("V22 — historiques", () => {
  it("pagine côté serveur et change d'ordre par une requête", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=historique" });

    expect(await screen.findByText("Création du dossier", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText(/26 événements/)).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: /Suivant/ }));
    await waitFor(
      () => expect(requetes.some((r) => r.url.pathname.endsWith("/historique-general") && r.url.searchParams.get("page") === "1")).toBe(true),
      ATTENTE,
    );

    await utilisateur.click(screen.getByLabelText("Ordre"));
    await utilisateur.click(await screen.findByRole("option", { name: "Plus anciennes d'abord" }, ATTENTE));
    await waitFor(
      () => expect(requetes.some((r) => r.url.pathname.endsWith("/historique-general") && r.url.searchParams.get("direction") === "ASC")).toBe(true),
      ATTENTE,
    );
  });

  it("filtre par période côté serveur et annonce l'absence d'action", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=historique" });

    await screen.findByText("Création du dossier", {}, ATTENTE);
    // Ouverture au clavier (Entrée), comme le ferait un utilisateur sans souris.
    screen.getByLabelText("Période").focus();
    await utilisateur.keyboard("{Enter}");
    await utilisateur.click(await screen.findByRole("option", { name: "Jour" }, ATTENTE));
    expect(await screen.findByText("Aucune action enregistrée pour cette journée.", {}, ATTENTE)).toBeInTheDocument();
    const appel = requetes.find((r) => r.url.pathname.endsWith("/historique-general") && r.url.searchParams.get("periode") === "JOUR");
    expect(appel?.url.searchParams.get("date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("affiche l'historique financier : cotisation, répartition et frais d'adhésion distincts", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1?onglet=historique" });

    await utilisateur.click(await screen.findByRole("tab", { name: "Historique financier" }, ATTENTE));
    expect(await screen.findByText("Enregistrement d'une cotisation", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText("REC-000010")).toBeInTheDocument();
    expect(screen.getByText("Frais d'adhésion enregistré")).toBeInTheDocument();
    expect(screen.getByText("Montant securite sociale :")).toBeInTheDocument();
  });

  it("n'affiche pas le contenu financier quand le serveur le refuse (403)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.get("/api/v1/adherents/:id/historique-financier", () =>
        HttpResponse.json({ code: "HISTORIQUE_FINANCIER_INACCESSIBLE", message: "Refusé.", traceId: "t", avertissements: [] }, { status: 403 }),
      ),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1?onglet=historique" });

    await utilisateur.click(await screen.findByRole("tab", { name: "Historique financier" }, ATTENTE));
    expect(await screen.findByText("Historique non accessible", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByText("Enregistrement d'une cotisation")).not.toBeInTheDocument();
  });
});

describe("V22 — navigation du Gestionnaire", () => {
  it("n'affiche ni la file DAF ni la file de contrôle DGA au Gestionnaire", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(<NavigationLaterale />, { routeInitiale: "/" });
    expect(await screen.findByRole("link", { name: /Adhérents/ }, ATTENTE)).toBeInTheDocument();
    // V23 : rubrique Finances exclusive au DAF, centre de validation retiré au Gestionnaire.
    expect(screen.queryByText("Finances")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Cotisations/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Centre de validation/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^DAF$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Contrôle DGA/ })).not.toBeInTheDocument();
  });

  it("donne au DAF la rubrique Finances et le centre de validation, sans la rubrique Terrain (V23)", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(<NavigationLaterale />, { routeInitiale: "/" });
    expect(await screen.findByRole("link", { name: /^DAF$/ }, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cotisations/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Centre de validation/ })).toBeInTheDocument();
    expect(screen.queryByText("Terrain")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Agents de terrain/ })).not.toBeInTheDocument();
  });

  it("ne donne pas de centre de validation au PCA (V23)", async () => {
    simulerSession(JETON_PCA);
    rendreAvecProviders(<NavigationLaterale />, { routeInitiale: "/" });
    expect(await screen.findByRole("link", { name: /Adhérents/ }, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Centre de validation/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Finances")).not.toBeInTheDocument();
  });

  it("donne au DG le même centre de validation que la DGA (V23)", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(<NavigationLaterale />, { routeInitiale: "/" });
    expect(await screen.findByRole("link", { name: /Centre de validation/ }, ATTENTE)).toBeInTheDocument();
  });

  it("protège aussi les routes : accès direct refusé au Gestionnaire", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(
      <Routes>
        <Route
          path="/daf"
          element={
            <GardeRoute unePermissionParmi={["PAIEMENT:VALIDER", "RAPPORT_DAF:LIRE"]}>
              <p>File DAF</p>
            </GardeRoute>
          }
        />
      </Routes>,
      { routeInitiale: "/daf" },
    );
    await waitFor(() => expect(screen.queryByText("File DAF")).not.toBeInTheDocument(), ATTENTE);
    expect(await screen.findByText(/accès|autoris/i, {}, ATTENTE)).toBeInTheDocument();
  });

  it("ouvre le centre du DAF sur les validations financières, frais d'adhésion compris (V23)", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(
      <Routes>
        <Route path="/validations" element={<EcranCentreValidation />} />
      </Routes>,
      { routeInitiale: "/validations" },
    );
    expect(await screen.findByRole("tab", { name: "Validations financières" }, ATTENTE)).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "Cotisations à contrôler" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bilans de caisse à valider" })).toBeInTheDocument();
    expect(await screen.findByRole("list", { name: "Frais d'adhésion à valider" }, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Demandes de correction" })).toBeInTheDocument();
  });

  it("ne propose « À traiter » qu'à qui peut décider", async () => {
    simulerSession(JETON_AGENT);
    rendreAvecProviders(
      <Routes>
        <Route path="/validations" element={<EcranCentreValidation />} />
      </Routes>,
      { routeInitiale: "/validations" },
    );
    expect(await screen.findByRole("tab", { name: "Mes demandes" }, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "À traiter" })).not.toBeInTheDocument();
  });
});
