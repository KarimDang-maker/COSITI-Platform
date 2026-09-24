package cm.cositi.api.organisation.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Objectif de recouvrement mensuel d'un agent (RAPORT_V1.md §4.4/§6.5) — proposé par la Gestionnaire ou le
 * Chef des agents de terrain, décidé par la DGA (arbitrage, §6.11 : la DGA approuve ou rejette, elle ne
 * modifie jamais la proposition).
 */
@Entity
@Table(name = "objectif_recouvrement")
public class ObjectifRecouvrement {

    public enum Statut { PROPOSE, APPROUVE, REJETE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "agent_id", nullable = false, updatable = false)
    private UUID agentId;

    @Column(name = "periode", nullable = false, updatable = false)
    private LocalDate periode;

    @Column(name = "montant", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal montant;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private Statut statut = Statut.PROPOSE;

    @Column(name = "propose_par", updatable = false)
    private UUID proposePar;

    @Column(name = "propose_le", updatable = false)
    private Instant proposeLe;

    @Column(name = "decide_par")
    private UUID decidePar;

    @Column(name = "decide_le")
    private Instant decideLe;

    @Column(name = "motif_decision", columnDefinition = "TEXT")
    private String motifDecision;

    protected ObjectifRecouvrement() {
    }

    public ObjectifRecouvrement(UUID agentId, LocalDate periode, BigDecimal montant, UUID proposePar) {
        this.agentId = agentId;
        this.periode = periode;
        this.montant = montant;
        this.proposePar = proposePar;
        this.proposeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public LocalDate getPeriode() {
        return periode;
    }

    public BigDecimal getMontant() {
        return montant;
    }

    public Statut getStatut() {
        return statut;
    }

    public UUID getProposePar() {
        return proposePar;
    }

    public Instant getProposeLe() {
        return proposeLe;
    }

    public UUID getDecidePar() {
        return decidePar;
    }

    public Instant getDecideLe() {
        return decideLe;
    }

    public String getMotifDecision() {
        return motifDecision;
    }

    public void approuver(UUID decidePar, String motif) {
        this.statut = Statut.APPROUVE;
        this.decidePar = decidePar;
        this.decideLe = Instant.now();
        this.motifDecision = motif;
    }

    public void rejeter(UUID decidePar, String motif) {
        this.statut = Statut.REJETE;
        this.decidePar = decidePar;
        this.decideLe = Instant.now();
        this.motifDecision = motif;
    }
}
