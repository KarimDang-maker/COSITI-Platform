import { ClipboardList } from "lucide-react";
import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { GraphiqueZones } from "@/components/cositi/graphique-zones";
import { CarteSection } from "@/components/cositi/carte-section";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { EtatVide } from "@/components/cositi/etat-vide";
import { ListeElements } from "@/components/cositi/liste-elements";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTableauBordDga } from "@/hooks/useTableauxDeBord";
import { usePeriodeTableauBord } from "@/hooks/usePeriodeTableauBord";
import { formaterMontant, formaterNombre } from "@/lib/format";

/** `/tableaux-de-bord/dga` — Pilotage opérationnel : agents, zones, remontées terrain (Roles des acteurs.md §5). */
export function TableauBordDga() {
  const periode = usePeriodeTableauBord();
  const { data, isLoading, isError, error } = useTableauBordDga(periode.filtres);

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
      periode={periode}
      pleineLargeur={
        data && (
          <>
              <CarteSection
                titre="Activité des agents de terrain"
                contenuPleineLargeur={data.agents.length > 0}
                pied={
                  <p className="text-sm text-texte-doux">
                    Les montants proviennent des paiements réellement enregistrés, pas des comptes rendus
                    déclarés par les agents — les deux peuvent différer, et c'est le contrôle du Gestionnaire
                    des comptes qui les rapproche.
                  </p>
                }
              >
                {data.agents.length === 0 ? (
                  <EtatVide titre="Aucun agent actif." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead className="text-right">Portefeuille</TableHead>
                        <TableHead className="text-right">Paiements saisis</TableHead>
                        <TableHead className="text-right">Montant collecté</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.agents.map((agent) => (
                        <TableRow key={agent.agentId}>
                          <TableCell>
                            <CelluleIdentite nom={agent.nomComplet} detail={<span className="ref">{agent.codeAgent}</span>} />
                          </TableCell>
                          <TableCell>{agent.zoneLibelle ?? "—"}</TableCell>
                          <TableCell className="chiffre text-right">
                            {formaterNombre(agent.nbAdherentsPortefeuille)}
                          </TableCell>
                          <TableCell className="chiffre text-right">{formaterNombre(agent.nbPaiementsSaisis)}</TableCell>
                          <TableCell className="chiffre text-right font-bold">{formaterMontant(agent.montantCollecte)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CarteSection>
    
              {data.objectifsTermes.length === 0 && (
                <p className="text-sm text-texte-doux-fort">
                  Objectifs terrain : non suivis en V1 — le besoin n'est pas confirmé par la COSITI
                  (<span className="ref">[A]</span>, <em>Roles des acteurs.md §14</em>). Rien n'est calculé tant
                  qu'il ne l'est pas.
                </p>
              )}
              </>
        )
      }
    >
      {data && (
        <>
          <GraphiqueZones zones={data.zones} />

          <CarteSection titre="Remontées du terrain">
            <ListeElements
              elements={[
                {
                  cle: "comptes-rendus",
                  icone: ClipboardList,
                  titre: `${data.comptesRendusConsolidesRecus} compte(s) rendu(s) consolidé(s) reçu(s)`,
                  sousTitre: "Consulter les remontées",
                  chemin: "/comptes-rendus",
                },
              ]}
            />
          </CarteSection>

        </>
      )}
    </CadreTableauBord>
  );
}
