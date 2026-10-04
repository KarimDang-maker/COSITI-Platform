import { useState } from "react";
import { CarteSection } from "@/components/cositi/carte-section";
import { CarteIndicateur } from "@/components/cositi/carte-indicateur";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { ChampDate } from "@/components/cositi/champ-date";
import { Alerte } from "@/components/cositi/alerte";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStatistiquesQuotidiennes } from "@/hooks/usePaiements";
import type { Agregat } from "@/api/paiements";
import type { DomaineStatut } from "@/lib/statuts";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateLongue, formaterMontant, formaterNombre } from "@/lib/format";
import { aujourdhui } from "@/ecrans/cotisations/dates";

/**
 * Statistiques quotidiennes (#27) : nombres et montants par statut et par mode, pour la date choisie et dans
 * le périmètre du demandeur. La date de référence reste toujours affichée.
 */
export function VueStatistiquesJour() {
  const [date, setDate] = useState(aujourdhui());
  const { data, isLoading, isError, error, isFetching } = useStatistiquesQuotidiennes(date || undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="statistiques-date">Date de référence</Label>
          <ChampDate id="statistiques-date" value={date} max={aujourdhui()} onChange={(e) => setDate(e.target.value)} />
        </div>
        {data && (
          <p className="pb-2 text-sm text-texte-doux-fort" aria-live="polite">
            Statistiques du <strong>{formaterDateLongue(data.date)}</strong>
            {isFetching && !isLoading ? " — mise à jour…" : ""}
          </p>
        )}
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {isError && (
        <Alerte teinte="danger" titre="Impossible de charger les statistiques">
          <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
        </Alerte>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CarteIndicateur indicateur={{ cle: "nombre", libelle: "Paiements enregistrés", valeur: data.nombreTotal, unite: "NOMBRE" }} />
            <CarteIndicateur indicateur={{ cle: "montant", libelle: "Montant enregistré", valeur: data.montantTotal, unite: "MONTANT" }} />
          </div>
          {data.nombreTotal === 0 ? (
            <EtatVide titre="Aucun paiement enregistré ce jour" description="Choisissez une autre date de référence." />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TableauAgregats titre="Par statut" domaine="paiement" agregats={data.parStatut} />
              <TableauAgregats titre="Par mode de paiement" domaine="modePaiement" agregats={data.parMode} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Tableau `code → { nombre, montant }`, dans l'ordre renvoyé par le serveur. */
export function TableauAgregats({
  titre,
  domaine,
  agregats,
}: {
  titre: string;
  domaine: DomaineStatut;
  agregats: Readonly<Record<string, Agregat>>;
}) {
  const lignes = Object.entries(agregats);
  return (
    <CarteSection titre={titre} niveauTitre="h3" contenuPleineLargeur={lignes.length > 0}>
      {lignes.length === 0 ? (
        <p className="text-sm text-texte-doux-fort">Aucune donnée.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{domaine === "modePaiement" ? "Mode" : "Statut"}</TableHead>
              <TableHead className="text-right">Nombre</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lignes.map(([code, agregat]) => (
              <TableRow key={code}>
                <TableCell>
                  <BadgeStatut domaine={domaine} code={code} />
                </TableCell>
                <TableCell className="chiffre text-right">{formaterNombre(agregat.nombre)}</TableCell>
                <TableCell className="chiffre text-right">{formaterMontant(agregat.montant)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CarteSection>
  );
}
