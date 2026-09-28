package cm.cositi.api.audit;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Dépôt volontairement restreint à {@code save}/lecture : {@code journal_audit} est append-only
 * (AGENTS.md règle absolue n°6, 01_SCHEMA_BDD.md §1). Ne jamais étendre {@code JpaRepository} ici,
 * cela exposerait {@code delete}/{@code deleteAll}.
 */
public interface JournalAuditRepository extends Repository<JournalAudit, UUID>, JpaSpecificationExecutor<JournalAudit> {

    JournalAudit save(JournalAudit journalAudit);

    Optional<JournalAudit> findById(UUID id);
}
