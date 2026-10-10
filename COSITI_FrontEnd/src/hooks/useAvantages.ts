import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  creerAvantage,
  listerAvantages,
  listerAvantagesAdherent,
  listerBeneficiaires,
  modifierAvantage,
  recalculerAvantages,
  type CorpsAvantage,
  type StatutAvantage,
} from "@/api/avantages";

/** Famille de clés recouverte par `CLES_PAR_DOMAINE` (domaines `adherent` et `paiement`) et par les invalidations. */
const CLE = "avantages" as const;

/** `actif` : faux quand l'écran sait déjà que l'appel serait refusé (permission absente). */
export function useAvantages(inclureInactifs = false, actif = true) {
  return useQuery({
    queryKey: [CLE, "catalogue", inclureInactifs],
    queryFn: () => listerAvantages(inclureInactifs),
    enabled: actif,
  });
}

export function useBeneficiaires(avantageId: string | undefined, statut?: StatutAvantage, zoneId?: string) {
  return useQuery({
    queryKey: [CLE, "beneficiaires", avantageId, statut, zoneId],
    queryFn: () => listerBeneficiaires(avantageId!, statut, zoneId),
    enabled: !!avantageId,
    placeholderData: (precedente) => precedente,
  });
}

export function useAvantagesAdherent(adherentId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "adherent", adherentId],
    queryFn: () => listerAvantagesAdherent(adherentId!),
    enabled: actif && !!adherentId,
  });
}

/** Une écriture change le catalogue, les effectifs, les bénéficiaires et les avantages de chaque adhérent. */
function useInvalidationAvantages() {
  const clientRequetes = useQueryClient();
  return () => clientRequetes.invalidateQueries({ queryKey: [CLE] });
}

export function useRecalculerAvantages() {
  const invalider = useInvalidationAvantages();
  return useMutation({ mutationFn: recalculerAvantages, onSuccess: invalider });
}

export function useCreerAvantage() {
  const invalider = useInvalidationAvantages();
  return useMutation({ mutationFn: (corps: CorpsAvantage) => creerAvantage(corps), onSuccess: invalider });
}

export function useModifierAvantage(id: string) {
  const invalider = useInvalidationAvantages();
  return useMutation({ mutationFn: (corps: CorpsAvantage) => modifierAvantage(id, corps), onSuccess: invalider });
}
