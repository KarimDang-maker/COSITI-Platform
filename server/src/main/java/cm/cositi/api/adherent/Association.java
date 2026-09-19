package cm.cositi.api.adherent;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "association")
public class Association {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "code", unique = true, nullable = false, length = 20)
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

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getContactNom() { return contactNom; }
    public void setContactNom(String contactNom) { this.contactNom = contactNom; }
    public String getContactTelephone() { return contactTelephone; }
    public void setContactTelephone(String contactTelephone) { this.contactTelephone = contactTelephone; }
    public UUID getZoneId() { return zoneId; }
    public void setZoneId(UUID zoneId) { this.zoneId = zoneId; }
    public LocalDate getDateConvention() { return dateConvention; }
    public void setDateConvention(LocalDate dateConvention) { this.dateConvention = dateConvention; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
