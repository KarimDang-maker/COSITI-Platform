import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { CheckCircle2, PencilLine, ScrollText } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { CarteIndicateur } from "@/components/cositi/carte-indicateur";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { EtatVide } from "@/components/cositi/etat-vide";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/auth/ContexteAuth";
import { useConfirmerExigence, useReglesEnAttente, useValiderParametre } from "@/hooks/useRegles";
import { useExigencesDocumentaires } from "@/hooks/useAdhesion";
import type { RegleEnAttente } from "@/api/regles";
import type { ExigenceDocumentaire } from "@/api/adhesion";
import { estErreurApi } from "@/api/erreurs";
import { definitionStatut } from "@/lib/statuts";
import { formaterDate, formaterDateHeure } from "@/lib/format";
import { DialogueModifierExigence } from "@/ecrans/regles/DialogueModifierExigence";

type Onglet = "regles" | "matrice";

/** Ce qu'on confirme : un paramètre (par sa clé) ou une exigence documentaire (par son identifiant). */
type Confirmation = { source: "PARAMETRE"; cle: string; libelle: string } | { source: "EXIGENCE"; id: string; libelle: string };

/**
 * Règles en attente de validation (V21, `GET /regles/en-attente`) — lecture `ADMINISTRATION:LIRE` ou
 * `REGLE:VALIDER`, décisions `REGLE:VALIDER` (PCA). Confirmer une règle ne change pas sa valeur : cela la fait
 * passer de « à valider » (`V`) ou « proposée » (`A`) à « confirmée » (`C`), avec la référence de la décision COSITI
 * comme motif obligatoire. Une pièce obligatoire confirmée devient bloquante pour l'activation. L'écran n'invente
 * aucune règle : il rend décidable sans développement ce qui l'exigeait jusque-là (une migration).
 */
