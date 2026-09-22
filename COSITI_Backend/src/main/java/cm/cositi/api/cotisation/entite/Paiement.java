package cm.cositi.api.cotisation.entite;

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
 * L'attribution à l'adhérent se fait exclusivement par identifiant ({@code adherentId}), jamais par nom
 * (AGENTS.md règle absolue n°2). Statut initial toujours {@code A_CONTROLER} — jamais {@code VALIDE} directement.
 */
@Entity
@Table(name = "paiement")
public class Paiement extends EntiteAuditable {

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "numero_recu", nullable = false, unique = true, length = 30)
    private String numeroRecu;

    @Column(name = "date_paiement", nullable = false)
    private LocalDate datePaiement;

    @Column(name = "montant", nullable = false, precision = 14, scale = 2)
    private BigDecimal montant;

    @Column(name = "mode_paiement", nullable = false, length = 20)
    private String modePaiement;

    @Column(name = "reference_transaction", length = 60)
    private String referenceTransaction;

    @Column(name = "type_paiement", nullable = false, length = 20)
    private String typePaiement;

    @Column(name = "agent_encaisseur_id")
    private UUID agentEncaisseurId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutPaiement statut = StatutPaiement.A_CONTROLER;

    @Column(name = "confirme_par_chef_id")
    private UUID confirmeParChefId;

    @Column(name = "confirme_le")
    private Instant confirmeLe;

    @Column(name = "valide_par")
    private UUID validePar;

    @Column(name = "valide_le")
    private Instant valideLe;

    @Column(name = "motif_annulation", columnDefinition = "TEXT")
    private String motifAnnulation;

    @Column(name = "motif_incoherence", columnDefinition = "TEXT")
    private String motifIncoherence;

    @Column(name = "remise_caisse_id")
    private UUID remiseCaisseId;

    @Column(name = "cle_idempotence", unique = true, length = 80)
    private String cleIdempotence;

    @Column(name = "archive", nullable = false)
    private boolean archive = false;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected Paiement() {
    }

    public Paiement(UUID adherentId, String numeroRecu, LocalDate datePaiement, BigDecimal montant,
                     String modePaiement, String referenceTransaction, String typePaiement,
                     UUID agentEncaisseurId, String cleIdempotence) {
        this.adherentId = adherentId;
        this.numeroRecu = numeroRecu;
        this.datePaiement = datePaiement;
        this.montant = montant;
        this.modePaiement = modePaiement;
        this.referenceTransaction = referenceTransaction;
        this.typePaiement = typePaiement;
        this.agentEncaisseurId = agentEncaisseurId;
        this.cleIdempotence = cleIdempotence;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public String getNumeroRecu() {
        return numeroRecu;
    }

    public LocalDate getDatePaiement() {
        return datePaiement;
    }

    public BigDecimal getMontant() {
        return montant;
    }

    public String getModePaiement() {
        return modePaiement;
    }

    public String getReferenceTransaction() {
        return referenceTransaction;
    }

    public String getTypePaiement() {
        return typePaiement;
    }

    public UUID getAgentEncaisseurId() {
        return agentEncaisseurId;
    }

    public StatutPaiement getStatut() {
        return statut;
    }

    public void setStatut(StatutPaiement statut) {
        this.statut = statut;
    }

    public UUID getConfirmeParChefId() {
        return confirmeParChefId;
    }

    public UUID getValidePar() {
        return validePar;
    }

    public Instant getValideLe() {
        return valideLe;
    }

    public void valider(UUID validateurId) {
        this.statut = StatutPaiement.VALIDE;
        this.validePar = validateurId;
        this.valideLe = Instant.now();
    }

    public String getMotifAnnulation() {
        return motifAnnulation;
    }

    public void annuler(String motif) {
        this.statut = StatutPaiement.ANNULE;
        this.motifAnnulation = motif;
    }

    public String getMotifIncoherence() {
        return motifIncoherence;
    }

    public Instant getConfirmeLe() {
        return confirmeLe;
    }

    /** Confirmation hiérarchique du Chef des agents de terrain (UC-CHEF-10) — ne change pas le statut. */
    public void confirmerParChef(UUID chefUtilisateurId) {
        this.confirmeParChefId = chefUtilisateurId;
        this.confirmeLe = Instant.now();
    }

    /** Signalement DAF d'une incohérence (jalon J5) — bloque toute validation tant que non résolu. */
    public void signalerIncoherence(String motif) {
        this.statut = StatutPaiement.INCOHERENCE;
        this.motifIncoherence = motif;
    }

    /** Résolution d'une incohérence par correction (jalon J5) — rouvre le paiement au contrôle. */
    public void resoudreIncoherence() {
        this.statut = StatutPaiement.A_CONTROLER;
        this.motifIncoherence = null;
    }

    public UUID getRemiseCaisseId() {
        return remiseCaisseId;
    }

    public void setRemiseCaisseId(UUID remiseCaisseId) {
        this.remiseCaisseId = remiseCaisseId;
    }

    public String getCleIdempotence() {
        return cleIdempotence;
    }

    public boolean isArchive() {
        return archive;
    }

    public Long getVersion() {
        return version;
    }

    public void modifierMontant(BigDecimal nouveauMontant) {
        this.montant = nouveauMontant;
    }

    public void modifierDatePaiement(LocalDate nouvelleDate) {
        this.datePaiement = nouvelleDate;
    }

    public void modifierReferenceTransaction(String reference) {
        this.referenceTransaction = reference;
    }
}
