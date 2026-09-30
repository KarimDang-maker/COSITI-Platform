package cm.cositi.api.compterendu.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.compterendu.dto.CompteRenduDto;
import cm.cositi.api.compterendu.dto.ConsolidationDto;
import cm.cositi.api.compterendu.dto.CreationCompteRenduDto;
import cm.cositi.api.compterendu.entite.CompteRendu;
import cm.cositi.api.compterendu.entite.CompteRenduSource;
import cm.cositi.api.compterendu.entite.StatutCompteRendu;
import cm.cositi.api.compterendu.entite.TypeCompteRendu;
import cm.cositi.api.compterendu.repository.CompteRenduRepository;
import cm.cositi.api.compterendu.repository.CompteRenduSourceRepository;
import cm.cositi.api.notification.ServiceNotification;
import cm.cositi.api.securite.entite.Utilisateur;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Chaîne Agent → Gestionnaire → DGA (jalon J8).
 *
 * <p><b>Ce que consolider fait, et ce qu'il ne fait pas.</b> Il additionne les indicateurs des sources —
 * une addition n'est pas une règle métier inventée — et conserve le lien vers chaque source. Il ne pondère
 * rien, ne déduit aucun taux, ne compare pas les déclarations aux paiements enregistrés : ce rapprochement
 * relèverait d'une règle que la COSITI n'a pas validée.</p>
 *
 * <p><b>Destinataires.</b> Un compte rendu terrain part vers le Gestionnaire des comptes, un consolidé vers
 * la DGA. Comme ces destinataires sont des <i>fonctions</i> et non des personnes désignées, la notification
 * est adressée au rôle (voir {@code ServiceNotification.notifierRoles}) et le champ
 * {@code destinataire_utilisateur_id} n'est renseigné que lorsqu'un destinataire unique existe réellement.
 * Si personne ne porte le rôle, l'opération aboutit mais l'absence de destinataire est journalisée — un
 * compte rendu perdu faute de destinataire serait pire qu'un compte rendu non transmis.</p>
 */
