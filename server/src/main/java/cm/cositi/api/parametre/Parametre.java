package cm.cositi.api.parametre;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "parametre")
public class Parametre {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "cle", unique = true, nullable = false, length = 80)
    private String cle;

    @Column(name = "valeur", nullable = false, columnDefinition = "TEXT")
    private String valeur;

    @Column(name = "type_valeur", nullable = false, length = 20)
    private String typeValeur; // ENTIER, DECIMAL, BOOLEEN, TEXTE, JSON

    @Column(name = "libelle", nullable = false, length = 200)
    private String libelle;

    @Column(name = "modifiable_par_role", nullable = false, length = 50)
    private String modifiableParRole = "SUPER_ADMIN";

    @Column(name = "statut_validation", nullable = false, length = 10)
    private String statutValidation = "C"; // C, A, V

    @Column(name = "cree_le", nullable = false)
    private Instant creeLe = Instant.now();

    @Column(name = "modifie_le")
    private Instant modifieLe;

    @Column(name = "modifie_par")
    private String modifiePar;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCle() { return cle; }
    public void setCle(String cle) { this.cle = cle; }
    public String getValeur() { return valeur; }
    public void setValeur(String valeur) { this.valeur = valeur; }
    public String getTypeValeur() { return typeValeur; }
    public void setTypeValeur(String typeValeur) { this.typeValeur = typeValeur; }
    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
    public String getModifiableParRole() { return modifiableParRole; }
    public void setModifiableParRole(String modifiableParRole) { this.modifiableParRole = modifiableParRole; }
    public String getStatutValidation() { return statutValidation; }
    public void setStatutValidation(String statutValidation) { this.statutValidation = statutValidation; }
    public Instant getCreeLe() { return creeLe; }
    public void setCreeLe(Instant creeLe) { this.creeLe = creeLe; }
    public Instant getModifieLe() { return modifieLe; }
    public void setModifieLe(Instant modifieLe) { this.modifieLe = modifieLe; }
    public String getModifiePar() { return modifiePar; }
    public void setModifiePar(String modifiePar) { this.modifiePar = modifiePar; }
}
