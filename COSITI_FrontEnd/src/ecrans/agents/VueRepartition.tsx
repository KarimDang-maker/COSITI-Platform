import { useMemo } from "react";
import { useNavigate } from "react-router";
import { PieChart } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { CarteIndicateur } from "@/components/cositi/carte-indicateur";
import { BarreProgression } from "@/components/cositi/barre-progression";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { useDistributionPortefeuilles } from "@/hooks/useOrganisation";
import type { DistributionPortefeuille } from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";
import { formaterNombre } from "@/lib/format";

/**
 * Répartition des portefeuilles (#19) : volumes par agent actif, dans l'ordre renvoyé par le serveur (par
 * nom). Aucun classement ni qualificatif : la barre ne fait que rapporter le volume d'un agent au total
 * affiché, pour la lecture comparative.
 */
export function VueRepartition() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useDistributionPortefeuilles();

  const total = useMemo(() => (data ?? []).reduce((somme, ligne) => somme + ligne.nombreAdherents, 0), [data]);

  const colonnes = useMemo<ColumnDef<DistributionPortefeuille>[]>(
    () => [
      { id: "code", header: "Code", cell: ({ row }) => <span className="ref">{row.original.codeAgent}</span> },
      { id: "agent", header: "Agent", cell: ({ row }) => <CelluleIdentite nom={row.original.nomComplet} /> },
      {
        id: "volume",
        header: "Adhérents suivis",
        cell: ({ row }) => (
          <BarreProgression
            className="min-w-56"
            libelle={`Portefeuille de ${row.original.nomComplet}`}
            ratio={total > 0 ? row.original.nombreAdherents / total : 0}
            valeur={`${formaterNombre(row.original.nombreAdherents)} adhérent${row.original.nombreAdherents > 1 ? "s" : ""}`}
          />
        ),
      },
    ],
    [total],
  );

  if (isLoading) return <SqueletteTableau colonnes={3} />;

  if (isError) {
    return (
      <Alerte teinte="danger" titre="Impossible de charger la répartition">
        <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
      </Alerte>
    );
  }

  if (!data || data.length === 0) {
    return <EtatVide icone={PieChart} titre="Aucun agent actif" description="La répartition ne porte que sur les agents actifs." />;
  }

  return (
    <div className="space-y-6">
      {/* Deux sommes simples de la réponse affichée (pas de nouvelle règle métier) : repères de lecture. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CarteIndicateur indicateur={{ cle: "agents", libelle: "Agents actifs", valeur: data.length, unite: "NOMBRE" }} />
        <CarteIndicateur indicateur={{ cle: "affectes", libelle: "Adhérents affectés", valeur: total, unite: "NOMBRE" }} />
      </div>
      <TableauDonnees
        colonnes={colonnes}
        lignes={data}
        cleLigne={(ligne) => ligne.agentId}
        onActiverLigne={(ligne) => navigate(`/agents/${ligne.agentId}`)}
        libelleLigne={(ligne) => `Ouvrir la fiche de ${ligne.nomComplet}`}
        legende="Répartition des portefeuilles par agent actif"
      />
    </div>
  );
}
