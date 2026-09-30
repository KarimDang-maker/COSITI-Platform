package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.Adhesion;

import java.time.LocalDate;
import java.util.UUID;

public record AdhesionDto(UUID id, UUID adherentId, UUID packId, LocalDate dateDebut, LocalDate dateFin) {
    public static AdhesionDto depuis(Adhesion a) {
        return new AdhesionDto(a.getId(), a.getAdherentId(), a.getPackId(), a.getDateDebut(), a.getDateFin());
    }
}
