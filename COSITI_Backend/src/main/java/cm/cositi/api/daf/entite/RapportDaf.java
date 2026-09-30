package cm.cositi.api.daf.entite;

import cm.cositi.api.commun.entite.EntiteAuditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Rapport financier produit par le DAF et mis à disposition du PCA
 * (table {@code rapport_daf}, V12 — contrat {@code [A]} à faire valider).
 *
 * <p><b>Instantané figé</b> : les montants sont recopiés au moment de la production et ne sont jamais
 * recalculés à la lecture. Un rapport transmis doit dire la même chose dans six mois — le recalculer le
 * rendrait incohérent avec la décision qu'il a servi à prendre.</p>
 */
@Entity
@Table(name = "rapport_daf")
public class RapportDaf extends EntiteAuditable {

    @Column(name = "titre", nullable = false, length = 200)
    private String titre;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutRapportDaf statut = StatutRapportDaf.BROUILLON;

    @Column(name = "periode_debut", nullable = false)
    private LocalDate periodeDebut;

    @Column(name = "periode_fin", nullable = false)
    private LocalDate periodeFin;

    @Column(name = "montant_valide", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantValide = BigDecimal.ZERO;

    @Column(name = "montant_a_controler", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantAControler = BigDecimal.ZERO;

    @Column(name = "nb_paiements_valides", nullable = false)
    private int nbPaiementsValides;

    @Column(name = "nb_incoherences", nullable = false)
    private int nbIncoherences;

    /** Indicateurs détaillés. JSONB porté en {@code String}, convention du dépôt ({@code JournalAudit}). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contenu", nullable = false, columnDefinition = "jsonb")
    private String contenu = "{}";

    @Column(name = "commentaire", columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "produit_le")
    private Instant produitLe;

    @Column(name = "produit_par", length = 80)
    private String produitPar;

    @Column(name = "transmis_le")
    private Instant transmisLe;

    @Column(name = "transmis_par", length = 80)
    private String transmisPar;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected RapportDaf() {
    }

    public RapportDaf(String titre, LocalDate periodeDebut, LocalDate periodeFin) {
        this.titre = titre;
        this.periodeDebut = periodeDebut;
        this.periodeFin = periodeFin;
    }

    public String getTitre() {
        return titre;
    }

    public StatutRapportDaf getStatut() {
        return statut;
    }

    public LocalDate getPeriodeDebut() {
        return periodeDebut;
    }

    public LocalDate getPeriodeFin() {
        return periodeFin;
    }

    public BigDecimal getMontantValide() {
        return montantValide;
    }

    public BigDecimal getMontantAControler() {
        return montantAControler;
    }

    public int getNbPaiementsValides() {
        return nbPaiementsValides;
    }

    public int getNbIncoherences() {
        return nbIncoherences;
    }

    public String getContenu() {
        return contenu;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public Instant getProduitLe() {
        return produitLe;
    }

    public String getProduitPar() {
        return produitPar;
    }

    public Instant getTransmisLe() {
        return transmisLe;
    }

    public String getTransmisPar() {
        return transmisPar;
    }

    public Long getVersion() {
        return version;
    }

    /** Fige les chiffres constatés et passe le rapport en {@code PRODUIT}. */
    public void produire(BigDecimal montantValide, BigDecimal montantAControler, int nbPaiementsValides,
                          int nbIncoherences, String contenuJson, String auteur) {
        this.montantValide = montantValide == null ? BigDecimal.ZERO : montantValide;
        this.montantAControler = montantAControler == null ? BigDecimal.ZERO : montantAControler;
        this.nbPaiementsValides = nbPaiementsValides;
        this.nbIncoherences = nbIncoherences;
        this.contenu = contenuJson == null ? "{}" : contenuJson;
        this.produitLe = Instant.now();
        this.produitPar = auteur;
        this.statut = StatutRapportDaf.PRODUIT;
    }

    public void transmettre(String auteur) {
        this.transmisLe = Instant.now();
        this.transmisPar = auteur;
        this.statut = StatutRapportDaf.TRANSMIS;
    }
}
