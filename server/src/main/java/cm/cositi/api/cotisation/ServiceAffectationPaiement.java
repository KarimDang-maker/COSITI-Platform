package cm.cositi.api.cotisation;

import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.util.List;
import java.util.UUID;

public interface ServiceAffectationPaiement {
    List<AffectationDto> affecter(UUID paiementId, Utilisateur auteur);
    void verifierInvariant(UUID paiementId);
}
