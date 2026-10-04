package cm.cositi.api.adhesion.entite;

import cm.cositi.api.commun.entite.EntiteAuditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.LocalDate;

/**
 * Ligne de la matrice documentaire centralisée (document des règles v2.0, §18, §38 ; table {@code exigence_documentaire},
 * V21). {@code champ} nul : la pièce elle-même ; renseigné : une information que la pièce justifie (§23).
 *
 * <p>Règle §17 : une pièce ne bloque l'activation que si elle est {@code OBLIGATOIRE} <b>et</b> confirmée par la COSITI
 * ({@code statutValidation = 'C'}). Une exigence {@code V} est affichée et contrôlée, jamais bloquante.</p>
 */
@Entity
@Table(name = "exigence_documentaire")
public class ExigenceDocumentaire extends EntiteAuditable {

    @Column(name = "code", nullable = false, unique = true, updatable = false, length = 60)
    private String code;

    @Column(name = "rubrique", nullable = false, length = 20)
    private String rubrique;

    @Column(name = "type_document", nullable = false, length = 40)
    private String typeDocument;

    @Column(name = "champ", length = 60)
    private String champ;

    @Column(name = "libelle", nullable = false, length = 160)
    private String libelle;

    @Enumerated(EnumType.STRING)
    @Column(name = "niveau", nullable = false, length = 20)
    private NiveauExigence niveau;

    @Column(name = "condition_application", columnDefinition = "TEXT")
    private String conditionApplication;

    @Column(name = "verification_dga", nullable = false)
    private boolean verificationDga;

    @Column(name = "statut_validation", nullable = false, length = 1)
    private String statutValidation;

    @Column(name = "effectif_du")
    private LocalDate effectifDu;

    @Column(name = "effectif_jusquau")
    private LocalDate effectifJusquau;

    @Column(name = "actif", nullable = false)
    private boolean actif;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected ExigenceDocumentaire() {
    }

    public boolean estPiece() {
        return champ == null;
    }

    /** En vigueur à la date : active et dans sa période d'effet. */
    public boolean estEnVigueur(LocalDate date) {
        return actif && (effectifDu == null || !effectifDu.isAfter(date))
                && (effectifJusquau == null || !effectifJusquau.isBefore(date));
    }

    public boolean estConfirmee() {
        return "C".equals(statutValidation);
    }

    /** §17 : bloquante seulement si obligatoire et confirmée par la COSITI. */
    public boolean estBloquante() {
        return estPiece() && niveau == NiveauExigence.OBLIGATOIRE && estConfirmee();
    }

    public void modifier(NiveauExigence niveau, String conditionApplication, boolean verificationDga, boolean actif,
                         LocalDate effectifDu, LocalDate effectifJusquau) {
        this.niveau = niveau;
        this.conditionApplication = conditionApplication;
        this.verificationDga = verificationDga;
        this.actif = actif;
        this.effectifDu = effectifDu;
        this.effectifJusquau = effectifJusquau;
    }

    public void confirmer() {
        this.statutValidation = "C";
    }

    public String getCode() {
        return code;
    }

    public String getRubrique() {
        return rubrique;
    }

    public String getTypeDocument() {
        return typeDocument;
    }

    public String getChamp() {
        return champ;
    }

    public String getLibelle() {
        return libelle;
    }

    public NiveauExigence getNiveau() {
        return niveau;
    }

    public String getConditionApplication() {
        return conditionApplication;
    }

    public boolean isVerificationDga() {
        return verificationDga;
    }

    public String getStatutValidation() {
        return statutValidation;
    }

    public LocalDate getEffectifDu() {
        return effectifDu;
    }

    public LocalDate getEffectifJusquau() {
        return effectifJusquau;
    }

    public boolean isActif() {
        return actif;
    }

    public int getOrdre() {
        return ordre;
    }

    public Long getVersion() {
        return version;
    }
}
