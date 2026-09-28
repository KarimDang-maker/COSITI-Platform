package cm.cositi.api.commun.entite;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Socle commun des entités auditables : identifiant technique + traçabilité de création/modification.
 * Utilisée uniquement par les entités dont la table possède exactement les colonnes
 * {@code cree_le, cree_par, modifie_le, modifie_par} (voir chaque migration Flyway pour le détail réel des colonnes —
 * certaines tables de référence ou d'historique n'ont pas toutes ces colonnes et ne l'étendent donc pas).
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class EntiteAuditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    protected UUID id;

    @CreatedDate
    @Column(name = "cree_le", updatable = false)
    protected Instant creeLe;

    @CreatedBy
    @Column(name = "cree_par", updatable = false, length = 80)
    protected String creePar;

    @LastModifiedDate
    @Column(name = "modifie_le")
    protected Instant modifieLe;

    @LastModifiedBy
    @Column(name = "modifie_par", length = 80)
    protected String modifiePar;

    public UUID getId() {
        return id;
    }

    public Instant getCreeLe() {
        return creeLe;
    }

    public String getCreePar() {
        return creePar;
    }

    public Instant getModifieLe() {
        return modifieLe;
    }

    public String getModifiePar() {
        return modifiePar;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EntiteAuditable that)) return false;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
