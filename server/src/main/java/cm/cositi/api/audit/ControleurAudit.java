package cm.cositi.api.audit;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/audit")
@Tag(name = "Journal d'Audit", description = "Consultation en lecture seule du journal d'audit immuable (aucune écriture ni purge autorisée)")
public class ControleurAudit {

    private final JournalAuditRepository journalAuditRepository;

    public ControleurAudit(JournalAuditRepository journalAuditRepository) {
        this.journalAuditRepository = journalAuditRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('AUDIT:CONSULTER')")
    @Operation(summary = "Consulter le journal d'audit chronologique")
    public ResponseEntity<ReponsePaginee<JournalAudit>> consulterJournal(
            @PageableDefault(size = 25, sort = "horodatage") Pageable pageable) {
        Page<JournalAudit> page = journalAuditRepository.findAll(pageable);
        ReponsePaginee<JournalAudit> reponse = new ReponsePaginee<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
        return ResponseEntity.ok(reponse);
    }
}
