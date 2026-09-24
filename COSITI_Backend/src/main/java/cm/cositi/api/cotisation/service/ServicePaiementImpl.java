package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.commun.util.ValidationAllocation;
import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.cotisation.dto.AnnulerPaiementDto;
import cm.cositi.api.cotisation.dto.CorrectionPaiementDto;
import cm.cositi.api.cotisation.dto.CritereJournalPaiement;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.dto.RecommandationAllocationDto;
import cm.cositi.api.cotisation.dto.RecuDto;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.RecommandationAllocationPaiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.cotisation.repository.RecommandationAllocationPaiementRepository;
import cm.cositi.api.droits.service.ServiceCalculDroits;
import cm.cositi.api.notification.ServiceNotification;
import cm.cositi.api.parametre.ParametreRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class ServicePaiementImpl implements ServicePaiement {

    private static final Set<String> MODES_MOBILE_MONEY = Set.of("ORANGE_MONEY", "MTN_MOMO");
    private static final String CLE_PARAMETRE_MINIMUM_SECURITE_SOCIALE = "MONTANT_MINIMUM_SECURITE_SOCIALE";
    private static final String CODE_COMPOSANTE_SECURITE_SOCIALE = ServiceAffectationPaiementImpl.CODE_COMPOSANTE_SECURITE_SOCIALE;

    private final PaiementRepository paiementRepository;
    private final AdherentRepository adherentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAffectationPaiement serviceAffectationPaiement;
    private final ServiceCalculDroits serviceCalculDroits;
    private final ServiceAudit serviceAudit;
    private final RecommandationAllocationPaiementRepository recommandationRepository;
    private final ServiceParametre serviceParametre;
    private final ParametreRepository parametreRepository;
    private final ServiceNotification serviceNotification;

    public ServicePaiementImpl(PaiementRepository paiementRepository, AdherentRepository adherentRepository,
                                JdbcTemplate jdbcTemplate, ServicePerimetreDonnees perimetre,
                                ServiceAffectationPaiement serviceAffectationPaiement,
                                ServiceCalculDroits serviceCalculDroits, ServiceAudit serviceAudit,
                                RecommandationAllocationPaiementRepository recommandationRepository,
                                ServiceParametre serviceParametre, ParametreRepository parametreRepository,
                                ServiceNotification serviceNotification) {
        this.paiementRepository = paiementRepository;
        this.adherentRepository = adherentRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.perimetre = perimetre;
        this.serviceAffectationPaiement = serviceAffectationPaiement;
        this.serviceCalculDroits = serviceCalculDroits;
        this.serviceAudit = serviceAudit;
        this.recommandationRepository = recommandationRepository;
        this.serviceParametre = serviceParametre;
        this.parametreRepository = parametreRepository;
        this.serviceNotification = serviceNotification;
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CREER')")
    @Transactional
    public ResultatEnregistrementPaiement enregistrer(EnregistrementPaiementDto dto, String cleIdempotence,
                                                        Utilisateur auteur) {
        if (cleIdempotence != null && !cleIdempotence.isBlank()) {
            var existant = paiementRepository.findByCleIdempotence(cleIdempotence);
            if (existant.isPresent()) {
                return new ResultatEnregistrementPaiement(PaiementDto.depuis(existant.get()), true);
            }
        }

        Adherent adherent = adherentRepository.findById(dto.adherentId())
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
        if (adherent.isArchive()) {
            throw new ExceptionMetier("PAIEMENT_ADHERENT_ARCHIVE", "Cet adhérent est archivé, aucun paiement ne peut lui être rattaché.",
                    HttpStatus.CONFLICT);
        }
        perimetre.verifierAccesAdherent(auteur, dto.adherentId());

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

        Long valeurSequence = jdbcTemplate.queryForObject("SELECT nextval('seq_numero_recu')", Long.class);
        String numeroRecu = "REC-" + String.format("%06d", valeurSequence);

        Paiement paiement = new Paiement(dto.adherentId(), numeroRecu, dto.datePaiement(), dto.montant(),
                dto.modePaiement(), dto.referenceTransaction(), dto.typePaiement(), dto.agentEncaisseurId(),
                (cleIdempotence == null || cleIdempotence.isBlank()) ? null : cleIdempotence);
        paiement = paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_CREATION, "paiement", paiement.getId(), null,
                PaiementDto.depuis(paiement), null);

        if (dto.recommandationAllocation() != null) {
            enregistrerRecommandationAllocation(paiement, dto.recommandationAllocation(), auteur);
        }

        return new ResultatEnregistrementPaiement(PaiementDto.depuis(paiement), false);
    }

    /**
     * Donnée métier structurée (§8) — jamais un commentaire libre — recueillie par l'agent auprès de l'adhérent
     * pour un paiement supérieur à 1000 FCFA. Validée immédiatement (échec rapide) : elle sera relue telle
     * quelle par {@code ServiceAffectationPaiementImpl.affecter} à la validation du paiement.
     */
    private void enregistrerRecommandationAllocation(Paiement paiement, RecommandationAllocationDto dto,
                                                       Utilisateur auteur) {
        BigDecimal minimumSecuriteSociale = serviceParametre.decimal(CLE_PARAMETRE_MINIMUM_SECURITE_SOCIALE);
        ValidationAllocation.verifier(paiement.getMontant(), dto.allocationSecuriteSociale(), dto.allocationEpargne(),
                minimumSecuriteSociale);

        UUID recueilliParId = dto.recueilliParId() != null ? dto.recueilliParId() : auteur.getId();
        RecommandationAllocationPaiement recommandation = new RecommandationAllocationPaiement(paiement.getId(),
                dto.allocationSecuriteSociale(), dto.allocationEpargne(), recueilliParId);
        recommandation = recommandationRepository.save(recommandation);

        serviceAudit.tracer(TypeOperation.RECOMMANDATION_ALLOCATION_ENREGISTREMENT, "paiement", paiement.getId(),
                null, RecommandationAllocationDto.depuis(recommandation), null);
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
        if (paiement.getStatut() == StatutPaiement.ANNULE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE", "Un paiement annulé ne peut pas être validé.");
        }
        if (paiement.getStatut() == StatutPaiement.INCOHERENCE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Un paiement signalé incohérent doit d'abord être corrigé (POST /paiements/{id}/corriger) avant validation.");
        }

        paiement.valider(validateur.getId());
        paiement = paiementRepository.save(paiement);

        List<AffectationDto> affectations = serviceAffectationPaiement.affecter(paiement.getId(), validateur);
        // Jalon J6 : imputation des droits dans la même transaction que la validation (AGENTS.md règle absolue n°6).
        // Depuis le correctif COSITI V1 §7-§8, une affectation se ventile désormais en Sécurité Sociale (CNPS)
        // + Épargne : seule la part Sécurité Sociale ouvre des jours de droits/éligibilité CNPS — l'Épargne est
        // un compte personnel de l'adhérent, sans lien avec la couverture du pack.
        for (AffectationDto affectation : affectations) {
            if (CODE_COMPOSANTE_SECURITE_SOCIALE.equals(affectation.composanteCode())) {
                serviceCalculDroits.imputer(affectation.id());
            }
        }

        serviceAudit.tracer(TypeOperation.PAIEMENT_VALIDATION, "paiement", paiement.getId(), null,
                PaiementDto.depuis(paiement), null);

        alerterSeuilCnpsSiFranchi(paiement.getAdherentId());

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
        if (paiement.getStatut() == StatutPaiement.ANNULE || paiement.getStatut() == StatutPaiement.INCOHERENCE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Un paiement annulé ou incohérent ne peut pas être confirmé par le Chef.");
        }
        if (paiement.getConfirmeParChefId() != null) {
            throw new ExceptionConflit("PAIEMENT_DEJA_CONFIRME_CHEF", "Ce paiement a déjà été confirmé par un Chef.");
        }

        paiement.confirmerParChef(chefUtilisateur.getId());
        paiement = paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_CONFIRMATION_CHEF, "paiement", paiement.getId(), null,
                PaiementDto.depuis(paiement), motif);
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
        if (paiement.getStatut() == StatutPaiement.ANNULE || paiement.getStatut() == StatutPaiement.VALIDE
                || paiement.getStatut() == StatutPaiement.RAPPROCHE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Seul un paiement à contrôler peut être signalé incohérent.");
        }
        if (paiement.getStatut() == StatutPaiement.INCOHERENCE) {
            throw new ExceptionConflit("PAIEMENT_DEJA_INCOHERENT", "Ce paiement est déjà signalé incohérent.");
        }

        PaiementDto avant = PaiementDto.depuis(paiement);
        paiement.signalerIncoherence(motif);
        paiement = paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_SIGNALEMENT_INCOHERENCE, "paiement", paiement.getId(), avant,
                PaiementDto.depuis(paiement), motif);
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

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:CORRIGER')")
    @Transactional
    public PaiementDto corriger(UUID paiementId, CorrectionPaiementDto dto, Utilisateur auteur) {
        if (dto.motif() == null || dto.motif().isBlank()) {
            throw new ExceptionValidation("PAIEMENT_MOTIF_REQUIS", "Le motif de la correction est obligatoire.");
        }
        Paiement paiement = charger(paiementId);
        perimetre.verifierAccesPaiement(auteur, paiementId);

        if (paiement.getStatut() != StatutPaiement.A_CONTROLER && paiement.getStatut() != StatutPaiement.INCOHERENCE) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Seul un paiement à contrôler ou incohérent peut être corrigé.");
        }

        PaiementDto avant = PaiementDto.depuis(paiement);

        if (dto.montant() != null) {
            if (dto.montant().compareTo(BigDecimal.ZERO) <= 0) {
                throw new ExceptionValidation("PAIEMENT_MONTANT_INVALIDE", "Le montant doit être strictement positif.", "montant");
            }
            paiement.modifierMontant(dto.montant());
        }
        if (dto.datePaiement() != null) {
            paiement.modifierDatePaiement(dto.datePaiement());
        }
        if (dto.referenceTransaction() != null) {
            paiement.modifierReferenceTransaction(dto.referenceTransaction());
        }
        if (MODES_MOBILE_MONEY.contains(paiement.getModePaiement())
                && (paiement.getReferenceTransaction() == null || paiement.getReferenceTransaction().isBlank())) {
            throw new ExceptionValidation("PAIEMENT_REFERENCE_MANQUANTE",
                    "La référence de transaction est obligatoire pour un paiement Orange Money ou MTN MoMo.",
                    "referenceTransaction");
        }

        boolean resolutionIncoherence = paiement.getStatut() == StatutPaiement.INCOHERENCE;
        if (resolutionIncoherence) {
            // Jalon J5 : une correction résout l'incohérence signalée par le DAF et rouvre le paiement au
            // contrôle — sans cela, PAIEMENT_TRANSITION_INTERDITE bloquerait indéfiniment toute validation.
            paiement.resoudreIncoherence();
        }

        paiement = paiementRepository.save(paiement);
        serviceAudit.tracer(TypeOperation.PAIEMENT_CORRECTION, "paiement", paiement.getId(), avant,
                PaiementDto.depuis(paiement),
                resolutionIncoherence ? dto.motif() + " (incohérence résolue, paiement rouvert au contrôle)" : dto.motif());
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

        PaiementDto avant = PaiementDto.depuis(paiement);
        paiement.annuler(dto.motif());
        paiement = paiementRepository.save(paiement);

        // Le recalcul des périodes de droits issues de ce paiement relève du module Droits (jalon J6,
        // non implémenté à ce stade) — ne pas inventer un recalcul ici (AGENTS.md règle absolue n°9).
        serviceAudit.tracer(TypeOperation.PAIEMENT_ANNULATION, "paiement", paiement.getId(), avant,
                PaiementDto.depuis(paiement), dto.motif());
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public ReponsePaginee<PaiementDto> journal(CritereJournalPaiement critere, Pageable pageable, Utilisateur demandeur) {
        Specification<Paiement> spec = Specification.<Paiement>where(null).and(perimetre.perimetrePaiement(demandeur));
        if (critere.adherentId() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("adherentId"), critere.adherentId()));
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
        Page<PaiementDto> page = paiementRepository.findAll(spec, pageable).map(PaiementDto::depuis);
        return ReponsePaginee.depuis(page);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public RecuDto genererRecu(UUID paiementId) {
        return RecuDto.depuis(charger(paiementId));
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    public PaiementDto consulter(UUID paiementId, Utilisateur demandeur) {
        perimetre.verifierAccesPaiement(demandeur, paiementId);
        return PaiementDto.depuis(charger(paiementId));
    }

    private Paiement charger(UUID id) {
        return paiementRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("PAIEMENT_INTROUVABLE", "Paiement introuvable."));
    }

    /**
     * RAPORT_V1.md §6.4/§7.3 : alerte la Gestionnaire quand le solde validé du compte Sécurité Sociale
     * franchit le seuil CNPS de son pack ({@code SEUIL_CNPS_PACK_700}/{@code SEUIL_CNPS_PACK_1000}, posés en
     * V1). Une seule alerte par adhérent ({@code adherent.alerte_seuil_cnps_le}) : sans ce verrou, chaque
     * paiement suivant redéclencherait la même notification. Un pack personnalisé sans paramètre correspondant
     * ne déclenche aucune alerte — signalé, jamais un seuil inventé.
     */
    private void alerterSeuilCnpsSiFranchi(UUID adherentId) {
        Boolean dejaAlerte = jdbcTemplate.queryForObject(
                "SELECT alerte_seuil_cnps_le IS NOT NULL FROM adherent WHERE id = ?", Boolean.class, adherentId);
        if (!Boolean.FALSE.equals(dejaAlerte)) {
            return;
        }

        String codePack = jdbcTemplate.query("""
                SELECT pk.code FROM adhesion ad JOIN pack pk ON pk.id = ad.pack_id
                WHERE ad.adherent_id = ? AND ad.date_fin IS NULL
                """, rs -> rs.next() ? rs.getString("code") : null, adherentId);
        if (codePack == null) {
            return;
        }

        String cleSeuil = "SEUIL_CNPS_" + codePack;
        if (parametreRepository.findByCle(cleSeuil).isEmpty()) {
            return;
        }
        BigDecimal seuil = serviceParametre.decimal(cleSeuil);

        BigDecimal soldeSecuriteSociale = jdbcTemplate.queryForObject("""
                SELECT COALESCE(SUM(ap.montant), 0)
                FROM affectation_paiement ap
                JOIN paiement p ON p.id = ap.paiement_id
                JOIN composante_affectation c ON c.id = ap.composante_id
                WHERE p.adherent_id = ? AND c.code = 'CNPS' AND p.statut IN ('VALIDE', 'RAPPROCHE')
                """, BigDecimal.class, adherentId);

        if (soldeSecuriteSociale == null || soldeSecuriteSociale.compareTo(seuil) < 0) {
            return;
        }

        jdbcTemplate.update("UPDATE adherent SET alerte_seuil_cnps_le = now() WHERE id = ?", adherentId);
        serviceNotification.notifierRoles(List.of("GESTIONNAIRE_COMPTE"), "SEUIL_CNPS_ATTEINT",
                "Seuil CNPS atteint",
                "Le compte Sécurité Sociale d'un adhérent a atteint le seuil de " + seuil
                        + " FCFA — l'immatriculation CNPS peut être engagée.",
                "adherent", adherentId);
    }
}
