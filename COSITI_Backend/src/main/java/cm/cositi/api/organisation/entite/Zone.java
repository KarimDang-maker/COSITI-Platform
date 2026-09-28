package cm.cositi.api.organisation.entite;

import cm.cositi.api.commun.entite.EntiteArchivable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "zone")
public class Zone extends EntiteArchivable {

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "libelle", nullable = false, length = 120)
    private String libelle;

    @Column(name = "ville", nullable = false, length = 80)
    private String ville;

    @Column(name = "region", nullable = false, length = 80)
    private String region;

    @Column(name = "zone_parente_id")
    private UUID zoneParenteId;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected Zone() {
    }

    public Zone(String code, String libelle, String ville, String region) {
        this.code = code;
        this.libelle = libelle;
        this.ville = ville;
        this.region = region;
    }

    public String getCode() {
        return code;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getVille() {
        return ville;
    }

    public String getRegion() {
        return region;
    }

    public UUID getZoneParenteId() {
        return zoneParenteId;
    }

    public void setZoneParenteId(UUID zoneParenteId) {
        this.zoneParenteId = zoneParenteId;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
