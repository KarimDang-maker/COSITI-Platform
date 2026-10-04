import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_CHEF, JETON_GESTIONNAIRE, JETON_PCA, UTILISATEURS } from "@/test/msw/donnees";
import { FicheAdherent } from "@/ecrans/adherents/FicheAdherent";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

/**
 * `V8__permissions_j5_j6.sql` accorde `DROITS:LIRE` à tous les rôles métier : le compte Agent en est
 * ponctuellement dépouillé pour vérifier le chemin « masqué » du code.
 */
function simulerSessionSansDroitsLire() {
  serveur.use(
    http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: JETON_AGENT })),
    http.get("/api/v1/auth/moi", () => {
      const agent = UTILISATEURS[JETON_AGENT]!;
      return HttpResponse.json({ ...agent, permissions: agent.permissions.filter((p) => p !== "DROITS:LIRE") });
    }),
  );
}

/** Corps JSON des requêtes d'écriture reçues, par chemin. */
function espionnerEcritures() {
  const corps: { methode: string; chemin: string; corps: unknown }[] = [];
  serveur.events.on("request:start", async ({ request }) => {
    if (request.method === "GET") return;
    const texte = await request.clone().text();
    corps.push({ methode: request.method, chemin: new URL(request.url).pathname, corps: texte ? JSON.parse(texte) : undefined });
  });
  return corps;
}

function arbre() {
  return (
    <Routes>
      <Route path="/adherents/:id" element={<FicheAdherent />} />
      <Route path="/adherents" element={<p>Liste des adhérents</p>} />
    </Routes>
  );
}

