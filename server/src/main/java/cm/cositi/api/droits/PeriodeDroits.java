package cm.cositi.api.droits;

import cm.cositi.api.adherent.Pack;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "periode_droits")
public class PeriodeDroits {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "adherent_id", nullable = false)
    private UUID adherentId;

    @Column(name = "date_debut", nullable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin", nullable = false)
    private LocalDate dateFin;

    @Column(name = "jours_couverts", nullable = false)
    private int joursCouverts;

    @Column(name = "montant_impute", precision = 14, scale = 2, nullable = false)
    private BigDecimal montantImpute;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pack_id", nullable = false)
    private Pack pack;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "COUVERTE"; // COUVERTE, PARTIELLE, ANNULEE

    @Column(name = "source_affectation_id")
    private UUID sourceAffectationId;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "cree_par", length = 80)
    private String creePar;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getAdherentId() { return adherentId; }
    public void setAdherentId(UUID adherentId) { this.adherentId = adherentId; }
    public LocalDate getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDate dateDebut) { this.dateDebut = dateDebut; }
    public LocalDate getDateFin() { return dateFin; }
    public void setDateFin(LocalDate dateFin) { this.dateFin = dateFin; }
    public int getJoursCouverts() { return joursCouverts; }
    public void setJoursCouverts(int joursCouverts) { this.joursCouverts = joursCouverts; }
    public BigDecimal getMontantImpute() { return montantImpute; }
    public void setMontantImpute(BigDecimal montantImpute) { this.montantImpute = montantImpute; }
    public Pack getPack() { return pack; }
    public void setPack(Pack pack) { this.pack = pack; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public UUID getSourceAffectationId() { return sourceAffectationId; }
    public void setSourceAffectationId(UUID sourceAffectationId) { this.sourceAffectationId = sourceAffectationId; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
    public String getCreePar() { return creePar; }
    public void setCreePar(String creePar) { this.creePar = creePar; }
}
