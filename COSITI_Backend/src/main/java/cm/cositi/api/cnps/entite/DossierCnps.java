package cm.cositi.api.cnps.entite;

import cm.cositi.api.commun.entite.EntiteAuditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Dossier d'immatriculation CNPS d'un adhérent — un seul par adhérent ({@code adherent_id UNIQUE}, V4).
 *
 * <p>{@code revenuMensuelDeclare} porte la mention « [V - assiette de calcul en attente] » dans la migration
 * V4 : le champ est facultatif et n'est jamais déduit d'un calcul maison. Une déclaration préparée sans ce
 * revenu aboutit mais porte un avertissement explicite (docs/02_CLASSES_ET_METHODES.md §6).</p>
 */
@Entity
@Table(name = "dossier_cnps")
public class DossierCnps extends EntiteAuditable {

    @Column(name = "adherent_id", nullable = false, updatable = false, unique = true)
    private UUID adherentId;

    @Column(name = "numero_immatriculation", unique = true, length = 30)
    private String numeroImmatriculation;

    @Column(name = "date_immatriculation")
    private LocalDate dateImmatriculation;

    @Column(name = "revenu_mensuel_declare", precision = 14, scale = 2)
    private BigDecimal revenuMensuelDeclare;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutDossierCnps statut = StatutDossierCnps.BROUILLON;

    @Column(name = "motif_rejet", columnDefinition = "TEXT")
    private String motifRejet;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected DossierCnps() {
    }

    public DossierCnps(UUID adherentId) {
        this.adherentId = adherentId;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public String getNumeroImmatriculation() {
        return numeroImmatriculation;
    }

    public void setNumeroImmatriculation(String numeroImmatriculation) {
        this.numeroImmatriculation = numeroImmatriculation;
    }

    public LocalDate getDateImmatriculation() {
        return dateImmatriculation;
    }

    public void setDateImmatriculation(LocalDate dateImmatriculation) {
        this.dateImmatriculation = dateImmatriculation;
    }

    public BigDecimal getRevenuMensuelDeclare() {
        return revenuMensuelDeclare;
    }

    public void setRevenuMensuelDeclare(BigDecimal revenuMensuelDeclare) {
        this.revenuMensuelDeclare = revenuMensuelDeclare;
    }

    public StatutDossierCnps getStatut() {
        return statut;
    }

    public void setStatut(StatutDossierCnps statut) {
        this.statut = statut;
    }

    public String getMotifRejet() {
        return motifRejet;
    }

    public void setMotifRejet(String motifRejet) {
        this.motifRejet = motifRejet;
    }

    public Long getVersion() {
        return version;
    }
}
