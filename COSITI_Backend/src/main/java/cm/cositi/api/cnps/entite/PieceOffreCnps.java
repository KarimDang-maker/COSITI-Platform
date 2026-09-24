package cm.cositi.api.cnps.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Pièce obligatoire (ou non) du référentiel d'une offre CNPS — V16, lecture seule (voir {@link OffreCnps}). */
@Entity
@Table(name = "piece_offre_cnps")
public class PieceOffreCnps {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "offre_id", nullable = false, updatable = false)
    private UUID offreId;

    @Column(name = "libelle", nullable = false, length = 200)
    private String libelle;

    @Column(name = "obligatoire", nullable = false)
    private boolean obligatoire;

    @Column(name = "ordre_affichage", nullable = false)
    private int ordreAffichage;

    protected PieceOffreCnps() {
    }

    public UUID getId() {
        return id;
    }

    public UUID getOffreId() {
        return offreId;
    }

    public String getLibelle() {
        return libelle;
    }

    public boolean isObligatoire() {
        return obligatoire;
    }

    public int getOrdreAffichage() {
        return ordreAffichage;
    }
}
