import { useState } from "react";
import { Link } from "react-router";
import { CarteSection } from "@/components/cositi/carte-section";
import { CarteIndicateur } from "@/components/cositi/carte-indicateur";
import { BarreProgression } from "@/components/cositi/barre-progression";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChargeAgent,
  useOperationsAgent,
  useResumeCotisationsAgent,
  useResumePortefeuille,
} from "@/hooks/useOrganisation";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure, formaterMoisAnnee, formaterMontant, formaterNombre } from "@/lib/format";
import { estMoisValide, moisCourant } from "@/ecrans/agents/periode";
import { CarteFraisAgent } from "@/ecrans/adhesion/CarteFraisAgent";

interface OngletSyntheseProps {
  agentId: string;
  /** `PAIEMENT:LIRE` : le résumé des cotisations lit le journal des paiements. */
  peutLirePaiements: boolean;
  /** `ADHERENT:LIRE` : les indicateurs de complétion ouvrent la liste des adhérents filtrée. */
  peutLireAdherents: boolean;
}

/**
 * Indicateurs descriptifs de l'agent : portefeuille (#8, #10, #11), charge (#20), cotisations sur la
 * période choisie (#14, #15) et dernière activité (#22). Chaque valeur vient du serveur ; aucun score ni
 * qualificatif de performance n'est produit ici.
 */
