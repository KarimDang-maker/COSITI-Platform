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
import cm.cositi.api.notification.ServiceNotification;
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
    private final ServiceNotification serviceNotification;

    /** Une cotisation annulée, rejetée ou encore en brouillon ne correspond à aucun argent à remettre. */
    private static final java.util.Set<cm.cositi.api.cotisation.entite.StatutPaiement> STATUTS_EXCLUS =
            java.util.EnumSet.of(cm.cositi.api.cotisation.entite.StatutPaiement.ANNULE,
                    cm.cositi.api.cotisation.entite.StatutPaiement.REJETE,
                    cm.cositi.api.cotisation.entite.StatutPaiement.BROUILLON);

    public ServiceRemiseCaisseImpl(RemiseCaisseRepository remiseCaisseRepository, PaiementRepository paiementRepository,
                                    AgentRepository agentRepository, JdbcTemplate jdbcTemplate, ServiceAudit serviceAudit,
                                    ServiceNotification serviceNotification) {
        this.remiseCaisseRepository = remiseCaisseRepository;
        this.paiementRepository = paiementRepository;
        this.agentRepository = agentRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.serviceAudit = serviceAudit;
        this.serviceNotification = serviceNotification;
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CREER')")
    @Transactional
    public RemiseCaisseDto declarer(UUID agentId, List<UUID> paiementIds, Utilisateur auteur) {
        if (!agentRepository.existsById(agentId)) {
            throw new ExceptionRessourceIntrouvable("AGENT_INTROUVABLE", "Agent introuvable.");
        }
        List<UUID> distincts = paiementIds.stream().distinct().toList();
        List<Paiement> paiements = paiementRepository.findAllById(distincts);
        if (paiements.size() != distincts.size()) {
            throw new ExceptionValidation("PAIEMENT_INTROUVABLE", "Un ou plusieurs paiements sont introuvables.");
        }
        // Une remise porte sur l'argent réellement collecté par CET agent, et une cotisation ne se remet qu'une
        // fois : sans ces contrôles, une même somme pouvait être déclarée deux fois ou au nom d'un autre agent.
        for (Paiement p : paiements) {
            if (!agentId.equals(p.getAgentEncaisseurId())) {
                throw new ExceptionValidation("REMISE_PAIEMENT_AUTRE_AGENT", "La cotisation " + p.getNumeroRecu()
                        + " n'a pas été encaissée par cet agent.", "paiementIds");
            }
            if (p.getRemiseCaisseId() != null) {
                throw new cm.cositi.api.commun.exception.ExceptionConflit("REMISE_PAIEMENT_DEJA_REMIS",
                        "La cotisation " + p.getNumeroRecu() + " fait déjà partie d'une remise de caisse.");
            }
            if (STATUTS_EXCLUS.contains(p.getStatut())) {
                throw new cm.cositi.api.commun.exception.ExceptionConflit("REMISE_PAIEMENT_NON_ENCAISSE",
                        "La cotisation " + p.getNumeroRecu() + " est " + p.getStatut() + " : elle ne se remet pas.");
            }
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
        // La DAF doit savoir qu'une remise l'attend : sans notification ni liste, elle ne pouvait pas la retrouver.
        serviceNotification.notifierRoles(List.of("DAF"), "REMISE_CAISSE_A_RECEPTIONNER",
                "Remise de caisse à réceptionner",
                "Remise de " + montantDeclare + " FCFA (" + paiements.size() + " cotisation(s)) déclarée le "
                        + remise.getDateRemise() + ".", "remise_caisse", remise.getId());
        return RemiseCaisseDto.depuis(remise, paiements.size());
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:VALIDER')")
    @Transactional
    public RemiseCaisseDto receptionner(UUID remiseId, BigDecimal montantRecu, Utilisateur receveur) {
        RemiseCaisse remise = remiseCaisseRepository.findById(remiseId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("REMISE_CAISSE_INTROUVABLE", "Remise introuvable."));

        if (!"DECLAREE".equals(remise.getStatut())) {
            throw new cm.cositi.api.commun.exception.ExceptionConflit("REMISE_CAISSE_DEJA_RECEPTIONNEE",
                    "Cette remise de caisse est déjà réceptionnée (statut " + remise.getStatut() + ").");
        }
        if (montantRecu == null || montantRecu.signum() < 0) {
            throw new ExceptionValidation("REMISE_MONTANT_INVALIDE", "Le montant reçu doit être positif ou nul.",
                    "montantRecu");
        }
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
                remise.getMontantRecu(), ecartReel, remise.getStatut(), remise.getDateRemise(), remise.getRecuLe(),
                remise.getCreeLe(), null);

        serviceAudit.tracer(TypeOperation.REMISE_CAISSE_RECEPTION, "remise_caisse", remise.getId(), null, dto, null);
        if ("EN_ECART".equals(remise.getStatut())) {
            serviceAudit.tracer(TypeOperation.REMISE_CAISSE_ECART, "remise_caisse", remise.getId(), null,
                    ecartReel, "Écart détecté à la réception de la remise de caisse.");

            // Exigence de docs/02_CLASSES_ET_METHODES.md §4 : « un écart non nul bascule la remise en
            // EN_ECART et crée une notification pour le DAF ». La seconde moitié n'était pas implémentable
            // avant le jalon J8 (aucun service de notification) — un TODO le signalait sur l'interface.
            serviceNotification.notifierRoles(List.of("DAF"), "REMISE_CAISSE_ECART",
                    "Écart sur une remise de caisse",
                    "La remise de caisse " + remise.getId() + " présente un écart de " + ecartReel
                            + " FCFA entre le montant déclaré et le montant reçu.",
                    "remise_caisse", remise.getId());
        }
        return dto;
    }

    @Override
    @PreAuthorize("hasAuthority('FINANCES:CONSULTER')")
    @Transactional(readOnly = true)
    public cm.cositi.api.commun.reponse.ReponsePaginee<RemiseCaisseDto> lister(String statut, UUID agentId, int page,
                                                                                 int taille) {
        var pageable = org.springframework.data.domain.PageRequest.of(Math.max(page, 0),
                Math.max(1, Math.min(taille, 200)), org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "dateRemise").and(
                        org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,
                                "creeLe")));
        org.springframework.data.jpa.domain.Specification<RemiseCaisse> spec = (r, q, cb) -> cb.conjunction();
        if (statut != null && !statut.isBlank()) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("statut"), statut.trim()));
        }
        if (agentId != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("agentId"), agentId));
        }
        var resultat = remiseCaisseRepository.findAll(spec, pageable)
                .map(r -> RemiseCaisseDto.depuis(r, nombrePaiements(r.getId())));
        return cm.cositi.api.commun.reponse.ReponsePaginee.depuis(resultat);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    @Transactional(readOnly = true)
    public RemiseCaisseDto consulter(UUID remiseId) {
        RemiseCaisse remise = remiseCaisseRepository.findById(remiseId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("REMISE_CAISSE_INTROUVABLE", "Remise introuvable."));
        return RemiseCaisseDto.depuis(remise, nombrePaiements(remiseId));
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CREER')")
    @Transactional(readOnly = true)
    public List<cm.cositi.api.cotisation.dto.PaiementDto> aRemettre(UUID agentId, Utilisateur demandeur) {
        if (!agentRepository.existsById(agentId)) {
            throw new ExceptionRessourceIntrouvable("AGENT_INTROUVABLE", "Agent introuvable.");
        }
        return paiementRepository.findAll((r, q, cb) -> cb.and(
                        cb.equal(r.get("agentEncaisseurId"), agentId),
                        cb.isNull(r.get("remiseCaisseId")),
                        cb.isFalse(r.get("archive")),
                        r.get("statut").in(STATUTS_EXCLUS).not()),
                org.springframework.data.domain.Sort.by("datePaiement", "numeroRecu")).stream()
                .map(cm.cositi.api.cotisation.dto.PaiementDto::depuis).toList();
    }

    private int nombrePaiements(UUID remiseId) {
        Integer n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM paiement WHERE remise_caisse_id = ?",
                Integer.class, remiseId);
        return n == null ? 0 : n;
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
