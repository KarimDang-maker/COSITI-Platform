package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.CritereRechercheAdherent;
import cm.cositi.api.adherent.entite.Adherent;
import org.springframework.data.jpa.domain.Specification;

/** Construction des filtres de recherche adhérent — paramètres liés uniquement (docs/04_SECURITE.md §5). */
public final class SpecificationsAdherent {

    private SpecificationsAdherent() {
    }

    public static Specification<Adherent> depuisCritere(CritereRechercheAdherent c) {
        Specification<Adherent> spec = Specification.where(null);

        if (c.recherche() != null && !c.recherche().isBlank()) {
            String motif = "%" + c.recherche().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("matricule")), motif),
                    cb.like(cb.lower(root.get("nom")), motif),
                    cb.like(cb.lower(root.get("telephonePrincipal")), motif),
                    cb.like(cb.lower(cb.coalesce(root.get("numeroCni"), "")), motif)
            ));
        }
        if (c.zoneId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("zoneId"), c.zoneId()));
        }
        if (c.activiteId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("activiteId"), c.activiteId()));
        }
        if (c.statut() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("statut"), c.statut()));
        }
        if (c.associationId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("associationId"), c.associationId()));
        }
        if (c.dateAdhesionDu() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("dateAdhesion"), c.dateAdhesionDu()));
        }
        if (c.dateAdhesionAu() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("dateAdhesion"), c.dateAdhesionAu()));
        }
        return spec;
    }
}
