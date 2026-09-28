import { Link } from "react-router";
import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { Button } from "@/components/ui/button";
import { useTableauBordDaf } from "@/hooks/useTableauxDeBord";
import { formaterMontant, formaterNombre } from "@/lib/format";

/** `/tableaux-de-bord/daf` — Vision financière interne (UC-DAF-01). */
export function TableauBordDaf() {
  const { data, isLoading, isError, error } = useTableauBordDaf();

  return (
    <CadreTableauBord
      titre="Tableau de bord — Direction administrative et financière"
      sousTitre="File de contrôle, encaissements validés et écarts de caisse."
      chargement={isLoading}
      enErreur={isError}
      erreur={error}
      indicateurs={data?.indicateurs}
      alertes={data?.alertes}
      avertissements={data?.avertissements}
    >
      {data && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link to="/daf">Ouvrir la file de contrôle ({formaterNombre(data.paiementsAControler)})</Link>
            </Button>
            {data.paiementsIncoherence > 0 && (
              <span className="text-texte-doux">
                {formaterNombre(data.paiementsIncoherence)} incohérence(s) signalée(s)
              </span>
            )}
          </div>

          <p className="rounded-lg border border-bordure bg-surface-douce p-4 text-sm text-texte-doux">
            COSITI enregistre les informations de paiement mais <strong>n'exécute aucun mouvement de
            fonds</strong>. Les montants affichés ({formaterMontant(data.montantValide)} validés,{" "}
            {formaterMontant(data.montantAControler)} en attente) sont des encaissements déclarés puis
            contrôlés, jamais un solde de trésorerie.
          </p>
        </>
      )}
    </CadreTableauBord>
  );
}
