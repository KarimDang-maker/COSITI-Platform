import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { Alerte } from "@/components/cositi/alerte";
import { ListeElements } from "@/components/cositi/liste-elements";
import { formaterNombre } from "@/lib/format";
import type { Teinte } from "@/lib/statuts";

/** Forme exacte de `Alerte` (backend, jalon J9). */
export interface AlerteTableauBord {
  readonly code: string;
  readonly niveau: string;
  readonly libelle: string;
  readonly nombre: number;
  readonly chemin: string | null;
}

/**
 * Les couleurs d'état ne sont jamais seules porteuses de l'information : chaque
 * alerte a son icône et son niveau écrit (`docs/02_DESIGN_SYSTEM.md`).
 */
const NIVEAUX: Readonly<Record<string, { teinte: Teinte; icone: typeof Info; libelleNiveau: string }>> = {
  INFO: { teinte: "info", icone: Info, libelleNiveau: "Information" },
  ATTENTION: { teinte: "attention", icone: AlertTriangle, libelleNiveau: "À traiter" },
  CRITIQUE: { teinte: "danger", icone: OctagonAlert, libelleNiveau: "Critique" },
};

interface ListeAlertesProps {
  alertes: readonly AlerteTableauBord[];
}

/**
 * Points nécessitant attention d'un tableau de bord (UC-PCA-06, UC-DG-08,
 * UC-DGA-11, UC-GC-16), au format des lignes riches du gabarit.
 *
 * Une alerte sans écran pour la traiter ne devient pas un lien : un lien mort
 * vaut moins qu'un simple constat.
 */
export function ListeAlertes({ alertes }: ListeAlertesProps) {
  if (alertes.length === 0) {
    return (
      <Alerte teinte="succes">
        <p>Aucun point nécessitant attention.</p>
      </Alerte>
    );
  }

  return (
    <ListeElements
      libelle="Points nécessitant attention"
      elements={alertes.map((alerte) => {
        const niveau = NIVEAUX[alerte.niveau] ?? NIVEAUX.INFO!;
        return {
          cle: alerte.code,
          icone: niveau.icone,
          teinte: niveau.teinte,
          titre: alerte.libelle,
          // Niveau écrit en toutes lettres sous le libellé : la teinte de la pastille n'est qu'un renfort.
          sousTitre: niveau.libelleNiveau,
          valeur: formaterNombre(alerte.nombre),
          chemin: alerte.chemin ?? undefined,
        };
      })}
    />
  );
}
