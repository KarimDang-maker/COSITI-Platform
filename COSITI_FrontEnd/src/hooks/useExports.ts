import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { lancerExport, type FiltresExport, type TypeExport } from "@/api/exports";
import { estErreurApi } from "@/api/erreurs";

/**
 * Déclenche un export et propose l'enregistrement du fichier.
 *
 * L'URL d'objet est révoquée immédiatement après le clic : un export contient des
 * données personnelles, et le laisser accessible en mémoire de l'onglet pour la
 * durée de la session n'aurait aucune raison d'être.
 */
export function useLancerExport() {
  return useMutation({
    mutationFn: (variables: { type: TypeExport; filtres?: FiltresExport }) =>
      lancerExport(variables.type, variables.filtres),
    onSuccess: (fichier) => {
      const url = URL.createObjectURL(fichier.contenu);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = fichier.nomFichier;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé. Cette opération a été journalisée.");
    },
    onError: (erreur) => {
      toast.error(estErreurApi(erreur) ? erreur.message : "L'export n'a pas pu être produit.");
    },
  });
}
