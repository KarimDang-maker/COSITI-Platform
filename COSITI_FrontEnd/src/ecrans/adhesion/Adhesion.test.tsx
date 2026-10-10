import { afterEach, beforeEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { reinitialiserAdhesion } from "@/test/msw/handlers.adhesion";
import { JETON_AGENT, JETON_DAF, JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { FicheAdherent } from "@/ecrans/adherents/FicheAdherent";
import { EcranFileControleDga } from "@/ecrans/adhesion/EcranFileControleDga";
import { EcranControleDga } from "@/ecrans/adhesion/EcranControleDga";
import { EcranFraisAdhesion } from "@/ecrans/adhesion/EcranFraisAdhesion";
import { FicheAgentTerrain } from "@/ecrans/agents/FicheAgentTerrain";

/**
 * Parcours d'adhésion (V20) : frais d'adhésion, activation par le Gestionnaire, contrôle documentaire DGA,
 * rapprochement. Le simulacre (`handlers.adhesion.ts`) applique les règles du serveur ; chaque test repart du
 * jeu initial.
 */

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

type Requete = { methode: string; chemin: string; corps: unknown };

function espionner() {
  const requetes: Requete[] = [];
  serveur.events.on("request:start", async ({ request }) => {
    if (request.method === "GET") return;
    const texte = await request.clone().text();
    requetes.push({ methode: request.method, chemin: new URL(request.url).pathname, corps: texte ? JSON.parse(texte) : undefined });
  });
  return requetes;
}

function arbre() {
  return (
    <Routes>
      <Route path="/adherents/:id" element={<FicheAdherent />} />
      <Route path="/controles-dga" element={<EcranFileControleDga />} />
      <Route path="/controles-dga/:id" element={<EcranControleDga />} />
      <Route path="/frais-adhesion" element={<EcranFraisAdhesion />} />
      <Route path="/agents/:id" element={<FicheAgentTerrain />} />
    </Routes>
  );
}

const ATTENTE = { timeout: 4000 };

beforeEach(() => reinitialiserAdhesion());
afterEach(() => serveur.events.removeAllListeners());

describe("Parcours d'adhésion — fiche adhérent", () => {
  it("sépare le statut du compte et l'état du contrôle DGA", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1?onglet=adhesion" });

    expect(await screen.findByText("Parcours d'adhésion", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getAllByText("En attente de contrôle DGA").length).toBeGreaterThan(0);
    expect(screen.getByRole("list", { name: "Étapes du parcours d'adhésion" })).toBeInTheDocument();
    expect(screen.getByText("Encaissement validé")).toBeInTheDocument();
    expect(screen.getByText("Ateba Jean")).toBeInTheDocument();
  });

  it("bloque l'activation tant que le frais n'est pas enregistré, avec la condition du serveur", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=adhesion" });

    expect(await screen.findByText("Aucun frais d'adhésion enregistré", {}, ATTENTE)).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: "Vérifier et activer" }));
    const dialogue = await screen.findByRole("dialog");
    expect(await within(dialogue).findByText("Frais d'adhésion enregistré", {}, ATTENTE)).toBeInTheDocument();
    expect(within(dialogue).getByText(/Enregistrez le frais d'adhésion/)).toBeInTheDocument();
    expect(within(dialogue).getByRole("button", { name: "Activer et transmettre à la DGA" })).toBeDisabled();
  });

  it("enregistre le frais avec l'agent collecteur, puis active et transmet à la DGA", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=adhesion" });

    await utilisateur.click(await screen.findByRole("button", { name: "Enregistrer le frais" }, ATTENTE));
    const dialogue = await screen.findByRole("dialog");
    // Le montant attendu vient du serveur, jamais d'une constante de l'écran.
    expect(within(dialogue).getByText("1 000 FCFA")).toBeInTheDocument();
    await utilisateur.click(await within(dialogue).findByRole("combobox"));
    await utilisateur.click(within(await screen.findByRole("listbox")).getByText(/Ateba Jean/));
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Relire avant d'enregistrer" }));
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer le frais" }));

    await waitFor(() => expect(requetes.some((r) => r.chemin === "/api/v1/adherents/adh-2/frais-adhesion")).toBe(true), ATTENTE);
    const envoi = requetes.find((r) => r.chemin === "/api/v1/adherents/adh-2/frais-adhesion")!;
    expect(envoi.corps).toMatchObject({ agentId: "agent-1", montantRecu: 1000 });
    expect((envoi.corps as { cleIdempotence: string }).cleIdempotence).toBeTruthy();
    expect(await screen.findByText("Enregistré — à valider", {}, ATTENTE)).toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: "Vérifier et activer" }));
    const activation = await screen.findByRole("dialog");
    const bouton = await within(activation).findByRole("button", { name: "Activer et transmettre à la DGA" }, ATTENTE);
    await waitFor(() => expect(bouton).toBeEnabled());
    await utilisateur.click(bouton);
    await waitFor(() => expect(requetes.some((r) => r.chemin === "/api/v1/adherents/adh-2/activer")).toBe(true), ATTENTE);
    expect(await screen.findByText(/^CD-ctl-1\d\d$/, {}, ATTENTE)).toBeInTheDocument();
  });

  it("ne propose aucune action d'activation ni de frais à l'Agent de terrain", async () => {
    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=adhesion" });

    expect(await screen.findByText("Parcours d'adhésion", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vérifier et activer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enregistrer le frais" })).not.toBeInTheDocument();
  });
});

