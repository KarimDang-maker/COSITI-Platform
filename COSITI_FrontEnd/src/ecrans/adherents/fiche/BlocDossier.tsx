import { useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { CarteSection } from "@/components/cositi/carte-section";
import { BarreProgression } from "@/components/cositi/barre-progression";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompletion, useEtatDossier } from "@/hooks/useAdherents";
import { LIBELLES_TYPE_DOCUMENT } from "@/api/documents";
import { estErreurApi } from "@/api/erreurs";
import { formaterNombre } from "@/lib/format";
import { CLASSES_TEINTE } from "@/lib/statuts";
import { cn } from "@/lib/utils";
import { DialogueCompleterDossier } from "@/ecrans/adherents/fiche/DialogueCompleterDossier";

interface BlocDossierProps {
  adherentId: string;
  peutModifier: boolean;
  /** Bascule vers l'onglet Documents, où se dépose une pièce manquante. */
  onVoirDocuments?: () => void;
}

/**
 * État du dossier (#17) : statut, taux de complétion (#14), champs manquants (#15) et pièces manquantes
 * (#18), tels que le serveur les évalue. Aucune étape ni transition n'est déduite ici : l'écran recopie
 * l'évaluation serveur et oriente vers l'action qui la fait progresser.
 */
export function BlocDossier({ adherentId, peutModifier, onVoirDocuments }: BlocDossierProps) {
  const dossier = useEtatDossier(adherentId);
  const completion = useCompletion(adherentId);
  const [completerOuvert, setCompleterOuvert] = useState(false);

  if (dossier.isLoading) {
    return (
      <CarteSection titre="État du dossier">
        <Skeleton className="h-28 w-full" />
      </CarteSection>
    );
  }

  if (dossier.isError || !dossier.data) {
    return (
      <CarteSection titre="État du dossier">
        <Alerte teinte="danger">
          <p>{estErreurApi(dossier.error) ? dossier.error.message : "L'état du dossier n'a pas pu être chargé."}</p>
        </Alerte>
      </CarteSection>
    );
  }

  const etat = dossier.data;
  const avertissements = [...new Set([...etat.avertissements, ...(completion.data?.avertissements ?? [])])];
  const pourcentage = etat.completionPourcentage;
  const detailCompletion = completion.data
    ? `${formaterNombre(completion.data.champsRenseignes)} information${completion.data.champsRenseignes > 1 ? "s" : ""} sur ${formaterNombre(completion.data.champsTotal)}`
    : undefined;

  return (
    <CarteSection
      titre="État du dossier"
      description={detailCompletion}
      actions={
        peutModifier && etat.champsManquants.length > 0 ? (
          <Button size="sm" onClick={() => setCompleterOuvert(true)}>
            Compléter le dossier
          </Button>
        ) : undefined
      }
      contenuClassName="space-y-5"
    >
      {avertissements.length > 0 && <AvertissementRegle avertissements={avertissements} />}

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Étapes du dossier">
        <li className="rounded-lg bg-fond p-4">
          <p className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Statut</p>
          <div className="mt-2">
            <BadgeStatut domaine="adherent" code={etat.statut} />
          </div>
        </li>
        <li className="rounded-lg bg-fond p-4">
          <EtapeEtat
            libelle="Informations"
            complete={etat.champsManquants.length === 0}
            texte={etat.champsManquants.length === 0 ? "Complètes" : `${etat.champsManquants.length} à compléter`}
          />
        </li>
        <li className="rounded-lg bg-fond p-4">
          <EtapeEtat
            libelle="Pièces justificatives"
            complete={etat.documentsManquants.length === 0}
            texte={etat.documentsManquants.length === 0 ? "Fournies" : `${etat.documentsManquants.length} manquante${etat.documentsManquants.length > 1 ? "s" : ""}`}
          />
        </li>
      </ol>

      <BarreProgression
        libelle="Complétion du dossier"
        ratio={pourcentage / 100}
        valeur={`${formaterNombre(pourcentage)} %`}
        teinte={pourcentage >= 100 ? "primaire" : "marque"}
      />

      {etat.champsManquants.length > 0 && (
        <section aria-labelledby="titre-champs-manquants">
          <h3 id="titre-champs-manquants" className="mb-2 text-sm font-bold text-titre">
            Informations à compléter
          </h3>
          <ul className="flex flex-wrap gap-2">
            {etat.champsManquants.map((champ) => (
              <li key={champ.cle} className={cn("rounded-full border px-3 py-1 text-sm", CLASSES_TEINTE.attention)}>
                {champ.libelle}
              </li>
            ))}
          </ul>
        </section>
      )}

      {etat.documentsManquants.length > 0 && (
        <section aria-labelledby="titre-pieces-manquantes">
          <h3 id="titre-pieces-manquantes" className="mb-2 text-sm font-bold text-titre">
            Pièces obligatoires manquantes
          </h3>
          <ul className="flex flex-wrap items-center gap-2">
            {etat.documentsManquants.map((type) => (
              <li key={type} className={cn("rounded-full border px-3 py-1 text-sm", CLASSES_TEINTE.attention)}>
                {LIBELLES_TYPE_DOCUMENT[type] ?? type}
              </li>
            ))}
            {onVoirDocuments && (
              <li>
                <Button size="sm" variant="outline" onClick={onVoirDocuments}>
                  Voir les documents
                </Button>
              </li>
            )}
          </ul>
        </section>
      )}

      {peutModifier && (
        <DialogueCompleterDossier adherentId={adherentId} ouvert={completerOuvert} onOuvertChange={setCompleterOuvert} />
      )}
    </CarteSection>
  );
}

function EtapeEtat({ libelle, complete, texte }: { libelle: string; complete: boolean; texte: string }) {
  const Icone = complete ? CheckCircle2 : CircleAlert;
  return (
    <>
      <p className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">{libelle}</p>
      <p className={complete ? "mt-2 flex items-center gap-2 font-semibold text-succes-fort" : "mt-2 flex items-center gap-2 font-semibold text-attention-fort"}>
        <Icone className="size-4" aria-hidden="true" />
        {texte}
      </p>
    </>
  );
}
