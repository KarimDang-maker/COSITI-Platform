package cm.cositi.api.organisation.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Historise le lien adhérent <-> agent. Ne jamais écraser l'agent courant sans clore l'affectation
 * précédente (AGENTS.md, docs/01_SCHEMA_BDD.md §2). Une seule affectation ouverte par adhérent
 * (index unique partiel {@code date_fin IS NULL} en base).
 */
@Entity
@Table(name = "affectation_portefeuille")
public class AffectationPortefeuille {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "agent_id", nullable = false, updatable = false)
    private UUID agentId;

    @Column(name = "date_debut", nullable = false, updatable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(name = "motif", length = 200)
    private String motif;

    @Column(name = "auteur_id", updatable = false)
    private UUID auteurId;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    protected AffectationPortefeuille() {
    }

    public AffectationPortefeuille(UUID adherentId, UUID agentId, LocalDate dateDebut, String motif, UUID auteurId) {
        this.adherentId = adherentId;
        this.agentId = agentId;
        this.dateDebut = dateDebut;
        this.motif = motif;
        this.auteurId = auteurId;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public LocalDate getDateDebut() {
        return dateDebut;
    }

    public LocalDate getDateFin() {
        return dateFin;
    }

    public void cloturer(LocalDate dateFin) {
        this.dateFin = dateFin;
    }

    public String getMotif() {
        return motif;
    }
}
