import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  consoliderComptesRendus,
  controlerCompteRendu,
  listerComptesRendus,
  modifierCompteRendu,
  obtenirCompteRendu,
  produireCompteRendu,
  transmettreCompteRendu,
  type FiltresComptesRendus,
  type SaisieCompteRendu,
} from "@/api/comptesRendus";

const CLE = "comptes-rendus" as const;

export function useComptesRendus(filtres: FiltresComptesRendus) {
  return useQuery({
    queryKey: [CLE, "liste", filtres],
    queryFn: () => listerComptesRendus(filtres),
    placeholderData: (precedente) => precedente,
  });
}

export function useCompteRendu(id: string | undefined) {
  return useQuery({
    queryKey: [CLE, "detail", id],
    queryFn: () => obtenirCompteRendu(id!),
    enabled: !!id,
  });
}

/**
 * Toute écriture invalide l'ensemble du domaine : consolider change à la fois le consolidé créé et le
 * statut de chacune de ses sources, transmettre change la file de travail du destinataire.
 */
function useInvalidation() {
  const clientRequetes = useQueryClient();
  return () => clientRequetes.invalidateQueries({ queryKey: [CLE] });
}

export function useProduireCompteRendu() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (saisie: SaisieCompteRendu) => produireCompteRendu(saisie),
    onSuccess: invalider,
  });
}

export function useModifierCompteRendu(id: string) {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (saisie: SaisieCompteRendu) => modifierCompteRendu(id, saisie),
    onSuccess: invalider,
  });
}

export function useTransmettreCompteRendu() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (id: string) => transmettreCompteRendu(id),
    onSuccess: invalider,
  });
}

export function useControlerCompteRendu() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (variables: { id: string; observation?: string }) =>
      controlerCompteRendu(variables.id, variables.observation),
    onSuccess: invalider,
  });
}

export function useConsoliderComptesRendus() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: (variables: { ids: readonly string[]; synthese?: string }) =>
      consoliderComptesRendus(variables.ids, variables.synthese),
    onSuccess: invalider,
  });
}
