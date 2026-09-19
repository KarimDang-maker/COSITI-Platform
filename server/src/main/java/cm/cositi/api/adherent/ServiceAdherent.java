package cm.cositi.api.adherent;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface ServiceAdherent {
    AdherentDetailDto creer(CreationAdherentDto dto, Utilisateur auteur);
    AdherentDetailDto consulter(UUID id, Utilisateur demandeur);
    ReponsePaginee<AdherentResumeDto> rechercher(String recherche, UUID zoneId, String statut,
                                                Pageable pageable, Utilisateur demandeur);
    void archiver(UUID id, String motif, Utilisateur auteur);
    void changerStatut(UUID id, String nouveauStatut, String motif, Utilisateur auteur);
    void changerPack(UUID id, UUID packId, LocalDate effetLe, Utilisateur auteur);
}
