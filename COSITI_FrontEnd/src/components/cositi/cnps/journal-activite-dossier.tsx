import { EtatVide } from "@/components/cositi/etat-vide";
import { formaterDateHeure } from "@/lib/format";
import { definitionStatut } from "@/lib/statuts";
import type { HistoriqueDossierPrestationCnps } from "@/api/cnps";

interface JournalActiviteDossierProps {
  entrees: readonly HistoriqueDossierPrestationCnps[];
}

/**
 * Journal d'activité du dossier — jamais `/audit` (réservé PCA/Super Administrateur). Ne trace que les
 * transitions de statut : le backend n'enregistre pas de journal libre (« réception de pièce », « relance
 * téléphonique ») à ce jour — afficher fidèlement ce que l'API fournit plutôt que d'inventer des types
 * d'événements supplémentaires.
 */
export function JournalActiviteDossier({ entrees }: JournalActiviteDossierProps) {
  if (entrees.length === 0) {
    return <EtatVide titre="Aucune activité enregistrée" description="Le journal se remplit à chaque changement de statut du dossier." />;
  }

  return (
    <ul className="space-y-2">
      {entrees.map((entree) => {
        const apres = definitionStatut("dossierPrestationCnps", entree.statutApres);
        const avant = entree.statutAvant ? definitionStatut("dossierPrestationCnps", entree.statutAvant) : null;
        return (
          <li key={entree.id} className="flex items-start justify-between gap-3 rounded-lg border border-bordure bg-surface p-3">
            <div>
              <p className="text-sm text-texte">
                {avant ? `Statut passé de « ${avant.libelle} » à « ${apres.libelle} »` : `Ouverture — statut « ${apres.libelle} »`}
              </p>
              {entree.commentaire && <p className="mt-1 text-sm text-texte-doux">{entree.commentaire}</p>}
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs text-texte-doux">{formaterDateHeure(entree.horodatage)}</span>
          </li>
        );
      })}
    </ul>
  );
}
