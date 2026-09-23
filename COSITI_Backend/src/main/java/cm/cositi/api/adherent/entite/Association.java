package cm.cositi.api.adherent.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "association")
public class Association {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "nom", nullable = false, length = 160)
    private String nom;

    @Column(name = "type", length = 60)
    private String type;

    @Column(name = "contact_nom", length = 160)
    private String contactNom;

    @Column(name = "contact_telephone", length = 20)
    private String contactTelephone;

    @Column(name = "zone_id")
    private UUID zoneId;

    @Column(name = "date_convention")
    private LocalDate dateConvention;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected Association() {
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getNom() {
        return nom;
    }

    public UUID getZoneId() {
        return zoneId;
    }

    public boolean isActive() {
        return active;
    }
}
