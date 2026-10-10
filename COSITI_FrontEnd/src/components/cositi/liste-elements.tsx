import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLASSES_PASTILLE_TEINTE, type Teinte } from "@/lib/statuts";

export interface ElementListe {
  /** Clé React stable. */
  cle: string;
  titre: ReactNode;
  /** Date, référence, précision — une ligne. */
  sousTitre?: ReactNode;
  icone?: LucideIcon;
  /**
   * Teinte de la pastille d'icône. Absente = pastille d'identité (vert foncé,
   * icône orange) du gabarit, qui ne porte aucun état.
   */
  teinte?: Teinte;
  /** Valeur alignée à droite : montant, compteur. */
  valeur?: ReactNode;
  /** Sous la valeur : badge de statut, unité. */
  complement?: ReactNode;
  /** Écran de destination. Sans chemin ni `onActiver`, la ligne n'est pas interactive. */
  chemin?: string;
  onActiver?: () => void;
  /** Nom accessible de la ligne interactive, si le titre seul ne suffit pas. */
  libelleAction?: string;
}

interface ListeElementsProps {
  elements: readonly ElementListe[];
  /** Nom accessible de la liste. */
  libelle?: string;
  className?: string;
}

const CLASSES_LIGNE =
  "flex w-full items-center gap-3.5 rounded-lg bg-fond px-4 py-3.5 text-left transition-colors duration-(--duree-rapide)";
const CLASSES_INTERACTIVE = "min-h-10 hover:bg-surface-survol focus-visible:ring-2 focus-visible:ring-anneau focus-visible:outline-none";

/**
 * Liste de lignes riches du gabarit (« Transaction ») : pastille d'icône,
 * titre, sous-titre, valeur à droite. Sert aux derniers paiements, au travail
 * en attente, aux points d'attention. Une ligne sans écran de destination
 * n'est pas un lien (un lien mort vaut moins qu'un simple constat).
 */
export function ListeElements({ elements, libelle, className }: ListeElementsProps) {
  return (
    <ul aria-label={libelle} className={cn("flex flex-col gap-2.5", className)}>
      {elements.map((element) => {
        const Icone = element.icone;
        const interactive = element.chemin !== undefined || element.onActiver !== undefined;
        const contenu = (
          <>
            {Icone && (
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full",
                  CLASSES_PASTILLE_TEINTE[element.teinte ?? "identite"],
                )}
              >
                <Icone className="size-5" aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              {/* Jamais tronqué : un libellé coupé masque une information. */}
              <span className="block text-sm font-bold break-words text-texte">{element.titre}</span>
              {element.sousTitre && (
                <span className="block text-xs break-words text-texte-doux-fort">{element.sousTitre}</span>
              )}
            </span>
            {(element.valeur !== undefined || element.complement !== undefined) && (
              <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                {element.valeur !== undefined && (
                  <span className="chiffre text-sm font-bold text-texte">{element.valeur}</span>
                )}
                {element.complement}
              </span>
            )}
            {interactive && <ChevronRight className="size-4 shrink-0 text-texte-doux" aria-hidden="true" />}
          </>
        );

        return (
          <li key={element.cle}>
            {element.chemin ? (
              <Link
                to={element.chemin}
                aria-label={element.libelleAction}
                className={cn(CLASSES_LIGNE, CLASSES_INTERACTIVE)}
                onClick={element.onActiver}
              >
                {contenu}
              </Link>
            ) : element.onActiver ? (
              <button
                type="button"
                aria-label={element.libelleAction}
                className={cn(CLASSES_LIGNE, CLASSES_INTERACTIVE)}
                onClick={element.onActiver}
              >
                {contenu}
              </button>
            ) : (
              <div className={CLASSES_LIGNE}>{contenu}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
