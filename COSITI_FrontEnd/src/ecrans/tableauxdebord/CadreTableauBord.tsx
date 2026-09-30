import type { ReactNode } from "react";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { CarteSection } from "@/components/cositi/carte-section";
import { EnTetePage } from "@/components/cositi/entete-page";
import { RangeeIndicateurs, type IndicateurCle } from "@/components/cositi/carte-indicateur";
import { ListeAlertes, type AlerteTableauBord } from "@/components/cositi/liste-alertes";
import { Skeleton } from "@/components/ui/skeleton";
import { SelecteurPeriode } from "@/components/cositi/selecteur-periode";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateSaisie } from "@/lib/format";
import type { usePeriodeTableauBord } from "@/hooks/usePeriodeTableauBord";

interface CadreTableauBordProps {
  titre: string;
  sousTitre: string;
  chargement: boolean;
  erreur: unknown;
  enErreur: boolean;
  indicateurs?: readonly IndicateurCle[];
  /** Mis en avant : le taux d'activation sur les dashboards métier. */
  clePrincipale?: string;
  alertes?: readonly AlerteTableauBord[];
  avertissements?: readonly string[];
  /** Actions de l'en-tête de page (raccourci vers l'écran de traitement). */
  actions?: ReactNode;
  /** Blocs larges (tableau à plusieurs colonnes) affichés sous la grille, sur toute la largeur. */
  pleineLargeur?: ReactNode;
  /** Période filtrée (`usePeriodeTableauBord`) ; absente = pas de sélecteur de période. */
  periode?: ReturnType<typeof usePeriodeTableauBord>;
  children?: ReactNode;
}

/**
 * Gabarit commun aux six tableaux de bord (J9), calqué sur le tableau de bord
 * du gabarit Spark :
 *
 * 1. en-tête de page ;
 * 2. rangée d'indicateurs, l'indicateur principal en carte vert foncé, en
 *    haut à gauche (`docs/02 §11`) ;
 * 3. grille : contenu propre au rôle à gauche, colonne « Points nécessitant
 *    attention » à droite (repasse sous le contenu en écran étroit).
 *
 * Les `avertissements` renvoyés par l'API sont toujours affichés — ils portent
 * notamment la fraîcheur des vues de synthèse. Un dashboard qui montre des
 * chiffres d'il y a deux heures sans le dire fait décider sur du passé.
 */
export function CadreTableauBord({
  titre,
  sousTitre,
  chargement,
  erreur,
  enErreur,
  indicateurs,
  clePrincipale,
  alertes,
  avertissements,
  actions,
  pleineLargeur,
  periode,
  children,
}: CadreTableauBordProps) {
  const avecColonneAlertes = alertes !== undefined;

  return (
    <CoquilleApplication titre={titre}>
      <div className="space-y-8">
        <EnTetePage
          titre={titre}
          description={sousTitre}
          actions={
            (periode || actions) && (
              <>
                {periode && (
                  <SelecteurPeriode
                    periode={periode.periode}
                    onChange={periode.changer}
                    libelleParDefaut="Mois en cours"
                    max={formaterDateSaisie(new Date())}
                  />
                )}
                {actions}
              </>
            )
          }
        />

        {chargement && (
          <div className="space-y-6" role="status" aria-label="Chargement du tableau de bord">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <Skeleton className="h-80 rounded-2xl" />
              <Skeleton className="h-80 rounded-2xl" />
            </div>
          </div>
        )}

        {enErreur && (
          <Alerte teinte="danger" titre="Impossible de charger le tableau de bord">
            <p>{estErreurApi(erreur) ? erreur.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {!chargement && !enErreur && (
          <>
            {avertissements && avertissements.length > 0 && (
              <AvertissementRegle avertissements={avertissements} />
            )}

            {indicateurs && <RangeeIndicateurs indicateurs={indicateurs} clePrincipale={clePrincipale} />}

            <div className={avecColonneAlertes ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" : undefined}>
              <div className="min-w-0 space-y-6">{children}</div>

              {avecColonneAlertes && (
                <CarteSection titre="Points nécessitant attention" className="xl:sticky xl:top-[calc(var(--hauteur-entete)+var(--espace-6))]">
                  <ListeAlertes alertes={alertes} />
                </CarteSection>
              )}
            </div>

            {pleineLargeur}
          </>
        )}
      </div>
    </CoquilleApplication>
  );
}
