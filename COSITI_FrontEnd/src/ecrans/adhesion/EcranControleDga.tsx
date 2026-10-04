import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Check, Download, FileX2, Play, ScanEye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { EtatVide } from "@/components/cositi/etat-vide";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, usePermission } from "@/auth/ContexteAuth";
import {
  useControleDga,
  useDemarrerControleDga,
  useJournalControleDga,
  useVerifierChampControle,
} from "@/hooks/useAdhesion";
import { useTelechargerDocument } from "@/hooks/useDocuments";
import { LIBELLES_TYPE_DOCUMENT, type TypeDocument } from "@/api/documents";
import type { ChampControle, ControleDga, DecisionControleDga, DocumentControle } from "@/api/adhesion";
import { estErreurApi } from "@/api/erreurs";
import { cn } from "@/lib/utils";
import { formaterDateHeure, formaterMatricule, formaterNombre } from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";
import { DialogueConstatDocument, DialogueDecisionControle, DialogueVerifierChamp } from "@/ecrans/adhesion/DialoguesControle";

function libelleDocument(type: string): string {
  return LIBELLES_TYPE_DOCUMENT[type as TypeDocument] ?? type;
}

/** Une carte par document : informations COSITI et valeurs lues côte à côte, une ligne par information. */
function CarteDocument({ controle, document, modifiable }: { controle: ControleDga; document: DocumentControle; modifiable: boolean }) {
  const peutLireDocument = usePermission("DOCUMENT:LIRE");
  const telecharger = useTelechargerDocument();
  const verifier = useVerifierChampControle(controle.id);
  const [champOuvert, setChampOuvert] = useState<ChampControle | null>(null);
  const [constat, setConstat] = useState<"DOCUMENT_MANQUANT" | "NON_LISIBLE" | null>(null);
  const libelle = libelleDocument(document.typeDocument);

  const colonnes = useMemo<ColumnDef<ChampControle>[]>(
    () => [
      { id: "libelle", header: "Information", cell: ({ row }) => <span className="font-semibold">{row.original.libelle}</span> },
      { id: "numerique", header: "Enregistré dans COSITI", cell: ({ row }) => row.original.valeurNumerique ?? "—" },
      { id: "physique", header: "Lu sur le document", cell: ({ row }) => row.original.valeurPhysique ?? "—" },
      {
        id: "resultat",
        header: "Résultat",
        cell: ({ row }) =>
          row.original.statutCorrespondance ? (
            <BadgeStatut domaine="correspondance" code={row.original.statutCorrespondance} />
          ) : (
            <span className="text-texte-doux-fort">À vérifier</span>
          ),
      },
      {
        id: "commentaire",
        header: "Commentaire",
        cell: ({ row }) => (
          <div className="max-w-64 text-sm">
            {row.original.commentaire ?? "—"}
            {row.original.verifieLe && <p className="text-xs text-texte-doux-fort">{formaterDateHeure(row.original.verifieLe)}</p>}
          </div>
        ),
      },
      ...(modifiable
        ? [
            {
              id: "actions",
              header: "Vérification",
              cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant={row.original.statutCorrespondance === "CORRESPOND" ? "default" : "outline"}
                    disabled={verifier.isPending}
                    aria-label={`${row.original.libelle} : correspond`}
                    onClick={() =>
                      verifier.mutate(
                        { champId: row.original.id, corps: { statutCorrespondance: "CORRESPOND", version: row.original.version } },
                        { onError: (e) => toast.error(estErreurApi(e) ? e.message : "La vérification a échoué.") },
                      )
                    }
                  >
                    <Check className="size-4" aria-hidden="true" />
                    Correspond
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setChampOuvert(row.original)} aria-label={`${row.original.libelle} : autre résultat`}>
                    Autre résultat…
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<ChampControle>,
          ]
        : []),
    ],
    [modifiable, verifier],
  );

  return (
    <CarteSection
      titre={
        <span className="flex flex-wrap items-center gap-2">
          {libelle}
          {document.obligatoire && <span className="text-xs font-medium text-texte-doux-fort">(obligatoire)</span>}
          <BadgeStatut domaine="documentControle" code={document.statut} />
        </span>
      }
      niveauTitre="h3"
      actions={
        <div className="flex flex-wrap gap-2">
          {peutLireDocument && document.documentId && (
            <Button
              size="sm"
              variant="outline"
              disabled={telecharger.isPending}
              onClick={() =>
                telecharger.mutate(document.documentId!, {
                  onError: (e) => toast.error(estErreurApi(e) ? e.message : "Le document n'a pas pu être ouvert."),
                })
              }
            >
              <Download className="size-4" aria-hidden="true" />
              Ouvrir la pièce
            </Button>
          )}
          {modifiable && (
            <>
              <Button size="sm" variant="outline" onClick={() => setConstat("DOCUMENT_MANQUANT")}>
                <FileX2 className="size-4" aria-hidden="true" />
                Document manquant
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConstat("NON_LISIBLE")}>
                <ScanEye className="size-4" aria-hidden="true" />
                Illisible
              </Button>
            </>
          )}
        </div>
      }
      contenuPleineLargeur
    >
      {!document.documentId && (
        <p className="px-5 pb-3 text-sm text-attention-fort">Aucune pièce numérisée n'est rattachée : comparez avec le document physique.</p>
      )}
      {document.champs.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-texte-doux-fort">Aucune information à comparer pour ce document.</p>
      ) : (
        <TableauDonnees legende={`Informations du document ${libelle}`} colonnes={colonnes} lignes={document.champs} cleLigne={(c) => c.id} />
      )}
      {champOuvert && (
        <DialogueVerifierChamp
          key={champOuvert.id}
          controleId={controle.id}
          champ={champOuvert}
          ouvert
          onOuvertChange={(o) => !o && setChampOuvert(null)}
        />
      )}
      {constat && (
        <DialogueConstatDocument
          controleId={controle.id}
          document={document}
          libelleDocument={libelle}
          constat={constat}
          onFermer={() => setConstat(null)}
        />
      )}
    </CarteSection>
  );
}

