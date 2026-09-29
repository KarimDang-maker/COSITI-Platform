import { Link } from "react-router";
import { CarteSection } from "@/components/cositi/carte-section";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { BarreProgression } from "@/components/cositi/barre-progression";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Alerte } from "@/components/cositi/alerte";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useResumeCotisations } from "@/hooks/useAdherents";
import { usePeriodesDroits, useSituationDroits } from "@/hooks/useDroits";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterMontant, formaterNombre } from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";

interface OngletCotisationsProps {
  adherentId: string;
  /** `DROITS:LIRE` et `PAIEMENT:LIRE` : le résumé compose la situation de droits et le journal des paiements. */
  peutLireResume: boolean;
  peutLireDroits: boolean;
  peutLirePaiements: boolean;
}

/**
 * Résumé financier de l'adhérent (#28) et situation de droits (J6). Tous les montants sont ceux du
 * serveur ; la progression vers le seuil n'est affichée que s'il l'a calculée.
 */
export function OngletCotisations({ adherentId, peutLireResume, peutLireDroits, peutLirePaiements }: OngletCotisationsProps) {
  const resume = useResumeCotisations(adherentId, peutLireResume);
  const { data: situation } = useSituationDroits(peutLireDroits ? adherentId : undefined);
  const { data: periodes } = usePeriodesDroits(peutLireDroits ? adherentId : undefined);

  return (
    <div className="space-y-6">
      {peutLireResume && (
        <CarteSection titre="Résumé des cotisations" contenuClassName="space-y-5">
          {resume.isLoading && <Skeleton className="h-28 w-full" />}
          {resume.isError && (
            <Alerte teinte="danger">
              <p>{estErreurApi(resume.error) ? resume.error.message : "Le résumé des cotisations n'a pas pu être chargé."}</p>
            </Alerte>
          )}
          {resume.data && (
            <>
              {resume.data.avertissements.length > 0 && <AvertissementRegle avertissements={resume.data.avertissements} />}
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <LigneChamp libelle="Montant validé" valeur={<span className="chiffre">{formaterMontant(resume.data.montantValide)}</span>} />
                <LigneChamp libelle="En attente de contrôle" valeur={<span className="chiffre">{formaterMontant(resume.data.montantEnAttente)}</span>} />
                <LigneChamp libelle="Reste avant le seuil CNPS" valeur={<span className="chiffre">{formaterMontant(resume.data.resteAvantSeuil)}</span>} />
                <LigneChamp libelle="Couvert jusqu'au" valeur={formaterDate(resume.data.couvertJusquAu)} />
              </dl>
              {resume.data.pourcentageProgression !== null ? (
                <BarreProgression
                  libelle={
                    resume.data.seuilEligibiliteCnps !== null
                      ? `Progression vers le seuil CNPS (${formaterMontant(resume.data.seuilEligibiliteCnps)})`
                      : "Progression vers le seuil CNPS"
                  }
                  ratio={resume.data.pourcentageProgression / 100}
                  valeur={resume.data.eligibleCnps ? "Seuil atteint" : `${formaterNombre(resume.data.pourcentageProgression)} %`}
                  teinte={resume.data.eligibleCnps ? "primaire" : "marque"}
                />
              ) : (
                <p className="text-sm text-texte-doux-fort">La progression vers le seuil n'est pas disponible pour cet adhérent.</p>
              )}
              <p className="text-xs text-texte-doux">
                Seules les cotisations validées comptent pour le seuil ; les montants en attente ne sont pas inclus.
              </p>
            </>
          )}
        </CarteSection>
      )}

      {peutLireDroits && situation && (
        <CarteSection titre="Situation de droits" contenuClassName="space-y-4">
          {situation.avertissements.length > 0 && <AvertissementRegle avertissements={situation.avertissements} />}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LigneChamp libelle="Couvert jusqu'au" valeur={formaterDate(situation.couvertJusquAu)} />
            <LigneChamp libelle="Jours couverts (cumul)" valeur={formaterNombre(situation.joursCouvertsTotal)} />
            <LigneChamp libelle="Jours de retard" valeur={formaterNombre(situation.joursRetard)} />
            <LigneChamp libelle="Cumul cotisé" valeur={formaterMontant(situation.cumulCotise)} />
            <LigneChamp libelle="Éligible CNPS" valeur={situation.eligibleCnps ? "Oui" : "Non"} />
            <LigneChamp libelle="Statut de régularité" valeur={<BadgeStatut domaine="regularite" code={situation.statut} />} />
          </dl>
        </CarteSection>
      )}

      {peutLireDroits && periodes && (
        // Le tableau touche les bords de la carte ; l'état vide garde ses marges.
        <CarteSection titre="Périodes de droits" contenuPleineLargeur={periodes.length > 0}>
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
        </CarteSection>
      )}

      {peutLirePaiements && (
        <p className="text-sm">
          <Link to={`/cotisations?adherentId=${adherentId}`} className="font-medium text-primaire underline underline-offset-2">
            Voir les cotisations de cet adhérent
          </Link>
        </p>
      )}
    </div>
  );
}
