package cm.cositi.api.adherent.repository;

import java.util.UUID;

/** Projection native pour la recherche de doublon par similarité de nom (pg_trgm). */
public interface CandidatSimilariteProjection {
    UUID getId();
    Double getScore();
}
