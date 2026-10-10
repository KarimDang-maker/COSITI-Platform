import { useState } from "react";
import { Download, FileUp, RefreshCcw } from "lucide-react";
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
import { useInvalidationAdherent } from "@/hooks/useAdherents";
import { LIBELLES_TYPE_DOCUMENT, type Document, type StatutDocument, type TypeDocument } from "@/api/documents";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterDateHeure, formaterNombre } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChecklistDocumentaire } from "@/ecrans/adhesion/ChecklistDocumentaire";

interface OngletDocumentsProps {
  adherentId: string;
  peutTeleverser: boolean;
  peutVerifier: boolean;
}

/**
 * Documents de l'adhérent (#19), checklist documentaire (#18, V21 : `GET /adherents/{id}/checklist-documentaire`,
 * tirée de la matrice — plus aucune liste locale de pièces) et dépôt ou remplacement versionné d'une pièce (#20).
 * Les versions remplacées restent listées, en historique. Aucune URL de contenu n'est construite : chaque
 * consultation repasse par l'API authentifiée et journalisée.
 */
export function OngletDocuments({ adherentId, peutTeleverser, peutVerifier }: OngletDocumentsProps) {
  const documents = useDocuments({ adherentId });
  const telecharger = useTelechargerDocument();
  const changerStatut = useChangerStatutDocument();
  // Un dépôt ou une vérification change les pièces manquantes et l'état du dossier de l'adhérent.
  const invaliderAdherent = useInvalidationAdherent();
  const [depot, setDepot] = useState<{
    ouvert: boolean;
    type?: TypeDocument;
    remplace?: { documentId: string; libelle: string };
  }>({ ouvert: false });
  const [decision, setDecision] = useState<{ document: Document; statut: StatutDocument } | null>(null);

  return (
    <div className="space-y-6">
      <CarteSection
        titre="Checklist documentaire"
        description="Pièces attendues par la matrice documentaire en vigueur, et leur dernier contrôle par la DGA."
      >
        <ChecklistDocumentaire
          adherentId={adherentId}
          onAction={
            peutTeleverser
              ? (action) =>
                  setDepot({
                    ouvert: true,
                    type: action.type,
                    remplace: action.remplaceDocumentId ? { documentId: action.remplaceDocumentId, libelle: action.libelle } : undefined,
                  })
              : undefined
          }
        />
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
                <TableHead>Version</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead>Analyse</TableHead>
                <TableHead>Déposé le</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.data.map((document) => (
                <TableRow key={document.id} className={cn(document.statut === "REMPLACE" && "text-texte-doux-fort")}>
                  <TableCell>{LIBELLES_TYPE_DOCUMENT[document.typeDocument] ?? document.typeDocument}</TableCell>
                  <TableCell className="max-w-48 truncate">{document.nomFichierOriginal}</TableCell>
                  <TableCell>
                    <span className="chiffre">v{formaterNombre(document.versionDocument ?? 1)}</span>
                    {document.motifRemplacement && (
                      <span className="block max-w-40 truncate text-xs text-texte-doux-fort" title={document.motifRemplacement}>
                        {document.motifRemplacement}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <BadgeStatut domaine="document" code={document.statut} />
                  </TableCell>
                  <TableCell>
                    {document.expire ? (
                      <BadgeStatut domaine="statutPiece" code="EXPIRE" />
                    ) : document.valideJusquau ? (
                      `jusqu'au ${formaterDate(document.valideJusquau)}`
                    ) : (
                      "—"
                    )}
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
                      {peutTeleverser && document.statut !== "REMPLACE" && document.statut !== "ARCHIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDepot({
                              ouvert: true,
                              type: document.typeDocument,
                              remplace: {
                                documentId: document.id,
                                libelle: LIBELLES_TYPE_DOCUMENT[document.typeDocument] ?? document.typeDocument,
                              },
                            })
                          }
                          aria-label={`Remplacer ${document.nomFichierOriginal}`}
                        >
                          <RefreshCcw className="size-4" aria-hidden="true" />
                          Remplacer
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
          key={`${depot.type ?? "libre"}-${depot.remplace?.documentId ?? "nouveau"}`}
          ouvert={depot.ouvert}
          onOuvertChange={(ouvert) => setDepot((precedent) => ({ ...precedent, ouvert }))}
          cible={{ adherentId }}
          typeImpose={depot.type}
          remplace={depot.remplace}
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
