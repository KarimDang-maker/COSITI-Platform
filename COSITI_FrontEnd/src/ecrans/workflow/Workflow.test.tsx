import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DAF, JETON_DGA, JETON_GESTIONNAIRE, JETON_PCA } from "@/test/msw/donnees";
import { EcranCentreValidation } from "@/ecrans/workflow/EcranCentreValidation";
import { FicheDemandeValidation } from "@/ecrans/workflow/FicheDemandeValidation";
import { FicheAdherent } from "@/ecrans/adherents/FicheAdherent";
import { FicheAgentTerrain } from "@/ecrans/agents/FicheAgentTerrain";
import { DetailPaiement } from "@/ecrans/cotisations/DetailPaiement";

/**
 * Workflow Maker–Checker V19 : centre de validation, décisions, séparation des tâches, correction et
 * resoumission, conflit de version, intégration dans les trois modules. Le simulacre (`handlers.workflow.ts`)
 * applique les mêmes règles que le serveur ; les tests s'enchaînent sur un jeu de demandes partagé, dans
 * l'ordre du fichier.
 */

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

type Requete = { methode: string; chemin: string; corps: unknown; cle: string | null };

function espionner() {
  const requetes: Requete[] = [];
  serveur.events.on("request:start", async ({ request }) => {
    if (request.method === "GET") return;
    const texte = await request.clone().text();
    requetes.push({
      methode: request.method,
      chemin: new URL(request.url).pathname,
      corps: texte ? JSON.parse(texte) : undefined,
      cle: request.headers.get("Idempotency-Key"),
    });
  });
  return requetes;
}

function arbre() {
  return (
    <Routes>
      <Route path="/validations" element={<EcranCentreValidation />} />
      <Route path="/validations/:id" element={<FicheDemandeValidation />} />
      <Route path="/adherents/:id" element={<FicheAdherent />} />
      <Route path="/agents/:id" element={<FicheAgentTerrain />} />
      <Route path="/cotisations/:id" element={<DetailPaiement />} />
    </Routes>
  );
}

const ATTENTE = { timeout: 4000 };

describe("Workflow — centre de validation", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("propose au validateur les demandes des autres, jamais les siennes (séparation des tâches)", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/validations" });

    expect(await screen.findByText("DV-000001", {}, ATTENTE)).toBeInTheDocument();
    // DV-000002 a été demandée par la DGA elle-même : absente de sa file.
    expect(screen.queryByText("DV-000002")).not.toBeInTheDocument();
    expect(screen.getByText("Modification d'adhérent")).toBeInTheDocument();
  });

  it("montre au demandeur ses demandes en cours, pas dans sa file à traiter", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/validations" });

    expect(await screen.findByText("Aucune demande en attente", {}, ATTENTE)).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("tab", { name: "Mes demandes" }));
    expect(await screen.findByText("DV-000001", {}, ATTENTE)).toBeInTheDocument();
  });
});

