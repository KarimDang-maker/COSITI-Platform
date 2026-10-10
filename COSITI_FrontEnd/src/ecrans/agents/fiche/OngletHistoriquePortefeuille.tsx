import { Link } from "react-router";
import { History } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { CarteSection } from "@/components/cositi/carte-section";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Alerte } from "@/components/cositi/alerte";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHistoriquePortefeuille } from "@/hooks/useOrganisation";
import { obtenirAdherent } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterNomComplet } from "@/lib/format";

/**
 * Historique du portefeuille (#24) : affectations ouvertes et clôturées, jamais supprimées. Le DTO ne porte
 * que l'identifiant de l'adhérent ; l'identité est relue par `GET /adherents/{id}` (même cache que la
 * fiche adhérent). Un adhérent hors du périmètre du demandeur reste listé, sans son identité.
 *
 * TODO [A] : ajouter matricule et nom à `AffectationPortefeuilleDto` éviterait une requête par adhérent.
 */
export function OngletHistoriquePortefeuille({ agentId, peutLireAdherents }: { agentId: string; peutLireAdherents: boolean }) {
  const { data, isLoading, isError, error } = useHistoriquePortefeuille(agentId);
  const identifiants = [...new Set((data ?? []).map((ligne) => ligne.adherentId))];
  const identites = useQueries({
    queries: identifiants.map((id) => ({
      queryKey: ["adherents", "detail", id],
      queryFn: () => obtenirAdherent(id),
      enabled: peutLireAdherents,
      retry: false,
      staleTime: 60 * 1000,
    })),
  });
  const parId = new Map(identifiants.map((id, index) => [id, identites[index]]));

  return (
    <CarteSection
      titre="Historique du portefeuille"
      description="Affectations successives, de la plus récente à la plus ancienne."
      contenuPleineLargeur={!!data && data.length > 0}
    >
      {isLoading && <Skeleton className="h-24 w-full" />}
      {isError && (
        <Alerte teinte="danger">
          <p>{estErreurApi(error) ? error.message : "L'historique n'a pas pu être chargé."}</p>
        </Alerte>
      )}
      {data && data.length === 0 && <EtatVide icone={History} titre="Aucune affectation enregistrée" />}
      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Adhérent</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Motif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((ligne, index) => {
              const identite = parId.get(ligne.adherentId);
              const adherent = identite?.data;
              return (
                <TableRow key={`${ligne.adherentId}-${ligne.dateDebut}-${index}`}>
                  <TableCell>
                    {adherent ? (
                      <Link to={`/adherents/${ligne.adherentId}`} className="font-medium text-primaire underline underline-offset-2">
                        {formaterNomComplet(adherent.nom, adherent.prenoms)}
                        <span className="ref ml-2 text-texte-doux-fort">{adherent.matricule}</span>
                      </Link>
                    ) : identite?.isLoading ? (
                      <Skeleton className="h-4 w-40" />
                    ) : (
                      <span className="text-texte-doux-fort">Adhérent hors de votre périmètre</span>
                    )}
                  </TableCell>
                  <TableCell>{formaterDate(ligne.dateDebut)}</TableCell>
                  <TableCell>{ligne.dateFin ? formaterDate(ligne.dateFin) : <strong>En cours</strong>}</TableCell>
                  <TableCell className="max-w-72 text-sm">{ligne.motif ?? "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </CarteSection>
  );
}
