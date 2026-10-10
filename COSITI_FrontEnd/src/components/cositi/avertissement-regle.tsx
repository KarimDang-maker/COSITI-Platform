import { Alerte } from "@/components/cositi/alerte";

interface AvertissementRegleProps {
  /** Message(s) `avertissements` renvoyés par l'enveloppe API (`docs/02_DESIGN_SYSTEM.md §10`). */
  avertissements: readonly string[];
}

/**
 * Messages qui ne font que rappeler qu'une règle n'est « pas encore validée par la COSITI ». Décision du 05/10/2026 :
 * **toutes les règles en attente sont réputées validées** — ces rappels ne sont plus affichés, en attendant que le
 * serveur cesse de les émettre (spécification backend V23). Les autres avertissements restent affichés.
 */
const RAPPEL_REGLE_EN_ATTENTE =
  /(non valid|pas (encore )?valid|à valider|a valider|provisoire|\[V\]|non confirm|pas (encore )?confirm|en attente de (validation|confirmation)|statut V\b)/i;

/** Avertissements utiles à l'utilisateur, sans les rappels de règles en attente. */
function avertissementsUtiles(avertissements: readonly string[]): string[] {
  return avertissements.filter((texte) => !RAPPEL_REGLE_EN_ATTENTE.test(texte));
}

/**
 * Bandeau des avertissements renvoyés par l'API. Ne calcule jamais rien : il affiche tel quel le texte du serveur,
 * sauf les rappels de règles en attente de validation (voir ci-dessus).
 */
export function AvertissementRegle({ avertissements }: AvertissementRegleProps) {
  const utiles = avertissementsUtiles(avertissements);
  if (utiles.length === 0) return null;
  return (
    <Alerte teinte="attention" titre="À noter">
      <ul className="list-disc space-y-1 pl-4">
        {utiles.map((texte) => (
          <li key={texte}>{texte}</li>
        ))}
      </ul>
    </Alerte>
  );
}