describe("Workflow — fiche d'une demande", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("distingue la valeur officielle actuelle de la valeur proposée (§15)", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/validations/dem-1" });

    expect(await screen.findByRole("columnheader", { name: "Valeur officielle actuelle" }, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Valeur proposée" })).toBeInTheDocument();
    expect(screen.getByText("6 77 00 09 37")).toBeInTheDocument();
    expect(screen.getByText("6 99 88 77 66")).toBeInTheDocument();
    expect(screen.getByText("Téléphone principal")).toBeInTheDocument();
  });

  it("interdit au demandeur de décider de sa propre demande, même habilité", async () => {
    // La DGA a AGENT:VALIDER, mais DV-000002 est sa propre demande.
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/validations/dem-2" });

    expect(await screen.findByRole("button", { name: "Approuver" }, ATTENTE)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rejeter" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler la demande" })).toBeInTheDocument();
  });

  it("explique l'absence d'action à un utilisateur sans autorité de validation", async () => {
    simulerSession(JETON_PCA);
    rendreAvecProviders(arbre(), { routeInitiale: "/validations/dem-1" });

    expect(await screen.findByText("Action non disponible", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approuver" })).not.toBeInTheDocument();
  });

  it("signale un conflit de version et propose de recharger (§34)", async () => {
    simulerSession(JETON_DGA);
    serveur.use(
      http.post("/api/v1/demandes-validation/:id/approuver", () =>
        HttpResponse.json(
          { code: "DEMANDE_VERSION_OBSOLETE", message: "La donnée a changé.", traceId: "t", avertissements: [] },
          { status: 409 },
        ),
      ),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/validations/dem-1" });

    await utilisateur.click(await screen.findByRole("button", { name: "Approuver" }, ATTENTE));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Approuver" }));

    expect(await within(dialogue).findByText("La donnée a été modifiée entre-temps")).toBeInTheDocument();
    expect(within(dialogue).getByRole("button", { name: "Recharger" })).toBeInTheDocument();
  });

  it("enchaîne correction demandée → resoumission corrigée → approbation, avec motif et clé d'idempotence", { timeout: 30000 }, async () => {
    const requetes = espionner();
    const utilisateur = userEvent.setup();

    // 1. La DGA demande une correction : motif obligatoire.
    simulerSession(JETON_DGA);
    const premier = rendreAvecProviders(arbre(), { routeInitiale: "/validations/dem-1" });
    await utilisateur.click(await screen.findByRole("button", { name: "Demander correction" }, ATTENTE));
    let dialogue = await screen.findByRole("dialog");
    const envoyer = within(dialogue).getByRole("button", { name: "Envoyer la demande de correction" });
    expect(envoyer).toBeDisabled();
    await utilisateur.type(within(dialogue).getByLabelText(/Informations à corriger/), "Le numéro doit être vérifié.");
    await utilisateur.click(envoyer);
    await waitFor(() =>
      expect(requetes.find((r) => r.chemin === "/api/v1/demandes-validation/dem-1/demander-correction")?.corps).toMatchObject({
        commentaire: "Le numéro doit être vérifié.",
      }),
    );
    expect(requetes.find((r) => r.chemin.endsWith("/demander-correction"))?.cle).toMatch(/^[0-9a-f-]{36}$/i);
    premier.unmount();

    // 2. Le Gestionnaire (demandeur) corrige la valeur proposée et resoumet.
    simulerSession(JETON_GESTIONNAIRE);
    const second = rendreAvecProviders(arbre(), { routeInitiale: "/validations/dem-1" });
    expect(await screen.findByText("Le numéro doit être vérifié.", {}, ATTENTE)).toBeInTheDocument();
    const champ = screen.getByLabelText("Téléphone principal");
    await utilisateur.clear(champ);
    await utilisateur.type(champ, "699887700");
    await utilisateur.click(screen.getByRole("button", { name: "Resoumettre" }));
    dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Resoumettre" }));
    await waitFor(() =>
      expect(requetes.find((r) => r.chemin === "/api/v1/demandes-validation/dem-1/resoumettre")?.corps).toMatchObject({
        elements: [{ champ: "telephonePrincipal", valeurProposee: "699887700" }],
      }),
    );
    second.unmount();

    // 3. La DGA approuve : la modification devient officielle.
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/validations/dem-1" });
    await utilisateur.click(await screen.findByRole("button", { name: "Approuver" }, ATTENTE));
    dialogue = await screen.findByRole("dialog");
    expect(within(dialogue).getByText("6 99 88 77 00")).toBeInTheDocument();
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Approuver" }));
    expect(await screen.findByText(/DV-000001 approuvée : la modification est appliquée/)).toBeInTheDocument();
  });
});

describe("Workflow — intégration dans les modules", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("remplace la modification directe d'un dossier validé par une demande, motif obligatoire (adhérents)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1" });

    expect(await screen.findByText("Validé — officiel", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Modifier l'identité/ })).not.toBeInTheDocument();
    await utilisateur.click(screen.getAllByRole("button", { name: /Demander une modification/ })[0]!);

    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByLabelText("Ville"));
    const ville = within(dialogue).getByLabelText("Valeur proposée — Ville");
    await utilisateur.clear(ville);
    await utilisateur.type(ville, "Édéa");
    const relire = within(dialogue).getByRole("button", { name: "Relire la demande" });
    expect(relire).toBeDisabled(); // motif manquant
    await utilisateur.type(within(dialogue).getByLabelText(/Motif de la demande/), "Déménagement");
    await utilisateur.click(relire);
    expect(within(dialogue).getByText(/restent en vigueur jusqu'à la décision/)).toBeInTheDocument();
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Soumettre pour validation" }));

    await waitFor(() =>
      expect(requetes.find((r) => r.chemin === "/api/v1/adherents/adh-1/demandes-modification")?.corps).toMatchObject({
        motif: "Déménagement",
        elements: [{ champ: "ville", valeurProposee: "Édéa" }],
        versionBase: 3,
      }),
    );
    expect(requetes.some((r) => r.methode === "PUT")).toBe(false);
  });

  it("verrouille un dossier en attente et l'affiche en toutes lettres", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1" });

    // La demande créée au test précédent est en attente : bandeau explicite, lien vers la demande.
    expect(await screen.findByText(/En attente de validation — DV-/, {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ouvrir la demande DV-/ })).toBeInTheDocument();
  });

  it("officialise un dossier en brouillon par le parcours d'adhésion, jamais par la soumission générique (V20)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    // `POST /adherents/{id}/soumettre` est refusé depuis V20 (ADHERENT_VALIDATION_PAR_CONTROLE_DGA) : non proposé.
    await utilisateur.click(await screen.findByRole("button", { name: "Ouvrir le parcours d'adhésion" }, ATTENTE));
    expect(screen.queryByRole("button", { name: "Soumettre pour validation" })).not.toBeInTheDocument();
    expect(await screen.findByText("Parcours d'adhésion", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Adhésion" })).toHaveAttribute("aria-selected", "true");
    expect(requetes.some((r) => r.chemin === "/api/v1/adherents/adh-2/soumettre")).toBe(false);
  });

  it("protège un profil d'agent validé : modification et réactivation par demande (agents)", async () => {
    simulerSession(JETON_DGA);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-3" });

    expect(await screen.findByRole("button", { name: /Demander la réactivation/ }, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Réactiver$/ })).not.toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: /Demander la réactivation/ }));
    const dialogue = await screen.findByRole("alertdialog");
    expect(dialogue).toHaveTextContent(/Le statut officiel reste Inactif jusqu'à la validation/);
    await utilisateur.type(within(dialogue).getByLabelText("Motif de la demande"), "Retour de congé");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Soumettre la demande" }));

    await waitFor(() =>
      expect(requetes.find((r) => r.chemin === "/api/v1/agents/agent-3/demandes-changement-statut")?.corps).toMatchObject({
        actif: true,
        motif: "Retour de congé",
        versionBase: 4,
      }),
    );
  });

  it("laisse modifier directement un profil d'agent en brouillon et propose sa soumission", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/agents/agent-2" });

    expect(await screen.findByRole("button", { name: "Modifier" }, ATTENTE)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Soumettre pour validation" }, ATTENTE)).toBeInTheDocument();
  });

  it("bloque la validation financière tant qu'une correction est en cours (cotisations)", async () => {
    // Le Gestionnaire (PAIEMENT:CREER) demande une correction de pai-1…
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    const premier = rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-1" });
    await utilisateur.click(await screen.findByRole("button", { name: "Demander une correction" }, ATTENTE));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByLabelText("Date du paiement"));
    await utilisateur.type(within(dialogue).getByLabelText(/Motif de la demande/), "Date mal saisie");
    const date = within(dialogue).getByLabelText("Valeur proposée — Date du paiement");
    await utilisateur.clear(date);
    await utilisateur.type(date, "2026-09-02");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Relire la demande" }));
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Soumettre pour validation" }));
    expect(await screen.findByText(/soumise : en attente de validation/, {}, ATTENTE)).toBeInTheDocument();
    premier.unmount();

    // … le DAF voit la demande et ne peut plus valider la cotisation avant de l'avoir traitée.
    simulerSession(JETON_DAF);
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-1" });
    expect(await screen.findByText(/En attente de validation — DV-/, {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Valider" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Demander une correction" })).not.toBeInTheDocument();
  });

  it("met la correction de cotisation dans la file du DAF, avec le montant comparé", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(arbre(), { routeInitiale: "/validations?typeEntite=PAIEMENT" });

    expect(await screen.findByText("Correction de cotisation", {}, ATTENTE)).toBeInTheDocument();
  });
});
