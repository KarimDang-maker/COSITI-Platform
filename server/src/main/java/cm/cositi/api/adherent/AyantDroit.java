package cm.cositi.api.adherent;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ayant_droit")
public class AyantDroit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "adherent_id", nullable = false)
    private UUID adherentId;

    @Column(name = "type_lien", nullable = false, length = 20)
    private String typeLien; // ENFANT, CONJOINT

    @Column(name = "nom", nullable = false, length = 100)
    private String nom;

    @Column(name = "prenoms", length = 140)
    private String prenoms;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "cree_par", length = 80)
    private String creePar;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getAdherentId() { return adherentId; }
    public void setAdherentId(UUID adherentId) { this.adherentId = adherentId; }
    public String getTypeLien() { return typeLien; }
    public void setTypeLien(String typeLien) { this.typeLien = typeLien; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getPrenoms() { return prenoms; }
    public void setPrenoms(String prenoms) { this.prenoms = prenoms; }
    public LocalDate getDateNaissance() { return dateNaissance; }
    public void setDateNaissance(LocalDate dateNaissance) { this.dateNaissance = dateNaissance; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
    public String getCreePar() { return creePar; }
    public void setCreePar(String creePar) { this.creePar = creePar; }
}
