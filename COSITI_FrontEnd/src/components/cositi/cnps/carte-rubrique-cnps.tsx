import { Building2, Heart, Layers, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RubriqueCnps } from "@/api/cnps";

export type RubriqueSelection = RubriqueCnps | "TOUS";

interface DefinitionRubrique {
  readonly libelle: string;
  readonly badge: string;
  readonly description: string;
  readonly icone: typeof Heart;
}

/**
 * Quatre rubriques du référentiel CNPS (PF/RP/PVID) plus la vue transverse « Tous les Dossiers CNPS » —
 * wording repris de `Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V2.md` §5-§8.
 */
export const DEFINITIONS_RUBRIQUE: Readonly<Record<RubriqueSelection, DefinitionRubrique>> = {
  PF: {
    libelle: "Prestations Familiales",
    badge: "PF (Code 01)",
    description: "Enfants, scolarité, maternité & naissances",
    icone: Heart,
  },
  RP: {
    libelle: "Risques Professionnels",
    badge: "RP (Code 02)",
    description: "Accidents du travail, soins & rentes",
    icone: ShieldCheck,
  },
  PVID: {
    libelle: "PVID (Retraite & Décès)",
    badge: "PVID (Code 03)",
    description: "Pension vieillesse, invalidité & réversion",
    icone: Building2,
  },
  TOUS: {
    libelle: "Tous les Dossiers CNPS",
    badge: "Total Global",
    description: "Vue transverse multi rubriques",
    icone: Layers,
  },
};

interface CarteRubriqueCnpsProps {
  rubrique: RubriqueSelection;
  /**
   * Total de dossiers pour cette rubrique. Somme, côté client, des `nombreDossiers` (comptés par le
   * serveur, `OffreCnpsDto`) de chaque offre de la rubrique — une agrégation arithmétique de chiffres déjà
   * authoritatifs, jamais un recalcul de règle métier : aucun endpoint dédié au total par rubrique
   * n'existe aujourd'hui.
   */
  total: number;
  selectionnee: boolean;
  onSelectionner: () => void;
}

export function CarteRubriqueCnps({ rubrique, total, selectionnee, onSelectionner }: CarteRubriqueCnpsProps) {
  const definition = DEFINITIONS_RUBRIQUE[rubrique];
  const Icone = definition.icone;
  return (
    <button
      type="button"
      onClick={onSelectionner}
      aria-pressed={selectionnee}
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-surface p-4 text-left transition-colors",
        selectionnee ? "border-primaire ring-1 ring-primaire" : "border-bordure hover:bg-surface-survol",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Icone className="size-5 text-primaire" aria-hidden="true" />
        <span className="ref rounded-sm border border-bordure bg-surface-douce px-1.5 py-0.5 text-xs">
          {definition.badge}
        </span>
      </div>
      <p className="font-semibold text-texte">{definition.libelle}</p>
      <p className="chiffre text-2xl font-bold text-titre">{total}</p>
      <p className="text-sm text-texte-doux">{definition.description}</p>
    </button>
  );
}
