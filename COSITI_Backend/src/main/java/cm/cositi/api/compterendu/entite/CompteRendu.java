package cm.cositi.api.compterendu.entite;

import cm.cositi.api.commun.entite.EntiteAuditable;
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
 * Compte rendu terrain ou consolidé (table {@code compte_rendu}, V10 — contrat {@code [A]} à faire valider
 * par la COSITI, voir l'en-tête de la migration).
 *
 * <p>Les indicateurs sont <b>déclarés par l'auteur</b>, jamais recalculés depuis les paiements enregistrés :
 * un compte rendu est ce que l'agent dit avoir fait. L'écart éventuel avec les données de la base est
 * précisément ce que le Gestionnaire des comptes examine au contrôle (UC-GC-13).</p>
 */
@Entity
@Table(name = "compte_rendu")
public class CompteRendu extends EntiteAuditable {

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20, updatable = false)
    private TypeCompteRendu type;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutCompteRendu statut = StatutCompteRendu.BROUILLON;

    @Column(name = "auteur_utilisateur_id", nullable = false, updatable = false)
    private UUID auteurUtilisateurId;

    @Column(name = "destinataire_utilisateur_id")
    private UUID destinataireUtilisateurId;

    @Column(name = "agent_id")
    private UUID agentId;

    @Column(name = "zone_id")
    private UUID zoneId;

    @Column(name = "periode_debut", nullable = false)
    private LocalDate periodeDebut;

    @Column(name = "periode_fin", nullable = false)
    private LocalDate periodeFin;

    @Column(name = "nb_visites", nullable = false)
    private int nbVisites;

    @Column(name = "nb_adherents_rencontres", nullable = false)
    private int nbAdherentsRencontres;

    @Column(name = "nb_adherents_crees", nullable = false)
    private int nbAdherentsCrees;

    @Column(name = "nb_paiements_enregistres", nullable = false)
    private int nbPaiementsEnregistres;

    @Column(name = "montant_collecte", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantCollecte = BigDecimal.ZERO;

    @Column(name = "synthese", columnDefinition = "TEXT")
    private String synthese;

    @Column(name = "difficultes", columnDefinition = "TEXT")
    private String difficultes;

    @Column(name = "observation_controle", columnDefinition = "TEXT")
    private String observationControle;

    @Column(name = "controle_le")
    private Instant controleLe;

    @Column(name = "controle_par", length = 80)
    private String controlePar;

    @Column(name = "transmis_le")
    private Instant transmisLe;

    @Column(name = "archive", nullable = false)
    private boolean archive = false;

    @Column(name = "motif_archivage", columnDefinition = "TEXT")
    private String motifArchivage;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected CompteRendu() {
    }

    public CompteRendu(TypeCompteRendu type, UUID auteurUtilisateurId, LocalDate periodeDebut,
                        LocalDate periodeFin) {
        this.type = type;
        this.auteurUtilisateurId = auteurUtilisateurId;
        this.periodeDebut = periodeDebut;
        this.periodeFin = periodeFin;
    }

    public TypeCompteRendu getType() {
        return type;
    }

    public StatutCompteRendu getStatut() {
        return statut;
    }

    public UUID getAuteurUtilisateurId() {
        return auteurUtilisateurId;
    }

    public UUID getDestinataireUtilisateurId() {
        return destinataireUtilisateurId;
    }

    public void setDestinataireUtilisateurId(UUID destinataireUtilisateurId) {
        this.destinataireUtilisateurId = destinataireUtilisateurId;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public void setAgentId(UUID agentId) {
        this.agentId = agentId;
    }

    public UUID getZoneId() {
        return zoneId;
    }

    public void setZoneId(UUID zoneId) {
        this.zoneId = zoneId;
    }

    public LocalDate getPeriodeDebut() {
        return periodeDebut;
    }

    public LocalDate getPeriodeFin() {
        return periodeFin;
    }

    public int getNbVisites() {
        return nbVisites;
    }

    public int getNbAdherentsRencontres() {
        return nbAdherentsRencontres;
    }

    public int getNbAdherentsCrees() {
        return nbAdherentsCrees;
    }

    public int getNbPaiementsEnregistres() {
        return nbPaiementsEnregistres;
    }

    public BigDecimal getMontantCollecte() {
        return montantCollecte;
    }

    public void renseignerIndicateurs(int nbVisites, int nbAdherentsRencontres, int nbAdherentsCrees,
                                       int nbPaiementsEnregistres, BigDecimal montantCollecte) {
        this.nbVisites = nbVisites;
        this.nbAdherentsRencontres = nbAdherentsRencontres;
        this.nbAdherentsCrees = nbAdherentsCrees;
        this.nbPaiementsEnregistres = nbPaiementsEnregistres;
        this.montantCollecte = montantCollecte == null ? BigDecimal.ZERO : montantCollecte;
    }

    public String getSynthese() {
        return synthese;
    }

    public void setSynthese(String synthese) {
        this.synthese = synthese;
    }

    public String getDifficultes() {
        return difficultes;
    }

    public void setDifficultes(String difficultes) {
        this.difficultes = difficultes;
    }

    public String getObservationControle() {
        return observationControle;
    }

    public Instant getControleLe() {
        return controleLe;
    }

    public String getControlePar() {
        return controlePar;
    }

    public Instant getTransmisLe() {
        return transmisLe;
    }

    public boolean isArchive() {
        return archive;
    }

    public String getMotifArchivage() {
        return motifArchivage;
    }

    public Long getVersion() {
        return version;
    }

    /** Transmission au destinataire : le Gestionnaire pour un TERRAIN, la DGA pour un CONSOLIDE. */
    public void transmettre(UUID destinataireId) {
        this.destinataireUtilisateurId = destinataireId;
        this.statut = StatutCompteRendu.TRANSMIS;
        this.transmisLe = Instant.now();
    }

    public void marquerControle(String observation, String controlePar) {
        this.observationControle = observation;
        this.controlePar = controlePar;
        this.controleLe = Instant.now();
        this.statut = StatutCompteRendu.CONTROLE;
    }

    public void marquerConsolide() {
        this.statut = StatutCompteRendu.CONSOLIDE;
    }

    public void archiver(String motif) {
        this.archive = true;
        this.motifArchivage = motif;
    }
}
