package cm.cositi.api.adhesion.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.entite.StatutControleDga;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.service.CandidatDoublon;
import cm.cositi.api.adherent.service.CritereDoublon;
import cm.cositi.api.adherent.service.ServiceAdherent;
import cm.cositi.api.adherent.service.ServiceDoublonAdherent;
import cm.cositi.api.adhesion.dto.ActivationAdherentDto;
import cm.cositi.api.adhesion.dto.ChecklistDocumentaireDto;
import cm.cositi.api.adhesion.dto.ControleDgaDto;
import cm.cositi.api.adhesion.dto.FraisAdhesionAdherentDto;
import cm.cositi.api.adhesion.dto.SoumissionDgaDto;
import cm.cositi.api.adhesion.dto.StatutActivationDto;
import cm.cositi.api.adhesion.dto.SyntheseWorkflowAdherentDto;
import cm.cositi.api.adhesion.dto.VerificationActivationDto;
import cm.cositi.api.adhesion.entite.ControleDga;
import cm.cositi.api.adhesion.entite.FraisAdhesion;
import cm.cositi.api.adhesion.entite.NiveauExigence;
import cm.cositi.api.adhesion.entite.StatutControle;
import cm.cositi.api.adhesion.repository.ControleDgaRepository;
import cm.cositi.api.adhesion.repository.FraisAdhesionRepository;
import cm.cositi.api.audit.ContexteAudit;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.StatutValidationEntite;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.repository.DemandeValidationRepository;
import cm.cositi.api.workflow.service.ServicePolitiqueValidation;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceActivationAdherentImpl implements ServiceActivationAdherent {

    static final String PARAM_EXIGE_FRAIS = "ACTIVATION_EXIGE_FRAIS_ADHESION";

    /** Statuts métier d'un compte déjà actif : l'activation n'a plus rien à faire. */
    private static final Set<StatutAdherent> STATUTS_ACTIFS =
            EnumSet.of(StatutAdherent.ACTIF, StatutAdherent.REACTIVE, StatutAdherent.EN_RETARD);

    private final AdherentRepository adherentRepository;
    private final FraisAdhesionRepository fraisRepository;
    private final ControleDgaRepository controleRepository;
    private final DemandeValidationRepository demandeValidationRepository;
    private final ServiceAdherent serviceAdherent;
    private final ServiceDoublonAdherent serviceDoublonAdherent;
    private final ServiceFraisAdhesion serviceFraisAdhesion;
    private final ServiceControleDga serviceControleDga;
    private final ServiceExigenceDocumentaire serviceExigence;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;
    private final ApplicationEventPublisher evenements;
    private final JdbcTemplate jdbcTemplate;

    public ServiceActivationAdherentImpl(AdherentRepository adherentRepository, FraisAdhesionRepository fraisRepository,
                                         ControleDgaRepository controleRepository,
                                         DemandeValidationRepository demandeValidationRepository,
                                         ServiceAdherent serviceAdherent, ServiceDoublonAdherent serviceDoublonAdherent,
                                         ServiceFraisAdhesion serviceFraisAdhesion, ServiceControleDga serviceControleDga,
                                         ServiceExigenceDocumentaire serviceExigence,
                                         ServicePerimetreDonnees perimetre, ServiceParametre serviceParametre,
                                         ServiceAudit serviceAudit, ApplicationEventPublisher evenements,
                                         JdbcTemplate jdbcTemplate) {
        this.adherentRepository = adherentRepository;
        this.fraisRepository = fraisRepository;
        this.controleRepository = controleRepository;
        this.demandeValidationRepository = demandeValidationRepository;
        this.serviceAdherent = serviceAdherent;
        this.serviceDoublonAdherent = serviceDoublonAdherent;
        this.serviceFraisAdhesion = serviceFraisAdhesion;
        this.serviceControleDga = serviceControleDga;
        this.serviceExigence = serviceExigence;
        this.perimetre = perimetre;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
        this.evenements = evenements;
        this.jdbcTemplate = jdbcTemplate;
    }

    // ------------------------------------------------------------------------------------------ Vérification

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public VerificationActivationDto verifier(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        return evaluer(charger(adherentId), demandeur, false);
    }

    private VerificationActivationDto evaluer(Adherent a, Utilisateur demandeur, boolean ignorerDoublons) {
        List<VerificationActivationDto.Condition> conditions = new ArrayList<>();
        List<String> avertissements = new ArrayList<>();
        boolean dejaActive = STATUTS_ACTIFS.contains(a.getStatut());

        boolean statutOk = !a.isArchive() && (a.getStatut() == StatutAdherent.PREINSCRIT || dejaActive);
        conditions.add(new VerificationActivationDto.Condition("STATUT", "Statut permettant l'activation", statutOk, true,
                a.isArchive() ? "Adhérent archivé." : "Statut actuel : " + a.getStatut() + "."));

        // Document des règles v2.0 §25 : identité, coordonnées et informations professionnelles complètes.
        List<String> identite = new ArrayList<>();
        if (vide(a.getNom())) identite.add("nom");
        if (a.getDateAdhesion() == null) identite.add("date d'adhésion");
        conditions.add(condition("IDENTITE", "Identité complète", identite));
        List<String> coordonnees = new ArrayList<>();
        if (vide(a.getTelephonePrincipal())) coordonnees.add("téléphone principal");
        if (vide(a.getLocalisation())) coordonnees.add("localisation");
        if (a.getZoneId() == null) coordonnees.add("zone");
        conditions.add(condition("COORDONNEES", "Coordonnées complètes", coordonnees));
        List<String> professionnel = new ArrayList<>();
        if (a.getActiviteId() == null) professionnel.add("activité");
        conditions.add(condition("ACTIVITE", "Informations professionnelles complètes", professionnel));

        boolean demandeOuverte = demandeValidationRepository.existsByTypeEntiteAndEntiteIdAndStatutIn(
                TypeEntiteWorkflow.ADHERENT, a.getId(), StatutDemandeValidation.OUVERTS)
                || a.getStatutValidation() == StatutValidationEntite.EN_ATTENTE_VALIDATION && !a.getStatutControleDga().enCours();
        conditions.add(new VerificationActivationDto.Condition("DEMANDE_EN_COURS", "Aucune demande de validation en cours",
                !demandeOuverte, true, demandeOuverte ? "Une demande de validation est en cours sur ce dossier." : "Aucune."));

        String nomComplet = ServiceFraisAdhesionImpl.nomComplet(a);
        List<CandidatDoublon> doublons = serviceDoublonAdherent.rechercher(new CritereDoublon(a.getTelephonePrincipal(),
                a.getNumeroCni(), nomComplet, a.getZoneId())).stream()
                .filter(c -> !c.adherentId().equals(a.getId())).toList();
        conditions.add(new VerificationActivationDto.Condition("DOUBLON", "Aucun doublon bloquant",
                doublons.isEmpty() || ignorerDoublons, true, doublons.isEmpty() ? "Aucun doublon potentiel."
                : "Doublon(s) potentiel(s) : " + doublons.stream().map(CandidatDoublon::matricule)
                .collect(Collectors.joining(", ")) + (ignorerDoublons ? " — confirmé non bloquant." : ".")));

        // §17 : seule une pièce OBLIGATOIRE et confirmée par la COSITI bloque ; les autres sont signalées.
        ChecklistDocumentaireDto checklist = serviceExigence.checklist(a.getId(), demandeur);
        List<String> bloquantes = checklist.pieces().stream()
                .filter(p -> p.bloquante() && !ServiceExigenceDocumentaireImpl.estSatisfaisante(p.statut()))
                .map(p -> p.libelle() + " (" + p.statut() + ")").toList();
        List<String> signalees = checklist.pieces().stream()
                .filter(p -> !p.bloquante() && p.niveau() == NiveauExigence.OBLIGATOIRE
                        && !ServiceExigenceDocumentaireImpl.estSatisfaisante(p.statut()))
                .map(p -> p.libelle() + " (" + p.statut() + ", obligation non confirmée)").toList();
        conditions.add(new VerificationActivationDto.Condition("DOCUMENTS", "Pièces obligatoires présentes selon la checklist",
                bloquantes.isEmpty(), true, bloquantes.isEmpty()
                ? (signalees.isEmpty() ? "Présentes." : "Aucune pièce bloquante ; signalé : " + String.join(", ", signalees) + ".")
                : "Manquant ou non conforme : " + String.join(", ", bloquantes) + "."));

        boolean exigeFrais = serviceParametre.booleen(PARAM_EXIGE_FRAIS);
        Optional<FraisAdhesion> frais = fraisRepository.findByAdherentIdAndTypeFrais(a.getId(), FraisAdhesion.TYPE_ADHESION);
        conditions.add(new VerificationActivationDto.Condition("FRAIS_ADHESION", "Frais d'adhésion enregistré",
                frais.isPresent(), exigeFrais, frais.map(f -> f.getMontantRecu().stripTrailingZeros().toPlainString()
                + " FCFA enregistrés (" + f.getReference() + ", statut " + f.getStatut() + ").")
                .orElse("Aucun frais d'adhésion enregistré (montant requis : "
                        + serviceFraisAdhesion.montantUnitaire().stripTrailingZeros().toPlainString() + " FCFA).")));

        // §25 « Agent terrain identifié » : l'agent collecteur du frais.
        conditions.add(new VerificationActivationDto.Condition("AGENT_COLLECTEUR", "Agent terrain identifié",
                frais.isPresent(), exigeFrais, frais.map(f -> "Agent collecteur enregistré avec le frais " + f.getReference() + ".")
                .orElse("Aucun frais enregistré : l'agent collecteur n'est pas identifié.")));

        if (!serviceParametre.estValide(PARAM_EXIGE_FRAIS)) {
            avertissements.add("L'exigence du frais à l'activation (" + PARAM_EXIGE_FRAIS + ") n'est pas validée par la COSITI.");
        }
        avertissements.addAll(checklist.avertissements());
        boolean activable = !dejaActive && conditions.stream().allMatch(c -> c.satisfaite() || !c.bloquant());
        return new VerificationActivationDto(a.getId(), a.getMatricule(), a.getStatut(), a.getStatutControleDga(),
                dejaActive, activable, conditions, avertissements);
    }

    private static VerificationActivationDto.Condition condition(String code, String libelle, List<String> manquants) {
        return new VerificationActivationDto.Condition(code, libelle, manquants.isEmpty(), true,
                manquants.isEmpty() ? "Complet." : "Manquant : " + String.join(", ", manquants) + ".");
    }

    private static boolean vide(String valeur) {
        return valeur == null || valeur.isBlank();
    }

    // ------------------------------------------------------------------------------------------ Activation

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:ACTIVER')")
    @Transactional
    public StatutActivationDto activer(UUID adherentId, ActivationAdherentDto dto, Utilisateur gestionnaire) {
        perimetre.verifierAccesAdherent(gestionnaire, adherentId);
        verrouiller(adherentId);
        Adherent adherent = charger(adherentId);
        if (STATUTS_ACTIFS.contains(adherent.getStatut())) {
            // Double activation (double clic, rejeu réseau) : aucun effet, état courant renvoyé.
            return statutDto(adherent, true);
        }
        ActivationAdherentDto commande = dto != null ? dto : new ActivationAdherentDto(null, false);
        if (commande.versionBase() != null && !commande.versionBase().equals(adherent.getVersion())) {
            throw new ExceptionConflit("ADHERENT_VERSION_OBSOLETE",
                    "Ce dossier a été modifié depuis votre lecture. Rechargez-le avant d'activer.");
        }
        VerificationActivationDto verification = evaluer(adherent, gestionnaire, commande.ignorerDoublons());
        List<VerificationActivationDto.Condition> echecs = verification.conditions().stream()
                .filter(c -> c.bloquant() && !c.satisfaite()).toList();
        if (echecs.size() == 1 && "DOUBLON".equals(echecs.get(0).code())) {
            throw new ExceptionConflit("ADHERENT_DOUBLON_POTENTIEL", echecs.get(0).detail()
                    + " Vérifiez puis confirmez avec ignorerDoublons=true.");
        }
        if (!echecs.isEmpty()) {
            throw new ExceptionValidation("ADHERENT_ACTIVATION_CONDITIONS_NON_REMPLIES",
                    "Activation impossible : " + echecs.stream().map(c -> c.libelle() + " — " + c.detail())
                            .collect(Collectors.joining(" ; ")));
        }

        StatutAdherent avant = adherent.getStatut();
        adherent.activer(gestionnaire.getId());
        adherent = adherentRepository.saveAndFlush(adherent);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("statutAvant", avant);
        details.put("statutApres", adherent.getStatut());
        details.put("matricule", adherent.getMatricule());
        details.put("ignorerDoublons", commande.ignorerDoublons());
        details.put("conditions", verification.conditions());
        serviceAudit.tracer(TypeOperation.ADHERENT_ACTIVATION, "adherent", adherent.getId(), Map.of("statut", avant),
                ContexteAudit.avec(gestionnaire, details), null);

        // §2 : l'activation transmet immédiatement le dossier au contrôle documentaire DGA.
        soumettreInterne(adherent, gestionnaire, "Transmission automatique à l'activation");
        return statutDto(charger(adherentId), false);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:ACTIVER')")
    @Transactional
    public ControleDgaDto soumettreDga(UUID adherentId, SoumissionDgaDto dto, Utilisateur gestionnaire) {
        perimetre.verifierAccesAdherent(gestionnaire, adherentId);
        verrouiller(adherentId);
        Adherent adherent = charger(adherentId);
        Optional<ControleDga> ouvert = controleRepository.findFirstByAdherentIdAndStatutIn(adherentId,
                EnumSet.of(StatutControle.EN_ATTENTE, StatutControle.EN_COURS));
        if (ouvert.isPresent()) {
            // Idempotence : un dossier déjà en file n'est jamais transmis deux fois.
            return serviceControleDga.consulter(ouvert.get().getId(), gestionnaire);
        }
        if (!STATUTS_ACTIFS.contains(adherent.getStatut())) {
            throw new ExceptionConflit("ADHERENT_NON_ACTIF",
                    "Seul un adhérent activé peut être transmis au contrôle DGA (POST /adherents/{id}/activer).");
        }
        if (adherent.getStatutControleDga() == StatutControleDga.VALIDE) {
            throw new ExceptionConflit("ADHERENT_CONTROLE_DGA_DEJA_VALIDE", "Le contrôle documentaire de ce dossier est déjà validé.");
        }
        if (adherent.getStatutControleDga() == StatutControleDga.REJETE) {
            throw new ExceptionConflit("ADHERENT_CONTROLE_DGA_REJETE",
                    "Le contrôle documentaire de ce dossier a été rejeté : sa suite n'est pas définie par la COSITI.");
        }
        if (demandeValidationRepository.existsByTypeEntiteAndEntiteIdAndStatutIn(TypeEntiteWorkflow.ADHERENT, adherentId,
                StatutDemandeValidation.OUVERTS)) {
            throw new ExceptionConflit("ADHERENT_DEMANDE_EN_COURS",
                    "Une demande de modification est en cours sur ce dossier : elle doit être traitée avant transmission.");
        }
        return soumettreInterne(adherent, gestionnaire, dto == null ? null : dto.commentaire());
    }

    private ControleDgaDto soumettreInterne(Adherent adherent, Utilisateur gestionnaire, String commentaire) {
        boolean resoumission = adherent.getPremiereSoumissionDgaLe() != null;
        adherent.marquerSoumisDga();
        if (adherent.getStatutValidation() != StatutValidationEntite.VALIDE) {
            // Les données contrôlées par la DGA ne doivent pas changer pendant le contrôle : dossier verrouillé.
            adherent.setStatutValidation(StatutValidationEntite.EN_ATTENTE_VALIDATION);
        }
        adherent = adherentRepository.saveAndFlush(adherent);
        ControleDgaDto controle = serviceControleDga.ouvrir(adherent, gestionnaire.getId());

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("controleId", controle.id());
        details.put("reference", controle.reference());
        details.put("tour", controle.tour());
        details.put("premiereSoumissionDgaLe", adherent.getPremiereSoumissionDgaLe());
        serviceAudit.tracer(TypeOperation.ADHERENT_SOUMISSION_DGA, "adherent", adherent.getId(), null,
                ContexteAudit.avec(gestionnaire, details), commentaire);
        evenements.publishEvent(new AdhesionEvent("CONTROLE_DGA_A_TRAITER", adherent.getId(), "controle_dga",
                controle.id(), null, List.of("DGA"),
                resoumission ? "Dossier corrigé à recontrôler" : "Nouvel adhérent à contrôler",
                "Adhérent " + adherent.getMatricule() + " — " + (resoumission ? "retransmis" : "compte activé")
                        + " par " + gestionnaire.getIdentifiant() + " (" + controle.reference() + ")."));
        return controle;
    }

    // ------------------------------------------------------------------------------------------ Lecture

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public StatutActivationDto statut(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        return statutDto(charger(adherentId), false);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public SyntheseWorkflowAdherentDto synthese(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        Adherent adherent = charger(adherentId);
        FraisAdhesionAdherentDto frais = serviceFraisAdhesion.parAdherent(adherentId, demandeur);
        ControleDgaDto controle = null;
        if (ServicePolitiqueValidation.possedePermission(demandeur, "CONTROLE_DGA:LIRE")) {
            controle = controleRepository.findFirstByAdherentIdOrderByTourDesc(adherentId)
                    .map(c -> serviceControleDga.consulter(c.getId(), demandeur)).orElse(null);
        }
        boolean demandeOuverte = demandeValidationRepository.existsByTypeEntiteAndEntiteIdAndStatutIn(
                TypeEntiteWorkflow.ADHERENT, adherentId, StatutDemandeValidation.OUVERTS);
        return new SyntheseWorkflowAdherentDto(statutDto(adherent, false), frais, controle, demandeOuverte);
    }

    // ------------------------------------------------------------------------------------------ Interne

    private StatutActivationDto statutDto(Adherent a, boolean dejaActive) {
        Optional<ControleDga> courant = controleRepository.findFirstByAdherentIdOrderByTourDesc(a.getId());
        return new StatutActivationDto(a.getId(), a.getMatricule(), a.getStatut(), a.getStatutValidation(),
                a.getStatutControleDga(), a.getActiveLe(), a.getActivePar(), a.getPremiereSoumissionDgaLe(),
                a.getDerniereSoumissionDgaLe(), courant.map(ControleDga::getId).orElse(null),
                courant.map(ControleDga::getReference).orElse(null), dejaActive, a.getVersion());
    }

    /** Verrou {@code FOR UPDATE} : deux activations ou transmissions simultanées du même dossier s'excluent. */
    private void verrouiller(UUID adherentId) {
        try {
            jdbcTemplate.queryForObject("SELECT version FROM adherent WHERE id = ? FOR UPDATE", Long.class, adherentId);
        } catch (EmptyResultDataAccessException e) {
            throw new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable.");
        }
    }

    private Adherent charger(UUID id) {
        return adherentRepository.findById(id).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
    }
}
