import { ShieldAlert } from "lucide-react";

/** Écran affiché quand la session est active mais la permission requise est absente. */
export function AccesNonAutorise() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-fond p-6 text-center">
      <ShieldAlert className="size-10 text-danger-fort" aria-hidden="true" />
      <h1>Accès non autorisé</h1>
      <p className="max-w-prose text-texte-doux">
        Votre compte ne dispose pas de la permission nécessaire pour consulter cette page. Si vous
        pensez qu'il s'agit d'une erreur, contactez votre responsable ou le Super Administrateur.
      </p>
    </div>
  );
}
