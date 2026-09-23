package cm.cositi.api.cotisation.service;

import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.cotisation.dto.LigneAffectationDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.util.List;
import java.util.UUID;

/**
 * Lit la règle {@code REPARTITION_VERSEMENT} dans {@code parametre}. Tant que ce paramètre est marqué
 * {@code [V]} (non validé par la COSITI), l'implémentation par défaut crée une affectation unique vers la
 * composante {@code COOPERATIVE} (montant intégral) et journalise un avertissement — jamais de ventilation
 * inventée (docs/02_CLASSES_ET_METHODES.md §4).
 */
public interface ServiceAffectationPaiement {

    List<AffectationDto> affecter(UUID paiementId, Utilisateur auteur);

    List<AffectationDto> affecterManuellement(UUID paiementId, List<LigneAffectationDto> lignes, Utilisateur auteur);

    /** Vérifie que la somme des affectations égale le montant du paiement ; lève {@code ExceptionConflit} sinon. */
    void verifierInvariant(UUID paiementId);

    List<AffectationDto> lister(UUID paiementId);
}
