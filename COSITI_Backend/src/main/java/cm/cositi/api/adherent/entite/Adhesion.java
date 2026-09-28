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

/** Historise le pack souscrit par l'adhérent dans le temps — une seule adhésion ouverte à la fois. */
@Entity
@Table(name = "adhesion")
public class Adhesion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "pack_id", nullable = false)
    private UUID packId;

    @Column(name = "date_debut", nullable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(name = "motif_changement", length = 200)
    private String motifChangement;

    @Column(name = "auteur_id")
    private UUID auteurId;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    protected Adhesion() {
    }

    public Adhesion(UUID adherentId, UUID packId, LocalDate dateDebut, String motifChangement, UUID auteurId) {
        this.adherentId = adherentId;
        this.packId = packId;
        this.dateDebut = dateDebut;
        this.motifChangement = motifChangement;
        this.auteurId = auteurId;
        // Renseigné explicitement : Hibernate envoie sinon NULL et ignore le DEFAULT now() de la colonne
        // (le DEFAULT SQL ne s'applique que si la colonne est absente de l'INSERT généré).
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public UUID getPackId() {
        return packId;
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

    public String getMotifChangement() {
        return motifChangement;
    }
}
