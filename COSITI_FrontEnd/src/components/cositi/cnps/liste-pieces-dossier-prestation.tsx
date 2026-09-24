import { useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogueTeleverserDocument } from "@/components/cositi/dialogue-televerser-document";
import { useAjouterPiecePrestation } from "@/hooks/useCnps";
import { useTelechargerDocument } from "@/hooks/useDocuments";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate } from "@/lib/format";
import type { DossierPrestationCnps } from "@/api/cnps";

interface ListePiecesDossierPrestationProps {
  dossier: DossierPrestationCnps;
  peutGerer: boolean;
}

/**
 * Checklist des pièces constitutives du dossier — chaque ligne vient de `dossier.pieces` (créées
 * automatiquement à l'ouverture depuis le référentiel de l'offre, `ServiceDossierPrestationCnpsImpl.ouvrir`).
 */
export function ListePiecesDossierPrestation({ dossier, peutGerer }: ListePiecesDossierPrestationProps) {
  const [pieceOffreEnCours, setPieceOffreEnCours] = useState<string | null>(null);
  const ajouterPiece = useAjouterPiecePrestation(dossier.id);
  const telecharger = useTelechargerDocument();
  const dossierFige = dossier.statut === "TRANSMIS_CNPS" || dossier.statut === "TRAITE";

  const fournies = dossier.pieces.filter((p) => p.statut === "FOURNIE" || p.statut === "VALIDEE").length;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-texte">
        Pièces constitutives du dossier ({fournies}/{dossier.pieces.length})
      </p>
      <ul className="space-y-2">
        {dossier.pieces.map((piece) => {
          const fournie = piece.statut === "FOURNIE" || piece.statut === "VALIDEE";
          return (
            <li
              key={piece.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bordure bg-surface p-3"
            >
              <div className="flex items-center gap-2">
                {fournie ? (
                  <CheckSquare className="size-4 text-succes-fort" aria-hidden="true" />
                ) : (
                  <Square className="size-4 text-texte-doux" aria-hidden="true" />
                )}
                <span className="text-sm text-texte">{piece.libellePiece}</span>
                {piece.obligatoire && (
                  <span className="rounded-sm border border-danger-trait bg-danger-doux px-1.5 py-0.5 text-xs font-semibold text-danger-fort">
                    Requis
                  </span>
                )}
              </div>
              <div className="text-right text-sm">
                {piece.documentId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={telecharger.isPending}
                    onClick={() => telecharger.mutate(piece.documentId!)}
                  >
                    Télécharger
                  </Button>
                ) : peutGerer && !dossierFige ? (
                  <Button variant="outline" size="sm" onClick={() => setPieceOffreEnCours(piece.pieceOffreId)}>
                    Ajouter
                  </Button>
                ) : (
                  <span className="text-texte-doux">Non fournie</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {pieceOffreEnCours && (
        <DialogueTeleverserDocument
          ouvert={!!pieceOffreEnCours}
          onOuvertChange={(ouvert) => !ouvert && setPieceOffreEnCours(null)}
          cible={{ adherentId: dossier.adherentId }}
          onTeleverse={(document) => {
            ajouterPiece.mutate(
              { documentId: document.id, pieceOffreId: pieceOffreEnCours },
              {
                onSuccess: () => toast.success("Pièce rattachée au dossier."),
                onError: (erreur) =>
                  toast.error(estErreurApi(erreur) ? erreur.message : "La pièce n'a pas pu être rattachée."),
              },
            );
            setPieceOffreEnCours(null);
          }}
        />
      )}
      {dossier.dateDepot && (
        <p className="text-xs text-texte-doux">Dossier déposé à la COSITI le {formaterDate(dossier.dateDepot)}.</p>
      )}
    </div>
  );
}
