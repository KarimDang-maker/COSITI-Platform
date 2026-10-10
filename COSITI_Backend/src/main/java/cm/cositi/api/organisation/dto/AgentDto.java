package cm.cositi.api.organisation.dto;

import cm.cositi.api.workflow.entite.StatutValidationEntite;
import cm.cositi.api.organisation.entite.Agent;

import java.math.BigDecimal;
import java.util.UUID;

public record AgentDto(
        UUID id,
        String codeAgent,
        String nomComplet,
        String telephone,
        UUID zoneId,
        UUID utilisateurId,
        UUID chefAgentId,
        BigDecimal objectifCollecteMensuel,
        boolean actif,
        String motDePasseInitial,
        /** Statut de validation du profil (workflow) : VALIDE = officiel, modifications par demande uniquement. */
        StatutValidationEntite statutValidation,
        Long version
) {
    public static AgentDto depuis(Agent a) {
        return new AgentDto(a.getId(), a.getCodeAgent(), a.getNomComplet(), a.getTelephone(), a.getZoneId(),
                a.getUtilisateurId(), a.getChefAgentId(), a.getObjectifCollecteMensuel(), a.isActif(), null,
                a.getStatutValidation(), a.getVersion());
    }

    public static AgentDto avecMotDePasseInitial(Agent a, String motDePasseInitial) {
        AgentDto base = depuis(a);
        return new AgentDto(base.id(), base.codeAgent(), base.nomComplet(), base.telephone(), base.zoneId(),
                base.utilisateurId(), base.chefAgentId(), base.objectifCollecteMensuel(), base.actif(),
                motDePasseInitial, base.statutValidation(), base.version());
    }
}
