package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.entite.StatutControleDga;
import cm.cositi.api.adherent.repository.ActiviteRepository;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.AssociationRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import cm.cositi.api.workflow.dto.DecisionDemandeDto;
import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.ElementDemandeValidation;
import cm.cositi.api.workflow.entite.StatutDemandeValidation;
import cm.cositi.api.workflow.entite.StatutValidationEntite;
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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Module Adhérents dans le workflow (§9) : validation du dossier (création contrôlée) et modification d'une donnée
 * officielle — identité, coordonnées, données professionnelles, statut. La zone (affectation) et le pack gardent
 * leurs circuits dédiés (portefeuilles, changement de pack).
 */
@Component
public class AdaptateurWorkflowAdherent implements AdaptateurWorkflow {

    private static final Map<String, TypeDonneeChamp> CHAMPS_DOSSIER = new LinkedHashMap<>();
    private static final Map<String, TypeDonneeChamp> CHAMPS_MODIFICATION;
    private static final Set<String> CHAMPS_DOUBLON = Set.of("nom", "prenoms", "telephonePrincipal", "numeroCni");

    static {
        CHAMPS_DOSSIER.put("nom", TypeDonneeChamp.TEXTE);
        CHAMPS_DOSSIER.put("prenoms", TypeDonneeChamp.TEXTE);
        CHAMPS_DOSSIER.put("dateNaissance", TypeDonneeChamp.DATE);
        CHAMPS_DOSSIER.put("sexe", TypeDonneeChamp.ENUM);
        CHAMPS_DOSSIER.put("telephonePrincipal", TypeDonneeChamp.TEXTE);
        CHAMPS_DOSSIER.put("telephoneSecondaire", TypeDonneeChamp.TEXTE);
        CHAMPS_DOSSIER.put("numeroCni", TypeDonneeChamp.TEXTE);
        CHAMPS_DOSSIER.put("numeroCnps", TypeDonneeChamp.TEXTE);
        CHAMPS_DOSSIER.put("activiteId", TypeDonneeChamp.UUID);
        CHAMPS_DOSSIER.put("associationId", TypeDonneeChamp.UUID);
        CHAMPS_DOSSIER.put("localisation", TypeDonneeChamp.TEXTE);
        CHAMPS_DOSSIER.put("quartier", TypeDonneeChamp.TEXTE);
        CHAMPS_DOSSIER.put("ville", TypeDonneeChamp.TEXTE);
        CHAMPS_DOSSIER.put("latitude", TypeDonneeChamp.DECIMAL);
        CHAMPS_DOSSIER.put("longitude", TypeDonneeChamp.DECIMAL);
        CHAMPS_MODIFICATION = new LinkedHashMap<>(CHAMPS_DOSSIER);
        CHAMPS_MODIFICATION.put("statut", TypeDonneeChamp.ENUM);
        CHAMPS_DOSSIER.put("zoneId", TypeDonneeChamp.UUID);
    }

    private final AdherentRepository adherentRepository;
    private final ActiviteRepository activiteRepository;
    private final AssociationRepository associationRepository;
    private final ServiceDoublonAdherent serviceDoublonAdherent;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;
    private final ApplicationEventPublisher evenements;
    private final JdbcTemplate jdbcTemplate;
    private final cm.cositi.api.adhesion.service.ServiceExigenceDocumentaire serviceExigence;
    private final cm.cositi.api.adhesion.service.ServiceControleDga serviceControleDga;

    public AdaptateurWorkflowAdherent(AdherentRepository adherentRepository, ActiviteRepository activiteRepository,
                                      AssociationRepository associationRepository,
                                      ServiceDoublonAdherent serviceDoublonAdherent, ServicePerimetreDonnees perimetre,
                                      ServiceParametre serviceParametre, ServiceAudit serviceAudit,
                                      ApplicationEventPublisher evenements, JdbcTemplate jdbcTemplate,
                                      cm.cositi.api.adhesion.service.ServiceExigenceDocumentaire serviceExigence,
                                      cm.cositi.api.adhesion.service.ServiceControleDga serviceControleDga) {
        this.adherentRepository = adherentRepository;
        this.activiteRepository = activiteRepository;
        this.associationRepository = associationRepository;
        this.serviceDoublonAdherent = serviceDoublonAdherent;
        this.perimetre = perimetre;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
        this.evenements = evenements;
        this.jdbcTemplate = jdbcTemplate;
        this.serviceExigence = serviceExigence;
        this.serviceControleDga = serviceControleDga;
    }

