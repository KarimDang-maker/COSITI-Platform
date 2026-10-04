package cm.cositi.api.workflow.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.document.entite.Document;
import cm.cositi.api.document.repository.DocumentRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.workflow.dto.CreationDemandeValidationDto;
import cm.cositi.api.workflow.dto.DecisionDemandeDto;
import cm.cositi.api.workflow.dto.DecisionDemandeValidationDto;
import cm.cositi.api.workflow.dto.DemandeModificationDto;
import cm.cositi.api.workflow.dto.SoumissionEntiteDto;
import cm.cositi.api.workflow.dto.DemandeValidationDto;
import cm.cositi.api.workflow.dto.DocumentDemandeValidationDto;
import cm.cositi.api.workflow.dto.ElementDemandeValidationDto;
import cm.cositi.api.workflow.dto.PropositionChampDto;
import cm.cositi.api.workflow.dto.ResoumissionDemandeDto;
import cm.cositi.api.workflow.dto.StatutValidationEntiteDto;
import cm.cositi.api.workflow.entite.ActionWorkflow;
import cm.cositi.api.workflow.entite.DecisionDemandeValidation;
import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.DocumentDemandeValidation;
import cm.cositi.api.workflow.entite.ElementDemandeValidation;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import cm.cositi.api.workflow.repository.DecisionDemandeValidationRepository;
import cm.cositi.api.workflow.repository.DemandeValidationRepository;
import cm.cositi.api.workflow.repository.DocumentDemandeValidationRepository;
import cm.cositi.api.workflow.repository.ElementDemandeValidationRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Year;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ServiceDemandeValidationImpl implements ServiceDemandeValidation {

    static final String PARAM_JUSTIFICATIFS = "WORKFLOW_JUSTIFICATIFS_OBLIGATOIRES";

    /** Borne des listes filtrées en mémoire (visibilité par périmètre) — largement au-delà du volume V1. */
    private static final int MAX_CANDIDATS = 2000;

    private final DemandeValidationRepository demandeRepository;
    private final ElementDemandeValidationRepository elementRepository;
    private final DocumentDemandeValidationRepository documentDemandeRepository;
    private final DecisionDemandeValidationRepository decisionRepository;
    private final DocumentRepository documentRepository;
    private final Map<TypeEntiteWorkflow, AdaptateurWorkflow> adaptateurs;
    private final ServicePolitiqueValidation politique;
    private final ServiceComparaisonValidation comparaison;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;
    private final ApplicationEventPublisher evenements;
    private final JdbcTemplate jdbcTemplate;

    public ServiceDemandeValidationImpl(DemandeValidationRepository demandeRepository,
                                        ElementDemandeValidationRepository elementRepository,
                                        DocumentDemandeValidationRepository documentDemandeRepository,
                                        DecisionDemandeValidationRepository decisionRepository,
                                        DocumentRepository documentRepository, List<AdaptateurWorkflow> adaptateurs,
                                        ServicePolitiqueValidation politique, ServiceComparaisonValidation comparaison,
                                        ServiceParametre serviceParametre, ServiceAudit serviceAudit,
                                        ApplicationEventPublisher evenements, JdbcTemplate jdbcTemplate) {
        this.demandeRepository = demandeRepository;
        this.elementRepository = elementRepository;
        this.documentDemandeRepository = documentDemandeRepository;
        this.decisionRepository = decisionRepository;
        this.documentRepository = documentRepository;
        this.adaptateurs = new EnumMap<>(adaptateurs.stream()
                .collect(Collectors.toMap(AdaptateurWorkflow::typeEntite, Function.identity())));
        this.politique = politique;
        this.comparaison = comparaison;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
        this.evenements = evenements;
        this.jdbcTemplate = jdbcTemplate;
    }

    // ------------------------------------------------------------------------------------------ Création

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DemandeValidationDto creer(CreationDemandeValidationDto dto, Utilisateur demandeur) {
        String cle = normaliserCle(dto.cleIdempotence());
        if (cle != null) {
            Optional<DemandeValidation> existante = demandeRepository.findByCleIdempotence(cle);
            if (existante.isPresent()) {
                // §18 : une création rejouée renvoie la demande déjà créée, jamais une seconde demande.
                if (!existante.get().getDemandePar().equals(demandeur.getId())
                        || existante.get().getTypeOperation() != dto.typeOperation()
                        || !existante.get().getEntiteId().equals(dto.entiteId())) {
                    throw cleReutilisee();
                }
                return dto(existante.get(), List.of());
            }
        }

        TypeOperationWorkflow operation = dto.typeOperation();
        politique.verifierPeutDemander(demandeur, operation);
        AdaptateurWorkflow adaptateur = adaptateur(operation.typeEntite());
        EtatEntite etat = adaptateur.etat(dto.entiteId(), true);
        if (!adaptateur.peutAcceder(dto.entiteId(), demandeur)) {
            throw horsPerimetre();
        }
        if (dto.versionBase() != null && dto.versionBase() != etat.version()) {
            throw versionObsolete();
        }
        if (demandeRepository.existsByTypeEntiteAndEntiteIdAndStatutIn(operation.typeEntite(), dto.entiteId(),
                StatutDemandeValidation.OUVERTS)) {
            throw new ExceptionConflit("DEMANDE_ACTIVE_EXISTANTE",
                    "Une demande est déjà en cours sur cette donnée : elle doit être traitée ou annulée d'abord.");
        }
        adaptateur.controlerOuverture(dto.entiteId(), operation);

        List<ServiceComparaisonValidation.Changement> changements =
                calculerChangements(adaptateur, operation, dto.entiteId(), etat, dto.elements());

        DemandeValidation demande = new DemandeValidation(genererReference(), operation, dto.entiteId(),
                dto.motif().trim(), etat.version(), demandeur.getId(), demandeur.getIdentifiant(), cle);
        demande = demandeRepository.saveAndFlush(demande);
        enregistrerElements(demande, changements);
        decisionRepository.save(new DecisionDemandeValidation(demande.getId(), ActionWorkflow.CREATION, null,
                demande.getStatut(), demandeur.getId(), demandeur.getIdentifiant(), null, null));
        auditer(TypeOperation.DEMANDE_VALIDATION_CREATION, demande, null, demande.getMotif(), demandeur,
                Map.of("elements", changements));

        if (dto.documentIds() != null) {
            for (UUID documentId : dto.documentIds()) {
                joindre(demande, adaptateur, documentId, demandeur);
            }
        }
        if (dto.soumettre()) {
            soumettreInterne(demande, adaptateur, demandeur, null, ActionWorkflow.SOUMISSION);
        }
        return dto(demande, List.of());
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DemandeValidationDto soumettreEntite(TypeOperationWorkflow operation, UUID entiteId, SoumissionEntiteDto dto,
                                                Utilisateur demandeur) {
        if (!operation.estValidationInitiale()) {
            throw new IllegalArgumentException("Opération de validation initiale attendue : " + operation);
        }
        Optional<DemandeValidation> ouverte = demandeRepository.findFirstByTypeEntiteAndEntiteIdAndStatutIn(
                operation.typeEntite(), entiteId, StatutDemandeValidation.OUVERTS);
        if (ouverte.isPresent() && ouverte.get().getTypeOperation() == operation) {
            DemandeValidation demande = ouverte.get();
            String cle = dto == null ? null : dto.cleIdempotence();
            if (demande.getStatut() == StatutDemandeValidation.CORRECTION_DEMANDEE) {
                return resoumettre(demande.getId(), new ResoumissionDemandeDto(dto == null ? null : dto.motif(), null, cle),
                        demandeur);
            }
            if (demande.getStatut() == StatutDemandeValidation.BROUILLON) {
                return soumettre(demande.getId(), new DecisionDemandeDto(null, cle, false), demandeur);
            }
        }
        String motif = dto != null && dto.motif() != null && !dto.motif().isBlank() ? dto.motif()
                : (operation == TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER
                ? "Soumission du dossier adhérent pour validation" : "Soumission du profil d'agent pour validation");
        return creer(new CreationDemandeValidationDto(operation, entiteId, motif, null,
                dto == null ? null : dto.documentIds(), dto == null ? null : dto.versionBase(),
                dto == null ? null : dto.cleIdempotence(), true), demandeur);
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DemandeValidationDto creerPourEntite(TypeOperationWorkflow operation, UUID entiteId,
                                                DemandeModificationDto dto, Utilisateur demandeur) {
        return creer(new CreationDemandeValidationDto(operation, entiteId, dto.motif(), dto.elements(),
                dto.documentIds(), dto.versionBase(), dto.cleIdempotence(), !dto.brouillon()), demandeur);
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    public DemandeValidationDto consulterPourEntite(TypeEntiteWorkflow typeEntite, UUID entiteId, UUID demandeId,
                                                    Utilisateur demandeur) {
        DemandeValidation demande = charger(demandeId);
        if (demande.getTypeEntite() != typeEntite || !demande.getEntiteId().equals(entiteId)) {
            throw new ExceptionRessourceIntrouvable("DEMANDE_INTROUVABLE", "Demande de validation introuvable.");
        }
        exigerVisibilite(demande, demandeur);
        return dto(demande, List.of());
    }

    // ------------------------------------------------------------------------------------------ Transitions

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DemandeValidationDto soumettre(UUID demandeId, DecisionDemandeDto commande, Utilisateur demandeur) {
        DemandeValidation demande = verrouiller(demandeId);
        Optional<DemandeValidationDto> rejeu = rejouer(commande, demande, ActionWorkflow.SOUMISSION);
        if (rejeu.isPresent()) {
            return rejeu.get();
        }
        exigerDemandeur(demande, demandeur);
        exigerStatut(demande, StatutDemandeValidation.BROUILLON, "soumise");
        soumettreInterne(demande, adaptateur(demande.getTypeEntite()), demandeur, cle(commande), ActionWorkflow.SOUMISSION);
        return dto(demande, List.of());
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DemandeValidationDto approuver(UUID demandeId, DecisionDemandeDto commande, Utilisateur validateur) {
        DemandeValidation demande = verrouiller(demandeId);
        Optional<DemandeValidationDto> rejeu = rejouer(commande, demande, ActionWorkflow.APPROBATION);
        if (rejeu.isPresent()) {
            return rejeu.get();
        }
        exigerStatut(demande, StatutDemandeValidation.EN_ATTENTE_VALIDATION, "approuvée");
        AdaptateurWorkflow adaptateur = adaptateur(demande.getTypeEntite());
        politique.verifierPeutDecider(validateur, demande, adaptateur);

        // §17 / §12 étapes 1-4 : verrou sur l'entité, version inchangée, anciennes valeurs inchangées.
        EtatEntite etat = adaptateur.etat(demande.getEntiteId(), true);
        if (etat.version() != demande.getVersionBase()) {
            throw versionObsolete();
        }
        List<ElementDemandeValidation> elements = elementRepository.findByDemandeIdOrderByChamp(demande.getId());
        if (demande.getTypeOperation().avecElements()) {
            for (ElementDemandeValidation e : elements) {
                if (!Objects.equals(e.getAncienneValeur(), etat.valeurs().get(e.getChamp()))) {
                    throw versionObsolete();
                }
            }
        }
        verifierJustificatifs(demande);

        DecisionDemandeDto decision = commande != null ? commande : DecisionDemandeDto.vide();
        List<String> avertissements = new ArrayList<>(adaptateur.controlerAvantApprobation(demande, decision, validateur));

        StatutDemandeValidation avant = demande.getStatut();
        demande.decider(StatutDemandeValidation.APPROUVEE, validateur.getId(), commentaire(commande));
        avertissements.addAll(adaptateur.appliquer(demande, elements, validateur));
        adaptateur.synchroniserStatut(demande.getEntiteId(), demande.getTypeOperation(), StatutDemandeValidation.APPROUVEE);
        demande.marquerAppliquee();
        demande = demandeRepository.saveAndFlush(demande);

        enregistrerDecision(demande, ActionWorkflow.APPROBATION, avant, validateur, commentaire(commande), cle(commande));
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("elements", elements.stream().map(ElementDemandeValidationDto::depuis).toList());
        details.put("avertissements", avertissements);
        details.put("ignorerDoublons", decision.ignorerDoublons());
        auditer(TypeOperation.DEMANDE_VALIDATION_APPROBATION, demande, avant, commentaire(commande), validateur, details);
        auditer(TypeOperation.DEMANDE_VALIDATION_APPLICATION, demande, StatutDemandeValidation.APPROUVEE,
                "Application de la demande " + demande.getReference(), validateur, details);
        publier(demande, ActionWorkflow.APPROBATION, commentaire(commande));
        return dto(demande, avertissements);
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DemandeValidationDto rejeter(UUID demandeId, DecisionDemandeDto commande, Utilisateur validateur) {
        return decider(demandeId, commande, validateur, ActionWorkflow.REJET, StatutDemandeValidation.REJETEE,
                TypeOperation.DEMANDE_VALIDATION_REJET);
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DemandeValidationDto demanderCorrection(UUID demandeId, DecisionDemandeDto commande, Utilisateur validateur) {
        return decider(demandeId, commande, validateur, ActionWorkflow.DEMANDE_CORRECTION,
                StatutDemandeValidation.CORRECTION_DEMANDEE, TypeOperation.DEMANDE_VALIDATION_CORRECTION_DEMANDEE);
    }

    private DemandeValidationDto decider(UUID demandeId, DecisionDemandeDto commande, Utilisateur validateur,
                                         ActionWorkflow action, StatutDemandeValidation cible, TypeOperation typeAudit) {
        DemandeValidation demande = verrouiller(demandeId);
        Optional<DemandeValidationDto> rejeu = rejouer(commande, demande, action);
        if (rejeu.isPresent()) {
            return rejeu.get();
        }
        String motif = commentaire(commande);
        if (motif == null) {
            throw new ExceptionValidation("DEMANDE_MOTIF_REQUIS", "Le motif de la décision est obligatoire.", "commentaire");
        }
        exigerStatut(demande, StatutDemandeValidation.EN_ATTENTE_VALIDATION,
                action == ActionWorkflow.REJET ? "rejetée" : "renvoyée en correction");
        AdaptateurWorkflow adaptateur = adaptateur(demande.getTypeEntite());
        politique.verifierPeutDecider(validateur, demande, adaptateur);

        StatutDemandeValidation avant = demande.getStatut();
        demande.decider(cible, validateur.getId(), motif);
        adaptateur.synchroniserStatut(demande.getEntiteId(), demande.getTypeOperation(), cible);
        demande = demandeRepository.saveAndFlush(demande);

        enregistrerDecision(demande, action, avant, validateur, motif, cle(commande));
        auditer(typeAudit, demande, avant, motif, validateur, Map.of());
        publier(demande, action, motif);
        return dto(demande, List.of());
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DemandeValidationDto resoumettre(UUID demandeId, ResoumissionDemandeDto commande, Utilisateur demandeur) {
        DemandeValidation demande = verrouiller(demandeId);
        String cle = commande != null ? normaliserCle(commande.cleIdempotence()) : null;
        Optional<DemandeValidationDto> rejeu = rejouer(cle, demande, ActionWorkflow.RESOUMISSION);
        if (rejeu.isPresent()) {
            return rejeu.get();
        }
        exigerDemandeur(demande, demandeur);
        exigerStatut(demande, StatutDemandeValidation.CORRECTION_DEMANDEE, "resoumise");
        AdaptateurWorkflow adaptateur = adaptateur(demande.getTypeEntite());

        List<PropositionChampDto> nouvelles = commande != null ? commande.elements() : null;
        if (demande.getTypeOperation().avecElements() && nouvelles != null && !nouvelles.isEmpty()) {
            // Nouvelles propositions : recalculées sur l'état officiel actuel, qui devient la nouvelle base.
            EtatEntite etat = adaptateur.etat(demande.getEntiteId(), true);
            List<ServiceComparaisonValidation.Changement> changements =
                    calculerChangements(adaptateur, demande.getTypeOperation(), demande.getEntiteId(), etat, nouvelles);
            elementRepository.remplacer(demande.getId());
            enregistrerElements(demande, changements);
        }
        soumettreInterne(demande, adaptateur, demandeur, cle, ActionWorkflow.RESOUMISSION,
                commande != null ? texte(commande.commentaire()) : null);
        return dto(demande, List.of());
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DemandeValidationDto annuler(UUID demandeId, DecisionDemandeDto commande, Utilisateur demandeur) {
        DemandeValidation demande = verrouiller(demandeId);
        Optional<DemandeValidationDto> rejeu = rejouer(commande, demande, ActionWorkflow.ANNULATION);
        if (rejeu.isPresent()) {
            return rejeu.get();
        }
        exigerDemandeur(demande, demandeur);
        if (!demande.getStatut().estOuvert()) {
            throw transitionInterdite(demande, "annulée");
        }
        StatutDemandeValidation avant = demande.getStatut();
        demande.annuler();
        adaptateur(demande.getTypeEntite()).synchroniserStatut(demande.getEntiteId(), demande.getTypeOperation(),
                StatutDemandeValidation.ANNULEE);
        demande = demandeRepository.saveAndFlush(demande);
        enregistrerDecision(demande, ActionWorkflow.ANNULATION, avant, demandeur, commentaire(commande), cle(commande));
        auditer(TypeOperation.DEMANDE_VALIDATION_ANNULATION, demande, avant, commentaire(commande), demandeur, Map.of());
        publier(demande, ActionWorkflow.ANNULATION, commentaire(commande));
        return dto(demande, List.of());
    }

    // ------------------------------------------------------------------------------------------ Justificatifs

    @Override
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public DocumentDemandeValidationDto joindreJustificatif(UUID demandeId, UUID documentId, Utilisateur demandeur) {
        DemandeValidation demande = verrouiller(demandeId);
        exigerDemandeur(demande, demandeur);
        if (!demande.getStatut().estOuvert()) {
            throw transitionInterdite(demande, "complétée par un justificatif");
        }
        return joindre(demande, adaptateur(demande.getTypeEntite()), documentId, demandeur);
    }

    private DocumentDemandeValidationDto joindre(DemandeValidation demande, AdaptateurWorkflow adaptateur,
                                                  UUID documentId, Utilisateur demandeur) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("DOCUMENT_INTROUVABLE", "Document introuvable."));
        if (document.isArchive()) {
            throw new ExceptionValidation("DEMANDE_JUSTIFICATIF_ARCHIVE", "Ce document est archivé.", "documentId");
        }
        UUID adherentConcerne = adaptateur.adherentConcerne(demande.getEntiteId());
        if (document.getAdherentId() != null && adherentConcerne != null
                && !document.getAdherentId().equals(adherentConcerne)) {
            throw new ExceptionValidation("DEMANDE_JUSTIFICATIF_HORS_DOSSIER",
                    "Ce document appartient au dossier d'un autre adhérent.", "documentId");
        }
        if (documentDemandeRepository.existsByDemandeIdAndDocumentId(demande.getId(), documentId)) {
            throw new ExceptionConflit("DEMANDE_JUSTIFICATIF_DEJA_JOINT", "Ce document est déjà joint à la demande.");
        }
        String type = document.getTypeDocument().name();
        boolean obligatoire = justificatifsExiges(demande.getTypeOperation()).contains(type);
        DocumentDemandeValidation lien = documentDemandeRepository.save(new DocumentDemandeValidation(demande.getId(),
                documentId, type, obligatoire, demandeur.getId()));
        auditer(TypeOperation.DEMANDE_VALIDATION_JUSTIFICATIF, demande, demande.getStatut(),
                "Justificatif " + type + " joint", demandeur, Map.of("documentId", documentId));
        return DocumentDemandeValidationDto.depuis(lien);
    }

    // ------------------------------------------------------------------------------------------ Lecture

    @Override
    @PreAuthorize("isAuthenticated()")
    public DemandeValidationDto consulter(UUID demandeId, Utilisateur demandeur) {
        DemandeValidation demande = charger(demandeId);
        exigerVisibilite(demande, demandeur);
        return dto(demande, List.of());
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    public ReponsePaginee<DemandeValidationDto> lister(StatutDemandeValidation statut, TypeEntiteWorkflow typeEntite,
                                                       TypeOperationWorkflow typeOperation, UUID entiteId,
                                                       boolean seulementMesDemandes, Pageable pageable,
                                                       Utilisateur demandeur) {
        Specification<DemandeValidation> spec = Specification.where(null);
        if (statut != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("statut"), statut));
        }
        if (typeEntite != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("typeEntite"), typeEntite));
        }
        if (typeOperation != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("typeOperation"), typeOperation));
        }
        if (entiteId != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("entiteId"), entiteId));
        }
        if (seulementMesDemandes) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("demandePar"), demandeur.getId()));
        }
        List<DemandeValidation> visibles = demandeRepository
                .findAll(spec, org.springframework.data.domain.PageRequest.of(0, MAX_CANDIDATS,
                        Sort.by(Sort.Direction.DESC, "demandeLe")))
                .stream().filter(d -> estVisible(d, demandeur)).toList();
        return paginer(visibles, pageable);
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    public ReponsePaginee<DemandeValidationDto> listerEnAttente(TypeEntiteWorkflow typeEntite, Pageable pageable,
                                                                Utilisateur validateur) {
        Specification<DemandeValidation> spec = (r, q, cb) ->
                cb.equal(r.get("statut"), StatutDemandeValidation.EN_ATTENTE_VALIDATION);
        if (typeEntite != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("typeEntite"), typeEntite));
        }
        List<DemandeValidation> decidables = demandeRepository
                .findAll(spec, org.springframework.data.domain.PageRequest.of(0, MAX_CANDIDATS,
                        Sort.by(Sort.Direction.ASC, "soumiseLe")))
                .stream().filter(d -> politique.peutDecider(validateur, d, adaptateur(d.getTypeEntite()))).toList();
        return paginer(decidables, pageable);
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    public List<ElementDemandeValidationDto> elements(UUID demandeId, Utilisateur demandeur) {
        exigerVisibilite(charger(demandeId), demandeur);
        return elementRepository.findByDemandeIdOrderByChamp(demandeId).stream()
                .map(ElementDemandeValidationDto::depuis).toList();
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    public List<DecisionDemandeValidationDto> decisions(UUID demandeId, Utilisateur demandeur) {
        exigerVisibilite(charger(demandeId), demandeur);
        return decisionRepository.findByDemandeIdOrderByDecideLe(demandeId).stream()
                .map(DecisionDemandeValidationDto::depuis).toList();
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    public List<DocumentDemandeValidationDto> documents(UUID demandeId, Utilisateur demandeur) {
        exigerVisibilite(charger(demandeId), demandeur);
        return documentDemandeRepository.findByDemandeIdOrderByAjouteLe(demandeId).stream()
                .map(DocumentDemandeValidationDto::depuis).toList();
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    public StatutValidationEntiteDto statutEntite(TypeEntiteWorkflow typeEntite, UUID entiteId, Utilisateur demandeur) {
        AdaptateurWorkflow adaptateur = adaptateur(typeEntite);
        EtatEntite etat = adaptateur.etat(entiteId, false);
        exigerLectureEntite(typeEntite, entiteId, adaptateur, demandeur);
        List<DemandeValidation> demandes = demandeRepository.findByTypeEntiteAndEntiteIdOrderByDemandeLeDesc(typeEntite, entiteId);
        DemandeValidationDto ouverte = demandes.stream().filter(d -> d.getStatut().estOuvert()).findFirst()
                .map(d -> dto(d, List.of())).orElse(null);
        DemandeValidationDto derniere = demandes.stream().filter(d -> !d.getStatut().estOuvert()).findFirst()
                .map(d -> dto(d, List.of())).orElse(null);
        return new StatutValidationEntiteDto(typeEntite, entiteId, etat.statutValidation(), etat.version(),
                etat.modifiableDirectement() && ouverte == null, ouverte, derniere);
    }

    @Override
    @PreAuthorize("isAuthenticated()")
    public List<DemandeValidationDto> historiqueEntite(TypeEntiteWorkflow typeEntite, UUID entiteId,
                                                       Collection<TypeOperationWorkflow> operations,
                                                       Utilisateur demandeur) {
        AdaptateurWorkflow adaptateur = adaptateur(typeEntite);
        adaptateur.etat(entiteId, false);
        exigerLectureEntite(typeEntite, entiteId, adaptateur, demandeur);
        List<DemandeValidation> demandes = operations == null || operations.isEmpty()
                ? demandeRepository.findByTypeEntiteAndEntiteIdOrderByDemandeLeDesc(typeEntite, entiteId)
                : demandeRepository.findByTypeEntiteAndEntiteIdAndTypeOperationInOrderByDemandeLeDesc(typeEntite,
                        entiteId, operations);
        return demandes.stream().map(d -> dto(d, List.of())).toList();
    }

    // ------------------------------------------------------------------------------------------ Interne

    private void soumettreInterne(DemandeValidation demande, AdaptateurWorkflow adaptateur, Utilisateur demandeur,
                                  String cle, ActionWorkflow action) {
        soumettreInterne(demande, adaptateur, demandeur, cle, action, null);
    }

    private void soumettreInterne(DemandeValidation demande, AdaptateurWorkflow adaptateur, Utilisateur demandeur,
                                  String cle, ActionWorkflow action, String commentaire) {
        EtatEntite etat = adaptateur.etat(demande.getEntiteId(), true);
        if (demande.getTypeOperation().avecElements()) {
            // Les propositions ont été établies sur la version de base : si la donnée officielle a changé
            // depuis, elles ne sont plus fiables (§17).
            if (etat.version() != demande.getVersionBase()
                    && elementRepository.findByDemandeIdOrderByChamp(demande.getId()).stream()
                    .anyMatch(e -> !Objects.equals(e.getAncienneValeur(), etat.valeurs().get(e.getChamp())))) {
                throw versionObsolete();
            }
        } else {
            // Validation initiale : le dossier était modifiable jusqu'ici, l'instantané soumis est l'état actuel.
            elementRepository.remplacer(demande.getId());
            enregistrerElements(demande, comparaison.instantane(adaptateur.champs(demande.getTypeOperation()),
                    etat.valeurs()));
        }
        verifierJustificatifs(demande);

        StatutDemandeValidation avant = demande.getStatut();
        adaptateur.synchroniserStatut(demande.getEntiteId(), demande.getTypeOperation(),
                StatutDemandeValidation.EN_ATTENTE_VALIDATION);
        // Le verrouillage du dossier (statut EN_ATTENTE_VALIDATION) incrémente sa version : la base de comparaison
        // de l'approbation est la version relue après ce passage, pas celle d'avant.
        demande.soumettre(adaptateur.etat(demande.getEntiteId(), false).version());
        demandeRepository.saveAndFlush(demande);

        enregistrerDecision(demande, action, avant, demandeur, commentaire, cle);
        auditer(action == ActionWorkflow.RESOUMISSION ? TypeOperation.DEMANDE_VALIDATION_RESOUMISSION
                : TypeOperation.DEMANDE_VALIDATION_SOUMISSION, demande, avant, commentaire, demandeur, Map.of());
        publier(demande, action, commentaire);
    }

    private List<ServiceComparaisonValidation.Changement> calculerChangements(AdaptateurWorkflow adaptateur,
                                                                              TypeOperationWorkflow operation,
                                                                              UUID entiteId, EtatEntite etat,
                                                                              List<PropositionChampDto> propositions) {
        if (!operation.avecElements()) {
            if (propositions != null && !propositions.isEmpty()) {
                throw new ExceptionValidation("DEMANDE_ELEMENTS_NON_ATTENDUS",
                        "Une validation de dossier ne porte pas de propositions : modifiez le dossier puis soumettez-le.",
                        "elements");
            }
            return comparaison.instantane(adaptateur.champs(operation), etat.valeurs());
        }
        List<ServiceComparaisonValidation.Changement> changements =
                comparaison.comparer(adaptateur.champs(operation), etat.valeurs(), propositions);
        Map<String, String> propositionsRetenues = new LinkedHashMap<>();
        changements.forEach(c -> propositionsRetenues.put(c.champ(), c.valeurProposee()));
        adaptateur.controlerPropositions(entiteId, operation, comparaison.valeursResultantes(etat.valeurs(), changements),
                propositionsRetenues);
        return changements;
    }

    private void enregistrerElements(DemandeValidation demande, List<ServiceComparaisonValidation.Changement> changements) {
        for (ServiceComparaisonValidation.Changement c : changements) {
            elementRepository.save(new ElementDemandeValidation(demande.getId(), c.champ(), c.type(),
                    c.ancienneValeur(), c.valeurProposee(), texte(c.motif())));
        }
    }

    private void enregistrerDecision(DemandeValidation demande, ActionWorkflow action, StatutDemandeValidation avant,
                                     Utilisateur acteur, String commentaire, String cle) {
        decisionRepository.save(new DecisionDemandeValidation(demande.getId(), action, avant, demande.getStatut(),
                acteur.getId(), acteur.getIdentifiant(), commentaire, cle));
    }

    /** §7 {@code validateRequiredDocuments} : 400 si un type de justificatif exigé (paramètre [V]) manque. */
    private void verifierJustificatifs(DemandeValidation demande) {
        List<String> exiges = justificatifsExiges(demande.getTypeOperation());
        if (exiges.isEmpty()) {
            return;
        }
        List<String> joints = documentDemandeRepository.findByDemandeIdOrderByAjouteLe(demande.getId()).stream()
                .map(DocumentDemandeValidation::getTypeDocument).toList();
        List<String> manquants = exiges.stream().filter(t -> !joints.contains(t)).toList();
        if (!manquants.isEmpty()) {
            throw new ExceptionValidation("DEMANDE_JUSTIFICATIF_MANQUANT",
                    "Justificatif(s) obligatoire(s) manquant(s) : " + manquants, "documents");
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> justificatifsExiges(TypeOperationWorkflow operation) {
        Map<String, Object> regles = serviceParametre.json(PARAM_JUSTIFICATIFS, Map.class);
        Object liste = regles == null ? null : regles.get(operation.name());
        if (liste instanceof List<?> l) {
            return l.stream().map(String::valueOf).toList();
        }
        return List.of();
    }

    /**
     * §18 : une clé d'idempotence déjà enregistrée pour la même action sur la même demande renvoie l'état courant
     * sans rien réappliquer ; réutilisée pour une autre action ou une autre demande, elle est refusée (409).
     */
    private Optional<DemandeValidationDto> rejouer(DecisionDemandeDto commande, DemandeValidation demande,
                                                   ActionWorkflow action) {
        return rejouer(cle(commande), demande, action);
    }

    private Optional<DemandeValidationDto> rejouer(String cle, DemandeValidation demande, ActionWorkflow action) {
        if (cle == null) {
            return Optional.empty();
        }
        return decisionRepository.findByCleIdempotence(cle).map(decision -> {
            if (!decision.getDemandeId().equals(demande.getId()) || decision.getAction() != action) {
                throw cleReutilisee();
            }
            return dto(demande, List.of());
        });
    }

    private void auditer(TypeOperation type, DemandeValidation demande, StatutDemandeValidation avant, String motif,
                         Utilisateur acteur, Map<String, ?> details) {
        Map<String, Object> apres = new LinkedHashMap<>();
        apres.put("demandeId", demande.getId());
        apres.put("reference", demande.getReference());
        apres.put("typeEntite", demande.getTypeEntite());
        apres.put("entiteId", demande.getEntiteId());
        apres.put("typeOperation", demande.getTypeOperation());
        apres.put("statutAvant", avant);
        apres.put("statutApres", demande.getStatut());
        apres.put("acteurRoles", acteur.getRoles().stream().map(Role::getCode).sorted().toList());
        apres.put("correlationId", correlationId());
        apres.putAll(details);
        serviceAudit.tracer(type, "demande_validation", demande.getId(), avant == null ? null : Map.of("statut", avant),
                apres, motif);
    }

    private void publier(DemandeValidation demande, ActionWorkflow action, String commentaire) {
        evenements.publishEvent(new DemandeValidationEvent(demande.getId(), demande.getReference(),
                demande.getTypeEntite(), demande.getEntiteId(), demande.getTypeOperation(), action, demande.getStatut(),
                demande.getDemandePar(), politique.rolesValidateurs(demande.getTypeOperation()), commentaire));
    }

    private boolean estVisible(DemandeValidation demande, Utilisateur utilisateur) {
        if (demande.getDemandePar().equals(utilisateur.getId())) {
            return true;
        }
        AdaptateurWorkflow adaptateur = adaptateur(demande.getTypeEntite());
        boolean lecture = ServicePolitiqueValidation.possedePermission(utilisateur,
                demande.getTypeEntite().permissionLecture())
                || ServicePolitiqueValidation.possedePermission(utilisateur,
                demande.getTypeOperation().permissionValidation());
        return lecture && adaptateur.peutAcceder(demande.getEntiteId(), utilisateur);
    }

    private void exigerVisibilite(DemandeValidation demande, Utilisateur utilisateur) {
        if (!estVisible(demande, utilisateur)) {
            throw new ExceptionAutorisation("DEMANDE_ACCES_REFUSE", "Vous n'avez pas accès à cette demande.");
        }
    }

    private void exigerLectureEntite(TypeEntiteWorkflow typeEntite, UUID entiteId, AdaptateurWorkflow adaptateur,
                                     Utilisateur utilisateur) {
        if (!ServicePolitiqueValidation.possedePermission(utilisateur, typeEntite.permissionLecture())
                || !adaptateur.peutAcceder(entiteId, utilisateur)) {
            throw new ExceptionAutorisation("DEMANDE_ACCES_REFUSE", "Vous n'avez pas accès à cette donnée.");
        }
    }

    private static void exigerDemandeur(DemandeValidation demande, Utilisateur utilisateur) {
        if (!demande.getDemandePar().equals(utilisateur.getId())) {
            throw new ExceptionAutorisation("DEMANDE_RESERVEE_DEMANDEUR",
                    "Seul l'auteur de la demande peut effectuer cette action.");
        }
    }

    private static void exigerStatut(DemandeValidation demande, StatutDemandeValidation attendu, String action) {
        if (demande.getStatut() != attendu) {
            throw transitionInterdite(demande, action);
        }
    }

    private static ExceptionConflit transitionInterdite(DemandeValidation demande, String action) {
        return new ExceptionConflit("DEMANDE_TRANSITION_INTERDITE",
                "La demande " + demande.getReference() + " (statut " + demande.getStatut() + ") ne peut pas être "
                        + action + ".");
    }

    private static ExceptionConflit versionObsolete() {
        return new ExceptionConflit("DEMANDE_VERSION_OBSOLETE",
                "La donnée a été modifiée depuis l'établissement de la demande. Revoyez les données actuelles.");
    }

    private static ExceptionConflit cleReutilisee() {
        return new ExceptionConflit("IDEMPOTENCY_KEY_REUTILISEE",
                "Cette clé d'idempotence a déjà servi pour une autre opération.");
    }

    private static ExceptionAutorisation horsPerimetre() {
        return new ExceptionAutorisation("DEMANDE_HORS_PERIMETRE", "Cette donnée n'appartient pas à votre périmètre.");
    }

    private DemandeValidation verrouiller(UUID id) {
        return demandeRepository.verrouiller(id).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("DEMANDE_INTROUVABLE", "Demande de validation introuvable."));
    }

    private DemandeValidation charger(UUID id) {
        return demandeRepository.findById(id).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("DEMANDE_INTROUVABLE", "Demande de validation introuvable."));
    }

    private AdaptateurWorkflow adaptateur(TypeEntiteWorkflow type) {
        AdaptateurWorkflow adaptateur = adaptateurs.get(type);
        if (adaptateur == null) {
            throw new IllegalStateException("Aucun adaptateur de workflow pour " + type);
        }
        return adaptateur;
    }

    private String genererReference() {
        Long valeur = jdbcTemplate.queryForObject("SELECT nextval('seq_reference_demande_validation')", Long.class);
        return "DV-" + Year.now().getValue() + "-" + String.format("%06d", valeur);
    }

    private DemandeValidationDto dto(DemandeValidation d, List<String> avertissements) {
        return DemandeValidationDto.depuis(d,
                elementRepository.findByDemandeIdOrderByChamp(d.getId()).stream()
                        .map(ElementDemandeValidationDto::depuis).toList(),
                documentDemandeRepository.findByDemandeIdOrderByAjouteLe(d.getId()).stream()
                        .map(DocumentDemandeValidationDto::depuis).toList(),
                avertissements);
    }

    private ReponsePaginee<DemandeValidationDto> paginer(List<DemandeValidation> demandes, Pageable pageable) {
        int debut = (int) Math.min(pageable.getOffset(), demandes.size());
        int fin = Math.min(debut + pageable.getPageSize(), demandes.size());
        List<DemandeValidationDto> contenu = demandes.subList(debut, fin).stream().map(d -> dto(d, List.of())).toList();
        return ReponsePaginee.depuis(new PageImpl<>(contenu, pageable, demandes.size()));
    }

    private static String cle(DecisionDemandeDto commande) {
        if (commande != null && commande.cleIdempotence() != null && !commande.cleIdempotence().isBlank()) {
            return commande.cleIdempotence().trim();
        }
        return cleEntete();
    }

    private static String normaliserCle(String cle) {
        if (cle != null && !cle.isBlank()) {
            return cle.trim();
        }
        return cleEntete();
    }

    /** Clé lue dans l'en-tête {@code Idempotency-Key} quand le corps n'en porte pas (§18). */
    private static String cleEntete() {
        HttpServletRequest requete = requete();
        if (requete == null) {
            return null;
        }
        String entete = requete.getHeader("Idempotency-Key");
        return entete == null || entete.isBlank() ? null : entete.trim();
    }

    private static String correlationId() {
        return cm.cositi.api.commun.correlation.FiltreCorrelation.courant(requete());
    }

    private static HttpServletRequest requete() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributs
                ? attributs.getRequest() : null;
    }

    private static String commentaire(DecisionDemandeDto commande) {
        return commande == null ? null : texte(commande.commentaire());
    }

    private static String texte(String valeur) {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
    }
}
