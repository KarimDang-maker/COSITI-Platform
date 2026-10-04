package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.droits.service.ServiceCalculDroits;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import cm.cositi.api.workflow.dto.DecisionDemandeDto;
import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.ElementDemandeValidation;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.TypeDonneeChamp;
import cm.cositi.api.workflow.entite.TypeEntiteWorkflow;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import cm.cositi.api.workflow.service.AdaptateurWorkflow;
import cm.cositi.api.workflow.service.EtatEntite;
import cm.cositi.api.workflow.service.ValeursWorkflow;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Module Cotisations dans le workflow (§11, §12). Le cycle de saisie (brouillon -> soumission -> validation/rejet
 * DAF, incohérence) reste porté par {@link ServicePaiement} ; le workflow couvre la correction contrôlée d'une
 * cotisation soumise ou validée, appliquée en une seule transaction avec la revalidation des invariants, la
 * ré-affectation et le recalcul des droits (donc du cumul et de la progression CNPS, lus depuis les périodes).
 */
@Component
public class AdaptateurWorkflowPaiement implements AdaptateurWorkflow {

    private static final Map<String, TypeDonneeChamp> CHAMPS = new LinkedHashMap<>();
    private static final Set<String> MODES = Set.of("ESPECES", "ORANGE_MONEY", "MTN_MOMO", "VIREMENT");
    private static final Set<String> MODES_MOBILE_MONEY = Set.of("ORANGE_MONEY", "MTN_MOMO");
    private static final Set<StatutPaiement> STATUTS_CORRIGEABLES =
            EnumSet.of(StatutPaiement.A_CONTROLER, StatutPaiement.INCOHERENCE, StatutPaiement.VALIDE);
    private static final Set<StatutPaiement> STATUTS_INACTIFS = EnumSet.of(StatutPaiement.ANNULE, StatutPaiement.REJETE);

    static {
        CHAMPS.put("montant", TypeDonneeChamp.DECIMAL);
        CHAMPS.put("datePaiement", TypeDonneeChamp.DATE);
        CHAMPS.put("modePaiement", TypeDonneeChamp.ENUM);
        CHAMPS.put("referenceTransaction", TypeDonneeChamp.TEXTE);
    }

    private final PaiementRepository paiementRepository;
    private final AdherentRepository adherentRepository;
    private final ServiceAffectationPaiement serviceAffectationPaiement;
    private final ServiceCalculDroits serviceCalculDroits;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;
    private final ApplicationEventPublisher evenements;
    private final JdbcTemplate jdbcTemplate;

