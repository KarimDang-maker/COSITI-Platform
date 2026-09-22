import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_AGENT, JETON_GESTIONNAIRE, UTILISATEURS } from "@/test/msw/donnees";
import { FicheAdherent } from "@/ecrans/adherents/FicheAdherent";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

/**
 * `V8__permissions_j5_j6.sql` (backend réel) accorde `DROITS:LIRE` à tous
 * les rôles métier de ce jeu de test — aucun compte de test ne permet donc
 * plus de vérifier le masquage par absence de cette permission (seul
 * `SUPER_ADMIN`, non représenté ici, ne l'a pas). Le compte Agent est
 * ponctuellement dépouillé de `DROITS:LIRE` pour ce seul test, afin de
 * vérifier que le composant masque bien la section quand la permission est
 * absente — la couverture du chemin « masqué » du code, pas une
 * reconstitution du compte Super Administrateur.
 */
function simulerSessionSansDroitsLire() {
  serveur.use(
    http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: JETON_AGENT })),
    http.get("/api/v1/auth/moi", () => {
      const agent = UTILISATEURS[JETON_AGENT]!;
      return HttpResponse.json({
        ...agent,
        permissions: agent.permissions.filter((p) => p !== "DROITS:LIRE"),
      });
    }),
  );
}

function arbre() {
  return (
    <Routes>
      <Route path="/adherents/:id" element={<FicheAdherent />} />
    </Routes>
  );
}

describe("FicheAdherent", () => {
  it("affiche la situation de droits (domaine `droits`, J6) avec ses avertissements de règle non validée", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    await screen.findByText("ATANGANA Paul");

    // Champs de `GET /droits/adherents/{id}` (forme réelle du backend, sans
    // `pack` contrairement à l'exemple illustratif du pack technique).
    await waitFor(() => expect(screen.getByText("90")).toBeInTheDocument());
    expect(screen.getByText("14")).toBeInTheDocument();
    // « En retard » apparaît deux fois (statut adhérent + statut de
    // régularité de la situation de droits, deux domaines distincts) : on
    // vérifie la carte « Situation de droits » précisément.
    const carteSituation = screen.getByText("Situation de droits").closest("[data-slot='card']") as HTMLElement;
    expect(within(carteSituation).getByText("En retard")).toBeInTheDocument();

    // Avertissement de règle `[V]` non validée, jamais silencieux.
    expect(screen.getByText(/Reliquat de 400 F non imputé/)).toBeInTheDocument();
  });

  it("affiche les périodes de droits de `GET /droits/adherents/{id}/periodes`", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    await screen.findByText("Périodes de droits");
    expect(await screen.findByText("Partielle")).toBeInTheDocument();
    expect(screen.getAllByText("Couverte").length).toBeGreaterThan(0);
  });

  it("masque la situation de droits sans la permission dédiée", async () => {
    simulerSessionSansDroitsLire();
    rendreAvecProviders(arbre(), { routeInitiale: "/adherents/adh-2" });

    await screen.findByText("ATANGANA Paul");
    expect(screen.queryByText("Situation de droits")).not.toBeInTheDocument();
    expect(screen.queryByText("Périodes de droits")).not.toBeInTheDocument();
  });
});
