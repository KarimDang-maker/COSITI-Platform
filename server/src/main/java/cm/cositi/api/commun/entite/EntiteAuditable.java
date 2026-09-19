package cm.cositi.api.commun.entite;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class EntiteAuditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    protected UUID id;

    @CreatedDate
    @Column(name = "cree_le", nullable = false, updatable = false)
    protected Instant creeLe;

    @CreatedBy
    @Column(name = "cree_par", updatable = false)
    protected String creePar;

    @LastModifiedDate
    @Column(name = "modifie_le")
    protected Instant modifieLe;

    @LastModifiedBy
    @Column(name = "modifie_par")
    protected String modifiePar;

    @Version
    @Column(name = "version", nullable = false)
    protected Long version = 0L;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
    public String getCreePar() { return creePar; }
    public void setCreePar(String creePar) { this.creePar = creePar; }
    public Instant getModifieLe() { return modifieLe; }
    public void setModifieLe(Instant modifieLe) { this.modifieLe = modifieLe; }
    public String getModifiePar() { return modifiePar; }
    public void setModifiePar(String modifiePar) { this.modifiePar = modifiePar; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
