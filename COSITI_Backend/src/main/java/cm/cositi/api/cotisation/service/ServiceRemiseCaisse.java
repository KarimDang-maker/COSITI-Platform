package cm.cositi.api.cotisation.service;

import cm.cositi.api.cotisation.dto.RemiseCaisseDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface ServiceRemiseCaisse {

    RemiseCaisseDto declarer(UUID agentId, List<UUID> paiementIds, Utilisateur auteur);

    /** Refuse si {@code receveur} est l'agent lui-même. Écart non nul -> {@code EN_ECART} + notification au DAF (livrée au jalon J8). */
    RemiseCaisseDto receptionner(UUID remiseId, BigDecimal montantRecu, Utilisateur receveur);

    BigDecimal caisseEnAttente(UUID agentId);

    /** Remises de caisse, les plus récentes d'abord ({@code statut} et {@code agentId} facultatifs). */
    cm.cositi.api.commun.reponse.ReponsePaginee<RemiseCaisseDto> lister(String statut, UUID agentId, int page,
                                                                          int taille);

    RemiseCaisseDto consulter(UUID remiseId);

    /** Cotisations encaissées par l'agent et pas encore remises (ni annulées ni rejetées) : ce qu'il doit remettre. */
    List<cm.cositi.api.cotisation.dto.PaiementDto> aRemettre(UUID agentId, Utilisateur demandeur);
}
