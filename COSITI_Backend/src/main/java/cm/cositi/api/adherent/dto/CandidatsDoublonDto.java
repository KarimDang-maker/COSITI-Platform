package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.service.CandidatDoublon;

import java.util.List;

public record CandidatsDoublonDto(List<CandidatDoublon> candidats) {
}
