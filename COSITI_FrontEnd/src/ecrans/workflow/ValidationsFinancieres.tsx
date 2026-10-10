import { Link } from "react-router";
import { Coins, Landmark, Wallet } from "lucide-react";
import { CarteSection } from "@/components/cositi/carte-section";
import { Alerte } from "@/components/cositi/alerte";
import { EtatVide } from "@/components/cositi/etat-vide";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaiements, useBilansCaisse } from "@/hooks/usePaiements";
import { useFraisAdhesion } from "@/hooks/useAdhesion";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterEcart, formaterMatricule, formaterMontant, formaterNombre } from "@/lib/format";
import { ActionsFrais } from "@/ecrans/adhesion/DialoguesFrais";

function Compteur({
  icone: Icone,
  libelle,
  nombre,
  chargement,
  chemin,
  action,
}: {
  icone: typeof Wallet;
  libelle: string;
  nombre: number | undefined;
  chargement: boolean;
  chemin: string;
  action: string;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-bordure p-4" aria-label={libelle}>
      <p className="flex items-center gap-2 text-sm font-semibold text-texte-doux-fort">
        <Icone className="size-4" aria-hidden="true" />
        {libelle}
      </p>
      {chargement ? <Skeleton className="h-8 w-16" /> : <p className="chiffre text-3xl font-bold">{formaterNombre(nombre ?? 0)}</p>}
      <Button asChild variant="outline" size="sm" className="self-start">
        <Link to={chemin}>{action}</Link>
      </Button>
    </section>
  );
}

/**
 * Validations financières du DAF (V23 : le centre de validation du DAF regroupe **toutes** les validations relatives
 * aux finances) : cotisations à contrôler, frais d'adhésion de 1 000 FCFA à valider — préalable à toute cotisation de
 * l'adhérent —, bilans de caisse saisis. Les nombres et les listes viennent du serveur ; les décisions restent celles
 * des écrans dédiés et sont imposées par l'API.
 */
export function ValidationsFinancieres() {
  const cotisations = usePaiements({ statut: "A_CONTROLER", page: 0, taille: 1 });
  const bilans = useBilansCaisse({ statut: "SAISI", page: 0, taille: 1 });
  const frais = useFraisAdhesion({ statut: "ENREGISTRE", page: 0, taille: 50 });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Compteur
          icone={Wallet}
          libelle="Cotisations à contrôler"
          nombre={cotisations.data?.totalElements}
          chargement={cotisations.isLoading}
          chemin="/daf"
          action="Ouvrir la file de contrôle"
        />
        <Compteur
          icone={Coins}
          libelle="Frais d'adhésion à valider"
          nombre={frais.data?.totalElements}
          chargement={frais.isLoading}
          chemin="/frais-adhesion?statut=ENREGISTRE"
          action="Voir tous les frais"
        />
        <Compteur
          icone={Landmark}
          libelle="Bilans de caisse à valider"
          nombre={bilans.data?.totalElements}
          chargement={bilans.isLoading}
          chemin="/bilans-caisse?statut=SAISI"
          action="Ouvrir les bilans"
        />
      </div>

      <CarteSection
        titre="Frais d'adhésion à valider"
        description="Tant que le DAF n'a pas validé l'encaissement des 1 000 FCFA, aucune cotisation ne peut être saisie pour l'adhérent."
      >
        {frais.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : frais.isError || !frais.data ? (
          <Alerte teinte="danger" titre="Frais indisponibles">
            <p>{estErreurApi(frais.error) ? frais.error.message : "La liste des frais n'a pas pu être chargée."}</p>
          </Alerte>
        ) : frais.data.contenu.length === 0 ? (
          <EtatVide icone={Coins} titre="Aucun frais d'adhésion à valider" description="Tous les encaissements enregistrés sont traités." />
        ) : (
          <ul className="divide-y divide-bordure" aria-label="Frais d'adhésion à valider">
            {frais.data.contenu.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="space-y-0.5">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{f.adherentNom ?? "Adhérent"}</span>
                    <span className="ref text-sm">{formaterMatricule(f.adherentMatricule)}</span>
                    <BadgeStatut domaine="fraisAdhesion" code={f.statut} />
                  </p>
                  <p className="text-sm text-texte-doux-fort">
                    <span className="ref">{f.reference}</span> — collecté par {f.agentNom ?? "—"} le {formaterDate(f.dateCollecte)} — reçu{" "}
                    <span className="chiffre">{formaterMontant(f.montantRecu)}</span>
                    {f.ecart !== 0 && (
                      <>
                        , écart <span className="chiffre font-semibold text-danger-fort">{formaterEcart(f.ecart)}</span>
                      </>
                    )}
                  </p>
                </div>
                <ActionsFrais frais={f} compact />
              </li>
            ))}
          </ul>
        )}
      </CarteSection>
    </div>
  );
}
