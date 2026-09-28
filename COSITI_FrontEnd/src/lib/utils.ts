import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne des classes Tailwind en résolvant les conflits (dernière classe
 * gagnante sur une même propriété). Utilisé par toutes les primitives
 * `src/components/ui/` générées par shadcn.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
