import { useState } from "react";
import { Activity } from "lucide-react";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Alerte } from "@/components/cositi/alerte";
import { ChampDate } from "@/components/cositi/champ-date";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOperationsAgent } from "@/hooks/useOrganisation";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure } from "@/lib/format";
import { debutJournee, finJournee } from "@/ecrans/agents/periode";

/**
 * Activité et opérations de l'agent (#7, #23) : journal d'audit de l'agent, du plus récent au plus ancien.
 * Seul le filtre par période est proposé, parce que c'est le seul que l'API accepte (`depuis`, `jusqua`) —
 * aucun filtre par type ou statut n'est simulé côté client.
 */
export function OngletActivite({ agentId }: { agentId: string }) {
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");
  const periodeInvalide = !!du && !!au && du > au;
  const { data, isLoading, isError, error, isFetching } = useOperationsAgent(
    agentId,
    periodeInvalide ? undefined : debutJournee(du || undefined),
    periodeInvalide ? undefined : finJournee(au || undefined),
  );

  return (
    <CarteSection
      titre="Activité et opérations"
      description="Actions enregistrées sur cet agent, avec leur auteur."
      contenuClassName="space-y-5"
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="activite-du">Du</Label>
          <ChampDate id="activite-du" value={du} onChange={(e) => setDu(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="activite-au">Au</Label>
          <ChampDate id="activite-au" value={au} onChange={(e) => setAu(e.target.value)} />
        </div>
        {(du || au) && (
          <Button
            variant="outline"
            onClick={() => {
              setDu("");
              setAu("");
            }}
          >
            Toute la période
          </Button>
        )}
        <p className="sr-only" aria-live="polite">
          {isFetching && !isLoading ? "Mise à jour…" : ""}
        </p>
      </div>

      {periodeInvalide && (
        <Alerte teinte="attention">
          <p>La date de début doit précéder la date de fin.</p>
        </Alerte>
      )}
      {isLoading && <Skeleton className="h-32 w-full" />}
      {isError && (
        <Alerte teinte="danger">
          <p>{estErreurApi(error) ? error.message : "L'activité n'a pas pu être chargée."}</p>
        </Alerte>
      )}
      {data && data.length === 0 && (
        <EtatVide icone={Activity} titre="Aucune opération sur cette période" description="Élargissez la période pour voir plus d'activité." />
      )}
      {data && data.length > 0 && (
        <ol className="relative space-y-5 border-l border-bordure pl-6" aria-label="Chronologie des opérations">
          {data.map((operation) => (
            <li key={operation.id} className="relative">
              <span className="absolute top-1.5 -left-[1.9rem] size-3 rounded-full border-2 border-surface bg-primaire" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-2">
                <BadgeStatut domaine="operationAgent" code={operation.typeOperation} />
                <time dateTime={operation.horodatage} className="text-sm text-texte-doux-fort">
                  {formaterDateHeure(operation.horodatage)}
                </time>
              </div>
              <p className="mt-1 text-sm">
                Par <span className="font-semibold">{operation.utilisateurIdentifiant ?? "système"}</span>
                {operation.resultat && operation.resultat !== "SUCCES" ? ` — ${operation.resultat}` : ""}
              </p>
              {operation.motif && <p className="mt-1 text-sm text-texte-doux-fort">Motif : {operation.motif}</p>}
            </li>
          ))}
        </ol>
      )}
    </CarteSection>
  );
}