export function EcranRegles() {
  const [parametres, definirParametres] = useSearchParams();
  const onglet: Onglet = parametres.get("onglet") === "matrice" ? "matrice" : "regles";
  const peutValider = usePermission("REGLE:VALIDER");
  const synthese = useReglesEnAttente();
  const matrice = useExigencesDocumentaires(false, onglet === "matrice");
  const validerParametre = useValiderParametre();
  const confirmerExigence = useConfirmerExigence();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [edition, setEdition] = useState<ExigenceDocumentaire | null>(null);

  function changerOnglet(valeur: string) {
    definirParametres(valeur === "matrice" ? { onglet: "matrice" } : {}, { replace: true });
  }

  const colonnesRegles = useMemo<ColumnDef<RegleEnAttente>[]>(
    () => [
      {
        id: "source",
        header: "Nature",
        cell: ({ row }) => (row.original.source === "PARAMETRE" ? "Paramètre" : "Exigence documentaire"),
      },
      {
        id: "regle",
        header: "Règle",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.libelle}</p>
            <p className="ref text-xs">{row.original.cle}</p>
          </div>
        ),
      },
      { id: "valeur", header: "Valeur appliquée", cell: ({ row }) => <span className="ref">{row.original.valeur ?? "—"}</span> },
      { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="validationParametre" code={row.original.statutValidation} /> },
      {
        id: "modifie",
        header: "Dernière modification",
        cell: ({ row }) => (
          <span className="text-sm">
            {formaterDateHeure(row.original.modifieLe)}
            {row.original.modifiePar && <span className="block text-xs text-texte-doux-fort">{row.original.modifiePar}</span>}
          </span>
        ),
      },
      ...(peutValider
        ? [
            {
              id: "actions",
              header: "Décision",
              cell: ({ row }) => (
                <Button
                  size="sm"
                  onClick={() =>
                    setConfirmation(
                      row.original.source === "PARAMETRE"
                        ? { source: "PARAMETRE", cle: row.original.cle, libelle: row.original.libelle }
                        : { source: "EXIGENCE", id: row.original.id, libelle: row.original.libelle },
                    )
                  }
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Confirmer
                </Button>
              ),
            } satisfies ColumnDef<RegleEnAttente>,
          ]
        : []),
    ],
    [peutValider],
  );

  const colonnesMatrice = useMemo<ColumnDef<ExigenceDocumentaire>[]>(
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
      { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="validationParametre" code={row.original.statutValidation} /> },
      ...(peutValider
        ? [
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEdition(row.original)} aria-label={`Modifier ${row.original.libelle}`}>
                    <PencilLine className="size-4" aria-hidden="true" />
                    Modifier
                  </Button>
                  {row.original.statutValidation !== "C" && (
                    <Button
                      size="sm"
                      onClick={() => setConfirmation({ source: "EXIGENCE", id: row.original.id, libelle: row.original.libelle })}
                      aria-label={`Confirmer ${row.original.libelle}`}
                    >
                      Confirmer
                    </Button>
                  )}
                </div>
              ),
            } satisfies ColumnDef<ExigenceDocumentaire>,
          ]
        : []),
    ],
    [peutValider],
  );

  const s = synthese.data;
  const enCours = validerParametre.isPending || confirmerExigence.isPending;

  return (
    <CoquilleApplication titre="Règles à valider">
      <div className="space-y-6">
        <EnTetePage
          titre="Règles à valider"
          description="Règles appliquées à titre provisoire, en attente d'une décision de la COSITI."
        />
        {!peutValider && (
          <Alerte teinte="info" titre="Consultation seule">
            <p>La confirmation des règles est réservée au Président du Conseil d'Administration (permission REGLE:VALIDER).</p>
          </Alerte>
        )}

        {s && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CarteIndicateur principal indicateur={{ cle: "v", libelle: "Paramètres à valider", valeur: s.parametresNonValides, unite: "NOMBRE" }} />
            <CarteIndicateur indicateur={{ cle: "a", libelle: "Propositions techniques", valeur: s.parametresProposes, unite: "NOMBRE" }} />
            <CarteIndicateur indicateur={{ cle: "e", libelle: "Exigences documentaires à confirmer", valeur: s.exigencesNonConfirmees, unite: "NOMBRE" }} />
          </div>
        )}

        <Tabs value={onglet} onValueChange={changerOnglet}>
          <TabsList>
            <TabsTrigger value="regles">Règles provisoires</TabsTrigger>
            <TabsTrigger value="matrice">Matrice documentaire</TabsTrigger>
          </TabsList>

          <TabsContent value="regles">
            <CarteSection contenuPleineLargeur>
              {synthese.isLoading ? (
                <SqueletteTableau />
              ) : synthese.isError || !s ? (
                <div className="p-4">
                  <Alerte teinte="danger" titre="Inventaire indisponible">
                    <p>{estErreurApi(synthese.error) ? synthese.error.message : "Les règles n'ont pas pu être chargées."}</p>
                  </Alerte>
                </div>
              ) : s.regles.length === 0 ? (
                <EtatVide icone={ScrollText} titre="Aucune règle en attente" description="Toutes les règles appliquées sont confirmées par la COSITI." />
              ) : (
                <TableauDonnees
                  legende="Règles en attente de validation"
                  colonnes={colonnesRegles}
                  lignes={s.regles}
                  cleLigne={(r) => `${r.source}-${r.id}`}
                />
              )}
            </CarteSection>
          </TabsContent>

          <TabsContent value="matrice">
            <CarteSection
              contenuPleineLargeur
              description="Pièces et informations attendues pour un dossier d'adhésion. Une pièce ne bloque l'activation que si elle est obligatoire et confirmée."
            >
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
                  colonnes={colonnesMatrice}
                  lignes={[...matrice.data].sort((a, b) => a.ordre - b.ordre)}
                  cleLigne={(e) => e.id}
                />
              )}
            </CarteSection>
          </TabsContent>
        </Tabs>
      </div>

      <DialogueConfirmation
        ouvert={confirmation !== null}
        onOuvertChange={(o) => !o && setConfirmation(null)}
        titre="Confirmer la règle"
        description={
          confirmation && (
            <div className="space-y-2">
              <p>
                <strong>{confirmation.libelle}</strong> passera au statut « {definitionStatut("validationParametre", "C").libelle} ». Sa
                valeur ne change pas.
              </p>
              {confirmation.source === "EXIGENCE" && (
                <p>Si la pièce est obligatoire, elle deviendra bloquante pour l'activation des adhérents.</p>
              )}
            </div>
          )
        }
        motifRequis
        libelleMotif="Référence de la décision COSITI (procès-verbal, note, date)"
        libelleConfirmation="Confirmer"
        enCours={enCours}
        onConfirmer={async (motif) => {
          if (!confirmation) return;
          try {
            if (confirmation.source === "PARAMETRE") {
              await validerParametre.mutateAsync({ cle: confirmation.cle, motif: motif ?? "" });
            } else {
              await confirmerExigence.mutateAsync({ id: confirmation.id, motif: motif ?? "" });
            }
            toast.success("Règle confirmée. La décision est tracée dans le journal d'audit.");
            setConfirmation(null);
          } catch (e) {
            toast.error(estErreurApi(e) ? e.message : "La confirmation a échoué.");
          }
        }}
      />
      {edition && <DialogueModifierExigence exigence={edition} onFermer={() => setEdition(null)} />}
    </CoquilleApplication>
  );
}
