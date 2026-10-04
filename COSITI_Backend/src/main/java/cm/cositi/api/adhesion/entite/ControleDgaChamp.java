package cm.cositi.api.adhesion.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

/**
 * Une information contrôlée (§4.3) : valeur enregistrée dans COSITI (figée à la soumission) face à la valeur lue sur
 * le document physique, avec la décision et le commentaire de la DGA.
 */
@Entity
@Table(name = "controle_dga_champ")
public class ControleDgaChamp {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "controle_id", nullable = false, updatable = false)
    private UUID controleId;

    @Column(name = "controle_document_id", nullable = false, updatable = false)
    private UUID controleDocumentId;

    @Column(name = "champ", nullable = false, updatable = false, length = 60)
    private String champ;

    @Column(name = "libelle", nullable = false, updatable = false, length = 120)
    private String libelle;

    @Column(name = "valeur_numerique", updatable = false, columnDefinition = "TEXT")
    private String valeurNumerique;

    @Column(name = "valeur_physique", columnDefinition = "TEXT")
    private String valeurPhysique;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_correspondance", length = 20)
    private StatutCorrespondance statutCorrespondance;

    @Column(name = "commentaire", columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "verifie_par")
    private UUID verifiePar;

    @Column(name = "verifie_le")
    private Instant verifieLe;

    /** Exigence de la matrice documentaire contrôlée (V21). */
    @Column(name = "exigence_id", updatable = false)
    private UUID exigenceId;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected ControleDgaChamp() {
    }

    public ControleDgaChamp(UUID controleId, UUID controleDocumentId, String champ, String libelle,
                            String valeurNumerique) {
        this.controleId = controleId;
        this.controleDocumentId = controleDocumentId;
        this.champ = champ;
        this.libelle = libelle;
        this.valeurNumerique = valeurNumerique;
    }

    public void verifier(StatutCorrespondance statut, String valeurPhysique, String commentaire, UUID dgaId) {
        this.statutCorrespondance = statut;
        this.valeurPhysique = valeurPhysique;
        this.commentaire = commentaire;
        this.verifiePar = dgaId;
        this.verifieLe = Instant.now();
    }

    public void rattacherExigence(UUID exigenceId) {
        this.exigenceId = exigenceId;
    }

    public UUID getExigenceId() {
        return exigenceId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getControleId() {
        return controleId;
    }

    public UUID getControleDocumentId() {
        return controleDocumentId;
    }

    public String getChamp() {
        return champ;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getValeurNumerique() {
        return valeurNumerique;
    }

    public String getValeurPhysique() {
        return valeurPhysique;
    }

    public StatutCorrespondance getStatutCorrespondance() {
        return statutCorrespondance;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public UUID getVerifiePar() {
        return verifiePar;
    }

    public Instant getVerifieLe() {
        return verifieLe;
    }

    public Long getVersion() {
        return version;
    }
}
