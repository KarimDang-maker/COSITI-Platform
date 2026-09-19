package cm.cositi.api.adherent;

import cm.cositi.api.commun.entite.EntiteArchivable;
import cm.cositi.api.organisation.Zone;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "adherent")
public class Adherent extends EntiteArchivable {

    @Column(name = "matricule", unique = true, nullable = false, updatable = false, length = 20)
    private String matricule;

    @Column(name = "nom", nullable = false, length = 100)
    private String nom;

    @Column(name = "prenoms", length = 140)
    private String prenoms;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Column(name = "sexe", length = 1)
    private String sexe; // M, F

    @Column(name = "telephone_principal", nullable = false, length = 20)
    private String telephonePrincipal;

    @Column(name = "telephone_secondaire", length = 20)
    private String telephoneSecondaire;

    @Column(name = "numero_cni", length = 30)
    private String numeroCni;

    @Column(name = "numero_cnps", length = 30)
    private String numeroCnps;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id", nullable = false)
    private Activite activite;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "association_id")
    private Association association;

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

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "PREINSCRIT"; // PREINSCRIT, ACTIF, EN_RETARD, INACTIF, REACTIVE, RADIE

    @Column(name = "inscription_payee", nullable = false)
    private boolean inscriptionPayee = false;

    @Column(name = "consentement_donnees_le")
    private Instant consentementDonneesLe;

    public String getMatricule() { return matricule; }
    public void setMatricule(String matricule) { this.matricule = matricule; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getPrenoms() { return prenoms; }
    public void setPrenoms(String prenoms) { this.prenoms = prenoms; }
    public LocalDate getDateNaissance() { return dateNaissance; }
    public void setDateNaissance(LocalDate dateNaissance) { this.dateNaissance = dateNaissance; }
    public String getSexe() { return sexe; }
    public void setSexe(String sexe) { this.sexe = sexe; }
    public String getTelephonePrincipal() { return telephonePrincipal; }
    public void setTelephonePrincipal(String telephonePrincipal) { this.telephonePrincipal = telephonePrincipal; }
    public String getTelephoneSecondaire() { return telephoneSecondaire; }
    public void setTelephoneSecondaire(String telephoneSecondaire) { this.telephoneSecondaire = telephoneSecondaire; }
    public String getNumeroCni() { return numeroCni; }
    public void setNumeroCni(String numeroCni) { this.numeroCni = numeroCni; }
    public String getNumeroCnps() { return numeroCnps; }
    public void setNumeroCnps(String numeroCnps) { this.numeroCnps = numeroCnps; }
    public Activite getActivite() { return activite; }
    public void setActivite(Activite activite) { this.activite = activite; }
    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }
    public Association getAssociation() { return association; }
    public void setAssociation(Association association) { this.association = association; }
    public String getLocalisation() { return localisation; }
    public void setLocalisation(String localisation) { this.localisation = localisation; }
    public String getQuartier() { return quartier; }
    public void setQuartier(String quartier) { this.quartier = quartier; }
    public String getVille() { return ville; }
    public void setVille(String ville) { this.ville = ville; }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    public LocalDate getDateAdhesion() { return dateAdhesion; }
    public void setDateAdhesion(LocalDate dateAdhesion) { this.dateAdhesion = dateAdhesion; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public boolean isInscriptionPayee() { return inscriptionPayee; }
    public void setInscriptionPayee(boolean inscriptionPayee) { this.inscriptionPayee = inscriptionPayee; }
    public Instant getConsentementDonneesLe() { return consentementDonneesLe; }
    public void setConsentementDonneesLe(Instant consentementDonneesLe) { this.consentementDonneesLe = consentementDonneesLe; }
}
