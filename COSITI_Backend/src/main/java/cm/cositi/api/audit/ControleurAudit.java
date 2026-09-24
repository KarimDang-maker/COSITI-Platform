package cm.cositi.api.audit;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

/**
 * Lecture seule : aucune méthode d'écriture ni de purge n'est exposée (docs/03_SPECIFICATIONS_API.md §10).
 *
 * <p>L'export/impression PDF réservé au Super Administrateur (correctif COSITI V1 §3) vit dans
 * {@code ControleurExport}/{@code ServiceExport} (jalon J10) — même infrastructure d'export CSV que
 * adhérents/paiements/CNPS, pas un endpoint dupliqué ici.</p>
 */
@RestController
public class ControleurAudit {

    private final JournalAuditRepository repository;

    public ControleurAudit(JournalAuditRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/api/v1/audit")
    @PreAuthorize("hasAuthority('AUDIT:CONSULTER')")
    public ReponsePaginee<AuditLigneDto> lister(
            @RequestParam(required = false) String entite,
            @RequestParam(required = false) UUID entiteId,
            @RequestParam(required = false) UUID utilisateurId,
            @RequestParam(required = false) TypeOperation type,
            @RequestParam(required = false) Instant depuis,
            @RequestParam(required = false) Instant jusqua,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille) {

        Specification<JournalAudit> spec = Specification.where(null);
        if (entite != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("entite"), entite));
        }
        if (entiteId != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("entiteId"), entiteId));
        }
        if (utilisateurId != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("utilisateurId"), utilisateurId));
        }
        if (type != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("typeOperation"), type));
        }
        if (depuis != null) {
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("horodatage"), depuis));
        }
        if (jusqua != null) {
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("horodatage"), jusqua));
        }

        int tailleBornee = Math.min(taille, 200);
        var pageResultat = repository.findAll(spec,
                PageRequest.of(page, tailleBornee, Sort.by(Sort.Direction.DESC, "horodatage")));
        return ReponsePaginee.depuis(pageResultat.map(AuditLigneDto::depuis));
    }
}
