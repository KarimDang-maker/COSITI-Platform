package cm.cositi.api.compterendu.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Lien de traçabilité entre un compte rendu consolidé et l'une de ses sources
 * (table {@code compte_rendu_source}, V10).
 *
 * <p>Exigence de {@code docs/02_CLASSES_ET_METHODES.md §3} : « consolider n'invente aucune règle métier, il
 * agrège les comptes rendus sources tels que structurés, avec traçabilité ». Sans cette table, un consolidé
 * transmis à la DGA serait un chiffre sans provenance.</p>
 */
@Entity
@Table(name = "compte_rendu_source")
public class CompteRenduSource {

    @Embeddable
    public static class Cle implements Serializable {

        @Column(name = "consolide_id", nullable = false)
        private UUID consolideId;

        @Column(name = "source_id", nullable = false)
        private UUID sourceId;

        protected Cle() {
        }

        public Cle(UUID consolideId, UUID sourceId) {
            this.consolideId = consolideId;
            this.sourceId = sourceId;
        }

        public UUID getConsolideId() {
            return consolideId;
        }

        public UUID getSourceId() {
            return sourceId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Cle cle)) return false;
            return Objects.equals(consolideId, cle.consolideId) && Objects.equals(sourceId, cle.sourceId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(consolideId, sourceId);
        }
    }

    @EmbeddedId
    private Cle cle;

    protected CompteRenduSource() {
    }

    public CompteRenduSource(UUID consolideId, UUID sourceId) {
        this.cle = new Cle(consolideId, sourceId);
    }

    public Cle getCle() {
        return cle;
    }
}
