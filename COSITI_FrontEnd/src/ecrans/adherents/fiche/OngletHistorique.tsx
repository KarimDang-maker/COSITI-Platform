import { useState } from "react";
import { History } from "lucide-react";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Alerte } from "@/components/cositi/alerte";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHistoriqueAdherent } from "@/hooks/useAdherents";
import { estErreurApi } from "@/api/erreurs";
import { definitionStatut } from "@/lib/statuts";
import { formaterDateHeure } from "@/lib/format";

/**
 * Historique de l'adhérent (#21) : les lignes du journal d'audit que le serveur autorise ce demandeur à
 * voir, du plus récent au plus ancien. Le filtre par type d'action ne fait que restreindre l'affichage
 * de la réponse déjà reçue — il ne recalcule rien.
 */
export function OngletHistorique({ adherentId }: { adherentId: string }) {
  const { data, isLoading, isError, error } = useHistoriqueAdherent(adherentId);
  const [type, setType] = useState<string>("TOUS");

  const types = [...new Set((data ?? []).map((e) => e.typeOperation))];
  const evenements = (data ?? []).filter((e) => type === "TOUS" || e.typeOperation === type);

  return (
    <CarteSection
      titre="Historique"
      description="Actions enregistrées sur cet adhérent, avec leur auteur."
      actions={
        types.length > 1 ? (
          <div className="flex items-center gap-2">
            <Label htmlFor="filtre-historique" className="sr-only">
              Type d'action
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="filtre-historique" className="w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Toutes les actions</SelectItem>
                {types.map((code) => (
                  <SelectItem key={code} value={code}>
                    {definitionStatut("operationAdherent", code).libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : undefined
      }
    >
      {isLoading && <Skeleton className="h-32 w-full" />}
      {isError && (
        <Alerte teinte="danger">
          <p>{estErreurApi(error) ? error.message : "L'historique n'a pas pu être chargé."}</p>
        </Alerte>
      )}
      {data && data.length === 0 && (
        <EtatVide icone={History} titre="Aucune action enregistrée" description="L'historique de cet adhérent est vide." />
      )}
      {evenements.length > 0 && (
        <ol className="relative space-y-5 border-l border-bordure pl-6" aria-label="Chronologie">
          {evenements.map((evenement) => (
            <li key={evenement.id} className="relative">
              <span className="absolute top-1.5 -left-[1.9rem] size-3 rounded-full border-2 border-surface bg-primaire" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-2">
                <BadgeStatut domaine="operationAdherent" code={evenement.typeOperation} />
                <time dateTime={evenement.horodatage} className="text-sm text-texte-doux-fort">
                  {formaterDateHeure(evenement.horodatage)}
                </time>
              </div>
              <p className="mt-1 text-sm">
                Par <span className="font-semibold">{evenement.utilisateurIdentifiant ?? "système"}</span>
                {evenement.resultat && evenement.resultat !== "SUCCES" ? ` — ${evenement.resultat}` : ""}
              </p>
              {evenement.motif && <p className="mt-1 text-sm text-texte-doux-fort">Motif : {evenement.motif}</p>}
            </li>
          ))}
        </ol>
      )}
    </CarteSection>
  );
}
