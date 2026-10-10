package cm.cositi.api.avantage;

import cm.cositi.api.avantage.AvantageDtos.AvantageAdherentDto;
import cm.cositi.api.avantage.AvantageDtos.AvantageDto;
import cm.cositi.api.avantage.AvantageDtos.BeneficiaireDto;
import cm.cositi.api.avantage.AvantageDtos.ResultatRecalculDto;
import cm.cositi.api.avantage.AvantageDtos.SaisieAvantageDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ServiceAvantage {

    List<AvantageDto> catalogue(boolean inclureInactifs, Utilisateur demandeur);

    AvantageDto consulter(UUID avantageId, Utilisateur demandeur);

    AvantageDto creer(SaisieAvantageDto dto, Utilisateur auteur);

    AvantageDto modifier(UUID avantageId, SaisieAvantageDto dto, Utilisateur auteur);

    /** Évalue l'adhérent à l'instant, enregistre le résultat, puis renvoie tous ses avantages actifs. */
    List<AvantageAdherentDto> avantagesDeLAdherent(UUID adherentId, Utilisateur demandeur);

    List<BeneficiaireDto> beneficiaires(UUID avantageId, StatutAvantage statut, UUID zoneId, Utilisateur demandeur);

    ResultatRecalculDto recalculer(Utilisateur demandeur);

    /** Évaluation de tous les adhérents (tâche système, sans utilisateur). */
    ResultatRecalculDto recalculerTous(LocalDate aujourdhui);
}