    @Override
    public TypeEntiteWorkflow typeEntite() {
        return TypeEntiteWorkflow.ADHERENT;
    }

    @Override
    public Map<String, TypeDonneeChamp> champs(TypeOperationWorkflow operation) {
        return operation == TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER ? CHAMPS_DOSSIER : CHAMPS_MODIFICATION;
    }

    @Override
    public EtatEntite etat(UUID entiteId, boolean verrouiller) {
        if (verrouiller) {
            try {
                jdbcTemplate.queryForObject("SELECT version FROM adherent WHERE id = ? FOR UPDATE", Long.class, entiteId);
            } catch (EmptyResultDataAccessException e) {
                throw introuvable();
            }
        }
        Adherent a = charger(entiteId);
        return new EtatEntite(a.getVersion(), valeurs(a), a.getStatutValidation().name(),
                a.getStatutValidation().modifiableDirectement());
    }

    @Override
    public boolean peutAcceder(UUID entiteId, Utilisateur utilisateur) {
        return perimetre.peutAccederAdherent(utilisateur, entiteId);
    }

    @Override
    public void controlerOuverture(UUID entiteId, TypeOperationWorkflow operation) {
        Adherent a = charger(entiteId);
        if (a.isArchive()) {
            throw new ExceptionConflit("ADHERENT_ARCHIVE", "Cet adhérent est archivé.");
        }
        StatutValidationEntite statut = a.getStatutValidation();
        if (operation == TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER) {
            // V20 : un nouveau dossier devient officiel par l'activation du Gestionnaire puis le contrôle documentaire
            // DGA, pas par la validation générique — deux chemins vers VALIDE seraient ambigus.
            throw new ExceptionConflit("ADHERENT_VALIDATION_PAR_CONTROLE_DGA",
                    "La validation d'un dossier passe par l'activation (POST /adherents/{id}/activer) puis le contrôle "
                            + "documentaire DGA.");
        }
        if (a.getStatutControleDga().enCours()) {
            throw new ExceptionConflit("ADHERENT_EN_CONTROLE_DGA",
                    "Ce dossier est en cours de contrôle documentaire DGA : ses données ne peuvent pas changer avant la décision.");
        }
        if (statut != StatutValidationEntite.VALIDE) {
            throw new ExceptionConflit("ADHERENT_NON_VALIDE",
                    "Ce dossier n'est pas encore validé : modifiez-le directement puis soumettez-le à validation.");
        }
    }

    @Override
    public void controlerPropositions(UUID entiteId, TypeOperationWorkflow operation,
                                      Map<String, String> valeursResultantes, Map<String, String> propositions) {
        exigerRenseigne(valeursResultantes, "nom");
        exigerRenseigne(valeursResultantes, "telephonePrincipal");
        exigerRenseigne(valeursResultantes, "localisation");
        exigerRenseigne(valeursResultantes, "activiteId");

        if (propositions.containsKey("dateNaissance") && propositions.get("dateNaissance") != null
                && !ValeursWorkflow.enDate(propositions.get("dateNaissance")).isBefore(LocalDate.now())) {
            throw invalide("dateNaissance", "La date de naissance doit être dans le passé.");
        }
        if (propositions.containsKey("sexe") && propositions.get("sexe") != null
                && !Set.of("M", "F").contains(propositions.get("sexe"))) {
            throw invalide("sexe", "Le sexe doit valoir M ou F.");
        }
        if (propositions.containsKey("activiteId")
                && !activiteRepository.existsById(ValeursWorkflow.enUuid(propositions.get("activiteId")))) {
            throw invalide("activiteId", "Activité introuvable.");
        }
        if (propositions.get("associationId") != null
                && !associationRepository.existsById(ValeursWorkflow.enUuid(propositions.get("associationId")))) {
            throw invalide("associationId", "Association introuvable.");
        }
        controlerCoordonnee(propositions, "latitude", new BigDecimal("90"));
        controlerCoordonnee(propositions, "longitude", new BigDecimal("180"));
        if (propositions.containsKey("statut")) {
            String propose = propositions.get("statut");
            if (propose == null) {
                throw invalide("statut", "Le statut ne peut pas être vide.");
            }
            try {
                StatutAdherent.valueOf(propose);
            } catch (IllegalArgumentException e) {
                throw invalide("statut", "Statut inconnu : " + propose + ".");
            }
            if (charger(entiteId).getStatut() == StatutAdherent.RADIE) {
                throw new ExceptionConflit("ADHERENT_STATUT_TERMINAL", "Un adhérent radié ne peut plus changer de statut.");
            }
        }
    }

