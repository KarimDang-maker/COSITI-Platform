package cm.cositi.api.droits.service;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.droits.dto.AdherentEnRetardDto;
import cm.cositi.api.droits.dto.CritereRetard;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface ServiceRegularite {

    /**
     * Le seuil de bascule en retard est le paramètre {@code DELAI_RETARD_JOURS} (table {@code parametre}),
     * jamais une constante codée en dur.
     */
    StatutRegularite evaluer(UUID adherentId, LocalDate dateReference);

    /** Liste paginée, respecte le périmètre de données de l'appelant ({@code ServicePerimetreDonnees}). */
    ReponsePaginee<AdherentEnRetardDto> retardataires(CritereRetard critere, Pageable pageable, Utilisateur utilisateur);

    /** Tâche planifiée ({@code @Scheduled}) — met à jour {@code adherent.statut} via le service adhérent existant. */
    void rafraichirStatutsQuotidiens();
}
