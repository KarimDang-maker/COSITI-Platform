import { Link, useParams } from "react-router";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdherent } from "@/hooks/useAdherents";
import { useSituationDroits, usePeriodesDroits } from "@/hooks/useDroits";
import { usePermission } from "@/auth/ContexteAuth";
import { estErreurApi } from "@/api/erreurs";
import {
  formaterDate,
  formaterMatricule,
  formaterMontant,
  formaterNomComplet,
  formaterNombre,
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
  // `DROITS:LIRE`, utilisé depuis J2 en anticipation du domaine `droits`,
  // est désormais confirmé réel : `V8__permissions_j5_j6.sql` (backend,
  // livré en parallèle de ce lot) l'accorde à tous les rôles métier
  // (PCA/DG/DGA/DAF/GESTIONNAIRE_COMPTE/CHEF_AGENT_TERRAIN/AGENT_TERRAIN),
  // jamais à `SUPER_ADMIN`.
  const peutLireDroits = usePermission("DROITS:LIRE");
  const { data: adherent, isLoading, isError, error } = useAdherent(id);
  const { data: situation } = useSituationDroits(peutLireDroits ? id : undefined);
  const { data: periodes } = usePeriodesDroits(peutLireDroits ? id : undefined);

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
                <LigneChamp libelle="Couvert jusqu'au" valeur={formaterDate(situation.couvertJusquAu)} />
                <LigneChamp libelle="Jours couverts (cumul)" valeur={formaterNombre(situation.joursCouvertsTotal)} />
                <LigneChamp libelle="Jours de retard" valeur={formaterNombre(situation.joursRetard)} />
                <LigneChamp libelle="Cumul cotisé" valeur={formaterMontant(situation.cumulCotise)} />
                <LigneChamp libelle="Éligible CNPS" valeur={situation.eligibleCnps ? "Oui" : "Non"} />
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">
                    Statut de régularité
                  </dt>
                  <dd>
                    <BadgeStatut domaine="regularite" code={situation.statut} />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {peutLireDroits && periodes && (
          <Card>
            <CardHeader>
              <CardTitle>Périodes de droits</CardTitle>
            </CardHeader>
            <CardContent>
              {periodes.length === 0 ? (
                <EtatVide
                  titre="Aucune période de droits enregistrée"
                  description="Aucun paiement n'a encore ouvert de période de couverture pour cet adhérent."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      <TableHead>Jours couverts</TableHead>
                      <TableHead>Montant imputé</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodes.map((periode) => (
                      <TableRow key={periode.id}>
                        <TableCell>
                          {formaterDate(periode.dateDebut)} — {formaterDate(periode.dateFin)}
                        </TableCell>
                        <TableCell className="chiffre">{formaterNombre(periode.joursCouverts)}</TableCell>
                        <TableCell className="chiffre">{formaterMontant(periode.montantImpute)}</TableCell>
                        <TableCell>
                          <BadgeStatut domaine="periodeDroits" code={periode.statut} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
