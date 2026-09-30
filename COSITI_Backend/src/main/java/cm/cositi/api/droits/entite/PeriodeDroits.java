package cm.cositi.api.droits.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Période de droits persistée — jamais recalculée à l'affichage (docs/02_CLASSES_ET_METHODES.md §5).
 * Table {@code periode_droits} (V3__cotisations_droits.sql, schéma non modifié) : pas de colonne
 * {@code modifie_le}/{@code version} — seul le {@code statut} est mutable (passage à {@code ANNULEE}
 * lors d'un recalcul complet, jamais de suppression physique).
 */
@Entity
@Table(name = "periode_droits")
public class PeriodeDroits {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "date_debut", nullable = false, updatable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin", nullable = false, updatable = false)
    private LocalDate dateFin;

    @Column(name = "jours_couverts", nullable = false, updatable = false)
    private int joursCouverts;

    @Column(name = "montant_impute", nullable = false, updatable = false, precision = 14, scale = 2)
    private BigDecimal montantImpute;

    @Column(name = "pack_id", nullable = false, updatable = false)
    private UUID packId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutPeriode statut = StatutPeriode.COUVERTE;

    @Column(name = "source_affectation_id", updatable = false)
    private UUID sourceAffectationId;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "cree_par", updatable = false, length = 80)
    private String creePar;

    protected PeriodeDroits() {
    }

    public PeriodeDroits(UUID adherentId, LocalDate dateDebut, LocalDate dateFin, int joursCouverts,
                          BigDecimal montantImpute, UUID packId, UUID sourceAffectationId, String creePar) {
        this.adherentId = adherentId;
        this.dateDebut = dateDebut;
        this.dateFin = dateFin;
        this.joursCouverts = joursCouverts;
        this.montantImpute = montantImpute;
        this.packId = packId;
        this.sourceAffectationId = sourceAffectationId;
        this.creePar = creePar;
        // Renseigné explicitement : Hibernate envoie sinon NULL et ignore le DEFAULT now() de la colonne
        // (même raison que Adhesion/AyantDroit — voir Conception/SUIVI_EXECUTION.md, bug J2).
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public LocalDate getDateDebut() {
        return dateDebut;
    }

    public LocalDate getDateFin() {
        return dateFin;
    }

    public int getJoursCouverts() {
        return joursCouverts;
    }

    public BigDecimal getMontantImpute() {
        return montantImpute;
    }

    public UUID getPackId() {
        return packId;
    }

    public StatutPeriode getStatut() {
        return statut;
    }

    public UUID getSourceAffectationId() {
        return sourceAffectationId;
    }

    public Instant getCreeLe() {
        return creeLe;
    }

    /** Recalcul complet (jalon J6, réservé DAF/SUPER_ADMIN) — jamais de suppression physique. */
    public void annuler() {
        this.statut = StatutPeriode.ANNULEE;
    }
}
