import { useMemo } from "react";
import { useNavigate } from "react-router";
import { ArchiveX } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { useDossiersArchivageIncomplets } from "@/hooks/useParcoursCnps";
import type { DossierArchivageIncomplet } from "@/api/parcoursCnps";
import { estErreurApi } from "@/api/erreurs";
import { formaterMatricule, formaterNombre } from "@/lib/format";

/**
 * Le rapport ne renvoie que des codes de pièce : sans libellé serveur, on lisse le code (`CNI_RECTO` → « Cni recto »)
 * plutôt que d'afficher un identifiant brut. Le libellé complet est lu sur la checklist de la fiche.
 */
function libelleDepuisCode(code: string): string {
  const texte = code.replaceAll("_", " ").toLowerCase();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Rapport « Dossiers à archivage incomplet » (`GET /cnps/archivage/dossiers-incomplets`). */
export function RapportArchivageIncomplet() {
  const navigate = useNavigate();
  const rapport = useDossiersArchivageIncomplets();

  const colonnes = useMemo<ColumnDef<DossierArchivageIncomplet>[]>(
    () => [
      {
        id: "matricule",
        header: "Matricule",
        cell: ({ row }) => <span className="ref">{formaterMatricule(row.original.matricule)}</span>,
      },
      { id: "adherent", header: "Adhérent", cell: ({ row }) => <CelluleIdentite nom={row.original.nomComplet} /> },
      {
        id: "nombre",
        header: "Pièces manquantes",
        cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.piecesManquantes.length)}</span>,
      },
      {
        id: "pieces",
        header: "Détail",
        cell: ({ row }) => row.original.piecesManquantes.map(libelleDepuisCode).join(", "),
      },
    ],
    [],
  );

  if (rapport.isLoading) return <SqueletteTableau colonnes={4} />;
  if (rapport.isError) {
    return (
      <Alerte teinte="danger" titre="Impossible de charger le rapport">
        <p>{estErreurApi(rapport.error) ? rapport.error.message : "Une erreur inattendue est survenue."}</p>
      </Alerte>
    );
  }

  const lignes = rapport.data ?? [];
  if (lignes.length === 0) {
    return (
      <EtatVide
        icone={ArchiveX}
        titre="Aucun dossier à archivage incomplet"
        description="Tous les dossiers CNPS ouverts ont leurs pièces d'archivage en règle."
      />
    );
  }

  return (
    <TableauDonnees
      colonnes={colonnes}
      lignes={lignes}
      cleLigne={(d) => d.dossierId}
      onActiverLigne={(d) => navigate(`/adherents/${d.adherentId}?onglet=cnps`)}
      libelleLigne={(d) => `Ouvrir le parcours CNPS de ${d.nomComplet}`}
      legende="Dossiers CNPS dont l'archivage est incomplet"
    />
  );
}
