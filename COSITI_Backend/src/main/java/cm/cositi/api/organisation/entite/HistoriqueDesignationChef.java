package cm.cositi.api.organisation.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Append-only : trace chaque désignation/remplacement du Chef des agents de terrain (V7 migration). */
@Entity
@Table(name = "historique_designation_chef")
public class HistoriqueDesignationChef {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "zone_id", nullable = false, updatable = false)
    private UUID zoneId;

    @Column(name = "agent_id", nullable = false, updatable = false)
    private UUID agentId;

    @Column(name = "agent_remplace_id", updatable = false)
    private UUID agentRemplaceId;

    @Column(name = "designe_par", nullable = false, updatable = false)
    private UUID designePar;

    @Column(name = "motif", updatable = false, length = 200)
    private String motif;

    @Column(name = "horodatage", updatable = false)
    private Instant horodatage;

    protected HistoriqueDesignationChef() {
    }

    public HistoriqueDesignationChef(UUID zoneId, UUID agentId, UUID agentRemplaceId, UUID designePar, String motif) {
        this.zoneId = zoneId;
        this.agentId = agentId;
        this.agentRemplaceId = agentRemplaceId;
        this.designePar = designePar;
        this.motif = motif;
        this.horodatage = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getZoneId() {
        return zoneId;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public UUID getAgentRemplaceId() {
        return agentRemplaceId;
    }

    public UUID getDesignePar() {
        return designePar;
    }

    public String getMotif() {
        return motif;
    }

    public Instant getHorodatage() {
        return horodatage;
    }
}
