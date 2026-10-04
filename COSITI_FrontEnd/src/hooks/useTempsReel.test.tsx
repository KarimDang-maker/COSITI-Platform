import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { decouperMessagesFlux } from "@/api/client";
import { lireEvenementTempsReel } from "@/api/tempsReel";
import { definirJetonAcces } from "@/auth/jeton";
import { useTempsReel } from "@/hooks/useTempsReel";
import { serveur } from "@/test/msw/serveur";
import { JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { EVENEMENT_NOTIFICATION_RECUE, type Notification } from "@/api/notifications";

describe("Flux temps réel — lecture des messages", () => {
  it("découpe les messages complets et garde le reste inachevé", () => {
    const { messages, reste } = decouperMessagesFlux(
      'event:connecte\ndata:{}\n\n: battement\n\nevent:changement\ndata:{"domaine":"paiement"}\n\nevent:chan',
    );
    expect(messages).toEqual([
      { evenement: "connecte", donnees: "{}" },
      { evenement: "changement", donnees: '{"domaine":"paiement"}' },
    ]);
    expect(reste).toBe("event:chan");
  });

  it("ignore un domaine inconnu ou un contenu illisible", () => {
    expect(lireEvenementTempsReel({ evenement: "changement", donnees: '{"domaine":"inconnu"}' })).toBeNull();
    expect(lireEvenementTempsReel({ evenement: "changement", donnees: "pas du json" })).toBeNull();
    expect(lireEvenementTempsReel({ evenement: "connecte", donnees: "{}" })).toBeNull();
    expect(lireEvenementTempsReel({ evenement: "changement", donnees: '{"domaine":"adhesion","id":"x"}' })?.domaine).toBe("adhesion");
  });
});

describe("Flux temps réel — invalidation", () => {
  it("recharge les requêtes du domaine modifié par un autre acteur, avec le jeton en en-tête", async () => {
    let autorisation: string | null = null;
    const encodeur = new TextEncoder();
    serveur.use(
      http.get("/api/v1/temps-reel/flux", ({ request }) => {
        autorisation = request.headers.get("Authorization");
        const flux = new ReadableStream<Uint8Array>({
          start(controleur) {
            controleur.enqueue(encodeur.encode("event:connecte\ndata:{}\n\n"));
            controleur.enqueue(
              encodeur.encode('event:changement\ndata:{"domaine":"paiement","id":"pai-1","adherentId":"adh-1","typeChangement":"VALIDATION","horodatage":"2026-10-02T10:00:00Z"}\n\n'),
            );
            // Le flux reste ouvert : il est fermé par le démontage du hook.
          },
        });
        return new HttpResponse(flux, { headers: { "Content-Type": "text/event-stream" } });
      }),
    );
    definirJetonAcces(JETON_GESTIONNAIRE);

    const clientRequetes = new QueryClient();
    clientRequetes.setQueryData(["paiements", "liste", {}], { contenu: [] });
    clientRequetes.setQueryData(["cnps", "liste"], { contenu: [] });
    const enveloppe = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={clientRequetes}>{children}</QueryClientProvider>
    );

    const { result, unmount } = renderHook(() => useTempsReel(true), { wrapper: enveloppe });

    await waitFor(() => expect(clientRequetes.getQueryState(["paiements", "liste", {}])?.isInvalidated).toBe(true), { timeout: 4000 });
    expect(result.current).toBe("connecte");
    expect(autorisation).toBe(`Bearer ${JETON_GESTIONNAIRE}`);
    // Un domaine sans rapport n'est pas rechargé.
    expect(clientRequetes.getQueryState(["cnps", "liste"])?.isInvalidated).toBe(false);

    unmount();
    definirJetonAcces(null);
  });

  it("relaie une notification nominative : cloche rechargée et alerte émise", async () => {
    const encodeur = new TextEncoder();
    serveur.use(
      http.get("/api/v1/temps-reel/flux", () => {
        const flux = new ReadableStream<Uint8Array>({
          start(controleur) {
            controleur.enqueue(
              encodeur.encode(
                'event:notification\ndata:{"id":"n-9","type":"CONTROLE_DGA_A_TRAITER","titre":"Nouvel adhérent à contrôler","corps":"Adhérent COSITI-00002","entite":"controle_dga","entiteId":"ctl-9","lue":false,"creeLe":"2026-10-02T10:00:00Z"}\n\n',
              ),
            );
          },
        });
        return new HttpResponse(flux, { headers: { "Content-Type": "text/event-stream" } });
      }),
    );
    definirJetonAcces(JETON_GESTIONNAIRE);
    const recues: Notification[] = [];
    const ecouteur = (e: Event) => recues.push((e as CustomEvent<Notification>).detail);
    window.addEventListener(EVENEMENT_NOTIFICATION_RECUE, ecouteur);

    const clientRequetes = new QueryClient();
    clientRequetes.setQueryData(["notifications", "non-lues"], { nonLues: 0 });
    const enveloppe = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={clientRequetes}>{children}</QueryClientProvider>
    );
    const { unmount } = renderHook(() => useTempsReel(true), { wrapper: enveloppe });

    await waitFor(() => expect(recues.map((n) => n.id)).toEqual(["n-9"]), { timeout: 4000 });
    expect(clientRequetes.getQueryState(["notifications", "non-lues"])?.isInvalidated).toBe(true);

    unmount();
    window.removeEventListener(EVENEMENT_NOTIFICATION_RECUE, ecouteur);
    definirJetonAcces(null);
  });

  it("reste inactif hors session", () => {
    const clientRequetes = new QueryClient();
    const enveloppe = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={clientRequetes}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useTempsReel(false), { wrapper: enveloppe });
    expect(result.current).toBe("inactif");
  });
});
