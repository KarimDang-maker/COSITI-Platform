import type { ReactNode } from "react";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { RangeeIndicateurs, type IndicateurCle } from "@/components/cositi/carte-indicateur";
import { ListeAlertes, type AlerteTableauBord } from "@/components/cositi/liste-alertes";
import { Skeleton } from "@/components/ui/skeleton";
import { estErreurApi } from "@/api/erreurs";

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
  children?: ReactNode;
}

/**
 * Gabarit commun aux six tableaux de bord (J9) : en-tête, indicateurs clés,
 * alertes, puis le contenu propre à chaque rôle.
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
  children,
}: CadreTableauBordProps) {
  return (
    <CoquilleApplication titre={titre}>
      <div className="space-y-6">
        <div>
          <h1>{titre}</h1>
          <p className="text-texte-doux">{sousTitre}</p>
        </div>

        {chargement && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64 w-full" />
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

            {alertes && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-titre">Points nécessitant attention</h2>
                <ListeAlertes alertes={alertes} />
              </section>
            )}

            {children}
          </>
        )}
      </div>
    </CoquilleApplication>
  );
}
