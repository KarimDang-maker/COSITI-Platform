import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "@/auth/ContexteAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { RoutesApplication } from "@/app/routes";

const clientRequetes = new QueryClient({
  defaultOptions: {
    queries: {
      // Lecture serveur uniquement — aucune règle métier recalculée côté
      // client, on ne fait que mettre en cache la réponse de l'API.
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Racine de l'application : fournisseurs globaux puis routage. */
export function App() {
  return (
    <QueryClientProvider client={clientRequetes}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <RoutesApplication />
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
