import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Landmark } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { CarteIndicateur } from "@/components/cositi/carte-indicateur";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { ChampDate } from "@/components/cositi/champ-date";
import { EtatVide } from "@/components/cositi/etat-vide";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { Pagination } from "@/components/cositi/pagination";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, usePermission } from "@/auth/ContexteAuth";
import { useBilanJournalier, useBilansCaisse, useSignalerAnomalieBilan } from "@/hooks/usePaiements";
import type { RapprochementCaisse, StatutBilanCaisse } from "@/api/bilansCaisse";
import { estErreurApi } from "@/api/erreurs";
import { STATUTS, definitionStatut } from "@/lib/statuts";
import { formaterDate, formaterDateHeure, formaterDateLongue, formaterEcart, formaterMontant, formaterNombre } from "@/lib/format";
import { aujourdhui } from "@/ecrans/cotisations/dates";
import { TableauAgregats } from "@/ecrans/cotisations/VueStatistiquesJour";
import { DialogueSaisieCaisse, DialogueValiderBilan } from "@/ecrans/cotisations/DialoguesBilanCaisse";

const OPTIONS_STATUT = Object.keys(STATUTS.bilanCaisse) as StatutBilanCaisse[];

/** Le sens de l'écart est écrit en toutes lettres : la couleur n'est jamais le seul indicateur (#31). */
function sensEcart(ecart: number): string {
  if (ecart > 0) return "Excédent en caisse";
  if (ecart < 0) return "Manque en caisse";
  return "Aucun écart";
}

/**
 * Bilan journalier et rapprochement de caisse (module cotisations, #29 à #33). La date consultée est dans
 * l'URL. Tous les montants — numérique, physique, écart — viennent du serveur ; la définition du montant
 * numérique (modes et statuts inclus) est une règle `[V]` affichée telle quelle.
 */
