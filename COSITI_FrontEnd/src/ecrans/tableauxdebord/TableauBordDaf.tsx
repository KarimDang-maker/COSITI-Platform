import { Link } from "react-router";
import { AlertOctagon, ClipboardCheck, Scale } from "lucide-react";
import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { Alerte } from "@/components/cositi/alerte";
import { CarteSection } from "@/components/cositi/carte-section";
import { ListeElements } from "@/components/cositi/liste-elements";
import { Button } from "@/components/ui/button";
import { useTableauBordDaf } from "@/hooks/useTableauxDeBord";
import { usePeriodeTableauBord } from "@/hooks/usePeriodeTableauBord";
import { formaterMontant, formaterNombre } from "@/lib/format";

/** `/tableaux-de-bord/daf` — Vision financière interne (UC-DAF-01). */
export function TableauBordDaf() {
  const periode = usePeriodeTableauBord();
  const { data, isLoading, isError, error } = useTableauBordDaf(periode.filtres);

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
      periode={periode}
      actions={
        data && (
          <Button asChild>
            <Link to="/daf">Ouvrir la file de contrôle ({formaterNombre(data.paiementsAControler)})</Link>
          </Button>
        )
      }
    >
      {data && (
        <>
          <CarteSection titre="Contrôle en cours" description="Chaque ligne ouvre la file de contrôle DAF.">
            <ListeElements
              libelle="Contrôle en cours"
              elements={[
                {
                  cle: "a-controler",
                  icone: ClipboardCheck,
                  titre: "Paiements à contrôler",
                  sousTitre: `${formaterMontant(data.montantAControler)} en attente`,
                  valeur: formaterNombre(data.paiementsAControler),
                  chemin: "/daf",
                },
                {
                  cle: "incoherences",
                  icone: AlertOctagon,
                  teinte: data.paiementsIncoherence > 0 ? "danger" : undefined,
                  titre: "Incohérences signalées",
                  valeur: formaterNombre(data.paiementsIncoherence),
                  chemin: "/daf",
                },
                {
                  cle: "remises-ecart",
                  icone: Scale,
                  teinte: data.remisesEnEcart > 0 ? "attention" : undefined,
                  titre: "Remises de caisse en écart",
                  valeur: formaterNombre(data.remisesEnEcart),
                  chemin: "/daf",
                },
              ]}
            />
          </CarteSection>

          <Alerte teinte="info" titre="Encaissements déclarés, pas une trésorerie">
            <p>
              COSITI enregistre les informations de paiement mais <strong>n'exécute aucun mouvement de
              fonds</strong>. Les montants affichés ({formaterMontant(data.montantValide)} validés,{" "}
              {formaterMontant(data.montantAControler)} en attente) sont des encaissements déclarés puis
              contrôlés, jamais un solde de trésorerie.
            </p>
          </Alerte>
        </>
      )}
    </CadreTableauBord>
  );
}
