package cm.cositi.api.organisation.service;

import cm.cositi.api.audit.AuditLigneDto;
import cm.cositi.api.audit.JournalAudit;
import cm.cositi.api.audit.JournalAuditRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.organisation.dto.AgentDto;
import cm.cositi.api.organisation.dto.ChangerStatutAgentDto;
import cm.cositi.api.organisation.dto.CreationAgentDto;
import cm.cositi.api.organisation.dto.CritereRechercheAgent;
import cm.cositi.api.organisation.dto.HistoriqueDesignationChefDto;
import cm.cositi.api.organisation.dto.ModificationAgentDto;
import cm.cositi.api.organisation.entite.Agent;
import cm.cositi.api.organisation.entite.HistoriqueDesignationChef;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.organisation.repository.HistoriqueDesignationChefRepository;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceAgentImpl implements ServiceAgent {

    private static final String CARACTERES_MOT_DE_PASSE =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    private static final int LONGUEUR_MOT_DE_PASSE_INITIAL = 16;
    private static final SecureRandom ALEATOIRE = new SecureRandom();

    private final AgentRepository agentRepository;
    private final HistoriqueDesignationChefRepository historiqueRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder encodeurMotDePasse;
    private final JdbcTemplate jdbcTemplate;
    private final ServiceAudit serviceAudit;
    private final JournalAuditRepository journalAuditRepository;
    private final ApplicationEventPublisher publicateurEvenements;

    public ServiceAgentImpl(AgentRepository agentRepository, HistoriqueDesignationChefRepository historiqueRepository,
                             UtilisateurRepository utilisateurRepository, RoleRepository roleRepository,
                             PasswordEncoder encodeurMotDePasse, JdbcTemplate jdbcTemplate, ServiceAudit serviceAudit,
                             JournalAuditRepository journalAuditRepository,
                             ApplicationEventPublisher publicateurEvenements) {
        this.agentRepository = agentRepository;
        this.historiqueRepository = historiqueRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.roleRepository = roleRepository;
        this.encodeurMotDePasse = encodeurMotDePasse;
        this.jdbcTemplate = jdbcTemplate;
        this.serviceAudit = serviceAudit;
        this.journalAuditRepository = journalAuditRepository;
        this.publicateurEvenements = publicateurEvenements;
    }

    private void exigerDga(Utilisateur utilisateur, String action) {
        if (!utilisateur.possedeRole("DGA")) {
            throw new ExceptionAutorisation("ORGANISATION_RESERVE_DGA",
                    "Seule la DGA peut " + action + ".");
        }
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public ReponsePaginee<AgentDto> lister(CritereRechercheAgent critere, Pageable pageable, Utilisateur demandeur) {
        Specification<Agent> spec = SpecificationsAgent.depuisCritere(critere);
        Page<AgentDto> page = agentRepository.findAll(spec, pageable).map(AgentDto::depuis);
        return ReponsePaginee.depuis(page);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public AgentDto consulter(UUID id, Utilisateur demandeur) {
        return AgentDto.depuis(charger(id));
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:GERER')")
    @Transactional
    public AgentDto creerParDga(CreationAgentDto dto, Utilisateur dga) {
        exigerDga(dga, "ajouter un agent de terrain");

        if (utilisateurRepository.existsByIdentifiant(dto.identifiantConnexion())) {
            throw new ExceptionConflit("UTILISATEUR_IDENTIFIANT_EXISTANT",
                    "Cet identifiant de connexion est déjà utilisé.");
        }

        Role roleAgentTerrain = roleRepository.findByCode("AGENT_TERRAIN")
                .orElseThrow(() -> new IllegalStateException("Rôle AGENT_TERRAIN introuvable — migrations incomplètes."));

        String motDePasseClair = genererMotDePasseInitial();
        Utilisateur compte = new Utilisateur(dto.identifiantConnexion(),
                encodeurMotDePasse.encode(motDePasseClair), dto.nomComplet());
        compte.setDoitChangerMotDePasse(true);
        compte.setTelephone(dto.telephone());
        compte.ajouterRole(roleAgentTerrain);
        compte = utilisateurRepository.save(compte);

        Long valeurSequence = jdbcTemplate.queryForObject("SELECT nextval('seq_code_agent')", Long.class);
        String codeAgent = "AG-" + String.format("%05d", valeurSequence);

        Agent agent = new Agent(codeAgent, dto.nomComplet(), dto.telephone(), dto.zoneId());
        agent.setObjectifCollecteMensuel(dto.objectifCollecteMensuel());
        agent.setUtilisateurId(compte.getId());
        agent.setCreeParDgaId(dga.getId());
        agent = agentRepository.save(agent);

        compte.setAgentId(agent.getId());
        utilisateurRepository.save(compte);

        serviceAudit.tracer(TypeOperation.AGENT_CREATION_PAR_DGA, "agent", agent.getId(), null,
                AgentDto.depuis(agent), "Créé par la DGA " + dga.getIdentifiant());
        publicateurEvenements.publishEvent(new AgentModifieEvent(agent.getId(), "CREATION"));

        return AgentDto.avecMotDePasseInitial(agent, motDePasseClair);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:GERER')")
    @Transactional
    public AgentDto modifier(UUID id, ModificationAgentDto dto, Utilisateur dga) {
        exigerDga(dga, "modifier la fiche d'un agent de terrain");
        Agent agent = charger(id);
        AgentDto avant = AgentDto.depuis(agent);

        agent.setNomComplet(dto.nomComplet());
        agent.setTelephone(dto.telephone());
        if (dto.zoneId() != null) {
            agent.setZoneId(dto.zoneId());
        }
        agent.setObjectifCollecteMensuel(dto.objectifCollecteMensuel());
        agent = agentRepository.save(agent);

        serviceAudit.tracer(TypeOperation.AGENT_MODIFICATION, "agent", agent.getId(), avant,
                AgentDto.depuis(agent), null);
        publicateurEvenements.publishEvent(new AgentModifieEvent(agent.getId(), "MODIFICATION"));
        return AgentDto.depuis(agent);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:GERER')")
    @Transactional
    public AgentDto changerStatut(UUID id, ChangerStatutAgentDto dto, Utilisateur dga) {
        exigerDga(dga, "activer ou désactiver un agent de terrain");
        if (dto.motif() == null || dto.motif().isBlank()) {
            throw new ExceptionValidation("AGENT_MOTIF_REQUIS", "Le motif du changement de statut est obligatoire.");
        }
        Agent agent = charger(id);
        if (agent.isActif() == dto.actif()) {
            throw new ExceptionConflit("AGENT_STATUT_INCHANGE", "L'agent a déjà ce statut.");
        }
        boolean avant = agent.isActif();
        agent.setActif(dto.actif());
        agent = agentRepository.save(agent);

        serviceAudit.tracer(TypeOperation.AGENT_CHANGEMENT_STATUT, "agent", agent.getId(), avant,
                dto.actif(), dto.motif());
        publicateurEvenements.publishEvent(new AgentModifieEvent(agent.getId(), "CHANGEMENT_STATUT"));
        return AgentDto.depuis(agent);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:GERER')")
    @Transactional
    public AgentDto affecter(UUID agentId, UUID zoneId, Utilisateur dga) {
        exigerDga(dga, "affecter un agent à une zone");
        Agent agent = charger(agentId);
        agent.setZoneId(zoneId);
        agent = agentRepository.save(agent);
        serviceAudit.tracer(TypeOperation.AGENT_CREATION_PAR_DGA, "agent", agent.getId(), null,
                AgentDto.depuis(agent), "Affectation à la zone " + zoneId);
        return AgentDto.depuis(agent);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:DESIGNER_CHEF')")
    @Transactional
    public AgentDto designerChef(UUID agentId, String motif, Utilisateur dga) {
        exigerDga(dga, "désigner le Chef des agents de terrain");
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("ORGANISATION_MOTIF_REQUIS", "Le motif de désignation est obligatoire.");
        }
        Agent candidat = charger(agentId);
        if (!candidat.isActif()) {
            throw new ExceptionValidation("ORGANISATION_AGENT_INACTIF", "Un agent inactif ne peut pas être désigné Chef.");
        }
        if (candidat.getZoneId() == null) {
            throw new ExceptionValidation("ORGANISATION_AGENT_SANS_ZONE", "L'agent doit appartenir à une zone.");
        }
        if (candidat.getUtilisateurId() == null) {
            throw new ExceptionValidation("ORGANISATION_AGENT_SANS_COMPTE",
                    "L'agent doit avoir un compte de connexion pour être désigné Chef.");
        }
        UUID zoneId = candidat.getZoneId();
        if (historiqueRepository.findTopByZoneIdOrderByHorodatageDesc(zoneId).isPresent()) {
            throw new ExceptionConflit("ORGANISATION_CHEF_DEJA_DESIGNE",
                    "Un Chef existe déjà pour cette zone — utilisez le remplacement.");
        }

        appliquerDesignation(zoneId, candidat, null, dga, motif, TypeOperation.AGENT_DESIGNATION_CHEF);
        return AgentDto.depuis(candidat);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:DESIGNER_CHEF')")
    @Transactional
    public AgentDto remplacerChef(UUID nouvelAgentId, String motif, Utilisateur dga) {
        exigerDga(dga, "remplacer le Chef des agents de terrain");
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("ORGANISATION_MOTIF_REQUIS", "Le motif de remplacement est obligatoire.");
        }
        Agent nouveauChef = charger(nouvelAgentId);
        if (nouveauChef.getZoneId() == null || nouveauChef.getUtilisateurId() == null) {
            throw new ExceptionValidation("ORGANISATION_AGENT_SANS_COMPTE",
                    "L'agent doit appartenir à une zone et avoir un compte de connexion.");
        }
        UUID zoneId = nouveauChef.getZoneId();
        HistoriqueDesignationChef dernier = historiqueRepository.findTopByZoneIdOrderByHorodatageDesc(zoneId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ORGANISATION_AUCUN_CHEF",
                        "Aucun Chef actuel pour cette zone — utilisez la désignation initiale."));

        UUID ancienChefId = dernier.getAgentId();
        if (ancienChefId.equals(nouveauChef.getId())) {
            throw new ExceptionConflit("ORGANISATION_DEJA_CHEF", "Cet agent est déjà le Chef de cette zone.");
        }
        agentRepository.findById(ancienChefId).ifPresent(ancienChef -> {
            if (ancienChef.getUtilisateurId() != null) {
                utilisateurRepository.findById(ancienChef.getUtilisateurId()).ifPresent(u -> {
                    roleRepository.findByCode("CHEF_AGENT_TERRAIN").ifPresent(u::retirerRole);
                    utilisateurRepository.save(u);
                });
            }
        });

        appliquerDesignation(zoneId, nouveauChef, ancienChefId, dga, motif, TypeOperation.AGENT_REMPLACEMENT_CHEF);
        return AgentDto.depuis(nouveauChef);
    }

    private void appliquerDesignation(UUID zoneId, Agent nouveauChef, UUID ancienChefId, Utilisateur dga,
                                       String motif, TypeOperation typeAudit) {
        List<Agent> agentsZone = agentRepository.findByZoneIdAndArchiveFalse(zoneId);
        for (Agent a : agentsZone) {
            if (a.getId().equals(nouveauChef.getId())) {
                continue;
            }
            a.setChefAgentId(nouveauChef.getId());
            agentRepository.save(a);
        }
        nouveauChef.setChefAgentId(null);
        agentRepository.save(nouveauChef);

        Role roleChef = roleRepository.findByCode("CHEF_AGENT_TERRAIN")
                .orElseThrow(() -> new IllegalStateException("Rôle CHEF_AGENT_TERRAIN introuvable — migrations incomplètes."));
        utilisateurRepository.findById(nouveauChef.getUtilisateurId()).ifPresent(u -> {
            u.ajouterRole(roleChef);
            utilisateurRepository.save(u);
        });

        HistoriqueDesignationChef historique = new HistoriqueDesignationChef(zoneId, nouveauChef.getId(),
                ancienChefId, dga.getId(), motif);
        historiqueRepository.save(historique);

        serviceAudit.tracer(typeAudit, "agent", nouveauChef.getId(), ancienChefId, nouveauChef.getId(), motif);
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public List<HistoriqueDesignationChefDto> historiqueChef(UUID zoneId) {
        return historiqueRepository.findByZoneIdOrderByHorodatageDesc(zoneId).stream()
                .map(HistoriqueDesignationChefDto::depuis)
                .collect(Collectors.toList());
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public AgentDto chefCourant(UUID zoneId) {
        HistoriqueDesignationChef dernier = historiqueRepository.findTopByZoneIdOrderByHorodatageDesc(zoneId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ORGANISATION_AUCUN_CHEF",
                        "Aucun Chef n'est désigné pour cette zone."));
        return AgentDto.depuis(charger(dernier.getAgentId()));
    }

    @Override
    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public List<AuditLigneDto> operations(UUID id, Instant depuis, Instant jusqua, Utilisateur demandeur) {
        charger(id);
        Specification<JournalAudit> spec = (root, query, cb) -> {
            var predicat = cb.and(cb.equal(root.get("entite"), "agent"), cb.equal(root.get("entiteId"), id));
            if (depuis != null) {
                predicat = cb.and(predicat, cb.greaterThanOrEqualTo(root.get("horodatage"), depuis));
            }
            if (jusqua != null) {
                predicat = cb.and(predicat, cb.lessThanOrEqualTo(root.get("horodatage"), jusqua));
            }
            return predicat;
        };
        return journalAuditRepository.findAll(spec,
                        org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "horodatage"))
                .stream()
                .map(AuditLigneDto::depuis)
                .toList();
    }

    private Agent charger(UUID id) {
        return agentRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("AGENT_INTROUVABLE", "Agent introuvable."));
    }

    private String genererMotDePasseInitial() {
        StringBuilder sb = new StringBuilder(LONGUEUR_MOT_DE_PASSE_INITIAL);
        for (int i = 0; i < LONGUEUR_MOT_DE_PASSE_INITIAL; i++) {
            sb.append(CARACTERES_MOT_DE_PASSE.charAt(ALEATOIRE.nextInt(CARACTERES_MOT_DE_PASSE.length())));
        }
        return sb.toString();
    }
}
