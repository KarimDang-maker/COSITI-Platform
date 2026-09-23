package cm.cositi.api.cotisation.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Destinations possibles d'une part de versement — table de référence car {@code REPARTITION_VERSEMENT} n'est pas validée. */
@Entity
@Table(name = "composante_affectation")
public class ComposanteAffectation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "libelle", nullable = false, length = 120)
    private String libelle;

    @Column(name = "nature", nullable = false, length = 20)
    private String nature;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    protected ComposanteAffectation() {
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getNature() {
        return nature;
    }

    public boolean isActif() {
        return actif;
    }
}