describe("Parcours d'adhésion — contrôle DGA", () => {
  it("affiche la file et le nombre de dossiers distincts calculé par le serveur", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/controles-dga" });

    expect(await screen.findByText("CD-ctl-1", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText("Dossiers distincts soumis")).toBeInTheDocument();
    expect(screen.getByText("Ateba Jean")).toBeInTheDocument();
  });

  it("démarre le contrôle, vérifie champ par champ et exige un motif pour une anomalie", { timeout: 30000 }, async () => {
    simulerSession(JETON_DGA);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/controles-dga/ctl-1" });

    await utilisateur.click(await screen.findByRole("button", { name: "Démarrer le contrôle" }, ATTENTE));
    await utilisateur.click(await screen.findByRole("button", { name: "Nom : correspond" }, ATTENTE));
    await waitFor(() => expect(requetes.some((r) => r.chemin.endsWith("/champs/ctl-1-ch-nom/verifier"))).toBe(true), ATTENTE);

    await utilisateur.click(screen.getByRole("button", { name: "Prénoms : autre résultat" }));
    const dialogue = await screen.findByRole("dialog");
    const enregistrer = within(dialogue).getByRole("button", { name: "Enregistrer la vérification" });
    // « Ne correspond pas » sans valeur lue ni commentaire : envoi impossible.
    expect(enregistrer).toBeDisabled();
    await utilisateur.type(within(dialogue).getByLabelText(/Valeur lue sur le document/), "Marie-Claire");
    await utilisateur.type(within(dialogue).getByLabelText(/Commentaire/), "Trait d'union sur la CNI.");
    await utilisateur.click(enregistrer);

    await waitFor(() => expect(screen.getAllByText("Ne correspond pas").length).toBeGreaterThan(0), ATTENTE);
    const verification = requetes.find((r) => r.chemin.endsWith("/champs/ctl-1-ch-prenoms/verifier"))!;
    expect(verification.corps).toMatchObject({ statutCorrespondance: "NON_CORRESPOND", valeurPhysique: "Marie-Claire" });

    // V21 : tant qu'une anomalie reste, le serveur renvoie `validable: false` et ses `blocages` — l'écran les affiche
    // et désactive « Valider » ; la demande de correction reste possible.
    expect(await screen.findByText(/information\(s\) en anomalie à traiter/, {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Valider le dossier" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Demander une correction" })).toBeEnabled();
  });

  it("n'ouvre pas le contrôle à celui qui a transmis le dossier", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/controles-dga/ctl-1" });

    expect(await screen.findByText("Contrôle CD-ctl-1", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Démarrer le contrôle" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /correspond/ })).not.toBeInTheDocument();
  });
});

describe("Parcours d'adhésion — frais et rapprochement", () => {
  it("présente le calcul « dossiers × unitaire = attendu » et l'écart, tels que renvoyés", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(arbre(), { routeInitiale: "/frais-adhesion" });

    expect(await screen.findByText("Rapprochement des frais d'adhésion", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText(/1 dossier\(s\) × 1 000 FCFA/)).toBeInTheDocument();
    expect(screen.getByText("Aucun écart")).toBeInTheDocument();
  });

  it("permet au DAF de valider un frais enregistré par un autre", async () => {
    simulerSession(JETON_DAF);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/frais-adhesion" });

    await utilisateur.click(await screen.findByRole("button", { name: "Valider l'encaissement" }, ATTENTE));
    const dialogue = await screen.findByRole("alertdialog");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Valider" }));
    await waitFor(() => expect(requetes.some((r) => r.chemin === "/api/v1/frais-adhesion/fa-2/valider")).toBe(true), ATTENTE);
  });

  it("masque la validation au Gestionnaire qui a enregistré le frais", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/frais-adhesion" });

    expect(await screen.findByText("FA-fa-2", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Valider l'encaissement" })).not.toBeInTheDocument();
  });

  it("rattache les frais à l'agent qui les a collectés, sur sa fiche", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-1" });

    expect(await screen.findByText("Frais d'adhésion collectés", {}, ATTENTE)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Voir le détail" }, ATTENTE)).toHaveAttribute("href", "/frais-adhesion?agent=agent-1");
    expect(await screen.findByText("Écart", {}, ATTENTE)).toBeInTheDocument();
  });
});
