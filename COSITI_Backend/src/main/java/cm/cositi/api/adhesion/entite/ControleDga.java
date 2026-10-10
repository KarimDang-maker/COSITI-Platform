package cm.cositi.api.adhesion.entite;

import cm.cositi.api.commun.entite.EntiteAuditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

/**
 * Un tour de contrôle documentaire DGA (V20). Une resoumission après correction ouvre un nouveau tour : les tours
 * précédents ne sont jamais modifiés (historique immuable).
 */
@Entity
@Table(name = "controle_dga")
public class ControleDga extends EntiteAuditable {

    @Column(name = "reference", nullable = false, unique = true, updatable = false, length = 20)
    private String reference;

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "tour", nullable = false, updatable = false)
    private int tour;

    @Column(name = "controle_precedent_id", updatable = false)
    private UUID controlePrecedentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private StatutControle statut = StatutControle.EN_ATTENTE;

    @Column(name = "soumis_par", nullable = false, updatable = false)
    private UUID soumisPar;

    @Column(name = "soumis_le", nullable = false, updatable = false)
    private Instant soumisLe;

    @Column(name = "demarre_par")
    private UUID demarrePar;

    @Column(name = "demarre_le")
    private Instant demarreLe;

    @Column(name = "termine_par")
    private UUID terminePar;

    @Column(name = "termine_le")
    private Instant termineLe;

    @Column(name = "commentaire_decision", columnDefinition = "TEXT")
    private String commentaireDecision;

    @Column(name = "cle_idempotence_decision", unique = true, length = 80)
    private String cleIdempotenceDecision;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected ControleDga() {
    }

    public ControleDga(String reference, UUID adherentId, int tour, UUID controlePrecedentId, UUID soumisPar) {
        this.reference = reference;
        this.adherentId = adherentId;
        this.tour = tour;
        this.controlePrecedentId = controlePrecedentId;
        this.soumisPar = soumisPar;
        this.soumisLe = Instant.now();
    }

    public void demarrer(UUID dgaId) {
        this.statut = StatutControle.EN_COURS;
        this.demarrePar = dgaId;
        this.demarreLe = Instant.now();
    }

    public void terminer(StatutControle decision, UUID dgaId, String commentaire, String cleIdempotence) {
        this.statut = decision;
        this.terminePar = dgaId;
        this.termineLe = Instant.now();
        this.commentaireDecision = commentaire;
        this.cleIdempotenceDecision = cleIdempotence;
    }

    public String getReference() {
        return reference;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public int getTour() {
        return tour;
    }

    public UUID getControlePrecedentId() {
        return controlePrecedentId;
    }

    public StatutControle getStatut() {
        return statut;
    }

    public UUID getSoumisPar() {
        return soumisPar;
    }

    public Instant getSoumisLe() {
        return soumisLe;
    }

    public UUID getDemarrePar() {
        return demarrePar;
    }

    public Instant getDemarreLe() {
        return demarreLe;
    }

    public UUID getTerminePar() {
        return terminePar;
    }

    public Instant getTermineLe() {
        return termineLe;
    }

    public String getCommentaireDecision() {
        return commentaireDecision;
    }

    public String getCleIdempotenceDecision() {
        return cleIdempotenceDecision;
    }

    public Long getVersion() {
        return version;
    }
}
