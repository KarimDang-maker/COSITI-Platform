import { useState } from "react";
import { toast } from "sonner";
import { Archive, BadgeCheck, FileUp, Undo2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { BarreProgression } from "@/components/cositi/barre-progression";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { useDocuments } from "@/hooks/useDocuments";
import { useChangerPieceArchivage, useChecklistArchivage } from "@/hooks/useParcoursCnps";
import type { LigneChecklistArchivage } from "@/api/parcoursCnps";
import { LIBELLES_TYPE_DOCUMENT } from "@/api/documents";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure, formaterNombre } from "@/lib/format";
import { cn } from "@/lib/utils";

type ModeAction = "fournir" | "remplacer" | "verifier" | "archiver" | "retirer";

interface ActionEnCours {
  readonly mode: ModeAction;
  readonly ligne: LigneChecklistArchivage;
}

const LIBELLES_ACTION: Readonly<Record<ModeAction, string>> = {
  fournir: "Marquer fournie",
  remplacer: "Remplacer le document",
  verifier: "Vérifier",
  archiver: "Archiver",
  retirer: "Retirer",
};

/**
 * Actions proposées selon le statut de la pièce. Simple aide d'affichage : le graphe des transitions et les
 * rattachements exigés (document ou référence physique, motif) sont jugés par l'API, dont le refus est affiché tel quel.
 */
function actionsDisponibles(ligne: LigneChecklistArchivage): readonly ModeAction[] {
  switch (ligne.statut) {
    case "NON_FOURNIE":
      return ["fournir"];
    case "FOURNIE":
      return ligne.documentId ? ["verifier", "remplacer", "retirer"] : ["verifier", "retirer"];
    case "VERIFIEE":
      return ligne.documentId ? ["archiver", "remplacer", "retirer"] : ["archiver", "retirer"];
    case "ARCHIVEE":
      return ["retirer"];
  }
}

const ICONES_ACTION = { fournir: FileUp, remplacer: FileUp, verifier: BadgeCheck, archiver: Archive, retirer: Undo2 } as const;

/**
 * Checklist d'archivage du dossier physique CNPS : statut de chaque pièce, document rattaché, référence physique,
 * progression des pièces bloquantes. Les pièces, leur caractère bloquant et la complétude viennent de l'API.
 */
