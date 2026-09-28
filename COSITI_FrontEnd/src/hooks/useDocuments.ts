import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changerStatutDocument,
  listerDocuments,
  telechargerDocument,
  televerserDocument,
  type CibleDocument,
  type StatutDocument,
  type TypeDocument,
} from "@/api/documents";

const CLE = "documents" as const;

export function useDocuments(cible: CibleDocument) {
  const actif = !!cible.adherentId || !!cible.paiementId;
  return useQuery({
    queryKey: [CLE, cible],
    queryFn: () => listerDocuments(cible),
    // Sans rattachement, l'API ne renvoie rien (aucun périmètre de données applicable) : inutile d'appeler.
    enabled: actif,
  });
}

export function useTeleverserDocument(cible: CibleDocument) {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (variables: { fichier: File; type: TypeDocument }) =>
      televerserDocument(variables.fichier, variables.type, cible),
    onSuccess: () => clientRequetes.invalidateQueries({ queryKey: [CLE] }),
  });
}

export function useChangerStatutDocument() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (variables: { documentId: string; statut: StatutDocument; motif?: string }) =>
      changerStatutDocument(variables.documentId, variables.statut, variables.motif),
    onSuccess: () => clientRequetes.invalidateQueries({ queryKey: [CLE] }),
  });
}

/**
 * Déclenche l'enregistrement du fichier par le navigateur.
 *
 * <p>L'URL d'objet est révoquée immédiatement après le clic : sans cela, le contenu — souvent une pièce
 * d'identité — resterait accessible en mémoire de l'onglet pour toute la durée de la session.
 */
export function useTelechargerDocument() {
  return useMutation({
    mutationFn: (documentId: string) => telechargerDocument(documentId),
    onSuccess: (fichier) => {
      const url = URL.createObjectURL(fichier.contenu);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = fichier.nomFichier;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
    },
  });
}
