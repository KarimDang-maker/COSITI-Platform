package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.AdhesionDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.dto.CritereRechercheAdherent;
import cm.cositi.api.adherent.dto.ModificationAdherentDto;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface ServiceAdherent {

    AdherentDetailDto creer(CreationAdherentDto dto, Utilisateur auteur);

    AdherentDetailDto consulter(UUID id, Utilisateur demandeur);

    AdherentDetailDto modifier(UUID id, ModificationAdherentDto dto, Utilisateur auteur);

    ReponsePaginee<cm.cositi.api.adherent.dto.AdherentResumeDto> rechercher(
            CritereRechercheAdherent critere, Pageable pageable, Utilisateur demandeur);

    void archiver(UUID id, String motif, Utilisateur auteur);

    void changerStatut(UUID id, StatutAdherent nouveau, String motif, Utilisateur auteur);

    AdhesionDto changerPack(UUID id, UUID packId, LocalDate effetLe, Utilisateur auteur);
}
