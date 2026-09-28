package cm.cositi.api.adherent.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

/** Le seuil d'éligibilité CNPS est porté par le pack, jamais par une constante globale (docs/01 §3). */
@Entity
@Table(name = "pack")
public class Pack {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "libelle", nullable = false, length = 80)
    private String libelle;

    @Column(name = "montant_journalier", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantJournalier;

    @Column(name = "montant_mensuel_equivalent", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantMensuelEquivalent;

    @Column(name = "seuil_eligibilite_cnps", nullable = false, precision = 14, scale = 2)
    private BigDecimal seuilEligibiliteCnps;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    protected Pack() {
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getLibelle() {
        return libelle;
    }

    public BigDecimal getMontantJournalier() {
        return montantJournalier;
    }

    public BigDecimal getMontantMensuelEquivalent() {
        return montantMensuelEquivalent;
    }

    public BigDecimal getSeuilEligibiliteCnps() {
        return seuilEligibiliteCnps;
    }

    public boolean isActif() {
        return actif;
    }
}
