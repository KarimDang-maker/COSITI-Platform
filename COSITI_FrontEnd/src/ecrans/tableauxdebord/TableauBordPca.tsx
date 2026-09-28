import { FileText } from "lucide-react";
import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { GraphiqueZones } from "@/components/cositi/graphique-zones";
import { CarteSection } from "@/components/cositi/carte-section";
import { ListeElements } from "@/components/cositi/liste-elements";
import { useTableauBordPca } from "@/hooks/useTableauxDeBord";
import { usePeriodeTableauBord } from "@/hooks/usePeriodeTableauBord";
import { usePermission } from "@/auth/ContexteAuth";

/** `/tableaux-de-bord/pca` — Supervision globale et rapports DAF (Roles des acteurs.md §3). */
export function TableauBordPca() {
  const periode = usePeriodeTableauBord();
  const { data, isLoading, isError, error } = useTableauBordPca(periode.filtres);
  const peutLireRapports = usePermission("RAPPORT_DAF:LIRE");

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
      periode={periode}
    >
      {data && (
        <>
          <GraphiqueZones zones={data.zones} />
          <CarteSection titre="Rapports du DAF">
            <ListeElements
              elements={[
                {
                  cle: "rapports",
                  icone: FileText,
                  titre: `${data.rapportsDafDisponibles} rapport(s) DAF transmis et consultables.`,
                  chemin: peutLireRapports ? "/rapports" : undefined,
                },
              ]}
            />
          </CarteSection>
        </>
      )}
    </CadreTableauBord>
  );
}
