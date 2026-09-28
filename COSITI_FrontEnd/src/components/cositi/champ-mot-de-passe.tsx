import { useState, type ComponentProps } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChampMotDePasseProps extends Omit<ComponentProps<typeof Input>, "type"> {
  /** Icône décorative à gauche, comme sur la connexion du gabarit (cadenas). */
  icone?: LucideIcon;
}

/**
 * Mot de passe avec bouton « afficher » (gabarit : `password-toggle-btn`).
 * Le bouton est un vrai bouton, annoncé par son état (`aria-pressed`) : la
 * saisie à l'aveugle est une source d'erreur réelle pour des utilisateurs peu
 * à l'aise avec le clavier.
 */
export function ChampMotDePasse({ className, icone: Icone, ...props }: ChampMotDePasseProps) {
  const [visible, setVisible] = useState(false);
  const IconeBascule = visible ? EyeOff : Eye;
  return (
    <div className="relative">
      {Icone && (
        <Icone
          className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-texte-doux"
          aria-hidden="true"
        />
      )}
      <Input type={visible ? "text" : "password"} className={cn("pr-12", Icone && "pl-11", className)} {...props} />
      <button
        type="button"
        aria-pressed={visible}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        onClick={() => setVisible((valeur) => !valeur)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-texte-doux transition-colors hover:text-primaire focus-visible:ring-2 focus-visible:ring-anneau focus-visible:outline-none"
      >
        <IconeBascule className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
