package cm.cositi.api.cotisation.entite;

import cm.cositi.api.commun.entite.EntiteAuditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Bilan journalier de caisse (#29 à #33, V18). Un seul bilan par date. {@code ecart} est une colonne ordinaire
 * calculée ici ({@code physique - numérique}) et contrôlée par {@code chk_bilan_ecart_coherent} — pas une colonne
 * générée, pour éviter la relecture différée rencontrée sur {@code remise_caisse.ecart}.
 */
@Entity
@Table(name = "bilan_caisse_journalier")
public class BilanCaisseJournalier extends EntiteAuditable {

    @Column(name = "date_bilan", nullable = false, unique = true, updatable = false)
    private LocalDate dateBilan;

    @Column(name = "montant_numerique", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantNumerique;

    @Column(name = "montant_physique", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantPhysique;

    @Column(name = "ecart", nullable = false, precision = 14, scale = 2)
    private BigDecimal ecart;

    @Column(name = "nombre_paiements", nullable = false)
    private int nombrePaiements;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutBilanCaisse statut = StatutBilanCaisse.SAISI;

    @Column(name = "commentaire", columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "saisi_par")
    private UUID saisiPar;

    @Column(name = "valide_par")
    private UUID validePar;

    @Column(name = "valide_le")
    private Instant valideLe;

    @Column(name = "commentaire_validation", columnDefinition = "TEXT")
    private String commentaireValidation;

    @Column(name = "motif_anomalie", columnDefinition = "TEXT")
    private String motifAnomalie;

    @Column(name = "signale_par")
    private UUID signalePar;

    @Column(name = "signale_le")
    private Instant signaleLe;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected BilanCaisseJournalier() {
    }

    public BilanCaisseJournalier(LocalDate dateBilan, BigDecimal montantNumerique, int nombrePaiements,
                                 BigDecimal montantPhysique, String commentaire, UUID saisiPar) {
        this.dateBilan = dateBilan;
        saisir(montantNumerique, nombrePaiements, montantPhysique, commentaire, saisiPar);
    }

    /** Première saisie, ou nouvelle saisie après une anomalie : repart en {@code SAISI}. */
    public void saisir(BigDecimal montantNumerique, int nombrePaiements, BigDecimal montantPhysique,
                       String commentaire, UUID saisiPar) {
        // Arrondi à l'échelle de la colonne avant soustraction : sinon PostgreSQL arrondirait chaque montant
        // séparément et chk_bilan_ecart_coherent pourrait refuser un écart calculé sur les valeurs brutes.
        this.montantNumerique = montantNumerique.setScale(2, RoundingMode.HALF_UP);
        this.nombrePaiements = nombrePaiements;
        this.montantPhysique = montantPhysique.setScale(2, RoundingMode.HALF_UP);
        this.ecart = this.montantPhysique.subtract(this.montantNumerique);
        this.commentaire = commentaire;
        this.saisiPar = saisiPar;
        this.statut = StatutBilanCaisse.SAISI;
    }

    public void valider(UUID validateurId, String commentaire) {
        this.statut = StatutBilanCaisse.VALIDE;
        this.validePar = validateurId;
        this.valideLe = Instant.now();
        this.commentaireValidation = commentaire;
    }

    public void signalerAnomalie(UUID auteurId, String motif) {
        this.statut = StatutBilanCaisse.ANOMALIE;
        this.motifAnomalie = motif;
        this.signalePar = auteurId;
        this.signaleLe = Instant.now();
    }

    public LocalDate getDateBilan() {
        return dateBilan;
    }

    public BigDecimal getMontantNumerique() {
        return montantNumerique;
    }

    public BigDecimal getMontantPhysique() {
        return montantPhysique;
    }

    public BigDecimal getEcart() {
        return ecart;
    }

    public int getNombrePaiements() {
        return nombrePaiements;
    }

    public StatutBilanCaisse getStatut() {
        return statut;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public UUID getSaisiPar() {
        return saisiPar;
    }

    public UUID getValidePar() {
        return validePar;
    }

    public Instant getValideLe() {
        return valideLe;
    }

    public String getCommentaireValidation() {
        return commentaireValidation;
    }

    public String getMotifAnomalie() {
        return motifAnomalie;
    }

    public UUID getSignalePar() {
        return signalePar;
    }

    public Instant getSignaleLe() {
        return signaleLe;
    }

    public Long getVersion() {
        return version;
    }
}
