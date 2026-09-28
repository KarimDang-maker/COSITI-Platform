import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { GraphiqueZones } from "@/components/cositi/graphique-zones";
import { useTableauBordDg } from "@/hooks/useTableauxDeBord";
import { formaterNombre } from "@/lib/format";

/** `/tableaux-de-bord/dg` — Pilotage général, avec le suivi des retards (Roles des acteurs.md §4). */
export function TableauBordDg() {
  const { data, isLoading, isError, error } = useTableauBordDg();

  return (
    <CadreTableauBord
      titre="Tableau de bord — Direction générale"
      sousTitre="Adhérents, collectes, retards et activité des zones."
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
          <p className="text-texte-doux">
            {formaterNombre(data.adherentsEnRetard)} adhérent(s) actuellement en retard de cotisation.
          </p>
          <GraphiqueZones zones={data.zones} />
        </>
      )}
    </CadreTableauBord>
  );
}
