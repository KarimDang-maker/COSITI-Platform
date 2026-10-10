import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { useAdherent } from "@/hooks/useAdherents";
import { abregerIdentifiant, formaterNomComplet } from "@/lib/format";

/**
 * `PaiementDto` ne porte que `adherentId` : l'identité est relue par `GET /adherents/{id}` (même cache que la
 * fiche adhérent, une requête par adhérent distinct de la page). Hors périmètre ou en chargement, l'identifiant
 * abrégé reste affiché — jamais un nom deviné.
 */
export function CelluleAdherentPaiement({ adherentId }: { adherentId: string }) {
  const { data: adherent } = useAdherent(adherentId);
  if (!adherent) return <span className="ref">{abregerIdentifiant(adherentId)}</span>;
  return (
    <CelluleIdentite
      nom={formaterNomComplet(adherent.nom, adherent.prenoms)}
      detail={<span className="ref">{adherent.matricule}</span>}
    />
  );
}
