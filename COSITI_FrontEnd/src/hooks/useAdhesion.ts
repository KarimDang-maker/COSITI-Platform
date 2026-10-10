import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activerAdherent,
  demarrerControleDga,
  enregistrerFraisAdhesion,
  listerControlesAdherent,
  listerFileControleDga,
  listerExigencesDocumentaires,
  listerFraisAdhesion,
  obtenirChecklistDocumentaire,
  obtenirConfigurationFrais,
  obtenirFraisAdhesionAdherent,
  obtenirControleDga,
  obtenirJournalControleDga,
  obtenirRapprochementFrais,
  obtenirSyntheseControleDga,
  obtenirSyntheseFrais,
  obtenirSyntheseFraisAgent,
  obtenirSyntheseWorkflowAdherent,
  resoudreAnomalieFrais,
  signalerAnomalieFrais,
  soumettreAuControleDga,
  terminerControleDga,
  validerFraisAdhesion,
  verifierActivation,
  verifierChampControle,
  verifierDocumentControle,
  type CorpsActivation,
  type CorpsDecisionControle,
  type CorpsEnregistrementFrais,
  type CorpsResolutionAnomalieFrais,
  type CorpsVerificationChamp,
  type CorpsVerificationDocument,
  type FiltresFileControle,
  type FiltresFraisAdhesion,
  type Periode,
} from "@/api/adhesion";

const CLE = "adhesion" as const;

/* ----- Matrice documentaire et checklist (V21) ----- */

export function useChecklistDocumentaire(adherentId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "adherent", adherentId, "checklist"],
    queryFn: () => obtenirChecklistDocumentaire(adherentId!),
    enabled: !!adherentId && actif,
  });
}

/** Matrice en vigueur : alimente les types proposés au téléversement, jamais dupliquée côté client. */
export function useExigencesDocumentaires(enVigueur = true, actif = true) {
  return useQuery({
    queryKey: [CLE, "exigences", enVigueur],
    queryFn: () => listerExigencesDocumentaires(enVigueur),
    enabled: actif,
    staleTime: 5 * 60 * 1000,
  });
}

/* ----- Lectures ----- */

/**
 * Frais d'adhésion d'un adhérent (`GET /adherents/{id}/frais-adhesion`). V23 : son encaissement validé par le DAF
 * conditionne la saisie des cotisations — l'écran l'annonce, le serveur l'impose (spécification backend V23 §5).
 */
export function useFraisAdhesionAdherent(adherentId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "adherent", adherentId, "frais"],
    queryFn: () => obtenirFraisAdhesionAdherent(adherentId!),
    enabled: !!adherentId && actif,
  });
}

/**
 * Vrai quand les cotisations de l'adhérent sont ouvertes au regard du frais d'adhésion (V23) : frais enregistré **et**
 * encaissement validé par le DAF. Un adhérent ancien, antérieur au frais d'adhésion (aucun frais enregistré, statut
 * autre que « Préinscrit »), n'est pas bloqué : le serveur tranche ces cas (spécification backend V23 §5).
 */
export function fraisAdhesionValide(
  frais: { readonly frais: { readonly statut: string } | null } | undefined,
  statutAdherent: string | undefined,
): boolean {
  if (frais?.frais) return frais.frais.statut === "VALIDE";
  return statutAdherent !== "PREINSCRIT";
}

export function useSyntheseWorkflowAdherent(adherentId: string | undefined) {
  return useQuery({
    queryKey: [CLE, "adherent", adherentId, "synthese"],
    queryFn: () => obtenirSyntheseWorkflowAdherent(adherentId!),
    enabled: !!adherentId,
  });
}

/** Rechargée à chaque ouverture du dialogue : les conditions changent avec le dossier. */
export function useVerificationActivation(adherentId: string | undefined, actif: boolean) {
  return useQuery({
    queryKey: [CLE, "adherent", adherentId, "activation"],
    queryFn: () => verifierActivation(adherentId!),
    enabled: !!adherentId && actif,
    staleTime: 0,
  });
}

export function useControlesAdherent(adherentId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "adherent", adherentId, "controles"],
    queryFn: () => listerControlesAdherent(adherentId!),
    enabled: !!adherentId && actif,
  });
}

export function useConfigurationFrais(actif = true) {
  return useQuery({
    queryKey: [CLE, "configuration"],
    queryFn: () => obtenirConfigurationFrais(),
    enabled: actif,
  });
}

export function useFileControleDga(filtres: FiltresFileControle) {
  return useQuery({
    queryKey: [CLE, "file", filtres],
    queryFn: () => listerFileControleDga(filtres),
    placeholderData: (precedente) => precedente,
  });
}

export function useSyntheseControleDga(periode: Periode, actif = true) {
  return useQuery({
    queryKey: [CLE, "synthese-controle", periode],
    queryFn: () => obtenirSyntheseControleDga(periode),
    enabled: actif,
    placeholderData: (precedente) => precedente,
  });
}

