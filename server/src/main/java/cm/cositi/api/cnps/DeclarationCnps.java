package cm.cositi.api.cnps;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "declaration_cnps", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"dossier_id", "periode_mois"})
})
public class DeclarationCnps {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dossier_id", nullable = false)
    private DossierCnps dossier;

    @Column(name = "periode_mois", nullable = false)
    private LocalDate periodeMois; // 1er jour du mois

    @Column(name = "montant_declare", precision = 14, scale = 2, nullable = false)
    private BigDecimal montantDeclare;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "A_PRODUIRE"; // A_PRODUIRE, TRANSMISE, ACCUSEE, REJETEE

    @Column(name = "date_transmission")
    private LocalDate dateTransmission;

    @Column(name = "accuse_document_id")
    private UUID accuseDocumentId;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "cree_par", length = 80)
    private String creePar;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public DossierCnps getDossier() { return dossier; }
    public void setDossier(DossierCnps dossier) { this.dossier = dossier; }
    public LocalDate getPeriodeMois() { return periodeMois; }
    public void setPeriodeMois(LocalDate periodeMois) { this.periodeMois = periodeMois; }
    public BigDecimal getMontantDeclare() { return montantDeclare; }
    public void setMontantDeclare(BigDecimal montantDeclare) { this.montantDeclare = montantDeclare; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public LocalDate getDateTransmission() { return dateTransmission; }
    public void setDateTransmission(LocalDate dateTransmission) { this.dateTransmission = dateTransmission; }
    public UUID getAccuseDocumentId() { return accuseDocumentId; }
    public void setAccuseDocumentId(UUID accuseDocumentId) { this.accuseDocumentId = accuseDocumentId; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
    public String getCreePar() { return creePar; }
    public void setCreePar(String creePar) { this.creePar = creePar; }
}
