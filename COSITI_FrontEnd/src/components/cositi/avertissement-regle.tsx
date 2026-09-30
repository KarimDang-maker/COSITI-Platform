import { Alerte } from "@/components/cositi/alerte";

interface AvertissementRegleProps {
  /** Message(s) `avertissements` renvoyés par l'enveloppe API (`docs/02_DESIGN_SYSTEM.md §10`). */
  avertissements: readonly string[];
}

/**
 * Bandeau dédié aux règles `[V]` non validées par la COSITI. Ne calcule
 * jamais rien : il affiche tel quel le texte renvoyé par l'API. Un résultat
 * issu d'une règle `[V]` ne doit jamais être présenté comme définitif
 * (`AGENTS.md` règle 2).
 */
export function AvertissementRegle({ avertissements }: AvertissementRegleProps) {
  if (avertissements.length === 0) return null;
  return (
    <Alerte teinte="attention" titre="Règle en attente de validation">
      <ul className="list-disc space-y-1 pl-4">
        {avertissements.map((texte) => (
          <li key={texte}>{texte}</li>
        ))}
      </ul>
    </Alerte>
  );
}
