import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ElementDemande, StatutDemandeValidation } from "@/api/workflow";
import { formaterValeurChamp, libelleChamp, type Referentiels } from "@/ecrans/workflow/champsWorkflow";

interface ComparaisonChangementsProps {
  elements: readonly ElementDemande[];
  statut: StatutDemandeValidation;
  /** Validation initiale d'un dossier ou d'un profil : instantané soumis, sans valeur officielle antérieure. */
  instantane?: boolean;
  referentiels?: Referentiels;
}

/**
 * Comparaison champ par champ (§15). Règle fondamentale : tant que la décision n'est pas prise, la valeur
 * proposée n'est jamais présentée comme officielle — d'où les libellés « Valeur officielle actuelle » et
 * « Valeur proposée », qui ne deviennent « avant / appliquée » qu'après approbation.
 */
export function ComparaisonChangements({ elements, statut, instantane = false, referentiels }: ComparaisonChangementsProps) {
  if (elements.length === 0) {
    return <p className="text-sm text-texte-doux-fort">Aucun champ n'est porté par cette demande.</p>;
  }

  const approuvee = statut === "APPROUVEE";
  const close = statut === "REJETEE" || statut === "ANNULEE";
  const enteteAvant = approuvee ? "Valeur avant approbation" : close ? "Valeur officielle (inchangée)" : "Valeur officielle actuelle";
  const enteteApres = approuvee ? "Valeur appliquée" : close ? "Valeur proposée (non appliquée)" : "Valeur proposée";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Champ</TableHead>
          {!instantane && <TableHead>{enteteAvant}</TableHead>}
          <TableHead>{instantane ? "Valeur soumise" : enteteApres}</TableHead>
          <TableHead>Motif</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {elements.map((element) => (
          <TableRow key={element.id}>
            <TableCell className="font-semibold">{libelleChamp(element.champ)}</TableCell>
            {!instantane && (
              <TableCell className="text-texte-doux-fort">{formaterValeurChamp(element.champ, element.ancienneValeur, referentiels)}</TableCell>
            )}
            <TableCell className="font-bold">{formaterValeurChamp(element.champ, element.valeurProposee, referentiels)}</TableCell>
            <TableCell className="text-sm">{element.motifChangement ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