export function useControleDga(id: string | undefined) {
  return useQuery({
    queryKey: [CLE, "controle", id],
    queryFn: () => obtenirControleDga(id!),
    enabled: !!id,
  });
}

export function useJournalControleDga(id: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "controle", id, "journal"],
    queryFn: () => obtenirJournalControleDga(id!),
    enabled: !!id && actif,
  });
}

export function useFraisAdhesion(filtres: FiltresFraisAdhesion, actif = true) {
  return useQuery({
    queryKey: [CLE, "frais", filtres],
    queryFn: () => listerFraisAdhesion(filtres),
    enabled: actif,
    placeholderData: (precedente) => precedente,
  });
}

export function useSyntheseFrais(periode: Periode, actif = true) {
  return useQuery({
    queryKey: [CLE, "synthese-frais", periode],
    queryFn: () => obtenirSyntheseFrais(periode),
    enabled: actif,
    placeholderData: (precedente) => precedente,
  });
}

export function useSyntheseFraisAgent(agentId: string | undefined, actif = true, periode: Periode = {}) {
  return useQuery({
    queryKey: [CLE, "synthese-frais-agent", agentId, periode],
    queryFn: () => obtenirSyntheseFraisAgent(agentId!, periode),
    enabled: !!agentId && actif,
  });
}

export function useRapprochementFrais(filtres: Periode & { agentId?: string }, actif = true) {
  return useQuery({
    queryKey: [CLE, "rapprochement", filtres],
    queryFn: () => obtenirRapprochementFrais(filtres),
    enabled: actif,
    placeholderData: (precedente) => precedente,
  });
}

/* ----- Écritures ----- */

/**
 * Après toute écriture du parcours : le parcours lui-même, la fiche et la liste des adhérents (statut,
 * badge DGA), les notifications (la DGA, le DAF ou le Gestionnaire sont prévenus) et les tableaux de bord.
 * Les autres onglets ouverts sont prévenus par le flux temps réel.
 */
function useInvalidationAdhesion() {
  const clientRequetes = useQueryClient();
  return () => {
    void clientRequetes.invalidateQueries({ queryKey: [CLE] });
    void clientRequetes.invalidateQueries({ queryKey: ["adherents"] });
    void clientRequetes.invalidateQueries({ queryKey: ["notifications"] });
    void clientRequetes.invalidateQueries({ queryKey: ["tableaux-de-bord"] });
  };
}

export function useEnregistrerFraisAdhesion(adherentId: string) {
  const invalider = useInvalidationAdhesion();
  return useMutation({
    mutationFn: (corps: CorpsEnregistrementFrais) => enregistrerFraisAdhesion(adherentId, corps),
    onSuccess: invalider,
  });
}

export function useActiverAdherent(adherentId: string) {
  const invalider = useInvalidationAdhesion();
  return useMutation({
    mutationFn: (corps: CorpsActivation) => activerAdherent(adherentId, corps),
    onSuccess: invalider,
  });
}

export function useSoumettreAuControleDga(adherentId: string) {
  const invalider = useInvalidationAdhesion();
  return useMutation({
    mutationFn: (commentaire?: string) => soumettreAuControleDga(adherentId, commentaire),
    onSuccess: invalider,
  });
}

export function useDemarrerControleDga(controleId: string) {
  const invalider = useInvalidationAdhesion();
  return useMutation({ mutationFn: () => demarrerControleDga(controleId), onSuccess: invalider });
}

export function useVerifierChampControle(controleId: string) {
  const invalider = useInvalidationAdhesion();
  return useMutation({
    mutationFn: ({ champId, corps }: { champId: string; corps: CorpsVerificationChamp }) =>
      verifierChampControle(controleId, champId, corps),
    onSuccess: invalider,
  });
}

export function useVerifierDocumentControle(controleId: string) {
  const invalider = useInvalidationAdhesion();
  return useMutation({
    mutationFn: ({ documentId, corps }: { documentId: string; corps: CorpsVerificationDocument }) =>
      verifierDocumentControle(controleId, documentId, corps),
    onSuccess: invalider,
  });
}

export function useTerminerControleDga(controleId: string) {
  const invalider = useInvalidationAdhesion();
  return useMutation({
    mutationFn: (corps: CorpsDecisionControle) => terminerControleDga(controleId, corps),
    onSuccess: invalider,
  });
}

export function useValiderFraisAdhesion() {
  const invalider = useInvalidationAdhesion();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version?: number | null }) => validerFraisAdhesion(id, version),
    onSuccess: invalider,
  });
}

export function useSignalerAnomalieFrais() {
  const invalider = useInvalidationAdhesion();
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => signalerAnomalieFrais(id, motif),
    onSuccess: invalider,
  });
}

export function useResoudreAnomalieFrais() {
  const invalider = useInvalidationAdhesion();
  return useMutation({
    mutationFn: ({ id, corps }: { id: string; corps: CorpsResolutionAnomalieFrais }) =>
      resoudreAnomalieFrais(id, corps),
    onSuccess: invalider,
  });
}
