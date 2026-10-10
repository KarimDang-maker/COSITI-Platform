import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Skeleton } from "@/components/ui/skeleton";
import { useAvantagesAdherent } from "@/hooks/useAvantages";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate } from "@/lib/format";

interface OngletAvantagesProps {
  adherentId: string;
}

/**
 * Avantages et couvertures de l'adhérent (`GET /adherents/{id}/avantages`) : le statut, les critères remplis et
 * manquants sont ceux du moteur serveur ; l'onglet n'évalue rien.
 */
export function OngletAvantages({ adherentId }: OngletAvantagesProps) {
  const avantages = useAvantagesAdherent(adherentId);

  if (avantages.isLoading) return <Skeleton className="h-40 w-full" />;
  if (avantages.isError) {
    return (
      <Alerte teinte="danger" titre="Impossible de charger les avantages de l'adhérent">
        <p>{estErreurApi(avantages.error) ? avantages.error.message : "Une erreur inattendue est survenue."}</p>
      </Alerte>
    );
  }
  if (!avantages.data || avantages.data.length === 0) {
    return <EtatVide titre="Aucun avantage évalué" description="Les avantages apparaissent après le prochain recalcul." />;
  }

  return (
    <div className="space-y-4">
      {avantages.data.map((avantage) => (
        <CarteSection
          key={avantage.avantageId}
          titre={avantage.libelle}
          niveauTitre="h3"
          actions={<BadgeStatut domaine="statutAvantage" code={avantage.statut} />}
          description={
            avantage.dateDebut
              ? `Depuis le ${formaterDate(avantage.dateDebut)}${avantage.dateFin ? ` — jusqu'au ${formaterDate(avantage.dateFin)}` : ""}`
              : undefined
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-sm font-semibold text-titre">Critères remplis</h4>
              {avantage.criteresSatisfaits.length === 0 ? (
                <p className="text-sm text-texte-doux">Aucun.</p>
              ) : (
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {avantage.criteresSatisfaits.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="mb-1 text-sm font-semibold text-titre">Critères manquants</h4>
              {avantage.criteresManquants.length === 0 ? (
                <p className="text-sm text-texte-doux">Aucun.</p>
              ) : (
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {avantage.criteresManquants.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CarteSection>
      ))}
    </div>
  );
}
