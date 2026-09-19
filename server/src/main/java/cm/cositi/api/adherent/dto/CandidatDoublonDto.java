package cm.cositi.api.adherent.dto;

import java.util.UUID;

public record CandidatDoublonDto(
    UUID adherentId,
    String matricule,
    String nomComplet,
    String telephoneMasque,
    int scoreSimilarite,
    String motifCorrespondance
) {}
