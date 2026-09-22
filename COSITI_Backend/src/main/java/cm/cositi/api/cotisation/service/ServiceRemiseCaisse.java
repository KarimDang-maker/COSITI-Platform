package cm.cositi.api.cotisation.service;

import cm.cositi.api.cotisation.dto.RemiseCaisseDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface ServiceRemiseCaisse {

    RemiseCaisseDto declarer(UUID agentId, List<UUID> paiementIds, Utilisateur auteur);

    /** Refuse si {@code receveur} est l'agent lui-même. Écart non nul -> {@code EN_ECART} + notification DAF (P1). */
    RemiseCaisseDto receptionner(UUID remiseId, BigDecimal montantRecu, Utilisateur receveur);

    BigDecimal caisseEnAttente(UUID agentId);
}
