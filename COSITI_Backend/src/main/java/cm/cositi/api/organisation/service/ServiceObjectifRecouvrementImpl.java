package cm.cositi.api.organisation.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.organisation.dto.DecisionObjectifDto;
import cm.cositi.api.organisation.dto.ObjectifRecouvrementDto;
import cm.cositi.api.organisation.dto.PropositionObjectifDto;
import cm.cositi.api.organisation.entite.ObjectifRecouvrement;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.organisation.repository.ObjectifRecouvrementRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceObjectifRecouvrementImpl implements ServiceObjectifRecouvrement {

    private final ObjectifRecouvrementRepository repository;
    private final AgentRepository agentRepository;
    private final ServiceAudit serviceAudit;

    public ServiceObjectifRecouvrementImpl(ObjectifRecouvrementRepository repository, AgentRepository agentRepository,
                                            ServiceAudit serviceAudit) {
        this.repository = repository;
        this.agentRepository = agentRepository;
        this.serviceAudit = serviceAudit;
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:PROPOSER_OBJECTIF')")
    @Transactional
    public ObjectifRecouvrementDto proposer(UUID agentId, PropositionObjectifDto dto, Utilisateur auteur) {
        if (!agentRepository.existsById(agentId)) {
            throw new ExceptionRessourceIntrouvable("AGENT_INTROUVABLE", "Agent introuvable.");
        }
        // Une période = le premier jour du mois : deux propositions pour le même mois n'auraient pas de sens.
        java.time.LocalDate periode = dto.periode().withDayOfMonth(1);
        if (repository.findByAgentIdAndPeriode(agentId, periode).isPresent()) {
            throw new ExceptionConflit("OBJECTIF_DEJA_PROPOSE",
                    "Un objectif existe déjà pour cet agent sur cette période.");
        }

        ObjectifRecouvrement objectif = new ObjectifRecouvrement(agentId, periode, dto.montant(), auteur.getId());
        objectif = repository.save(objectif);

        serviceAudit.tracer(TypeOperation.OBJECTIF_RECOUVREMENT_PROPOSITION, "agent", agentId, null,
                ObjectifRecouvrementDto.depuis(objectif), "Proposé par " + auteur.getIdentifiant());

        return ObjectifRecouvrementDto.depuis(objectif);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:DECIDER_OBJECTIF')")
    @Transactional
    public ObjectifRecouvrementDto decider(UUID objectifId, DecisionObjectifDto dto, Utilisateur dga) {
        ObjectifRecouvrement objectif = repository.findById(objectifId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("OBJECTIF_INTROUVABLE", "Objectif introuvable."));
        if (objectif.getStatut() != ObjectifRecouvrement.Statut.PROPOSE) {
            throw new ExceptionConflit("OBJECTIF_DEJA_DECIDE", "Cet objectif a déjà été décidé.");
        }

        if (Boolean.TRUE.equals(dto.approuver())) {
            objectif.approuver(dga.getId(), dto.motif());
        } else {
            objectif.rejeter(dga.getId(), dto.motif());
        }
        objectif = repository.save(objectif);

        serviceAudit.tracer(TypeOperation.OBJECTIF_RECOUVREMENT_DECISION, "agent", objectif.getAgentId(), null,
                ObjectifRecouvrementDto.depuis(objectif),
                (Boolean.TRUE.equals(dto.approuver()) ? "Approuvé" : "Rejeté") + " par la DGA " + dga.getIdentifiant());

        return ObjectifRecouvrementDto.depuis(objectif);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public List<ObjectifRecouvrementDto> historique(UUID agentId) {
        return repository.findByAgentIdOrderByPeriodeDesc(agentId).stream()
                .map(ObjectifRecouvrementDto::depuis)
                .collect(Collectors.toList());
    }
}
