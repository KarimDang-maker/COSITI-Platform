package cm.cositi.api.organisation.service;

import cm.cositi.api.organisation.dto.CritereRechercheAgent;
import cm.cositi.api.organisation.entite.Agent;
import org.springframework.data.jpa.domain.Specification;

/** Construction des filtres de recherche agent — même style que {@code SpecificationsAdherent}. */
public final class SpecificationsAgent {

    private SpecificationsAgent() {
    }

    public static Specification<Agent> depuisCritere(CritereRechercheAgent c) {
        Specification<Agent> spec = Specification.<Agent>where(null)
                .and((root, query, cb) -> cb.isFalse(root.get("archive")));

        if (c.recherche() != null && !c.recherche().isBlank()) {
            String motif = "%" + c.recherche().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("codeAgent")), motif),
                    cb.like(cb.lower(root.get("nomComplet")), motif),
                    cb.like(cb.lower(root.get("telephone")), motif)
            ));
        }
        if (c.actif() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("actif"), c.actif()));
        }
        if (c.zoneId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("zoneId"), c.zoneId()));
        }
        return spec;
    }
}
