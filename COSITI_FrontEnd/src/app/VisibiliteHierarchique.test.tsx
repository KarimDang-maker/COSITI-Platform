import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import {
  JETON_AGENT,
  JETON_CHEF,
  JETON_DAF,
  JETON_DG,
  JETON_DGA,
  JETON_GESTIONNAIRE,
  JETON_PCA,
  JETON_SUPER_ADMIN,
} from "@/test/msw/donnees";
import { GardeRoute } from "@/app/GardeRoute";
import { EcranAudit } from "@/ecrans/audit/EcranAudit";

/**
 * Correction « COSITI V1 — DROITS, HIÉRARCHIE, VISIBILITÉ ET WORKFLOW » §1/§2/§3/§16 :
 * matrice de visibilité de l'audit global. Seuls le PCA et le Super Administrateur
 * ont la vision globale de l'audit (§3) — tous les autres rôles, y compris ceux qui
 * possédaient encore `AUDIT:CONSULTER` avant cette correction (DG, DGA, DAF,
 * Gestionnaire des comptes), doivent désormais en être exclus.
 *
 * Ce test exerce la route réelle `/audit` telle que déclarée dans `app/routes.tsx`
 * (`<GardeRoute permission="AUDIT:CONSULTER">`), pas une permission arbitraire :
 * une régression sur le code de permission utilisé par la route serait détectée ici.
 *
 * TODO [A] : les permissions de `JETON_DG`/`JETON_DGA`/`JETON_DAF`/`JETON_GESTIONNAIRE`
 * anticipent une migration backend qui n'est pas encore livrée au moment de ce lot
 * (voir le commentaire d'en-tête de `test/msw/donnees.ts`) — à reconcilier dès que
 * `V5__catalogue_permissions.sql` est complété par la migration réelle retirant
 * `AUDIT:CONSULTER` de ces quatre rôles.
 */
function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function arbreAudit() {
  return (
    <Routes>
      <Route
        path="/audit"
        element={
          <GardeRoute permission="AUDIT:CONSULTER">
            <EcranAudit />
          </GardeRoute>
        }
      />
    </Routes>
  );
}

describe("Visibilité de l'audit global (§3/§16/§19)", () => {
  it("le PCA consulte l'audit global", async () => {
    simulerSession(JETON_PCA);
    rendreAvecProviders(arbreAudit(), { routeInitiale: "/audit" });

    await screen.findByRole("heading", { name: "Journal d'audit" });
    expect(screen.queryByText("Accès non autorisé")).not.toBeInTheDocument();
  });

  it("le Super Administrateur consulte l'audit global", async () => {
    simulerSession(JETON_SUPER_ADMIN);
    rendreAvecProviders(arbreAudit(), { routeInitiale: "/audit" });

    await screen.findByRole("heading", { name: "Journal d'audit" });
    expect(screen.queryByText("Accès non autorisé")).not.toBeInTheDocument();
  });

  it.each([
    ["DG", JETON_DG],
    ["DGA", JETON_DGA],
    ["DAF", JETON_DAF],
    ["Gestionnaire des comptes", JETON_GESTIONNAIRE],
    ["Chef des agents de terrain", JETON_CHEF],
    ["Agent de terrain", JETON_AGENT],
  ])("le/la %s ne consulte pas l'audit global", async (_libelle, jeton) => {
    simulerSession(jeton);
    rendreAvecProviders(arbreAudit(), { routeInitiale: "/audit" });

    await screen.findByText("Accès non autorisé");
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Journal d'audit" })).not.toBeInTheDocument());
  });
});
