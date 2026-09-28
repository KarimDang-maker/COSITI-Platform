import { Link } from "react-router";
import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { useTableauBordGestionnaire } from "@/hooks/useTableauxDeBord";
import { formaterNombre } from "@/lib/format";

/** `/tableaux-de-bord/gestionnaire` — Adhérents, CNPS et remontées terrain (UC-GC-01). */
export function TableauBordGestionnaire() {
  const { data, isLoading, isError, error } = useTableauBordGestionnaire();

  const raccourcis = data
    ? [
        { libelle: "Dossiers CNPS incomplets", valeur: data.dossiersCnpsIncomplets, chemin: "/cnps" },
        {
          libelle: "Éligibles non immatriculés",
          valeur: data.eligiblesNonImmatricules,
          chemin: "/cnps?onglet=eligibles",
        },
        { libelle: "Déclarations à produire", valeur: data.declarationsAProduire, chemin: "/cnps" },
        {
          libelle: "Comptes rendus à contrôler",
          valeur: data.comptesRendusAControler,
          chemin: "/comptes-rendus",
        },
        { libelle: "Adhérents en retard", valeur: data.adherentsEnRetard, chemin: "/droits" },
      ]
    : [];

  return (
    <CadreTableauBord
      titre="Tableau de bord — Gestionnaire des comptes"
      sousTitre="Adhérents, dossiers CNPS, déclarations et remontées du terrain."
      chargement={isLoading}
      enErreur={isError}
      erreur={error}
      indicateurs={data?.indicateurs}
      clePrincipale="tauxActivation"
      alertes={data?.alertes}
      avertissements={data?.avertissements}
    >
      {data && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-titre">Mon travail en attente</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {raccourcis.map((raccourci) => (
              <Link
                key={raccourci.libelle}
                to={raccourci.chemin}
                className="rounded-lg border border-bordure bg-surface p-4 outline-none hover:bg-surface-survol focus-visible:ring-2 focus-visible:ring-anneau"
              >
                <p className="text-sm text-texte-doux">{raccourci.libelle}</p>
                <p className="chiffre text-2xl font-semibold">{formaterNombre(raccourci.valeur)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </CadreTableauBord>
  );
}
