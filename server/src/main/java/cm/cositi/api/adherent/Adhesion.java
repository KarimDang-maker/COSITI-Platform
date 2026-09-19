package cm.cositi.api.adherent;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "adhesion")
public class Adhesion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "adherent_id", nullable = false)
    private UUID adherentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pack_id", nullable = false)
    private Pack pack;

    @Column(name = "date_debut", nullable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(name = "motif_changement", length = 200)
    private String motifChangement;

    @Column(name = "auteur_id")
    private UUID auteurId;

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getAdherentId() { return adherentId; }
    public void setAdherentId(UUID adherentId) { this.adherentId = adherentId; }
    public Pack getPack() { return pack; }
    public void setPack(Pack pack) { this.pack = pack; }
    public LocalDate getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDate dateDebut) { this.dateDebut = dateDebut; }
    public LocalDate getDateFin() { return dateFin; }
    public void setDateFin(LocalDate dateFin) { this.dateFin = dateFin; }
    public String getMotifChangement() { return motifChangement; }
    public void setMotifChangement(String motifChangement) { this.motifChangement = motifChangement; }
    public UUID getAuteurId() { return auteurId; }
    public void setAuteurId(UUID auteurId) { this.auteurId = auteurId; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
}
