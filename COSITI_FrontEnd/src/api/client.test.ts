import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { serveur } from "@/test/msw/serveur";
import { client } from "@/api/client";
import { definirJetonAcces, EVENEMENT_SESSION_EXPIREE, obtenirJetonAcces } from "@/auth/jeton";
import { ErreurApiException } from "@/api/erreurs";

describe("client HTTP", () => {
  it("rejoue la requête après une rotation de jeton réussie sur 401", async () => {
    definirJetonAcces("jeton-expire");
    let appels = 0;

    serveur.use(
      http.get("/api/v1/_test/protege", ({ request }) => {
        appels += 1;
        const autorisation = request.headers.get("Authorization");
        if (autorisation === "Bearer jeton-expire") {
          return HttpResponse.json(
            { code: "AUTH_JETON_EXPIRE", message: "Jeton expiré.", traceId: "t1", avertissements: [] },
            { status: 401 },
          );
        }
        return HttpResponse.json({ ok: true });
      }),
      http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: "jeton-renouvele" })),
    );

    const resultat = await client.get<{ ok: boolean }>("/_test/protege");

    expect(resultat).toEqual({ ok: true });
    expect(appels).toBe(2);
    expect(obtenirJetonAcces()).toBe("jeton-renouvele");
  });

  it("efface le jeton et signale la perte de session quand la rotation échoue", async () => {
    definirJetonAcces("jeton-expire");
    let sessionExpiree = false;
    const ecouteur = () => {
      sessionExpiree = true;
    };
    window.addEventListener(EVENEMENT_SESSION_EXPIREE, ecouteur);

    serveur.use(
      http.get("/api/v1/_test/protege", () =>
        HttpResponse.json(
          { code: "AUTH_JETON_EXPIRE", message: "Jeton expiré.", traceId: "t2", avertissements: [] },
          { status: 401 },
        ),
      ),
      http.post("/api/v1/auth/rafraichir", () =>
        HttpResponse.json(
          { code: "AUTH_SESSION_ABSENTE", message: "Aucune session à reprendre.", traceId: "t3", avertissements: [] },
          { status: 401 },
        ),
      ),
    );

    await expect(client.get("/_test/protege")).rejects.toBeInstanceOf(ErreurApiException);

    expect(obtenirJetonAcces()).toBeNull();
    expect(sessionExpiree).toBe(true);
    window.removeEventListener(EVENEMENT_SESSION_EXPIREE, ecouteur);
  });

  it("normalise une erreur 409 avec ses détails (ex. doublon)", async () => {
    serveur.use(
      http.post("/api/v1/_test/conflit", () =>
        HttpResponse.json(
          {
            code: "ADHERENT_DOUBLON_POTENTIEL",
            message: "Un doublon potentiel a été détecté.",
            traceId: "t4",
            avertissements: [],
            candidats: [{ adherentId: "a1", matricule: "COSITI-00042" }],
          },
          { status: 409 },
        ),
      ),
    );

    try {
      await client.post("/_test/conflit", {});
      expect.unreachable("la requête aurait dû échouer");
    } catch (e) {
      expect(e).toBeInstanceOf(ErreurApiException);
      const erreur = e as ErreurApiException;
      expect(erreur.statut).toBe(409);
      expect(erreur.code).toBe("ADHERENT_DOUBLON_POTENTIEL");
      expect(erreur.details?.candidats).toEqual([{ adherentId: "a1", matricule: "COSITI-00042" }]);
    }
  });
});
