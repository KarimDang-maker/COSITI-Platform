package cm.cositi.api.cotisation;

import cm.cositi.api.adherent.Adherent;
import cm.cositi.api.adherent.AdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.AffectationDto;
import cm.cositi.api.cotisation.dto.EnregistrementPaiementDto;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.droits.PeriodeDroits;
import cm.cositi.api.droits.PeriodeDroitsRepository;
import cm.cositi.api.droits.ServiceCalculDroits;
import cm.cositi.api.organisation.AgentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ServicePaiementImpl implements ServicePaiement {

    private final PaiementRepository paiementRepository;
    private final AdherentRepository adherentRepository;
    private final AgentRepository agentRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final AffectationPaiementRepository affectationPaiementRepository;
    private final PeriodeDroitsRepository periodeDroitsRepository;
    private final ServiceAffectationPaiement serviceAffectationPaiement;
    private final ServiceCalculDroits serviceCalculDroits;
    private final ServiceAudit serviceAudit;

    public ServicePaiementImpl(
            PaiementRepository paiementRepository,
            AdherentRepository adherentRepository,
            AgentRepository agentRepository,
            UtilisateurRepository utilisateurRepository,
            AffectationPaiementRepository affectationPaiementRepository,
            PeriodeDroitsRepository periodeDroitsRepository,
            ServiceAffectationPaiement serviceAffectationPaiement,
            ServiceCalculDroits serviceCalculDroits,
            ServiceAudit serviceAudit) {
        this.paiementRepository = paiementRepository;
        this.adherentRepository = adherentRepository;
        this.agentRepository = agentRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.affectationPaiementRepository = affectationPaiementRepository;
        this.periodeDroitsRepository = periodeDroitsRepository;
        this.serviceAffectationPaiement = serviceAffectationPaiement;
        this.serviceCalculDroits = serviceCalculDroits;
        this.serviceAudit = serviceAudit;
    }

    @Override
    public PaiementDto enregistrer(EnregistrementPaiementDto dto, Utilisateur auteur) {
        // 1. Idempotence : si la clé existe déjà, retourner l'enregistrement existant
        if (dto.cleIdempotence() != null && !dto.cleIdempotence().isBlank()) {
            var existant = paiementRepository.findByCleIdempotence(dto.cleIdempotence());
            if (existant.isPresent()) {
                return mapToDto(existant.get());
            }
        }

        // 2. Contrôles de cohérence métier
        Adherent adherent = adherentRepository.findById(dto.adherentId())
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Adhérent", dto.adherentId()));

        if (dto.datePaiement().isBefore(adherent.getDateAdhesion())) {
            throw new ExceptionMetier("PAIEMENT_DATE_INCOHERENTE", "La date de paiement ne peut pas être antérieure à la date d'adhésion.");
        }

        if (("ORANGE_MONEY".equals(dto.modePaiement()) || "MTN_MOMO".equals(dto.modePaiement()))
                && (dto.referenceTransaction() == null || dto.referenceTransaction().trim().isEmpty())) {
            throw new ExceptionMetier("PAIEMENT_REFERENCE_MANQUANTE", "La référence de transaction est strictement obligatoire pour un versement Mobile Money.");
        }

        // 3. Attribution du numéro de reçu
        Long nextRecu = paiementRepository.obtenirProchaineValeurSequenceRecu();
        String numeroRecu = String.format("REC-%06d", nextRecu);

        Paiement paiement = new Paiement();
        paiement.setAdherentId(dto.adherentId());
        paiement.setNumeroRecu(numeroRecu);
        paiement.setDatePaiement(dto.datePaiement());
        paiement.setMontant(dto.montant());
        paiement.setModePaiement(dto.modePaiement());
        paiement.setReferenceTransaction(dto.referenceTransaction());
        paiement.setTypePaiement(dto.typePaiement() != null ? dto.typePaiement() : "COTISATION");
        paiement.setAgentEncaisseurId(dto.agentEncaisseurId());
        paiement.setStatut("A_CONTROLER");
        paiement.setCleIdempotence(dto.cleIdempotence());
        paiement.setCreePar(auteur.getIdentifiant());

        paiement = paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_CREATION, "PAIEMENT", paiement.getId(),
                null, paiement, "Saisie de collecte " + numeroRecu, auteur.getIdentifiant());

        return mapToDto(paiement);
    }

    @Override
    public PaiementDto valider(UUID paiementId, Utilisateur validateur) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Paiement", paiementId));

        if ("VALIDE".equalsIgnoreCase(paiement.getStatut())) {
            throw new ExceptionConflit("PAIEMENT_DEJA_VALIDE", "Ce paiement a déjà été validé.");
        }

        // Séparation stricte des responsabilités : celui qui saisit ne valide pas
        if (validateur.getIdentifiant().equalsIgnoreCase(paiement.getCreePar())) {
            throw new ExceptionAutorisation("Séparation des responsabilités : l'agent ayant saisi l'opération ne peut pas la valider lui-même.");
        }

        // Affectation financière
        serviceAffectationPaiement.affecter(paiementId, validateur);
        List<AffectationPaiement> affectations = affectationPaiementRepository.findByPaiementId(paiementId);

        // Imputation des droits sociaux
        serviceCalculDroits.imputer(paiement, affectations, validateur);

        paiement.setStatut("VALIDE");
        paiement.setValidePar(validateur.getId());
        paiement.setValideLe(Instant.now());
        paiement = paiementRepository.save(paiement);

        // Mise à jour de l'adhérent si inscription payée
        if ("INSCRIPTION".equalsIgnoreCase(paiement.getTypePaiement())) {
            adherentRepository.findById(paiement.getAdherentId()).ifPresent(adh -> {
                adh.setInscriptionPayee(true);
                adh.setStatut("ACTIF");
                adherentRepository.save(adh);
            });
        }

        serviceAudit.tracer(TypeOperation.PAIEMENT_VALIDATION, "PAIEMENT", paiement.getId(),
                "A_CONTROLER", "VALIDE", "Validation et imputation des droits", validateur.getIdentifiant());

        return mapToDto(paiement);
    }

    @Override
    public PaiementDto confirmerParChef(UUID paiementId, Utilisateur chef) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Paiement", paiementId));

        paiement.setConfirmeParChefId(chef.getId());
        paiement.setConfirmeLe(Instant.now());
        paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_CONFIRMATION_HIERARCHIQUE, "PAIEMENT", paiement.getId(),
                null, null, "Confirmation terrain par le Chef des agents", chef.getIdentifiant());

        return mapToDto(paiement);
    }

    @Override
    public void signalerIncoherence(UUID paiementId, String motif, Utilisateur daf) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Paiement", paiementId));

        paiement.setStatut("INCOHERENCE");
        paiement.setMotifIncoherence(motif);
        paiementRepository.save(paiement);

        serviceAudit.tracer(TypeOperation.PAIEMENT_SIGNALEMENT_INCOHERENCE, "PAIEMENT", paiement.getId(),
                null, null, motif, daf.getIdentifiant());
    }

    @Override
    public void annuler(UUID paiementId, String motif, Utilisateur auteur) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Paiement", paiementId));

        if (motif == null || motif.trim().isEmpty()) {
            throw new ExceptionMetier("PAIEMENT_MOTIF_REQUIS", "Un motif d'annulation est obligatoire.");
        }

        paiement.setStatut("ANNULE");
        paiement.setMotifAnnulation(motif);
        paiementRepository.save(paiement);

        // Invalidation des droits issus des affectations de ce paiement
        List<AffectationPaiement> affectations = affectationPaiementRepository.findByPaiementId(paiementId);
        for (AffectationPaiement aff : affectations) {
            periodeDroitsRepository.findAll().stream()
                    .filter(p -> aff.getId().equals(p.getSourceAffectationId()))
                    .forEach(p -> {
                        p.setStatut("ANNULEE");
                        periodeDroitsRepository.save(p);
                    });
        }

        serviceAudit.tracer(TypeOperation.PAIEMENT_ANNULATION, "PAIEMENT", paiementId,
                null, null, motif, auteur.getIdentifiant());
    }

    @Override
    @Transactional(readOnly = true)
    public PaiementDto consulter(UUID paiementId) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Paiement", paiementId));
        return mapToDto(paiement);
    }

    @Override
    @Transactional(readOnly = true)
    public ReponsePaginee<PaiementDto> rechercher(UUID adherentId, String statut, LocalDate du, LocalDate au, Pageable pageable) {
        Page<Paiement> page = paiementRepository.rechercher(adherentId, statut, du, au, pageable);
        List<PaiementDto> dtos = page.getContent().stream().map(this::mapToDto).toList();
        return new ReponsePaginee<>(dtos, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private PaiementDto mapToDto(Paiement p) {
        Adherent adh = adherentRepository.findById(p.getAdherentId()).orElse(null);
        String matricule = adh != null ? adh.getMatricule() : "INCONNU";
        String nomComplet = adh != null ? adh.getNom() + " " + (adh.getPrenoms() != null ? adh.getPrenoms() : "") : "";

        String agentNom = p.getAgentEncaisseurId() != null
                ? agentRepository.findById(p.getAgentEncaisseurId()).map(cm.cositi.api.organisation.Agent::getNomComplet).orElse("Siège")
                : "Siège";

        String validateurNom = p.getValidePar() != null
                ? utilisateurRepository.findById(p.getValidePar()).map(Utilisateur::getNomComplet).orElse(null)
                : null;

        List<AffectationDto> affectations = affectationPaiementRepository.findByPaiementId(p.getId()).stream()
                .map(a -> new AffectationDto(a.getId(), a.getComposante().getCode(), a.getComposante().getLibelle(), a.getMontant(), a.getRegleAppliquee()))
                .toList();

        return new PaiementDto(
                p.getId(),
                p.getAdherentId(),
                matricule,
                nomComplet,
                p.getNumeroRecu(),
                p.getDatePaiement(),
                p.getMontant(),
                p.getModePaiement(),
                p.getReferenceTransaction(),
                p.getTypePaiement(),
                p.getStatut(),
                p.getAgentEncaisseurId(),
                agentNom,
                p.getCreePar(),
                p.getCreeLe(),
                validateurNom,
                p.getValideLe(),
                affectations
        );
    }
}
