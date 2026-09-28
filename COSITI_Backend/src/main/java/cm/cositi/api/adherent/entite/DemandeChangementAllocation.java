package cm.cositi.api.adherent.entite;

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
import java.util.UUID;

/**
 * Demande de changement de pack/allocation après création de l'adhérent (RAPORT_V1.md §6.3/§7.2) : la
 * Gestionnaire propose, le DAF valide ou rejette (séparation des tâches, §17 du correctif précédent).
 * Contrairement à la préférence initiale (posée par {@code ServiceAdherentImpl.finaliser}), un changement
 * ultérieur n'est jamais appliqué directement par la Gestionnaire.
 */
@Entity
@Table(name = "demande_changement_allocation")
public class DemandeChangementAllocation {

    public enum Statut { EN_ATTENTE, VALIDEE, REJETEE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "pack_id", updatable = false)
    private UUID packId;

    @Column(name = "montant_reference", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal montantReference;

    @Column(name = "allocation_securite_sociale", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal allocationSecuriteSociale;

    @Column(name = "allocation_epargne", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal allocationEpargne;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private Statut statut = Statut.EN_ATTENTE;

    @Column(name = "proposee_par", updatable = false)
    private UUID proposeePar;

    @Column(name = "proposee_le", updatable = false)
    private Instant proposeeLe;

    @Column(name = "decidee_par")
    private UUID decideePar;

    @Column(name = "decidee_le")
    private Instant decideeLe;

    @Column(name = "motif_decision", columnDefinition = "TEXT")
    private String motifDecision;

    protected DemandeChangementAllocation() {
    }

    public DemandeChangementAllocation(UUID adherentId, UUID packId, BigDecimal montantReference,
                                        BigDecimal allocationSecuriteSociale, BigDecimal allocationEpargne,
                                        UUID proposeePar) {
        this.adherentId = adherentId;
        this.packId = packId;
        this.montantReference = montantReference;
        this.allocationSecuriteSociale = allocationSecuriteSociale;
        this.allocationEpargne = allocationEpargne;
        this.proposeePar = proposeePar;
        this.proposeeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public UUID getPackId() {
        return packId;
    }

    public BigDecimal getMontantReference() {
        return montantReference;
    }

    public BigDecimal getAllocationSecuriteSociale() {
        return allocationSecuriteSociale;
    }

    public BigDecimal getAllocationEpargne() {
        return allocationEpargne;
    }

    public Statut getStatut() {
        return statut;
    }

    public UUID getProposeePar() {
        return proposeePar;
    }

    public Instant getProposeeLe() {
        return proposeeLe;
    }

    public UUID getDecideePar() {
        return decideePar;
    }

    public Instant getDecideeLe() {
        return decideeLe;
    }

    public String getMotifDecision() {
        return motifDecision;
    }

    public void valider(UUID decideePar, String motif) {
        this.statut = Statut.VALIDEE;
        this.decideePar = decideePar;
        this.decideeLe = Instant.now();
        this.motifDecision = motif;
    }

    public void rejeter(UUID decideePar, String motif) {
        this.statut = Statut.REJETEE;
        this.decideePar = decideePar;
        this.decideeLe = Instant.now();
        this.motifDecision = motif;
    }
}
