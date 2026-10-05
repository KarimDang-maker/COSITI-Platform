package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.dto.AdhesionDto;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.adherent.service.AdherentModifieEvent;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.cotisation.dto.AnnulerPaiementDto;
import cm.cositi.api.cotisation.dto.CorrectionPaiementDto;
import cm.cositi.api.cotisation.dto.CritereJournalPaiement;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.HistoriqueStatutPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.dto.RecuDto;
import cm.cositi.api.cotisation.dto.ResultatDoublonPaiementDto;
import cm.cositi.api.cotisation.dto.StatistiquesQuotidiennesDto;
import cm.cositi.api.cotisation.dto.StatistiquesQuotidiennesDto.AgregatDto;
import cm.cositi.api.cotisation.dto.VerifierDoublonPaiementDto;
import cm.cositi.api.cotisation.entite.OrigineRepartition;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.droits.service.ServiceCalculDroits;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.repository.DemandeValidationRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ServicePaiementImpl implements ServicePaiement {

    private static final Set<String> MODES_MOBILE_MONEY = Set.of("ORANGE_MONEY", "MTN_MOMO");

    /** Modes autorisés par la contrainte {@code paiement.mode_paiement} (V3) — ordre d'affichage des statistiques. */
    private static final List<String> MODES_PAIEMENT = List.of("ESPECES", "ORANGE_MONEY", "MTN_MOMO", "VIREMENT");

    /** Un paiement annulé ou rejeté n'existe plus pour le contrôle de doublon. */
    private static final Set<StatutPaiement> STATUTS_INACTIFS = EnumSet.of(StatutPaiement.ANNULE, StatutPaiement.REJETE);

    private final PaiementRepository paiementRepository;
    private final AdherentRepository adherentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAffectationPaiement serviceAffectationPaiement;
    private final ServiceCalculDroits serviceCalculDroits;
    private final ServiceAudit serviceAudit;
    private final ApplicationEventPublisher evenements;
    private final DemandeValidationRepository demandeValidationRepository;
    private final RegleRepartitionCotisation regleRepartition;
    private final AdhesionRepository adhesionRepository;
    private final PackRepository packRepository;
    private final ServiceParametre serviceParametre;

    /** Statuts d'adhérent pour lesquels aucune cotisation n'est acceptée (paramètre [V], vide par défaut). */
    static final String CLE_STATUTS_REFUSES = "COTISATION_STATUTS_ADHERENT_REFUSES";

    public ServicePaiementImpl(PaiementRepository paiementRepository, AdherentRepository adherentRepository,
                                JdbcTemplate jdbcTemplate, ServicePerimetreDonnees perimetre,
                                ServiceAffectationPaiement serviceAffectationPaiement,
                                ServiceCalculDroits serviceCalculDroits, ServiceAudit serviceAudit,
                                ApplicationEventPublisher evenements,
                                DemandeValidationRepository demandeValidationRepository,
                                RegleRepartitionCotisation regleRepartition, AdhesionRepository adhesionRepository,
                                PackRepository packRepository, ServiceParametre serviceParametre) {
        this.paiementRepository = paiementRepository;
        this.adherentRepository = adherentRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.perimetre = perimetre;
        this.serviceAffectationPaiement = serviceAffectationPaiement;
        this.serviceCalculDroits = serviceCalculDroits;
        this.serviceAudit = serviceAudit;
        this.evenements = evenements;
        this.demandeValidationRepository = demandeValidationRepository;
        this.regleRepartition = regleRepartition;
        this.adhesionRepository = adhesionRepository;
        this.packRepository = packRepository;
        this.serviceParametre = serviceParametre;
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CREER')")
    @Transactional
    public ResultatEnregistrementPaiement enregistrer(EnregistrementPaiementDto dto, String cleIdempotence,
                                                        Utilisateur auteur) {
        return creer(dto, cleIdempotence, auteur, false);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CREER')")
    @Transactional
    public ResultatEnregistrementPaiement enregistrer(EnregistrementPaiementDto dto, String cleIdempotence,
                                                        Utilisateur auteur, boolean brouillon) {
        return creer(dto, cleIdempotence, auteur, brouillon);
    }

    private ResultatEnregistrementPaiement creer(EnregistrementPaiementDto dto, String cleIdempotence,
                                                  Utilisateur auteur, boolean brouillon) {
        // #35 — idempotence : une clé déjà vue renvoie l'existant, jamais un second paiement.
        String empreinte = empreinte(dto, brouillon);
        if (cleIdempotence != null && !cleIdempotence.isBlank()) {
            // Deux soumissions concurrentes de la même clé : la seconde attend ici la fin de la transaction de la
            // première (verrou transactionnel PostgreSQL sur la clé), puis lit la cotisation qu'elle a créée — au
            // lieu de buter sur la contrainte UNIQUE et de recevoir un 409 générique.
            jdbcTemplate.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> null, cleIdempotence);
            var existant = paiementRepository.findByCleIdempotence(cleIdempotence);
            if (existant.isPresent()) {
                String empreinteExistante = existant.get().getEmpreinteRequete();
                if (empreinteExistante != null && !empreinteExistante.equals(empreinte)) {
                    throw new ExceptionConflit("IDEMPOTENCY_KEY_CONFLIT",
                            "Cette clé d'idempotence a déjà servi pour une autre cotisation : générez une nouvelle clé "
                                    + "pour une nouvelle saisie.");
                }
                return new ResultatEnregistrementPaiement(PaiementDto.depuis(existant.get()), true);
            }
        }

        // #12 — contrôle de l'adhérent : existence, non archivé, périmètre.
        Adherent adherent = adherentRepository.findById(dto.adherentId())
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
        if (adherent.isArchive()) {
            throw new ExceptionMetier("PAIEMENT_ADHERENT_ARCHIVE", "Cet adhérent est archivé, aucun paiement ne peut lui être rattaché.",
                    HttpStatus.CONFLICT);
        }
        perimetre.verifierAccesAdherent(auteur, dto.adherentId());
        verifierStatutCotisable(adherent);

        if ("INSCRIPTION".equals(dto.typePaiement())) {
            // V20 : le frais d'adhésion a son propre enregistrement (agent collecteur, unicité, rapprochement) ; le
            // saisir aussi comme paiement le compterait deux fois et lui ferait acheter des droits.
            throw new ExceptionConflit("PAIEMENT_INSCRIPTION_PAR_FRAIS_ADHESION",
                    "Le frais d'adhésion s'enregistre par POST /api/v1/adherents/{id}/frais-adhesion.");
        }

        // #11 — contrôle du montant.
        if (dto.montant().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ExceptionValidation("PAIEMENT_MONTANT_INVALIDE", "Le montant doit être strictement positif.", "montant");
        }

        if (MODES_MOBILE_MONEY.contains(dto.modePaiement())
                && (dto.referenceTransaction() == null || dto.referenceTransaction().isBlank())) {
            throw new ExceptionValidation("PAIEMENT_REFERENCE_MANQUANTE",
                    "La référence de transaction est obligatoire pour un paiement Orange Money ou MTN MoMo.",
                    "referenceTransaction");
        }

        if (dto.datePaiement().isAfter(LocalDate.now()) || dto.datePaiement().isBefore(adherent.getDateAdhesion())) {
            throw new ExceptionValidation("PAIEMENT_DATE_INCOHERENTE",
                    "La date de paiement doit être comprise entre la date d'adhésion et aujourd'hui.", "datePaiement");
        }

        // #13 — une référence de transaction identifie une seule transaction réelle.
        verifierReferenceLibre(dto.modePaiement(), dto.referenceTransaction(), null);

        // Règles module 2 §2 à §4 : répartition Sécurité sociale / Épargne validée et enregistrée avec la cotisation.
        RegleRepartitionCotisation.Repartition repartition = regleRepartition.determiner(dto.montant(),
                dto.montantSecuriteSociale(), dto.montantEpargne(), dto.adherentId());

        // #10 — référence unique générée côté serveur (séquence PostgreSQL + contrainte UNIQUE).
        Long valeurSequence = jdbcTemplate.queryForObject("SELECT nextval('seq_numero_recu')", Long.class);
        String numeroRecu = "REC-" + String.format("%06d", valeurSequence);

        Paiement paiement = new Paiement(dto.adherentId(), numeroRecu, dto.datePaiement(), dto.montant(),
                dto.modePaiement(), normaliserReference(dto.referenceTransaction()), dto.typePaiement(),
                dto.agentEncaisseurId(), (cleIdempotence == null || cleIdempotence.isBlank()) ? null : cleIdempotence);
        if (brouillon) {
            paiement.marquerBrouillon();
        }
        paiement.definirRepartition(repartition.securiteSociale(), repartition.epargne(), repartition.origine());
        paiement.setEmpreinteRequete(empreinte);
        paiement.setPackId(choisirPack(adherent, dto.packId(), numeroRecu, auteur));
        paiement = paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_CREATION, "paiement", paiement.getId(), null,
                PaiementDto.depuis(paiement), brouillon ? "Saisie en brouillon" : null);
        publier(paiement, "CREATION");

        return new ResultatEnregistrementPaiement(PaiementDto.depuis(paiement), false);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public ResultatDoublonPaiementDto verifierDoublon(VerifierDoublonPaiementDto dto, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, dto.adherentId());

        boolean referenceUtilisee = dto.referenceTransaction() != null && !dto.referenceTransaction().isBlank()
                && !paiementRepository.trouverParReference(dto.modePaiement(), dto.referenceTransaction().trim(),
                        STATUTS_INACTIFS).isEmpty();

        List<PaiementDto> potentiels = List.of();
        if (dto.datePaiement() != null && dto.montant() != null) {
            // L'adhérent est déjà vérifié dans le périmètre : ses paiements le sont aussi.
            potentiels = paiementRepository.trouverDoublonsPotentiels(dto.adherentId(), dto.datePaiement(),
                    dto.montant(), dto.modePaiement(), STATUTS_INACTIFS).stream().map(PaiementDto::depuis).toList();
        }
        return new ResultatDoublonPaiementDto(referenceUtilisee, potentiels, referenceUtilisee || !potentiels.isEmpty());
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CREER')")
    @Transactional
    public PaiementDto soumettre(UUID paiementId, Utilisateur auteur) {
        Paiement paiement = charger(paiementId);
        perimetre.verifierAccesPaiement(auteur, paiementId);

        if (!auteur.getIdentifiant().equals(paiement.getCreePar()) && !perimetre.estPerimetreGlobal(auteur)) {
            throw new ExceptionAutorisation("PAIEMENT_SOUMISSION_RESERVEE_AUTEUR",
                    "Seul l'auteur de la saisie peut soumettre ce brouillon à validation.");
        }
        if (paiement.getStatut() == StatutPaiement.A_CONTROLER) {
            throw new ExceptionConflit("PAIEMENT_DEJA_SOUMIS", "Ce paiement est déjà soumis à validation.");
        }
        if (paiement.getStatut() != StatutPaiement.BROUILLON) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE", "Seul un brouillon peut être soumis à validation.");
        }

        exigerAucuneDemandeOuverte(paiement);
        PaiementDto avant = PaiementDto.depuis(paiement);
        paiement.soumettre();
        paiement = paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_SOUMISSION, "paiement", paiement.getId(), avant,
                PaiementDto.depuis(paiement), null);
        publier(paiement, "SOUMISSION");
        return PaiementDto.depuis(paiement);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:VALIDER')")
    @Transactional
    public PaiementDto valider(UUID paiementId, Utilisateur validateur) {
        Paiement paiement = charger(paiementId);
        perimetre.verifierAccesPaiement(validateur, paiementId);

        if (validateur.getIdentifiant().equals(paiement.getCreePar())) {
            throw new ExceptionMetier("PAIEMENT_AUTO_VALIDATION_INTERDITE",
                    "Vous ne pouvez pas valider un paiement que vous avez vous-même saisi.", HttpStatus.FORBIDDEN);
        }
        if (paiement.getStatut() == StatutPaiement.VALIDE || paiement.getStatut() == StatutPaiement.RAPPROCHE) {
            throw new ExceptionConflit("PAIEMENT_DEJA_VALIDE", "Ce paiement est déjà validé.");
        }
        if (paiement.getStatut() == StatutPaiement.ANNULE || paiement.getStatut() == StatutPaiement.REJETE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE", "Un paiement annulé ou rejeté ne peut pas être validé.");
        }
        if (paiement.getStatut() == StatutPaiement.BROUILLON) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Un brouillon doit d'abord être soumis à validation (POST /paiements/{id}/soumettre).");
        }
        if (paiement.getStatut() == StatutPaiement.INCOHERENCE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Un paiement signalé incohérent doit d'abord être corrigé (POST /paiements/{id}/corriger) avant validation.");
        }

        exigerAucuneDemandeOuverte(paiement);
        paiement.valider(validateur.getId());
        paiement = paiementRepository.save(paiement);

        serviceAffectationPaiement.affecter(paiement.getId(), validateur);
        // Jalon J6 : imputation des droits dans la même transaction que la validation (AGENTS.md règle absolue n°6),
        // une fois pour le paiement (somme des composantes qui ouvrent des droits), pas part par part.
        serviceCalculDroits.imputerPaiement(paiement.getId());

        serviceAudit.tracer(TypeOperation.PAIEMENT_VALIDATION, "paiement", paiement.getId(), null,
                PaiementDto.depuis(paiement), null);
        publier(paiement, "VALIDATION");
        return PaiementDto.depuis(paiement);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:VALIDER')")
    @Transactional
    public PaiementDto rejeter(UUID paiementId, String motif, Utilisateur validateur) {
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("PAIEMENT_MOTIF_REQUIS", "Le motif du rejet est obligatoire.", "motif");
        }
        Paiement paiement = charger(paiementId);
        perimetre.verifierAccesPaiement(validateur, paiementId);

        if (validateur.getIdentifiant().equals(paiement.getCreePar())) {
            throw new ExceptionMetier("PAIEMENT_AUTO_REJET_INTERDIT",
                    "Vous ne pouvez pas rejeter un paiement que vous avez vous-même saisi.", HttpStatus.FORBIDDEN);
        }
        if (paiement.getStatut() == StatutPaiement.REJETE) {
            throw new ExceptionConflit("PAIEMENT_DEJA_REJETE", "Ce paiement est déjà rejeté.");
        }
        if (paiement.getStatut() != StatutPaiement.A_CONTROLER && paiement.getStatut() != StatutPaiement.INCOHERENCE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Seul un paiement à contrôler ou incohérent peut être rejeté.");
        }

        exigerAucuneDemandeOuverte(paiement);
        PaiementDto avant = PaiementDto.depuis(paiement);
        paiement.rejeter(motif.trim(), validateur.getId());
        paiement = paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_REJET, "paiement", paiement.getId(), avant,
                PaiementDto.depuis(paiement), motif.trim());
        publier(paiement, "REJET");
        return PaiementDto.depuis(paiement);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CONFIRMER_CHEF')")
    @Transactional
    public PaiementDto confirmerParChef(UUID paiementId, String motif, Utilisateur chefUtilisateur) {
        if (!chefUtilisateur.possedeRole("CHEF_AGENT_TERRAIN")) {
            throw new ExceptionAutorisation("PAIEMENT_CONFIRMATION_RESERVEE_CHEF",
                    "Seul le Chef des agents de terrain peut confirmer une collecte.");
        }
        Paiement paiement = charger(paiementId);
        if (paiement.getAgentEncaisseurId() == null) {
            throw new ExceptionValidation("PAIEMENT_AGENT_ENCAISSEUR_MANQUANT",
                    "Ce paiement n'a pas d'agent encaisseur renseigné, la confirmation hiérarchique est impossible.");
        }
        verifierPerimetreChefSurEncaisseur(chefUtilisateur, paiement.getAgentEncaisseurId());
        if (paiement.getStatut() == StatutPaiement.ANNULE || paiement.getStatut() == StatutPaiement.INCOHERENCE
                || paiement.getStatut() == StatutPaiement.REJETE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Un paiement annulé, rejeté ou incohérent ne peut pas être confirmé par le Chef.");
        }
        if (paiement.getConfirmeParChefId() != null) {
            throw new ExceptionConflit("PAIEMENT_DEJA_CONFIRME_CHEF", "Ce paiement a déjà été confirmé par un Chef.");
        }

        paiement.confirmerParChef(chefUtilisateur.getId());
        paiement = paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_CONFIRMATION_CHEF, "paiement", paiement.getId(), null,
                PaiementDto.depuis(paiement), motif);
        publier(paiement, "CONFIRMATION_CHEF");
        return PaiementDto.depuis(paiement);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:SIGNALER_INCOHERENCE')")
    @Transactional
    public PaiementDto signalerIncoherence(UUID paiementId, String motif, Utilisateur dafUtilisateur) {
        if (!dafUtilisateur.possedeRole("DAF")) {
            throw new ExceptionAutorisation("PAIEMENT_SIGNALEMENT_RESERVE_DAF",
                    "Seul le DAF peut signaler une incohérence sur un paiement.");
        }
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("PAIEMENT_MOTIF_REQUIS", "Le motif de l'incohérence est obligatoire.");
        }
        Paiement paiement = charger(paiementId);
        perimetre.verifierAccesPaiement(dafUtilisateur, paiementId);
        if (paiement.getStatut() == StatutPaiement.INCOHERENCE) {
            throw new ExceptionConflit("PAIEMENT_DEJA_INCOHERENT", "Ce paiement est déjà signalé incohérent.");
        }
        if (paiement.getStatut() != StatutPaiement.A_CONTROLER) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Seul un paiement à contrôler peut être signalé incohérent.");
        }

        exigerAucuneDemandeOuverte(paiement);
        PaiementDto avant = PaiementDto.depuis(paiement);
        paiement.signalerIncoherence(motif);
        paiement = paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_SIGNALEMENT_INCOHERENCE, "paiement", paiement.getId(), avant,
                PaiementDto.depuis(paiement), motif);
        publier(paiement, "SIGNALEMENT_INCOHERENCE");
        return PaiementDto.depuis(paiement);
    }

    /**
     * Périmètre du Chef pour la confirmation hiérarchique (UC-CHEF-10) : l'agent encaisseur doit être le Chef
     * lui-même ou l'un de ses agents supervisés ({@code agent.chef_agent_id}), même mécanisme que
     * {@code ServicePerimetreDonneesImpl.adherentsDuPerimetreAgent}.
     */
    private void verifierPerimetreChefSurEncaisseur(Utilisateur chef, UUID agentEncaisseurId) {
        if (chef.getAgentId() == null) {
            throw new ExceptionAutorisation("PAIEMENT_HORS_PERIMETRE_CHEF",
                    "Ce compte Chef n'est rattaché à aucun agent, aucune confirmation n'est possible.");
        }
        Boolean dansPerimetre = jdbcTemplate.queryForObject(
                "SELECT (? = ? OR EXISTS (SELECT 1 FROM agent WHERE id = ? AND chef_agent_id = ?))",
                Boolean.class, agentEncaisseurId, chef.getAgentId(), agentEncaisseurId, chef.getAgentId());
        if (dansPerimetre == null || !dansPerimetre) {
            throw new ExceptionAutorisation("PAIEMENT_HORS_PERIMETRE_CHEF",
                    "Cet agent encaisseur n'appartient pas à votre périmètre de supervision.");
        }
    }

    /**
     * #19 — correction autorisée. Un brouillon reste librement modifiable par son auteur (motif facultatif) ;
     * une fois soumis, les champs sensibles ne changent que par cette voie, motif obligatoire, audit avant/après.
     */
    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CORRIGER') or hasAuthority('PAIEMENT:CREER')")
    @Transactional
    public PaiementDto corriger(UUID paiementId, CorrectionPaiementDto dto, Utilisateur auteur) {
        Paiement paiement = charger(paiementId);
        perimetre.verifierAccesPaiement(auteur, paiementId);

        if (paiement.getStatut() != StatutPaiement.BROUILLON) {
            // Workflow V19 (§11, §24) : une cotisation soumise ou validée ne se corrige plus directement — la
            // correction passe par une demande validée par le DAF, appliquée atomiquement avec les recalculs.
            throw new ExceptionConflit("PAIEMENT_CORRECTION_PAR_DEMANDE",
                    "Cette cotisation est soumise : sa correction passe par une demande "
                            + "(POST /api/v1/paiements/{id}/demandes-correction), validée par le DAF.");
        }
        if (!auteur.getIdentifiant().equals(paiement.getCreePar()) && !possedePermission(auteur, "PAIEMENT:CORRIGER")) {
            throw new ExceptionAutorisation("PAIEMENT_MODIFICATION_RESERVEE_AUTEUR",
                    "Seul l'auteur d'un brouillon peut le modifier.");
        }

        PaiementDto avant = PaiementDto.depuis(paiement);

        if (dto.montant() != null) {
            if (dto.montant().compareTo(BigDecimal.ZERO) <= 0) {
                throw new ExceptionValidation("PAIEMENT_MONTANT_INVALIDE", "Le montant doit être strictement positif.", "montant");
            }
        }
        corrigerRepartition(paiement, dto);
        if (dto.datePaiement() != null) {
            if (dto.datePaiement().isAfter(LocalDate.now())) {
                throw new ExceptionValidation("PAIEMENT_DATE_INCOHERENTE",
                        "La date de paiement ne peut pas être dans le futur.", "datePaiement");
            }
            paiement.modifierDatePaiement(dto.datePaiement());
        }
        if (dto.referenceTransaction() != null) {
            verifierReferenceLibre(paiement.getModePaiement(), dto.referenceTransaction(), paiement.getId());
            paiement.modifierReferenceTransaction(normaliserReference(dto.referenceTransaction()));
        }
        if (MODES_MOBILE_MONEY.contains(paiement.getModePaiement())
                && (paiement.getReferenceTransaction() == null || paiement.getReferenceTransaction().isBlank())) {
            throw new ExceptionValidation("PAIEMENT_REFERENCE_MANQUANTE",
                    "La référence de transaction est obligatoire pour un paiement Orange Money ou MTN MoMo.",
                    "referenceTransaction");
        }

        paiement = paiementRepository.save(paiement);
        String motif = dto.motif() == null || dto.motif().isBlank() ? "Modification du brouillon" : dto.motif();
        serviceAudit.tracer(TypeOperation.PAIEMENT_CORRECTION, "paiement", paiement.getId(), avant,
                PaiementDto.depuis(paiement), motif);
        publier(paiement, "CORRECTION");
        return PaiementDto.depuis(paiement);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:ANNULER')")
    @Transactional
    public void annuler(UUID paiementId, AnnulerPaiementDto dto, Utilisateur auteur) {
        if (dto.motif() == null || dto.motif().isBlank()) {
            throw new ExceptionValidation("PAIEMENT_MOTIF_REQUIS", "Le motif de l'annulation est obligatoire.");
        }
        Paiement paiement = charger(paiementId);
        perimetre.verifierAccesPaiement(auteur, paiementId);

        if (paiement.getStatut() == StatutPaiement.ANNULE) {
            throw new ExceptionConflit("PAIEMENT_DEJA_ANNULE", "Ce paiement est déjà annulé.");
        }
        if (paiement.getStatut() == StatutPaiement.REJETE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE", "Un paiement rejeté ne peut pas être annulé.");
        }

        exigerAucuneDemandeOuverte(paiement);
        PaiementDto avant = PaiementDto.depuis(paiement);
        paiement.annuler(dto.motif());
        paiement = paiementRepository.save(paiement);

        // Le recalcul des périodes de droits issues de ce paiement relève du module Droits (jalon J6,
        // non implémenté à ce stade) — ne pas inventer un recalcul ici (AGENTS.md règle absolue n°9).
        serviceAudit.tracer(TypeOperation.PAIEMENT_ANNULATION, "paiement", paiement.getId(), avant,
                PaiementDto.depuis(paiement), dto.motif());
        publier(paiement, "ANNULATION");
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public ReponsePaginee<PaiementDto> journal(CritereJournalPaiement critere, Pageable pageable, Utilisateur demandeur) {
        Specification<Paiement> spec = Specification.<Paiement>where(null).and(perimetre.perimetrePaiement(demandeur));
        if (critere.adherentId() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("adherentId"), critere.adherentId()));
        }
        if (critere.adherentMatricule() != null && !critere.adherentMatricule().isBlank()) {
            // #3 — résolu côté serveur : un matricule inconnu donne une page vide, jamais une erreur qui
            // confirmerait ou infirmerait l'existence d'un adhérent hors périmètre.
            UUID idAdherent = adherentRepository.findByMatricule(critere.adherentMatricule().trim())
                    .map(Adherent::getId).orElse(null);
            spec = idAdherent == null
                    ? spec.and((root, q, cb) -> cb.disjunction())
                    : spec.and((root, q, cb) -> cb.equal(root.get("adherentId"), idAdherent));
        }
        if (critere.reference() != null && !critere.reference().isBlank()) {
            // #5 — numéro de reçu ou référence de transaction, insensible à la casse.
            String reference = critere.reference().trim().toLowerCase();
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.equal(cb.lower(root.<String>get("numeroRecu")), reference),
                    cb.equal(cb.lower(cb.trim(root.<String>get("referenceTransaction"))), reference)));
        }
        if (critere.statut() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("statut"), critere.statut()));
        }
        if (critere.modePaiement() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("modePaiement"), critere.modePaiement()));
        }
        if (critere.dateDu() != null) {
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("datePaiement"), critere.dateDu()));
        }
        if (critere.dateAu() != null) {
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("datePaiement"), critere.dateAu()));
        }
        if (critere.agentId() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("agentEncaisseurId"), critere.agentId()));
        }
        Page<PaiementDto> page = paiementRepository.findAll(spec, pageable).map(PaiementDto::depuis);
        return ReponsePaginee.depuis(page);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public RecuDto genererRecu(UUID paiementId, Utilisateur demandeur) {
        Paiement paiement = charger(paiementId);
        perimetre.verifierAccesPaiement(demandeur, paiementId);
        return RecuDto.depuis(paiement);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public PaiementDto consulter(UUID paiementId, Utilisateur demandeur) {
        perimetre.verifierAccesPaiement(demandeur, paiementId);
        return PaiementDto.depuis(charger(paiementId));
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public List<HistoriqueStatutPaiementDto> historiqueStatuts(UUID paiementId, Utilisateur demandeur) {
        charger(paiementId);
        perimetre.verifierAccesPaiement(demandeur, paiementId);

        List<HistoriqueStatutPaiementDto> brut = jdbcTemplate.query("""
                        SELECT horodatage, type_operation, utilisateur_identifiant, motif,
                               valeurs_avant ->> 'statut' AS statut_avant, valeurs_apres ->> 'statut' AS statut_apres
                        FROM journal_audit
                        WHERE entite = 'paiement' AND entite_id = ? AND resultat = 'SUCCES'
                        ORDER BY horodatage, id
                        """,
                (rs, i) -> new HistoriqueStatutPaiementDto(
                        rs.getObject("horodatage", Timestamp.class).toInstant(),
                        TypeOperation.valueOf(rs.getString("type_operation")),
                        rs.getString("statut_avant"),
                        rs.getString("statut_apres"),
                        rs.getString("utilisateur_identifiant"),
                        rs.getString("motif")),
                paiementId);

        // Certaines opérations ne tracent que l'état après (création, validation) : l'état avant se déduit
        // alors de l'étape précédente, la chronologie restant continue.
        List<HistoriqueStatutPaiementDto> resultat = new ArrayList<>(brut.size());
        String statutPrecedent = null;
        for (HistoriqueStatutPaiementDto ligne : brut) {
            String avant = ligne.statutAvant() != null ? ligne.statutAvant() : statutPrecedent;
            resultat.add(new HistoriqueStatutPaiementDto(ligne.horodatage(), ligne.typeOperation(), avant,
                    ligne.statutApres(), ligne.acteur(), ligne.motif()));
            if (ligne.statutApres() != null) {
                statutPrecedent = ligne.statutApres();
            }
        }
        return resultat;
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public StatistiquesQuotidiennesDto statistiquesQuotidiennes(LocalDate date, Utilisateur demandeur) {
        LocalDate jour = date != null ? date : LocalDate.now();
        Specification<Paiement> spec = Specification.<Paiement>where(null)
                .and(perimetre.perimetrePaiement(demandeur))
                .and((root, q, cb) -> cb.equal(root.get("datePaiement"), jour));
        List<Paiement> paiements = paiementRepository.findAll(spec);

        Map<String, long[]> nombres = new LinkedHashMap<>();
        Map<String, BigDecimal> montantsStatut = new LinkedHashMap<>();
        for (StatutPaiement s : StatutPaiement.values()) {
            montantsStatut.put(s.name(), BigDecimal.ZERO);
            nombres.put(s.name(), new long[1]);
        }
        Map<String, long[]> nombresMode = new LinkedHashMap<>();
        Map<String, BigDecimal> montantsMode = new LinkedHashMap<>();
        for (String mode : MODES_PAIEMENT) {
            montantsMode.put(mode, BigDecimal.ZERO);
            nombresMode.put(mode, new long[1]);
        }

        BigDecimal total = BigDecimal.ZERO;
        for (Paiement p : paiements) {
            String statut = p.getStatut().name();
            nombres.get(statut)[0]++;
            montantsStatut.merge(statut, p.getMontant(), BigDecimal::add);
            nombresMode.computeIfAbsent(p.getModePaiement(), k -> new long[1])[0]++;
            montantsMode.merge(p.getModePaiement(), p.getMontant(), BigDecimal::add);
            total = total.add(p.getMontant());
        }

        Map<String, AgregatDto> parStatut = new LinkedHashMap<>();
        montantsStatut.forEach((k, v) -> parStatut.put(k, new AgregatDto(nombres.get(k)[0], v)));
        Map<String, AgregatDto> parMode = new LinkedHashMap<>();
        montantsMode.forEach((k, v) -> parMode.put(k, new AgregatDto(nombresMode.get(k)[0], v)));
        return new StatistiquesQuotidiennesDto(jour, paiements.size(), total, parStatut, parMode);
    }

    /**
     * #13 — refuse une référence de transaction déjà portée par un paiement actif du même mode.
     * {@code exclureId} : le paiement lui-même, lors d'une correction.
     */
    private void verifierReferenceLibre(String mode, String reference, UUID exclureId) {
        if (reference == null || reference.isBlank()) {
            return;
        }
        boolean dejaUtilisee = paiementRepository.trouverParReference(mode, reference.trim(), STATUTS_INACTIFS)
                .stream().anyMatch(p -> exclureId == null || !exclureId.equals(p.getId()));
        if (dejaUtilisee) {
            throw new ExceptionConflit("PAIEMENT_REFERENCE_DEJA_UTILISEE",
                    "Cette référence de transaction est déjà enregistrée sur un autre paiement.");
        }
    }

    /**
     * Une décision sur une cotisation dont la correction est en cours d'examen porterait sur des données que le DAF
     * s'apprête peut-être à changer : elle attend la décision sur la demande.
     */
    private void exigerAucuneDemandeOuverte(Paiement paiement) {
        if (demandeValidationRepository.existsByTypeEntiteAndEntiteIdAndStatutIn(TypeEntiteWorkflow.PAIEMENT,
                paiement.getId(), StatutDemandeValidation.OUVERTS)) {
            throw new ExceptionConflit("PAIEMENT_DEMANDE_CORRECTION_EN_COURS",
                    "Une demande de correction est en cours sur cette cotisation : elle doit être traitée d'abord.");
        }
    }

    /**
     * Montant et répartition d'un brouillon changent ensemble : une répartition saisie par le Gestionnaire n'est jamais
     * réajustée en silence — si le montant change, la nouvelle répartition doit être fournie.
     */
    private void corrigerRepartition(Paiement paiement, CorrectionPaiementDto dto) {
        boolean montantChange = dto.montant() != null && dto.montant().compareTo(paiement.getMontant()) != 0;
        boolean repartitionFournie = dto.montantSecuriteSociale() != null || dto.montantEpargne() != null;
        if (!montantChange && !repartitionFournie) {
            return;
        }
        BigDecimal montant = dto.montant() != null ? dto.montant() : paiement.getMontant();
        if (montantChange && !repartitionFournie && paiement.getOrigineRepartition() == OrigineRepartition.SAISIE) {
            throw new ExceptionValidation("COTISATION_REPARTITION_REQUISE",
                    "Le montant change : indiquez la nouvelle répartition entre Sécurité sociale et Épargne.",
                    "montantSecuriteSociale");
        }
        RegleRepartitionCotisation.Repartition repartition = regleRepartition.determiner(montant,
                dto.montantSecuriteSociale(), dto.montantEpargne(), paiement.getAdherentId());
        paiement.modifierMontant(montant);
        paiement.definirRepartition(repartition.securiteSociale(), repartition.epargne(), repartition.origine());
    }

    /**
     * Statut d'adhérent compatible avec une cotisation. La règle n'est pas définie au-delà de l'archivage (déjà refusé) :
     * la liste des statuts refusés vit dans {@code COTISATION_STATUTS_ADHERENT_REFUSES} ([V], vide par défaut).
     */
    private void verifierStatutCotisable(Adherent adherent) {
        if (statutsRefuses().contains(adherent.getStatut())) {
            throw new ExceptionMetier("COTISATION_STATUT_ADHERENT_INCOMPATIBLE",
                    "Aucune cotisation ne peut être enregistrée pour un adhérent au statut " + adherent.getStatut() + ".",
                    HttpStatus.CONFLICT);
        }
    }

    private Set<StatutAdherent> statutsRefuses() {
        return statutsRefuses(serviceParametre);
    }

    /** Lecture du paramètre {@code COTISATION_STATUTS_ADHERENT_REFUSES} ; une valeur inconnue est ignorée. */
    public static Set<StatutAdherent> statutsRefuses(ServiceParametre parametres) {
        Set<StatutAdherent> statuts = EnumSet.noneOf(StatutAdherent.class);
        for (String code : parametres.texte(CLE_STATUTS_REFUSES).split(",")) {
            try {
                if (!code.isBlank()) {
                    statuts.add(StatutAdherent.valueOf(code.trim()));
                }
            } catch (IllegalArgumentException e) {
                // Valeur inconnue dans le paramètre : ignorée plutôt que de bloquer toutes les cotisations.
            }
        }
        return statuts;
    }

    /**
     * Le pack ne se choisit plus à la création de l'adhérent (règles module 1 §7) mais à la cotisation. Sans adhésion
     * ouverte, la cotisation doit en désigner un : l'adhésion est alors ouverte à la date d'adhésion, tracée. Avec une
     * adhésion ouverte, un pack différent est refusé — le changement de pack garde sa route dédiée, qui en trace
     * l'impact sur les droits.
     */
    private java.util.UUID choisirPack(Adherent adherent, java.util.UUID packId, String numeroRecu, Utilisateur auteur) {
        var ouverte = adhesionRepository.findByAdherentIdAndDateFinIsNull(adherent.getId());
        if (ouverte.isPresent()) {
            if (packId != null && !packId.equals(ouverte.get().getPackId())) {
                throw new ExceptionConflit("COTISATION_PACK_DIFFERENT",
                        "L'adhérent a déjà un pack : son changement passe par POST /api/v1/adherents/{id}/pack.");
            }
            return packId;
        }
        if (packId == null) {
            throw new ExceptionValidation("COTISATION_PACK_REQUIS",
                    "Première cotisation de cet adhérent : choisissez son pack.", "packId");
        }
        if (!packRepository.findById(packId).map(p -> p.isActif()).orElse(false)) {
            throw new ExceptionValidation("COTISATION_PACK_INVALIDE", "Le pack sélectionné est introuvable ou inactif.",
                    "packId");
        }
        Adhesion adhesion = adhesionRepository.save(new Adhesion(adherent.getId(), packId, adherent.getDateAdhesion(),
                "Pack choisi à la première cotisation (" + numeroRecu + ")", auteur.getId()));
        serviceAudit.tracer(TypeOperation.ADHERENT_CHANGEMENT_PACK, "adherent", adherent.getId(), null,
                AdhesionDto.depuis(adhesion), "Pack choisi lors de l'enregistrement de la cotisation " + numeroRecu);
        evenements.publishEvent(new AdherentModifieEvent(adherent.getId(), "CHOIX_PACK"));
        return packId;
    }

    /**
     * Empreinte SHA-256 des champs qui définissent la cotisation : rejouer la même clé avec la même requête renvoie la
     * cotisation existante (200) ; la rejouer avec une requête différente est un conflit (409), jamais une substitution.
     */
    static String empreinte(EnregistrementPaiementDto dto, boolean brouillon) {
        String canonique = String.join("|",
                String.valueOf(dto.adherentId()), String.valueOf(dto.datePaiement()), decimal(dto.montant()),
                String.valueOf(dto.modePaiement()), String.valueOf(normaliserReference(dto.referenceTransaction())),
                String.valueOf(dto.typePaiement()), String.valueOf(dto.agentEncaisseurId()),
                decimal(dto.montantSecuriteSociale()), decimal(dto.montantEpargne()), String.valueOf(dto.packId()),
                String.valueOf(brouillon));
        try {
            byte[] hash = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(canonique.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible", e);
        }
    }

    private static String decimal(BigDecimal valeur) {
        return valeur == null ? "null" : valeur.stripTrailingZeros().toPlainString();
    }

    private static boolean possedePermission(Utilisateur utilisateur, String code) {
        return utilisateur.getAuthorities().stream().anyMatch(a -> code.equals(a.getAuthority()));
    }

    private static String normaliserReference(String reference) {
        return reference == null || reference.isBlank() ? null : reference.trim();
    }

    private void publier(Paiement paiement, String typeChangement) {
        evenements.publishEvent(PaiementModifieEvent.paiement(paiement.getId(), paiement.getAdherentId(),
                typeChangement, paiement.getStatut().name()));
    }

    private Paiement charger(UUID id) {
        return paiementRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("PAIEMENT_INTROUVABLE", "Paiement introuvable."));
    }
}
