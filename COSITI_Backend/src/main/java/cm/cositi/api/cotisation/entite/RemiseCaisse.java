package cm.cositi.api.cotisation.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Un agent ne valide jamais sa propre remise (règle vérifiée au niveau service). */
@Entity
@Table(name = "remise_caisse")
public class RemiseCaisse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "agent_id", nullable = false, updatable = false)
    private UUID agentId;

    @Column(name = "date_remise", nullable = false)
    private LocalDate dateRemise;

    @Column(name = "montant_declare", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantDeclare;

    @Column(name = "montant_recu", precision = 14, scale = 2)
    private BigDecimal montantRecu;

    /**
     * Colonne générée en base ({@code GENERATED ALWAYS AS}) — jamais écrite depuis Java. {@code @Generated}
     * documente l'intention (relecture après écriture) mais, en pratique, l'objet Java géré par le contexte de
     * persistance ne reflète pas de façon fiable la valeur recalculée après un {@code UPDATE} sur cette même
     * ligne dans la même transaction — bug réel observé : {@code ecart} restait calculé sur l'ancien
     * {@code montant_recu}. {@code ServiceRemiseCaisseImpl.receptionner} relit donc l'écart par une requête
     * SQL directe après écriture plutôt que de faire confiance à cette valeur en mémoire.
     */
    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "ecart", insertable = false, updatable = false, precision = 14, scale = 2)
    private BigDecimal ecart;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "DECLAREE";

    @Column(name = "recu_par")
    private UUID recuPar;

    @Column(name = "recu_le")
    private Instant recuLe;

    @Column(name = "commentaire", columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "cree_par", updatable = false, length = 80)
    private String creePar;

    protected RemiseCaisse() {
    }

    public RemiseCaisse(UUID agentId, LocalDate dateRemise, BigDecimal montantDeclare, String creePar) {
        this.agentId = agentId;
        this.dateRemise = dateRemise;
        this.montantDeclare = montantDeclare;
        this.creePar = creePar;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public BigDecimal getMontantDeclare() {
        return montantDeclare;
    }

    public BigDecimal getMontantRecu() {
        return montantRecu;
    }

    public BigDecimal getEcart() {
        return ecart;
    }

    public String getStatut() {
        return statut;
    }

    public UUID getRecuPar() {
        return recuPar;
    }

    public void receptionner(BigDecimal montantRecu, UUID recuPar) {
        this.montantRecu = montantRecu;
        this.recuPar = recuPar;
        this.recuLe = Instant.now();
        this.statut = montantRecu.compareTo(montantDeclare) == 0 ? "CLOTUREE" : "EN_ECART";
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }
}
