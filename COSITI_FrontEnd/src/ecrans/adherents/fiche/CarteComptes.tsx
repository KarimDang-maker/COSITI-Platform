import { useState } from "react";
import { Link } from "react-router";
import { PlusCircle, RotateCcw } from "lucide-react";
import { CarteSection } from "@/components/cositi/carte-section";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BarreProgression } from "@/components/cositi/barre-progression";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSyntheseCotisationsAdherent } from "@/hooks/useAdherents";
import { usePermission } from "@/auth/ContexteAuth";
import { DialogueChangerPack } from "@/ecrans/adherents/fiche/DialogueChangerPack";
import { fraisAdhesionValide, useFraisAdhesionAdherent } from "@/hooks/useAdhesion";
import type { CompteCotisation } from "@/api/dossierAdherent";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterMontant, formaterNombre, formaterPourcentage } from "@/lib/format";

function BlocCompte({ titre, compte }: { titre: string; compte: CompteCotisation }) {
  return (
    <section className="rounded-lg border border-bordure p-4" aria-label={titre}>
      <h3 className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">{titre}</h3>
      <p className="chiffre mt-1 text-2xl font-bold">{formaterMontant(compte.soldeValide)}</p>
      <p className="text-sm text-texte-doux-fort">Solde validé</p>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-texte-doux-fort">En attente de contrôle</dt>
          <dd className="chiffre">{formaterMontant(compte.montantEnAttente)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-texte-doux-fort">Opérations validées</dt>
          <dd className="chiffre">{formaterNombre(compte.nombreOperationsValidees)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-texte-doux-fort">Dernière opération</dt>
          <dd>{formaterDate(compte.derniereOperationLe)}</dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * Comptes Sécurité Sociale et Épargne (V22, `GET /adherents/{id}/synthese-cotisations`, `PAIEMENT:LIRE`). Soldes,
 * cumuls, reste avant seuil et progression sont **ceux du serveur** : rien n'est recalculé à partir d'une liste de
 * cotisations. Une saisie en attente de contrôle n'est jamais comptée dans le solde.
 */
export function CarteComptes({
  adherentId,
  matricule,
  statutAdherent,
  peutSaisir,
  onVoirDetails,
}: {
  adherentId: string;
  matricule: string;
  /** Statut métier de l'adhérent (un préinscrit sans frais validé ne peut pas cotiser). */
  statutAdherent: string;
  /** `PAIEMENT:CREER` : raccourci vers la saisie d'une cotisation pour cet adhérent. */
  peutSaisir: boolean;
  /** Ouvre l'onglet Cotisations (détail financier). */
  onVoirDetails?: () => void;
}) {
  const synthese = useSyntheseCotisationsAdherent(adherentId);
  // Changer de pack : réservé à un adhérent qui en a déjà un (le premier se choisit à la première cotisation).
  const peutChangerPack = usePermission("ADHERENT:MODIFIER");
  const [changementPackOuvert, setChangementPackOuvert] = useState(false);
  // V23 : la saisie d'une cotisation attend la validation du frais d'adhésion par le DAF.
  const frais = useFraisAdhesionAdherent(adherentId, peutSaisir);
  const saisieOuverte = fraisAdhesionValide(frais.data, statutAdherent);

  const actions = (
    <div className="flex flex-wrap gap-2">
      {onVoirDetails && (
        <Button size="sm" variant="outline" onClick={onVoirDetails}>
          Détail des cotisations
        </Button>
      )}
      {peutSaisir && !saisieOuverte && (
        <Button size="sm" disabled title="Le frais d'adhésion doit d'abord être validé par le DAF.">
          <PlusCircle className="size-4" aria-hidden="true" />
          Enregistrer une cotisation
        </Button>
      )}
      {peutSaisir && saisieOuverte && (
        <Button asChild size="sm">
          <Link to={`/cotisations/nouveau?matricule=${encodeURIComponent(matricule)}`}>
            <PlusCircle className="size-4" aria-hidden="true" />
            Enregistrer une cotisation
          </Link>
        </Button>
      )}
    </div>
  );

  if (synthese.isLoading) {
    return (
      <CarteSection titre="Comptes de l'adhérent" actions={actions}>
        <Skeleton className="h-32 w-full" />
      </CarteSection>
    );
  }
  if (synthese.isError || !synthese.data) {
    return (
      <CarteSection titre="Comptes de l'adhérent" actions={actions}>
        <Alerte
          teinte="danger"
          titre="Comptes indisponibles"
          action={
            <Button size="sm" variant="outline" onClick={() => void synthese.refetch()}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Réessayer
            </Button>
          }
        >
          <p>{estErreurApi(synthese.error) ? synthese.error.message : "Les comptes n'ont pas pu être chargés."}</p>
        </Alerte>
      </CarteSection>
    );
  }

  const s = synthese.data;
  return (
    <CarteSection
      titre="Comptes de l'adhérent"
      description={`Calculés par la plateforme le ${formaterDate(s.calculeLe)}. Seules les cotisations validées alimentent les soldes.`}
      actions={actions}
      contenuClassName="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BlocCompte titre="Compte Sécurité Sociale" compte={s.compteSecuriteSociale} />
        <BlocCompte titre="Compte Épargne" compte={s.compteEpargne} />
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-texte-doux-fort">Total validé</dt>
          <dd className="chiffre font-semibold">{formaterMontant(s.montantValide)}</dd>
        </div>
        <div>
          <dt className="text-texte-doux-fort">En attente de contrôle</dt>
          <dd className="chiffre font-semibold">
            {formaterMontant(s.montantEnAttente)} ({formaterNombre(s.nombreCotisationsEnAttente)})
          </dd>
        </div>
        <div>
          <dt className="text-texte-doux-fort">Pack</dt>
          <dd className="font-semibold">
            {s.packLibelle ?? "À choisir à la prochaine cotisation"}
            {peutChangerPack && s.packId && (
              <Button size="sm" variant="link" className="ml-1 h-auto p-0" onClick={() => setChangementPackOuvert(true)}>
                Changer
              </Button>
            )}
          </dd>
        </div>
        {s.montantAutresComposantes > 0 && (
          <div>
            <dt className="text-texte-doux-fort">Ancienne affectation (« Coopérative »)</dt>
            <dd className="chiffre font-semibold">{formaterMontant(s.montantAutresComposantes)}</dd>
          </div>
        )}
      </dl>
      {s.seuilEligibiliteCnps !== null && s.tauxProgression !== null && (
        <div className="space-y-1">
          <p className="text-sm">
            Progression vers le seuil CNPS ({formaterMontant(s.seuilEligibiliteCnps)}) :{" "}
            {s.eligibleCnps ? (
              <strong className="text-succes-fort">seuil atteint</strong>
            ) : (
              <>
                reste <strong className="chiffre">{formaterMontant(s.resteAvantSeuil)}</strong>
              </>
            )}
          </p>
          {/* Taux serveur en pourcentage (0–100) converti en part pour l'affichage. */}
          <BarreProgression
            libelle="Progression vers le seuil CNPS"
            ratio={s.tauxProgression / 100}
            valeur={formaterPourcentage(s.tauxProgression / 100)}
          />
        </div>
      )}
      {peutSaisir && !frais.isLoading && !saisieOuverte && (
        <p className="text-sm text-attention-fort">
          Cotisations bloquées : le frais d'adhésion de 1 000 FCFA doit être validé par le DAF avant toute cotisation.
        </p>
      )}
      {s.avertissements.length > 0 && <AvertissementRegle avertissements={s.avertissements} />}
      {s.packId && (
        <DialogueChangerPack
          adherentId={adherentId}
          packActuelId={s.packId}
          packActuelLibelle={s.packLibelle}
          ouvert={changementPackOuvert}
          onOuvertChange={setChangementPackOuvert}
        />
      )}
    </CarteSection>
  );
}
