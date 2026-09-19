package cm.cositi.api.cnps;

import cm.cositi.api.commun.entite.EntiteAuditable;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "dossier_cnps")
public class DossierCnps extends EntiteAuditable {

    @Column(name = "adherent_id", unique = true, nullable = false)
    private UUID adherentId;

    @Column(name = "numero_immatriculation", unique = true, length = 30)
    private String numeroImmatriculation;

    @Column(name = "date_immatriculation")
    private LocalDate dateImmatriculation;

    @Column(name = "revenu_mensuel_declare", precision = 14, scale = 2)
    private BigDecimal revenuMensuelDeclare; // [V - assiette de calcul en attente d'arbitrage]

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "BROUILLON"; // BROUILLON, INCOMPLET, PRET, TRANSMIS, TRAITE, REJETE

    @Column(name = "motif_rejet", columnDefinition = "TEXT")
    private String motifRejet;

    @OneToMany(mappedBy = "dossier", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PieceDossierCnps> pieces = new ArrayList<>();

    public UUID getAdherentId() { return adherentId; }
    public void setAdherentId(UUID adherentId) { this.adherentId = adherentId; }
    public String getNumeroImmatriculation() { return numeroImmatriculation; }
    public void setNumeroImmatriculation(String numeroImmatriculation) { this.numeroImmatriculation = numeroImmatriculation; }
    public LocalDate getDateImmatriculation() { return dateImmatriculation; }
    public void setDateImmatriculation(LocalDate dateImmatriculation) { this.dateImmatriculation = dateImmatriculation; }
    public BigDecimal getRevenuMensuelDeclare() { return revenuMensuelDeclare; }
    public void setRevenuMensuelDeclare(BigDecimal revenuMensuelDeclare) { this.revenuMensuelDeclare = revenuMensuelDeclare; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public String getMotifRejet() { return motifRejet; }
    public void setMotifRejet(String motifRejet) { this.motifRejet = motifRejet; }
    public List<PieceDossierCnps> getPieces() { return pieces; }
    public void setPieces(List<PieceDossierCnps> pieces) { this.pieces = pieces; }
}