@Service
public class ServiceCompteRenduImpl implements ServiceCompteRendu {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceCompteRenduImpl.class);

    private static final String ROLE_GESTIONNAIRE = "GESTIONNAIRE_COMPTE";
    private static final String ROLE_DGA = "DGA";

    private final CompteRenduRepository compteRenduRepository;
    private final CompteRenduSourceRepository sourceRepository;
    private final ServiceNotification serviceNotification;
    private final ServiceAudit serviceAudit;
    private final JdbcTemplate jdbcTemplate;

    public ServiceCompteRenduImpl(CompteRenduRepository compteRenduRepository,
                                   CompteRenduSourceRepository sourceRepository,
                                   ServiceNotification serviceNotification, ServiceAudit serviceAudit,
                                   JdbcTemplate jdbcTemplate) {
        this.compteRenduRepository = compteRenduRepository;
        this.sourceRepository = sourceRepository;
        this.serviceNotification = serviceNotification;
        this.serviceAudit = serviceAudit;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @PreAuthorize("hasAuthority('COMPTE_RENDU:PRODUIRE')")
    @Transactional
    public CompteRenduDto produire(CreationCompteRenduDto dto, Utilisateur agent) {
        verifierPeriode(dto.periodeDebut(), dto.periodeFin());

        if (agent.getAgentId() == null) {
            throw new ExceptionValidation("COMPTE_RENDU_SANS_AGENT",
                    "Votre compte n'est rattaché à aucun agent de terrain : impossible de produire un compte rendu.");
        }

        CompteRendu compteRendu = new CompteRendu(TypeCompteRendu.TERRAIN, agent.getId(), dto.periodeDebut(),
                dto.periodeFin());
        // L'agent et la zone viennent du compte connecté, jamais du corps de la requête : un agent ne produit
        // pas un compte rendu au nom d'un autre.
        compteRendu.setAgentId(agent.getAgentId());
        compteRendu.setZoneId(zoneDeAgent(agent.getAgentId()));
        appliquer(compteRendu, dto);

        compteRendu = compteRenduRepository.save(compteRendu);
        serviceAudit.tracer(TypeOperation.COMPTE_RENDU_CREATION, "compte_rendu", compteRendu.getId(), null,
                CompteRenduDto.depuis(compteRendu), "Brouillon de compte rendu terrain");

        return CompteRenduDto.depuis(compteRendu);
    }

    @Override
    @PreAuthorize("hasAuthority('COMPTE_RENDU:PRODUIRE')")
    @Transactional
    public CompteRenduDto modifier(UUID compteRenduId, CreationCompteRenduDto dto, Utilisateur auteur) {
        CompteRendu compteRendu = charger(compteRenduId);
        exigerAuteur(compteRendu, auteur);
        verifierPeriode(dto.periodeDebut(), dto.periodeFin());

        if (!compteRendu.getStatut().estModifiable()) {
            throw new ExceptionConflit("COMPTE_RENDU_NON_MODIFIABLE",
                    "Ce compte rendu est " + compteRendu.getStatut() + " : il n'est plus modifiable.");
        }

        appliquer(compteRendu, dto);
        compteRendu = compteRenduRepository.save(compteRendu);
        return CompteRenduDto.depuis(compteRendu);
    }

    @Override
    @PreAuthorize("hasAuthority('COMPTE_RENDU:LIRE')")
    @Transactional
    public CompteRenduDto transmettre(UUID compteRenduId, Utilisateur auteur) {
        CompteRendu compteRendu = charger(compteRenduId);
        exigerAuteur(compteRendu, auteur);

        if (compteRendu.getStatut() != StatutCompteRendu.BROUILLON) {
            throw new ExceptionConflit("COMPTE_RENDU_DEJA_TRANSMIS",
                    "Ce compte rendu est déjà " + compteRendu.getStatut() + ".");
        }

        boolean versDga = compteRendu.getType() == TypeCompteRendu.CONSOLIDE;
        String roleDestinataire = versDga ? ROLE_DGA : ROLE_GESTIONNAIRE;

        compteRendu.transmettre(null);
        compteRendu = compteRenduRepository.save(compteRendu);

        int destinataires = serviceNotification.notifierRoles(List.of(roleDestinataire),
                versDga ? "COMPTE_RENDU_CONSOLIDE" : "COMPTE_RENDU_TERRAIN",
                versDga ? "Compte rendu consolidé reçu" : "Compte rendu terrain reçu",
                "Période du " + compteRendu.getPeriodeDebut() + " au " + compteRendu.getPeriodeFin()
                        + ", transmis par " + auteur.getIdentifiant() + ".",
                "compte_rendu", compteRendu.getId());

        if (destinataires == 0) {
            JOURNAL.warn("Compte rendu {} transmis sans destinataire : aucun utilisateur actif ne porte le rôle {}",
                    compteRendu.getId(), roleDestinataire);
        }

        serviceAudit.tracer(TypeOperation.COMPTE_RENDU_TRANSMISSION, "compte_rendu", compteRendu.getId(),
                StatutCompteRendu.BROUILLON, StatutCompteRendu.TRANSMIS,
                "Transmis au rôle " + roleDestinataire + " (" + destinataires + " destinataire(s))");

        return CompteRenduDto.depuis(compteRendu, sourceRepository.sourcesDuConsolide(compteRendu.getId()));
    }

    @Override
    @PreAuthorize("hasAuthority('COMPTE_RENDU:CONTROLER')")
    @Transactional
    public CompteRenduDto controler(UUID compteRenduId, String observation, Utilisateur gestionnaire) {
        CompteRendu compteRendu = charger(compteRenduId);

        if (compteRendu.getType() != TypeCompteRendu.TERRAIN) {
            throw new ExceptionValidation("COMPTE_RENDU_TYPE_INATTENDU",
                    "Seul un compte rendu terrain se contrôle ; un consolidé est produit par le Gestionnaire.");
        }
        if (compteRendu.getStatut() != StatutCompteRendu.TRANSMIS) {
            throw new ExceptionConflit("COMPTE_RENDU_NON_CONTROLABLE",
                    "Ce compte rendu est " + compteRendu.getStatut()
                            + " : seul un compte rendu transmis peut être contrôlé.");
        }
        // Séparation des responsabilités (AGENTS.md règle n°5) : on ne contrôle pas son propre compte rendu.
        // Le cas est réel — un Chef des agents de terrain porte AGENT_TERRAIN et pourrait cumuler les rôles.
        if (compteRendu.getAuteurUtilisateurId().equals(gestionnaire.getId())) {
            throw new ExceptionAutorisation("COMPTE_RENDU_AUTO_CONTROLE",
                    "Vous ne pouvez pas contrôler un compte rendu que vous avez produit.");
        }

        compteRendu.marquerControle(observation, gestionnaire.getIdentifiant());
        compteRendu = compteRenduRepository.save(compteRendu);

        serviceNotification.notifier(compteRendu.getAuteurUtilisateurId(), "COMPTE_RENDU_CONTROLE",
                "Votre compte rendu a été contrôlé",
                "Le Gestionnaire des comptes a examiné votre compte rendu du " + compteRendu.getPeriodeDebut()
                        + " au " + compteRendu.getPeriodeFin() + ".",
                "compte_rendu", compteRendu.getId());

        serviceAudit.tracer(TypeOperation.COMPTE_RENDU_CREATION, "compte_rendu", compteRendu.getId(),
                StatutCompteRendu.TRANSMIS, StatutCompteRendu.CONTROLE, observation);

        return CompteRenduDto.depuis(compteRendu);
    }

    @Override
    @PreAuthorize("hasAuthority('COMPTE_RENDU:CONSOLIDER')")
    @Transactional
    public CompteRenduDto consolider(ConsolidationDto dto, Utilisateur gestionnaire) {
        List<CompteRendu> sources = compteRenduRepository.findByIdInAndArchiveFalse(dto.compteRenduIds());

        if (sources.size() != dto.compteRenduIds().size()) {
            throw new ExceptionRessourceIntrouvable("COMPTE_RENDU_INTROUVABLE",
                    "Un ou plusieurs comptes rendus sources sont introuvables ou archivés.");
        }
        for (CompteRendu source : sources) {
            if (source.getType() != TypeCompteRendu.TERRAIN) {
                throw new ExceptionValidation("COMPTE_RENDU_SOURCE_INVALIDE",
                        "Seuls des comptes rendus terrain peuvent être consolidés.");
            }
            if (!source.getStatut().estConsolidable()) {
                throw new ExceptionConflit("COMPTE_RENDU_NON_CONTROLE",
                        "Le compte rendu " + source.getId() + " est " + source.getStatut()
                                + " : il doit être contrôlé avant d'être consolidé.");
            }
        }

        // La période couvre l'ensemble des sources : elle ne peut pas contredire ce qu'elle agrège.
        LocalDate debut = sources.stream().map(CompteRendu::getPeriodeDebut).min(Comparator.naturalOrder())
                .orElseThrow();
        LocalDate fin = sources.stream().map(CompteRendu::getPeriodeFin).max(Comparator.naturalOrder())
                .orElseThrow();

        CompteRendu consolide = new CompteRendu(TypeCompteRendu.CONSOLIDE, gestionnaire.getId(), debut, fin);
        consolide.setSynthese(dto.synthese());
        consolide.renseignerIndicateurs(
                sources.stream().mapToInt(CompteRendu::getNbVisites).sum(),
                sources.stream().mapToInt(CompteRendu::getNbAdherentsRencontres).sum(),
                sources.stream().mapToInt(CompteRendu::getNbAdherentsCrees).sum(),
                sources.stream().mapToInt(CompteRendu::getNbPaiementsEnregistres).sum(),
                sources.stream().map(CompteRendu::getMontantCollecte).reduce(BigDecimal.ZERO, BigDecimal::add));

        // Les difficultés remontées par le terrain sont concaténées, pas résumées : le Gestionnaire peut les
        // commenter dans sa synthèse, il ne les réécrit pas à la place des agents.
        String difficultes = sources.stream()
                .map(CompteRendu::getDifficultes)
                .filter(d -> d != null && !d.isBlank())
                .reduce((a, b) -> a + "\n---\n" + b)
                .orElse(null);
        consolide.setDifficultes(difficultes);

        // `saveAndFlush` : les liens de source sont insérés juste après et référencent cet identifiant.
        // Même classe de précaution qu'en J3/J4/J6 sur l'ordre de vidage d'Hibernate.
        consolide = compteRenduRepository.saveAndFlush(consolide);

        List<UUID> sourceIds = new ArrayList<>();
        for (CompteRendu source : sources) {
            sourceRepository.save(new CompteRenduSource(consolide.getId(), source.getId()));
            source.marquerConsolide();
            compteRenduRepository.save(source);
            sourceIds.add(source.getId());
        }

        serviceAudit.tracer(TypeOperation.COMPTE_RENDU_CONSOLIDATION, "compte_rendu", consolide.getId(), null,
                sourceIds, "Consolidation de " + sources.size() + " compte(s) rendu(s) terrain");

        return CompteRenduDto.depuis(consolide, sourceIds);
    }

    @Override
    @PreAuthorize("hasAuthority('COMPTE_RENDU:LIRE')")
    public CompteRenduDto consulter(UUID compteRenduId, Utilisateur demandeur) {
        CompteRendu compteRendu = charger(compteRenduId);
        verifierVisibilite(compteRendu, demandeur);
        return CompteRenduDto.depuis(compteRendu, sourceRepository.sourcesDuConsolide(compteRenduId));
    }

    @Override
    @PreAuthorize("hasAuthority('COMPTE_RENDU:LIRE')")
    public ReponsePaginee<CompteRenduDto> lister(TypeCompteRendu type, StatutCompteRendu statut, boolean recus,
                                                  Pageable pageable, Utilisateur demandeur) {
        Page<CompteRendu> page;
        if (recus) {
            page = compteRenduRepository
                    .findByDestinataireUtilisateurIdAndArchiveFalseOrderByPeriodeFinDesc(demandeur.getId(), pageable);
            if (page.isEmpty() && type != null && statut != null) {
                // Les comptes rendus sont adressés à un rôle, pas à une personne : quand aucun destinataire
                // nominatif n'est enregistré, la file de travail se lit par type et statut.
                page = compteRenduRepository
                        .findByTypeAndStatutAndArchiveFalseOrderByPeriodeFinDesc(type, statut, pageable);
            }
        } else if (type != null && statut != null) {
            page = compteRenduRepository.findByTypeAndStatutAndArchiveFalseOrderByPeriodeFinDesc(type, statut,
                    pageable);
        } else {
            page = compteRenduRepository
                    .findByAuteurUtilisateurIdAndArchiveFalseOrderByPeriodeFinDesc(demandeur.getId(), pageable);
        }

        return ReponsePaginee.depuis(page.map(c ->
                CompteRenduDto.depuis(c, sourceRepository.sourcesDuConsolide(c.getId()))));
    }

    // ------------------------------------------------------------------ Interne

    private void appliquer(CompteRendu compteRendu, CreationCompteRenduDto dto) {
        compteRendu.renseignerIndicateurs(dto.nbVisites(), dto.nbAdherentsRencontres(), dto.nbAdherentsCrees(),
                dto.nbPaiementsEnregistres(), dto.montantCollecte());
        compteRendu.setSynthese(dto.synthese());
        compteRendu.setDifficultes(dto.difficultes());
    }

    private static void verifierPeriode(LocalDate debut, LocalDate fin) {
        if (debut == null || fin == null) {
            throw new ExceptionValidation("COMPTE_RENDU_PERIODE_REQUISE",
                    "Les dates de début et de fin de période sont obligatoires.");
        }
        if (fin.isBefore(debut)) {
            throw new ExceptionValidation("COMPTE_RENDU_PERIODE_INVALIDE",
                    "La fin de période ne peut pas précéder son début.", "periodeFin");
        }
        if (debut.isAfter(LocalDate.now())) {
            throw new ExceptionValidation("COMPTE_RENDU_PERIODE_FUTURE",
                    "Un compte rendu porte sur une période écoulée, pas à venir.", "periodeDebut");
        }
    }

    private void exigerAuteur(CompteRendu compteRendu, Utilisateur utilisateur) {
        if (!compteRendu.getAuteurUtilisateurId().equals(utilisateur.getId())) {
            throw new ExceptionAutorisation("COMPTE_RENDU_ETRANGER",
                    "Ce compte rendu n'est pas le vôtre.");
        }
    }

    /**
     * Un compte rendu est visible par son auteur, par son destinataire nominatif, et par les rôles de
     * supervision (DGA, Gestionnaire des comptes, PCA, DG) qui suivent la chaîne hiérarchique. Le Chef des
     * agents de terrain voit ceux des agents qu'il supervise.
     */
    private void verifierVisibilite(CompteRendu compteRendu, Utilisateur demandeur) {
        if (compteRendu.getAuteurUtilisateurId().equals(demandeur.getId())) {
            return;
        }
        if (demandeur.getId().equals(compteRendu.getDestinataireUtilisateurId())) {
            return;
        }
        boolean superviseur = demandeur.possedeRole(ROLE_DGA) || demandeur.possedeRole(ROLE_GESTIONNAIRE)
                || demandeur.possedeRole("PCA") || demandeur.possedeRole("DG");
        if (superviseur) {
            return;
        }
        if (demandeur.possedeRole("CHEF_AGENT_TERRAIN") && demandeur.getAgentId() != null
                && compteRendu.getAgentId() != null && estSuperviseParle(compteRendu.getAgentId(), demandeur.getAgentId())) {
            return;
        }
        throw new ExceptionAutorisation("COMPTE_RENDU_HORS_PERIMETRE",
                "Ce compte rendu n'appartient pas à votre périmètre.");
    }

    private boolean estSuperviseParle(UUID agentId, UUID chefAgentId) {
        Integer nombre = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM agent WHERE id = ? AND chef_agent_id = ?", Integer.class, agentId, chefAgentId);
        return nombre != null && nombre > 0;
    }

    private UUID zoneDeAgent(UUID agentId) {
        try {
            return jdbcTemplate.queryForObject("SELECT zone_id FROM agent WHERE id = ?", UUID.class, agentId);
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    private CompteRendu charger(UUID id) {
        return compteRenduRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("COMPTE_RENDU_INTROUVABLE",
                        "Compte rendu introuvable."));
    }
}
