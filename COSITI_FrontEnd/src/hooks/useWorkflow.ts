import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annulerDemande,
  approuverDemande,
  creerDemandeModification,
  demanderChangementStatutAgent,
  demanderCorrectionDemande,
  joindreJustificatif,
  listerDemandes,
  listerDemandesEnAttente,
  obtenirDecisionsDemande,
  obtenirDemande,
  obtenirHistoriqueValidation,
  obtenirStatutValidation,
  rejeterDemande,
  resoumettreDemande,
  soumettreDemande,
  soumettreEntite,
  type CorpsChangementStatutAgent,
  type CorpsDecision,
  type CorpsDemandeModification,
  type CorpsSoumissionEntite,
  type FiltresDemandes,
  type PropositionChamp,
  type TypeEntiteWorkflow,
} from "@/api/workflow";

const CLE = "workflow" as const;

/** Clés du domaine concerné par une entité du workflow : une approbation y applique le changement. */
const DOMAINES: Readonly<Record<TypeEntiteWorkflow, readonly string[]>> = {
  ADHERENT: ["adherents", "documents", "cnps"],
  AGENT: ["organisation"],
  PAIEMENT: ["paiements", "bilans-caisse", "adherents", "droits", "organisation"],
};

/**
 * Après toute écriture du workflow : file, demandes, statuts et historiques, et le domaine de l'entité. Jamais
 * de mise à jour optimiste : l'interface n'affiche un résultat qu'après la réponse du serveur (§39).
 */
function useInvalidationWorkflow() {
  const clientRequetes = useQueryClient();
  return (typeEntite?: TypeEntiteWorkflow) => {
    void clientRequetes.invalidateQueries({ queryKey: [CLE] });
    // La cloche se met à jour : le serveur notifie demandeur et validateurs après commit.
    void clientRequetes.invalidateQueries({ queryKey: ["notifications"] });
    const domaines = typeEntite ? DOMAINES[typeEntite] : Object.values(DOMAINES).flat();
    for (const domaine of new Set(domaines)) void clientRequetes.invalidateQueries({ queryKey: [domaine] });
  };
}

export function useDemandes(filtres: FiltresDemandes, actif = true) {
  return useQuery({
    queryKey: [CLE, "demandes", filtres],
    queryFn: () => listerDemandes(filtres),
    placeholderData: (precedente) => precedente,
    enabled: actif,
  });
}

export function useDemandesEnAttente(typeEntite: TypeEntiteWorkflow | undefined, page: number, actif = true) {
  return useQuery({
    queryKey: [CLE, "en-attente", typeEntite, page],
    queryFn: () => listerDemandesEnAttente(typeEntite, page),
    placeholderData: (precedente) => precedente,
    enabled: actif,
  });
}

export function useDemande(id: string | undefined) {
  return useQuery({ queryKey: [CLE, "demande", id], queryFn: () => obtenirDemande(id!), enabled: !!id });
}

export function useDecisionsDemande(id: string | undefined) {
  return useQuery({ queryKey: [CLE, "demande", id, "decisions"], queryFn: () => obtenirDecisionsDemande(id!), enabled: !!id });
}

export function useStatutValidation(type: TypeEntiteWorkflow, entiteId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "statut", type, entiteId],
    queryFn: () => obtenirStatutValidation(type, entiteId!),
    enabled: !!entiteId && actif,
  });
}

export function useHistoriqueValidation(type: TypeEntiteWorkflow, entiteId: string | undefined, actif = true) {
  return useQuery({
    queryKey: [CLE, "historique", type, entiteId],
    queryFn: () => obtenirHistoriqueValidation(type, entiteId!),
    enabled: !!entiteId && actif,
  });
}

export function useSoumettreEntite(type: "ADHERENT" | "AGENT", entiteId: string) {
  const invalider = useInvalidationWorkflow();
  return useMutation({
    mutationFn: ({ corps, cle }: { corps: CorpsSoumissionEntite; cle?: string }) => soumettreEntite(type, entiteId, corps, cle),
    onSuccess: () => invalider(type),
  });
}

export function useCreerDemandeModification(type: TypeEntiteWorkflow, entiteId: string) {
  const invalider = useInvalidationWorkflow();
  return useMutation({
    mutationFn: ({ corps, cle }: { corps: CorpsDemandeModification; cle?: string }) => creerDemandeModification(type, entiteId, corps, cle),
    onSuccess: () => invalider(type),
  });
}

export function useDemanderChangementStatutAgent(agentId: string) {
  const invalider = useInvalidationWorkflow();
  return useMutation({
    mutationFn: ({ corps, cle }: { corps: CorpsChangementStatutAgent; cle?: string }) => demanderChangementStatutAgent(agentId, corps, cle),
    onSuccess: () => invalider("AGENT"),
  });
}

export type ActionDecision = "approuver" | "rejeter" | "corriger" | "soumettre" | "resoumettre" | "annuler";

/**
 * Toutes les transitions d'une demande. `cle` : clé d'idempotence fixée à l'ouverture du dialogue — un double
 * clic ou un nouvel essai après coupure réseau renvoie l'état courant, jamais une double application.
 */
export function useDecisionDemande(typeEntite?: TypeEntiteWorkflow) {
  const invalider = useInvalidationWorkflow();
  return useMutation({
    mutationFn: ({
      id,
      action,
      corps = {},
      elements,
      cle,
    }: {
      id: string;
      action: ActionDecision;
      corps?: CorpsDecision;
      elements?: PropositionChamp[];
      cle?: string;
    }) => {
      switch (action) {
        case "approuver":
          return approuverDemande(id, corps, cle);
        case "rejeter":
          return rejeterDemande(id, corps.commentaire ?? "", cle);
        case "corriger":
          return demanderCorrectionDemande(id, corps.commentaire ?? "", cle);
        case "soumettre":
          return soumettreDemande(id, cle);
        case "resoumettre":
          return resoumettreDemande(id, { commentaire: corps.commentaire, elements }, cle);
        case "annuler":
          return annulerDemande(id, corps.commentaire, cle);
      }
    },
    onSuccess: (demande) => invalider(demande?.typeEntite ?? typeEntite),
  });
}

export function useJoindreJustificatif(demandeId: string) {
  const invalider = useInvalidationWorkflow();
  return useMutation({
    mutationFn: (documentId: string) => joindreJustificatif(demandeId, documentId),
    onSuccess: () => invalider(),
  });
}
