package cm.cositi.api.cotisation.service;

import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.cotisation.dto.LigneAffectationDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.util.List;
import java.util.UUID;

/**
 * Ventile un paiement validé entre les deux comptes métier de l'adhérent — Sécurité Sociale (composante
 * {@code CNPS}) et Épargne (composante {@code EPARGNE}) — selon {@code REPARTITION_VERSEMENT}, désormais
 * validé par la COSITI (correctif COSITI V1 §7-§8, {@code Conception/SUIVI_EXECUTION.md}) : 700 FCFA minimum
 * vers la Sécurité Sociale, le reste vers l'Épargne, sauf préférence d'allocation enregistrée par l'adhérent
 * ou recommandation structurée de paiement (montant &gt; 1000 FCFA).
 */
public interface ServiceAffectationPaiement {

    List<AffectationDto> affecter(UUID paiementId, Utilisateur auteur);

    List<AffectationDto> affecterManuellement(UUID paiementId, List<LigneAffectationDto> lignes, Utilisateur auteur);

    /** Vérifie que la somme des affectations égale le montant du paiement ; lève {@code ExceptionConflit} sinon. */
    void verifierInvariant(UUID paiementId);

    List<AffectationDto> lister(UUID paiementId);
}
