package cm.cositi.api.cnps.entite;

import cm.cositi.api.commun.entite.EntiteAuditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Dossier de demande de prestation CNPS (allocation familiale, pension, accident du travail…) — V16,
 * distinct de {@link DossierCnps} (immatriculation, un seul par adhérent). Un adhérent peut avoir plusieurs
 * dossiers de prestation dans le temps, chacun rattaché à une {@link OffreCnps} (donc à une rubrique
 * PF/RP/PVID).
 */
@Entity
@Table(name = "dossier_prestation_cnps")
public class DossierPrestationCnps extends EntiteAuditable {

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "offre_id", nullable = false, updatable = false)
    private UUID offreId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutDossierPrestationCnps statut = StatutDossierPrestationCnps.INCOMPLET;

    @Column(name = "nombre_personnes_a_charge")
    private Integer nombrePersonnesACharge;

    @Column(name = "date_depot")
    private LocalDate dateDepot;

    @Column(name = "date_transmission_cnps")
    private LocalDate dateTransmissionCnps;

    @Column(name = "prochaine_relance_le")
    private LocalDate prochaineRelanceLe;

    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;

    @Column(name = "motif_rejet", columnDefinition = "TEXT")
    private String motifRejet;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected DossierPrestationCnps() {
    }

    public DossierPrestationCnps(UUID adherentId, UUID offreId) {
        this.adherentId = adherentId;
        this.offreId = offreId;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public UUID getOffreId() {
        return offreId;
    }

    public StatutDossierPrestationCnps getStatut() {
        return statut;
    }

    public void setStatut(StatutDossierPrestationCnps statut) {
        this.statut = statut;
    }

    public Integer getNombrePersonnesACharge() {
        return nombrePersonnesACharge;
    }

    public void setNombrePersonnesACharge(Integer nombrePersonnesACharge) {
        this.nombrePersonnesACharge = nombrePersonnesACharge;
    }

    public LocalDate getDateDepot() {
        return dateDepot;
    }

    public void setDateDepot(LocalDate dateDepot) {
        this.dateDepot = dateDepot;
    }

    public LocalDate getDateTransmissionCnps() {
        return dateTransmissionCnps;
    }

    public void setDateTransmissionCnps(LocalDate dateTransmissionCnps) {
        this.dateTransmissionCnps = dateTransmissionCnps;
    }

    public LocalDate getProchaineRelanceLe() {
        return prochaineRelanceLe;
    }

    public void setProchaineRelanceLe(LocalDate prochaineRelanceLe) {
        this.prochaineRelanceLe = prochaineRelanceLe;
    }

    public String getObservations() {
        return observations;
    }

    public void setObservations(String observations) {
        this.observations = observations;
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
