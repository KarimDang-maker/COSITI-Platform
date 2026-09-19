package cm.cositi.api.cotisation;

import cm.cositi.api.commun.entite.EntiteAuditable;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "paiement")
public class Paiement extends EntiteAuditable {

    @Column(name = "adherent_id", nullable = false)
    private UUID adherentId;

    @Column(name = "numero_recu", unique = true, nullable = false, length = 30)
    private String numeroRecu;

    @Column(name = "date_paiement", nullable = false)
    private LocalDate datePaiement;

    @Column(name = "montant", precision = 14, scale = 2, nullable = false)
    private BigDecimal montant;

    @Column(name = "mode_paiement", nullable = false, length = 20)
    private String modePaiement; // ESPECES, ORANGE_MONEY, MTN_MOMO, VIREMENT

    @Column(name = "reference_transaction", length = 60)
    private String referenceTransaction;

    @Column(name = "type_paiement", nullable = false, length = 20)
    private String typePaiement = "COTISATION"; // INSCRIPTION, COTISATION

    @Column(name = "agent_encaisseur_id")
    private UUID agentEncaisseurId;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "A_CONTROLER"; // BROUILLON, A_CONTROLER, VALIDE, RAPPROCHE, ANNULE, INCOHERENCE

    @Column(name = "confirme_par_chef_id")
    private UUID confirmeParChefId;

    @Column(name = "confirme_le")
    private Instant confirmeLe;

    @Column(name = "valide_par")
    private UUID validePar;

    @Column(name = "valide_le")
    private Instant valideLe;

    @Column(name = "motif_annulation", columnDefinition = "TEXT")
    private String motifAnnulation;

    @Column(name = "motif_incoherence", columnDefinition = "TEXT")
    private String motifIncoherence;

    @Column(name = "remise_caisse_id")
    private UUID remiseCaisseId;

    @Column(name = "cle_idempotence", unique = true, length = 80)
    private String cleIdempotence;

    public UUID getAdherentId() { return adherentId; }
    public void setAdherentId(UUID adherentId) { this.adherentId = adherentId; }
    public String getNumeroRecu() { return numeroRecu; }
    public void setNumeroRecu(String numeroRecu) { this.numeroRecu = numeroRecu; }
    public LocalDate getDatePaiement() { return datePaiement; }
    public void setDatePaiement(LocalDate datePaiement) { this.datePaiement = datePaiement; }
    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }
    public String getModePaiement() { return modePaiement; }
    public void setModePaiement(String modePaiement) { this.modePaiement = modePaiement; }
    public String getReferenceTransaction() { return referenceTransaction; }
    public void setReferenceTransaction(String referenceTransaction) { this.referenceTransaction = referenceTransaction; }
    public String getTypePaiement() { return typePaiement; }
    public void setTypePaiement(String typePaiement) { this.typePaiement = typePaiement; }
    public UUID getAgentEncaisseurId() { return agentEncaisseurId; }
    public void setAgentEncaisseurId(UUID agentEncaisseurId) { this.agentEncaisseurId = agentEncaisseurId; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public UUID getConfirmeParChefId() { return confirmeParChefId; }
    public void setConfirmeParChefId(UUID confirmeParChefId) { this.confirmeParChefId = confirmeParChefId; }
    public Instant getConfirmeLe() { return confirmeLe; }
    public void setConfirmeLe(Instant confirmeLe) { this.confirmeLe = confirmeLe; }
    public UUID getValidePar() { return validePar; }
    public void setValidePar(UUID validePar) { this.validePar = validePar; }
    public Instant getValideLe() { return valideLe; }
    public void setValideLe(Instant valideLe) { this.valideLe = valideLe; }
    public String getMotifAnnulation() { return motifAnnulation; }
    public void setMotifAnnulation(String motifAnnulation) { this.motifAnnulation = motifAnnulation; }
    public String getMotifIncoherence() { return motifIncoherence; }
    public void setMotifIncoherence(String motifIncoherence) { this.motifIncoherence = motifIncoherence; }
    public UUID getRemiseCaisseId() { return remiseCaisseId; }
    public void setRemiseCaisseId(UUID remiseCaisseId) { this.remiseCaisseId = remiseCaisseId; }
    public String getCleIdempotence() { return cleIdempotence; }
    public void setCleIdempotence(String cleIdempotence) { this.cleIdempotence = cleIdempotence; }
}
