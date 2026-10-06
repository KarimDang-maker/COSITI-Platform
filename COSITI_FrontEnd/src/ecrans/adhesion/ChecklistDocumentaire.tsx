import { FileUp, RefreshCcw } from "lucide-react";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChecklistDocumentaire } from "@/hooks/useAdhesion";
import type { PieceChecklist, StatutPiece } from "@/api/adhesion";
import type { TypeDocument } from "@/api/documents";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterNombre } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Statuts pour lesquels une nouvelle version de la pièce est attendue. */
const A_REMPLACER: readonly StatutPiece[] = ["NON_CONFORME", "ILLISIBLE", "EXPIRE"];
const A_FOURNIR: readonly StatutPiece[] = ["REQUIS", "NON_FOURNI"];

export interface ActionPiece {
  type: TypeDocument;
  /** Présent pour un remplacement : la version active à remplacer. */
  remplaceDocumentId?: string;
  libelle: string;
}

function LignePiece({ piece, onAction }: { piece: PieceChecklist; onAction?: (action: ActionPiece) => void }) {
  const type = (piece.typeDocument ?? "AUTRE") as TypeDocument;
  const aFournir = A_FOURNIR.includes(piece.statut);
  const aRemplacer = A_REMPLACER.includes(piece.statut) || (!!piece.documentId && piece.statut === "FOURNI");

  return (
    <li
      className={cn(
        "space-y-2 rounded-lg border px-4 py-3",
        piece.bloquante && (aFournir || A_REMPLACER.includes(piece.statut)) ? "border-danger-trait" : "border-bordure",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {piece.libelle}
            <BadgeStatut domaine="niveauExigence" code={piece.niveau} />
            {piece.bloquante && (
              <span className="text-xs font-semibold text-danger-fort">Bloque l'activation</span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-texte-doux-fort">
            <span>{piece.rubrique}</span>
            {piece.versionDocument !== null && piece.versionDocument > 1 && (
              <span>— version {formaterNombre(piece.versionDocument)}</span>
            )}
            {piece.valideJusquau && <span>— valable jusqu'au {formaterDate(piece.valideJusquau)}</span>}
            {piece.verificationDga && <span>— contrôlée par la DGA</span>}
          </p>
          {piece.conditionApplication && (
            <p className="text-sm text-texte-doux-fort">Condition : {piece.conditionApplication}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BadgeStatut domaine="statutPiece" code={piece.statut} />
          {onAction && aFournir && (
            <Button size="sm" variant="outline" onClick={() => onAction({ type, libelle: piece.libelle })}>
              <FileUp className="size-4" aria-hidden="true" />
              Ajouter cette pièce
            </Button>
          )}
          {onAction && aRemplacer && piece.documentId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction({ type, remplaceDocumentId: piece.documentId!, libelle: piece.libelle })}
            >
              <RefreshCcw className="size-4" aria-hidden="true" />
              Remplacer
            </Button>
          )}
        </div>
      </div>
      {piece.champs.length > 0 && (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2" aria-label={`Informations justifiées par ${piece.libelle}`}>
          {piece.champs.map((champ) => (
            <li key={champ.exigenceId} className="flex flex-wrap items-center gap-2">
              <span className="text-texte-doux-fort">{champ.libelle} :</span>
              <span className="font-medium">{champ.valeurNumerique ?? "—"}</span>
              {champ.dernierResultatDga && <BadgeStatut domaine="correspondance" code={champ.dernierResultatDga} />}
              {champ.commentaireDga && <span className="w-full text-xs text-texte-doux-fort">DGA : {champ.commentaireDga}</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Checklist documentaire dynamique (V21, `GET /adherents/{id}/checklist-documentaire`). Pièces, statuts, caractère
 * bloquant, compteurs et `pretPourActivation` viennent du serveur et de la matrice : rien n'est recalculé ici. Une
 * pièce obligatoire dont la règle n'est pas confirmée est signalée sans bloquer (§17).
 */
export function ChecklistDocumentaire({
  adherentId,
  onAction,
  compacte = false,
}: {
  adherentId: string;
  /** Ajout ou remplacement d'une pièce ; absent sans `DOCUMENT:TELEVERSER`. */
  onAction?: (action: ActionPiece) => void;
  /** Résumé seul (dialogue d'activation) : pièces à traiter uniquement. */
  compacte?: boolean;
}) {
  const checklist = useChecklistDocumentaire(adherentId);

  if (checklist.isLoading) return <Skeleton className="h-24 w-full" />;
  if (checklist.isError || !checklist.data) {
    return (
      <Alerte teinte="danger" titre="Checklist indisponible">
        <p>{estErreurApi(checklist.error) ? checklist.error.message : "La checklist documentaire n'a pas pu être chargée."}</p>
      </Alerte>
    );
  }

  const { pieces, compteurs, pretPourActivation, avertissements } = checklist.data;
  const affichees = compacte
    ? pieces.filter((p) => A_FOURNIR.includes(p.statut) || A_REMPLACER.includes(p.statut))
    : pieces.filter((p) => p.statut !== "REMPLACE");

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5" aria-label="Synthèse de la checklist">
        <div>
          <dt className="text-texte-doux-fort">Pièces</dt>
          <dd className="chiffre text-lg font-bold">{formaterNombre(compteurs.pieces)}</dd>
        </div>
        <div>
          <dt className="text-texte-doux-fort">Obligatoires</dt>
          <dd className="chiffre text-lg font-bold">{formaterNombre(compteurs.obligatoires)}</dd>
        </div>
        <div>
          <dt className="text-texte-doux-fort">Fournies</dt>
          <dd className="chiffre text-lg font-bold">{formaterNombre(compteurs.fournies)}</dd>
        </div>
        <div>
          <dt className="text-texte-doux-fort">Contrôlées conformes</dt>
          <dd className="chiffre text-lg font-bold">{formaterNombre(compteurs.validees)}</dd>
        </div>
        <div>
          <dt className="text-texte-doux-fort">En anomalie</dt>
          <dd className={cn("chiffre text-lg font-bold", compteurs.enAnomalie > 0 && "text-danger-fort")}>
            {formaterNombre(compteurs.enAnomalie)}
          </dd>
        </div>
      </dl>
      {pretPourActivation ? (
        <Alerte teinte="succes" titre="Aucune pièce ne bloque l'activation">
          <p>Les pièces signalées restent à fournir, mais seules les pièces obligatoires confirmées par la COSITI bloquent.</p>
        </Alerte>
      ) : (
        <Alerte teinte="danger" titre="Activation bloquée par les pièces">
          <p>{formaterNombre(compteurs.bloquantesManquantes)} pièce(s) obligatoire(s) confirmée(s) manquante(s), non conforme(s) ou expirée(s).</p>
        </Alerte>
      )}
      {avertissements.length > 0 && <AvertissementRegle avertissements={avertissements} />}
      {affichees.length === 0 ? (
        <p className="text-sm text-texte-doux-fort">{compacte ? "Aucune pièce à traiter." : "Aucune pièce attendue par la matrice en vigueur."}</p>
      ) : (
        <ul className="space-y-2" aria-label="Checklist documentaire">
          {affichees.map((p) => (
            <LignePiece key={p.exigenceId} piece={p} onAction={onAction} />
          ))}
        </ul>
      )}
    </div>
  );
}
