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
 * Trace de chaque changement de statut d'un dossier CNPS. Table {@code historique_dossier_cnps} (V4).
 *
 * <p>Complète le journal d'audit sans le remplacer : cet historique est consultable dans l'application par
 * le Gestionnaire des comptes, alors que {@code journal_audit} reste réservé aux habilitations d'audit
 * ({@code AUDIT:CONSULTER}).</p>
 */
@Entity
@Table(name = "historique_dossier_cnps")
public class HistoriqueDossierCnps {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "dossier_id", nullable = false, updatable = false)
    private UUID dossierId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_avant", length = 20, updatable = false)
    private StatutDossierCnps statutAvant;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_apres", nullable = false, length = 20, updatable = false)
    private StatutDossierCnps statutApres;

    @Column(name = "auteur_id", updatable = false)
    private UUID auteurId;

    @Column(name = "horodatage", updatable = false)
    private Instant horodatage;

    @Column(name = "commentaire", columnDefinition = "TEXT", updatable = false)
    private String commentaire;

    protected HistoriqueDossierCnps() {
    }

    public HistoriqueDossierCnps(UUID dossierId, StatutDossierCnps statutAvant, StatutDossierCnps statutApres,
                                  UUID auteurId, String commentaire) {
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

    public StatutDossierCnps getStatutAvant() {
        return statutAvant;
    }

    public StatutDossierCnps getStatutApres() {
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
