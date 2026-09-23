package cm.cositi.api.relance.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Contact de relance effectué auprès d'un adhérent (table {@code relance}, V4 — schéma non modifié).
 *
 * <p>Une relance est un <b>fait constaté</b>, jamais modifié après coup : toutes les colonnes sont
 * {@code updatable = false}. Corriger une relance erronée consiste à en enregistrer une nouvelle, pas à
 * réécrire l'historique des contacts.</p>
 */
@Entity
@Table(name = "relance")
public class Relance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "campagne_id", updatable = false)
    private UUID campagneId;

    @Column(name = "responsable_utilisateur_id", updatable = false)
    private UUID responsableUtilisateurId;

    @Enumerated(EnumType.STRING)
    @Column(name = "canal", nullable = false, length = 20, updatable = false)
    private CanalRelance canal;

    @Column(name = "date_contact", nullable = false, updatable = false)
    private Instant dateContact;

    @Enumerated(EnumType.STRING)
    @Column(name = "resultat", nullable = false, length = 30, updatable = false)
    private ResultatRelance resultat;

    @Column(name = "prochaine_action_le", updatable = false)
    private LocalDate prochaineActionLe;

    @Column(name = "commentaire", columnDefinition = "TEXT", updatable = false)
    private String commentaire;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    protected Relance() {
    }

    public Relance(UUID adherentId, UUID campagneId, UUID responsableUtilisateurId, CanalRelance canal,
                    ResultatRelance resultat, LocalDate prochaineActionLe, String commentaire) {
        this.adherentId = adherentId;
        this.campagneId = campagneId;
        this.responsableUtilisateurId = responsableUtilisateurId;
        this.canal = canal;
        this.resultat = resultat;
        this.prochaineActionLe = prochaineActionLe;
        this.commentaire = commentaire;
        this.dateContact = Instant.now();
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public UUID getCampagneId() {
        return campagneId;
    }

    public UUID getResponsableUtilisateurId() {
        return responsableUtilisateurId;
    }

    public CanalRelance getCanal() {
        return canal;
    }

    public Instant getDateContact() {
        return dateContact;
    }

    public ResultatRelance getResultat() {
        return resultat;
    }

    public LocalDate getProchaineActionLe() {
        return prochaineActionLe;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public Instant getCreeLe() {
        return creeLe;
    }
}
