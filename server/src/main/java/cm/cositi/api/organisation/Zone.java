package cm.cositi.api.organisation;

import cm.cositi.api.commun.entite.EntiteArchivable;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "zone")
public class Zone extends EntiteArchivable {

    @Column(name = "code", unique = true, nullable = false, length = 20)
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

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
    public String getVille() { return ville; }
    public void setVille(String ville) { this.ville = ville; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public UUID getZoneParenteId() { return zoneParenteId; }
    public void setZoneParenteId(UUID zoneParenteId) { this.zoneParenteId = zoneParenteId; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
