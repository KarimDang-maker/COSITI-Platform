import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmerExigence,
  modifierExigence,
  obtenirReglesEnAttente,
  validerParametre,
  type CorpsModificationExigence,
} from "@/api/regles";

const CLE = "regles" as const;

export function useReglesEnAttente(actif = true) {
  return useQuery({ queryKey: [CLE, "en-attente"], queryFn: obtenirReglesEnAttente, enabled: actif });
}

/**
 * Une règle confirmée change ce que l'application applique (une pièce obligatoire confirmée devient bloquante) :
 * l'inventaire, la matrice, les paramètres de l'administration et les checklists d'adhérents sont rechargés.
 */
function useInvalidationRegles() {
  const clientRequetes = useQueryClient();
  return () => {
    void clientRequetes.invalidateQueries({ queryKey: [CLE] });
    void clientRequetes.invalidateQueries({ queryKey: ["adhesion"] });
    void clientRequetes.invalidateQueries({ queryKey: ["administration"] });
  };
}

export function useValiderParametre() {
  const invalider = useInvalidationRegles();
  return useMutation({
    mutationFn: ({ cle, motif }: { cle: string; motif: string }) => validerParametre(cle, motif),
    onSuccess: invalider,
  });
}

export function useConfirmerExigence() {
  const invalider = useInvalidationRegles();
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => confirmerExigence(id, motif),
    onSuccess: invalider,
  });
}

export function useModifierExigence() {
  const invalider = useInvalidationRegles();
  return useMutation({
    mutationFn: ({ id, corps }: { id: string; corps: CorpsModificationExigence }) => modifierExigence(id, corps),
    onSuccess: invalider,
  });
}
