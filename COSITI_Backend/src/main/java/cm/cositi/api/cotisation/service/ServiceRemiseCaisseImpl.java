package cm.cositi.api.cotisation.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.dto.RemiseCaisseDto;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.RemiseCaisse;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.cotisation.repository.RemiseCaisseRepository;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ServiceRemiseCaisseImpl implements ServiceRemiseCaisse {

    private final RemiseCaisseRepository remiseCaisseRepository;
    private final PaiementRepository paiementRepository;
    private final AgentRepository agentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ServiceAudit serviceAudit;

    public ServiceRemiseCaisseImpl(RemiseCaisseRepository remiseCaisseRepository, PaiementRepository paiementRepository,
                                    AgentRepository agentRepository, JdbcTemplate jdbcTemplate, ServiceAudit serviceAudit) {
        this.remiseCaisseRepository = remiseCaisseRepository;
        this.paiementRepository = paiementRepository;
        this.agentRepository = agentRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.serviceAudit = serviceAudit;
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CREER')")
    @Transactional
    public RemiseCaisseDto declarer(UUID agentId, List<UUID> paiementIds, Utilisateur auteur) {
        if (!agentRepository.existsById(agentId)) {
            throw new ExceptionRessourceIntrouvable("AGENT_INTROUVABLE", "Agent introuvable.");
        }
        List<Paiement> paiements = paiementRepository.findAllById(paiementIds);
        if (paiements.size() != paiementIds.size()) {
            throw new ExceptionValidation("PAIEMENT_INTROUVABLE", "Un ou plusieurs paiements sont introuvables.");
        }
        BigDecimal montantDeclare = paiements.stream().map(Paiement::getMontant).reduce(BigDecimal.ZERO, BigDecimal::add);

        RemiseCaisse remise = new RemiseCaisse(agentId, LocalDate.now(), montantDeclare, auteur.getIdentifiant());
        remise = remiseCaisseRepository.save(remise);

        for (Paiement p : paiements) {
            p.setRemiseCaisseId(remise.getId());
        }
        paiementRepository.saveAll(paiements);

        serviceAudit.tracer(TypeOperation.REMISE_CAISSE_DECLARATION, "remise_caisse", remise.getId(), null,
                RemiseCaisseDto.depuis(remise), null);
        return RemiseCaisseDto.depuis(remise);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:VALIDER')")
    @Transactional
    public RemiseCaisseDto receptionner(UUID remiseId, BigDecimal montantRecu, Utilisateur receveur) {
        RemiseCaisse remise = remiseCaisseRepository.findById(remiseId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("REMISE_CAISSE_INTROUVABLE", "Remise introuvable."));

        if (receveur.getAgentId() != null && receveur.getAgentId().equals(remise.getAgentId())) {
            throw new ExceptionAutorisation("REMISE_CAISSE_AUTO_RECEPTION_INTERDITE",
                    "Un agent ne peut pas réceptionner sa propre remise de caisse.");
        }

        remise.receptionner(montantRecu, receveur.getId());
        remiseCaisseRepository.saveAndFlush(remise);

        // `ecart` est une colonne GENERATED ALWAYS AS côté PostgreSQL : l'entité JPA gérée par le contexte de
        // persistance ne relit jamais silencieusement une colonne générée après un UPDATE (et un simple
        // repository.findById() renverrait la même instance mise en cache de premier niveau, pas une valeur
        // fraîche). On relit donc l'écart directement en SQL pour renvoyer la valeur réellement en base.
        BigDecimal ecartReel = jdbcTemplate.queryForObject("SELECT ecart FROM remise_caisse WHERE id = ?",
                BigDecimal.class, remise.getId());
        RemiseCaisseDto dto = new RemiseCaisseDto(remise.getId(), remise.getAgentId(), remise.getMontantDeclare(),
                remise.getMontantRecu(), ecartReel, remise.getStatut());

        serviceAudit.tracer(TypeOperation.REMISE_CAISSE_RECEPTION, "remise_caisse", remise.getId(), null, dto, null);
        if ("EN_ECART".equals(remise.getStatut())) {
            serviceAudit.tracer(TypeOperation.REMISE_CAISSE_ECART, "remise_caisse", remise.getId(), null,
                    ecartReel, "Écart détecté à la réception de la remise de caisse.");
        }
        return dto;
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public BigDecimal caisseEnAttente(UUID agentId) {
        BigDecimal montant = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(montant_declare), 0) FROM remise_caisse WHERE agent_id = ? AND statut = 'DECLAREE'",
                BigDecimal.class, agentId);
        return montant != null ? montant : BigDecimal.ZERO;
    }
}
