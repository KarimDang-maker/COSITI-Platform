package cm.cositi.api.cotisation;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface ServicePaiement {
    PaiementDto enregistrer(EnregistrementPaiementDto dto, Utilisateur auteur);
    PaiementDto valider(UUID paiementId, Utilisateur validateur);
    PaiementDto confirmerParChef(UUID paiementId, Utilisateur chef);
    void signalerIncoherence(UUID paiementId, String motif, Utilisateur daf);
    void annuler(UUID paiementId, String motif, Utilisateur auteur);
    PaiementDto consulter(UUID paiementId);
    ReponsePaginee<PaiementDto> rechercher(UUID adherentId, String statut, LocalDate du, LocalDate au, Pageable pageable);
}