    public AdaptateurWorkflowPaiement(PaiementRepository paiementRepository, AdherentRepository adherentRepository,
                                      ServiceAffectationPaiement serviceAffectationPaiement,
                                      ServiceCalculDroits serviceCalculDroits, ServicePerimetreDonnees perimetre,
                                      ServiceAudit serviceAudit, ApplicationEventPublisher evenements,
                                      JdbcTemplate jdbcTemplate) {
        this.paiementRepository = paiementRepository;
        this.adherentRepository = adherentRepository;
        this.serviceAffectationPaiement = serviceAffectationPaiement;
        this.serviceCalculDroits = serviceCalculDroits;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.evenements = evenements;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public TypeEntiteWorkflow typeEntite() {
        return TypeEntiteWorkflow.PAIEMENT;
    }

    @Override
    public Map<String, TypeDonneeChamp> champs(TypeOperationWorkflow operation) {
        return CHAMPS;
    }

    /** §12 étape 1 : verrou {@code FOR UPDATE} sur la cotisation. */
    @Override
    public EtatEntite etat(UUID entiteId, boolean verrouiller) {
        if (verrouiller) {
            try {
                jdbcTemplate.queryForObject("SELECT version FROM paiement WHERE id = ? FOR UPDATE", Long.class, entiteId);
            } catch (EmptyResultDataAccessException e) {
                throw introuvable();
            }
        }
        Paiement p = charger(entiteId);
        return new EtatEntite(p.getVersion(), valeurs(p), p.getStatut().name(), p.getStatut() == StatutPaiement.BROUILLON);
    }

    @Override
    public boolean peutAcceder(UUID entiteId, Utilisateur utilisateur) {
        try {
            perimetre.verifierAccesPaiement(utilisateur, entiteId);
            return true;
        } catch (ExceptionAutorisation | ExceptionRessourceIntrouvable e) {
            return false;
        }
    }

    @Override
    public void controlerOuverture(UUID entiteId, TypeOperationWorkflow operation) {
        Paiement p = charger(entiteId);
        if (p.isArchive()) {
            throw new ExceptionConflit("PAIEMENT_ARCHIVE", "Cette cotisation est archivée.");
        }
        if (p.getStatut() == StatutPaiement.BROUILLON) {
            throw new ExceptionConflit("PAIEMENT_BROUILLON_MODIFIABLE",
                    "Ce paiement est un brouillon : modifiez-le directement (POST /paiements/{id}/corriger).");
        }
        if (!STATUTS_CORRIGEABLES.contains(p.getStatut())) {
            throw new ExceptionConflit("PAIEMENT_TRANSITION_INTERDITE",
                    "Une cotisation " + p.getStatut() + " ne peut plus faire l'objet d'une correction.");
        }
    }

    /** §13 : revalidation des règles financières sur l'état résultant (montant, date, adhérent, référence). */
    @Override
    public void controlerPropositions(UUID entiteId, TypeOperationWorkflow operation,
                                      Map<String, String> valeursResultantes, Map<String, String> propositions) {
        Paiement p = charger(entiteId);
        BigDecimal montant = ValeursWorkflow.enDecimal(valeursResultantes.get("montant"));
        if (montant == null || montant.signum() <= 0) {
            throw invalide("montant", "PAIEMENT_MONTANT_INVALIDE", "Le montant doit être strictement positif.");
        }
        if (montant.scale() > 2) {
            throw invalide("montant", "PAIEMENT_MONTANT_INVALIDE", "Le montant ne peut pas avoir plus de deux décimales.");
        }
        Adherent adherent = adherentRepository.findById(p.getAdherentId())
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
        if (adherent.isArchive()) {
            throw new ExceptionConflit("PAIEMENT_ADHERENT_ARCHIVE", "L'adhérent de cette cotisation est archivé.");
        }
        LocalDate date = ValeursWorkflow.enDate(valeursResultantes.get("datePaiement"));
        if (date == null || date.isAfter(LocalDate.now()) || date.isBefore(adherent.getDateAdhesion())) {
            throw invalide("datePaiement", "PAIEMENT_DATE_INCOHERENTE",
                    "La date de paiement doit être comprise entre la date d'adhésion et aujourd'hui.");
        }
        String mode = valeursResultantes.get("modePaiement");
        if (mode == null || !MODES.contains(mode)) {
            throw invalide("modePaiement", "PAIEMENT_MODE_INVALIDE", "Mode de paiement inconnu : " + mode + ".");
        }
        String reference = valeursResultantes.get("referenceTransaction");
        if (MODES_MOBILE_MONEY.contains(mode) && reference == null) {
            throw invalide("referenceTransaction", "PAIEMENT_REFERENCE_MANQUANTE",
                    "La référence de transaction est obligatoire pour un paiement Orange Money ou MTN MoMo.");
        }
        if (reference != null && (propositions.containsKey("referenceTransaction") || propositions.containsKey("modePaiement"))
                && paiementRepository.trouverParReference(mode, reference, STATUTS_INACTIFS).stream()
                .anyMatch(autre -> !autre.getId().equals(entiteId))) {
            throw new ExceptionConflit("PAIEMENT_REFERENCE_DEJA_UTILISEE",
                    "Cette référence de transaction est déjà enregistrée sur un autre paiement.");
        }
    }

    @Override
    public List<String> controlerAvantApprobation(DemandeValidation demande, DecisionDemandeDto decision,
                                                  Utilisateur validateur) {
        return List.of();
    }

    /** §12 étapes 5 à 16, dans la transaction de l'approbation : rien n'est appliqué partiellement. */
    @Override
    public List<String> appliquer(DemandeValidation demande, List<ElementDemandeValidation> elements,
                                  Utilisateur validateur) {
        Paiement p = charger(demande.getEntiteId());
        PaiementDto avant = PaiementDto.depuis(p);
        Map<String, String> valeursAvant = valeurs(p);

        Map<String, String> propositions = new LinkedHashMap<>();
        Map<String, String> resultantes = new LinkedHashMap<>(valeursAvant);
        for (ElementDemandeValidation e : elements) {
            propositions.put(e.getChamp(), e.getValeurProposee());
            resultantes.put(e.getChamp(), e.getValeurProposee());
        }
        // Étapes 5 à 9 : nouvelles valeurs, montant, adhérent, référence, invariants — revalidés au moment même
        // de l'application, pas seulement à la création de la demande.
        controlerPropositions(p.getId(), demande.getTypeOperation(), resultantes, propositions);

        for (Map.Entry<String, String> e : propositions.entrySet()) {
            switch (e.getKey()) {
                case "montant" -> p.modifierMontant(ValeursWorkflow.enDecimal(e.getValue()));
                case "datePaiement" -> p.modifierDatePaiement(ValeursWorkflow.enDate(e.getValue()));
                case "modePaiement" -> p.modifierModePaiement(e.getValue());
                case "referenceTransaction" -> p.modifierReferenceTransaction(e.getValue());
                default -> throw new IllegalStateException("Champ de cotisation non applicable : " + e.getKey());
            }
        }
        List<String> avertissements = new ArrayList<>();
        if (p.getStatut() == StatutPaiement.INCOHERENCE) {
            // La correction approuvée résout l'incohérence signalée et rouvre la cotisation au contrôle.
            p.resoudreIncoherence();
            avertissements.add("Incohérence résolue : la cotisation repasse à contrôler.");
        }
        // Étapes 10-11 : application et version N+1 (verrouillage optimiste JPA).
        p = paiementRepository.saveAndFlush(p);

        String motif = "Demande " + demande.getReference() + " approuvée : " + demande.getMotif();
        boolean montantChange = propositions.containsKey("montant");
        boolean dateChangee = propositions.containsKey("datePaiement");
        if (p.getStatut() == StatutPaiement.VALIDE && (montantChange || dateChangee)) {
            // Étapes 12-14 : affectations et périodes de droits refaites — le cumul et la progression CNPS
            // (GET /adherents/{id}/resume-cotisations) se lisent depuis ces périodes, recalculées ici.
            if (montantChange) {
                serviceAffectationPaiement.reaffecterApresCorrection(p.getId(), validateur);
                serviceAffectationPaiement.verifierInvariant(p.getId());
            }
            serviceCalculDroits.recalculer(p.getAdherentId(), motif, validateur);
            avertissements.add("Droits de l'adhérent recalculés (cumul et progression CNPS mis à jour).");
        }
        avertissements.addAll(bilansValidesTouches(valeursAvant.get("datePaiement"), resultantes.get("datePaiement")));

        // Étape 16 : audit financier avant/après.
        serviceAudit.tracer(TypeOperation.PAIEMENT_CORRECTION, "paiement", p.getId(), avant, PaiementDto.depuis(p), motif);
        evenements.publishEvent(PaiementModifieEvent.paiement(p.getId(), p.getAdherentId(), "CORRECTION_APPROUVEE",
                p.getStatut().name()));
        return avertissements;
    }

    @Override
    public void synchroniserStatut(UUID entiteId, TypeOperationWorkflow operation,
                                   StatutDemandeValidation statutDemande) {
        // Le statut d'une cotisation suit son propre cycle (ServicePaiement) : rien à répercuter.
    }

    @Override
    public UUID adherentConcerne(UUID entiteId) {
        return charger(entiteId).getAdherentId();
    }

    /** §13 « Rapprochement » : un bilan de caisse déjà validé sur la date touchée n'est plus à jour. */
    private List<String> bilansValidesTouches(String dateAvant, String dateApres) {
        List<String> avertissements = new ArrayList<>();
        for (String date : new java.util.LinkedHashSet<>(java.util.Arrays.asList(dateAvant, dateApres))) {
            if (date == null) {
                continue;
            }
            Long valides = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM bilan_caisse_journalier WHERE date_bilan = ? AND statut = 'VALIDE'",
                    Long.class, Date.valueOf(ValeursWorkflow.enDate(date)));
            if (valides != null && valides > 0) {
                avertissements.add("Le bilan de caisse validé du " + date + " ne reflète plus cette correction : "
                        + "son montant numérique actuel diffère de celui figé à la saisie.");
            }
        }
        return avertissements;
    }

    private static Map<String, String> valeurs(Paiement p) {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("montant", ValeursWorkflow.texte(p.getMontant()));
        v.put("datePaiement", ValeursWorkflow.texte(p.getDatePaiement()));
        v.put("modePaiement", ValeursWorkflow.texte(p.getModePaiement()));
        v.put("referenceTransaction", ValeursWorkflow.texte(p.getReferenceTransaction()));
        return v;
    }

    private static ExceptionValidation invalide(String champ, String code, String message) {
        return new ExceptionValidation(code, message, champ);
    }

    private Paiement charger(UUID id) {
        return paiementRepository.findById(id).orElseThrow(AdaptateurWorkflowPaiement::introuvable);
    }

    private static ExceptionRessourceIntrouvable introuvable() {
        return new ExceptionRessourceIntrouvable("PAIEMENT_INTROUVABLE", "Paiement introuvable.");
    }
}
