import { useMemo } from "react";
import { useNavigate } from "react-router";
import { BadgeCheck, TrendingUp } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { BarreProgression } from "@/components/cositi/barre-progression";
import { useEligiblesNonImmatricules, useProchesSeuilCnps } from "@/hooks/useCnps";
import { useCnpsPortefeuille } from "@/hooks/useOrganisation";
import type { AdherentEligibleCnps } from "@/api/cnps";
import { estErreurApi } from "@/api/erreurs";
import { formaterMontant } from "@/lib/format";

interface VueSeuilCnpsProps {
  /** `proches` : bande sous le seuil (#25). `eligibles` : seuil atteint, non immatriculés (#26). */
  mode: "proches" | "eligibles";
  /**
   * Restreint la liste au portefeuille d'un agent (module agents de terrain, #12 et #13 :
   * `GET /agents/{id}/portefeuille/cnps/...`). Absent : tout le périmètre du demandeur.
   */
  agentId?: string;
}

/**
 * Listes calculées par le serveur à partir du cumul éligible et du seuil du pack. L'écran n'évalue ni la
 * proximité ni l'éligibilité : il affiche la réponse, et la barre n'est qu'un rapport d'affichage entre
 * deux montants serveur (cumul / seuil).
 */
export function VueSeuilCnps({ mode, agentId }: VueSeuilCnpsProps) {
  const navigate = useNavigate();
  const global = !agentId;
  const proches = useProchesSeuilCnps(undefined, global && mode === "proches");
  const eligibles = useEligiblesNonImmatricules(undefined, global && mode === "eligibles");
  const portefeuille = useCnpsPortefeuille(agentId, mode, !global);
  const requete = !global ? portefeuille : mode === "proches" ? proches : eligibles;

  const colonnes = useMemo<ColumnDef<AdherentEligibleCnps>[]>(
    () => [
      {
        id: "matricule",
        header: "Matricule",
        cell: ({ row }) => <span className="ref">{row.original.matricule}</span>,
      },
      {
        id: "nom",
        header: "Adhérent",
        cell: ({ row }) => <CelluleIdentite nom={row.original.nomComplet} />,
      },
      { id: "pack", header: "Pack", cell: ({ row }) => <span className="ref">{row.original.packCode}</span> },
      {
        id: "progression",
        header: "Cumul éligible / seuil",
        cell: ({ row }) => (
          <BarreProgression
            className="min-w-56"
            libelle={`${formaterMontant(row.original.cumulCotise)} sur ${formaterMontant(row.original.seuilEligibilite)}`}
            ratio={row.original.seuilEligibilite > 0 ? row.original.cumulCotise / row.original.seuilEligibilite : 0}
            valeur={mode === "eligibles" ? "Seuil atteint" : "En approche"}
            teinte={mode === "eligibles" ? "primaire" : "marque"}
          />
        ),
      },
      {
        id: "dossier",
        header: "Dossier CNPS",
        cell: ({ row }) => (row.original.dossierOuvert ? "Ouvert" : "Non ouvert"),
      },
    ],
    [mode],
  );

  if (requete.isLoading) return <SqueletteTableau colonnes={5} />;

  if (requete.isError) {
    return (
      <Alerte teinte="danger" titre="Impossible de charger cette liste">
        <p>{estErreurApi(requete.error) ? requete.error.message : "Une erreur inattendue est survenue."}</p>
      </Alerte>
    );
  }

  const lignes = requete.data ?? [];

  if (lignes.length === 0) {
    return (
      <EtatVide
        icone={mode === "proches" ? TrendingUp : BadgeCheck}
        titre={
          mode === "proches"
            ? "Aucun adhérent n'approche actuellement du seuil CNPS"
            : "Aucun adhérent éligible non immatriculé"
        }
        description="Cette liste est calculée par le serveur à partir des cotisations imputées, dans votre périmètre."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-texte-doux-fort" aria-live="polite">
        {lignes.length} adhérent{lignes.length > 1 ? "s" : ""}
      </p>
      <TableauDonnees
        colonnes={colonnes}
        lignes={lignes}
        cleLigne={(a) => a.adherentId}
        onActiverLigne={(a) => navigate(`/adherents/${a.adherentId}`)}
        libelleLigne={(a) => `Ouvrir la fiche de ${a.nomComplet}`}
        legende={mode === "proches" ? "Adhérents proches du seuil CNPS" : "Adhérents éligibles CNPS non immatriculés"}
      />
    </div>
  );
}
