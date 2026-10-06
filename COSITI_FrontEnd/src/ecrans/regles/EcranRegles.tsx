import { useMemo, useState } from "react";
import { PencilLine } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/auth/ContexteAuth";
import { useExigencesDocumentaires } from "@/hooks/useAdhesion";
import type { ExigenceDocumentaire } from "@/api/adhesion";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate } from "@/lib/format";
import { DialogueModifierExigence } from "@/ecrans/regles/DialogueModifierExigence";

/**
 * Matrice documentaire (`GET /exigences-documentaires`) : les pièces et informations à fournir pour un dossier
 * d'adhésion. Décision du 05/10/2026 : les règles en attente de validation sont **réputées validées** — l'inventaire
 * des « règles provisoires » et leur confirmation ont été retirés. Seules les règles documentaires restent gérées
 * ici : le PCA (`REGLE:VALIDER`) peut modifier une exigence (niveau, condition, contrôle DGA, période).
 */
export function EcranRegles() {
  const peutModifier = usePermission("REGLE:VALIDER");
  const matrice = useExigencesDocumentaires(false);
  const [edition, setEdition] = useState<ExigenceDocumentaire | null>(null);

  const colonnes = useMemo<ColumnDef<ExigenceDocumentaire>[]>(
    () => [
      { id: "rubrique", header: "Rubrique", cell: ({ row }) => row.original.rubrique },
      {
        id: "libelle",
        header: "Pièce ou information",
        cell: ({ row }) => (
          <div className={row.original.champ ? "pl-4" : undefined}>
            <p className={row.original.champ ? undefined : "font-semibold"}>{row.original.libelle}</p>
            {row.original.conditionApplication && (
              <p className="text-xs text-texte-doux-fort">Condition : {row.original.conditionApplication}</p>
            )}
          </div>
        ),
      },
      { id: "niveau", header: "Niveau", cell: ({ row }) => <BadgeStatut domaine="niveauExigence" code={row.original.niveau} /> },
      { id: "dga", header: "Contrôle DGA", cell: ({ row }) => (row.original.verificationDga ? "Oui" : "Non") },
      {
        id: "bloquante",
        header: "Bloque l'activation",
        cell: ({ row }) => (row.original.bloquante ? <span className="font-semibold text-danger-fort">Oui</span> : "Non"),
      },
      {
        id: "periode",
        header: "En vigueur",
        cell: ({ row }) =>
          !row.original.actif
            ? "Désactivée"
            : row.original.effectifJusquau
              ? `${formaterDate(row.original.effectifDu)} → ${formaterDate(row.original.effectifJusquau)}`
              : `depuis le ${formaterDate(row.original.effectifDu)}`,
      },
      ...(peutModifier
        ? [
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => (
                <Button size="sm" variant="outline" onClick={() => setEdition(row.original)} aria-label={`Modifier ${row.original.libelle}`}>
                  <PencilLine className="size-4" aria-hidden="true" />
                  Modifier
                </Button>
              ),
            } satisfies ColumnDef<ExigenceDocumentaire>,
          ]
        : []),
    ],
    [peutModifier],
  );

  return (
    <CoquilleApplication titre="Matrice documentaire">
      <div className="space-y-6">
        <EnTetePage titre="Matrice documentaire" description="Pièces et informations à fournir pour un dossier d'adhésion." />
        <CarteSection contenuPleineLargeur>
          {matrice.isLoading ? (
            <SqueletteTableau />
          ) : matrice.isError || !matrice.data ? (
            <div className="p-4">
              <Alerte teinte="danger" titre="Matrice indisponible">
                <p>{estErreurApi(matrice.error) ? matrice.error.message : "La matrice documentaire n'a pas pu être chargée."}</p>
              </Alerte>
            </div>
          ) : (
            <TableauDonnees
              legende="Matrice documentaire"
              colonnes={colonnes}
              lignes={[...matrice.data].sort((a, b) => a.ordre - b.ordre)}
              cleLigne={(e) => e.id}
            />
          )}
        </CarteSection>
      </div>
      {edition && <DialogueModifierExigence exigence={edition} onFermer={() => setEdition(null)} />}
    </CoquilleApplication>
  );
}
