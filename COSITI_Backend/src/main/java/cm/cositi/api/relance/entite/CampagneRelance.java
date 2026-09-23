package cm.cositi.api.relance.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Campagne de relance (table {@code campagne_relance}, V4 — schéma non modifié).
 *
 * <p>{@code critere} est un JSONB qui conserve <b>les critères tels qu'ils ont été choisis</b> au moment de
 * la création (par exemple « retard minimum : 30 jours, zone : Douala Centre »). Il sert de trace de ce qui
 * a motivé la campagne ; il n'est jamais réinterprété comme un moteur de ciblage automatique — aucune règle
 * de relance automatique n'est validée par la COSITI.</p>
 *
 * <p>Porté en {@code String} annoté {@code @JdbcTypeCode(SqlTypes.JSON)}, comme {@code JournalAudit} :
 * c'est la convention du dépôt pour le JSONB, et elle évite d'ajouter une dépendance de mapping JSON
 * (AGENTS.md règle n°7).</p>
 */
@Entity
@Table(name = "campagne_relance")
public class CampagneRelance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "libelle", nullable = false, length = 160)
    private String libelle;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "critere", nullable = false, columnDefinition = "jsonb")
    private String critere;

    @Column(name = "date_debut", nullable = false, updatable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutCampagne statut = StatutCampagne.ACTIVE;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "cree_par", updatable = false, length = 80)
    private String creePar;

    protected CampagneRelance() {
    }

    public CampagneRelance(String libelle, String critereJson, LocalDate dateDebut, String creePar) {
        this.libelle = libelle;
        this.critere = critereJson;
        this.dateDebut = dateDebut;
        this.creePar = creePar;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getCritere() {
        return critere;
    }

    public LocalDate getDateDebut() {
        return dateDebut;
    }

    public LocalDate getDateFin() {
        return dateFin;
    }

    public StatutCampagne getStatut() {
        return statut;
    }

    public Instant getCreeLe() {
        return creeLe;
    }

    public String getCreePar() {
        return creePar;
    }

    public void suspendre() {
        this.statut = StatutCampagne.SUSPENDUE;
    }

    public void reactiver() {
        this.statut = StatutCampagne.ACTIVE;
    }

    public void cloturer(LocalDate dateFin) {
        this.statut = StatutCampagne.CLOTUREE;
        this.dateFin = dateFin;
    }

    public boolean accepteDeNouvellesRelances() {
        return statut == StatutCampagne.ACTIVE;
    }
}
