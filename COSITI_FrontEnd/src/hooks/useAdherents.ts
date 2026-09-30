import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiverAdherent,
  changerStatutAdherent,
  completerProfil,
  creerAdherent,
  listerActivites,
  listerAdherents,
  listerPacks,
  modifierAdherent,
  modifierCoordonnees,
  modifierProfessionnel,
  obtenirAdherent,
  obtenirAdherentParMatricule,
  obtenirAgentResponsable,
  obtenirChampsManquants,
  obtenirCompletion,
  obtenirCoordonnees,
  obtenirDocumentsManquants,
  obtenirEtatDossier,
  obtenirHistorique,
  obtenirProfessionnel,
  obtenirResumeCotisations,
  verifierDoublon,
  type CorpsCompletionProfil,
  type CorpsCreationAdherent,
  type CorpsModificationAdherent,
  type CorpsModificationCoordonnees,
  type CorpsModificationProfessionnel,
  type CorpsVerificationDoublon,
  type FiltresAdherents,
  type StatutAdherent,
} from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";

const CLE_ADHERENTS = "adherents" as const;

/**
 * Clés d'un adhérent. Toutes les lectures de la fiche commencent par `[adherents, "detail", id]` : une
 * seule invalidation rafraîchit l'en-tête, la complétion, le dossier, l'historique et les sous-blocs.
 */
const cles = {
  liste: (filtres: FiltresAdherents) => [CLE_ADHERENTS, "liste", filtres] as const,
  detail: (id: string | undefined) => [CLE_ADHERENTS, "detail", id] as const,
  sousRessource: (id: string | undefined, nom: string) => [CLE_ADHERENTS, "detail", id, nom] as const,
};

/**
 * Après une écriture sur un adhérent : la fiche entière (toutes ses sous-ressources), les listes, et les
 * domaines qui en dépendent (documents manquants, éligibilité CNPS, droits). Invalider trop large coûte
 * un rechargement ; invalider trop étroit afficherait une complétion ou un statut périmé juste après la
 * sauvegarde (UX #16, #33 : « nouveau statut visible immédiatement »).
 */
export function useInvalidationAdherent() {
  const clientRequetes = useQueryClient();
  return (id: string) => {
    void clientRequetes.invalidateQueries({ queryKey: cles.detail(id) });
    void clientRequetes.invalidateQueries({ queryKey: [CLE_ADHERENTS, "liste"] });
    void clientRequetes.invalidateQueries({ queryKey: ["cnps"] });
    void clientRequetes.invalidateQueries({ queryKey: ["documents"] });
  };
}

/** #1 à #8 — la page précédente reste affichée pendant le rechargement (pas de saut du tableau). */
export function useAdherents(filtres: FiltresAdherents) {
  return useQuery({
    queryKey: cles.liste(filtres),
    queryFn: () => listerAdherents(filtres),
    placeholderData: (precedente) => precedente,
  });
}

/** #12 */
export function useAdherent(id: string | undefined) {
  return useQuery({
    queryKey: cles.detail(id),
    queryFn: () => obtenirAdherent(id!),
    enabled: !!id,
  });
}

/** #3 — déclenchée à la demande (saisie validée), jamais à chaque frappe. */
export function useRechercherParMatricule() {
  return useMutation({
    mutationFn: (matricule: string) => obtenirAdherentParMatricule(matricule),
  });
}

/** #14 */
export function useCompletion(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: cles.sousRessource(id, "completion"),
    queryFn: () => obtenirCompletion(id!),
    enabled: !!id && actif,
  });
}

/** #15 — relu à l'ouverture du parcours de complétion, pour ne proposer que ce qui manque encore. */
export function useChampsManquants(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: cles.sousRessource(id, "champs-manquants"),
    queryFn: () => obtenirChampsManquants(id!),
    enabled: !!id && actif,
  });
}

/** #17 (le DTO du dossier porte aussi les champs et documents manquants, #15 et #18). */
export function useEtatDossier(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: cles.sousRessource(id, "dossier"),
    queryFn: () => obtenirEtatDossier(id!),
    enabled: !!id && actif,
  });
}

/** #18 */
export function useDocumentsManquants(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: cles.sousRessource(id, "documents-manquants"),
    queryFn: () => obtenirDocumentsManquants(id!),
    enabled: !!id && actif,
  });
}

