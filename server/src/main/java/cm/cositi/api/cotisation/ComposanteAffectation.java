package cm.cositi.api.cotisation;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "composante_affectation")
public class ComposanteAffectation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "code", unique = true, nullable = false, length = 30)
    private String code;

    @Column(name = "libelle", nullable = false, length = 120)
    private String libelle;

    @Column(name = "nature", nullable = false, length = 20)
    private String nature; // PRODUIT, DETTE_ADHERENT, REVERSEMENT_TIERS

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
    public String getNature() { return nature; }
    public void setNature(String nature) { this.nature = nature; }
    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }
}
