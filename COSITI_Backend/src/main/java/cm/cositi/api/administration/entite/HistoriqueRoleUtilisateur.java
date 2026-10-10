package cm.cositi.api.administration.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Trace d'une attribution ou d'un retrait de rôle (table {@code historique_role_utilisateur}, V13).
 *
 * <p>Complète l'exigence « historique des changements de responsabilité » de
 * {@code Roles des acteurs.md §14}, dont la désignation du Chef (V7) ne couvrait que la moitié. Le journal
 * d'audit trace la même opération, mais il n'est lisible que par les habilitations d'audit ; cet
 * historique est consultable dans l'écran d'administration.</p>
 */
@Entity
@Table(name = "historique_role_utilisateur")
public class HistoriqueRoleUtilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "utilisateur_id", nullable = false, updatable = false)
    private UUID utilisateurId;

    @Column(name = "role_code", nullable = false, length = 50, updatable = false)
    private String roleCode;

    @Column(name = "action", nullable = false, length = 20, updatable = false)
    private String action;

    @Column(name = "auteur_id", updatable = false)
    private UUID auteurId;

    @Column(name = "motif", columnDefinition = "TEXT", updatable = false)
    private String motif;

    @Column(name = "horodatage", updatable = false)
    private Instant horodatage;

    protected HistoriqueRoleUtilisateur() {
    }

    public HistoriqueRoleUtilisateur(UUID utilisateurId, String roleCode, String action, UUID auteurId,
                                      String motif) {
        this.utilisateurId = utilisateurId;
        this.roleCode = roleCode;
        this.action = action;
        this.auteurId = auteurId;
        this.motif = motif;
        this.horodatage = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUtilisateurId() {
        return utilisateurId;
    }

    public String getRoleCode() {
        return roleCode;
    }

    public String getAction() {
        return action;
    }

    public UUID getAuteurId() {
        return auteurId;
    }

    public String getMotif() {
        return motif;
    }

    public Instant getHorodatage() {
        return horodatage;
    }
}
