package cm.cositi.api.adherent;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "pack")
public class Pack {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "code", unique = true, nullable = false, length = 20)
    private String code;

    @Column(name = "libelle", nullable = false, length = 80)
    private String libelle;

    @Column(name = "montant_journalier", precision = 14, scale = 2, nullable = false)
    private BigDecimal montantJournalier;

    @Column(name = "montant_mensuel_equivalent", precision = 14, scale = 2, nullable = false)
    private BigDecimal montantMensuelEquivalent;

    @Column(name = "seuil_eligibilite_cnps", precision = 14, scale = 2, nullable = false)
    private BigDecimal seuilEligibiliteCnps;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
    public BigDecimal getMontantJournalier() { return montantJournalier; }
    public void setMontantJournalier(BigDecimal montantJournalier) { this.montantJournalier = montantJournalier; }
    public BigDecimal getMontantMensuelEquivalent() { return montantMensuelEquivalent; }
    public void setMontantMensuelEquivalent(BigDecimal montantMensuelEquivalent) { this.montantMensuelEquivalent = montantMensuelEquivalent; }
    public BigDecimal getSeuilEligibiliteCnps() { return seuilEligibiliteCnps; }
    public void setSeuilEligibiliteCnps(BigDecimal seuilEligibiliteCnps) { this.seuilEligibiliteCnps = seuilEligibiliteCnps; }
    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }
}