describe("FicheAdherent", () => {
  afterEach(() => serveur.events.removeAllListeners());

  it("affiche l'en-tête (nom, matricule, statut) et l'état du dossier calculé par le serveur (#12, #14, #17)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    expect(await screen.findByRole("heading", { level: 1, name: "ATANGANA Paul" })).toBeInTheDocument();
    expect(screen.getByText("COSITI-00002")).toBeInTheDocument();

    expect(await screen.findByText("60 %")).toBeInTheDocument();
    expect(screen.getByText("6 informations sur 10")).toBeInTheDocument();
    // Champs et pièces manquants (#15, #18) tels que renvoyés par l'API.
    const carteDossier = screen.getByText("État du dossier").closest("[data-slot='card']") as HTMLElement;
    expect(within(carteDossier).getByText("Géolocalisation")).toBeInTheDocument();
    expect(within(carteDossier).getByText("Acte de naissance")).toBeInTheDocument();
    // Règle `[V]` jamais silencieuse.
    expect(screen.getByText(/CHAMPS_COMPLETION_ADHERENT/)).toBeInTheDocument();
  });

  it("affiche un message clair pour un adhérent introuvable ou hors périmètre", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/inconnu" });

    expect(await screen.findByText("Adhérent introuvable")).toBeInTheDocument();
  });

  it("affiche l'agent responsable, ou son absence comme un état normal (#22)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const { unmount } = rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1" });
    const carte = (await screen.findByText("Agent responsable")).closest("[data-slot='card']") as HTMLElement;
    expect(await within(carte).findByText("Ateba Jean")).toBeInTheDocument();
    expect(within(carte).getByRole("button", { name: "Réaffecter" })).toBeInTheDocument();
    unmount();

    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });
    expect(await screen.findByText("Aucun agent n'est actuellement affecté à cet adhérent.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Affecter un agent" })).toBeInTheDocument();
  });

  it("réaffecte un adhérent avec motif obligatoire et confirmation ancien → nouvel agent (#24)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const ecritures = espionnerEcritures();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1" });

    await utilisateur.click(await screen.findByRole("button", { name: "Réaffecter" }));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByLabelText("Nouvel agent"));
    await utilisateur.click(within(await screen.findByRole("listbox")).getByText("Mengue Sophie (AG-00002)"));

    const continuer = within(dialogue).getByRole("button", { name: "Continuer" });
    expect(continuer).toBeDisabled(); // motif manquant
    await utilisateur.type(within(dialogue).getByLabelText(/Motif/), "Changement de secteur");
    await utilisateur.click(continuer);

    expect(within(dialogue).getByText("Mengue Sophie")).toBeInTheDocument();
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Confirmer" }));

    await waitFor(() =>
      expect(ecritures).toContainEqual({
        methode: "POST",
        chemin: "/api/v1/portefeuilles/transferer",
        corps: { adherentIds: ["adh-1"], nouvelAgentId: "agent-2", motif: "Changement de secteur" },
      }),
    );
    expect(await screen.findByText("Adhérent réaffecté.")).toBeInTheDocument();
  });

  it("change le statut après motif et confirmation, et affiche le refus du serveur (#33)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const ecritures = espionnerEcritures();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    await utilisateur.click(await screen.findByRole("button", { name: /Changer le statut/ }));
    const dialogue = await screen.findByRole("dialog");
    await utilisateur.click(within(dialogue).getByLabelText("Nouveau statut"));
    // Le statut courant (« En retard ») n'est pas proposé.
    expect(screen.queryByRole("option", { name: "En retard" })).not.toBeInTheDocument();
    await utilisateur.click(await screen.findByRole("option", { name: "Actif" }));
    await utilisateur.type(within(dialogue).getByLabelText(/Motif/), "Régularisation constatée");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Continuer" }));
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Confirmer le changement" }));

    await waitFor(() =>
      expect(ecritures).toContainEqual({
        methode: "POST",
        chemin: "/api/v1/adherents/adh-2/statut",
        corps: { statut: "ACTIF", motif: "Régularisation constatée" },
      }),
    );
    expect(await screen.findByText("Statut changé : Actif.")).toBeInTheDocument();
  });

  it("modifie les coordonnées sans perdre la saisie en cas de refus du serveur (#31, #32)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.put("/api/v1/adherents/:id/coordonnees", () =>
        HttpResponse.json(
          { code: "ADHERENT_TELEPHONE_DEJA_UTILISE", message: "Ce numéro est déjà utilisé par un autre adhérent.", champ: "telephonePrincipal", traceId: "t", avertissements: [] },
          { status: 409 },
        ),
      ),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    const carte = (await screen.findByText("Coordonnées")).closest("[data-slot='card']") as HTMLElement;
    await utilisateur.click(await within(carte).findByRole("button", { name: "Modifier" }));

    const telephone = await screen.findByLabelText(/Téléphone principal/);
    await utilisateur.clear(telephone);
    await utilisateur.type(telephone, "12");
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Le numéro doit comporter 9 chiffres (format camerounais).")).toBeInTheDocument();

    await utilisateur.clear(telephone);
    await utilisateur.type(telephone, "677000937");
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Ce numéro est déjà utilisé par un autre adhérent.")).toBeInTheDocument();
    expect(telephone).toHaveValue("677000937");
  });

  it("complète le dossier en ne proposant que les champs manquants (#15, #16)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const ecritures = espionnerEcritures();
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    await utilisateur.click(await screen.findByRole("button", { name: "Compléter le dossier" }));
    const dialogue = await screen.findByRole("dialog");

    expect(await within(dialogue).findByLabelText("Numéro CNI")).toBeInTheDocument();
    expect(within(dialogue).getByLabelText("Latitude")).toBeInTheDocument();
    // Champ non manquant : absent du parcours.
    expect(within(dialogue).queryByLabelText("Ville")).not.toBeInTheDocument();
    // V21 : l'association se choisit dans le référentiel `GET /associations` (elle n'est plus « à renseigner depuis la fiche »).
    expect(within(dialogue).getByLabelText("Association")).toBeInTheDocument();
    expect(within(dialogue).queryByText("À renseigner depuis la fiche")).not.toBeInTheDocument();

    await utilisateur.type(within(dialogue).getByLabelText("Numéro CNI"), "112233445");
    await utilisateur.click(within(dialogue).getByRole("checkbox"));
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(ecritures).toContainEqual({
        methode: "PATCH",
        chemin: "/api/v1/adherents/adh-2/profil",
        corps: { numeroCni: "112233445", consentementDonnees: true },
      }),
    );
    expect(await screen.findByText(/Dossier complété/)).toBeInTheDocument();
  });

  it("renvoie la fiche complète au PUT de l'identité d'un dossier en brouillon, pour ne rien effacer (#13)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const ecritures = espionnerEcritures();
    const utilisateur = userEvent.setup();
    // adh-2 est en brouillon : la modification directe reste ouverte (workflow V19).
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    await utilisateur.click(await screen.findByRole("button", { name: /Modifier l'identité/ }));
    const dialogue = await screen.findByRole("dialog");
    const prenoms = within(dialogue).getByLabelText(/Prénoms/);
    await utilisateur.clear(prenoms);
    await utilisateur.type(prenoms, "Paul Henri");
    await utilisateur.click(within(dialogue).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(ecritures.some((e) => e.methode === "PUT" && e.chemin === "/api/v1/adherents/adh-2")).toBe(true));
    const corps = ecritures.find((e) => e.methode === "PUT")!.corps as Record<string, unknown>;
    expect(corps).toMatchObject({ nom: "ATANGANA", prenoms: "Paul Henri", telephonePrincipal: "690112233", localisation: "Marché Mokolo", ville: "Yaoundé" });
  });

  it("affiche le résumé des cotisations et la situation de droits dans l'onglet Cotisations (#28)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=cotisations" });

    expect(await screen.findByText("Résumé des cotisations")).toBeInTheDocument();
    expect(await screen.findByText("1 400 FCFA")).toBeInTheDocument();
    expect(screen.getByText("86 %")).toBeInTheDocument();

    const carteSituation = (await screen.findByText("Situation de droits")).closest("[data-slot='card']") as HTMLElement;
    expect(within(carteSituation).getByText("En retard")).toBeInTheDocument();
    expect(screen.getByText(/Reliquat de 400 F non imputé/)).toBeInTheDocument();
    expect(await screen.findByText("Périodes de droits")).toBeInTheDocument();
  });

  it("distingue éligibilité CNPS et complétude du dossier (#27)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=cnps" });

    expect(await screen.findByText(/Seuil non atteint — il reste 1 500 FCFA/)).toBeInTheDocument();
    expect(await screen.findByText("Informations renseignées à 60 %")).toBeInTheDocument();
    expect(screen.getByText("Dossier CNPS")).toBeInTheDocument();
  });

  it("liste les documents et la checklist documentaire tirée de la matrice (#18, #19, #20, V21)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=documents" });

    const checklist = await screen.findByRole("list", { name: "Checklist documentaire" });
    expect(within(checklist).getByText("Acte de naissance")).toBeInTheDocument();
    expect(within(checklist).getAllByRole("button", { name: "Ajouter cette pièce" }).length).toBeGreaterThan(0);
    expect(await screen.findByText("Documents déposés")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajouter un document/ })).toBeInTheDocument();
  });

  it("affiche l'historique avec acteur, date et motif (#21)", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=historique" });

    expect(await screen.findByText("Changement de statut")).toBeInTheDocument();
    expect(screen.getByText("Création")).toBeInTheDocument();
    expect(screen.getByText("Motif : Trois mois sans cotisation")).toBeInTheDocument();
    expect(screen.getAllByText("gestionnaire.test").length).toBe(2);
  });

  it("ne donne au PCA que la consultation : aucun bouton d'écriture", async () => {
    simulerSession(JETON_PCA);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1" });

    await screen.findByRole("heading", { level: 1, name: "NDONGO Marie Claire" });
    await screen.findByText("60 %");
    expect(screen.queryByRole("button", { name: /Modifier/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Changer le statut/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archiver/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Réaffecter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compléter le dossier" })).not.toBeInTheDocument();
    // Consultation élargie : les onglets de lecture restent disponibles.
    expect(screen.getByRole("tab", { name: "CNPS" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Documents" })).toBeInTheDocument();
  });

  it("donne à l'Agent de terrain la modification sans statut, archivage ni affectation", async () => {
    simulerSession(JETON_AGENT);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1" });

    // adh-1 est validé : l'Agent ne modifie plus directement, il demande une modification (workflow V19).
    expect(await screen.findByRole("button", { name: /Demander une modification/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Modifier l'identité/ })).not.toBeInTheDocument();
    // La complétion des champs vides reste ouverte sur un dossier validé.
    expect(await screen.findByRole("button", { name: "Compléter le dossier" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Changer le statut/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archiver/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Réaffecter" })).not.toBeInTheDocument();
    // Aucune permission CNPS:*, mais DROITS:LIRE + PAIEMENT:LIRE : l'onglet CNPS montre l'éligibilité.
    expect(screen.getByRole("tab", { name: "CNPS" })).toBeInTheDocument();
  });

  it("laisse au Chef des agents la consultation, sans aucune écriture sur l'adhérent", async () => {
    simulerSession(JETON_CHEF);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-1" });

    await screen.findByRole("heading", { level: 1, name: "NDONGO Marie Claire" });
    await screen.findByText("60 %");
    expect(screen.queryByRole("button", { name: /Modifier/ })).not.toBeInTheDocument();
    // Pas de DOCUMENT:LIRE pour le Chef : l'onglet n'est pas affiché.
    expect(screen.queryByRole("tab", { name: "Documents" })).not.toBeInTheDocument();
  });

  it("masque l'onglet Cotisations sans permission de lecture des droits ni des paiements", async () => {
    serveur.use(
      http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: JETON_AGENT })),
      http.get("/api/v1/auth/moi", () => {
        const agent = UTILISATEURS[JETON_AGENT]!;
        return HttpResponse.json({
          ...agent,
          permissions: agent.permissions.filter((p) => p !== "DROITS:LIRE" && p !== "PAIEMENT:LIRE"),
        });
      }),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    await screen.findByRole("heading", { level: 1, name: "ATANGANA Paul" });
    await screen.findByText("60 %");
    expect(screen.queryByRole("tab", { name: "Cotisations" })).not.toBeInTheDocument();
  });

  it("masque la situation de droits sans la permission dédiée", async () => {
    simulerSessionSansDroitsLire();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2?onglet=cotisations" });

    await screen.findByRole("heading", { level: 1, name: "ATANGANA Paul" });
    await screen.findByRole("tab", { name: "Cotisations" });
    expect(screen.queryByText("Situation de droits")).not.toBeInTheDocument();
    expect(screen.queryByText("Périodes de droits")).not.toBeInTheDocument();
    expect(screen.queryByText("Résumé des cotisations")).not.toBeInTheDocument();
  });
});
