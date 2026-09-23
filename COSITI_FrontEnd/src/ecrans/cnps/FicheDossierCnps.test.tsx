import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { FicheDossierCnps } from "@/ecrans/cnps/FicheDossierCnps";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbre() {
  return (
    <Routes>
      <Route path="/cnps/:id" element={<FicheDossierCnps />} />
    </Routes>
  );
}

describe("FicheDossierCnps", () => {
  it("liste les pièces manquantes du dossier", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/dos-1" });

    await screen.findByText("Pièces obligatoires manquantes");
    expect(screen.getAllByText("Acte de naissance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Photo d'identité").length).toBeGreaterThan(0);
  });

  it("remonte le refus de l'API quand le dossier est déclaré prêt sans ses pièces", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/dos-1" });

    await screen.findByRole("button", { name: "Déclarer prêt" });
    await utilisateur.click(screen.getByRole("button", { name: "Déclarer prêt" }));
    await utilisateur.click(await screen.findByRole("button", { name: "Confirmer" }));

    // Le message affiché est celui du serveur, jamais une reformulation côté client.
    await screen.findByText(/des pièces obligatoires manquent encore/i);
  });

  it("exige un motif pour enregistrer un rejet CNPS", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/dos-2" });

    await screen.findByRole("button", { name: "Enregistrer un rejet CNPS" });
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer un rejet CNPS" }));

    const confirmer = await screen.findByRole("button", { name: "Confirmer" });
    expect(confirmer).toBeDisabled();

    await utilisateur.type(screen.getByLabelText("Motif du rejet CNPS"), "Acte de naissance illisible");
    await waitFor(() => expect(confirmer).toBeEnabled());
  });

  it("n'offre aucune transition à un rôle en consultation seule", async () => {
    // La DGA lit le domaine CNPS mais ne change aucun statut.
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/dos-1" });

    await screen.findByText("Pièces du dossier");
    expect(screen.queryByRole("button", { name: "Déclarer prêt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Préparer la déclaration" })).not.toBeInTheDocument();
  });

  it("affiche les déclarations et permet de marquer la transmission", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/dos-2" });

    await screen.findByText("Déclarations mensuelles");
    expect(screen.getByText("septembre 2026")).toBeInTheDocument();

    // Seule la déclaration A_PRODUIRE offre l'action ; celle déjà transmise ne la propose plus.
    const boutons = screen.getAllByRole("button", { name: "Marquer transmise" });
    expect(boutons).toHaveLength(1);

    await utilisateur.click(boutons[0]!);
    await screen.findByText("Déclaration marquée transmise.");
  });

  it("n'affiche aucune transition sur un dossier traité", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.get("/api/v1/cnps/dossiers/:id", () =>
        HttpResponse.json({
          id: "dos-3",
          adherentId: "adh-1",
          numeroImmatriculation: "CNPS-999000",
          dateImmatriculation: "2026-06-01",
          revenuMensuelDeclare: 90000,
          statut: "TRAITE",
          motifRejet: null,
          pieces: [],
          piecesManquantes: [],
          creeLe: "2026-05-01T08:00:00Z",
          creePar: "gestionnaire.test",
          avertissements: [],
        }),
      ),
    );
    rendreAvecProviders(arbre(), { routeInitiale: "/cnps/dos-3" });

    await screen.findByText("Traité");
    // TRAITE est terminal côté serveur : un dossier immatriculé ne se rouvre pas.
    expect(screen.queryByRole("button", { name: /Marquer|Déclarer|Repasser|Enregistrer un rejet/ })).not.toBeInTheDocument();
  });
});
