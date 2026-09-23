package cm.cositi.api.securite.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Jeton de rafraîchissement opaque : seul son empreinte SHA-256 est stockée (jamais la valeur en clair).
 * Rotation à chaque usage ; {@code familleId} permet de révoquer toute la chaîne en cas de réutilisation
 * détectée (docs/04_SECURITE.md §2).
 */
@Entity
@Table(name = "jeton_rafraichissement")
public class JetonRafraichissement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "utilisateur_id", nullable = false)
    private UUID utilisateurId;

    @Column(name = "jeton_hash", nullable = false, unique = true, length = 255)
    private String jetonHash;

    @Column(name = "famille_id", nullable = false)
    private UUID familleId;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private Instant creeLe;

    @Column(name = "expire_le", nullable = false)
    private Instant expireLe;

    @Column(name = "revoque", nullable = false)
    private boolean revoque = false;

    @Column(name = "revoque_le")
    private Instant revoqueLe;

    @Column(name = "remplace_par_id")
    private UUID remplaceParId;

    @Column(name = "adresse_ip", length = 45)
    private String adresseIp;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    protected JetonRafraichissement() {
    }

    public JetonRafraichissement(UUID utilisateurId, String jetonHash, UUID familleId, Instant expireLe,
                                  String adresseIp, String userAgent) {
        this.utilisateurId = utilisateurId;
        this.jetonHash = jetonHash;
        this.familleId = familleId;
        this.creeLe = Instant.now();
        this.expireLe = expireLe;
        this.adresseIp = adresseIp;
        this.userAgent = userAgent;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUtilisateurId() {
        return utilisateurId;
    }

    public String getJetonHash() {
        return jetonHash;
    }

    public UUID getFamilleId() {
        return familleId;
    }

    public Instant getExpireLe() {
        return expireLe;
    }

    public boolean isRevoque() {
        return revoque;
    }

    public boolean estExpire() {
        return Instant.now().isAfter(expireLe);
    }

    public boolean estValide() {
        return !revoque && !estExpire();
    }

    public void revoquer(UUID remplaceParId) {
        this.revoque = true;
        this.revoqueLe = Instant.now();
        this.remplaceParId = remplaceParId;
    }
}
