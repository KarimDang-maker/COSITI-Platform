import { useState } from "react";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { Skeleton } from "@/components/ui/skeleton";
import { useParcoursAdherent, useResumeParcours } from "@/hooks/useParcoursCnps";
import { estErreurApi } from "@/api/erreurs";
import { LIBELLES_FENETRE } from "@/api/parcoursCnps";
import { formaterDate, formaterMontant } from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";
import {
  BoutonActionParcours,
  DialogueActionParcours,
  type ActionParcours,
} from "@/ecrans/cnps/DialoguesParcours";
import { AlertesVague, CumulQuota, SuiviDepot } from "@/ecrans/cnps/ElementsParcours";

/**
 * Bloc « Parcours CNPS » de l'onglet CNPS de la fiche adhérent : étape, cumul face au quota, délai de dépôt,
 * numéros et action contextuelle. Mêmes composants et mêmes dialogues que l'écran `/cnps/parcours`.
 */
export function BlocParcoursCnps({ adherentId, peutGerer }: { adherentId: string; peutGerer: boolean }) {
  const parcours = useParcoursAdherent(adherentId);
  const resume = useResumeParcours();
  const [action, setAction] = useState<ActionParcours | null>(null);
  const situation = parcours.data;

  return (
    <CarteSection
      titre="Parcours CNPS"
      description={
        resume.data
          ? `${LIBELLES_FENETRE[resume.data.fenetreCourante]} en cours — jour de coupure : le ${resume.data.jourCoupure} du mois.`
          : undefined
      }
      actions={situation && peutGerer ? <BoutonActionParcours situation={situation} onAction={setAction} taille="default" /> : undefined}
      contenuClassName="space-y-4"
    >
      {parcours.isLoading && <Skeleton className="h-24 w-full" />}
      {parcours.isError && (
        <Alerte teinte="danger">
          <p>{estErreurApi(parcours.error) ? parcours.error.message : "Le parcours CNPS n'a pas pu être chargé."}</p>
        </Alerte>
      )}
      {situation && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <BadgeStatut domaine="etapeParcoursCnps" code={situation.etape} />
            <AlertesVague situation={situation} />
          </div>
          <CumulQuota situation={situation} resume={resume.data} />
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LigneChamp libelle="Cumul cotisé validé" valeur={<span className="chiffre">{formaterMontant(situation.cumulCotise)}</span>} />
            <LigneChamp libelle="Fenêtre" valeur={LIBELLES_FENETRE[situation.fenetre]} />
            <LigneChamp libelle="Délai de dépôt" valeur={<SuiviDepot situation={situation} />} />
            <LigneChamp libelle="N° temporaire" valeur={situation.numeroTemporaire ?? "—"} />
            <LigneChamp libelle="Préimmatriculé le" valeur={formaterDate(situation.datePreimmatriculation)} />
            <LigneChamp libelle="N° d'immatriculation" valeur={situation.numeroImmatriculation ?? "—"} />
            <LigneChamp libelle="Immatriculé le" valeur={formaterDate(situation.dateImmatriculation)} />
          </dl>
        </>
      )}
      <DialogueActionParcours action={action} onFermer={() => setAction(null)} />
    </CarteSection>
  );
}
