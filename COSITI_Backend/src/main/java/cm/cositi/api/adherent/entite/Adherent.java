package cm.cositi.api.adherent.entite;

import cm.cositi.api.commun.entite.EntiteArchivable;
import cm.cositi.api.commun.validation.DonneeSensible;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Fiche adhérent. Les FK vers {@code zone} (module organisation) restent de simples UUID — aucune relation
 * JPA directe entre modules (docs/02_CLASSES_ET_METHODES.md §1). {@code activite}/{@code association} sont
 * dans le même module mais traitées de la même façon par simplicité et cohérence.
 */
@Entity
@Table(name = "adherent")
public class Adherent extends EntiteArchivable {

    @Column(name = "matricule", updatable = false, nullable = false, unique = true, length = 20)
    private String matricule;

    @Column(name = "nom", nullable = false, length = 100)
    private String nom;

    @Column(name = "prenoms", length = 140)
    private String prenoms;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Column(name = "sexe", length = 1)
    private String sexe;

    @DonneeSensible
    @Column(name = "telephone_principal", nullable = false, length = 20)
    private String telephonePrincipal;

    @DonneeSensible
    @Column(name = "telephone_secondaire", length = 20)
    private String telephoneSecondaire;

    @DonneeSensible
    @Column(name = "numero_cni", length = 30)
    private String numeroCni;

    @Column(name = "numero_cnps", length = 30)
    private String numeroCnps;

    @Column(name = "activite_id", nullable = false)
    private UUID activiteId;

    @Column(name = "zone_id", nullable = false)
    private UUID zoneId;

    @Column(name = "association_id")
    private UUID associationId;

    @Column(name = "localisation", nullable = false, length = 200)
    private String localisation;

    @Column(name = "quartier", length = 100)
    private String quartier;

    @Column(name = "ville", length = 80)
    private String ville;

    @Column(name = "latitude", precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "date_adhesion", nullable = false)
    private LocalDate dateAdhesion;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutAdherent statut = StatutAdherent.PREINSCRIT;

    @Column(name = "inscription_payee", nullable = false)
    private boolean inscriptionPayee = false;

    @Column(name = "consentement_donnees_le")
    private Instant consentementDonneesLe;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected Adherent() {
    }

    public Adherent(String matricule, String nom, String telephonePrincipal, UUID activiteId, UUID zoneId,
                     String localisation, LocalDate dateAdhesion) {
        this.matricule = matricule;
        this.nom = nom;
        this.telephonePrincipal = telephonePrincipal;
        this.activiteId = activiteId;
        this.zoneId = zoneId;
        this.localisation = localisation;
        this.dateAdhesion = dateAdhesion;
    }

    public String getMatricule() {
        return matricule;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getPrenoms() {
        return prenoms;
    }

    public void setPrenoms(String prenoms) {
        this.prenoms = prenoms;
    }

    public LocalDate getDateNaissance() {
        return dateNaissance;
    }

    public void setDateNaissance(LocalDate dateNaissance) {
        this.dateNaissance = dateNaissance;
    }

    public String getSexe() {
        return sexe;
    }

    public void setSexe(String sexe) {
        this.sexe = sexe;
    }

    public String getTelephonePrincipal() {
        return telephonePrincipal;
    }

    public void setTelephonePrincipal(String telephonePrincipal) {
        this.telephonePrincipal = telephonePrincipal;
    }

    public String getTelephoneSecondaire() {
        return telephoneSecondaire;
    }

    public void setTelephoneSecondaire(String telephoneSecondaire) {
        this.telephoneSecondaire = telephoneSecondaire;
    }

    public String getNumeroCni() {
        return numeroCni;
    }

    public void setNumeroCni(String numeroCni) {
        this.numeroCni = numeroCni;
    }

    public String getNumeroCnps() {
        return numeroCnps;
    }

    public void setNumeroCnps(String numeroCnps) {
        this.numeroCnps = numeroCnps;
    }

    public UUID getActiviteId() {
        return activiteId;
    }

    public void setActiviteId(UUID activiteId) {
        this.activiteId = activiteId;
    }

    public UUID getZoneId() {
        return zoneId;
    }

    public void setZoneId(UUID zoneId) {
        this.zoneId = zoneId;
    }

    public UUID getAssociationId() {
        return associationId;
    }

    public void setAssociationId(UUID associationId) {
        this.associationId = associationId;
    }

    public String getLocalisation() {
        return localisation;
    }

    public void setLocalisation(String localisation) {
        this.localisation = localisation;
    }

    public String getQuartier() {
        return quartier;
    }

    public void setQuartier(String quartier) {
        this.quartier = quartier;
    }

    public String getVille() {
        return ville;
    }

    public void setVille(String ville) {
        this.ville = ville;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    public LocalDate getDateAdhesion() {
        return dateAdhesion;
    }

    /** Renseignée par la Gestionnaire lors de la finalisation d'un adhérent préinscrit par un Agent (§5). */
    public void setDateAdhesion(LocalDate dateAdhesion) {
        this.dateAdhesion = dateAdhesion;
    }

    public StatutAdherent getStatut() {
        return statut;
    }

    public void setStatut(StatutAdherent statut) {
        this.statut = statut;
    }

    public boolean isInscriptionPayee() {
        return inscriptionPayee;
    }

    public void setInscriptionPayee(boolean inscriptionPayee) {
        this.inscriptionPayee = inscriptionPayee;
    }

    public Instant getConsentementDonneesLe() {
        return consentementDonneesLe;
    }

    public void setConsentementDonneesLe(Instant consentementDonneesLe) {
        this.consentementDonneesLe = consentementDonneesLe;
    }

    public Long getVersion() {
        return version;
    }

    public String getNomComplet() {
        return prenoms != null && !prenoms.isBlank() ? nom + " " + prenoms : nom;
    }
}