    /** §9 {@code checkAdherentDuplicateBeforeApproval} et {@code validateAdherentCompleteness}. */
    @Override
    public List<String> controlerAvantApprobation(DemandeValidation demande, DecisionDemandeDto decision,
                                                  Utilisateur validateur) {
        List<String> avertissements = new ArrayList<>();
        Adherent a = charger(demande.getEntiteId());
        Map<String, String> valeurs = valeurs(a);
        boolean identiteTouchee = demande.getTypeOperation() == TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER;
        if (!identiteTouchee) {
            // Une modification n'est recontrôlée que si elle touche les champs servant à la détection de doublon.
            identiteTouchee = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM demande_validation_element WHERE demande_id = ? AND champ IN "
                            + "('nom','prenoms','telephonePrincipal','numeroCni')", Long.class, demande.getId()) > 0;
            for (Map.Entry<String, String> e : propositions(demande).entrySet()) {
                valeurs.put(e.getKey(), e.getValue());
            }
        }
        if (identiteTouchee) {
            String nomComplet = valeurs.get("prenoms") != null ? valeurs.get("nom") + " " + valeurs.get("prenoms")
                    : valeurs.get("nom");
            List<CandidatDoublon> candidats = serviceDoublonAdherent.rechercher(new CritereDoublon(
                            valeurs.get("telephonePrincipal"), valeurs.get("numeroCni"), nomComplet, a.getZoneId()))
                    .stream().filter(c -> !c.adherentId().equals(a.getId())).toList();
            if (!candidats.isEmpty()) {
                String liste = candidats.stream().map(c -> c.matricule() + " (" + c.motifCorrespondance() + ")")
                        .collect(Collectors.joining(", "));
                if (!decision.ignorerDoublons()) {
                    throw new ExceptionConflit("ADHERENT_DOUBLON_POTENTIEL",
                            "Doublon(s) potentiel(s) détecté(s) au recontrôle : " + liste
                                    + ". Confirmez avec ignorerDoublons=true après vérification.");
                }
                avertissements.add("Approuvé malgré des doublons potentiels : " + liste + ".");
            }
        }
        if (demande.getTypeOperation() == TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER) {
            EvaluationCompletionAdherent.Resultat completion = EvaluationCompletionAdherent.evaluer(a,
                    serviceParametre.texte(ServiceAdherentImpl.CLE_CHAMPS_COMPLETION),
                    serviceParametre.estValide(ServiceAdherentImpl.CLE_CHAMPS_COMPLETION));
            if (completion.pourcentage() < 100) {
                avertissements.add("Dossier complété à " + completion.pourcentage() + " % ("
                        + completion.champsManquants().size() + " champ(s) manquant(s)) — la complétude n'est pas "
                        + "bloquante tant que la règle n'est pas validée par la COSITI.");
            }
        }
        return avertissements;
    }

    @Override
    public List<String> appliquer(DemandeValidation demande, List<ElementDemandeValidation> elements,
                                  Utilisateur validateur) {
        Adherent a = charger(demande.getEntiteId());
        String motif = "Demande " + demande.getReference() + " : " + demande.getMotif();
        if (demande.getTypeOperation() == TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER) {
            serviceAudit.tracer(TypeOperation.ADHERENT_VALIDATION_DOSSIER, "adherent", a.getId(), null,
                    AdherentDetailDto.depuis(a), motif);
            evenements.publishEvent(new AdherentModifieEvent(a.getId(), "VALIDATION_DOSSIER"));
            return List.of();
        }

        AdherentDetailDto avant = AdherentDetailDto.depuis(a);
        StatutAdherent statutAvant = a.getStatut();
        for (ElementDemandeValidation e : elements) {
            appliquerChamp(a, e.getChamp(), e.getValeurProposee());
        }
        a = adherentRepository.saveAndFlush(a);
        serviceAudit.tracer(TypeOperation.ADHERENT_MODIFICATION, "adherent", a.getId(), avant,
                AdherentDetailDto.depuis(a), motif);
        if (a.getStatut() != statutAvant) {
            serviceAudit.tracer(TypeOperation.ADHERENT_CHANGEMENT_STATUT, "adherent", a.getId(), statutAvant,
                    a.getStatut(), motif);
        }
        evenements.publishEvent(new AdherentModifieEvent(a.getId(), "MODIFICATION_VALIDEE"));
        return recontrolerSiJustifie(a, demande, elements);
    }

    /**
     * Document des règles v2.0, §16 : « si la nouvelle valeur est justifiée par une pièce, le champ repasse en contrôle ».
     * Sur un dossier déjà validé par la DGA, la modification d'une information justifiée (matrice documentaire) ouvre un
     * nouveau tour de contrôle, soumis au nom du demandeur. La première transmission n'est pas réécrite : le dossier
     * n'est pas recompté dans les dossiers soumis.
     */
    private List<String> recontrolerSiJustifie(Adherent a, DemandeValidation demande, List<ElementDemandeValidation> elements) {
        if (a.getStatutControleDga() != StatutControleDga.VALIDE) {
            return List.of();
        }
        Set<String> justifies = serviceExigence.champsJustifies();
        List<String> touches = elements.stream().map(ElementDemandeValidation::getChamp).filter(justifies::contains).toList();
        if (touches.isEmpty()) {
            return List.of();
        }
        a.marquerSoumisDga();
        a = adherentRepository.saveAndFlush(a);
        var controle = serviceControleDga.ouvrir(a, demande.getDemandePar());
        serviceAudit.tracer(TypeOperation.CONTROLE_DGA_RECONTROLE, "adherent", a.getId(), null,
                java.util.Map.of("controle", controle.reference(), "tour", controle.tour(), "champs", touches),
                "Modification justifiée par une pièce (" + demande.getReference() + ")");
        evenements.publishEvent(new cm.cositi.api.adhesion.service.AdhesionEvent("CONTROLE_DGA_A_TRAITER", a.getId(),
                "controle_dga", controle.id(), null, List.of("DGA"), "Dossier à recontrôler",
                "Adhérent " + a.getMatricule() + " — information(s) justifiée(s) modifiée(s) : " + String.join(", ", touches)
                        + " (" + controle.reference() + ")."));
        return List.of("Information(s) justifiée(s) par une pièce modifiée(s) (" + String.join(", ", touches)
                + ") : le dossier repasse en contrôle documentaire DGA (" + controle.reference() + ").");
    }

    @Override
    public void synchroniserStatut(UUID entiteId, TypeOperationWorkflow operation,
                                   StatutDemandeValidation statutDemande) {
        if (operation != TypeOperationWorkflow.ADHERENT_VALIDATION_DOSSIER) {
            return;
        }
        StatutValidationEntite cible = switch (statutDemande) {
            case EN_ATTENTE_VALIDATION -> StatutValidationEntite.EN_ATTENTE_VALIDATION;
            case CORRECTION_DEMANDEE -> StatutValidationEntite.CORRECTION_DEMANDEE;
            case APPROUVEE -> StatutValidationEntite.VALIDE;
            case REJETEE -> StatutValidationEntite.REJETE;
            case ANNULEE -> StatutValidationEntite.BROUILLON;
            case BROUILLON -> null;
        };
        Adherent a = charger(entiteId);
        if (cible != null && a.getStatutValidation() != cible) {
            a.setStatutValidation(cible);
            adherentRepository.saveAndFlush(a);
        }
    }

    @Override
    public UUID adherentConcerne(UUID entiteId) {
        return entiteId;
    }

    // ------------------------------------------------------------------------------------------ Interne

    private static Map<String, String> valeurs(Adherent a) {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("nom", ValeursWorkflow.texte(a.getNom()));
        v.put("prenoms", ValeursWorkflow.texte(a.getPrenoms()));
        v.put("dateNaissance", ValeursWorkflow.texte(a.getDateNaissance()));
        v.put("sexe", ValeursWorkflow.texte(a.getSexe()));
        v.put("telephonePrincipal", ValeursWorkflow.texte(a.getTelephonePrincipal()));
        v.put("telephoneSecondaire", ValeursWorkflow.texte(a.getTelephoneSecondaire()));
        v.put("numeroCni", ValeursWorkflow.texte(a.getNumeroCni()));
        v.put("numeroCnps", ValeursWorkflow.texte(a.getNumeroCnps()));
        v.put("activiteId", ValeursWorkflow.texte(a.getActiviteId()));
        v.put("associationId", ValeursWorkflow.texte(a.getAssociationId()));
        v.put("localisation", ValeursWorkflow.texte(a.getLocalisation()));
        v.put("quartier", ValeursWorkflow.texte(a.getQuartier()));
        v.put("ville", ValeursWorkflow.texte(a.getVille()));
        v.put("latitude", ValeursWorkflow.texte(a.getLatitude()));
        v.put("longitude", ValeursWorkflow.texte(a.getLongitude()));
        v.put("statut", ValeursWorkflow.texte(a.getStatut()));
        v.put("zoneId", ValeursWorkflow.texte(a.getZoneId()));
        return v;
    }

    private Map<String, String> propositions(DemandeValidation demande) {
        Map<String, String> p = new LinkedHashMap<>();
        jdbcTemplate.query("SELECT champ, valeur_proposee FROM demande_validation_element WHERE demande_id = ?",
                rs -> {
                    p.put(rs.getString("champ"), rs.getString("valeur_proposee"));
                }, demande.getId());
        return p;
    }

    private static void appliquerChamp(Adherent a, String champ, String valeur) {
        switch (champ) {
            case "nom" -> a.setNom(valeur);
            case "prenoms" -> a.setPrenoms(valeur);
            case "dateNaissance" -> a.setDateNaissance(ValeursWorkflow.enDate(valeur));
            case "sexe" -> a.setSexe(valeur);
            case "telephonePrincipal" -> a.setTelephonePrincipal(valeur);
            case "telephoneSecondaire" -> a.setTelephoneSecondaire(valeur);
            case "numeroCni" -> a.setNumeroCni(valeur);
            case "numeroCnps" -> a.setNumeroCnps(valeur);
            case "activiteId" -> a.setActiviteId(ValeursWorkflow.enUuid(valeur));
            case "associationId" -> a.setAssociationId(ValeursWorkflow.enUuid(valeur));
            case "localisation" -> a.setLocalisation(valeur);
            case "quartier" -> a.setQuartier(valeur);
            case "ville" -> a.setVille(valeur);
            case "latitude" -> a.setLatitude(ValeursWorkflow.enDecimal(valeur));
            case "longitude" -> a.setLongitude(ValeursWorkflow.enDecimal(valeur));
            case "statut" -> a.setStatut(StatutAdherent.valueOf(valeur));
            default -> throw new IllegalStateException("Champ adhérent non applicable : " + champ);
        }
    }

    private static void controlerCoordonnee(Map<String, String> propositions, String champ, BigDecimal borne) {
        String valeur = propositions.get(champ);
        if (valeur != null && ValeursWorkflow.enDecimal(valeur).abs().compareTo(borne) > 0) {
            throw invalide(champ, "Coordonnée hors bornes (±" + borne + ").");
        }
    }

    private static void exigerRenseigne(Map<String, String> valeurs, String champ) {
        if (valeurs.get(champ) == null) {
            throw invalide(champ, "Le champ « " + champ + " » est obligatoire.");
        }
    }

    private static ExceptionValidation invalide(String champ, String message) {
        return new ExceptionValidation("DEMANDE_VALEUR_INVALIDE", message, champ);
    }

    private Adherent charger(UUID id) {
        return adherentRepository.findById(id).orElseThrow(AdaptateurWorkflowAdherent::introuvable);
    }

    private static ExceptionRessourceIntrouvable introuvable() {
        return new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable.");
    }
}
