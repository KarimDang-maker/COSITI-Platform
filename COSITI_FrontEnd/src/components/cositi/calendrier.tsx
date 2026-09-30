import { useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formaterDateLongue, formaterDateSaisie } from "@/lib/format";

/*
 * Calendrier du gabarit « Spark Admin » (thème flatpickr du gabarit, repris
 * trait pour trait) écrit sans dépendance : flatpickr n'est pas au journal des
 * dépendances vérifiées (`docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md`), et un
 * calendrier ne justifie pas d'élargir la surface npm.
 *
 * Les dates circulent en chaînes ISO courtes (`2026-01-14`), comme `<input
 * type="date">` et comme l'API. Toute l'arithmétique se fait en UTC pur : un
 * jour calendaire n'a pas de fuseau, seul « aujourd'hui » est résolu dans le
 * fuseau de Douala (`formaterDateSaisie`).
 */

/* ==========================================================================
   Dates ISO
   ======================================================================== */

interface JourCalendaire {
  annee: number;
  /** 0 = janvier. */
  mois: number;
  jour: number;
}

function deux(n: number): string {
  return String(n).padStart(2, "0");
}

function versIso({ annee, mois, jour }: JourCalendaire): string {
  const d = new Date(Date.UTC(annee, mois, jour));
  return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}-${deux(d.getUTCDate())}`;
}

function depuisIso(iso: string | undefined): JourCalendaire | null {
  const trouve = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!trouve) return null;
  return { annee: Number(trouve[1]), mois: Number(trouve[2]) - 1, jour: Number(trouve[3]) };
}

function decaler(iso: string, jours: number): string {
  const j = depuisIso(iso)!;
  return versIso({ ...j, jour: j.jour + jours });
}

function decalerMois(iso: string, mois: number): string {
  const j = depuisIso(iso)!;
  const dernierJour = new Date(Date.UTC(j.annee, j.mois + mois + 1, 0)).getUTCDate();
  return versIso({ annee: j.annee, mois: j.mois + mois, jour: Math.min(j.jour, dernierJour) });
}

/** Rang dans la semaine, lundi = 0 (usage français). */
function rangSemaine(iso: string): number {
  const j = depuisIso(iso)!;
  return (new Date(Date.UTC(j.annee, j.mois, j.jour)).getUTCDay() + 6) % 7;
}

const NOMS_MOIS = Array.from({ length: 12 }, (_, mois) => {
  const nom = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2026, mois, 1)),
  );
  return nom.charAt(0).toUpperCase() + nom.slice(1);
});

const JOURS_SEMAINE = [
  { court: "Lun", long: "lundi" },
  { court: "Mar", long: "mardi" },
  { court: "Mer", long: "mercredi" },
  { court: "Jeu", long: "jeudi" },
  { court: "Ven", long: "vendredi" },
  { court: "Sam", long: "samedi" },
  { court: "Dim", long: "dimanche" },
] as const;

/** Six semaines complètes, lundi en tête : la grille ne change jamais de hauteur (comme flatpickr). */
function grilleDuMois(annee: number, mois: number): string[] {
  const premier = versIso({ annee, mois, jour: 1 });
  const debut = decaler(premier, -rangSemaine(premier));
  return Array.from({ length: 42 }, (_, i) => decaler(debut, i));
}

/* ==========================================================================
   Composant
   ======================================================================== */

export interface CalendrierProps {
  /** `simple` : un jour. `periode` : un premier clic fixe le début, le second la fin. */
  mode?: "simple" | "periode";
  /** Jour choisi (simple) ou début de période. */
  debut?: string;
  fin?: string;
  /** `fin` n'est fourni qu'en mode période, une fois la période complète. */
  onSelectionner: (debut: string, fin?: string) => void;
  /** Bornes ISO incluses, comme les attributs `min`/`max` d'un champ date. */
  min?: string;
  max?: string;
  /** Nom accessible de la grille. */
  libelle?: string;
  className?: string;
}

/**
 * Grille mensuelle : navigation par mois (flèches rondes, menu du mois, année
 * saisissable), jours de 38 px en pastille, début et fin de période en vert
 * foncé, jours intermédiaires sur bande vert clair, jours des mois voisins
 * atténués. Clavier : flèches (jour, semaine), Début/Fin (semaine),
 * Page préc./suiv. (mois), Entrée ou Espace pour choisir.
 */
export function Calendrier({
  mode = "simple",
  debut,
  fin,
  onSelectionner,
  min,
  max,
  libelle = "Calendrier",
  className,
}: CalendrierProps) {
  const aujourdhui = formaterDateSaisie(new Date());
  const [focus, setFocus] = useState<string>(() => debut ?? aujourdhui);
  const [survol, setSurvol] = useState<string | undefined>();
  // Premier clic d'une période : conservé ici tant que la période n'est pas complète.
  const [debutEnCours, setDebutEnCours] = useState<string | undefined>();

  const affiche = depuisIso(focus)!;
  const jours = grilleDuMois(affiche.annee, affiche.mois);

  const debutAffiche = mode === "periode" ? (debutEnCours ?? debut) : debut;
  const finAffichee =
    mode === "periode" ? (debutEnCours ? (survol && survol >= debutEnCours ? survol : undefined) : fin) : undefined;

  function horsBornes(iso: string): boolean {
    return (min !== undefined && iso < min) || (max !== undefined && iso > max);
  }

  function choisir(iso: string) {
    if (horsBornes(iso)) return;
    setFocus(iso);
    if (mode === "simple") {
      onSelectionner(iso);
      return;
    }
    if (!debutEnCours) {
      setDebutEnCours(iso);
      return;
    }
    // Second clic antérieur au premier : les bornes s'échangent, comme dans le gabarit.
    const [a, b] = iso < debutEnCours ? [iso, debutEnCours] : [debutEnCours, iso];
    setDebutEnCours(undefined);
    setSurvol(undefined);
    onSelectionner(a, b);
  }

  function clavier(evenement: KeyboardEvent<HTMLButtonElement>, iso: string) {
    const deplacements: Record<string, () => string> = {
      ArrowLeft: () => decaler(iso, -1),
      ArrowRight: () => decaler(iso, 1),
      ArrowUp: () => decaler(iso, -7),
      ArrowDown: () => decaler(iso, 7),
      Home: () => decaler(iso, -rangSemaine(iso)),
      End: () => decaler(iso, 6 - rangSemaine(iso)),
      PageUp: () => decalerMois(iso, -1),
      PageDown: () => decalerMois(iso, 1),
    };
    const deplacement = deplacements[evenement.key];
    if (!deplacement) return;
    evenement.preventDefault();
    const cible = deplacement();
    setFocus(cible);
    if (mode === "periode" && debutEnCours) setSurvol(cible);
    // Le bouton du nouveau jour n'existe qu'après le rendu (changement de mois possible).
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-calendrier-jour="${cible}"]`)?.focus();
    });
  }

  function allerAuMois(mois: number, annee = affiche.annee) {
    setFocus(versIso({ annee, mois, jour: 1 }));
  }

  return (
    <div className={cn("w-81 px-3.5 pt-4 pb-2.5 select-none", className)}>
      {/* En-tête : mois précédent, mois + année, mois suivant. */}
      <div className="relative flex h-10 items-center justify-center gap-1">
        <button
          type="button"
          aria-label="Mois précédent"
          onClick={() => setFocus(decalerMois(focus, -1))}
          className="absolute left-0 flex size-8 items-center justify-center rounded-full text-texte transition-colors hover:bg-fond focus-visible:ring-2 focus-visible:ring-anneau focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <select
          aria-label="Mois"
          value={affiche.mois}
          onChange={(evenement) => allerAuMois(Number(evenement.target.value))}
          className="cursor-pointer appearance-none rounded-md bg-transparent px-2 py-1 text-base font-bold text-texte outline-none hover:bg-fond focus-visible:ring-2 focus-visible:ring-anneau"
        >
          {NOMS_MOIS.map((nom, index) => (
            <option key={nom} value={index}>
              {nom}
            </option>
          ))}
        </select>
        <input
          aria-label="Année"
          type="number"
          min={1900}
          max={2100}
          value={affiche.annee}
          onChange={(evenement) => {
            const annee = Number(evenement.target.value);
            if (annee >= 1900 && annee <= 2100) allerAuMois(affiche.mois, annee);
          }}
          className="w-16 cursor-pointer rounded-md bg-transparent px-1.5 py-1 text-base font-bold text-texte outline-none [appearance:textfield] hover:bg-fond focus-visible:ring-2 focus-visible:ring-anneau [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Mois suivant"
          onClick={() => setFocus(decalerMois(focus, 1))}
          className="absolute right-0 flex size-8 items-center justify-center rounded-full text-texte transition-colors hover:bg-fond focus-visible:ring-2 focus-visible:ring-anneau focus-visible:outline-none"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <table role="grid" aria-label={libelle} className="mt-2.5 w-full border-collapse" onMouseLeave={() => setSurvol(undefined)}>
        <thead>
          <tr className="h-8">
            {JOURS_SEMAINE.map((jour) => (
              <th key={jour.court} scope="col" abbr={jour.long} className="text-xs font-bold text-texte-doux">
                {jour.court}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, semaine) => (
            <tr key={semaine}>
              {jours.slice(semaine * 7, semaine * 7 + 7).map((iso) => {
                const j = depuisIso(iso)!;
                const duMois = j.mois === affiche.mois;
                const estDebut = iso === debutAffiche;
                const estFin = iso === finAffichee;
                const dansPeriode =
                  debutAffiche !== undefined && finAffichee !== undefined && iso > debutAffiche && iso < finAffichee;
                const extremite = estDebut || estFin;
                const bande = finAffichee !== undefined && finAffichee !== debutAffiche;
                const desactive = horsBornes(iso);

                return (
                  <td
                    key={iso}
                    role="gridcell"
                    aria-selected={extremite || dansPeriode}
                    className="relative h-10 p-0 py-px text-center"
                  >
                    {/* Bande de période, continue d'une cellule à l'autre. */}
                    {dansPeriode && <span aria-hidden="true" className="absolute inset-x-0 inset-y-px bg-primaire-doux" />}
                    {estDebut && bande && (
                      <span aria-hidden="true" className="absolute inset-y-px right-0 left-1/2 bg-primaire-doux" />
                    )}
                    {estFin && bande && (
                      <span aria-hidden="true" className="absolute inset-y-px right-1/2 left-0 bg-primaire-doux" />
                    )}
                    <button
                      type="button"
                      data-calendrier-jour={iso}
                      tabIndex={iso === focus ? 0 : -1}
                      disabled={desactive}
                      aria-label={formaterDateLongue(iso)}
                      aria-current={iso === aujourdhui ? "date" : undefined}
                      onClick={() => choisir(iso)}
                      onMouseEnter={() => mode === "periode" && debutEnCours && setSurvol(iso)}
                      onKeyDown={(evenement) => {
                        if (evenement.key === "Enter" || evenement.key === " ") {
                          evenement.preventDefault();
                          choisir(iso);
                          return;
                        }
                        clavier(evenement, iso);
                      }}
                      className={cn(
                        "relative z-10 mx-auto flex size-9.5 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-(--duree-rapide) outline-none focus-visible:ring-2 focus-visible:ring-anneau focus-visible:ring-offset-1",
                        extremite
                          ? "bg-titre text-surface shadow-selection"
                          : dansPeriode
                            ? "text-titre hover:bg-surface/60"
                            : duMois
                              ? "text-texte hover:bg-fond hover:text-titre"
                              : "text-texte-inactif hover:bg-fond",
                        desactive && "cursor-not-allowed text-texte-inactif opacity-50 hover:bg-transparent",
                      )}
                    >
                      {j.jour}
                      {iso === aujourdhui && !extremite && (
                        <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-marque" />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {mode === "periode" && debutEnCours && (
        <p className="mt-2 text-center text-xs text-texte-doux" aria-live="polite">
          Choisissez la date de fin.
        </p>
      )}
    </div>
  );
}
