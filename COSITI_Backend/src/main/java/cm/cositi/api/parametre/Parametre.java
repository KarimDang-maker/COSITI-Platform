package cm.cositi.api.parametre;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Règle de paramétrage métier. Toutes les règles marquées {@code [V]} vivent ici — jamais en constante Java
 * (AGENTS.md règle absolue n°1).
 */
@Entity
@Table(name = "parametre")
public class Parametre {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "cle", nullable = false, unique = true, length = 80)
    private String cle;

    @Column(name = "valeur", nullable = false, columnDefinition = "TEXT")
    private String valeur;

    @Column(name = "type_valeur", nullable = false, length = 20)
    private String typeValeur;

    @Column(name = "libelle", nullable = false, length = 200)
    private String libelle;

    @Column(name = "modifiable_par_role", nullable = false, length = 50)
    private String modifiableParRole;

    @Column(name = "statut_validation", nullable = false, length = 10)
    private String statutValidation;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    @Column(name = "modifie_le")
    private Instant modifieLe;

    @Column(name = "modifie_par", length = 80)
    private String modifiePar;

    protected Parametre() {
    }

    public UUID getId() {
        return id;
    }

    public String getCle() {
        return cle;
    }

    public String getValeur() {
        return valeur;
    }

    public void setValeur(String valeur) {
        this.valeur = valeur;
    }

    public String getTypeValeur() {
        return typeValeur;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getModifiableParRole() {
        return modifiableParRole;
    }

    public String getStatutValidation() {
        return statutValidation;
    }

    /** {@code true} si la règle est validée par la COSITI (statut 'C' ou 'A'), {@code false} si 'V'. */
    public boolean estValide() {
        return !"V".equalsIgnoreCase(statutValidation);
    }

    public Instant getModifieLe() {
        return modifieLe;
    }

    public String getModifiePar() {
        return modifiePar;
    }

    public void setModifieLe(Instant modifieLe) {
        this.modifieLe = modifieLe;
    }

    public void setModifiePar(String modifiePar) {
        this.modifiePar = modifiePar;
    }
}
