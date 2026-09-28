import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changerActivation,
  changerRoles,
  creerUtilisateur,
  listerParametres,
  listerRolesAdmin,
  listerUtilisateurs,
  modifierParametre,
  reinitialiserMotDePasse,
  type CreationUtilisateur,
} from "@/api/administration";
import type { CodeRole } from "@/auth/types";

const CLE = "administration" as const;

export function useUtilisateursAdmin(filtres: { recherche?: string; actif?: boolean; page?: number }) {
  return useQuery({
    queryKey: [CLE, "utilisateurs", filtres],
    queryFn: () => listerUtilisateurs(filtres),
    placeholderData: (precedente) => precedente,
  });
}

export function useRolesAdmin() {
  return useQuery({ queryKey: [CLE, "roles"], queryFn: () => listerRolesAdmin() });
}

export function useParametres() {
  return useQuery({ queryKey: [CLE, "parametres"], queryFn: () => listerParametres() });
}

function useInvalidation() {
  const clientRequetes = useQueryClient();
  return () => clientRequetes.invalidateQueries({ queryKey: [CLE] });
}

export function useCreerUtilisateur() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (creation: CreationUtilisateur) => creerUtilisateur(creation),
    onSuccess: invalider,
  });
}

export function useChangerActivation() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (variables: { id: string; actif: boolean; motif: string }) =>
      changerActivation(variables.id, variables.actif, variables.motif),
    onSuccess: invalider,
  });
}

export function useChangerRoles() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (variables: { id: string; roles: readonly CodeRole[]; motif: string }) =>
      changerRoles(variables.id, variables.roles, variables.motif),
    onSuccess: invalider,
  });
}

export function useReinitialiserMotDePasse() {
  return useMutation({ mutationFn: (id: string) => reinitialiserMotDePasse(id) });
}

export function useModifierParametre() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (variables: { cle: string; valeur: string; motif: string }) =>
      modifierParametre(variables.cle, variables.valeur, variables.motif),
    onSuccess: invalider,
  });
}
