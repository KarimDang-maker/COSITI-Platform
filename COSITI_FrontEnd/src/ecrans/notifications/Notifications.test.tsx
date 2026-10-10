import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes, useLocation } from "react-router";
import { act, rendreAvecProviders, screen, waitFor } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_DAF, JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import {
  EVENEMENT_NOTIFICATION_RECUE,
  cheminNotification,
  libelleActionNotification,
  type Notification,
} from "@/api/notifications";
import { AlertesNotifications } from "@/ecrans/notifications/AlertesNotifications";
import { OuvertureBilanCaisse, OuvertureFraisAdhesion } from "@/ecrans/notifications/OuverturesNotification";

/**
 * Notifications des trois modules : chaque notification mène à l'écran où y répondre ; une notification poussée par
 * le flux temps réel apparaît aussitôt, avec un bouton qui la marque lue et ouvre cet écran.
 */

function notification(partiel: Partial<Notification>): Notification {
  return {
    id: "notif-1",
    type: "DEMANDE_VALIDATION_A_TRAITER",
    titre: "Demande DV-000001 à valider",
    corps: "Modification d'adhérent attend votre décision.",
    entite: "demande_validation",
    entiteId: "dem-1",
    lue: false,
    creeLe: "2026-10-02T10:00:00Z",
    ...partiel,
  };
}

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function Emplacement() {
  const { pathname, search } = useLocation();
  return <p data-testid="emplacement">{`${pathname}${search}`}</p>;
}

const ATTENTE = { timeout: 4000 };

afterEach(() => serveur.events.removeAllListeners());

describe("Notifications — écran où répondre", () => {
  it("mène chaque objet notifié des trois modules à son écran", () => {
    const cas: [Partial<Notification>, string][] = [
      [{ entite: "demande_validation", entiteId: "dem-1" }, "/validations/dem-1"],
      [{ entite: "controle_dga", entiteId: "ctl-1" }, "/controles-dga/ctl-1"],
      [{ entite: "frais_adhesion", entiteId: "fa-2" }, "/frais-adhesion/fa-2"],
      [{ entite: "paiement", entiteId: "pai-1" }, "/cotisations/pai-1"],
      [{ entite: "bilan_caisse", entiteId: "bil-1" }, "/bilans-caisse/ouvrir/bil-1"],
      [{ entite: "remise_caisse", entiteId: "rem-1" }, "/daf"],
      [{ entite: "compte_rendu", entiteId: "cr-1" }, "/comptes-rendus/cr-1"],
      [{ entite: "rapport_daf", entiteId: "rap-1" }, "/rapports"],
    ];
    for (const [partiel, chemin] of cas) expect(cheminNotification(notification(partiel))).toBe(chemin);
    expect(cheminNotification(notification({ entite: "inconnu" }))).toBeNull();
  });

  it("annonce l'action attendue selon le type", () => {
    expect(libelleActionNotification(notification({}))).toBe("Traiter la demande");
    expect(libelleActionNotification(notification({ type: "CONTROLE_DGA_CORRECTION" }))).toBe("Corriger le dossier");
    expect(libelleActionNotification(notification({ type: "BILAN_CAISSE_ECART" }))).toBe("Examiner le bilan");
    expect(libelleActionNotification(notification({ type: "AUTRE" }))).toBe("Ouvrir");
  });
});

describe("Notifications — apparition immédiate", () => {
  it("affiche la notification poussée et ouvre l'écran concerné en la marquant lue", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const lues: string[] = [];
    serveur.events.on("request:start", ({ request }) => {
      const chemin = new URL(request.url).pathname;
      if (request.method === "POST" && chemin.endsWith("/lue")) lues.push(chemin);
    });
    const utilisateur = userEvent.setup();
    rendreAvecProviders(
      <>
        <AlertesNotifications />
        <Routes>
          <Route path="*" element={<Emplacement />} />
        </Routes>
      </>,
      { routeInitiale: "/" },
    );

    act(() => {
      window.dispatchEvent(new CustomEvent(EVENEMENT_NOTIFICATION_RECUE, { detail: notification({}) }));
    });

    expect(await screen.findByText("Demande DV-000001 à valider", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByText("Modification d'adhérent attend votre décision.")).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: "Traiter la demande" }));

    await waitFor(() => expect(screen.getByTestId("emplacement")).toHaveTextContent("/validations/dem-1"), ATTENTE);
    await waitFor(() => expect(lues).toContain("/api/v1/notifications/notif-1/lue"), ATTENTE);
  });
});

describe("Notifications — ouverture d'un objet sans écran propre", () => {
  it("ouvre le frais d'adhésion notifié dans l'onglet Adhésion de l'adhérent", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(
      <Routes>
        <Route path="/frais-adhesion/:id" element={<OuvertureFraisAdhesion />} />
        <Route path="*" element={<Emplacement />} />
      </Routes>,
      { routeInitiale: "/frais-adhesion/fa-1" },
    );
    await waitFor(() => expect(screen.getByTestId("emplacement")).toHaveTextContent("/adherents/adh-1?onglet=adhesion"), ATTENTE);
  });

  it("ouvre le bilan de caisse notifié à sa date", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(
      <Routes>
        <Route path="/bilans-caisse/ouvrir/:id" element={<OuvertureBilanCaisse />} />
        <Route path="*" element={<Emplacement />} />
      </Routes>,
      { routeInitiale: "/bilans-caisse/ouvrir/bil-1" },
    );
    await waitFor(() => expect(screen.getByTestId("emplacement")).toHaveTextContent("/bilans-caisse?date=2026-09-28"), ATTENTE);
  });

  it("explique quand l'objet notifié n'est plus accessible", async () => {
    simulerSession(JETON_DAF);
    rendreAvecProviders(
      <Routes>
        <Route path="/frais-adhesion/:id" element={<OuvertureFraisAdhesion />} />
      </Routes>,
      { routeInitiale: "/frais-adhesion/inexistant" },
    );
    expect(await screen.findByText("Ouverture impossible", {}, ATTENTE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir la liste des frais" })).toHaveAttribute("href", "/frais-adhesion");
  });
});
