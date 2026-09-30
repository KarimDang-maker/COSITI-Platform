package cm.cositi.api.cnps.entite;

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
 * Déclaration mensuelle CNPS. Table {@code declaration_cnps} (V4), contrainte
 * {@code uq_declaration_mois (dossier_id, periode_mois)} : une seule déclaration par dossier et par mois.
 *
 * <p>{@code periodeMois} est toujours le <b>premier jour du mois civil</b> (commentaire de la colonne).
 * Aucune intégration technique avec la CNPS en V1 : la transmission trace une action humaine.</p>
 */
@Entity
@Table(name = "declaration_cnps")
public class DeclarationCnps {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "dossier_id", nullable = false, updatable = false)
    private UUID dossierId;

    @Column(name = "periode_mois", nullable = false, updatable = false)
    private LocalDate periodeMois;

    @Column(name = "montant_declare", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantDeclare;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutDeclarationCnps statut = StatutDeclarationCnps.A_PRODUIRE;

    @Column(name = "date_transmission")
    private LocalDate dateTransmission;

    @Column(name = "accuse_document_id")
    private UUID accuseDocumentId;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "cree_par", updatable = false, length = 80)
    private String creePar;

    protected DeclarationCnps() {
    }

    public DeclarationCnps(UUID dossierId, LocalDate premierJourDuMois, BigDecimal montantDeclare, String creePar) {
        this.dossierId = dossierId;
        this.periodeMois = premierJourDuMois;
        this.montantDeclare = montantDeclare;
        this.creePar = creePar;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getDossierId() {
        return dossierId;
    }

    public LocalDate getPeriodeMois() {
        return periodeMois;
    }

    public BigDecimal getMontantDeclare() {
        return montantDeclare;
    }

    public void setMontantDeclare(BigDecimal montantDeclare) {
        this.montantDeclare = montantDeclare;
    }

    public StatutDeclarationCnps getStatut() {
        return statut;
    }

    public void setStatut(StatutDeclarationCnps statut) {
        this.statut = statut;
    }

    public LocalDate getDateTransmission() {
        return dateTransmission;
    }

    public UUID getAccuseDocumentId() {
        return accuseDocumentId;
    }

    public Instant getCreeLe() {
        return creeLe;
    }

    public String getCreePar() {
        return creePar;
    }

    public void marquerTransmise(UUID accuseDocumentId, LocalDate dateTransmission) {
        this.accuseDocumentId = accuseDocumentId;
        this.dateTransmission = dateTransmission;
        this.statut = StatutDeclarationCnps.TRANSMISE;
    }
}
