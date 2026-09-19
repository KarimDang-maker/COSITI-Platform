package cm.cositi.api.organisation;

import cm.cositi.api.commun.entite.EntiteArchivable;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "agent")
public class Agent extends EntiteArchivable {

    @Column(name = "code_agent", unique = true, nullable = false, length = 20)
    private String codeAgent;

    @Column(name = "nom_complet", nullable = false, length = 160)
    private String nomComplet;

    @Column(name = "telephone", nullable = false, length = 20)
    private String telephone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    @Column(name = "utilisateur_id")
    private UUID utilisateurId;

    @Column(name = "chef_agent_id")
    private UUID chefAgentId; // Référence au Chef des agents de terrain qui supervise

    @Column(name = "objectif_collecte_mensuel", precision = 14, scale = 2)
    private BigDecimal objectifCollecteMensuel;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    public String getCodeAgent() { return codeAgent; }
    public void setCodeAgent(String codeAgent) { this.codeAgent = codeAgent; }
    public String getNomComplet() { return nomComplet; }
    public void setNomComplet(String nomComplet) { this.nomComplet = nomComplet; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }
    public UUID getUtilisateurId() { return utilisateurId; }
    public void setUtilisateurId(UUID utilisateurId) { this.utilisateurId = utilisateurId; }
    public UUID getChefAgentId() { return chefAgentId; }
    public void setChefAgentId(UUID chefAgentId) { this.chefAgentId = chefAgentId; }
    public BigDecimal getObjectifCollecteMensuel() { return objectifCollecteMensuel; }
    public void setObjectifCollecteMensuel(BigDecimal objectifCollecteMensuel) { this.objectifCollecteMensuel = objectifCollecteMensuel; }
    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }
}
