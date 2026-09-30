import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEtatDossier, useResumeCotisations } from "@/hooks/useAdherents";
import { useDossiersCnps, useOuvrirDossierCnps } from "@/hooks/useCnps";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterMontant, formaterNombre } from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";

interface OngletCnpsProps {
  adherentId: string;
  nomAdherent: string;
  peutLireResume: boolean;
  peutLireCnps: boolean;
  peutGererCnps: boolean;
}

/**
 * Éligibilité à la pré-immatriculation CNPS (#27). Deux notions distinctes, affichées séparément :
 * l'**éligibilité** (cumul validé ≥ seuil du pack, évaluée par le serveur) et la **complétude** du
 * dossier adhérent (informations et pièces). Être éligible ne signifie pas que le dossier est complet.
 */
export function OngletCnps({ adherentId, nomAdherent, peutLireResume, peutLireCnps, peutGererCnps }: OngletCnpsProps) {
  const navigate = useNavigate();
  const resume = useResumeCotisations(adherentId, peutLireResume);
  const etat = useEtatDossier(adherentId);
  const dossiers = useDossiersCnps({ adherentId, taille: 1 }, peutLireCnps);
  const ouvrir = useOuvrirDossierCnps();
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  const dossierCnps = dossiers.data?.contenu[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {peutLireResume && (
          <CarteSection titre="Éligibilité à la pré-immatriculation" contenuClassName="space-y-4">
            {resume.isLoading && <Skeleton className="h-20 w-full" />}
            {resume.isError && (
              <Alerte teinte="danger">
                <p>{estErreurApi(resume.error) ? resume.error.message : "L'éligibilité n'a pas pu être chargée."}</p>
              </Alerte>
            )}
            {resume.data && (
              <>
                <Condition
                  remplie={resume.data.eligibleCnps}
                  texte={
                    resume.data.eligibleCnps
                      ? "Seuil de cotisations validées atteint"
                      : `Seuil non atteint — il reste ${formaterMontant(resume.data.resteAvantSeuil)} de cotisations validées`
                  }
                />
                <dl className="grid grid-cols-2 gap-4">
                  <LigneChamp libelle="Cumul validé" valeur={<span className="chiffre">{formaterMontant(resume.data.montantValide)}</span>} />
                  <LigneChamp
                    libelle="Seuil du pack"
                    valeur={resume.data.seuilEligibiliteCnps !== null ? <span className="chiffre">{formaterMontant(resume.data.seuilEligibiliteCnps)}</span> : "Atteint"}
                  />
                </dl>
                {resume.data.avertissements.length > 0 && <AvertissementRegle avertissements={resume.data.avertissements} />}
              </>
            )}
          </CarteSection>
        )}

        <CarteSection titre="Complétude du dossier adhérent" contenuClassName="space-y-4">
          {etat.isLoading && <Skeleton className="h-20 w-full" />}
          {etat.data && (
            <>
              <Condition
                remplie={etat.data.champsManquants.length === 0}
                texte={`Informations renseignées à ${formaterNombre(etat.data.completionPourcentage)} %`}
              />
              <Condition
                remplie={etat.data.documentsManquants.length === 0}
                texte={
                  etat.data.documentsManquants.length === 0
                    ? "Pièces obligatoires fournies"
                    : `${etat.data.documentsManquants.length} pièce(s) obligatoire(s) manquante(s)`
                }
              />
            </>
          )}
        </CarteSection>
      </div>

      {peutLireCnps && (
        <CarteSection titre="Dossier CNPS">
          {dossiers.isLoading && <Skeleton className="h-16 w-full" />}
          {dossiers.isError && (
            <Alerte teinte="danger">
              <p>{estErreurApi(dossiers.error) ? dossiers.error.message : "Le dossier CNPS n'a pas pu être chargé."}</p>
            </Alerte>
          )}
          {dossiers.data && !dossierCnps && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-texte-doux-fort">Aucun dossier CNPS n'est ouvert pour cet adhérent.</p>
              {peutGererCnps && (
                <Button onClick={() => setConfirmationOuverte(true)} disabled={ouvrir.isPending}>
                  Ouvrir un dossier CNPS
                </Button>
              )}
            </div>
          )}
          {dossierCnps && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <LigneChamp libelle="Statut" valeur={<BadgeStatut domaine="dossierCnps" code={dossierCnps.statut} />} />
                <LigneChamp libelle="Immatriculation" valeur={dossierCnps.numeroImmatriculation ?? "—"} />
                <LigneChamp libelle="Ouvert le" valeur={formaterDate(dossierCnps.creeLe)} />
              </dl>
              <Link to={`/cnps/${dossierCnps.id}`} className="font-medium text-primaire underline underline-offset-2">
                Ouvrir le dossier CNPS
              </Link>
            </div>
          )}
        </CarteSection>
      )}

      <DialogueConfirmation
        ouvert={confirmationOuverte}
        onOuvertChange={setConfirmationOuverte}
        titre="Ouvrir un dossier CNPS"
        description={
          <p>
            Ouvrir le dossier de pré-immatriculation CNPS de <strong>{nomAdherent}</strong> ? Le serveur vérifie
            l'éligibilité et refuse l'ouverture si les conditions ne sont pas remplies.
          </p>
        }
        libelleConfirmation="Ouvrir le dossier"
        enCours={ouvrir.isPending}
        onConfirmer={async () => {
          try {
            const dossier = await ouvrir.mutateAsync(adherentId);
            toast.success("Dossier CNPS ouvert.");
            setConfirmationOuverte(false);
            navigate(`/cnps/${dossier.id}`);
          } catch (e) {
            toast.error(estErreurApi(e) ? e.message : "Le dossier CNPS n'a pas pu être ouvert.");
          }
        }}
      />
    </div>
  );
}

function Condition({ remplie, texte }: { remplie: boolean; texte: string }) {
  const Icone = remplie ? CheckCircle2 : CircleAlert;
  return (
    <p className={remplie ? "flex items-center gap-2 font-semibold text-succes-fort" : "flex items-center gap-2 font-semibold text-attention-fort"}>
      <Icone className="size-4 shrink-0" aria-hidden="true" />
      {texte}
    </p>
  );
}
