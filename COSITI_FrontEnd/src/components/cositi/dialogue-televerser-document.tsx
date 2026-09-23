import { useRef, useState } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { useTeleverserDocument } from "@/hooks/useDocuments";
import {
  FORMATS_ACCEPTES,
  LIBELLES_TYPE_DOCUMENT,
  type CibleDocument,
  type Document,
  type TypeDocument,
} from "@/api/documents";
import { estErreurApi } from "@/api/erreurs";

interface DialogueTeleverserDocumentProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  /** Adhérent **ou** paiement — l'API refuse les deux à la fois comme aucun des deux. */
  cible: CibleDocument;
  /** Type pré-sélectionné et verrouillé, quand l'appelant sait déjà quelle pièce il attend. */
  typeImpose?: TypeDocument;
  onTeleverse?: (document: Document) => void;
}

/**
 * Téléversement d'un justificatif (J7).
 *
 * <p>Aucun contrôle de format n'est fait ici au-delà de l'attribut `accept`, qui n'est qu'un confort de
 * saisie : c'est le serveur qui identifie le type réel par signature binaire et refuse le fichier
 * (`400 DOCUMENT_TYPE_NON_AUTORISE`). Filtrer sérieusement côté client donnerait l'illusion d'une
 * protection que le navigateur ne peut pas offrir (`AGENTS.md` règle 1).</p>
 */
export function DialogueTeleverserDocument({
  ouvert,
  onOuvertChange,
  cible,
  typeImpose,
  onTeleverse,
}: DialogueTeleverserDocumentProps) {
  const televerser = useTeleverserDocument(cible);
  const champFichier = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<TypeDocument | undefined>(typeImpose);
  const [erreur, setErreur] = useState<string | null>(null);

  const options = Object.entries(LIBELLES_TYPE_DOCUMENT).map(([valeur, libelle]) => ({
    valeur,
    libelle,
  }));

  function fermer(ouvertSuivant: boolean) {
    if (!ouvertSuivant) {
      setErreur(null);
      setType(typeImpose);
      if (champFichier.current) champFichier.current.value = "";
    }
    onOuvertChange(ouvertSuivant);
  }

  async function soumettre() {
    setErreur(null);
    const fichier = champFichier.current?.files?.[0];
    if (!fichier) {
      setErreur("Sélectionnez un fichier.");
      return;
    }
    if (!type) {
      setErreur("Sélectionnez le type de document.");
      return;
    }
    try {
      const document = await televerser.mutateAsync({ fichier, type });
      toast.success(`Document « ${document.nomFichierOriginal} » ajouté.`);
      onTeleverse?.(document);
      fermer(false);
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "Le document n'a pas pu être ajouté.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>
            Formats acceptés : JPEG, PNG, PDF. Le fichier est vérifié puis conservé chiffré ; chaque
            consultation ultérieure est journalisée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!typeImpose && (
            <div className="space-y-1.5">
              <Label htmlFor="type-document">Type de document</Label>
              <SelectRecherche
                id="type-document"
                options={options}
                valeur={type}
                onChange={(valeur) => setType(valeur as TypeDocument | undefined)}
                placeholder="Choisir un type"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fichier-document">Fichier</Label>
            <Input
              id="fichier-document"
              type="file"
              ref={champFichier}
              accept={FORMATS_ACCEPTES}
            />
          </div>

          {erreur && (
            <Alerte teinte="danger" titre="Document refusé">
              <p>{erreur}</p>
            </Alerte>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => fermer(false)}>
            Annuler
          </Button>
          <Button onClick={soumettre} disabled={televerser.isPending}>
            {televerser.isPending ? "Envoi en cours…" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
