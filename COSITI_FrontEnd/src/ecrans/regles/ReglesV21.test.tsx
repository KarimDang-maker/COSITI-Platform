import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { client } from "@/api/client";
import type { Document } from "@/api/documents";
import { reinitialiserV21 } from "@/test/msw/handlers.v21";
import { reinitialiserAdhesion } from "@/test/msw/handlers.adhesion";
import { JETON_DGA, JETON_GESTIONNAIRE, JETON_PCA } from "@/test/msw/donnees";
import { EcranRegles } from "@/ecrans/regles/EcranRegles";
import { FicheAdherent } from "@/ecrans/adherents/FicheAdherent";
import { EcranControleDga } from "@/ecrans/adhesion/EcranControleDga";

/**
 * V21 côté écran : règles à valider (PCA), checklist documentaire tirée de la matrice, remplacement motivé d'une
 * pièce, association choisie dans le référentiel, contrôle DGA piloté par `validable` / `blocages`.
 */

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

type Requete = { methode: string; chemin: string; recherche: string; corps: unknown };

function espionner() {
  const requetes: Requete[] = [];
  serveur.events.on("request:start", async ({ request }) => {
    if (request.method === "GET") return;
    const url = new URL(request.url);
    const requete: Requete = { methode: request.method, chemin: url.pathname, recherche: url.search, corps: undefined };
    requetes.push(requete);
    // Un corps multipart (téléversement) n'est pas relu : seuls les paramètres de requête comptent.
    if ((request.headers.get("Content-Type") ?? "").includes("application/json")) {
      requete.corps = JSON.parse(await request.clone().text());
    }
  });
  return requetes;
}

function arbre() {
  return (
    <Routes>
      <Route path="/regles" element={<EcranRegles />} />
      <Route path="/adherents/:id" element={<FicheAdherent />} />
      <Route path="/controles-dga/:id" element={<EcranControleDga />} />
    </Routes>
  );
}

const ATTENTE = { timeout: 4000 };

beforeEach(() => {
  reinitialiserV21();
  reinitialiserAdhesion();
});
afterEach(() => serveur.events.removeAllListeners());

describe("V23 — matrice documentaire (règles en attente réputées validées)", () => {
  it("affiche la matrice documentaire sans inventaire de règles provisoires ni confirmation", async () => {
    simulerSession(JETON_PCA);
    rendreAvecProviders(arbre(), { routeInitiale: "/regles" });

    expect(await screen.findByText("Justificatif de résidence", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText("Si l'adresse déclarée diffère de celle de la CNI", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("Règles provisoires")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Confirmer/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Modifier/ }).length).toBeGreaterThan(0);
  });

  it("laisse modifier une exigence documentaire avec un motif", async () => {
    simulerSession(JETON_PCA);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/regles" });

    await utilisateur.click(await screen.findByRole("button", { name: "Modifier Acte de naissance" }, ATTENTE));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.type(within(dialogue).getByLabelText(/Motif de la modification/), "Note COSITI 2026-12");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(requetes.some((r) => r.methode === "PUT" && r.chemin === "/api/v1/regles/exigences/ex-acte")).toBe(true), ATTENTE);
  });

  it("ne propose aucune modification sans la permission", async () => {
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/regles" });
    expect(await screen.findByText("Justificatif de résidence", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Modifier/ })).not.toBeInTheDocument();
  });
});

