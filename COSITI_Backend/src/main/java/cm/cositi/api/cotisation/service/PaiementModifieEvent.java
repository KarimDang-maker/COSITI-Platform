package cm.cositi.api.cotisation.service;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Événement de changement dans le module cotisations (#36). Publié par {@link ServicePaiementImpl} et
 * {@link ServiceBilanCaisseImpl}, consommé uniquement après commit par {@link EcouteurEvenementsCotisation} —
 * même fondation que {@code AdherentModifieEvent}/{@code AgentModifieEvent}, point d'extension pour une mise à
 * jour temps réel (SSE/WebSocket) : en attendant, le frontend invalide et recharge ses requêtes.
 *
 * @param ressource      {@code paiement} ou {@code bilan_caisse}
 * @param id             identifiant de la ressource modifiée
 * @param adherentId     adhérent concerné (nul pour un bilan de caisse)
 * @param dateBilan      date du bilan (nulle pour un paiement)
 * @param typeChangement nature du changement (CREATION, SOUMISSION, VALIDATION, REJET…)
 * @param statut         statut après le changement
 */
public record PaiementModifieEvent(String ressource, UUID id, UUID adherentId, LocalDate dateBilan,
                                   String typeChangement, String statut) {

    public static PaiementModifieEvent paiement(UUID paiementId, UUID adherentId, String typeChangement, String statut) {
        return new PaiementModifieEvent("paiement", paiementId, adherentId, null, typeChangement, statut);
    }

    public static PaiementModifieEvent bilan(UUID bilanId, LocalDate date, String typeChangement, String statut) {
        return new PaiementModifieEvent("bilan_caisse", bilanId, null, date, typeChangement, statut);
    }
}
