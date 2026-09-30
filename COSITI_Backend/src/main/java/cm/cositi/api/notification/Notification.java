package cm.cositi.api.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Notification interne à l'application (table {@code notification}, V4 — schéma non modifié).
 *
 * <p>Aucun envoi externe (SMS, courriel) n'est fait en V1 : une notification est un message déposé pour un
 * utilisateur, lu dans l'application. {@code entite}/{@code entiteId} pointent l'objet concerné pour que
 * l'interface puisse offrir un lien, sans dupliquer son contenu.</p>
 */
@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "destinataire_utilisateur_id", nullable = false, updatable = false)
    private UUID destinataireUtilisateurId;

    @Column(name = "type", nullable = false, length = 40, updatable = false)
    private String type;

    @Column(name = "titre", nullable = false, length = 160, updatable = false)
    private String titre;

    @Column(name = "corps", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String corps;

    @Column(name = "entite", length = 40, updatable = false)
    private String entite;

    @Column(name = "entite_id", updatable = false)
    private UUID entiteId;

    @Column(name = "lue", nullable = false)
    private boolean lue = false;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    protected Notification() {
    }

    public Notification(UUID destinataireUtilisateurId, String type, String titre, String corps,
                         String entite, UUID entiteId) {
        this.destinataireUtilisateurId = destinataireUtilisateurId;
        this.type = type;
        this.titre = titre;
        this.corps = corps;
        this.entite = entite;
        this.entiteId = entiteId;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getDestinataireUtilisateurId() {
        return destinataireUtilisateurId;
    }

    public String getType() {
        return type;
    }

    public String getTitre() {
        return titre;
    }

    public String getCorps() {
        return corps;
    }

    public String getEntite() {
        return entite;
    }

    public UUID getEntiteId() {
        return entiteId;
    }

    public boolean isLue() {
        return lue;
    }

    public void marquerLue() {
        this.lue = true;
    }

    public Instant getCreeLe() {
        return creeLe;
    }
}
