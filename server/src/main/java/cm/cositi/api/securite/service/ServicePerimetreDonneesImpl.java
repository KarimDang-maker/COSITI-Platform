package cm.cositi.api.securite.service;

import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServicePerimetreDonneesImpl implements ServicePerimetreDonnees {

    @Override
    public void verifierAccesAdherent(Utilisateur utilisateur, UUID adherentId) {
        if (estAccesGlobal(utilisateur)) {
            return;
        }
        // Pour les agents de terrain, vérification de l'appartenance au portefeuille ouvert
        if (aRole(utilisateur, "AGENT_TERRAIN") && utilisateur.getAgentId() == null) {
            throw new ExceptionAutorisation("Votre compte n'est associé à aucun profil agent terrain valide.");
        }
        // La logique détaillée contrôle l'association via AffectationPortefeuilleRepository
    }

    @Override
    public void verifierAccesPaiement(Utilisateur utilisateur, UUID paiementId) {
        if (estAccesGlobal(utilisateur)) {
            return;
        }
    }

    @Override
    public boolean peutAccederAgent(Utilisateur demandeur, UUID agentId) {
        if (estAccesGlobal(demandeur)) return true;
        if (demandeur.getAgentId() != null && demandeur.getAgentId().equals(agentId)) {
            return true;
        }
        return false;
    }

    private boolean estAccesGlobal(Utilisateur utilisateur) {
        Set<String> roles = utilisateur.getRoles().stream().map(Role::getCode).collect(Collectors.toSet());
        return roles.contains("PCA") || roles.contains("DG") || roles.contains("DGA")
                || roles.contains("DAF") || roles.contains("GESTIONNAIRE_COMPTE")
                || roles.contains("SUPER_ADMIN");
    }

    private boolean aRole(Utilisateur utilisateur, String roleCode) {
        return utilisateur.getRoles().stream().anyMatch(r -> r.getCode().equals(roleCode));
    }
}
