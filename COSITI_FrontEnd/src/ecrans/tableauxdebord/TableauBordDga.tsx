import { Link } from "react-router";
import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { GraphiqueZones } from "@/components/cositi/graphique-zones";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTableauBordDga } from "@/hooks/useTableauxDeBord";
import { formaterMontant, formaterNombre } from "@/lib/format";

/** `/tableaux-de-bord/dga` — Pilotage opérationnel : agents, zones, remontées terrain (Roles des acteurs.md §5). */
export function TableauBordDga() {
  const { data, isLoading, isError, error } = useTableauBordDga();

  return (
    <CadreTableauBord
      titre="Tableau de bord — Direction générale adjointe"
      sousTitre="Activité opérationnelle, agents de terrain et comptes rendus consolidés."
      chargement={isLoading}
      enErreur={isError}
      erreur={error}
      indicateurs={data?.indicateurs}
      clePrincipale="tauxActivation"
      alertes={data?.alertes}
      avertissements={data?.avertissements}
    >
      {data && (
        <>
          <p className="text-texte-doux">
            {data.comptesRendusConsolidesRecus} compte(s) rendu(s) consolidé(s) reçu(s) —{" "}
            <Link className="underline" to="/comptes-rendus">
              consulter les remontées
            </Link>
          </p>

          <GraphiqueZones zones={data.zones} />

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-titre">Activité des agents de terrain</h2>
            {data.agents.length === 0 ? (
              <p className="text-texte-doux">Aucun agent actif.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Portefeuille</TableHead>
                    <TableHead>Paiements saisis</TableHead>
                    <TableHead>Montant collecté</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.agents.map((agent) => (
                    <TableRow key={agent.agentId}>
                      <TableCell>
                        <span className="ref">{agent.codeAgent}</span> {agent.nomComplet}
                      </TableCell>
                      <TableCell>{agent.zoneLibelle ?? "—"}</TableCell>
                      <TableCell className="chiffre">
                        {formaterNombre(agent.nbAdherentsPortefeuille)}
                      </TableCell>
                      <TableCell className="chiffre">{formaterNombre(agent.nbPaiementsSaisis)}</TableCell>
                      <TableCell className="chiffre">{formaterMontant(agent.montantCollecte)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="text-sm text-texte-doux">
              Les montants proviennent des paiements réellement enregistrés, pas des comptes rendus
              déclarés par les agents — les deux peuvent différer, et c'est le contrôle du Gestionnaire
              des comptes qui les rapproche.
            </p>
          </section>

          {data.objectifsTermes.length === 0 && (
            <p className="text-sm text-texte-doux">
              Objectifs terrain : non suivis en V1 — le besoin n'est pas confirmé par la COSITI
              (<span className="ref">[A]</span>, <em>Roles des acteurs.md §14</em>). Rien n'est calculé tant
              qu'il ne l'est pas.
            </p>
          )}
        </>
      )}
    </CadreTableauBord>
  );
}
