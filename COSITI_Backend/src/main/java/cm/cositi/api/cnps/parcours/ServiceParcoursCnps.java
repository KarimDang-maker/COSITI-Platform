package cm.cositi.api.cnps.parcours;

import cm.cositi.api.securite.entite.Utilisateur;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ServiceParcoursCnps {

    List<SituationParcoursDto> lister(FiltreParcours filtre, UUID zoneId, Utilisateur demandeur);

    ResumeParcoursDto resume(UUID zoneId, Utilisateur demandeur);

    SituationParcoursDto consulter(UUID adherentId, Utilisateur demandeur);

    SituationParcoursDto preimmatriculer(UUID adherentId, PreimmatriculationDto dto, Utilisateur auteur);

    SituationParcoursDto deposerDossier(UUID adherentId, DepotDossierDto dto, Utilisateur auteur);

    SituationParcoursDto immatriculer(UUID adherentId, ImmatriculationDto dto, Utilisateur auteur);

    ParametresParcoursDto parametres(Utilisateur demandeur);

    ParametresParcoursDto modifierParametres(ParametresParcoursDto dto, Utilisateur auteur);

    // ---- Tâches système (appelées par le planificateur, sans utilisateur) ----

    /** Reconduit à la vague du mois courant les adhérents encore sous le quota. Idempotent. Renvoie le nombre reporté. */
    int reporterVague(LocalDate aujourdhui);

    /** Notifie les gestionnaires des échéances de dépôt proches ou dépassées. Renvoie le nombre d'alertes émises. */
    int alerterEcheancesDepot(LocalDate aujourdhui);
}
