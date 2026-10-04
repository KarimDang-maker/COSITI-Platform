import { Link } from "react-router";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/auth/ContexteAuth";
import { useSyntheseFraisAgent } from "@/hooks/useAdhesion";
import { estErreurApi } from "@/api/erreurs";
import { formaterEcart, formaterMontant, formaterNombre } from "@/lib/format";

/**
 * Frais d'adhésion collectés par l'agent (`GET /frais-adhesion/agents/{id}/synthese`, `FRAIS_ADHESION:LIRE`) :
 * nombre, montants attendu et reçu, écart et répartition par statut, tels que calculés par le serveur. Le lien
 * ouvre la liste des frais filtrée sur l'agent.
 */
export function CarteFraisAgent({ agentId }: { agentId: string }) {
  const peutLire = usePermission("FRAIS_ADHESION:LIRE");
  const synthese = useSyntheseFraisAgent(agentId, peutLire);
  if (!peutLire) return null;

  return (
    <CarteSection
      titre="Frais d'adhésion collectés"
      description="Frais d'adhésion enregistrés au nom de cet agent, toutes périodes confondues."
      actions={
        <Link className="text-sm font-semibold text-primaire underline-offset-4 hover:underline" to={`/frais-adhesion?agent=${agentId}`}>
          Voir le détail
        </Link>
      }
    >
      {synthese.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : synthese.isError || !synthese.data ? (
        <Alerte teinte="danger" titre="Synthèse indisponible">
          <p>{estErreurApi(synthese.error) ? synthese.error.message : "La synthèse des frais n'a pas pu être chargée."}</p>
        </Alerte>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm text-texte-doux-fort">Frais enregistrés</dt>
              <dd className="chiffre text-xl font-bold">{formaterNombre(synthese.data.nombreFrais)}</dd>
            </div>
            <div>
              <dt className="text-sm text-texte-doux-fort">Montant attendu</dt>
              <dd className="chiffre text-xl font-bold">{formaterMontant(synthese.data.montantAttendu)}</dd>
            </div>
            <div>
              <dt className="text-sm text-texte-doux-fort">Montant reçu</dt>
              <dd className="chiffre text-xl font-bold">{formaterMontant(synthese.data.montantRecu)}</dd>
            </div>
            <div>
              <dt className="text-sm text-texte-doux-fort">Écart</dt>
              <dd className="chiffre text-xl font-bold">{formaterEcart(synthese.data.ecart)}</dd>
            </div>
          </dl>
          <ul className="flex flex-wrap gap-3 text-sm" aria-label="Frais par statut">
            {Object.entries(synthese.data.nombreParStatut).map(([code, nombre]) => (
              <li key={code} className="flex items-center gap-2">
                <BadgeStatut domaine="fraisAdhesion" code={code} /> {formaterNombre(nombre)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </CarteSection>
  );
}
