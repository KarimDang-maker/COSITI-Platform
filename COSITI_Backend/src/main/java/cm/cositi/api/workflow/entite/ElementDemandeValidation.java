package cm.cositi.api.workflow.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Changement champ par champ (§6.2) : valeur officielle au moment de la demande et valeur proposée. */
@Entity
@Table(name = "demande_validation_element")
public class ElementDemandeValidation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "demande_id", nullable = false, updatable = false)
    private UUID demandeId;

    @Column(name = "champ", nullable = false, updatable = false, length = 60)
    private String champ;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_donnee", nullable = false, updatable = false, length = 20)
    private TypeDonneeChamp typeDonnee;

    @Column(name = "ancienne_valeur", columnDefinition = "TEXT")
    private String ancienneValeur;

    @Column(name = "valeur_proposee", columnDefinition = "TEXT")
    private String valeurProposee;

    @Column(name = "motif_changement", columnDefinition = "TEXT")
    private String motifChangement;

    protected ElementDemandeValidation() {
    }

    public ElementDemandeValidation(UUID demandeId, String champ, TypeDonneeChamp typeDonnee, String ancienneValeur,
                                    String valeurProposee, String motifChangement) {
        this.demandeId = demandeId;
        this.champ = champ;
        this.typeDonnee = typeDonnee;
        this.ancienneValeur = ancienneValeur;
        this.valeurProposee = valeurProposee;
        this.motifChangement = motifChangement;
    }

    public UUID getId() {
        return id;
    }

    public UUID getDemandeId() {
        return demandeId;
    }

    public String getChamp() {
        return champ;
    }

    public TypeDonneeChamp getTypeDonnee() {
        return typeDonnee;
    }

    public String getAncienneValeur() {
        return ancienneValeur;
    }

    public String getValeurProposee() {
        return valeurProposee;
    }

    public String getMotifChangement() {
        return motifChangement;
    }
}
