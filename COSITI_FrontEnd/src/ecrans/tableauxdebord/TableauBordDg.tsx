import { Clock } from "lucide-react";
import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { GraphiqueZones } from "@/components/cositi/graphique-zones";
import { CarteSection } from "@/components/cositi/carte-section";
import { ListeElements } from "@/components/cositi/liste-elements";
import { useTableauBordDg } from "@/hooks/useTableauxDeBord";
import { usePeriodeTableauBord } from "@/hooks/usePeriodeTableauBord";
import { usePermission } from "@/auth/ContexteAuth";
import { formaterNombre } from "@/lib/format";

/** `/tableaux-de-bord/dg` — Pilotage général, avec le suivi des retards (Roles des acteurs.md §4). */
export function TableauBordDg() {
  const periode = usePeriodeTableauBord();
  const { data, isLoading, isError, error } = useTableauBordDg(periode.filtres);
  const peutVoirDroits = usePermission("DROITS:LIRE");

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
      periode={periode}
    >
      {data && (
        <>
          <GraphiqueZones zones={data.zones} />
          <CarteSection titre="Suivi des retards">
            <ListeElements
              elements={[
                {
                  cle: "retards",
                  icone: Clock,
                  teinte: data.adherentsEnRetard > 0 ? "attention" : undefined,
                  titre: `${formaterNombre(data.adherentsEnRetard)} adhérent(s) actuellement en retard de cotisation.`,
                  // Lien seulement si l'écran est accessible : un lien vers un refus d'accès est un lien mort.
                  chemin: peutVoirDroits ? "/droits" : undefined,
                },
              ]}
            />
          </CarteSection>
        </>
      )}
    </CadreTableauBord>
  );
}
