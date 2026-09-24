package cm.cositi.api.cnps.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Référentiel des offres de prestation CNPS par rubrique (PF/RP/PVID) — V16, contenu repris tel quel de
 * {@code Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V1.md} §16-19 et {@code V2.md} §12-15/
 * §36-39. Lecture seule côté application : aucune route de création/modification n'est exposée, le
 * référentiel se gère par migration comme {@code activite}/{@code pack} (docs/02_CLASSES_ET_METHODES.md §1).
 */
@Entity
@Table(name = "offre_cnps")
public class OffreCnps {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "rubrique", nullable = false, length = 10)
    private String rubrique;

    @Column(name = "code", nullable = false, unique = true, length = 40)
    private String code;

    @Column(name = "libelle", nullable = false, length = 200)
    private String libelle;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "delai_libelle", length = 120)
    private String delaiLibelle;

    @Column(name = "badge_metier", length = 200)
    private String badgeMetier;

    @Column(name = "ordre_affichage", nullable = false)
    private int ordreAffichage;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    protected OffreCnps() {
    }

    public UUID getId() {
        return id;
    }

    public String getRubrique() {
        return rubrique;
    }

    public String getCode() {
        return code;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getDescription() {
        return description;
    }

    public String getDelaiLibelle() {
        return delaiLibelle;
    }

    public String getBadgeMetier() {
        return badgeMetier;
    }

    public int getOrdreAffichage() {
        return ordreAffichage;
    }

    public boolean isActif() {
        return actif;
    }
}
