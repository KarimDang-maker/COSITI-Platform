package cm.cositi.api.adhesion.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adhesion.dto.ConfigurationFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.EnregistrerFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.FraisAdhesionAdherentDto;
import cm.cositi.api.adhesion.dto.FraisAdhesionDto;
import cm.cositi.api.adhesion.dto.RapprochementFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.ResolutionAnomalieFraisDto;
import cm.cositi.api.adhesion.dto.SyntheseFraisAdhesionDto;
import cm.cositi.api.adhesion.entite.FraisAdhesion;
import cm.cositi.api.adhesion.entite.StatutFraisAdhesion;
import cm.cositi.api.adhesion.repository.FraisAdhesionRepository;
import cm.cositi.api.audit.ContexteAudit;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.organisation.entite.Agent;
import cm.cositi.api.organisation.repository.AgentRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class ServiceFraisAdhesionImpl implements ServiceFraisAdhesion {

    static final String PARAM_MONTANT = "MONTANT_INSCRIPTION";
    private static final int MAX_LIGNES_ECART = 200;

    private final FraisAdhesionRepository fraisRepository;
    private final AdherentRepository adherentRepository;
    private final AgentRepository agentRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;
    private final ApplicationEventPublisher evenements;
    private final JdbcTemplate jdbcTemplate;

    public ServiceFraisAdhesionImpl(FraisAdhesionRepository fraisRepository, AdherentRepository adherentRepository,
                                    AgentRepository agentRepository, ServicePerimetreDonnees perimetre,
                                    ServiceParametre serviceParametre, ServiceAudit serviceAudit,
                                    ApplicationEventPublisher evenements, JdbcTemplate jdbcTemplate) {
        this.fraisRepository = fraisRepository;
        this.adherentRepository = adherentRepository;
        this.agentRepository = agentRepository;
        this.perimetre = perimetre;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
        this.evenements = evenements;
        this.jdbcTemplate = jdbcTemplate;
    }

    // ------------------------------------------------------------------------------------------ Configuration

    @Override
    @PreAuthorize("isAuthenticated()")
    public ConfigurationFraisAdhesionDto configuration() {
        return new ConfigurationFraisAdhesionDto(FraisAdhesion.TYPE_ADHESION, montantUnitaire(), "XAF", PARAM_MONTANT,
                serviceParametre.estValide(PARAM_MONTANT));
    }

    @Override
    public BigDecimal montantUnitaire() {
        return serviceParametre.decimal(PARAM_MONTANT);
    }

    // ------------------------------------------------------------------------------------------ Enregistrement

    @Override
    @PreAuthorize("hasAnyAuthority('FRAIS_ADHESION:LIRE', 'ADHERENT:LIRE')")
    public FraisAdhesionAdherentDto parAdherent(UUID adherentId, Utilisateur demandeur) {
        Adherent adherent = chargerAdherent(adherentId);
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        FraisAdhesionDto frais = fraisRepository.findByAdherentIdAndTypeFrais(adherentId, FraisAdhesion.TYPE_ADHESION)
                .map(f -> dto(f, adherent)).orElse(null);
        return new FraisAdhesionAdherentDto(adherentId, montantUnitaire(), "XAF", frais != null, frais);
    }

    @Override
    @PreAuthorize("hasAuthority('FRAIS_ADHESION:ENREGISTRER')")
    @Transactional
    public ResultatEnregistrementFrais enregistrer(UUID adherentId, EnregistrerFraisAdhesionDto dto,
                                                   Utilisateur gestionnaire) {
        String cle = dto.cleIdempotence() != null && !dto.cleIdempotence().isBlank() ? dto.cleIdempotence().trim()
                : ContexteAudit.cleIdempotenceEntete();
        if (cle != null) {
            var existant = fraisRepository.findByCleIdempotence(cle);
            if (existant.isPresent()) {
                if (!existant.get().getAdherentId().equals(adherentId)) {
                    throw new ExceptionConflit("IDEMPOTENCY_KEY_REUTILISEE",
                            "Cette clé d'idempotence a déjà servi pour un autre adhérent.");
                }
                return new ResultatEnregistrementFrais(dto(existant.get(), null), true);
            }
        }

        Adherent adherent = chargerAdherent(adherentId);
        perimetre.verifierAccesAdherent(gestionnaire, adherentId);
        if (adherent.isArchive()) {
            throw new ExceptionConflit("ADHERENT_ARCHIVE", "Cet adhérent est archivé.");
        }
        var dejaEnregistre = fraisRepository.findByAdherentIdAndTypeFrais(adherentId, FraisAdhesion.TYPE_ADHESION);
        if (dejaEnregistre.isPresent()) {
            // §8 : un seul frais d'adhésion initial par adhérent — un double clic ne crée jamais un second frais.
            throw new ExceptionConflit("FRAIS_ADHESION_DEJA_ENREGISTRE",
                    "Le frais d'adhésion de cet adhérent est déjà enregistré (" + dejaEnregistre.get().getReference() + ").");
        }
        Agent agent = agentRepository.findById(dto.agentId())
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("AGENT_INTROUVABLE", "Agent collecteur introuvable."));
        if (agent.isArchive()) {
            throw new ExceptionConflit("AGENT_ARCHIVE", "L'agent collecteur indiqué est archivé.");
        }

        BigDecimal attendu = montantUnitaire();
        BigDecimal recu = dto.montantRecu() != null ? dto.montantRecu() : attendu;
        LocalDate dateCollecte = dto.dateCollecte() != null ? dto.dateCollecte() : LocalDate.now();
        if (dateCollecte.isAfter(LocalDate.now())) {
            throw new ExceptionValidation("FRAIS_ADHESION_DATE_FUTURE", "La date de collecte ne peut pas être dans le futur.",
                    "dateCollecte");
        }

        Long sequence = jdbcTemplate.queryForObject("SELECT nextval('seq_reference_frais_adhesion')", Long.class);
        FraisAdhesion frais = new FraisAdhesion("FAD-" + String.format("%06d", sequence), adherentId, agent.getId(),
                attendu, recu, dateCollecte, gestionnaire.getId(), cle, texte(dto.commentaire()));
        frais = fraisRepository.saveAndFlush(frais);

        adherent.setInscriptionPayee(recu.compareTo(attendu) >= 0);
        adherentRepository.save(adherent);

        FraisAdhesionDto resultat = dto(frais, adherent);
        serviceAudit.tracer(TypeOperation.FRAIS_ADHESION_ENREGISTREMENT, "frais_adhesion", frais.getId(), null,
                ContexteAudit.avec(gestionnaire, Map.of("frais", resultat, "adherentId", adherentId,
                        "agentCollecteurId", agent.getId())), texte(dto.commentaire()));
        if (recu.compareTo(attendu) != 0) {
            evenements.publishEvent(new AdhesionEvent("FRAIS_ADHESION_ECART", adherentId, "frais_adhesion",
                    frais.getId(), null, List.of("DAF"), "Écart sur le frais d'adhésion " + frais.getReference(),
                    "Adhérent " + adherent.getMatricule() + " : " + recu + " FCFA reçus pour " + attendu + " FCFA attendus."));
        }
        return new ResultatEnregistrementFrais(resultat, false);
    }

    // ------------------------------------------------------------------------------------------ Lecture

    @Override
    @PreAuthorize("hasAuthority('FRAIS_ADHESION:LIRE')")
    public FraisAdhesionDto consulter(UUID fraisId, Utilisateur demandeur) {
        FraisAdhesion frais = charger(fraisId);
        perimetre.verifierAccesAdherent(demandeur, frais.getAdherentId());
        return dto(frais, null);
    }

    @Override
    @PreAuthorize("hasAuthority('FRAIS_ADHESION:LIRE')")
    public ReponsePaginee<FraisAdhesionDto> lister(StatutFraisAdhesion statut, UUID agentId, LocalDate du, LocalDate au,
                                                   boolean seulementEcarts, Pageable pageable, Utilisateur demandeur) {
        exigerPerimetreGlobal(demandeur);
        Specification<FraisAdhesion> spec = Specification.where(null);
        if (statut != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("statut"), statut));
        }
        if (agentId != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("agentId"), agentId));
        }
        if (du != null) {
            spec = spec.and((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("dateCollecte"), du));
        }
        if (au != null) {
            spec = spec.and((r, q, cb) -> cb.lessThanOrEqualTo(r.get("dateCollecte"), au));
        }
        if (seulementEcarts) {
            spec = spec.and((r, q, cb) -> cb.notEqual(r.get("montantRecu"), r.get("montantAttendu")));
        }
        return ReponsePaginee.depuis(fraisRepository.findAll(spec, pageable).map(f -> dto(f, null)));
    }

    // ------------------------------------------------------------------------------------------ Contrôle financier

    @Override
    @PreAuthorize("hasAuthority('FRAIS_ADHESION:VALIDER')")
    @Transactional
    public FraisAdhesionDto valider(UUID fraisId, Long versionAttendue, Utilisateur validateur) {
        FraisAdhesion frais = charger(fraisId);
        verifierVersion(frais, versionAttendue);
        if (validateur.getId().equals(frais.getEnregistrePar())) {
            throw new ExceptionMetier("FRAIS_ADHESION_AUTO_VALIDATION_INTERDITE",
                    "Vous ne pouvez pas valider l'encaissement d'un frais que vous avez enregistré.", HttpStatus.FORBIDDEN);
        }
        if (frais.getStatut() == StatutFraisAdhesion.VALIDE) {
            throw new ExceptionConflit("FRAIS_ADHESION_DEJA_VALIDE", "L'encaissement de ce frais est déjà validé.");
        }
        if (frais.getStatut() == StatutFraisAdhesion.ANOMALIE) {
            throw new ExceptionConflit("FRAIS_ADHESION_ANOMALIE_NON_RESOLUE",
                    "Une anomalie est signalée sur ce frais : elle doit être résolue avant validation.");
        }
        FraisAdhesionDto avant = dto(frais, null);
        frais.valider(validateur.getId());
        frais = fraisRepository.saveAndFlush(frais);
        FraisAdhesionDto apres = dto(frais, null);
        serviceAudit.tracer(TypeOperation.FRAIS_ADHESION_VALIDATION, "frais_adhesion", frais.getId(), avant,
                ContexteAudit.avec(validateur, Map.of("frais", apres)), null);
        return apres;
    }

    @Override
    @PreAuthorize("hasAuthority('FRAIS_ADHESION:SIGNALER')")
    @Transactional
    public FraisAdhesionDto signalerAnomalie(UUID fraisId, String motif, Utilisateur auteur) {
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("FRAIS_ADHESION_MOTIF_REQUIS", "Le motif de l'anomalie est obligatoire.", "motif");
        }
        FraisAdhesion frais = charger(fraisId);
        if (frais.getStatut() == StatutFraisAdhesion.ANOMALIE) {
            throw new ExceptionConflit("FRAIS_ADHESION_DEJA_EN_ANOMALIE", "Une anomalie est déjà signalée sur ce frais.");
        }
        FraisAdhesionDto avant = dto(frais, null);
        frais.signalerAnomalie(auteur.getId(), motif.trim());
        frais = fraisRepository.saveAndFlush(frais);
        FraisAdhesionDto apres = dto(frais, null);
        serviceAudit.tracer(TypeOperation.FRAIS_ADHESION_ANOMALIE_SIGNALEE, "frais_adhesion", frais.getId(), avant,
                ContexteAudit.avec(auteur, Map.of("frais", apres)), motif.trim());
        evenements.publishEvent(new AdhesionEvent("FRAIS_ADHESION_ANOMALIE", frais.getAdherentId(), "frais_adhesion",
                frais.getId(), frais.getEnregistrePar(), List.of("DAF"),
                "Anomalie sur le frais d'adhésion " + frais.getReference(), motif.trim()));
        return apres;
    }

    @Override
    @PreAuthorize("hasAuthority('FRAIS_ADHESION:VALIDER')")
    @Transactional
    public FraisAdhesionDto resoudreAnomalie(UUID fraisId, ResolutionAnomalieFraisDto dto, Utilisateur auteur) {
        FraisAdhesion frais = charger(fraisId);
        if (frais.getStatut() != StatutFraisAdhesion.ANOMALIE) {
            throw new ExceptionConflit("FRAIS_ADHESION_SANS_ANOMALIE", "Aucune anomalie n'est en cours sur ce frais.");
        }
        if (auteur.getId().equals(frais.getEnregistrePar())) {
            throw new ExceptionMetier("FRAIS_ADHESION_AUTO_RESOLUTION_INTERDITE",
                    "Vous ne pouvez pas résoudre une anomalie sur un frais que vous avez enregistré.", HttpStatus.FORBIDDEN);
        }
        FraisAdhesionDto avant = dto(frais, null);
        frais.resoudreAnomalie(auteur.getId(), dto.resolution().trim(), dto.montantRecuCorrige());
        frais = fraisRepository.saveAndFlush(frais);
        if (dto.montantRecuCorrige() != null) {
            Adherent adherent = chargerAdherent(frais.getAdherentId());
            adherent.setInscriptionPayee(frais.getMontantRecu().compareTo(frais.getMontantAttendu()) >= 0);
            adherentRepository.save(adherent);
        }
        FraisAdhesionDto apres = dto(frais, null);
        // Correction tracée avant/après : jamais une modification silencieuse du montant constaté.
        serviceAudit.tracer(TypeOperation.FRAIS_ADHESION_ANOMALIE_RESOLUE, "frais_adhesion", frais.getId(), avant,
                ContexteAudit.avec(auteur, Map.of("frais", apres)), dto.resolution().trim());
        return apres;
    }

    // ------------------------------------------------------------------------------------------ Reporting

    @Override
    @PreAuthorize("hasAuthority('FRAIS_ADHESION:LIRE')")
    public SyntheseFraisAdhesionDto synthese(LocalDate du, LocalDate au, UUID agentId, Utilisateur demandeur) {
        exigerPerimetreGlobal(demandeur);
        List<Object> parametres = new ArrayList<>();
        String filtre = filtrePeriode("date_collecte", du, au, agentId, "agent_id", parametres);

        List<SyntheseFraisAdhesionDto.LigneJournaliere> parJour = jdbcTemplate.query(
                "SELECT date_collecte, COUNT(*) AS n, COALESCE(SUM(montant_attendu),0) AS att, COALESCE(SUM(montant_recu),0) AS rec "
                        + "FROM frais_adhesion WHERE 1=1" + filtre + " GROUP BY date_collecte ORDER BY date_collecte",
                (rs, i) -> new SyntheseFraisAdhesionDto.LigneJournaliere(rs.getDate("date_collecte").toLocalDate(),
                        rs.getLong("n"), rs.getBigDecimal("att"), rs.getBigDecimal("rec")),
                parametres.toArray());
        Map<String, Long> parStatut = new LinkedHashMap<>();
        for (StatutFraisAdhesion s : StatutFraisAdhesion.values()) {
            parStatut.put(s.name(), 0L);
        }
        jdbcTemplate.query("SELECT statut, COUNT(*) AS n FROM frais_adhesion WHERE 1=1" + filtre + " GROUP BY statut",
                rs -> {
                    parStatut.put(rs.getString("statut"), rs.getLong("n"));
                }, parametres.toArray());

        long nombre = parJour.stream().mapToLong(SyntheseFraisAdhesionDto.LigneJournaliere::nombreFrais).sum();
        BigDecimal attendu = parJour.stream().map(SyntheseFraisAdhesionDto.LigneJournaliere::montantAttendu)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal recu = parJour.stream().map(SyntheseFraisAdhesionDto.LigneJournaliere::montantRecu)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new SyntheseFraisAdhesionDto(du, au, agentId, nombre, attendu, recu, recu.subtract(attendu), parStatut, parJour);
    }

    @Override
    @PreAuthorize("hasAuthority('FRAIS_ADHESION:LIRE')")
    public RapprochementFraisAdhesionDto rapprochement(LocalDate du, LocalDate au, UUID agentId, Utilisateur demandeur) {
        exigerPerimetreGlobal(demandeur);
        BigDecimal unitaire = montantUnitaire();

        // Dossiers soumis = adhérents distincts dont la PREMIÈRE transmission à la DGA tombe dans la période (§7) :
        // une correction suivie d'une resoumission ne compte jamais deux fois. L'agent retenu est le collecteur du
        // frais, à défaut l'agent du portefeuille actif.
        List<Object> parametres = new ArrayList<>();
        StringBuilder soumis = new StringBuilder("""
                WITH soumis AS (
                    SELECT a.id AS adherent_id, a.matricule, trim(a.nom || ' ' || COALESCE(a.prenoms, '')) AS nom,
                           COALESCE(f.agent_id, (SELECT ap.agent_id FROM affectation_portefeuille ap
                                                 WHERE ap.adherent_id = a.id AND ap.date_fin IS NULL LIMIT 1)) AS agent_id,
                           f.reference, f.montant_attendu, f.montant_recu, f.statut AS statut_frais
                    FROM adherent a
                    LEFT JOIN frais_adhesion f ON f.adherent_id = a.id AND f.type_frais = 'ADHESION'
                    WHERE a.premiere_soumission_dga_le IS NOT NULL""");
        if (du != null) {
            soumis.append(" AND a.premiere_soumission_dga_le >= CAST(? AS date)");
            parametres.add(Date.valueOf(du));
        }
        if (au != null) {
            soumis.append(" AND a.premiere_soumission_dga_le < CAST(? AS date) + 1");
            parametres.add(Date.valueOf(au));
        }
        soumis.append(") ");
        String filtreAgent = "";
        if (agentId != null) {
            filtreAgent = " AND s.agent_id = ?";
        }
        List<Object> parametresAgent = new ArrayList<>(parametres);
        if (agentId != null) {
            parametresAgent.add(agentId);
        }

        Map<String, Object> agregat = jdbcTemplate.queryForMap(soumis + """
                SELECT COUNT(*) AS nombre, COALESCE(SUM(s.montant_recu), 0) AS enregistre,
                       COUNT(*) FILTER (WHERE s.reference IS NULL) AS sans_frais
                FROM soumis s WHERE 1=1""" + filtreAgent, parametresAgent.toArray());
        long nombre = ((Number) agregat.get("nombre")).longValue();
        BigDecimal enregistre = (BigDecimal) agregat.get("enregistre");
        long sansFrais = ((Number) agregat.get("sans_frais")).longValue();
        BigDecimal attendu = unitaire.multiply(BigDecimal.valueOf(nombre));

        String conditionEcart = " AND (s.reference IS NULL OR s.montant_recu <> ? OR s.statut_frais = 'ANOMALIE')";
        List<Object> parametresEcart = new ArrayList<>(parametresAgent);
        parametresEcart.add(unitaire);
        Long nombreEcarts = jdbcTemplate.queryForObject(soumis + "SELECT COUNT(*) FROM soumis s WHERE 1=1" + filtreAgent
                + conditionEcart, Long.class, parametresEcart.toArray());
        List<Object> parametresListe = new ArrayList<>(parametresEcart);
        parametresListe.add(unitaire);
        parametresListe.add(MAX_LIGNES_ECART);
        List<RapprochementFraisAdhesionDto.LigneEcart> ecarts = jdbcTemplate.query(soumis + """
                SELECT s.adherent_id, s.matricule, s.nom, s.agent_id, ag.nom_complet AS agent_nom, s.reference,
                       s.montant_recu, s.statut_frais
                FROM soumis s LEFT JOIN agent ag ON ag.id = s.agent_id WHERE 1=1""" + filtreAgent + conditionEcart
                        + " ORDER BY (s.reference IS NULL) DESC, abs(COALESCE(s.montant_recu, 0) - ?) DESC, s.matricule LIMIT ?",
                (rs, i) -> {
                    BigDecimal recu = rs.getBigDecimal("montant_recu");
                    String reference = rs.getString("reference");
                    String type = reference == null ? "SANS_FRAIS"
                            : "ANOMALIE".equals(rs.getString("statut_frais")) ? "ANOMALIE_SIGNALEE" : "MONTANT_DIFFERENT";
                    BigDecimal enregistreLigne = recu == null ? BigDecimal.ZERO : recu;
                    return new RapprochementFraisAdhesionDto.LigneEcart(rs.getObject("adherent_id", UUID.class),
                            rs.getString("matricule"), rs.getString("nom"), rs.getObject("agent_id", UUID.class),
                            rs.getString("agent_nom"), reference, unitaire, enregistreLigne,
                            enregistreLigne.subtract(unitaire), type);
                }, parametresListe.toArray());

        // Frais enregistrés pour des adhérents pas (encore) transmis à la DGA : hors du montant attendu, signalés à part.
        List<Object> parametresHors = new ArrayList<>();
        String filtreHors = filtrePeriode("f.date_collecte", du, au, agentId, "f.agent_id", parametresHors);
        Map<String, Object> hors = jdbcTemplate.queryForMap("""
                SELECT COUNT(*) AS n, COALESCE(SUM(f.montant_recu), 0) AS montant
                FROM frais_adhesion f JOIN adherent a ON a.id = f.adherent_id
                WHERE a.premiere_soumission_dga_le IS NULL""" + filtreHors, parametresHors.toArray());

        List<String> avertissements = new ArrayList<>();
        if (enregistre.compareTo(attendu) != 0) {
            avertissements.add("Écart de " + format(enregistre.subtract(attendu)) + " FCFA entre le montant enregistré et "
                    + "le montant attendu : anomalie potentielle à examiner, aucune correction automatique.");
        }
        if (!serviceParametre.estValide(PARAM_MONTANT)) {
            avertissements.add("Le montant unitaire (" + PARAM_MONTANT + ") n'est pas validé par la COSITI.");
        }
        String detail = nombre + " dossier" + (nombre > 1 ? "s" : "") + " × " + format(unitaire) + " FCFA = "
                + format(attendu) + " FCFA";
        return new RapprochementFraisAdhesionDto(du, au, agentId, nombre, unitaire, attendu, enregistre,
                enregistre.subtract(attendu), detail, sansFrais, nombreEcarts == null ? 0 : nombreEcarts, ecarts,
                ((Number) hors.get("n")).longValue(), (BigDecimal) hors.get("montant"), avertissements);
    }

    // ------------------------------------------------------------------------------------------ Interne

    private static String filtrePeriode(String colonneDate, LocalDate du, LocalDate au, UUID agentId,
                                        String colonneAgent, List<Object> parametres) {
        StringBuilder filtre = new StringBuilder();
        if (du != null) {
            filtre.append(" AND ").append(colonneDate).append(" >= ?");
            parametres.add(Date.valueOf(du));
        }
        if (au != null) {
            filtre.append(" AND ").append(colonneDate).append(" <= ?");
            parametres.add(Date.valueOf(au));
        }
        if (agentId != null) {
            filtre.append(" AND ").append(colonneAgent).append(" = ?");
            parametres.add(agentId);
        }
        return filtre.toString();
    }

    private void exigerPerimetreGlobal(Utilisateur utilisateur) {
        // Les frais d'adhésion sont des données adhérent : le périmètre adhérent global suffit (Gestionnaire inclus).
        if (!perimetre.estPerimetreAdherentGlobal(utilisateur)) {
            throw new ExceptionAutorisation("FRAIS_ADHESION_PERIMETRE_GLOBAL_REQUIS",
                    "Les synthèses et le rapprochement des frais d'adhésion sont réservés aux rôles à périmètre global.");
        }
    }

    private static void verifierVersion(FraisAdhesion frais, Long versionAttendue) {
        if (versionAttendue != null && !versionAttendue.equals(frais.getVersion())) {
            throw new ExceptionConflit("FRAIS_ADHESION_VERSION_OBSOLETE",
                    "Ce frais a été modifié depuis votre lecture. Rechargez-le avant de décider.");
        }
    }

    private FraisAdhesionDto dto(FraisAdhesion f, Adherent adherentConnu) {
        Adherent adherent = adherentConnu != null ? adherentConnu : adherentRepository.findById(f.getAdherentId()).orElse(null);
        String nomAgent = agentRepository.findById(f.getAgentId()).map(Agent::getNomComplet).orElse(null);
        return FraisAdhesionDto.depuis(f, adherent == null ? null : adherent.getMatricule(),
                adherent == null ? null : nomComplet(adherent), nomAgent);
    }

    static String nomComplet(Adherent a) {
        return a.getPrenoms() == null ? a.getNom() : a.getNom() + " " + a.getPrenoms();
    }

    private static String format(BigDecimal montant) {
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.FRANCE);
        return format.format(montant).replace(' ', ' ').replace(' ', ' ');
    }

    private FraisAdhesion charger(UUID id) {
        return fraisRepository.findById(id).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("FRAIS_ADHESION_INTROUVABLE", "Frais d'adhésion introuvable."));
    }

    private Adherent chargerAdherent(UUID id) {
        return adherentRepository.findById(id).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
    }

    private static String texte(String valeur) {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
    }
}
