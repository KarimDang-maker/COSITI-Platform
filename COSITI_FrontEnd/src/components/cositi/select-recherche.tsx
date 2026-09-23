import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface OptionRecherche {
  valeur: string;
  libelle: string;
}

interface SelectRechercheProps {
  id?: string;
  options: readonly OptionRecherche[];
  valeur: string | undefined;
  onChange: (valeur: string) => void;
  placeholder?: string;
  texteVide?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  disabled?: boolean;
}

/**
 * Sélecteur avec recherche obligatoire au-delà de 10 options
 * (`docs/02_DESIGN_SYSTEM.md §9.1` — listes d'adhérents, d'agents, de zones).
 * En dessous de 10 options, la recherche reste disponible mais n'est pas
 * indispensable : la liste tient sur un seul écran.
 */
export function SelectRecherche({
  id,
  options,
  valeur,
  onChange,
  placeholder = "Sélectionner…",
  texteVide = "Aucun résultat.",
  ariaInvalid,
  ariaDescribedBy,
  disabled,
}: SelectRechercheProps) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");

  const optionsFiltrees = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    if (!requete) return options;
    return options.filter((option) => option.libelle.toLowerCase().includes(requete));
  }, [options, recherche]);

  const optionSelectionnee = options.find((option) => option.valeur === valeur);

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={ouvert}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!optionSelectionnee && "text-texte-doux")}>
            {optionSelectionnee?.libelle ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-texte-doux" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2" align="start">
        <Input
          autoFocus
          value={recherche}
          onChange={(evenement) => setRecherche(evenement.target.value)}
          placeholder="Rechercher…"
          aria-label="Filtrer les options"
          className="mb-2"
        />
        <ul role="listbox" className="max-h-60 space-y-0.5 overflow-y-auto">
          {optionsFiltrees.length === 0 && <li className="p-2 text-sm text-texte-doux">{texteVide}</li>}
          {optionsFiltrees.map((option) => (
            <li key={option.valeur}>
              <button
                type="button"
                role="option"
                aria-selected={option.valeur === valeur}
                onClick={() => {
                  onChange(option.valeur);
                  setOuvert(false);
                  setRecherche("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-survol",
                  option.valeur === valeur && "font-medium",
                )}
              >
                <Check className={cn("size-4", option.valeur === valeur ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                {option.libelle}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
