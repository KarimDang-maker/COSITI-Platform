package cm.cositi.api.organisation.entite;

import cm.cositi.api.commun.entite.EntiteArchivable;
import cm.cositi.api.workflow.entite.StatutValidationEntite;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * {@code chefAgentId} pointe vers l'agent qui EST actuellement le Chef DE cet agent (supervision descendante,
 * auto-référence déjà présente dans le schéma depuis V2). Voir la décision documentée dans
 * {@code V7__historique_designation_chef.sql} et {@code ServiceAgent} pour le mécanisme complet de désignation.
 */
@Entity
@Table(name = "agent")
public class Agent extends EntiteArchivable {

    @Column(name = "code_agent", nullable = false, unique = true, length = 20)
    private String codeAgent;

    @Column(name = "nom_complet", nullable = false, length = 160)
    private String nomComplet;

    @Column(name = "telephone", nullable = false, length = 20)
    private String telephone;

    @Column(name = "zone_id")
    private UUID zoneId;

    @Column(name = "utilisateur_id")
    private UUID utilisateurId;

    @Column(name = "chef_agent_id")
    private UUID chefAgentId;

    @Column(name = "objectif_collecte_mensuel", precision = 14, scale = 2)
    private BigDecimal objectifCollecteMensuel;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    @Column(name = "cree_par_dga_id")
    private UUID creeParDgaId;

    /** Statut de validation du profil (workflow V19), distinct du statut métier {@link #actif}. */
    @Enumerated(EnumType.STRING)
    @Column(name = "statut_validation", nullable = false, length = 30)
    private StatutValidationEntite statutValidation = StatutValidationEntite.BROUILLON;

    /** Verrouillage optimiste (V19) : un profil modifié pendant l'examen d'une demande invalide celle-ci. */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected Agent() {
    }

    public Agent(String codeAgent, String nomComplet, String telephone, UUID zoneId) {
        this.codeAgent = codeAgent;
        this.nomComplet = nomComplet;
        this.telephone = telephone;
        this.zoneId = zoneId;
    }

    public String getCodeAgent() {
        return codeAgent;
    }

    public String getNomComplet() {
        return nomComplet;
    }

    public void setNomComplet(String nomComplet) {
        this.nomComplet = nomComplet;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public UUID getZoneId() {
        return zoneId;
    }

    public void setZoneId(UUID zoneId) {
        this.zoneId = zoneId;
    }

    public UUID getUtilisateurId() {
        return utilisateurId;
    }

    public void setUtilisateurId(UUID utilisateurId) {
        this.utilisateurId = utilisateurId;
    }

    public UUID getChefAgentId() {
        return chefAgentId;
    }

    public void setChefAgentId(UUID chefAgentId) {
        this.chefAgentId = chefAgentId;
    }

    public BigDecimal getObjectifCollecteMensuel() {
        return objectifCollecteMensuel;
    }

    public void setObjectifCollecteMensuel(BigDecimal objectifCollecteMensuel) {
        this.objectifCollecteMensuel = objectifCollecteMensuel;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public UUID getCreeParDgaId() {
        return creeParDgaId;
    }

    public void setCreeParDgaId(UUID creeParDgaId) {
        this.creeParDgaId = creeParDgaId;
    }

    public StatutValidationEntite getStatutValidation() {
        return statutValidation;
    }

    public void setStatutValidation(StatutValidationEntite statutValidation) {
        this.statutValidation = statutValidation;
    }

    public Long getVersion() {
        return version;
    }
}
