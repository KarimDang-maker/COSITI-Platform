package cm.cositi.api.adherent.service;

import java.util.UUID;

public record CandidatDoublon(UUID adherentId, String matricule, String nomComplet,
                               String telephone, int scoreSimilarite, String motifCorrespondance) {
}
