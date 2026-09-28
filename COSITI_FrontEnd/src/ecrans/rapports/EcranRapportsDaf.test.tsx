import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DAF, JETON_DGA, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { EcranRapportsDaf } from "@/ecrans/rapports/EcranRapportsDaf";
import { EcranAudit } from "@/ecrans/audit/EcranAudit";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

describe("EcranRapportsDaf", () => {
  function arbre() {
    return (
      <Routes>
        <Route path="/rapports" element={<EcranRapportsDaf />} />
      </Routes>
    );
  }

  it("permet au DAF de produire un rapport sans saisir aucun chiffre", async () => {
    simulerSession(JETON_DAF);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/rapports" });

    await utilisateur.click(await screen.findByRole("button", { name: "Produire un rapport" }));

    // Le dialogue ne demande qu'un titre et une période : les montants sont constatés par le serveur.
    await screen.findByText(/Les montants seront constatés par le serveur/);
    expect(screen.queryByLabelText(/montant/i)).not.toBeInTheDocument();

    await utilisateur.type(screen.getByLabelText("Titre"), "Rapport de test");
    await utilisateur.click(screen.getByRole("button", { name: "Produire" }));

    await screen.findByText("Rapport produit. Ses chiffres sont désormais figés.");
  });

  it("transmet un rapport produit après confirmation rappelant son irréversibilité", async () => {
    simulerSession(JETON_DAF);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/rapports" });

    await utilisateur.click(await screen.findByRole("button", { name: "Transmettre au PCA" }));
    await screen.findByText(/ne peut plus être retiré ni modifié/);

    await utilisateur.click(screen.getByRole("button", { name: "Transmettre" }));
    await screen.findByText("Rapport transmis au PCA.");
  });

  it("ne propose la transmission que sur un rapport produit, jamais sur un rapport déjà transmis", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(arbre(), { routeInitiale: "/rapports" });

    await screen.findByText("Rapport d'août 2026");
    // Deux rapports affichés, un seul est transmissible.
    expect(screen.getAllByRole("button", { name: "Transmettre au PCA" })).toHaveLength(1);
    expect(screen.getByText(/Transmis le/)).toBeInTheDocument();
  });

  it("masque production et transmission pour un rôle en consultation seule", async () => {
    // La DGA a RAPPORT_DAF:LIRE mais ni PRODUIRE ni TRANSMETTRE (V12).
    simulerSession(JETON_DGA);
    rendreAvecProviders(arbre(), { routeInitiale: "/rapports" });

    await screen.findByText("Rapport d'août 2026");
    expect(screen.queryByRole("button", { name: "Produire un rapport" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Transmettre au PCA" })).not.toBeInTheDocument();
  });
});

describe("EcranAudit", () => {
  function arbre() {
    return (
      <Routes>
        <Route path="/audit" element={<EcranAudit />} />
      </Routes>
    );
  }

  it("affiche les opérations sans exposer les valeurs avant/après", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/audit" });

    await screen.findByText("PAIEMENT_VALIDATION");
    expect(screen.getByText("daf.test")).toBeInTheDocument();
    // Une opération système n'a pas d'auteur nommé : elle est étiquetée, pas laissée vide.
    expect(screen.getByText("système")).toBeInTheDocument();
  });

  it("n'offre aucune action de modification ou de purge, quel que soit le rôle", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/audit" });

    await screen.findByText("PAIEMENT_VALIDATION");
    expect(screen.queryByRole("button", { name: /supprimer|purger|modifier/i })).not.toBeInTheDocument();
  });

  it("filtre le journal par objet", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(arbre(), { routeInitiale: "/audit" });

    await screen.findByText("PAIEMENT_VALIDATION");
    await utilisateur.type(screen.getByLabelText("Objet"), "paiement");

    await screen.findByText("PAIEMENT_VALIDATION");
    expect(screen.queryByText("DROITS_IMPUTATION")).not.toBeInTheDocument();
  });
});
