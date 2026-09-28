package cm.cositi.api.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Ligne du journal d'audit. Table {@code append-only} : aucune méthode d'écriture autre que la création
 * n'est exposée, aucun repository ne doit exposer de {@code save} sur une entité existante, delete ou update.
 */
@Entity
@Table(name = "journal_audit")
public class JournalAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "horodatage", nullable = false, updatable = false)
    private Instant horodatage;

    @Column(name = "utilisateur_id", updatable = false)
    private UUID utilisateurId;

    @Column(name = "utilisateur_identifiant", updatable = false, length = 80)
    private String utilisateurIdentifiant;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_operation", nullable = false, updatable = false, length = 60)
    private TypeOperation typeOperation;

    @Column(name = "entite", nullable = false, updatable = false, length = 60)
    private String entite;

    @Column(name = "entite_id", updatable = false)
    private UUID entiteId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "valeurs_avant", updatable = false, columnDefinition = "jsonb")
    private String valeursAvant;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "valeurs_apres", updatable = false, columnDefinition = "jsonb")
    private String valeursApres;

    @Column(name = "motif", updatable = false, columnDefinition = "TEXT")
    private String motif;

    @Column(name = "adresse_ip", updatable = false, length = 45)
    private String adresseIp;

    @Column(name = "user_agent", updatable = false, length = 255)
    private String userAgent;

    @Column(name = "resultat", nullable = false, updatable = false, length = 20)
    private String resultat;

    protected JournalAudit() {
    }

    public JournalAudit(UUID utilisateurId, String utilisateurIdentifiant, TypeOperation typeOperation,
                         String entite, UUID entiteId, String valeursAvant, String valeursApres,
                         String motif, String adresseIp, String userAgent, String resultat) {
        this.horodatage = Instant.now();
        this.utilisateurId = utilisateurId;
        this.utilisateurIdentifiant = utilisateurIdentifiant;
        this.typeOperation = typeOperation;
        this.entite = entite;
        this.entiteId = entiteId;
        this.valeursAvant = valeursAvant;
        this.valeursApres = valeursApres;
        this.motif = motif;
        this.adresseIp = adresseIp;
        this.userAgent = userAgent;
        this.resultat = resultat;
    }

    public UUID getId() {
        return id;
    }

    public Instant getHorodatage() {
        return horodatage;
    }

    public UUID getUtilisateurId() {
        return utilisateurId;
    }

    public String getUtilisateurIdentifiant() {
        return utilisateurIdentifiant;
    }

    public TypeOperation getTypeOperation() {
        return typeOperation;
    }

    public String getEntite() {
        return entite;
    }

    public UUID getEntiteId() {
        return entiteId;
    }

    public String getValeursAvant() {
        return valeursAvant;
    }

    public String getValeursApres() {
        return valeursApres;
    }

    public String getMotif() {
        return motif;
    }

    public String getResultat() {
        return resultat;
    }
}
