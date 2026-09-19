package cm.cositi.api.securite.service;

import cm.cositi.api.securite.entite.Utilisateur;
import java.util.UUID;

public interface ServicePerimetreDonnees {
    void verifierAccesAdherent(Utilisateur utilisateur, UUID adherentId);
    void verifierAccesPaiement(Utilisateur utilisateur, UUID paiementId);
    boolean peutAccederAgent(Utilisateur demandeur, UUID agentId);
}
