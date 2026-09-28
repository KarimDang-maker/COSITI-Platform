import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface PageErreurProps {
  /** Code affiché en grand : « 403 », « 404 ». Jamais un nom d'exception. */
  code?: string;
  icone?: LucideIcon;
  titre: string;
  /** Ce qui s'est passé, puis ce que l'utilisateur peut faire (`docs/02 §13`). */
  description: ReactNode;
  actions?: ReactNode;
}

/**
 * Carte d'erreur pleine page (gabarit : `error-card-custom`) : code en grand
 * vert foncé, titre, explication, actions de sortie. Utilisable dans la
 * coquille comme hors coquille.
 */
export function PageErreur({ code, icone: Icone, titre, description, actions }: PageErreurProps) {
  return (
    <section className="flex min-h-120 flex-col items-center justify-center rounded-2xl bg-surface px-6 py-16 text-center shadow-carte">
      {Icone && (
        <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-surface-inversee text-surface-inversee-accent">
          <Icone className="size-8" aria-hidden="true" />
        </span>
      )}
      {code && (
        <p className="chiffre mb-4 text-affiche leading-none font-extrabold tracking-valeur text-titre" aria-hidden="true">
          {code}
        </p>
      )}
      <h1 className="mb-3 text-2xl">{titre}</h1>
      <div className="mb-8 max-w-lg text-texte-doux">{description}</div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </section>
  );
}
