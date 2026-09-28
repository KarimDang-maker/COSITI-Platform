import { SlidersHorizontal } from "lucide-react";
import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { CarteSection } from "@/components/cositi/carte-section";
import { ListeElements } from "@/components/cositi/liste-elements";
import { useTableauBordSuperAdmin } from "@/hooks/useTableauxDeBord";
import { usePermission } from "@/auth/ContexteAuth";
import { formaterNombre } from "@/lib/format";

/**
 * `/tableaux-de-bord/super-admin` — Utilisateurs, sécurité, audit, paramètres
 * (Roles des acteurs.md §10).
 *
 * Ne contient **aucune donnée métier nominative** : le Super Administrateur
 * administre le système, il n'a pas d'accès métier courant
 * (`docs/04_SECURITE.md §3`). Ni adhérent, ni montant, ni taux d'activation.
 */
export function TableauBordSuperAdmin() {
  const { data, isLoading, isError, error } = useTableauBordSuperAdmin();
  const peutAdministrer = usePermission("ADMINISTRATION:LIRE");

  return (
    <CadreTableauBord
      titre="Tableau de bord — Administration"
      sousTitre="Comptes, sécurité, journal d'audit et règles de paramétrage."
      chargement={isLoading}
      enErreur={isError}
      erreur={error}
      indicateurs={data?.indicateurs}
      alertes={data?.alertes}
      avertissements={data?.avertissements}
    >
      {data && (
        <CarteSection
          titre="Dette de paramétrage"
          pied={
            <p className="text-sm text-texte-doux">
              Ce tableau de bord ne donne accès à aucune donnée nominative d'adhérent : l'accès du Super
              Administrateur aux données métier est exceptionnel et journalisé.
            </p>
          }
        >
          <div className="space-y-4">
            <ListeElements
              elements={[
                {
                  cle: "parametres",
                  icone: SlidersHorizontal,
                  teinte: data.parametresNonValides > 0 ? "attention" : undefined,
                  titre: "Règles métier marquées « à valider »",
                  valeur: formaterNombre(data.parametresNonValides),
                  chemin: peutAdministrer ? "/administration" : undefined,
                },
              ]}
            />
            <p className="text-texte-doux">
              {formaterNombre(data.parametresNonValides)} règle(s) métier restent marquées « à valider » par
              la COSITI. Tant qu'elles le sont, les résultats qui en dépendent (répartition d'un versement,
              seuil de retard, assiette CNPS, composition d'un dossier) sont provisoires et signalés comme
              tels à l'écran.
            </p>
          </div>
        </CarteSection>
      )}
    </CadreTableauBord>
  );
}
