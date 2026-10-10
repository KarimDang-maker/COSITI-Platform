package cm.cositi.api.workflow.entite;

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

/** Transition d'une demande (§6.4) — journal append-only, jamais modifié après insertion. */
@Entity
@Table(name = "demande_validation_decision")
public class DecisionDemandeValidation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "demande_id", nullable = false, updatable = false)
    private UUID demandeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, updatable = false, length = 30)
    private ActionWorkflow action;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_avant", updatable = false, length = 30)
    private StatutDemandeValidation statutAvant;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_apres", nullable = false, updatable = false, length = 30)
    private StatutDemandeValidation statutApres;

    @Column(name = "decide_par", updatable = false)
    private UUID decidePar;

    @Column(name = "decide_par_identifiant", nullable = false, updatable = false, length = 80)
    private String decideParIdentifiant;

    @Column(name = "decide_le", nullable = false, updatable = false)
    private Instant decideLe;

    @Column(name = "commentaire", updatable = false, columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "cle_idempotence", unique = true, updatable = false, length = 80)
    private String cleIdempotence;

    protected DecisionDemandeValidation() {
    }

    public DecisionDemandeValidation(UUID demandeId, ActionWorkflow action, StatutDemandeValidation statutAvant,
                                     StatutDemandeValidation statutApres, UUID decidePar, String decideParIdentifiant,
                                     String commentaire, String cleIdempotence) {
        this.demandeId = demandeId;
        this.action = action;
        this.statutAvant = statutAvant;
        this.statutApres = statutApres;
        this.decidePar = decidePar;
        this.decideParIdentifiant = decideParIdentifiant;
        this.decideLe = Instant.now();
        this.commentaire = commentaire;
        this.cleIdempotence = cleIdempotence;
    }

    public UUID getId() {
        return id;
    }

    public UUID getDemandeId() {
        return demandeId;
    }

    public ActionWorkflow getAction() {
        return action;
    }

    public StatutDemandeValidation getStatutAvant() {
        return statutAvant;
    }

    public StatutDemandeValidation getStatutApres() {
        return statutApres;
    }

    public UUID getDecidePar() {
        return decidePar;
    }

    public String getDecideParIdentifiant() {
        return decideParIdentifiant;
    }

    public Instant getDecideLe() {
        return decideLe;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public String getCleIdempotence() {
        return cleIdempotence;
    }
}
