package cm.cositi.api.droits;

import cm.cositi.api.cotisation.AffectationPaiement;
import cm.cositi.api.cotisation.Paiement;
import cm.cositi.api.droits.dto.SituationDroitsDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ServiceCalculDroits {
    List<PeriodeDroits> imputer(Paiement paiement, List<AffectationPaiement> affectations, Utilisateur auteur);
    SituationDroitsDto situation(UUID adherentId, LocalDate dateReference);
    void recalculer(UUID adherentId, String motif, Utilisateur auteur);
}
