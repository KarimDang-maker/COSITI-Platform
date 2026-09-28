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

/**
 * Recommandation d'allocation structurée recueillie par l'agent auprès de l'adhérent pour un paiement
 * supérieur à 1000 FCFA (correctif COSITI V1 §8) — jamais un commentaire libre. Une recommandation par
 * paiement (contrainte d'unicité en base sur {@code paiement_id}, V14).
 */
@Entity
@Table(name = "recommandation_allocation_paiement")
public class RecommandationAllocationPaiement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "paiement_id", nullable = false, updatable = false, unique = true)
    private UUID paiementId;

    @Column(name = "allocation_securite_sociale", nullable = false, precision = 14, scale = 2)
    private BigDecimal allocationSecuriteSociale;

    @Column(name = "allocation_epargne", nullable = false, precision = 14, scale = 2)
    private BigDecimal allocationEpargne;

    @Column(name = "recueilli_par_id", updatable = false)
    private UUID recueilliParId;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    protected RecommandationAllocationPaiement() {
    }

    public RecommandationAllocationPaiement(UUID paiementId, BigDecimal allocationSecuriteSociale,
                                             BigDecimal allocationEpargne, UUID recueilliParId) {
        this.paiementId = paiementId;
        this.allocationSecuriteSociale = allocationSecuriteSociale;
        this.allocationEpargne = allocationEpargne;
        this.recueilliParId = recueilliParId;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getPaiementId() {
        return paiementId;
    }

    public BigDecimal getAllocationSecuriteSociale() {
        return allocationSecuriteSociale;
    }

    public BigDecimal getAllocationEpargne() {
        return allocationEpargne;
    }

    public UUID getRecueilliParId() {
        return recueilliParId;
    }

    public Instant getCreeLe() {
        return creeLe;
    }
}
