import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { serveur } from "@/test/msw/serveur";
import { client } from "@/api/client";
import { obtenirJetonAcces } from "@/auth/jeton";

/**
 * Régression du jalon J12.
 *
 * Le serveur fait tourner le jeton de rafraîchissement à chaque usage et traite la
 * représentation d'un jeton déjà consommé comme un vol probable : il révoque alors
 * **toute la famille**, jeton fraîchement émis compris (`ServiceJetonImpl.rafraichir`).
 * Deux reprises de session lancées en parallèle — deux onglets restaurés ensemble, ou
 * le double montage de `StrictMode` en développement — déconnectaient donc l'utilisateur
 * et inscrivaient une alerte de sécurité infondée. Constaté en recette E2E.
 *
 * Un seul appel doit partir, quel que soit le nombre d'appelants simultanés.
 */
describe("client.rafraichirSession", () => {
  it("n'émet qu'un seul appel réseau pour des reprises concurrentes", async () => {
    let appels = 0;
    serveur.use(
      http.post("/api/v1/auth/rafraichir", async () => {
        appels += 1;
        // Latence volontaire : sans elle, le premier appel serait résolu avant que le
        // second ne commence, et le test passerait même sans verrou.
        await new Promise((resoudre) => setTimeout(resoudre, 20));
        return HttpResponse.json({ jetonAcces: "jeton-repris" });
      }),
    );

    const resultats = await Promise.all([
      client.rafraichirSession(),
      client.rafraichirSession(),
      client.rafraichirSession(),
    ]);

    expect(resultats).toEqual([true, true, true]);
    expect(appels).toBe(1);
    expect(obtenirJetonAcces()).toBe("jeton-repris");
  });

  it("signale l'absence de session sans lever d'exception", async () => {
    // Le gestionnaire par défaut répond 401 : c'est le cas d'un visiteur sans cookie.
    await expect(client.rafraichirSession()).resolves.toBe(false);
    expect(obtenirJetonAcces()).toBeNull();
  });
});
