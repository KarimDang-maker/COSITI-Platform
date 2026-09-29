import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { serveur } from "@/test/msw/serveur";
import { effacerJetonAcces } from "@/auth/jeton";

// jsdom n'implémente ni la capture de pointeur ni `scrollIntoView`, utilisées
// par les composants Radix (`Select`, `Popover`…) sous-jacents à `ui/select.tsx`
// et `cositi/select-recherche.tsx`. Sans ce polyfill, toute interaction avec
// ces composants lève une `TypeError` dans jsdom (pas en navigateur réel).
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}

// `ResizeObserver` (mesure de taille de `ui/checkbox.tsx`, Radix) n'existe pas non plus dans jsdom.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Toute requête non simulée échoue bruyamment : un test ne doit jamais
// supposer qu'un backend réel répond (consigne de session, `AGENTS.md §5`).
beforeAll(() => serveur.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  serveur.resetHandlers();
  cleanup();
  effacerJetonAcces();
});

afterAll(() => serveur.close());