describe("V21 — checklist documentaire et pièces", () => {
  it("affiche la checklist tirée de la matrice, sans rappel de règle en attente", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1?onglet=documents" });

    const liste = await screen.findByRole("list", { name: "Checklist documentaire" }, ATTENTE);
    expect(within(liste).getByText("Acte de naissance")).toBeInTheDocument();
    expect(within(liste).getAllByText("Requise — non fournie").length).toBeGreaterThan(0);
    expect(screen.getByText("Aucune pièce ne bloque l'activation")).toBeInTheDocument();
    // V23 : plus aucune mention « règle en attente de confirmation ».
    expect(within(liste).queryByText(/Règle en attente de confirmation/)).not.toBeInTheDocument();
  });

  it("remplace une pièce avec un motif obligatoire, l'ancienne version étant conservée", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    // Sous jsdom, un `FormData` ne traverse pas le `fetch` de Node : l'envoi est observé à la couche client, qui est
    // l'unique point d'accès réseau (`api/client.ts`).
    const envois: string[] = [];
    const espion = vi.spyOn(client, "postFormulaire").mockImplementation(async (chemin: string) => {
      envois.push(chemin);
      return { id: "doc-v2", typeDocument: "CNI", nomFichierOriginal: "cni-v2.png", versionDocument: 2 } as unknown as Document;
    });
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1?onglet=documents" });

    await utilisateur.click(await screen.findByRole("button", { name: "Remplacer cni-recto.png" }, ATTENTE));
    const dialogue = await screen.findByRole("dialog");
    expect(within(dialogue).getByText(/Remplacer : Carte nationale d'identité/)).toBeInTheDocument();
    const fichier = new File(["x"], "cni-v2.png", { type: "image/png" });
    await utilisateur.upload(within(dialogue).getByLabelText("Fichier"), fichier);
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Remplacer la pièce" }));
    // Sans motif, rien n'est envoyé.
    expect(await within(dialogue).findByText(/Indiquez le motif du remplacement/)).toBeInTheDocument();
    expect(envois).toHaveLength(0);

    await utilisateur.type(within(dialogue).getByLabelText(/Motif du remplacement/), "Copie illisible");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Remplacer la pièce" }));
    await waitFor(() => expect(envois).toHaveLength(1), ATTENTE);
    const parametres = new URLSearchParams(envois[0]!.split("?")[1]);
    expect(parametres.get("type")).toBe("CNI");
    expect(parametres.get("remplaceDocumentId")).toBe("doc-nouveau");
    expect(parametres.get("motifRemplacement")).toBe("Copie illisible");
    expect(await screen.findByText(/l'ancienne est conservée/, {}, ATTENTE)).toBeInTheDocument();
    espion.mockRestore();
  });

  it("propose l'association dans le référentiel et l'enregistre", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    serveur.use(
      http.put("/api/v1/adherents/:id/professionnel", async ({ request }) => HttpResponse.json(await request.json())),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=professionnel" });

    await utilisateur.click(await screen.findByRole("button", { name: "Modifier" }, ATTENTE));
    const combos = await screen.findAllByRole("combobox");
    await utilisateur.click(combos[combos.length - 1]!);
    await utilisateur.click(within(await screen.findByRole("listbox")).getByText("Association des commerçants de Bonabéri"));
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(
      () => expect(requetes.find((r) => r.chemin === "/api/v1/adherents/adh-2/professionnel")?.corps).toMatchObject({ associationId: "assoc-1" }),
      ATTENTE,
    );
  });
});

describe("V21 — contrôle DGA", () => {
  it("désactive « Valider » et affiche les blocages renvoyés par le serveur ; « Non applicable » sans motif", { timeout: 30000 }, async () => {
    simulerSession(JETON_DGA);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/controles-dga/ctl-1" });

    await utilisateur.click(await screen.findByRole("button", { name: "Démarrer le contrôle" }, ATTENTE));
    expect(await screen.findByRole("button", { name: "Valider le dossier" }, ATTENTE)).toBeDisabled();
    expect(screen.getByText("Ce dossier ne peut pas encore être validé")).toBeInTheDocument();
    expect(screen.getByText(/information\(s\) non vérifiée\(s\)/)).toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: "Prénoms : autre résultat" }));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByLabelText("Non applicable"));
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer la vérification" }));
    await waitFor(() => expect(requetes.find((r) => r.chemin.endsWith("/champs/ctl-1-ch-prenoms/verifier"))?.corps).toMatchObject({ statutCorrespondance: "NON_APPLICABLE" }), ATTENTE);

    await utilisateur.click(await screen.findByRole("button", { name: "Nom : correspond" }, ATTENTE));
    await waitFor(() => expect(screen.getByRole("button", { name: "Valider le dossier" })).toBeEnabled(), ATTENTE);
  });

  it("propose au Gestionnaire de corriger et retransmettre quand la DGA demande une correction", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.get("/api/v1/controles-dga/:id", () =>
        HttpResponse.json({
          id: "ctl-1",
          reference: "CD-ctl-1",
          adherentId: "adh-1",
          adherentMatricule: "COSITI-00001",
          adherentNom: "NDONGO Marie Claire",
          tour: 1,
          controlePrecedentId: null,
          statut: "CORRECTION_DEMANDEE",
          soumisPar: "u-gc-1",
          soumisLe: "2026-10-01T08:00:00Z",
          demarrePar: "u-dga-1",
          demarreLe: "2026-10-01T09:00:00Z",
          terminePar: "u-dga-1",
          termineLe: "2026-10-01T10:00:00Z",
          commentaireDecision: "Le nom sur la CNI comporte un trait d'union.",
          compteurs: { documents: 1, documentsConformes: 0, documentsEnAnomalie: 1, champs: 2, champsVerifies: 2, champsConformes: 1, anomalies: 1, nonVerifiables: 0 },
          documents: [],
          validable: false,
          blocages: [],
          version: 3,
        }),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/controles-dga/ctl-1" });

    expect(await screen.findByText("Correction demandée par la DGA", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getAllByText("Le nom sur la CNI comporte un trait d'union.").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Corriger le dossier et retransmettre" })).toHaveAttribute("href", "/adherents/adh-1?onglet=adhesion");
  });
});