/** #21 */
export function useHistoriqueAdherent(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: cles.sousRessource(id, "historique"),
    queryFn: () => obtenirHistorique(id!),
    enabled: !!id && actif,
  });
}

/**
 * #22 — renvoie `null` (jamais une erreur) quand aucun agent n'est affecté : c'est un état métier normal
 * (`404 ADHERENT_SANS_AGENT`), pas une panne.
 */
export function useAgentResponsable(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: cles.sousRessource(id, "agent"),
    queryFn: async () => {
      try {
        return await obtenirAgentResponsable(id!);
      } catch (e) {
        if (estErreurApi(e) && e.statut === 404 && e.code === "ADHERENT_SANS_AGENT") return null;
        throw e;
      }
    },
    enabled: !!id && actif,
  });
}

/** #27, #28 */
export function useResumeCotisations(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: cles.sousRessource(id, "resume-cotisations"),
    queryFn: () => obtenirResumeCotisations(id!),
    enabled: !!id && actif,
  });
}

/** #29 */
export function useProfilProfessionnel(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: cles.sousRessource(id, "professionnel"),
    queryFn: () => obtenirProfessionnel(id!),
    enabled: !!id && actif,
  });
}

/** #31 */
export function useCoordonnees(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: cles.sousRessource(id, "coordonnees"),
    queryFn: () => obtenirCoordonnees(id!),
    enabled: !!id && actif,
  });
}

/** #10 — appelée à l'initiative de l'écran, jamais bloquante. */
export function useVerifierDoublon() {
  return useMutation({
    mutationFn: (corps: CorpsVerificationDoublon) => verifierDoublon(corps),
  });
}

/** #9 */
export function useCreerAdherent() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (corps: CorpsCreationAdherent) => creerAdherent(corps),
    onSuccess: () => {
      void clientRequetes.invalidateQueries({ queryKey: [CLE_ADHERENTS, "liste"] });
    },
  });
}

/** #13 */
export function useModifierAdherent(id: string) {
  const invalider = useInvalidationAdherent();
  return useMutation({
    mutationFn: (corps: CorpsModificationAdherent) => modifierAdherent(id, corps),
    onSuccess: () => invalider(id),
  });
}

/** #16 — le serveur recalcule la complétion ; l'invalidation la relit. */
export function useCompleterProfil(id: string) {
  const invalider = useInvalidationAdherent();
  return useMutation({
    mutationFn: (corps: CorpsCompletionProfil) => completerProfil(id, corps),
    onSuccess: () => invalider(id),
  });
}

/** #30 */
export function useModifierProfessionnel(id: string) {
  const invalider = useInvalidationAdherent();
  return useMutation({
    mutationFn: (corps: CorpsModificationProfessionnel) => modifierProfessionnel(id, corps),
    onSuccess: () => invalider(id),
  });
}

/** #32 */
export function useModifierCoordonnees(id: string) {
  const invalider = useInvalidationAdherent();
  return useMutation({
    mutationFn: (corps: CorpsModificationCoordonnees) => modifierCoordonnees(id, corps),
    onSuccess: () => invalider(id),
  });
}

/** #33 */
export function useChangerStatutAdherent(id: string) {
  const invalider = useInvalidationAdherent();
  return useMutation({
    mutationFn: ({ statut, motif }: { statut: StatutAdherent; motif: string }) =>
      changerStatutAdherent(id, statut, motif),
    onSuccess: () => invalider(id),
  });
}

/** Archivage logique (`ADHERENT:ARCHIVER`). */
export function useArchiverAdherent(id: string) {
  const invalider = useInvalidationAdherent();
  return useMutation({
    mutationFn: (motif: string) => archiverAdherent(id, motif),
    onSuccess: () => invalider(id),
  });
}

/** Référentiel des activités. Stable : mis en cache cinq minutes, comme les zones. */
export function useActivites() {
  return useQuery({
    queryKey: [CLE_ADHERENTS, "activites"],
    queryFn: listerActivites,
    staleTime: 5 * 60 * 1000,
  });
}

/** Référentiel des packs de cotisation. Stable : même mise en cache que les activités. */
export function usePacks() {
  return useQuery({
    queryKey: [CLE_ADHERENTS, "packs"],
    queryFn: listerPacks,
    staleTime: 5 * 60 * 1000,
  });
}
