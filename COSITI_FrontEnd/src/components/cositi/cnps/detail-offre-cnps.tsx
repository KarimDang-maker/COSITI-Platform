import type { OffreCnps } from "@/api/cnps";

interface DetailOffreCnpsProps {
  offre: OffreCnps;
}

/**
 * Détail d'une offre (pill clé, délai, pièces obligatoires) — réutilisé à l'identique pour les 13 offres
 * des 3 rubriques (`Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V2.md` §12-15/§36-39),
 * jamais dupliqué en 13 blocs JSX distincts.
 */
export function DetailOffreCnps({ offre }: DetailOffreCnpsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-bordure bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold text-texte">Détail de l'offre : {offre.libelle}</p>
        {offre.badgeMetier && (
          <span className="rounded-sm border border-marque-trait bg-surface-douce px-2 py-0.5 text-xs font-semibold text-texte">
            {offre.badgeMetier}
          </span>
        )}
      </div>

      {offre.description && <p className="text-sm text-texte-doux">{offre.description}</p>}

      {offre.delaiLibelle && (
        <div>
          <p className="text-xs font-semibold uppercase text-texte-doux-fort">Délai moyen d'instruction CNPS</p>
          <p className="text-sm text-texte">{offre.delaiLibelle}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase text-texte-doux-fort">
          Pièces exigées ({offre.pieces.length})
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-texte">
          {offre.pieces.map((piece) => (
            <li key={piece.id}>
              {piece.libelle}
              {piece.obligatoire && <span className="text-danger-fort"> *</span>}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-texte-doux">* pièce obligatoire</p>
      </div>
    </div>
  );
}
