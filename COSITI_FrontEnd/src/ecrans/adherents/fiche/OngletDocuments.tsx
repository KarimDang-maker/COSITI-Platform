import { useState } from "react";
import { Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Alerte } from "@/components/cositi/alerte";
import { DialogueTeleverserDocument } from "@/components/cositi/dialogue-televerser-document";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useChangerStatutDocument, useDocuments, useTelechargerDocument } from "@/hooks/useDocuments";
import { useDocumentsManquants, useInvalidationAdherent } from "@/hooks/useAdherents";
import { LIBELLES_TYPE_DOCUMENT, type Document, type StatutDocument, type TypeDocument } from "@/api/documents";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure } from "@/lib/format";
import { CLASSES_TEINTE } from "@/lib/statuts";
import { cn } from "@/lib/utils";

interface OngletDocumentsProps {
  adherentId: string;
  peutTeleverser: boolean;
  peutVerifier: boolean;
}

/**
 * Documents de l'adhérent (#19), pièces obligatoires manquantes (#18) et dépôt d'une pièce (#20). Aucune
 * URL de contenu n'est construite : chaque consultation repasse par l'API authentifiée et journalisée.
 */
export function OngletDocuments({ adherentId, peutTeleverser, peutVerifier }: OngletDocumentsProps) {
  const documents = useDocuments({ adherentId });
  const manquants = useDocumentsManquants(adherentId);
  const telecharger = useTelechargerDocument();
  const changerStatut = useChangerStatutDocument();
  // Un dépôt ou une vérification change les pièces manquantes et l'état du dossier de l'adhérent.
  const invaliderAdherent = useInvalidationAdherent();
  const [depot, setDepot] = useState<{ ouvert: boolean; type?: TypeDocument }>({ ouvert: false });
  const [decision, setDecision] = useState<{ document: Document; statut: StatutDocument } | null>(null);

  return (
    <div className="space-y-6">
      <CarteSection titre="Pièces obligatoires" contenuClassName="space-y-3">
        {manquants.isLoading && <Skeleton className="h-10 w-full" />}
        {manquants.isError && (
          <Alerte teinte="danger">
            <p>La liste des pièces manquantes n'a pas pu être chargée.</p>
          </Alerte>
        )}
        {manquants.data && manquants.data.length === 0 && (
          <p className="font-semibold text-succes-fort">Toutes les pièces obligatoires ont été fournies.</p>
        )}
        {manquants.data && manquants.data.length > 0 && (
          <ul className="space-y-2" aria-label="Pièces obligatoires manquantes">
            {manquants.data.map((type) => (
              <li key={type} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3", CLASSES_TEINTE.attention)}>
                <span className="font-semibold">{LIBELLES_TYPE_DOCUMENT[type] ?? type} — manquante</span>
                {peutTeleverser && (
                  <Button size="sm" variant="outline" onClick={() => setDepot({ ouvert: true, type })}>
                    Ajouter cette pièce
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CarteSection>

      <CarteSection
        titre="Documents déposés"
        contenuPleineLargeur={!!documents.data && documents.data.length > 0}
        actions={
          peutTeleverser ? (
            <Button size="sm" onClick={() => setDepot({ ouvert: true })}>
              <FileUp className="size-4" aria-hidden="true" />
              Ajouter un document
            </Button>
          ) : undefined
        }
      >
        {documents.isLoading && <Skeleton className="h-24 w-full" />}
        {documents.isError && (
          <Alerte teinte="danger">
            <p>{estErreurApi(documents.error) ? documents.error.message : "Les documents n'ont pas pu être chargés."}</p>
          </Alerte>
        )}
        {documents.data && documents.data.length === 0 && (
          <EtatVide titre="Aucun document déposé" description="Les pièces justificatives de l'adhérent apparaîtront ici." />
        )}
        {documents.data && documents.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Fichier</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Analyse</TableHead>
                <TableHead>Déposé le</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.data.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>{LIBELLES_TYPE_DOCUMENT[document.typeDocument] ?? document.typeDocument}</TableCell>
                  <TableCell className="max-w-48 truncate">{document.nomFichierOriginal}</TableCell>
                  <TableCell>
                    <BadgeStatut domaine="document" code={document.statut} />
                  </TableCell>
                  <TableCell>
                    <BadgeStatut domaine="analyseAntivirus" code={document.analyseAntivirus} />
                  </TableCell>
                  <TableCell>{formaterDateHeure(document.creeLe)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {document.telechargeable && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={telecharger.isPending}
                          onClick={() =>
                            telecharger.mutate(document.id, {
                              onError: (e) => toast.error(estErreurApi(e) ? e.message : "Le téléchargement a échoué."),
                            })
                          }
                          aria-label={`Télécharger ${document.nomFichierOriginal}`}
                        >
                          <Download className="size-4" aria-hidden="true" />
                          Télécharger
                        </Button>
                      )}
                      {peutVerifier && document.statut === "AJOUTE" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setDecision({ document, statut: "VERIFIE" })}>
                            Vérifier
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDecision({ document, statut: "REJETE" })}>
                            Rejeter
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CarteSection>

      {peutTeleverser && (
        <DialogueTeleverserDocument
          key={depot.type ?? "libre"}
          ouvert={depot.ouvert}
          onOuvertChange={(ouvert) => setDepot((precedent) => ({ ...precedent, ouvert }))}
          cible={{ adherentId }}
          typeImpose={depot.type}
          onTeleverse={() => invaliderAdherent(adherentId)}
        />
      )}

      <DialogueConfirmation
        ouvert={decision !== null}
        onOuvertChange={(ouvert) => {
          if (!ouvert) setDecision(null);
        }}
        titre={decision?.statut === "REJETE" ? "Rejeter le document" : "Marquer le document comme vérifié"}
        description={
          decision && (
            <p>
              {LIBELLES_TYPE_DOCUMENT[decision.document.typeDocument]} — <span className="ref">{decision.document.nomFichierOriginal}</span>
            </p>
          )
        }
        motifRequis={decision?.statut === "REJETE"}
        libelleMotif="Motif du rejet"
        varianteDestructive={decision?.statut === "REJETE"}
        libelleConfirmation={decision?.statut === "REJETE" ? "Rejeter" : "Confirmer la vérification"}
        enCours={changerStatut.isPending}
        onConfirmer={async (motif) => {
          if (!decision) return;
          try {
            await changerStatut.mutateAsync({ documentId: decision.document.id, statut: decision.statut, motif });
            toast.success(decision.statut === "REJETE" ? "Document rejeté." : "Document vérifié.");
            invaliderAdherent(adherentId);
            setDecision(null);
          } catch (e) {
            toast.error(estErreurApi(e) ? e.message : "Le statut du document n'a pas pu être changé.");
          }
        }}
      />
    </div>
  );
}
