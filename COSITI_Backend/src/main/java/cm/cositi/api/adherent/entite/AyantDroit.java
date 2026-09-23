package cm.cositi.api.adherent.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ayant_droit")
public class AyantDroit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "type_lien", nullable = false, length = 20)
    private String typeLien;

    @Column(name = "nom", nullable = false, length = 100)
    private String nom;

    @Column(name = "prenoms", length = 140)
    private String prenoms;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "cree_par", updatable = false, length = 80)
    private String creePar;

    protected AyantDroit() {
    }

    public AyantDroit(UUID adherentId, String typeLien, String nom, String prenoms, LocalDate dateNaissance) {
        this.adherentId = adherentId;
        this.typeLien = typeLien;
        this.nom = nom;
        this.prenoms = prenoms;
        this.dateNaissance = dateNaissance;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public String getTypeLien() {
        return typeLien;
    }

    public String getNom() {
        return nom;
    }

    public String getPrenoms() {
        return prenoms;
    }

    public LocalDate getDateNaissance() {
        return dateNaissance;
    }
}