export function ChecklistArchivage({
  dossierId,
  adherentId,
  peutGerer,
}: {
  dossierId: string;
  adherentId: string;
  /** `CNPS:GERER` — sans elle, la checklist est en lecture seule. */
  peutGerer: boolean;
}) {
  const checklist = useChecklistArchivage(dossierId);
  const changer = useChangerPieceArchivage(dossierId);
  const [action, setAction] = useState<ActionEnCours | null>(null);

  if (checklist.isLoading) return <Skeleton className="h-32 w-full" />;
  if (checklist.isError || !checklist.data) {
    return (
      <Alerte teinte="danger" titre="Checklist d'archivage indisponible">
        <p>{estErreurApi(checklist.error) ? checklist.error.message : "La checklist n'a pas pu être chargée."}</p>
      </Alerte>
    );
  }

  const { lignes, piecesBloquantes, piecesBloquantesPretes, complete } = checklist.data;

  async function enregistrer(ligne: LigneChecklistArchivage, corps: Parameters<typeof changer.mutateAsync>[0]["corps"]) {
    try {
      await changer.mutateAsync({ codePiece: ligne.codePiece, corps });
      toast.success(`Pièce « ${ligne.libelle} » mise à jour.`);
      setAction(null);
    } catch (e) {
      toast.error(estErreurApi(e) ? e.message : "La pièce n'a pas pu être mise à jour.");
    }
  }

  return (
    <div className="space-y-4">
      <BarreProgression
        libelle="Pièces bloquantes prêtes"
        ratio={piecesBloquantes > 0 ? piecesBloquantesPretes / piecesBloquantes : 0}
        valeur={`${formaterNombre(piecesBloquantesPretes)}/${formaterNombre(piecesBloquantes)} pièces bloquantes prêtes`}
        teinte={complete ? "primaire" : "marque"}
      />
      {complete ? (
        <Alerte teinte="succes" titre="Archivage complet">
          <p>Toutes les pièces bloquantes sont prêtes : le dossier peut être immatriculé.</p>
        </Alerte>
      ) : (
        <Alerte teinte="attention" titre="Archivage incomplet">
          <p>L'immatriculation définitive reste refusée tant que les pièces bloquantes ne sont pas toutes prêtes.</p>
        </Alerte>
      )}

      <ul className="space-y-2" aria-label="Checklist d'archivage">
        {lignes.map((ligne) => (
          <li
            key={ligne.codePiece}
            className={cn(
              "space-y-2 rounded-lg border px-4 py-3",
              ligne.bloquante && ligne.statut === "NON_FOURNIE" ? "border-danger-trait" : "border-bordure",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {ligne.libelle}
                  {ligne.bloquante && <span className="text-xs font-semibold text-danger-fort">Bloquante</span>}
                </p>
                <p className="text-sm text-texte-doux-fort">
                  {ligne.nomFichier ? `Document : ${ligne.nomFichier}` : "Aucun document rattaché"}
                  {ligne.referencePhysique && ` — Référence physique : ${ligne.referencePhysique}`}
                </p>
                {ligne.motif && <p className="text-sm text-texte-doux-fort">Motif : {ligne.motif}</p>}
                {ligne.modifieLe && (
                  <p className="text-xs text-texte-doux">
                    Modifiée le {formaterDateHeure(ligne.modifieLe)}
                    {ligne.modifiePar && ` par ${ligne.modifiePar}`}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BadgeStatut domaine="archivageCnps" code={ligne.statut} />
                {peutGerer &&
                  actionsDisponibles(ligne).map((mode) => {
                    const Icone = ICONES_ACTION[mode];
                    return (
                      <Button
                        key={mode}
                        size="sm"
                        variant="outline"
                        aria-label={`${LIBELLES_ACTION[mode]} — ${ligne.libelle}`}
                        onClick={() => setAction({ mode, ligne })}
                      >
                        <Icone className="size-4" aria-hidden="true" />
                        {LIBELLES_ACTION[mode]}
                      </Button>
                    );
                  })}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {action && (action.mode === "fournir" || action.mode === "remplacer" || action.mode === "archiver") && (
        <DialogueRattachement
          action={action}
          adherentId={adherentId}
          enCours={changer.isPending}
          onFermer={() => setAction(null)}
          onEnregistrer={(corps) => enregistrer(action.ligne, corps)}
        />
      )}

      <DialogueConfirmation
        ouvert={action?.mode === "verifier"}
        onOuvertChange={(ouvert) => !ouvert && setAction(null)}
        titre="Vérifier la pièce"
        description={<p>Confirmer que la pièce « {action?.ligne.libelle} » a été vérifiée ?</p>}
        libelleConfirmation="Marquer vérifiée"
        enCours={changer.isPending}
        onConfirmer={() => (action ? enregistrer(action.ligne, { statut: "VERIFIEE" }) : undefined)}
      />

      <DialogueConfirmation
        ouvert={action?.mode === "retirer"}
        onOuvertChange={(ouvert) => !ouvert && setAction(null)}
        titre="Retirer la pièce"
        description={<p>La pièce « {action?.ligne.libelle} » repasse à « Non fournie ». Ce retrait est historisé.</p>}
        motifRequis
        libelleMotif="Motif du retrait"
        varianteDestructive
        libelleConfirmation="Retirer la pièce"
        enCours={changer.isPending}
        onConfirmer={(motif) => (action ? enregistrer(action.ligne, { statut: "NON_FOURNIE", motif }) : undefined)}
      />
    </div>
  );
}

/**
 * Fournir, remplacer ou archiver : sélecteur de document de l'adhérent ou référence physique ; le motif est demandé
 * pour un remplacement. Les exigences (rattachement, référence, motif) sont celles de l'API, qui répond sinon
 * `ARCHIVAGE_RATTACHEMENT_REQUIS`, `ARCHIVAGE_REFERENCE_REQUISE` ou `ARCHIVAGE_MOTIF_REQUIS`.
 */
function DialogueRattachement({
  action,
  adherentId,
  enCours,
  onFermer,
  onEnregistrer,
}: {
  action: ActionEnCours;
  adherentId: string;
  enCours: boolean;
  onFermer: () => void;
  onEnregistrer: (corps: { statut: "FOURNIE" | "VERIFIEE" | "ARCHIVEE"; documentId?: string; referencePhysique?: string; motif?: string }) => Promise<void>;
}) {
  const { mode, ligne } = action;
  const documents = useDocuments({ adherentId });
  const [documentId, setDocumentId] = useState<string | undefined>();
  const [reference, setReference] = useState(ligne.referencePhysique ?? "");
  const [motif, setMotif] = useState("");

  const options = (documents.data ?? [])
    .filter((d) => d.statut !== "REMPLACE" && d.statut !== "REJETE")
    .map((d) => ({ valeur: d.id, libelle: `${LIBELLES_TYPE_DOCUMENT[d.typeDocument]} — ${d.nomFichierOriginal}` }));

  const archiver = mode === "archiver";
  const titre = archiver ? "Archiver la pièce" : mode === "remplacer" ? "Remplacer le document" : "Marquer la pièce fournie";
  const statutCible = archiver ? "ARCHIVEE" : ligne.statut === "NON_FOURNIE" ? "FOURNIE" : ligne.statut;
  const sansReference = reference.trim() === "";
  const motifManquant = mode === "remplacer" && motif.trim() === "";

  return (
    <Dialog open onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{ligne.libelle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!archiver && (
            <ChampFormulaire id="archivage-document" libelle="Document de l'adhérent" facultatif>
              {(attributs) => (
                <SelectRecherche
                  id={attributs.id}
                  options={options}
                  valeur={documentId}
                  onChange={setDocumentId}
                  placeholder="Choisir un document"
                  texteVide="Aucun document déposé pour cet adhérent."
                />
              )}
            </ChampFormulaire>
          )}
          <ChampFormulaire
            id="archivage-reference"
            libelle="Référence physique"
            obligatoire={archiver}
            facultatif={!archiver}
            aide="Emplacement du dossier papier (classeur, boîte, étagère…)."
          >
            {(attributs) => <Input {...attributs} value={reference} onChange={(e) => setReference(e.target.value)} />}
          </ChampFormulaire>
          {mode === "remplacer" && (
            <ChampFormulaire id="archivage-motif" libelle="Motif du remplacement" obligatoire>
              {(attributs) => <Textarea {...attributs} value={motif} onChange={(e) => setMotif(e.target.value)} />}
            </ChampFormulaire>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer} disabled={enCours}>
            Annuler
          </Button>
          <Button
            disabled={enCours || motifManquant || (archiver && sansReference)}
            onClick={() =>
              void onEnregistrer({
                statut: statutCible,
                documentId: archiver ? undefined : documentId,
                referencePhysique: sansReference ? undefined : reference.trim(),
                motif: mode === "remplacer" ? motif.trim() : undefined,
              })
            }
          >
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
