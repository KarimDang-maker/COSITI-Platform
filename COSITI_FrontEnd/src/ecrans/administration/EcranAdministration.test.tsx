import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_SUPER_ADMIN } from "@/test/msw/donnees";
import { EcranAdministration } from "@/ecrans/administration/EcranAdministration";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/administration" element={<EcranAdministration />} />
    </Routes>
  );
}

describe("EcranAdministration", () => {
  it("liste les comptes avec leur état, sans offrir de suppression", async () => {
    simulerSession(JETON_SUPER_ADMIN);
    rendreAvecProviders(arbre(), { routeInitiale: "/administration" });

    await screen.findByText("super.admin");
    expect(screen.getByText("Verrouillé")).toBeInTheDocument();

    // AGENTS.md règle absolue n°3 : un compte se désactive, il ne s'efface pas.
    expect(screen.queryByRole("button", { name: /supprimer/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Désactiver" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Réactiver" })).toBeInTheDocument();
  });

  it("exige un motif pour désactiver un compte et rappelle que rien n'est supprimé", async () => {
    simulerSession(JETON_SUPER_ADMIN);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/administration" });

    await utilisateur.click((await screen.findAllByRole("button", { name: "Désactiver" }))[0]!);
    await screen.findByText(/Le compte n'est pas supprimé/);

    const confirmer = screen.getAllByRole("button", { name: "Désactiver" }).at(-1)!;
    expect(confirmer).toBeDisabled();

    await utilisateur.type(screen.getByLabelText("Motif"), "Fin de contrat");
    await waitFor(() => expect(confirmer).toBeEnabled());
  });

  it("crée un compte sans champ de mot de passe et le révèle une seule fois", async () => {
    simulerSession(JETON_SUPER_ADMIN);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/administration" });

    await utilisateur.click(await screen.findByRole("button", { name: "Créer un compte" }));

    // Aucun champ de mot de passe : il est généré par le serveur.
    expect(screen.queryByLabelText(/mot de passe/i)).not.toBeInTheDocument();

    await utilisateur.type(screen.getByLabelText("Identifiant de connexion"), "nouveau.compte");
    await utilisateur.type(screen.getByLabelText("Nom complet"), "Compte Nouveau");
    await utilisateur.click(screen.getByLabelText("Rôle"));
    await utilisateur.click(await screen.findByRole("option", { name: "Agent de terrain" }));
    await utilisateur.click(screen.getByRole("button", { name: "Créer le compte" }));

    await screen.findByText("Kp9!mZ2xQw7$Lb4T");
    expect(screen.getByText(/ne sera plus affiché/)).toBeInTheDocument();
  });

  it("présente les rôles en lecture seule, sans possibilité d'en créer", async () => {
    simulerSession(JETON_SUPER_ADMIN);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/administration" });

    await utilisateur.click(await screen.findByRole("tab", { name: "Rôles" }));

    // « Super Administrateur » apparaît aussi dans l'en-tête (libellé du rôle connecté) : on cible le
    // code technique du rôle, qui n'existe que dans cet onglet.
    await screen.findByText("SUPER_ADMIN");
    expect(screen.getByText("ADMINISTRATION:GERER")).toBeInTheDocument();
    expect(screen.getByText(/les huit rôles de la V1 sont/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /créer un rôle/i })).not.toBeInTheDocument();
  });

  it("signale les règles non validées et exige un motif pour les modifier", async () => {
    simulerSession(JETON_SUPER_ADMIN);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/administration?onglet=parametres" });

    await screen.findByText("DELAI_RETARD_JOURS");
    // « À valider » figure aussi dans la légende explicative : on cible les badges du tableau.
    const lignes = screen.getAllByRole("row");
    const ligneDelai = lignes.find((l) => l.textContent?.includes("DELAI_RETARD_JOURS"))!;
    expect(ligneDelai).toHaveTextContent("À valider");
    const ligneMontant = lignes.find((l) => l.textContent?.includes("MONTANT_INSCRIPTION"))!;
    expect(ligneMontant).toHaveTextContent("Confirmé");

    await utilisateur.click((await screen.findAllByRole("button", { name: "Modifier" }))[0]!);

    const enregistrer = await screen.findByRole("button", { name: "Enregistrer" });
    expect(enregistrer).toBeDisabled();

    await utilisateur.type(screen.getByLabelText("Motif (obligatoire)"), "Arbitrage du DAF");
    await waitFor(() => expect(enregistrer).toBeEnabled());

    await utilisateur.click(enregistrer);
    await screen.findByText("Règle DELAI_RETARD_JOURS mise à jour.");
  });

  it("affiche le refus de l'API plutôt qu'une liste vide", async () => {
    simulerSession(JETON_SUPER_ADMIN);
    serveur.use(
      http.get("/api/v1/administration/utilisateurs", () =>
        HttpResponse.json(
          { code: "ACCES_REFUSE", message: "Accès refusé.", traceId: "t-1" },
          { status: 403 },
        ),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/administration" });

    await screen.findByText("Impossible de charger les comptes");
    expect(screen.getByText("Accès refusé.")).toBeInTheDocument();
  });
});
