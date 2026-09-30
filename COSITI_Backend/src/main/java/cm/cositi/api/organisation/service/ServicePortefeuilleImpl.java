package cm.cositi.api.organisation.service;

import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.service.EvaluationCompletionAdherent;
import cm.cositi.api.adherent.service.SpecificationsAdherent;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.organisation.dto.AffectationPortefeuilleDto;
import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.dto.ChargeAgentDto;
import cm.cositi.api.organisation.dto.DistributionPortefeuilleDto;
import cm.cositi.api.organisation.dto.ResumePortefeuilleDto;
import cm.cositi.api.organisation.entite.AffectationPortefeuille;
import cm.cositi.api.organisation.entite.Agent;
import cm.cositi.api.organisation.repository.AffectationPortefeuilleRepository;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
    private final ServiceParametre serviceParametre;
    private final ApplicationEventPublisher publicateurEvenements;

    public ServicePortefeuilleImpl(AffectationPortefeuilleRepository affectationRepository,
                                    AdherentRepository adherentRepository, AgentRepository agentRepository,
                                    JdbcTemplate jdbcTemplate, ServiceAudit serviceAudit,
                                    ServicePerimetreDonnees perimetre, ZoneRepository zoneRepository,
                                    ServiceParametre serviceParametre, ApplicationEventPublisher publicateurEvenements) {
        this.affectationRepository = affectationRepository;
        this.adherentRepository = adherentRepository;
        this.agentRepository = agentRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.serviceAudit = serviceAudit;
        this.perimetre = perimetre;
        this.zoneRepository = zoneRepository;
        this.serviceParametre = serviceParametre;
        this.publicateurEvenements = publicateurEvenements;
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
        publicateurEvenements.publishEvent(new AgentModifieEvent(agentId, "PORTEFEUILLE_AFFECTATION"));
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
        publicateurEvenements.publishEvent(new AgentModifieEvent(nouvelAgentId, "PORTEFEUILLE_TRANSFERT"));
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
    @PreAuthorize("hasAuthority('ORGANISATION:AFFECTER_PORTEFEUILLE')")
    @Transactional
    public void retirer(UUID adherentId, String motif, Utilisateur auteur) {
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("PORTEFEUILLE_MOTIF_REQUIS", "Le motif du retrait est obligatoire.");
        }
        AffectationPortefeuille ouverte = affectationRepository.findByAdherentIdAndDateFinIsNull(adherentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("PORTEFEUILLE_AUCUNE_AFFECTATION",
                        "Cet adhérent n'a aucune affectation ouverte à retirer."));
        UUID agentId = ouverte.getAgentId();
        ouverte.cloturer(LocalDate.now());
        affectationRepository.save(ouverte);
        serviceAudit.tracer(TypeOperation.PORTEFEUILLE_RETRAIT, "affectation_portefeuille", ouverte.getId(),
                agentId, null, motif);
        publicateurEvenements.publishEvent(new AgentModifieEvent(agentId, "PORTEFEUILLE_RETRAIT"));
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public ReponsePaginee<AdherentResumeDto> portefeuille(UUID agentId, Pageable pageable, Utilisateur demandeur) {
        List<UUID> adherentIds = idsPortefeuille(agentId);
        if (adherentIds.isEmpty()) {
            return ReponsePaginee.depuis(Page.empty(pageable));
        }
        Specification<Adherent> spec = SpecificationsAdherent.avecIdentifiants(adherentIds);
        Page<Adherent> page = adherentRepository.findAll(spec, pageable);
        Map<UUID, String> libellesZone = zoneRepository.findAll().stream()
                .collect(Collectors.toMap(z -> z.getId(), z -> z.getLibelle()));
        return ReponsePaginee.depuis(page.map(a -> AdherentResumeDto.depuis(a, libellesZone.get(a.getZoneId()))));
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public ResumePortefeuilleDto resumePortefeuille(UUID agentId, Utilisateur demandeur) {
        List<UUID> adherentIds = idsPortefeuille(agentId);
        if (adherentIds.isEmpty()) {
            return new ResumePortefeuilleDto(0, 0, 0);
        }
        String champsBrut = serviceParametre.texte("CHAMPS_COMPLETION_ADHERENT");
        boolean regleValidee = serviceParametre.estValide("CHAMPS_COMPLETION_ADHERENT");

        List<Adherent> adherents = adherentRepository.findAllById(adherentIds);
        int complets = 0;
        for (Adherent a : adherents) {
            if (EvaluationCompletionAdherent.evaluer(a, champsBrut, regleValidee).pourcentage() == 100) {
                complets++;
            }
        }
        return new ResumePortefeuilleDto(adherents.size(), complets, adherents.size() - complets);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public List<AffectationPortefeuilleDto> historiquePortefeuille(UUID agentId, Utilisateur demandeur) {
        charger(agentId, "AGENT_INTROUVABLE");
        return affectationRepository.findByAgentIdOrderByDateDebutDesc(agentId).stream()
                .map(AffectationPortefeuilleDto::depuis)
                .toList();
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public List<DistributionPortefeuilleDto> distribution(Utilisateur demandeur) {
        List<Map<String, Object>> lignes = jdbcTemplate.queryForList("""
                SELECT a.id AS agent_id, a.code_agent, a.nom_complet, count(ap.id) AS nombre_adherents
                FROM agent a
                LEFT JOIN affectation_portefeuille ap ON ap.agent_id = a.id AND ap.date_fin IS NULL
                WHERE a.archive = false AND a.actif = true
                GROUP BY a.id, a.code_agent, a.nom_complet
                ORDER BY a.nom_complet
                """);
        return lignes.stream()
                .map(l -> new DistributionPortefeuilleDto((UUID) l.get("agent_id"), (String) l.get("code_agent"),
                        (String) l.get("nom_complet"), ((Number) l.get("nombre_adherents")).longValue()))
                .toList();
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

        // #20 — montant réellement collecté par l'agent sur la période (paiements VALIDE/RAPPROCHE),
        // corrige l'ancien TODO qui renvoyait toujours zéro : le module Cotisation est désormais disponible.
        BigDecimal montantCollecte = jdbcTemplate.queryForObject("""
                SELECT COALESCE(SUM(p.montant), 0) FROM paiement p
                WHERE p.agent_encaisseur_id = ? AND p.archive = false
                  AND p.statut IN ('VALIDE', 'RAPPROCHE')
                  AND date_trunc('month', p.date_paiement) = date_trunc('month', CAST(? AS date))
                """, BigDecimal.class, agentId, periode.atDay(1));

        return new ChargeAgentDto(agentId, periode.toString(), nombreAdherents, montantCollecte,
                agent.getObjectifCollecteMensuel());
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public AgentDto agentActuel(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        if (!adherentRepository.existsById(adherentId)) {
            throw new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable.");
        }
        UUID agentId = affectationRepository.findByAdherentIdAndDateFinIsNull(adherentId)
                .map(AffectationPortefeuille::getAgentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_SANS_AGENT",
                        "Aucun agent n'est actuellement affecté à cet adhérent."));
        return AgentDto.depuis(charger(agentId, "AGENT_INTROUVABLE"));
    }

    private List<UUID> idsPortefeuille(UUID agentId) {
        return affectationRepository.findByAgentIdAndDateFinIsNull(agentId).stream()
                .map(AffectationPortefeuille::getAdherentId)
                .toList();
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
