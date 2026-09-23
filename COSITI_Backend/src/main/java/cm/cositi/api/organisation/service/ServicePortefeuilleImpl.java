package cm.cositi.api.organisation.service;

import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.organisation.dto.ChargeAgentDto;
import cm.cositi.api.organisation.entite.AffectationPortefeuille;
import cm.cositi.api.organisation.entite.Agent;
import cm.cositi.api.organisation.repository.AffectationPortefeuilleRepository;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServicePortefeuilleImpl implements ServicePortefeuille {

    private final AffectationPortefeuilleRepository affectationRepository;
    private final AdherentRepository adherentRepository;
    private final AgentRepository agentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ServiceAudit serviceAudit;
    private final ServicePerimetreDonnees perimetre;
    private final ZoneRepository zoneRepository;

    public ServicePortefeuilleImpl(AffectationPortefeuilleRepository affectationRepository,
                                    AdherentRepository adherentRepository, AgentRepository agentRepository,
                                    JdbcTemplate jdbcTemplate, ServiceAudit serviceAudit,
                                    ServicePerimetreDonnees perimetre, ZoneRepository zoneRepository) {
        this.affectationRepository = affectationRepository;
        this.adherentRepository = adherentRepository;
        this.agentRepository = agentRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.serviceAudit = serviceAudit;
        this.perimetre = perimetre;
        this.zoneRepository = zoneRepository;
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:AFFECTER_PORTEFEUILLE')")
    @Transactional
    public void affecter(UUID adherentId, UUID agentId, String motif, Utilisateur auteur) {
        verifierAdherentEtAgent(adherentId, agentId);
        if (affectationRepository.findByAdherentIdAndDateFinIsNull(adherentId).isPresent()) {
            throw new ExceptionValidation("PORTEFEUILLE_DEJA_AFFECTE",
                    "Cet adhérent a déjà une affectation ouverte — utilisez le transfert.");
        }
        AffectationPortefeuille affectation = new AffectationPortefeuille(adherentId, agentId, LocalDate.now(),
                motif, auteur.getId());
        affectationRepository.save(affectation);
        serviceAudit.tracer(TypeOperation.PORTEFEUILLE_AFFECTATION, "affectation_portefeuille", affectation.getId(),
                null, affectation.getAgentId(), motif);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:AFFECTER_PORTEFEUILLE')")
    @Transactional
    public void transferer(UUID adherentId, UUID nouvelAgentId, String motif, Utilisateur auteur) {
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("PORTEFEUILLE_MOTIF_REQUIS", "Le motif du transfert est obligatoire.");
        }
        verifierAdherentEtAgent(adherentId, nouvelAgentId);

        affectationRepository.findByAdherentIdAndDateFinIsNull(adherentId).ifPresent(ouverte -> {
            ouverte.cloturer(LocalDate.now());
            // saveAndFlush (pas save) : Hibernate exécute par défaut TOUTES les insertions avant TOUTES les
            // mises à jour d'un même flush, quel que soit l'ordre d'appel Java — sans flush immédiat ici,
            // l'INSERT de la nouvelle affectation ci-dessous partirait avant cet UPDATE et violerait
            // l'index unique partiel (une seule affectation ouverte par adhérent).
            affectationRepository.saveAndFlush(ouverte);
        });

        AffectationPortefeuille nouvelle = new AffectationPortefeuille(adherentId, nouvelAgentId, LocalDate.now(),
                motif, auteur.getId());
        affectationRepository.save(nouvelle);
        serviceAudit.tracer(TypeOperation.PORTEFEUILLE_TRANSFERT, "affectation_portefeuille", nouvelle.getId(),
                null, nouvelAgentId, motif);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:AFFECTER_PORTEFEUILLE')")
    @Transactional
    public void transfererEnLot(List<UUID> adherentIds, UUID nouvelAgentId, String motif, Utilisateur auteur) {
        for (UUID adherentId : adherentIds) {
            transferer(adherentId, nouvelAgentId, motif, auteur);
        }
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public List<AdherentResumeDto> portefeuille(UUID agentId, Utilisateur demandeur) {
        List<UUID> adherentIds = affectationRepository.findByAgentIdAndDateFinIsNull(agentId).stream()
                .map(AffectationPortefeuille::getAdherentId)
                .collect(Collectors.toList());
        if (adherentIds.isEmpty()) {
            return List.of();
        }
        return enResumes(adherentRepository.findAllById(adherentIds));
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public List<AdherentResumeDto> sansAgentReferent(UUID zoneId) {
        List<UUID> ids = jdbcTemplate.query("""
                SELECT a.id FROM adherent a
                LEFT JOIN affectation_portefeuille ap ON ap.adherent_id = a.id AND ap.date_fin IS NULL
                WHERE a.zone_id = ? AND a.archive = false AND ap.id IS NULL
                """, (rs, rowNum) -> (UUID) rs.getObject("id"), zoneId);
        if (ids.isEmpty()) {
            return List.of();
        }
        return enResumes(adherentRepository.findAllById(ids));
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public ChargeAgentDto charge(UUID agentId, YearMonth periode) {
        charger(agentId, "AGENT_INTROUVABLE");
        int nombreAdherents = affectationRepository.findByAgentIdAndDateFinIsNull(agentId).size();
        Agent agent = charger(agentId, "AGENT_INTROUVABLE");
        // Montant collecté : nécessite le module Cotisation (jalon J4). Laissé à zéro ici, complété une fois
        // le paiement disponible — ne jamais inventer un chiffre financier (AGENTS.md règle absolue n°9).
        return new ChargeAgentDto(agentId, periode.toString(), nombreAdherents, BigDecimal.ZERO,
                agent.getObjectifCollecteMensuel());
    }

    private void verifierAdherentEtAgent(UUID adherentId, UUID agentId) {
        if (!adherentRepository.existsById(adherentId)) {
            throw new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable.");
        }
        charger(agentId, "AGENT_INTROUVABLE");
    }

    private Agent charger(UUID id, String code) {
        return agentRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable(code, "Agent introuvable."));
    }

    /**
     * Convertit une liste d'adhérents en résumés, libellé de zone compris.
     *
     * <p>Les zones sont chargées une fois pour toute la liste : le référentiel est petit et
     * stable, là où un accès par adhérent ferait une requête par ligne.</p>
     */
    private List<AdherentResumeDto> enResumes(List<cm.cositi.api.adherent.entite.Adherent> adherents) {
        Map<UUID, String> libellesZone = zoneRepository.findAll().stream()
                .collect(Collectors.toMap(z -> z.getId(), z -> z.getLibelle()));
        return adherents.stream()
                .map(a -> AdherentResumeDto.depuis(a, libellesZone.get(a.getZoneId())))
                .collect(Collectors.toList());
    }

}
