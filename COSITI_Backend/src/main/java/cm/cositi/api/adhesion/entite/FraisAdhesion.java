package cm.cositi.api.adhesion.entite;

import cm.cositi.api.commun.entite.EntiteAuditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Frais d'adhésion initial (V20) : rattaché à un adhérent (unicité {@code (adherent_id, type_frais)}) et à l'agent
 * qui l'a collecté. {@code montantAttendu} est figé depuis {@code MONTANT_INSCRIPTION} à l'enregistrement ;
 * {@code montantRecu} est ce qui a été effectivement remis — l'écart est constaté, jamais corrigé automatiquement.
 */
@Entity
@Table(name = "frais_adhesion")
public class FraisAdhesion extends EntiteAuditable {

    public static final String TYPE_ADHESION = "ADHESION";

    @Column(name = "reference", nullable = false, unique = true, updatable = false, length = 20)
    private String reference;

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "agent_id", nullable = false, updatable = false)
    private UUID agentId;

    @Column(name = "type_frais", nullable = false, updatable = false, length = 20)
    private String typeFrais = TYPE_ADHESION;

    @Column(name = "montant_attendu", nullable = false, updatable = false, precision = 14, scale = 2)
    private BigDecimal montantAttendu;

    @Column(name = "montant_recu", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantRecu;

    @Column(name = "devise", nullable = false, length = 3)
    private String devise = "XAF";

    @Column(name = "date_collecte", nullable = false)
    private LocalDate dateCollecte;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutFraisAdhesion statut = StatutFraisAdhesion.ENREGISTRE;

    @Column(name = "enregistre_par", nullable = false, updatable = false)
    private UUID enregistrePar;

    @Column(name = "enregistre_le", nullable = false, updatable = false)
    private Instant enregistreLe;

    @Column(name = "valide_par")
    private UUID validePar;

    @Column(name = "valide_le")
    private Instant valideLe;

    @Column(name = "motif_anomalie", columnDefinition = "TEXT")
    private String motifAnomalie;

    @Column(name = "anomalie_signalee_par")
    private UUID anomalieSignaleePar;

    @Column(name = "anomalie_signalee_le")
    private Instant anomalieSignaleeLe;

    @Column(name = "resolution_anomalie", columnDefinition = "TEXT")
    private String resolutionAnomalie;

    @Column(name = "anomalie_resolue_par")
    private UUID anomalieResoluePar;

    @Column(name = "anomalie_resolue_le")
    private Instant anomalieResolueLe;

    @Column(name = "cle_idempotence", unique = true, updatable = false, length = 80)
    private String cleIdempotence;

    @Column(name = "commentaire", columnDefinition = "TEXT")
    private String commentaire;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected FraisAdhesion() {
    }

    public FraisAdhesion(String reference, UUID adherentId, UUID agentId, BigDecimal montantAttendu,
                         BigDecimal montantRecu, LocalDate dateCollecte, UUID enregistrePar, String cleIdempotence,
                         String commentaire) {
        this.reference = reference;
        this.adherentId = adherentId;
        this.agentId = agentId;
        this.montantAttendu = montantAttendu;
        this.montantRecu = montantRecu;
        this.dateCollecte = dateCollecte;
        this.enregistrePar = enregistrePar;
        this.enregistreLe = Instant.now();
        this.cleIdempotence = cleIdempotence;
        this.commentaire = commentaire;
    }

    public void valider(UUID validateurId) {
        this.statut = StatutFraisAdhesion.VALIDE;
        this.validePar = validateurId;
        this.valideLe = Instant.now();
    }

    public void signalerAnomalie(UUID auteurId, String motif) {
        this.statut = StatutFraisAdhesion.ANOMALIE;
        this.motifAnomalie = motif;
        this.anomalieSignaleePar = auteurId;
        this.anomalieSignaleeLe = Instant.now();
    }

    /** Résolution motivée : le frais revient à l'état ENREGISTRE, en attente de validation de l'encaissement. */
    public void resoudreAnomalie(UUID auteurId, String resolution, BigDecimal montantRecuCorrige) {
        if (montantRecuCorrige != null) {
            this.montantRecu = montantRecuCorrige;
        }
        this.statut = StatutFraisAdhesion.ENREGISTRE;
        this.resolutionAnomalie = resolution;
        this.anomalieResoluePar = auteurId;
        this.anomalieResolueLe = Instant.now();
    }

    public BigDecimal getEcart() {
        return montantRecu.subtract(montantAttendu);
    }

    public String getReference() {
        return reference;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public String getTypeFrais() {
        return typeFrais;
    }

    public BigDecimal getMontantAttendu() {
        return montantAttendu;
    }

    public BigDecimal getMontantRecu() {
        return montantRecu;
    }

    public String getDevise() {
        return devise;
    }

    public LocalDate getDateCollecte() {
        return dateCollecte;
    }

    public StatutFraisAdhesion getStatut() {
        return statut;
    }

    public UUID getEnregistrePar() {
        return enregistrePar;
    }

    public Instant getEnregistreLe() {
        return enregistreLe;
    }

    public UUID getValidePar() {
        return validePar;
    }

    public Instant getValideLe() {
        return valideLe;
    }

    public String getMotifAnomalie() {
        return motifAnomalie;
    }

    public UUID getAnomalieSignaleePar() {
        return anomalieSignaleePar;
    }

    public Instant getAnomalieSignaleeLe() {
        return anomalieSignaleeLe;
    }

    public String getResolutionAnomalie() {
        return resolutionAnomalie;
    }

    public UUID getAnomalieResoluePar() {
        return anomalieResoluePar;
    }

    public Instant getAnomalieResolueLe() {
        return anomalieResolueLe;
    }

    public String getCleIdempotence() {
        return cleIdempotence;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public Long getVersion() {
        return version;
    }
}
