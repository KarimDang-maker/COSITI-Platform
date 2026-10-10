import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendrier } from "@/components/cositi/calendrier";
import { cn } from "@/lib/utils";
import { formaterDateLongue } from "@/lib/format";

export interface Periode {
  du: string;
  au: string;
}

interface SelecteurPeriodeProps {
  /** Période choisie ; absente = période par défaut de l'API. */
  periode?: Periode;
  onChange: (periode: Periode | undefined) => void;
  /**
   * Ce que l'API applique sans période — écrit tel quel, jamais recalculé ici
   * (`AGENTS.md` règle 2). Ex. « Mois en cours ».
   */
  libelleParDefaut: string;
  min?: string;
  max?: string;
  className?: string;
}

/**
 * Sélecteur de période du gabarit (`btn-date-picker` + calendrier en mode
 * plage) : pastille blanche, icône calendrier, période écrite en toutes
 * lettres, flèche. Le calendrier se ferme dès que la période est complète.
 */
export function SelecteurPeriode({ periode, onChange, libelleParDefaut, min, max, className }: SelecteurPeriodeProps) {
  const [ouvert, setOuvert] = useState(false);
  const libelle = periode ? `${formaterDateLongue(periode.du)} – ${formaterDateLongue(periode.au)}` : libelleParDefaut;

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Période : ${libelle}. Modifier la période`}
          className={cn(
            "group inline-flex h-10 items-center gap-3 rounded-full border border-bordure bg-surface px-5 text-sm font-semibold text-texte shadow-legere transition-colors duration-(--duree-rapide) outline-none hover:bg-surface-survol focus-visible:ring-2 focus-visible:ring-anneau focus-visible:ring-offset-2",
            className,
          )}
        >
          <CalendarDays className="size-4 text-titre" aria-hidden="true" />
          <span className="chiffre">{libelle}</span>
          <ChevronDown
            className="size-4 text-texte-doux transition-transform duration-(--duree-rapide) group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-auto overflow-hidden p-0">
        <Calendrier
          mode="periode"
          libelle="Choisir la période"
          debut={periode?.du}
          fin={periode?.au}
          min={min}
          max={max}
          onSelectionner={(du, au) => {
            if (!au) return;
            onChange({ du, au });
            setOuvert(false);
          }}
        />
        {periode && (
          <div className="border-t border-bordure px-3.5 py-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOuvert(false);
              }}
              className="rounded-sm text-sm font-semibold text-primaire hover:underline focus-visible:ring-2 focus-visible:ring-anneau focus-visible:outline-none"
            >
              Revenir à : {libelleParDefaut}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