export function EcranBilanCaisse() {
  const [parametres, definirParametres] = useSearchParams();
  const { utilisateur } = useAuth();
  const peutSaisir = usePermission("BILAN_CAISSE:SAISIR");
  const peutValider = usePermission("BILAN_CAISSE:VALIDER");

  const date = parametres.get("date") ?? aujourdhui();
  const statutFiltre = (parametres.get("statut") as StatutBilanCaisse | null) ?? undefined;
  const page = Number(parametres.get("page") ?? "0");

  const bilan = useBilanJournalier(date);
  const historique = useBilansCaisse({ statut: statutFiltre, page, taille: 10 });
  const signaler = useSignalerAnomalieBilan();
  const [saisieOuverte, setSaisieOuverte] = useState(false);
  const [validationOuverte, setValidationOuverte] = useState(false);
  const [anomalieOuverte, setAnomalieOuverte] = useState(false);

  function mettreAJour(valeurs: Record<string, string | undefined>) {
    definirParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        for (const [cle, valeur] of Object.entries(valeurs)) {
          if (valeur) suivants.set(cle, valeur);
          else suivants.delete(cle);
        }
        return suivants;
      },
      { replace: true },
    );
  }

  const rapprochement = bilan.data?.rapprochement ?? null;
  // Masquage de confort : le serveur refuse de toute façon une décision sur son propre bilan.
  const estAuteurSaisie = !!rapprochement?.creePar && rapprochement.creePar === utilisateur?.identifiant;
  const saisiePossible = peutSaisir && (!rapprochement || rapprochement.statut === "ANOMALIE") && date <= aujourdhui();
  const decisionPossible = peutValider && rapprochement?.statut === "SAISI";

  const colonnes = useMemo<ColumnDef<RapprochementCaisse>[]>(
    () => [
      { id: "date", header: "Date", cell: ({ row }) => formaterDate(row.original.date) },
      { id: "numerique", header: "Numérique", cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.montantNumerique)}</span> },
      { id: "physique", header: "Caisse", cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.montantPhysique)}</span> },
      {
        id: "ecart",
        header: "Écart",
        cell: ({ row }) => (
          <span className="chiffre">
            {formaterEcart(row.original.ecart)} <span className="text-xs text-texte-doux-fort">({sensEcart(row.original.ecart)})</span>
          </span>
        ),
      },
      { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="bilanCaisse" code={row.original.statut} /> },
    ],
    [],
  );

  return (
    <CoquilleApplication titre="Bilan de caisse">
      <div className="space-y-6">
        <EnTetePage
          titre="Bilan de caisse"
          description="Comparaison quotidienne entre les cotisations enregistrées et l'argent réellement compté."
          actions={
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="bilan-date">Date du bilan</Label>
                <ChampDate id="bilan-date" value={date} max={aujourdhui()} onChange={(e) => mettreAJour({ date: e.target.value || undefined })} />
              </div>
            </div>
          }
        />

        {bilan.isLoading && <Skeleton className="h-48 w-full" />}
        {bilan.isError && (
          <Alerte teinte="danger" titre="Impossible de charger le bilan">
            <p>{estErreurApi(bilan.error) ? bilan.error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {bilan.data && (
          <>
            <CarteSection
              titre={`Bilan numérique du ${formaterDateLongue(bilan.data.date)}`}
              description={`Périmètre : vos données. Généré le ${formaterDateHeure(new Date(bilan.dataUpdatedAt))}.`}
              contenuClassName="space-y-5"
            >
              {bilan.data.avertissements.length > 0 && <AvertissementRegle avertissements={bilan.data.avertissements} />}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <CarteIndicateur
                  indicateur={{ cle: "nombre", libelle: "Paiements enregistrés", valeur: bilan.data.nombrePaiements, unite: "NOMBRE" }}
                />
                <CarteIndicateur
                  indicateur={{ cle: "total", libelle: "Montant total enregistré", valeur: bilan.data.montantTotalEnregistre, unite: "MONTANT" }}
                />
                <CarteIndicateur
                  principal
                  indicateur={{ cle: "numerique", libelle: "À retrouver en caisse", valeur: bilan.data.montantNumerique, unite: "MONTANT" }}
                />
              </div>
              <p className="text-sm text-texte-doux-fort">
                Montant à retrouver : {formaterNombre(bilan.data.nombrePaiementsNumerique)} paiement(s) en{" "}
                {bilan.data.modesNumerique.map((m) => definitionStatut("modePaiement", m).libelle).join(", ")}, aux statuts{" "}
                {bilan.data.statutsInclus.map((s) => definitionStatut("paiement", s).libelle).join(", ")}.
              </p>
              <TableauAgregats titre="Détail par mode de paiement" domaine="modePaiement" agregats={bilan.data.parMode} />
            </CarteSection>

            <CarteSection
              titre="Rapprochement de caisse"
              actions={
                <div className="flex flex-wrap gap-2">
                  {saisiePossible && (
                    <Button onClick={() => setSaisieOuverte(true)}>
                      {rapprochement ? "Ressaisir la caisse" : "Saisir la caisse physique"}
                    </Button>
                  )}
                  {decisionPossible && !estAuteurSaisie && (
                    <>
                      <Button onClick={() => setValidationOuverte(true)}>Valider le bilan</Button>
                      <Button variant="destructive" onClick={() => setAnomalieOuverte(true)}>
                        Signaler une anomalie
                      </Button>
                    </>
                  )}
                </div>
              }
              contenuClassName="space-y-4"
            >
              {!rapprochement && (
                <EtatVide
                  icone={Landmark}
                  titre="Aucun montant physique saisi pour cette date"
                  description={peutSaisir ? "Comptez la caisse puis saisissez le montant." : "La saisie revient au Gestionnaire des comptes."}
                />
              )}
              {rapprochement && (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <BadgeStatut domaine="bilanCaisse" code={rapprochement.statut} />
                    <span className="text-sm text-texte-doux-fort">
                      Saisi par {rapprochement.creePar ?? "—"}
                      {rapprochement.creeLe ? ` le ${formaterDateHeure(rapprochement.creeLe)}` : ""}
                    </span>
                  </div>
                  <dl className="grid grid-cols-1 gap-4 rounded-lg bg-fond p-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Numérique à la saisie</dt>
                      <dd className="chiffre text-2xl font-bold">{formaterMontant(rapprochement.montantNumerique)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Compté en caisse</dt>
                      <dd className="chiffre text-2xl font-bold">{formaterMontant(rapprochement.montantPhysique)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Écart</dt>
                      <dd className="chiffre text-2xl font-bold">{formaterEcart(rapprochement.ecart)}</dd>
                      <dd className="text-sm font-semibold">{sensEcart(rapprochement.ecart)}</dd>
                    </div>
                  </dl>
                  {rapprochement.commentaire && <p className="text-sm">Commentaire : {rapprochement.commentaire}</p>}
                  {rapprochement.numeriqueModifieDepuisSaisie && (
                    <Alerte teinte="attention" titre="Des paiements ont changé depuis la saisie">
                      <p>
                        Montant numérique actuel :{" "}
                        <span className="chiffre font-semibold">{formaterMontant(rapprochement.montantNumeriqueActuel)}</span>.
                      </p>
                    </Alerte>
                  )}
                  {rapprochement.statut === "ANOMALIE" && (
                    <Alerte teinte="danger" titre="Anomalie signalée par le DAF">
                      <p>{rapprochement.motifAnomalie}</p>
                      <p className="mt-1 text-sm">La caisse doit être recomptée puis ressaisie.</p>
                    </Alerte>
                  )}
                  {rapprochement.statut === "VALIDE" && (
                    <Alerte teinte="succes" titre="Bilan validé">
                      <p>
                        Validé{rapprochement.valideLe ? ` le ${formaterDateHeure(rapprochement.valideLe)}` : ""}.
                        {rapprochement.commentaireValidation ? ` ${rapprochement.commentaireValidation}` : ""}
                      </p>
                    </Alerte>
                  )}
                  {decisionPossible && estAuteurSaisie && (
                    <p className="text-sm text-texte-doux-fort">Vous avez saisi ce bilan : sa validation revient à un autre DAF.</p>
                  )}
                </>
              )}
            </CarteSection>
          </>
        )}

        <CarteSection
          titre="Historique des bilans"
          actions={
            <Select value={statutFiltre ?? "TOUS"} onValueChange={(v) => mettreAJour({ statut: v === "TOUS" ? undefined : v, page: undefined })}>
              <SelectTrigger aria-label="Filtrer par statut" className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous les statuts</SelectItem>
                {OPTIONS_STATUT.map((code) => (
                  <SelectItem key={code} value={code}>
                    {definitionStatut("bilanCaisse", code).libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {historique.isLoading && <Skeleton className="h-24 w-full" />}
          {historique.isError && <p className="text-sm text-texte-doux-fort">L'historique n'a pas pu être chargé.</p>}
          {historique.data && historique.data.contenu.length === 0 && <EtatVide titre="Aucun bilan enregistré" />}
          {historique.data && historique.data.contenu.length > 0 && (
            <TableauDonnees
              colonnes={colonnes}
              lignes={historique.data.contenu}
              cleLigne={(b) => b.id}
              onActiverLigne={(b) => mettreAJour({ date: b.date })}
              libelleLigne={(b) => `Afficher le bilan du ${formaterDate(b.date)}`}
              legende="Historique des bilans de caisse"
              pied={
                <Pagination
                  page={page}
                  totalPages={historique.data.totalPages}
                  totalElements={historique.data.totalElements}
                  libelleElements="bilans"
                  onChangerPage={(p) => mettreAJour({ page: String(p) })}
                />
              }
            />
          )}
        </CarteSection>
      </div>

      {bilan.data && saisiePossible && (
        <DialogueSaisieCaisse
          date={date}
          montantNumerique={bilan.data.montantNumerique}
          ressaisie={rapprochement?.statut === "ANOMALIE"}
          ouvert={saisieOuverte}
          onOuvertChange={setSaisieOuverte}
        />
      )}
      {rapprochement && decisionPossible && (
        <>
          <DialogueValiderBilan rapprochement={rapprochement} ouvert={validationOuverte} onOuvertChange={setValidationOuverte} />
          <DialogueConfirmation
            ouvert={anomalieOuverte}
            onOuvertChange={setAnomalieOuverte}
            titre="Signaler une anomalie"
            description={
              <p>
                Bilan du {formaterDateLongue(rapprochement.date)} : numérique {formaterMontant(rapprochement.montantNumerique)}, caisse{" "}
                {formaterMontant(rapprochement.montantPhysique)}, écart {formaterEcart(rapprochement.ecart)}. L'auteur de la saisie sera
                notifié et devra recompter la caisse.
              </p>
            }
            motifRequis
            libelleMotif="Description de l'anomalie"
            libelleConfirmation="Signaler l'anomalie"
            varianteDestructive
            enCours={signaler.isPending}
            onConfirmer={async (motif) => {
              try {
                await signaler.mutateAsync({ date: rapprochement.date, motif: motif ?? "" });
                toast.success("Anomalie signalée.");
                setAnomalieOuverte(false);
              } catch (e) {
                toast.error(estErreurApi(e) ? e.message : "Le signalement a échoué.");
              }
            }}
          />
        </>
      )}
    </CoquilleApplication>
  );
}
