import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { GraphiqueZones } from "@/components/cositi/graphique-zones";
import { useTableauBordPca } from "@/hooks/useTableauxDeBord";

/** `/tableaux-de-bord/pca` — Supervision globale et rapports DAF (Roles des acteurs.md §3). */
export function TableauBordPca() {
  const { data, isLoading, isError, error } = useTableauBordPca();

  return (
    <CadreTableauBord
      titre="Tableau de bord — PCA"
      sousTitre="Vision globale de l'activité et rapports transmis par le DAF."
      chargement={isLoading}
      enErreur={isError}
      erreur={error}
      indicateurs={data?.indicateurs}
      clePrincipale="tauxActivation"
      alertes={data?.alertes}
      avertissements={data?.avertissements}
    >
      {data && (
        <>
          <GraphiqueZones zones={data.zones} />
          <p className="text-texte-doux">
            {data.rapportsDafDisponibles} rapport(s) DAF transmis et consultables.
          </p>
        </>
      )}
    </CadreTableauBord>
  );
}
