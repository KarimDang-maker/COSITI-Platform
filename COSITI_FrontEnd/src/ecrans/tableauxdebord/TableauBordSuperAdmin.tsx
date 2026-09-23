import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { useTableauBordSuperAdmin } from "@/hooks/useTableauxDeBord";
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
        <section className="space-y-2 rounded-lg border border-bordure bg-surface p-4">
          <h2 className="text-lg font-semibold text-titre">Dette de paramétrage</h2>
          <p className="text-texte-doux">
            {formaterNombre(data.parametresNonValides)} règle(s) métier restent marquées « à valider » par
            la COSITI. Tant qu'elles le sont, les résultats qui en dépendent (répartition d'un versement,
            seuil de retard, assiette CNPS, composition d'un dossier) sont provisoires et signalés comme
            tels à l'écran.
          </p>
          <p className="text-sm text-texte-doux">
            Ce tableau de bord ne donne accès à aucune donnée nominative d'adhérent : l'accès du Super
            Administrateur aux données métier est exceptionnel et journalisé.
          </p>
        </section>
      )}
    </CadreTableauBord>
  );
}
