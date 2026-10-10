import { BadgeStatut } from "@/components/cositi/badge-statut";
import { BarreProgression } from "@/components/cositi/barre-progression";
import type { ResumeParcours, SituationParcours } from "@/api/parcoursCnps";
import { formaterDate, formaterMontant, formaterNombre } from "@/lib/format";

/**
 * Cumul cotisé face au quota de l'étape en cours. Les montants (cumul, quotas, reste à cotiser) viennent tous du
 * serveur ; la barre n'est qu'un rapport d'affichage entre deux valeurs serveur (`BarreProgression`).
 */
export function CumulQuota({ situation, resume }: { situation: SituationParcours; resume?: ResumeParcours }) {
  if (!resume) return <span className="chiffre">{formaterMontant(situation.cumulCotise)}</span>;
  const avantPreimmat = situation.etape === "NON_ELIGIBLE" || situation.etape === "ELIGIBLE_PREIMMAT";
  const quota = avantPreimmat ? resume.quotaPreimmat : resume.quotaImmat;
  const reste = avantPreimmat ? situation.resteAvantPreimmat : situation.resteAvantImmat;
  return (
    <BarreProgression
      className="min-w-56"
      libelle={`${formaterMontant(situation.cumulCotise)} sur ${formaterMontant(quota)}`}
      ratio={quota > 0 ? situation.cumulCotise / quota : 0}
      valeur={reste > 0 ? `Reste ${formaterMontant(reste)}` : "Quota atteint"}
      teinte={reste > 0 ? "marque" : "primaire"}
    />
  );
}

/** Retard de vague et report à la vague suivante, tels que signalés par le serveur. */
export function AlertesVague({ situation }: { situation: SituationParcours }) {
  if (!situation.enRetard && !situation.reporte) return <span className="text-texte-doux">—</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {situation.enRetard && <BadgeStatut domaine="alerteParcoursCnps" code="EN_RETARD" />}
      {situation.reporte && (
        <>
          <BadgeStatut domaine="alerteParcoursCnps" code="REPORTE" />
          {situation.nbReports > 1 && <span className="chiffre text-xs text-texte-doux-fort">× {formaterNombre(situation.nbReports)}</span>}
        </>
      )}
    </span>
  );
}

/**
 * Délai de dépôt du dossier physique : jours restants (alerte quand le serveur déclare le délai dépassé), puis, une
 * fois déposé, date et CPS. Rien n'est calculé ici — `joursRestantsDepot` et `horsDelaiDepot` sont servis.
 */
export function SuiviDepot({ situation }: { situation: SituationParcours }) {
  if (situation.etape === "PREIMMATRICULE") {
    if (situation.horsDelaiDepot) {
      return (
        <span className="flex flex-col gap-1">
          <BadgeStatut domaine="alerteParcoursCnps" code="HORS_DELAI_DEPOT" />
          {situation.dateLimiteDepot && (
            <span className="text-xs text-texte-doux-fort">Limite : {formaterDate(situation.dateLimiteDepot)}</span>
          )}
        </span>
      );
    }
    return (
      <span className="flex flex-col">
        <span className="chiffre font-semibold">
          {situation.joursRestantsDepot === null ? "—" : `${formaterNombre(situation.joursRestantsDepot)} j restants`}
        </span>
        {situation.dateLimiteDepot && (
          <span className="text-xs text-texte-doux-fort">Limite : {formaterDate(situation.dateLimiteDepot)}</span>
        )}
      </span>
    );
  }
  if (situation.etape === "DOSSIER_DEPOSE" || situation.etape === "IMMATRICULE") {
    return (
      <span className="flex flex-col gap-1">
        <span>
          Déposé le {formaterDate(situation.dateDepotCps)}
          {situation.cps && <span className="text-texte-doux-fort"> — {situation.cps}</span>}
        </span>
        {situation.depotHorsDelai && <BadgeStatut domaine="alerteParcoursCnps" code="DEPOT_HORS_DELAI" />}
      </span>
    );
  }
  return <span className="text-texte-doux">—</span>;
}

/** Pièces d'archivage manquantes (dont bloquantes) du dossier CNPS ; « — » tant qu'aucun dossier n'est ouvert. */
export function PiecesManquantes({ situation }: { situation: SituationParcours }) {
  if (!situation.dossierId) return <span className="text-texte-doux">—</span>;
  if (situation.piecesManquantes === 0) return <span className="text-succes-fort">Aucune</span>;
  return (
    <span className="flex flex-col">
      <span className="chiffre font-semibold text-attention-fort">{formaterNombre(situation.piecesManquantes)}</span>
      {situation.piecesBloquantes > 0 && (
        <span className="text-xs text-texte-doux-fort">dont {formaterNombre(situation.piecesBloquantes)} bloquante(s)</span>
      )}
    </span>
  );
}