export function OngletSynthese({ agentId, peutLirePaiements, peutLireAdherents }: OngletSyntheseProps) {
  const [saisieMois, setSaisieMois] = useState(moisCourant());
  const periode = estMoisValide(saisieMois) ? saisieMois : moisCourant();

  const resume = useResumePortefeuille(agentId);
  const charge = useChargeAgent(agentId, periode);
  const cotisations = useResumeCotisationsAgent(agentId, periode, peutLirePaiements);
  const operations = useOperationsAgent(agentId);
  const derniere = operations.data?.[0];
  const libellePeriode = formaterMoisAnnee(`${periode}-01`);

  return (
    <div className="space-y-6">
      <CarteSection titre="Portefeuille" description="État actuel, calculé à l'ouverture de la fiche." contenuClassName="space-y-5">
        {resume.isLoading && <Skeleton className="h-24 w-full" />}
        {resume.isError && (
          <Alerte teinte="danger">
            <p>{estErreurApi(resume.error) ? resume.error.message : "Le résumé du portefeuille n'a pas pu être chargé."}</p>
          </Alerte>
        )}
        {resume.data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <CarteIndicateur indicateur={{ cle: "total", libelle: "Adhérents suivis", valeur: resume.data.totalAdherents, unite: "NOMBRE" }} />
              <CarteIndicateur
                indicateur={{ cle: "complets", libelle: "Dossiers complets", valeur: resume.data.dossiersComplets, unite: "NOMBRE" }}
                lien={peutLireAdherents ? { libelle: "Voir les dossiers complets", chemin: `/adherents?agentId=${agentId}&completion=100-100` } : undefined}
              />
              <CarteIndicateur
                indicateur={{ cle: "incomplets", libelle: "Dossiers incomplets", valeur: resume.data.dossiersIncomplets, unite: "NOMBRE" }}
                lien={peutLireAdherents ? { libelle: "Voir les dossiers incomplets", chemin: `/adherents?agentId=${agentId}&completion=0-99` } : undefined}
              />
            </div>
            {resume.data.totalAdherents > 0 && (
              <BarreProgression
                libelle="Part des dossiers complets"
                ratio={resume.data.dossiersComplets / resume.data.totalAdherents}
                valeur={`${formaterNombre(resume.data.dossiersComplets)} sur ${formaterNombre(resume.data.totalAdherents)}`}
              />
            )}
            <p className="text-xs text-texte-doux">
              Complétion évaluée par la même règle que la fiche adhérent (liste de champs provisoire, non validée par la COSITI).
            </p>
          </>
        )}
      </CarteSection>

      <CarteSection
        titre="Activité du mois"
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="periode-agent">Période</Label>
            <Input
              id="periode-agent"
              type="month"
              className="w-44"
              value={saisieMois}
              max={moisCourant()}
              onChange={(evenement) => setSaisieMois(evenement.target.value)}
            />
          </div>
        }
        contenuClassName="space-y-5"
      >
        {peutLirePaiements && (
          <section aria-labelledby="titre-cotisations-agent" className="space-y-3">
            <h3 id="titre-cotisations-agent" className="text-sm font-bold text-titre">
              Cotisations enregistrées — {libellePeriode}
            </h3>
            {cotisations.isLoading && <Skeleton className="h-20 w-full" />}
            {cotisations.isError && (
              <Alerte teinte="danger">
                <p>{estErreurApi(cotisations.error) ? cotisations.error.message : "Le résumé des cotisations n'a pas pu être chargé."}</p>
              </Alerte>
            )}
            {cotisations.data && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <CarteIndicateur indicateur={{ cle: "nb", libelle: "Paiements", valeur: cotisations.data.nombrePaiements, unite: "NOMBRE" }} />
                <CarteIndicateur indicateur={{ cle: "valide", libelle: "Validés", valeur: cotisations.data.montantValide, unite: "MONTANT" }} />
                <CarteIndicateur indicateur={{ cle: "attente", libelle: "En attente de contrôle", valeur: cotisations.data.montantEnAttente, unite: "MONTANT" }} />
                <CarteIndicateur indicateur={{ cle: "annule", libelle: "Annulés", valeur: cotisations.data.montantAnnule, unite: "MONTANT" }} />
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="titre-charge-agent" className="space-y-3">
          <h3 id="titre-charge-agent" className="text-sm font-bold text-titre">
            Charge du portefeuille
          </h3>
          {charge.isLoading && <Skeleton className="h-12 w-full" />}
          {charge.isError && (
            <Alerte teinte="danger">
              <p>{estErreurApi(charge.error) ? charge.error.message : "La charge n'a pas pu être chargée."}</p>
            </Alerte>
          )}
          {charge.data &&
            (charge.data.objectifCollecteMensuel ? (
              <BarreProgression
                libelle={`Collecte validée sur l'objectif de ${formaterMontant(charge.data.objectifCollecteMensuel)}`}
                ratio={charge.data.montantCollecte / charge.data.objectifCollecteMensuel}
                valeur={formaterMontant(charge.data.montantCollecte)}
              />
            ) : (
              <p className="text-sm">
                Collecte validée : <span className="chiffre font-semibold">{formaterMontant(charge.data.montantCollecte)}</span> —
                aucun objectif mensuel fixé.
              </p>
            ))}
        </section>
      </CarteSection>

      <CarteFraisAgent agentId={agentId} />

      <CarteSection titre="Dernière activité enregistrée">
        {operations.isLoading && <Skeleton className="h-10 w-full" />}
        {operations.isError && (
          <Alerte teinte="danger">
            <p>{estErreurApi(operations.error) ? operations.error.message : "L'activité n'a pas pu être chargée."}</p>
          </Alerte>
        )}
        {operations.data && !derniere && <p className="text-texte-doux-fort">Aucune opération enregistrée sur cet agent.</p>}
        {derniere && (
          <div className="flex flex-wrap items-center gap-3">
            <BadgeStatut domaine="operationAgent" code={derniere.typeOperation} />
            <time dateTime={derniere.horodatage} className="font-semibold">
              {formaterDateHeure(derniere.horodatage)}
            </time>
            <span className="text-sm text-texte-doux-fort">par {derniere.utilisateurIdentifiant ?? "système"}</span>
            <Link to="?onglet=activite" className="text-sm font-medium text-primaire underline underline-offset-2">
              Toute l'activité
            </Link>
          </div>
        )}
      </CarteSection>
    </div>
  );
}
