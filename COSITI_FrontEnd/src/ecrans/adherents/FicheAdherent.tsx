import { Link, useParams } from "react-router";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdherent, useSituationAdherent } from "@/hooks/useAdherents";
import { usePermission } from "@/auth/ContexteAuth";
import { estErreurApi } from "@/api/erreurs";
import {
  formaterDate,
  formaterMatricule,
  formaterMontant,
  formaterNomComplet,
  formaterTelephone,
} from "@/lib/format";

function LigneChamp({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">{libelle}</dt>
      <dd className="text-texte">{valeur}</dd>
    </div>
  );
}

export function FicheAdherent() {
  const { id } = useParams<{ id: string }>();
  const peutLireDroits = usePermission("DROITS:LIRE");
  const { data: adherent, isLoading, isError, error } = useAdherent(id);
  const { data: situation } = useSituationAdherent(peutLireDroits ? id : undefined);

  if (isLoading) {
    return (
      <CoquilleApplication titre="Fiche adhérent">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </CoquilleApplication>
    );
  }

  if (isError || !adherent) {
    return (
      <CoquilleApplication titre="Fiche adhérent">
        <Alerte teinte="danger" titre="Impossible de charger cet adhérent">
          <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  return (
    <CoquilleApplication titre="Fiche adhérent">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1>{formaterNomComplet(adherent.nom, adherent.prenoms)}</h1>
            <p className="ref text-texte-doux">{formaterMatricule(adherent.matricule)}</p>
          </div>
          <BadgeStatut domaine="adherent" code={adherent.statut} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Identité et coordonnées</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LigneChamp libelle="Téléphone principal" valeur={formaterTelephone(adherent.telephonePrincipal)} />
              <LigneChamp
                libelle="Téléphone secondaire"
                valeur={adherent.telephoneSecondaire ? formaterTelephone(adherent.telephoneSecondaire) : "—"}
              />
              <LigneChamp libelle="Numéro CNI" valeur={adherent.numeroCni ?? "—"} />
              <LigneChamp libelle="Numéro CNPS" valeur={adherent.numeroCnps ?? "—"} />
              <LigneChamp libelle="Localisation" valeur={adherent.localisation} />
              <LigneChamp libelle="Zone" valeur={adherent.zoneLibelle ?? "—"} />
              <LigneChamp libelle="Date d'adhésion" valeur={formaterDate(adherent.dateAdhesion)} />
              <LigneChamp libelle="Agent référent" valeur={adherent.agentReferentNom ?? "Aucun agent référent"} />
            </dl>
          </CardContent>
        </Card>

        {peutLireDroits && situation && (
          <Card>
            <CardHeader>
              <CardTitle>Situation de droits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {situation.avertissements.length > 0 && <AvertissementRegle avertissements={situation.avertissements} />}
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <LigneChamp libelle="Pack" valeur={situation.pack} />
                <LigneChamp libelle="Couvert jusqu'au" valeur={formaterDate(situation.couvertJusquAu)} />
                <LigneChamp libelle="Jours de retard" valeur={String(situation.joursRetard)} />
                <LigneChamp libelle="Cumul cotisé" valeur={formaterMontant(situation.cumulCotise)} />
                <LigneChamp libelle="Éligible CNPS" valeur={situation.eligibleCnps ? "Oui" : "Non"} />
              </dl>
            </CardContent>
          </Card>
        )}

        <p className="text-sm">
          <Link to={`/cotisations?adherentId=${adherent.id}`} className="font-medium text-primaire underline underline-offset-2">
            Voir les cotisations de cet adhérent
          </Link>
        </p>
      </div>
    </CoquilleApplication>
  );
}
