import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { ChampIcone } from "@/components/cositi/champ-icone";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Champ de recherche d'une liste (gabarit : `table-search-box`) — loupe à
 * gauche, dans le champ. Le libellé reste obligatoire (`Label` associé ou
 * `aria-label`) : le texte indicatif n'en tient jamais lieu.
 */
export function ChampRecherche({ className, ...props }: ComponentProps<typeof Input>) {
  return <ChampIcone icone={Search} type="search" classeConteneur={cn("w-full sm:w-80", className)} {...props} />;
}
