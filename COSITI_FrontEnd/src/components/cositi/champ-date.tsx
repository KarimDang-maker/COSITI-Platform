import { useRef, useState, type ComponentProps, type Ref } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendrier } from "@/components/cositi/calendrier";
import { cn } from "@/lib/utils";

type ChampDateProps = Omit<ComponentProps<typeof Input>, "type">;

function versChaine(valeur: string | number | undefined): string | undefined {
  return valeur === undefined ? undefined : String(valeur);
}

/**
 * Champ date du gabarit : un vrai `<input type="date">` — saisie au clavier
 * conservée, compatible `react-hook-form` (`register`) comme avec un état
 * contrôlé — accompagné du calendrier du gabarit, ouvert par le bouton à
 * droite. Le sélecteur natif du navigateur est masqué pour n'en montrer qu'un.
 */
export function ChampDate({ ref, className, min, max, disabled, ...props }: ChampDateProps) {
  const interne = useRef<HTMLInputElement | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [valeurOuverture, setValeurOuverture] = useState<string>();

  function relier(element: HTMLInputElement | null) {
    interne.current = element;
    const externe = ref as Ref<HTMLInputElement> | undefined;
    if (typeof externe === "function") externe(element);
    else if (externe) externe.current = element;
  }

  /**
   * Écrit la valeur comme le ferait une saisie : le mutateur natif puis un
   * évènement `input`, que React traduit en `onChange` — `register` comme un
   * état contrôlé reçoivent donc la nouvelle date par leur chemin habituel.
   */
  function choisir(iso: string) {
    const champ = interne.current;
    if (!champ) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(champ, iso);
    champ.dispatchEvent(new Event("input", { bubbles: true }));
    setOuvert(false);
    champ.focus();
  }

  return (
    <Popover
      open={ouvert}
      onOpenChange={(valeur) => {
        if (valeur) setValeurOuverture(interne.current?.value || undefined);
        setOuvert(valeur);
      }}
    >
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            ref={relier}
            type="date"
            min={min}
            max={max}
            disabled={disabled}
            className={cn("pr-12 [&::-webkit-calendar-picker-indicator]:hidden", className)}
            {...props}
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Ouvrir le calendrier"
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-texte-doux transition-colors hover:text-primaire focus-visible:ring-2 focus-visible:ring-anneau focus-visible:outline-none disabled:pointer-events-none"
            >
              <CalendarDays className="size-5" aria-hidden="true" />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent align="end" sideOffset={8} className="w-auto overflow-hidden p-0">
        <Calendrier
          mode="simple"
          debut={valeurOuverture}
          min={versChaine(min)}
          max={versChaine(max)}
          onSelectionner={choisir}
        />
      </PopoverContent>
    </Popover>
  );
}
