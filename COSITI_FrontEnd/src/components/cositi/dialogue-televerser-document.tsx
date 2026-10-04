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
import { Textarea } from "@/components/ui/textarea";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { ChampDate } from "@/components/cositi/champ-date";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { useTeleverserDocument } from "@/hooks/useDocuments";
import { useExigencesDocumentaires } from "@/hooks/useAdhesion";
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
  /** Remplacement versionné (V21, §22) : la version active remplacée, conservée par le serveur. */
  remplace?: { documentId: string; libelle: string };
  onTeleverse?: (document: Document) => void;
}

/**
 * Téléversement d'un justificatif (J7, enrichi en V21).
 *
 * <p>Pour un adhérent, les types proposés sont ceux de la **matrice documentaire en vigueur**
 * (`GET /exigences-documentaires?enVigueur=true`), plus « Autre document » : la liste n'est jamais dupliquée ici.
 * La pièce choisie rappelle son caractère (obligatoire, bloquante, règle à confirmer). Les dates de validité sont
 * facultatives ; un remplacement exige un motif, et l'ancienne version est conservée par le serveur.</p>
 *
 * <p>Aucun contrôle de format n'est fait ici au-delà de l'attribut `accept`, qui n'est qu'un confort de
 * saisie : c'est le serveur qui identifie le type réel par signature binaire et refuse le fichier
 * (`400 DOCUMENT_TYPE_NON_AUTORISE`) (`AGENTS.md` règle 1).</p>
 */
export function DialogueTeleverserDocument({
  ouvert,
  onOuvertChange,
  cible,
  typeImpose,
  remplace,
  onTeleverse,
}: DialogueTeleverserDocumentProps) {
  const televerser = useTeleverserDocument(cible);
  const pourAdherent = !!cible.adherentId;
  const exigences = useExigencesDocumentaires(true, ouvert && pourAdherent && !typeImpose);
  const champFichier = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<TypeDocument | undefined>(typeImpose);
  const [valideDu, setValideDu] = useState("");
  const [valideJusquau, setValideJusquau] = useState("");
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  // Lignes « pièce » de la matrice (les lignes « information » portent un champ) : une option par type.
  const piecesMatrice = (exigences.data ?? []).filter((e) => e.actif && !e.champ && e.typeDocument);
  const typesMatrice = [...new Set(piecesMatrice.map((e) => e.typeDocument as TypeDocument))];
  const optionsTypes: TypeDocument[] =
    pourAdherent && typesMatrice.length > 0
      ? [...typesMatrice, ...(typesMatrice.includes("AUTRE") ? [] : (["AUTRE"] as const))]
      : (Object.keys(LIBELLES_TYPE_DOCUMENT) as TypeDocument[]);
  const options = optionsTypes.map((valeur) => ({ valeur, libelle: LIBELLES_TYPE_DOCUMENT[valeur] ?? valeur }));
  const exigenceChoisie = piecesMatrice.find((e) => e.typeDocument === type);

  function fermer(ouvertSuivant: boolean) {
    if (!ouvertSuivant) {
      setErreur(null);
      setType(typeImpose);
      setValideDu("");
      setValideJusquau("");
      setMotif("");
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
    if (remplace && !motif.trim()) {
      setErreur("Indiquez le motif du remplacement : il est conservé avec l'ancienne version.");
      return;
    }
    if (valideDu && valideJusquau && valideDu > valideJusquau) {
      setErreur("La date de début de validité doit précéder la date de fin.");
      return;
    }
    try {
      const document = await televerser.mutateAsync({
        fichier,
        type,
        options: {
          valideDu: valideDu || undefined,
          valideJusquau: valideJusquau || undefined,
          remplaceDocumentId: remplace?.documentId,
          motifRemplacement: remplace ? motif.trim() : undefined,
        },
      });
      toast.success(
        remplace
          ? `Nouvelle version de « ${remplace.libelle} » enregistrée ; l'ancienne est conservée.`
          : `Document « ${document.nomFichierOriginal} » ajouté.`,
      );
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
          <DialogTitle>{remplace ? `Remplacer : ${remplace.libelle}` : "Ajouter un document"}</DialogTitle>
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
                placeholder={exigences.isLoading ? "Chargement de la matrice…" : "Choisir un type"}
              />
            </div>
          )}

          {exigenceChoisie && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg bg-fond p-3 text-sm">
              <BadgeStatut domaine="niveauExigence" code={exigenceChoisie.niveau} />
              {exigenceChoisie.bloquante ? "Bloque l'activation tant qu'elle manque." : "Ne bloque pas l'activation."}
              {exigenceChoisie.statutValidation !== "C" && (
                <span className="text-texte-doux-fort">Règle en attente de confirmation par la COSITI.</span>
              )}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fichier-document">Fichier</Label>
            <Input id="fichier-document" type="file" ref={champFichier} accept={FORMATS_ACCEPTES} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ChampFormulaire id="document-valide-du" libelle="Valable du" facultatif>
              {(attributs) => <ChampDate {...attributs} value={valideDu} onChange={(e) => setValideDu(e.target.value)} />}
            </ChampFormulaire>
            <ChampFormulaire
              id="document-valide-jusquau"
              libelle="Valable jusqu'au"
              facultatif
              aide="Date d'expiration imprimée sur la pièce, si elle en a une."
            >
              {(attributs) => <ChampDate {...attributs} value={valideJusquau} onChange={(e) => setValideJusquau(e.target.value)} />}
            </ChampFormulaire>
          </div>

          {remplace && (
            <ChampFormulaire
              id="document-motif-remplacement"
              libelle="Motif du remplacement"
              obligatoire
              aide="Ex. : pièce illisible, informations non conformes, pièce expirée."
            >
              {(attributs) => <Textarea {...attributs} maxLength={500} value={motif} onChange={(e) => setMotif(e.target.value)} />}
            </ChampFormulaire>
          )}

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
            {televerser.isPending ? "Envoi en cours…" : remplace ? "Remplacer la pièce" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
