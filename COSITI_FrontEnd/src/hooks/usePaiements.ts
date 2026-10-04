import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annulerPaiement,
  confirmerParChefPaiement,
  corrigerPaiement,
  enregistrerPaiement,
  listerAffectations,
  listerPaiements,
  obtenirHistoriqueStatuts,
  obtenirPaiement,
  obtenirStatistiquesQuotidiennes,
  rejeterPaiement,
  signalerIncoherencePaiement,
  soumettrePaiement,
  validerPaiement,
  verifierDoublonPaiement,
  type CorpsCorrectionPaiement,
  type CorpsEnregistrementPaiement,
  type CorpsVerificationDoublonPaiement,
  type FiltresPaiements,
} from "@/api/paiements";
import {
  listerBilansCaisse,
  obtenirBilanJournalier,
  saisirCaissePhysique,
  signalerAnomalieBilan,
  validerBilanCaisse,
  type CorpsSaisieCaisse,
  type FiltresBilansCaisse,
} from "@/api/bilansCaisse";

const CLE = "paiements" as const;
const CLE_BILANS = "bilans-caisse" as const;

/** #1 à #7, #15 — la page précédente reste affichée pendant un rechargement (pas de saut du tableau). */
export function usePaiements(filtres: FiltresPaiements, actif = true) {
  return useQuery({
    queryKey: [CLE, "liste", filtres],
    queryFn: () => listerPaiements(filtres),
    placeholderData: (precedente) => precedente,
    enabled: actif,
  });
}

/** #8 */
export function usePaiement(id: string | undefined) {
  return useQuery({
    queryKey: [CLE, "detail", id],
    queryFn: () => obtenirPaiement(id!),
    enabled: !!id,
  });
}

/** Répartition Sécurité sociale / Épargne d'une cotisation validée (V21). */
export function useAffectationsPaiement(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "detail", id, "affectations"],
    queryFn: () => listerAffectations(id!),
    enabled: !!id && actif,
  });
}

/** #18 */
export function useHistoriqueStatutsPaiement(id: string | undefined) {
  return useQuery({
    queryKey: [CLE, "detail", id, "historique"],
    queryFn: () => obtenirHistoriqueStatuts(id!),
    enabled: !!id,
  });
}

/** #27 */
export function useStatistiquesQuotidiennes(date: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "statistiques", date],
    queryFn: () => obtenirStatistiquesQuotidiennes(date),
    enabled: actif,
    placeholderData: (precedente) => precedente,
  });
}

/** #13 — appelée à l'initiative de l'écran, avant l'envoi ; jamais une heuristique locale. */
export function useVerifierDoublonPaiement() {
  return useMutation({
    mutationFn: (corps: CorpsVerificationDoublonPaiement) => verifierDoublonPaiement(corps),
  });
}

/**
 * Après une écriture sur un paiement : journal, détail, historique, statistiques, et les données qui en
 * dépendent — résumé des cotisations de l'adhérent (#20 à #23, #26), droits, bilan de caisse (#29) et
 * cotisations de l'agent (module agents). Temps réel (#36) : aucun canal serveur, l'invalidation en tient lieu.
 */
function invalider(clientRequetes: ReturnType<typeof useQueryClient>) {
  void clientRequetes.invalidateQueries({ queryKey: [CLE] });
  void clientRequetes.invalidateQueries({ queryKey: [CLE_BILANS] });
  void clientRequetes.invalidateQueries({ queryKey: ["adherents"] });
  void clientRequetes.invalidateQueries({ queryKey: ["droits"] });
  void clientRequetes.invalidateQueries({ queryKey: ["organisation", "agent"] });
}

/** #9, #14 (brouillon), #35 (clé d'idempotence fournie par l'écran). */
export function useEnregistrerPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({
      corps,
      cleIdempotence,
      brouillon = false,
    }: {
      corps: CorpsEnregistrementPaiement;
      cleIdempotence: string;
      brouillon?: boolean;
    }) => enregistrerPaiement(corps, cleIdempotence, brouillon),
    onSuccess: () => invalider(clientRequetes),
  });
}

/** #14 */
export function useSoumettrePaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => soumettrePaiement(id),
    onSuccess: () => invalider(clientRequetes),
  });
}

/** #16 */
export function useValiderPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => validerPaiement(id),
    onSuccess: () => invalider(clientRequetes),
  });
}

/** #17 */
export function useRejeterPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => rejeterPaiement(id, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}

/** #19 */
export function useCorrigerPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, corps }: { id: string; corps: CorpsCorrectionPaiement }) => corrigerPaiement(id, corps),
    onSuccess: () => invalider(clientRequetes),
  });
}

export function useAnnulerPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => annulerPaiement(id, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}

/** Contrôle DAF (J5) — signalement d'incohérence, voir `api/paiements.ts`. */
export function useSignalerIncoherencePaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => signalerIncoherencePaiement(id, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}

/** Confirmation hiérarchique du Chef (UC-CHEF-10, J5) — voir `api/paiements.ts`. */
export function useConfirmerParChefPaiement() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif?: string }) => confirmerParChefPaiement(id, motif),
    onSuccess: () => invalider(clientRequetes),
  });
}

/* ==========================================================================
   Bilan journalier et rapprochement de caisse (#29 à #33)
   ======================================================================== */

/** #29, #31 (le bilan porte le rapprochement déjà saisi pour la date). */
export function useBilanJournalier(date: string | undefined) {
  return useQuery({
    queryKey: [CLE_BILANS, "journalier", date],
    queryFn: () => obtenirBilanJournalier(date),
    placeholderData: (precedente) => precedente,
  });
}

export function useBilansCaisse(filtres: FiltresBilansCaisse) {
  return useQuery({
    queryKey: [CLE_BILANS, "liste", filtres],
    queryFn: () => listerBilansCaisse(filtres),
    placeholderData: (precedente) => precedente,
  });
}

function invaliderBilans(clientRequetes: ReturnType<typeof useQueryClient>) {
  void clientRequetes.invalidateQueries({ queryKey: [CLE_BILANS] });
}

/** #30 */
export function useSaisirCaissePhysique() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: (corps: CorpsSaisieCaisse) => saisirCaissePhysique(corps),
    onSuccess: () => invaliderBilans(clientRequetes),
  });
}

/** #32 */
export function useValiderBilanCaisse() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ date, commentaire, version }: { date: string; commentaire?: string; version?: number | null }) =>
      validerBilanCaisse(date, commentaire, version),
    onSuccess: () => invaliderBilans(clientRequetes),
  });
}

/** #33 */
export function useSignalerAnomalieBilan() {
  const clientRequetes = useQueryClient();
  return useMutation({
    mutationFn: ({ date, motif }: { date: string; motif: string }) => signalerAnomalieBilan(date, motif),
    onSuccess: () => invaliderBilans(clientRequetes),
  });
}
