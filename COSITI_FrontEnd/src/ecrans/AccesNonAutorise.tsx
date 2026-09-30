import { Link } from "react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageErreur } from "@/components/cositi/page-erreur";

/** Écran affiché quand la session est active mais la permission requise est absente. */
export function AccesNonAutorise() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-fond p-6">
      <div className="w-full max-w-3xl">
        <PageErreur
          code="403"
          icone={ShieldAlert}
          titre="Accès non autorisé"
          description={
            <p>
              Votre compte ne dispose pas de la permission nécessaire pour consulter cette page. Si vous
              pensez qu'il s'agit d'une erreur, contactez votre responsable ou le Super Administrateur.
            </p>
          }
          actions={
            <Button asChild>
              <Link to="/">Revenir à l'accueil</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
