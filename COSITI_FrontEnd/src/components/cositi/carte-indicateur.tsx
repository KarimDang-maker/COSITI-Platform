import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formaterEvolution, formaterMontant, formaterNombre, formaterPourcentage } from "@/lib/format";

/** Forme exacte de `IndicateurCle` (backend, jalon J9). */
export interface IndicateurCle {
  readonly cle: string;
  readonly libelle: string;
  readonly valeur: number;
  readonly unite: string;
}

/**
 * Met en forme une valeur selon l'unité **déclarée par le serveur**. Le serveur
 * ne renvoie jamais de chaîne déjà formatée : sans cela, la même donnée
 * s'afficherait différemment selon l'endpoint qui l'a produite.
 *
 * `POURCENTAGE` attend un ratio (0,331) et non un nombre déjà multiplié (33,1) —
 * c'est ce que `formaterPourcentage` consomme.
 */
export function formaterIndicateur(indicateur: IndicateurCle): string {
  switch (indicateur.unite) {
    case "MONTANT":
      return formaterMontant(indicateur.valeur);
    case "POURCENTAGE":
      return formaterPourcentage(indicateur.valeur);
    case "JOURS":
      return `${formaterNombre(indicateur.valeur)} j`;
    default:
      return formaterNombre(indicateur.valeur);
  }
}

/* ==========================================================================
   Tendance
   ======================================================================== */

interface TendanceProps {
  /** Ratio signé **renvoyé par l'API** (0,35 = +35 %). Le client ne le calcule jamais. */
  evolution: number;
  /** Sens qui est une bonne nouvelle : une hausse des retards n'en est pas une. */
  sensFavorable?: "hausse" | "baisse";
  /** Référence de comparaison, obligatoire : « par rapport à août 2026 ». */
  reference: string;
  /** Sur la carte principale (fond vert foncé). */
  inversee?: boolean;
}

/**
 * Évolution d'un indicateur (gabarit : `trend-badge`). Le signe et la
 * référence sont toujours écrits ; la teinte n'est qu'un renfort, et reste
 * neutre quand l'écran ne dit pas quel sens est favorable.
 */
export function Tendance({ evolution, sensFavorable, reference, inversee = false }: TendanceProps) {
  const sens = evolution > 0 ? "hausse" : evolution < 0 ? "baisse" : "stable";
  const Icone = sens === "hausse" ? ArrowUpRight : sens === "baisse" ? ArrowDownRight : Minus;
  const favorable = sensFavorable !== undefined && sens === sensFavorable;
  const defavorable = sensFavorable !== undefined && sens !== "stable" && sens !== sensFavorable;

  return (
    <p
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        inversee
          ? "text-surface-inversee-contenu"
          : favorable
            ? "text-succes-fort"
            : defavorable
              ? "text-danger-fort"
              : "text-texte-doux",
      )}
    >
      <Icone className={cn("size-4", inversee && "text-surface-inversee-accent")} aria-hidden="true" />
      <span className="chiffre">{formaterEvolution(evolution)}</span>
      <span className={inversee ? "text-surface-inversee-doux" : "font-medium text-texte-doux"}>{reference}</span>
    </p>
  );
}

/* ==========================================================================
   Carte
   ======================================================================== */

interface CarteIndicateurProps {
  indicateur: IndicateurCle;
  /**
   * Met la carte en avant (surface inversée vert foncé) : réservé à
   * l'indicateur central d'un dashboard — le taux d'activation (`docs/02 §11`).
   */
  principal?: boolean;
  /** Période de référence, quand l'API la fournit : « Septembre 2026 ». */
  periode?: string;
  /** Évolution, quand l'API la fournit. */
  tendance?: Omit<TendanceProps, "inversee">;
  /** Écran qui détaille l'indicateur. */
  lien?: { libelle: string; chemin: string };
  /** `MenuActions` de la carte. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Valeur mise en avant d'un tableau de bord (gabarit : `card-stat`, et
 * `alert-green-card` pour l'indicateur principal).
 *
 * Une valeur unique n'est pas un graphique : elle se lit mieux en chiffre, en
 * grand, avec son libellé. Aucun graphique n'est donc dessiné ici.
 */
export function CarteIndicateur({
  indicateur,
  principal = false,
  periode,
  tendance,
  lien,
  actions,
  className,
}: CarteIndicateurProps) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col gap-3 rounded-2xl p-6",
        principal
          ? "bg-surface-inversee text-surface-inversee-contenu shadow-flottante"
          : "bg-surface text-texte shadow-carte",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          {principal && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-nav-actif-fond px-2.5 py-0.5 text-2xs leading-5 font-bold">
              <span className="size-1.5 rounded-full bg-surface-inversee-accent" aria-hidden="true" />
              Indicateur clé
            </span>
          )}
          <p className={cn("text-sm font-medium", principal ? "text-surface-inversee-doux" : "text-texte-doux")}>
            {indicateur.libelle}
          </p>
        </div>
        {actions}
      </div>

      <p
        className={cn(
          "chiffre leading-none font-extrabold tracking-valeur",
          principal ? "text-4xl" : "text-3xl text-texte",
        )}
      >
        {formaterIndicateur(indicateur)}
      </p>

      {(tendance || periode) && (
        <div className="space-y-1">
          {tendance && <Tendance {...tendance} inversee={principal} />}
          {periode && (
            <p className={cn("text-xs", principal ? "text-surface-inversee-doux" : "text-texte-doux")}>{periode}</p>
          )}
        </div>
      )}

      {lien && (
        <Link
          to={lien.chemin}
          className={cn(
            "group mt-auto inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold",
            principal ? "text-surface-inversee-contenu hover:underline" : "text-primaire hover:underline",
          )}
        >
          {lien.libelle}
          <ArrowRight
            className={cn(
              "size-4 transition-transform duration-(--duree-rapide) group-hover:translate-x-0.5",
              principal && "text-surface-inversee-accent",
            )}
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}

/* ==========================================================================
   Rangée
   ======================================================================== */

interface RangeeIndicateursProps {
  indicateurs: readonly IndicateurCle[];
  /** Clé de l'indicateur à mettre en avant, généralement `tauxActivation`. */
  clePrincipale?: string;
}

const COLONNES: Readonly<Record<number, string>> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  // Cinq cartes sur une ligne plutôt qu'une carte orpheline sous une rangée de quatre.
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-2 lg:grid-cols-3",
};

/**
 * Rangée d'indicateurs d'un tableau de bord. L'indicateur principal est placé
 * en premier, en haut à gauche (`docs/02 §11`), quel que soit l'ordre de la
 * réponse : c'est un ordre d'affichage, pas un calcul.
 */
export function RangeeIndicateurs({ indicateurs, clePrincipale }: RangeeIndicateursProps) {
  if (indicateurs.length === 0) return null;
  const ordonnes = clePrincipale
    ? [
        ...indicateurs.filter((indicateur) => indicateur.cle === clePrincipale),
        ...indicateurs.filter((indicateur) => indicateur.cle !== clePrincipale),
      ]
    : indicateurs;

  return (
    <div className={cn("grid gap-6", COLONNES[ordonnes.length] ?? "sm:grid-cols-2 xl:grid-cols-4")}>
      {ordonnes.map((indicateur) => (
        <CarteIndicateur
          key={indicateur.cle}
          indicateur={indicateur}
          principal={indicateur.cle === clePrincipale}
        />
      ))}
    </div>
  );
}
