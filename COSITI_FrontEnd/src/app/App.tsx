import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "@/auth/ContexteAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { RoutesApplication } from "@/app/routes";
import { FournisseurTempsReel } from "@/app/FournisseurTempsReel";
import { AlertesNotifications } from "@/ecrans/notifications/AlertesNotifications";

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
        <FournisseurTempsReel>
          <TooltipProvider>
            <BrowserRouter>
              <RoutesApplication />
              <AlertesNotifications />
            </BrowserRouter>
            <Toaster />
          </TooltipProvider>
        </FournisseurTempsReel>
      </AuthProvider>
    </QueryClientProvider>
  );
}
