package cm.cositi.api.workflow.entite;

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
 * Demande de validation (§6.1). Les transitions passent exclusivement par les méthodes ci-dessous, appelées par
 * {@code ServiceDemandeValidationImpl} après contrôle de la transition, de l'autorité et de la version.
 */
@Entity
@Table(name = "demande_validation")
public class DemandeValidation extends EntiteAuditable {

    @Column(name = "reference", nullable = false, unique = true, updatable = false, length = 30)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_entite", nullable = false, updatable = false, length = 30)
    private TypeEntiteWorkflow typeEntite;

    @Column(name = "entite_id", nullable = false, updatable = false)
    private UUID entiteId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_operation", nullable = false, updatable = false, length = 40)
    private TypeOperationWorkflow typeOperation;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    private StatutDemandeValidation statut = StatutDemandeValidation.BROUILLON;

    @Column(name = "motif", nullable = false, columnDefinition = "TEXT")
    private String motif;

    @Column(name = "commentaire_validateur", columnDefinition = "TEXT")
    private String commentaireValidateur;

    /** Version de l'entité au moment où les propositions ont été établies (§17). */
    @Column(name = "version_base", nullable = false)
    private long versionBase;

    @Column(name = "demande_par", nullable = false, updatable = false)
    private UUID demandePar;

    @Column(name = "demande_par_identifiant", nullable = false, updatable = false, length = 80)
    private String demandeParIdentifiant;

    @Column(name = "demande_le", nullable = false, updatable = false)
    private Instant demandeLe;

    @Column(name = "soumise_le")
    private Instant soumiseLe;

    @Column(name = "examinee_par")
    private UUID examineePar;

    @Column(name = "examinee_le")
    private Instant examineeLe;

    @Column(name = "appliquee_le")
    private Instant appliqueeLe;

    @Column(name = "cle_idempotence", unique = true, updatable = false, length = 80)
    private String cleIdempotence;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected DemandeValidation() {
    }

    public DemandeValidation(String reference, TypeOperationWorkflow typeOperation, UUID entiteId, String motif,
                             long versionBase, UUID demandePar, String demandeParIdentifiant, String cleIdempotence) {
        this.reference = reference;
        this.typeEntite = typeOperation.typeEntite();
        this.typeOperation = typeOperation;
        this.entiteId = entiteId;
        this.motif = motif;
        this.versionBase = versionBase;
        this.demandePar = demandePar;
        this.demandeParIdentifiant = demandeParIdentifiant;
        this.demandeLe = Instant.now();
        this.cleIdempotence = cleIdempotence;
    }

    public void soumettre(long versionBaseActuelle) {
        this.statut = StatutDemandeValidation.EN_ATTENTE_VALIDATION;
        this.versionBase = versionBaseActuelle;
        this.soumiseLe = Instant.now();
    }

    public void decider(StatutDemandeValidation decision, UUID validateurId, String commentaire) {
        this.statut = decision;
        this.examineePar = validateurId;
        this.examineeLe = Instant.now();
        this.commentaireValidateur = commentaire;
    }

    public void marquerAppliquee() {
        this.appliqueeLe = Instant.now();
    }

    public void annuler() {
        this.statut = StatutDemandeValidation.ANNULEE;
    }

    public void modifierMotif(String motif) {
        this.motif = motif;
    }

    public String getReference() {
        return reference;
    }

    public TypeEntiteWorkflow getTypeEntite() {
        return typeEntite;
    }

    public UUID getEntiteId() {
        return entiteId;
    }

    public TypeOperationWorkflow getTypeOperation() {
        return typeOperation;
    }

    public StatutDemandeValidation getStatut() {
        return statut;
    }

    public String getMotif() {
        return motif;
    }

    public String getCommentaireValidateur() {
        return commentaireValidateur;
    }

    public long getVersionBase() {
        return versionBase;
    }

    public UUID getDemandePar() {
        return demandePar;
    }

    public String getDemandeParIdentifiant() {
        return demandeParIdentifiant;
    }

    public Instant getDemandeLe() {
        return demandeLe;
    }

    public Instant getSoumiseLe() {
        return soumiseLe;
    }

    public UUID getExamineePar() {
        return examineePar;
    }

    public Instant getExamineeLe() {
        return examineeLe;
    }

    public Instant getAppliqueeLe() {
        return appliqueeLe;
    }

    public String getCleIdempotence() {
        return cleIdempotence;
    }

    public Long getVersion() {
        return version;
    }
}