function JournalControle({ controleId }: { controleId: string }) {
  const journal = useJournalControleDga(controleId);
  if (journal.isLoading) return <Skeleton className="h-24 w-full" />;
  if (journal.isError) {
    return (
      <Alerte teinte="danger" titre="Journal indisponible">
        <p>{estErreurApi(journal.error) ? journal.error.message : "Le journal n'a pas pu être chargé."}</p>
      </Alerte>
    );
  }
  if (!journal.data?.length) return <p className="text-sm text-texte-doux-fort">Aucune opération enregistrée.</p>;
  return (
    <ol className="space-y-3" aria-label="Journal du contrôle">
      {journal.data.map((ligne) => (
        <li key={ligne.id} className="flex flex-wrap items-start gap-3 border-l-2 border-bordure pl-3">
          <BadgeStatut domaine="operationAdhesion" code={ligne.typeOperation} />
          <div className="text-sm">
            <p>
              {formaterDateHeure(ligne.horodatage)} — {ligne.utilisateurIdentifiant ?? "système"}
            </p>
            {ligne.motif && <p className="text-texte-doux-fort">{ligne.motif}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Contrôle documentaire d'un dossier par la DGA (`GET /controles-dga/{id}`). Chaque information enregistrée est
 * comparée au document physique ; chaque vérification, anomalie et décision est tracée par le serveur et lisible
 * dans le journal. Le contrôle ne se modifie qu'à l'état « en cours », par un porteur de `CONTROLE_DGA:EFFECTUER`
 * qui n'a pas lui-même transmis le dossier (`CONTROLE_DGA_AUTO_CONTROLE_INTERDIT`, imposé par le serveur).
 */
export function EcranControleDga() {
  const { id } = useParams<{ id: string }>();
  const { utilisateur } = useAuth();
  const controle = useControleDga(id);
  const peutEffectuer = usePermission("CONTROLE_DGA:EFFECTUER");
  const peutActiver = usePermission("ADHERENT:ACTIVER");
  const demarrer = useDemarrerControleDga(id ?? "");
  const [decision, setDecision] = useState<DecisionControleDga | null>(null);

  if (controle.isLoading) {
    return (
      <CoquilleApplication titre="Contrôle DGA">
        <div className="space-y-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-48 w-full" />
        </div>
      </CoquilleApplication>
    );
  }
  if (controle.isError || !controle.data) {
    const introuvable = estErreurApi(controle.error) && (controle.error.statut === 404 || controle.error.statut === 403);
    return (
      <CoquilleApplication titre="Contrôle DGA">
        <Alerte teinte="danger" titre={introuvable ? "Contrôle introuvable" : "Impossible de charger ce contrôle"}>
          <p>
            {introuvable
              ? "Ce contrôle n'existe pas ou ne fait pas partie de votre périmètre."
              : estErreurApi(controle.error)
                ? controle.error.message
                : "Une erreur inattendue est survenue."}
          </p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  const c = controle.data;
  const estAuteurSoumission = !!utilisateur && c.soumisPar === utilisateur.id;
  const modifiable = peutEffectuer && c.statut === "EN_COURS" && !estAuteurSoumission;
  const compteurs = c.compteurs;

  return (
    <CoquilleApplication titre="Contrôle DGA">
      <div className="space-y-6">
        <EnTetePage
          titre={`Contrôle ${c.reference}`}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <Link className="font-semibold text-primaire underline-offset-4 hover:underline" to={`/adherents/${c.adherentId}?onglet=adhesion`}>
                {c.adherentNom ?? "Adhérent"}
              </Link>
              <span className="ref">{formaterMatricule(c.adherentMatricule)}</span>— tour {formaterNombre(c.tour)}
            </span>
          }
          statut={<BadgeStatut domaine="tourControleDga" code={c.statut} />}
          filAriane={[{ libelle: "Contrôle DGA", chemin: "/controles-dga" }, { libelle: c.reference }]}
          actions={
            peutEffectuer && c.statut === "EN_ATTENTE" && !estAuteurSoumission ? (
              <Button
                disabled={demarrer.isPending}
                onClick={() =>
                  demarrer.mutate(undefined, {
                    onSuccess: () => toast.success("Contrôle démarré."),
                    onError: (e) => toast.error(estErreurApi(e) ? e.message : "Le contrôle n'a pas pu être démarré."),
                  })
                }
              >
                <Play className="size-4" aria-hidden="true" />
                Démarrer le contrôle
              </Button>
            ) : undefined
          }
        />

        {peutEffectuer && estAuteurSoumission && c.statut !== "VALIDE" && c.statut !== "REJETE" && (
          <Alerte teinte="info" titre="Contrôle par un autre utilisateur">
            <p>Vous avez transmis ce dossier : son contrôle doit être effectué par une autre personne habilitée.</p>
          </Alerte>
        )}

        {peutActiver && c.statut === "CORRECTION_DEMANDEE" && (
          <Alerte
            teinte="attention"
            titre="Correction demandée par la DGA"
            action={
              <Button asChild size="sm">
                <Link to={`/adherents/${c.adherentId}?onglet=adhesion`}>Corriger le dossier et retransmettre</Link>
              </Button>
            }
          >
            <p>{c.commentaireDecision ?? "Motif non communiqué."}</p>
            <p className="mt-1 text-sm">
              Corrigez les informations ou remplacez les pièces en anomalie, puis retransmettez le dossier : un nouveau tour de
              contrôle sera ouvert.
            </p>
          </Alerte>
        )}

        <CarteSection titre="Résumé du contrôle">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <LigneChamp
              libelle="Informations vérifiées"
              valeur={<span className="chiffre">{formaterNombre(compteurs.champsVerifies)} / {formaterNombre(compteurs.champs)}</span>}
            />
            <LigneChamp libelle="Conformes" valeur={<span className="chiffre">{formaterNombre(compteurs.champsConformes)}</span>} />
            <LigneChamp
              libelle="Anomalies"
              valeur={<span className={cn("chiffre", compteurs.anomalies > 0 && "font-bold text-danger-fort")}>{formaterNombre(compteurs.anomalies)}</span>}
            />
            <LigneChamp libelle="Non vérifiables" valeur={<span className="chiffre">{formaterNombre(compteurs.nonVerifiables)}</span>} />
            <LigneChamp libelle="Transmis le" valeur={formaterDateHeure(c.soumisLe)} />
            <LigneChamp libelle="Démarré le" valeur={formaterDateHeure(c.demarreLe)} />
            <LigneChamp libelle="Terminé le" valeur={formaterDateHeure(c.termineLe)} />
          </dl>
          {c.commentaireDecision && (
            <Alerte teinte={c.statut === "VALIDE" ? "succes" : c.statut === "REJETE" ? "danger" : "attention"} titre="Décision" className="mt-4">
              <p>{c.commentaireDecision}</p>
            </Alerte>
          )}
          {modifiable && (c.blocages?.length ?? 0) > 0 && (
            <Alerte teinte="attention" titre="Ce dossier ne peut pas encore être validé" className="mt-4">
              <ul className="list-disc pl-5">
                {c.blocages?.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Alerte>
          )}
          {modifiable && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-bordure pt-4">
              <Button
                disabled={c.validable === false}
                title={c.validable === false ? "Validation impossible : voir les blocages ci-dessus." : undefined}
                onClick={() => setDecision("VALIDER")}
              >
                Valider le dossier
              </Button>
              <Button variant="outline" onClick={() => setDecision("DEMANDER_CORRECTION")}>
                Demander une correction
              </Button>
              <Button variant="destructive" onClick={() => setDecision("REJETER")}>
                Rejeter
              </Button>
            </div>
          )}
        </CarteSection>

        {c.documents.length === 0 ? (
          <EtatVide icone={FileX2} titre="Aucun document à contrôler" description="Le serveur n'a associé aucun document à ce tour." />
        ) : (
          c.documents.map((d) => <CarteDocument key={d.id} controle={c} document={d} modifiable={modifiable} />)
        )}

        <CarteSection titre="Journal du contrôle" description="Chaque information vérifiée, anomalie et décision, avec son auteur.">
          <JournalControle controleId={c.id} />
        </CarteSection>
      </div>

      {decision && (
        <DialogueDecisionControle
          controleId={c.id}
          decision={decision}
          compteurs={compteurs}
          blocages={c.blocages}
          onFermer={() => setDecision(null)}
        />
      )}
    </CoquilleApplication>
  );
}
