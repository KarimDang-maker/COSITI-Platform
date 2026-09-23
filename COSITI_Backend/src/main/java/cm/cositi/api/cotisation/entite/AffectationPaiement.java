package cm.cositi.api.cotisation.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Invariant applicatif : somme des montants = paiement.montant pour tout paiement validé. */
@Entity
@Table(name = "affectation_paiement")
public class AffectationPaiement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "paiement_id", nullable = false, updatable = false)
    private UUID paiementId;

    @Column(name = "composante_id", nullable = false, updatable = false)
    private UUID composanteId;

    @Column(name = "montant", nullable = false, precision = 14, scale = 2)
    private BigDecimal montant;

    @Column(name = "regle_appliquee", nullable = false, length = 80)
    private String regleAppliquee;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "cree_par", updatable = false, length = 80)
    private String creePar;

    protected AffectationPaiement() {
    }

    public AffectationPaiement(UUID paiementId, UUID composanteId, BigDecimal montant, String regleAppliquee,
                                String creePar) {
        this.paiementId = paiementId;
        this.composanteId = composanteId;
        this.montant = montant;
        this.regleAppliquee = regleAppliquee;
        this.creePar = creePar;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getPaiementId() {
        return paiementId;
    }

    public UUID getComposanteId() {
        return composanteId;
    }

    public BigDecimal getMontant() {
        return montant;
    }

    public String getRegleAppliquee() {
        return regleAppliquee;
    }
}
