import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { CarteSection } from "@/components/cositi/carte-section";
import { useTableauBordSuperAdmin } from "@/hooks/useTableauxDeBord";

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
      sousTitre="Comptes, sécurité et journal d'audit."
      chargement={isLoading}
      enErreur={isError}
      erreur={error}
      indicateurs={data?.indicateurs}
      alertes={data?.alertes}
      avertissements={data?.avertissements}
    >
      {data && (
        <CarteSection titre="Périmètre du Super Administrateur">
          <p className="text-sm text-texte-doux">
            Ce tableau de bord ne donne accès à aucune donnée nominative d'adhérent : l'accès du Super Administrateur
            aux données métier est exceptionnel et journalisé.
          </p>
        </CarteSection>
      )}
    </CadreTableauBord>
  );
}
