package cm.cositi.api.cnps.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Trace de chaque changement de statut d'un dossier de prestation — V16, même principe que
 * {@link HistoriqueDossierCnps} : consultable par le Gestionnaire comme « journal d'activité du dossier »
 * dans l'application, distinct de {@code journal_audit} qui reste réservé à {@code AUDIT:CONSULTER}
 * (PCA/Super Administrateur seuls, correctif RAPORT_V1).
 */
@Entity
@Table(name = "historique_dossier_prestation_cnps")
public class HistoriqueDossierPrestationCnps {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "dossier_id", nullable = false, updatable = false)
    private UUID dossierId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_avant", length = 20, updatable = false)
    private StatutDossierPrestationCnps statutAvant;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_apres", nullable = false, length = 20, updatable = false)
    private StatutDossierPrestationCnps statutApres;

    @Column(name = "auteur_id", updatable = false)
    private UUID auteurId;

    @Column(name = "horodatage", updatable = false)
    private Instant horodatage;

    @Column(name = "commentaire", columnDefinition = "TEXT", updatable = false)
    private String commentaire;

    protected HistoriqueDossierPrestationCnps() {
    }

    public HistoriqueDossierPrestationCnps(UUID dossierId, StatutDossierPrestationCnps statutAvant,
                                            StatutDossierPrestationCnps statutApres, UUID auteurId,
                                            String commentaire) {
        this.dossierId = dossierId;
        this.statutAvant = statutAvant;
        this.statutApres = statutApres;
        this.auteurId = auteurId;
        this.commentaire = commentaire;
        this.horodatage = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getDossierId() {
        return dossierId;
    }

    public StatutDossierPrestationCnps getStatutAvant() {
        return statutAvant;
    }

    public StatutDossierPrestationCnps getStatutApres() {
        return statutApres;
    }

    public UUID getAuteurId() {
        return auteurId;
    }

    public Instant getHorodatage() {
        return horodatage;
    }

    public String getCommentaire() {
        return commentaire;
    }
}
