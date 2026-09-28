import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "@/auth/ContexteAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

interface OptionsRendu extends Omit<RenderOptions, "wrapper"> {
  /** Route de départ du `MemoryRouter`, ex. `/adherents/nouveau`. */
  routeInitiale?: string;
}

/**
 * `render` de Testing Library, entouré des fournisseurs réels de
 * l'application (React Query, session, tooltips, notifications, routeur en
 * mémoire). Un `QueryClient` neuf par appel : aucun cache partagé entre tests.
 *
 * `<Toaster />` est monté comme dans `app/App.tsx` (ajouté au jalon J7) : sans
 * lui, `toast.success`/`toast.error` ne produisent aucun nœud et le principal
 * canal de retour des mutations — dont les refus métier de l'API — n'était pas
 * vérifiable en test.
 */
export function rendreAvecProviders(ui: ReactElement, { routeInitiale = "/", ...options }: OptionsRendu = {}) {
  const clientRequetes = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Enveloppe({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={clientRequetes}>
        <AuthProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[routeInitiale]}>{children}</MemoryRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Enveloppe, ...options });
}

export * from "@testing-library/react";
