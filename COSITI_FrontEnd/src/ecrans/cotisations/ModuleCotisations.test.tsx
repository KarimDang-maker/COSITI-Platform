import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_DAF, JETON_GESTIONNAIRE, JETON_PCA } from "@/test/msw/donnees";
import { JournalCotisations } from "@/ecrans/cotisations/JournalCotisations";
import { DetailPaiement } from "@/ecrans/cotisations/DetailPaiement";
import { NouveauPaiement } from "@/ecrans/cotisations/NouveauPaiement";
import { EcranBilanCaisse } from "@/ecrans/cotisations/EcranBilanCaisse";

/**
 * Module « Gestion des cotisations » (36 fonctionnalités) : journal, fiche, saisie, bilan de caisse.
 * Fichier séparé des tests J4/J5 : le jeu `PAIEMENTS_TEST` est modifié par les mutations, et chaque
 * fichier de test repart d'un module neuf.
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

const derniere = (requetes: Requete[], chemin: string, methode = "GET") =>
  [...requetes].reverse().find((r) => r.methode === methode && r.url.pathname === chemin);

function arbre() {
  return (
    <Routes>
      <Route path="/cotisations" element={<JournalCotisations />} />
      <Route path="/cotisations/nouveau" element={<NouveauPaiement />} />
      <Route path="/cotisations/:id" element={<DetailPaiement />} />
      <Route path="/bilans-caisse" element={<EcranBilanCaisse />} />
    </Routes>
  );
}

const ATTENTE = { timeout: 4000 };

describe("Module cotisations — journal", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("affiche l'identité de l'adhérent de chaque paiement et recherche par matricule côté serveur (#1, #3)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations" });

    expect((await screen.findAllByText("NDONGO Marie Claire", {}, ATTENTE)).length).toBeGreaterThan(0);

    await utilisateur.type(screen.getByLabelText("Matricule de l'adhérent"), "cositi-00002");
    await waitFor(() => expect(derniere(requetes, "/api/v1/paiements")?.url.searchParams.get("adherentMatricule")).toBe("COSITI-00002"), ATTENTE);
    await waitFor(() => expect(screen.queryByText("REC-000001")).not.toBeInTheDocument(), ATTENTE);
    expect(screen.getByText("REC-000002")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirer le filtre Matricule : COSITI-00002" })).toBeInTheDocument();
  });

  it("trie avec la liste blanche du serveur (#1)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations" });

    await screen.findByText("REC-000001", {}, ATTENTE);
    await utilisateur.click(screen.getByRole("columnheader", { name: /Montant/ }));
    await waitFor(() => expect(derniere(requetes, "/api/v1/paiements")?.url.searchParams.get("tri")).toBe("MONTANT"));
    expect(screen.getByText("REC-000001")).toBeInTheDocument();
  });

  it("n'envoie pas une période inversée et l'explique (#7)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations?dateDu=2026-09-20&dateAu=2026-09-01" });

    expect(await screen.findByText(/La date de début doit précéder la date de fin/)).toBeInTheDocument();
    await screen.findByText("REC-000001", {}, ATTENTE);
    expect(derniere(requetes, "/api/v1/paiements")?.url.searchParams.get("dateDu")).toBeNull();
  });

  it("filtre par agent et renvoie vers ses statistiques (#4, #28)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations?agentId=agent-1" });

    const lien = await screen.findByRole("link", { name: /Voir la synthèse des cotisations de Ateba Jean/ }, ATTENTE);
    expect(lien).toHaveAttribute("href", "/agents/agent-1");
    expect(await screen.findByText("REC-000001")).toBeInTheDocument();
    expect(screen.queryByText("REC-000004")).not.toBeInTheDocument();
  });

  it("propose l'export au DAF avec les critères appliqués, jamais à l'Agent (#34)", async () => {
    simulerSession(JETON_DAF);
    const utilisateur = userEvent.setup();
    const { unmount } = rendreAvecProviders(arbre(), { routeInitiale: "/cotisations?statut=VALIDE&modePaiement=ESPECES" });

    await utilisateur.click(await screen.findByRole("button", { name: /Exporter \(CSV\)/ }, ATTENTE));
    const dialogue = await screen.findByRole("alertdialog");
    expect(dialogue).toHaveTextContent("Validé");
    expect(dialogue).toHaveTextContent(/Mode : Espèces\) ne sont pas pris en charge/);
    unmount();

    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations" });
    await screen.findByText("REC-000001", {}, ATTENTE);
    expect(screen.queryByRole("button", { name: /Exporter/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nouveau paiement/ })).toBeInTheDocument();
  });

  it("affiche les statistiques du jour avec leur date de référence (#27)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations" });

    await utilisateur.click(await screen.findByRole("tab", { name: "Statistiques du jour" }));
    expect(await screen.findByText("19 800 FCFA", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText(/^Statistiques du/, { selector: "p" })).toHaveTextContent(/Statistiques du .+ \d{4}/);
    expect(screen.getByText("Par statut")).toBeInTheDocument();
    expect(screen.getByText("Par mode de paiement")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Date de référence"), { target: { value: "2026-01-01" } });
    expect(await screen.findByText("Aucun paiement enregistré ce jour", {}, ATTENTE)).toBeInTheDocument();
  });
});

describe("Module cotisations — fiche", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("laisse l'auteur d'un brouillon le modifier puis le soumettre au contrôle (#14, #19)", async () => {
    simulerSession(JETON_AGENT);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-3" });

    expect(await screen.findByText(/pas encore dans la file de contrôle/, {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Modifier" })).toBeInTheDocument();
    // L'Agent n'a ni validation ni rejet.
    expect(screen.queryByRole("button", { name: "Valider" })).not.toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: "Soumettre au contrôle" }));
    const dialogue = await screen.findByRole("alertdialog");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Soumettre" }));

    await waitFor(() => expect(derniere(requetes, "/api/v1/paiements/pai-3/soumettre", "POST")).toBeTruthy());
    expect(await screen.findByText("Paiement soumis au contrôle.")).toBeInTheDocument();
  });

  it("rejette un paiement avec motif obligatoire (#17)", async () => {
    simulerSession(JETON_DAF);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-1" });

    await utilisateur.click(await screen.findByRole("button", { name: "Rejeter" }, ATTENTE));
    const dialogue = await screen.findByRole("alertdialog");
    const confirmer = within(dialogue).getByRole("button", { name: "Rejeter le paiement" });
    expect(confirmer).toBeDisabled();
    await utilisateur.type(within(dialogue).getByLabelText("Motif du rejet"), "Montant non conforme au reçu");
    await utilisateur.click(confirmer);

    await waitFor(() =>
      expect(derniere(requetes, "/api/v1/paiements/pai-1/rejeter", "POST")?.corps).toEqual({ motif: "Montant non conforme au reçu" }),
    );
  });

  it("affiche le motif d'un rejet et ne propose plus aucune décision (#17, #18)", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-4" });

    expect(await screen.findByText("Paiement rejeté", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText("Reçu papier illisible, montant non vérifiable.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Valider" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rejeter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
    // Historique des statuts (#18).
    expect(await screen.findByText("Saisie")).toBeInTheDocument();
  });

  it("corrige une cotisation soumise par une demande, valeur officielle inchangée jusqu'à décision (#19, workflow V19)", async () => {
    simulerSession(JETON_DAF);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-2" });

    // Plus de correction directe d'une cotisation soumise : le serveur la refuse (PAIEMENT_CORRECTION_PAR_DEMANDE).
    await utilisateur.click(await screen.findByRole("button", { name: "Demander une correction" }, ATTENTE));
    expect(screen.queryByRole("button", { name: "Corriger" })).not.toBeInTheDocument();
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByLabelText("Montant"));
    const montant = within(dialogue).getByLabelText("Valeur proposée — Montant");
    await utilisateur.clear(montant);
    await utilisateur.type(montant, "7500");
    await utilisateur.type(within(dialogue).getByLabelText(/Motif de la demande/), "Erreur de saisie");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Relire la demande" }));

    expect(within(dialogue).getByText(/Valeur officielle actuelle/)).toBeInTheDocument();
    expect(within(dialogue).getByText("7 500 FCFA")).toBeInTheDocument();
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Soumettre pour validation" }));

    await waitFor(() =>
      expect(derniere(requetes, "/api/v1/paiements/pai-2/demandes-correction", "POST")?.corps).toMatchObject({
        motif: "Erreur de saisie",
        elements: [{ champ: "montant", valeurProposee: "7500" }],
        versionBase: 0,
      }),
    );
    expect(derniere(requetes, "/api/v1/paiements/pai-2/corriger", "POST")).toBeUndefined();
    expect(await screen.findByText(/soumise : en attente de validation/)).toBeInTheDocument();
  });

  it("résume les cotisations de l'adhérent à partir du serveur (#20 à #23, #26)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/pai-2" });

    expect(await screen.findByText("Cotisations de l'adhérent", {}, ATTENTE)).toBeInTheDocument();
    expect(await screen.findByText("9 000 FCFA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /1\s400/ })).toHaveAttribute("href", "/cotisations?adherentId=adh-2&statut=A_CONTROLER");
    expect(screen.getByText("86 %")).toBeInTheDocument();
    expect(screen.getByText("Seuil non atteint")).toBeInTheDocument();
  });
});

describe("Module cotisations — saisie", () => {
  afterEach(() => serveur.events.removeAllListeners());

  /** V22 : la saisie commence par la recherche de l'adhérent par matricule. */
  async function choisirAdherent(utilisateur: ReturnType<typeof userEvent.setup>, matricule = "COSITI-00001") {
    await utilisateur.type(await screen.findByLabelText(/^Matricule COSITI/, {}, ATTENTE), matricule);
    await utilisateur.click(screen.getByRole("button", { name: "Rechercher" }));
    await utilisateur.click(await screen.findByRole("button", { name: "Saisir la cotisation de cet adhérent" }, ATTENTE));
  }

  async function remplir(
    utilisateur: ReturnType<typeof userEvent.setup>,
    date: string,
    montant: string,
    ss: string,
    ep: string,
    mode: string,
    reference?: string,
  ) {
    await choisirAdherent(utilisateur);
    await utilisateur.type(await screen.findByLabelText(/^Date du paiement/), date);
    await utilisateur.type(screen.getByLabelText(/^Montant total/), montant);
    await utilisateur.type(screen.getByLabelText(/^Sécurité Sociale/), ss);
    await utilisateur.type(screen.getByLabelText(/^Épargne/), ep);
    await utilisateur.click(screen.getAllByRole("combobox")[0]!);
    await utilisateur.click(await screen.findByRole("option", { name: mode }));
    if (reference) await utilisateur.type(screen.getByLabelText(/Référence de transaction/), reference);
  }

  /** Envoi en deux temps : « Vérifier et enregistrer », puis confirmation du récapitulatif. */
  async function confirmer(utilisateur: ReturnType<typeof userEvent.setup>) {
    await utilisateur.click(screen.getByRole("button", { name: "Vérifier et enregistrer" }));
    const recap = await screen.findByRole("alertdialog", {}, ATTENTE);
    await utilisateur.click(within(recap).getByRole("button", { name: "Enregistrer la cotisation" }));
  }

  it("identifie l'adhérent par son matricule avant l'envoi (#12, V22)", async () => {
    simulerSession(JETON_AGENT);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await utilisateur.type(await screen.findByLabelText(/^Matricule COSITI/, {}, ATTENTE), "cositi 1");
    await utilisateur.click(screen.getByRole("button", { name: "Rechercher" }));
    const resume = await screen.findByLabelText("Adhérent sélectionné", {}, ATTENTE);
    expect(within(resume).getByText("NDONGO Marie Claire")).toBeInTheDocument();
    expect(within(resume).getByText("COSITI-00001")).toBeInTheDocument();
  });

  it("signale un matricule introuvable", async () => {
    simulerSession(JETON_AGENT);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await utilisateur.type(await screen.findByLabelText(/^Matricule COSITI/, {}, ATTENTE), "COSITI-09999");
    await utilisateur.click(screen.getByRole("button", { name: "Rechercher" }));
    expect(await screen.findByText("Adhérent introuvable", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Saisir la cotisation de cet adhérent" })).not.toBeInTheDocument();
  });

  it("contrôle la répartition : minimum 700, minimum 300, total = somme (V22)", async () => {
    simulerSession(JETON_AGENT);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await remplir(utilisateur, "2026-09-20", "1000", "600", "100", "Espèces");
    await utilisateur.click(screen.getByRole("button", { name: "Vérifier et enregistrer" }));
    expect(await screen.findByText(/Sécurité Sociale doit être au minimum de 700/)).toBeInTheDocument();
    expect(screen.getByText(/Épargne doit être au minimum de 300/)).toBeInTheDocument();

    await utilisateur.clear(screen.getByLabelText(/^Sécurité Sociale/));
    await utilisateur.type(screen.getByLabelText(/^Sécurité Sociale/), "700");
    await utilisateur.clear(screen.getByLabelText(/^Épargne/));
    await utilisateur.type(screen.getByLabelText(/^Épargne/), "500");
    await utilisateur.click(screen.getByRole("button", { name: "Vérifier et enregistrer" }));
    expect(await screen.findByText("La répartition doit correspondre au montant total de la cotisation.")).toBeInTheDocument();
    expect(derniere(requetes, "/api/v1/paiements", "POST")).toBeUndefined();
  });

  it("récapitule puis enregistre une seule fois, et affiche le statut renvoyé par le serveur (V22)", async () => {
    simulerSession(JETON_AGENT);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await remplir(utilisateur, "2026-09-21", "1500", "700", "800", "Espèces");
    await utilisateur.click(screen.getByRole("button", { name: "Vérifier et enregistrer" }));
    const recap = await screen.findByRole("alertdialog", {}, ATTENTE);
    expect(within(recap).getByText("NDONGO Marie Claire", { exact: false })).toBeInTheDocument();
    expect(within(recap).getByLabelText("Récapitulatif de la cotisation")).toHaveTextContent(/1\s500/);
    const bouton = within(recap).getByRole("button", { name: "Enregistrer la cotisation" });
    await utilisateur.dblClick(bouton);

    await waitFor(() => expect(derniere(requetes, "/api/v1/paiements", "POST")).toBeTruthy(), ATTENTE);
    expect(requetes.filter((r) => r.methode === "POST" && r.url.pathname === "/api/v1/paiements")).toHaveLength(1);
    expect(derniere(requetes, "/api/v1/paiements", "POST")?.corps).toMatchObject({ montant: 1500, montantSecuriteSociale: 700, montantEpargne: 800 });
    // « En attente de contrôle », jamais « Validée » parce que la requête a réussi.
    expect(await screen.findByText(/statut : À contrôler/, {}, ATTENTE)).toBeInTheDocument();
  });

  it("exige le pack à la première cotisation d'un adhérent sans adhésion (V22)", async () => {
    simulerSession(JETON_AGENT);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await choisirAdherent(utilisateur, "COSITI-00002");
    expect(await screen.findByText("aucun pack encore choisi", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Pack de cotisation/)).toBeInTheDocument();
    await utilisateur.type(screen.getByLabelText(/^Date du paiement/), "2026-09-23");
    await utilisateur.type(screen.getByLabelText(/^Montant total/), "1000");
    await utilisateur.type(screen.getByLabelText(/^Sécurité Sociale/), "700");
    await utilisateur.type(screen.getByLabelText(/^Épargne/), "300");
    // Pack (SelectRecherche) puis mode de paiement (Select) : le mode est le deuxième combobox.
    await utilisateur.click(screen.getAllByRole("combobox")[1]!);
    await utilisateur.click(await screen.findByRole("option", { name: "Espèces" }));
    await utilisateur.click(screen.getByRole("button", { name: "Vérifier et enregistrer" }));
    expect(await screen.findByText(/choisissez son pack de cotisation/)).toBeInTheDocument();
  });

  it("affiche le refus du serveur sans le masquer", async () => {
    simulerSession(JETON_AGENT);
    serveur.use(
      http.post("/api/v1/paiements", () =>
        HttpResponse.json({ code: "ERREUR_INTERNE", message: "Le service est momentanément indisponible.", traceId: "t", avertissements: [] }, { status: 503 }),
      ),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await remplir(utilisateur, "2026-09-22", "1000", "700", "300", "Espèces");
    await confirmer(utilisateur);
    expect(await screen.findByText("Cotisation non enregistrée", {}, ATTENTE)).toBeInTheDocument();
  });

  it("signale un paiement similaire du serveur et n'enregistre qu'après confirmation (#13)", async () => {
    simulerSession(JETON_AGENT);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    serveur.use(
      http.post("/api/v1/paiements/verifier-doublon", () =>
        HttpResponse.json({
          referenceDejaUtilisee: false,
          doublonsPotentiels: [
            {
              id: "pai-similaire",
              adherentId: "adh-1",
              numeroRecu: "REC-000321",
              datePaiement: "2026-09-01",
              montant: 5000,
              modePaiement: "ESPECES",
              referenceTransaction: null,
              typePaiement: "COTISATION",
              agentEncaisseurId: null,
              statut: "A_CONTROLER",
              validePar: null,
              confirmeParChefId: null,
              confirmeLe: null,
              motifIncoherence: null,
              version: 0,
            },
          ],
          doublonDetecte: true,
        }),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await remplir(utilisateur, "2026-09-01", "5000", "700", "4300", "Espèces");
    await confirmer(utilisateur);

    await waitFor(() => expect(screen.getByText("REC-000321")).toBeInTheDocument(), ATTENTE);
    const dialogue = screen.getByRole("alertdialog");
    expect(derniere(requetes, "/api/v1/paiements", "POST")).toBeUndefined();

    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer quand même" }));
    await waitFor(() => expect(derniere(requetes, "/api/v1/paiements", "POST")).toBeTruthy());
  });

  it("bloque une référence de transaction déjà utilisée, sans rien envoyer (#13)", async () => {
    simulerSession(JETON_AGENT);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await remplir(utilisateur, "2026-09-15", "2100", "700", "1400", "MTN MoMo", "MP260910.1432");
    await confirmer(utilisateur);

    expect(await screen.findByText(/Cette référence de transaction est déjà enregistrée/, {}, ATTENTE)).toBeInTheDocument();
    expect(derniere(requetes, "/api/v1/paiements", "POST")).toBeUndefined();
  });

  it("enregistre un brouillon avec la clé d'idempotence (#14, #35)", async () => {
    simulerSession(JETON_AGENT);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    let cle: string | null = null;
    serveur.events.on("request:start", ({ request }) => {
      if (request.method === "POST" && new URL(request.url).pathname === "/api/v1/paiements") cle = request.headers.get("Idempotency-Key");
    });
    rendreAvecProviders(arbre(), { routeInitiale: "/cotisations/nouveau" });

    await remplir(utilisateur, "2026-09-16", "1500", "700", "800", "Espèces");
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer comme brouillon" }));
    const recap = await screen.findByRole("alertdialog", {}, ATTENTE);
    await utilisateur.click(within(recap).getByRole("button", { name: "Enregistrer le brouillon" }));

    await waitFor(() => expect(derniere(requetes, "/api/v1/paiements", "POST")?.url.searchParams.get("brouillon")).toBe("true"), ATTENTE);
    expect(cle).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await screen.findByText(/statut : Brouillon/)).toBeInTheDocument();
  });
});

describe("Module cotisations — bilan de caisse", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("fait saisir puis relire le montant physique avant l'envoi (#29, #30)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/bilans-caisse?date=2026-09-29" });

    expect(await screen.findByText("À retrouver en caisse", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText(/BILAN_CAISSE_MODES_NUMERIQUE/)).toBeInTheDocument();
    expect(screen.getByText("Aucun montant physique saisi pour cette date")).toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: "Saisir la caisse physique" }));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.type(within(dialogue).getByLabelText(/Montant compté/), "11800");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Relire avant d'enregistrer" }));
    expect(within(dialogue).getByText("11 800 FCFA")).toBeInTheDocument();
    expect(within(dialogue).getByText("12 000 FCFA")).toBeInTheDocument();
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer le montant" }));

    await waitFor(() =>
      expect(derniere(requetes, "/api/v1/bilans-caisse", "POST")?.corps).toEqual({ date: "2026-09-29", montantPhysique: 11800 }),
    );
  });

  it("montre l'écart en toutes lettres et laisse le DAF valider avec la version lue (#31, #32)", async () => {
    simulerSession(JETON_DAF);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/bilans-caisse?date=2026-09-28" });

    expect(await screen.findByText("Manque en caisse", {}, ATTENTE)).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: "Valider le bilan" }));
    const dialogue = await screen.findByRole("dialog");
    expect(within(dialogue).getByText("11 500 FCFA")).toBeInTheDocument();
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Valider le bilan" }));

    await waitFor(() => expect(derniere(requetes, "/api/v1/bilans-caisse/2026-09-28/valider", "POST")?.url.searchParams.get("version")).toBe("0"));
  });

  it("réserve la décision au DAF : ni le Gestionnaire auteur ni le PCA ne valident (#32, #33)", async () => {
    simulerSession(JETON_PCA);
    const { unmount } = rendreAvecProviders(arbre(), { routeInitiale: "/bilans-caisse?date=2026-09-27" });
    expect(await screen.findByText("Aucun montant physique saisi pour cette date", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Saisir la caisse/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Valider le bilan" })).not.toBeInTheDocument();
    unmount();

    // Le Gestionnaire saisit, il ne décide jamais (BILAN_CAISSE:VALIDER réservée au DAF).
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/bilans-caisse?date=2026-09-28" });
    expect(await screen.findByText("Rapprochement de caisse", {}, ATTENTE)).toBeInTheDocument();
    await screen.findByText(/Saisi par gestionnaire\.test/, {}, ATTENTE);
    expect(screen.queryByRole("button", { name: "Valider le bilan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Signaler une anomalie" })).not.toBeInTheDocument();
  });

  it("fait signaler une anomalie avec description obligatoire (#33)", async () => {
    simulerSession(JETON_DAF);
    const requetes = espionner();
    const utilisateur = userEvent.setup();
    serveur.use(
      http.get("/api/v1/paiements/bilan-journalier", () =>
        HttpResponse.json({
          date: "2026-09-25",
          nombrePaiements: 1,
          montantTotalEnregistre: 700,
          montantNumerique: 700,
          nombrePaiementsNumerique: 1,
          parMode: {},
          modesNumerique: ["ESPECES"],
          statutsInclus: ["VALIDE"],
          rapprochement: {
            id: "bil-25",
            date: "2026-09-25",
            montantNumerique: 700,
            montantPhysique: 1000,
            ecart: 300,
            nombrePaiements: 1,
            statut: "SAISI",
            commentaire: null,
            saisiPar: "u-gc-1",
            creePar: "gestionnaire.test",
            creeLe: null,
            validePar: null,
            valideLe: null,
            commentaireValidation: null,
            motifAnomalie: null,
            signalePar: null,
            signaleLe: null,
            montantNumeriqueActuel: 900,
            numeriqueModifieDepuisSaisie: true,
            version: 2,
          },
          avertissements: [],
        }),
      ),
      http.post("/api/v1/bilans-caisse/:date/anomalie", () => HttpResponse.json({})),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/bilans-caisse?date=2026-09-25" });

    expect(await screen.findByText("Excédent en caisse", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText("Des paiements ont changé depuis la saisie")).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: "Signaler une anomalie" }));
    const dialogue = await screen.findByRole("alertdialog");
    const confirmer = within(dialogue).getByRole("button", { name: "Signaler l'anomalie" });
    expect(confirmer).toBeDisabled();
    await utilisateur.type(within(dialogue).getByLabelText("Description de l'anomalie"), "Billets manquants");
    await utilisateur.click(confirmer);
    await waitFor(() =>
      expect(derniere(requetes, "/api/v1/bilans-caisse/2026-09-25/anomalie", "POST")?.corps).toEqual({ motif: "Billets manquants" }),
    );
  });
});
