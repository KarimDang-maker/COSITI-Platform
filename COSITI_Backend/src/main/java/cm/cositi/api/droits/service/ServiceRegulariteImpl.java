package cm.cositi.api.droits.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.service.ServiceAdherent;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.droits.dto.AdherentEnRetardDto;
import cm.cositi.api.droits.dto.CritereRetard;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * docs/02_CLASSES_ET_METHODES.md §5. Le seuil de bascule en retard est toujours lu depuis
 * {@code DELAI_RETARD_JOURS} (table {@code parametre}), jamais codé en dur (le prototype existant codait 30
 * jours en dur — {@code AGENTS.md} règle absolue n°1).
 */
@Service
public class ServiceRegulariteImpl implements ServiceRegularite {

    private static final Logger LOG = LoggerFactory.getLogger(ServiceRegulariteImpl.class);
    private static final String CLE_DELAI_RETARD = "DELAI_RETARD_JOURS";

    private final AdherentRepository adherentRepository;
    private final ServiceParametre serviceParametre;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAdherent serviceAdherent;
    private final RoleRepository roleRepository;
    private final JdbcTemplate jdbcTemplate;

    public ServiceRegulariteImpl(AdherentRepository adherentRepository, ServiceParametre serviceParametre,
                                  ServicePerimetreDonnees perimetre, ServiceAdherent serviceAdherent,
                                  RoleRepository roleRepository, JdbcTemplate jdbcTemplate) {
        this.adherentRepository = adherentRepository;
        this.serviceParametre = serviceParametre;
        this.perimetre = perimetre;
        this.serviceAdherent = serviceAdherent;
        this.roleRepository = roleRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public StatutRegularite evaluer(UUID adherentId, LocalDate dateReference) {
        Adherent adherent = adherentRepository.findById(adherentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
        LocalDate couvertJusquAu = couvertJusquAu(adherentId);
        if (couvertJusquAu == null) {
            return StatutRegularite.JAMAIS_COTISE;
        }
        long retard = ChronoUnit.DAYS.between(couvertJusquAu, dateReference);
        if (retard <= 0) {
            return StatutRegularite.A_JOUR;
        }
        int seuil = serviceParametre.entier(CLE_DELAI_RETARD);
        return retard <= seuil ? StatutRegularite.PARTIELLEMENT_A_JOUR : StatutRegularite.EN_RETARD;
    }

    private LocalDate couvertJusquAu(UUID adherentId) {
        return jdbcTemplate.query(
                "SELECT MAX(date_fin) AS couvert_jusqu_a FROM periode_droits WHERE adherent_id = ? AND statut <> 'ANNULEE'",
                rs -> rs.next() ? rs.getObject("couvert_jusqu_a", LocalDate.class) : null, adherentId);
    }

    @Override
    @PreAuthorize("hasAuthority('DROITS:LIRE')")
    public ReponsePaginee<AdherentEnRetardDto> retardataires(CritereRetard critere, Pageable pageable, Utilisateur utilisateur) {
        LocalDate aujourdhui = LocalDate.now();
        int seuilMinimum = critere.joursRetardMin() != null ? critere.joursRetardMin() : 1;

        Specification<Adherent> spec = Specification.<Adherent>where(null)
                .and(perimetre.perimetreAdherent(utilisateur))
                .and((root, query, cb) -> cb.equal(root.get("archive"), false));
        if (critere.zoneId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("zoneId"), critere.zoneId()));
        }

        Set<UUID> restrictionAgent = critere.agentId() != null ? new HashSet<>(jdbcTemplate.queryForList(
                "SELECT adherent_id FROM affectation_portefeuille WHERE agent_id = ? AND date_fin IS NULL",
                UUID.class, critere.agentId())) : null;
        Set<UUID> restrictionPack = critere.packId() != null ? new HashSet<>(jdbcTemplate.queryForList(
                "SELECT adherent_id FROM adhesion WHERE pack_id = ? AND date_fin IS NULL",
                UUID.class, critere.packId())) : null;

        List<Adherent> candidats = adherentRepository.findAll(spec);
        List<AdherentEnRetardDto> enRetard = candidats.stream()
                .filter(a -> restrictionAgent == null || restrictionAgent.contains(a.getId()))
                .filter(a -> restrictionPack == null || restrictionPack.contains(a.getId()))
                .map(a -> {
                    LocalDate couvert = couvertJusquAu(a.getId());
                    long retard = couvert == null
                            ? ChronoUnit.DAYS.between(a.getDateAdhesion(), aujourdhui)
                            : ChronoUnit.DAYS.between(couvert, aujourdhui);
                    return new AdherentEnRetardDto(a.getId(), a.getMatricule(), a.getNomComplet(), couvert, (int) retard);
                })
                .filter(dto -> dto.joursRetard() >= seuilMinimum)
                .sorted(Comparator.comparingInt(AdherentEnRetardDto::joursRetard).reversed())
                .collect(Collectors.toList());

        int debut = (int) Math.min((long) pageable.getPageNumber() * pageable.getPageSize(), enRetard.size());
        int fin = Math.min(debut + pageable.getPageSize(), enRetard.size());
        Page<AdherentEnRetardDto> page = new PageImpl<>(enRetard.subList(debut, fin), pageable, enRetard.size());
        return ReponsePaginee.depuis(page);
    }

    @Override
    @Scheduled(cron = "0 0 2 * * *")
    public void rafraichirStatutsQuotidiens() {
        Role roleGestionnaire = roleRepository.findByCode("GESTIONNAIRE_COMPTE")
                .orElseThrow(() -> new IllegalStateException("Rôle GESTIONNAIRE_COMPTE introuvable — migrations incomplètes."));
        Utilisateur planificateur = new Utilisateur("PLANIFICATEUR_DROITS", "N/A",
                "Planificateur des statuts de régularité (tâche système)");
        planificateur.ajouterRole(roleGestionnaire);

        SecurityContext contexteAnterieur = SecurityContextHolder.getContext();
        try {
            SecurityContext contexteSysteme = SecurityContextHolder.createEmptyContext();
            contexteSysteme.setAuthentication(new UsernamePasswordAuthenticationToken(
                    planificateur, null, planificateur.getAuthorities()));
            SecurityContextHolder.setContext(contexteSysteme);

            LocalDate aujourdhui = LocalDate.now();
            List<Adherent> adherents = adherentRepository.findAll().stream()
                    .filter(a -> !a.isArchive() && a.getStatut() != StatutAdherent.RADIE)
                    .collect(Collectors.toList());

            for (Adherent adherent : adherents) {
                try {
                    StatutRegularite regularite = evaluer(adherent.getId(), aujourdhui);
                    StatutAdherent nouveau = switch (regularite) {
                        case EN_RETARD -> StatutAdherent.EN_RETARD;
                        case A_JOUR, PARTIELLEMENT_A_JOUR -> StatutAdherent.ACTIF;
                        case JAMAIS_COTISE -> adherent.getStatut();
                    };
                    if (nouveau != adherent.getStatut()) {
                        serviceAdherent.changerStatut(adherent.getId(), nouveau,
                                "Rafraîchissement quotidien automatique du statut de régularité", planificateur);
                    }
                } catch (Exception e) {
                    LOG.error("Échec du rafraîchissement du statut de régularité pour l'adhérent {}", adherent.getId(), e);
                }
            }
        } finally {
            SecurityContextHolder.setContext(contexteAnterieur);
        }
    }
}
