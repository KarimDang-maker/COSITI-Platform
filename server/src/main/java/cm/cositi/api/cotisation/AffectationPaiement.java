package cm.cositi.api.cotisation;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "affectation_paiement")
public class AffectationPaiement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paiement_id", nullable = false)
    private Paiement paiement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "composante_id", nullable = false)
    private ComposanteAffectation composante;

    @Column(name = "montant", precision = 14, scale = 2, nullable = false)
    private BigDecimal montant;

    @Column(name = "regle_appliquee", nullable = false, length = 80)
    private String regleAppliquee;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "cree_par", length = 80)
    private String creePar;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Paiement getPaiement() { return paiement; }
    public void setPaiement(Paiement paiement) { this.paiement = paiement; }
    public ComposanteAffectation getComposante() { return composante; }
    public void setComposante(ComposanteAffectation composante) { this.composante = composante; }
    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }
    public String getRegleAppliquee() { return regleAppliquee; }
    public void setRegleAppliquee(String regleAppliquee) { this.regleAppliquee = regleAppliquee; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
    public String getCreePar() { return creePar; }
    public void setCreePar(String creePar) { this.creePar = creePar; }
}
