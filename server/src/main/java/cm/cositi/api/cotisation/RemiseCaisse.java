package cm.cositi.api.cotisation;

import cm.cositi.api.organisation.Agent;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "remise_caisse")
public class RemiseCaisse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private Agent agent;

    @Column(name = "date_remise", nullable = false)
    private LocalDate dateRemise;

    @Column(name = "montant_declare", precision = 14, scale = 2, nullable = false)
    private BigDecimal montantDeclare;

    @Column(name = "montant_recu", precision = 14, scale = 2)
    private BigDecimal montantRecu;

    @Column(name = "ecart", precision = 14, scale = 2, insertable = false, updatable = false)
    private BigDecimal ecart;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "DECLAREE"; // DECLAREE, RECUE, EN_ECART, CLOTUREE

    @Column(name = "recu_par")
    private UUID recuPar;

    @Column(name = "recu_le")
    private Instant recuLe;

    @Column(name = "commentaire", columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "cree_par", length = 80)
    private String creePar;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Agent getAgent() { return agent; }
    public void setAgent(Agent agent) { this.agent = agent; }
    public LocalDate getDateRemise() { return dateRemise; }
    public void setDateRemise(LocalDate dateRemise) { this.dateRemise = dateRemise; }
    public BigDecimal getMontantDeclare() { return montantDeclare; }
    public void setMontantDeclare(BigDecimal montantDeclare) { this.montantDeclare = montantDeclare; }
    public BigDecimal getMontantRecu() { return montantRecu; }
    public void setMontantRecu(BigDecimal montantRecu) { this.montantRecu = montantRecu; }
    public BigDecimal getEcart() { return ecart; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public UUID getRecuPar() { return recuPar; }
    public void setRecuPar(UUID recuPar) { this.recuPar = recuPar; }
    public Instant getRecuLe() { return recuLe; }
    public void setRecuLe(Instant recuLe) { this.recuLe = recuLe; }
    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String commentaire) { this.commentaire = commentaire; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
    public String getCreePar() { return creePar; }
    public void setCreePar(String creePar) { this.creePar = creePar; }
}
