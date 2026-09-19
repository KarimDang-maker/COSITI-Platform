package cm.cositi.api.audit;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "journal_audit")
public class JournalAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "horodatage", nullable = false)
    private Instant horodatage = Instant.now();

    @Column(name = "utilisateur_id")
    private UUID utilisateurId;

    @Column(name = "utilisateur_identifiant", length = 80)
    private String utilisateurIdentifiant;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_operation", nullable = false, length = 60)
    private TypeOperation typeOperation;

    @Column(name = "entite", nullable = false, length = 60)
    private String entite;

    @Column(name = "entite_id")
    private UUID entiteId;

    @Column(name = "valeurs_avant", columnDefinition = "jsonb")
    private String valeursAvant;

    @Column(name = "valeurs_apres", columnDefinition = "jsonb")
    private String valeursApres;

    @Column(name = "motif", columnDefinition = "TEXT")
    private String motif;

    @Column(name = "adresse_ip", length = 45)
    private String adresseIp;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "resultat", nullable = false, length = 20)
    private String resultat = "SUCCES"; // SUCCES, REFUS, ERREUR

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Instant getHorodatage() { return horodatage; }
    public void setHorodatage(Instant horodatage) { this.horodatage = horodatage; }
    public UUID getUtilisateurId() { return utilisateurId; }
    public void setUtilisateurId(UUID utilisateurId) { this.utilisateurId = utilisateurId; }
    public String getUtilisateurIdentifiant() { return utilisateurIdentifiant; }
    public void setUtilisateurIdentifiant(String utilisateurIdentifiant) { this.utilisateurIdentifiant = utilisateurIdentifiant; }
    public TypeOperation getTypeOperation() { return typeOperation; }
    public void setTypeOperation(TypeOperation typeOperation) { this.typeOperation = typeOperation; }
    public String getEntite() { return entite; }
    public void setEntite(String entite) { this.entite = entite; }
    public UUID getEntiteId() { return entiteId; }
    public void setEntiteId(UUID entiteId) { this.entiteId = entiteId; }
    public String getValeursAvant() { return valeursAvant; }
    public void setValeursAvant(String valeursAvant) { this.valeursAvant = valeursAvant; }
    public String getValeursApres() { return valeursApres; }
    public void setValeursApres(String valeursApres) { this.valeursApres = valeursApres; }
    public String getMotif() { return motif; }
    public void setMotif(String motif) { this.motif = motif; }
    public String getAdresseIp() { return adresseIp; }
    public void setAdresseIp(String adresseIp) { this.adresseIp = adresseIp; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public String getResultat() { return resultat; }
    public void setResultat(String resultat) { this.resultat = resultat; }
}
