package cm.cositi.api.adhesion.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutControleDga;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adhesion.dto.ControleDgaDto;
import cm.cositi.api.adhesion.dto.DecisionControleDgaDto;
import cm.cositi.api.adhesion.dto.LigneFileControleDgaDto;
import cm.cositi.api.adhesion.dto.SyntheseControleDgaDto;
import cm.cositi.api.adhesion.dto.VerifierChampDto;
import cm.cositi.api.adhesion.dto.VerifierDocumentDto;
import cm.cositi.api.adhesion.entite.ControleDga;
import cm.cositi.api.adhesion.entite.ControleDgaChamp;
import cm.cositi.api.adhesion.entite.ControleDgaDocument;
import cm.cositi.api.adhesion.entite.DecisionControleDga;
import cm.cositi.api.adhesion.entite.ExigenceDocumentaire;
import cm.cositi.api.adhesion.entite.NiveauExigence;
import cm.cositi.api.adhesion.entite.StatutControle;
import cm.cositi.api.adhesion.entite.StatutCorrespondance;
import cm.cositi.api.adhesion.repository.ControleDgaChampRepository;
import cm.cositi.api.adhesion.repository.ControleDgaDocumentRepository;
import cm.cositi.api.adhesion.repository.ControleDgaRepository;
import cm.cositi.api.audit.AuditLigneDto;
import cm.cositi.api.audit.ContexteAudit;
import cm.cositi.api.audit.JournalAudit;
import cm.cositi.api.audit.JournalAuditRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.document.entite.Document;
import cm.cositi.api.document.entite.StatutDocument;
import cm.cositi.api.document.repository.DocumentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import cm.cositi.api.workflow.entite.StatutValidationEntite;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class ServiceControleDgaImpl implements ServiceControleDga {

    /** Pièce sans information paramétrée : la DGA en contrôle au moins la présence et la lisibilité. */
    static final String CHAMP_PRESENCE = "presence";

    private static final Map<String, String> LIBELLES = Map.ofEntries(
            Map.entry("nom", "Nom"), Map.entry("prenoms", "Prénom(s)"), Map.entry("dateNaissance", "Date de naissance"),
            Map.entry("sexe", "Sexe"), Map.entry("numeroCni", "Numéro CNI"), Map.entry("numeroCnps", "Numéro CNPS"),
            Map.entry("telephonePrincipal", "Téléphone principal"), Map.entry("localisation", "Localisation"),
            Map.entry("quartier", "Quartier"), Map.entry("ville", "Ville"),
            Map.entry(CHAMP_PRESENCE, "Document présent, lisible et au nom de l'adhérent"));

    private final ControleDgaRepository controleRepository;
    private final ControleDgaDocumentRepository documentControleRepository;
    private final ControleDgaChampRepository champRepository;
    private final AdherentRepository adherentRepository;
    private final DocumentRepository documentRepository;
    private final JournalAuditRepository journalAuditRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceExigenceDocumentaire serviceExigence;
    private final ServiceAudit serviceAudit;
    private final ApplicationEventPublisher evenements;
    private final JdbcTemplate jdbcTemplate;

    public ServiceControleDgaImpl(ControleDgaRepository controleRepository,
                                 ControleDgaDocumentRepository documentControleRepository,
                                 ControleDgaChampRepository champRepository, AdherentRepository adherentRepository,
                                 DocumentRepository documentRepository, JournalAuditRepository journalAuditRepository,
                                 ServicePerimetreDonnees perimetre, ServiceExigenceDocumentaire serviceExigence,
                                 ServiceAudit serviceAudit, ApplicationEventPublisher evenements,
                                 JdbcTemplate jdbcTemplate) {
        this.controleRepository = controleRepository;
        this.documentControleRepository = documentControleRepository;
        this.champRepository = champRepository;
        this.adherentRepository = adherentRepository;
        this.documentRepository = documentRepository;
        this.journalAuditRepository = journalAuditRepository;
        this.perimetre = perimetre;
        this.serviceExigence = serviceExigence;
        this.serviceAudit = serviceAudit;
        this.evenements = evenements;
        this.jdbcTemplate = jdbcTemplate;
    }

    // ------------------------------------------------------------------------------------------ Ouverture

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public ControleDgaDto ouvrir(Adherent adherent, UUID soumisParId) {
        Optional<ControleDga> precedent = controleRepository.findFirstByAdherentIdOrderByTourDesc(adherent.getId());
        int tour = precedent.map(c -> c.getTour() + 1).orElse(1);
        Long sequence = jdbcTemplate.queryForObject("SELECT nextval('seq_reference_controle_dga')", Long.class);
        ControleDga controle = controleRepository.saveAndFlush(new ControleDga("CDG-" + String.format("%06d", sequence),
                adherent.getId(), tour, precedent.map(ControleDga::getId).orElse(null), soumisParId));

        Map<String, Document> presents = new LinkedHashMap<>();
        for (Document d : documentRepository.findByAdherentIdAndArchiveFalseOrderByCreeLeDesc(adherent.getId())) {
            if (d.estVersionActive()) {
                presents.putIfAbsent(d.getTypeDocument().name(), d);
            }
        }
        // Matrice documentaire (V21, §18, §23) : pièces contrôlées par la DGA — obligatoires (présentes ou non, pour
        // constater un manque) et conditionnelles/optionnelles effectivement fournies — et, pour chacune, les
        // informations qu'elle justifie.
        List<ExigenceDocumentaire> exigences = serviceExigence.enVigueur(LocalDate.now());
        for (ExigenceDocumentaire piece : exigences) {
            if (!piece.estPiece() || !piece.isVerificationDga() || piece.getNiveau() == NiveauExigence.NON_APPLICABLE) {
                continue;
            }
            Document document = presents.get(piece.getTypeDocument());
            if (piece.getNiveau() != NiveauExigence.OBLIGATOIRE && document == null) {
                continue;
            }
            ControleDgaDocument ligne = new ControleDgaDocument(controle.getId(), document == null ? null : document.getId(),
                    piece.getTypeDocument(), piece.getNiveau() == NiveauExigence.OBLIGATOIRE);
            ligne.rattacherExigence(piece.getId(), piece.getNiveau().name());
            ligne = documentControleRepository.save(ligne);
            List<ExigenceDocumentaire> champs = exigences.stream()
                    .filter(e -> !e.estPiece() && e.isVerificationDga() && e.getNiveau() != NiveauExigence.NON_APPLICABLE
                            && e.getTypeDocument().equals(piece.getTypeDocument()))
                    .toList();
            if (champs.isEmpty()) {
                ControleDgaChamp presence = new ControleDgaChamp(controle.getId(), ligne.getId(), CHAMP_PRESENCE,
                        LIBELLES.get(CHAMP_PRESENCE), valeurNumerique(adherent, CHAMP_PRESENCE));
                presence.rattacherExigence(piece.getId());
                champRepository.save(presence);
            }
            for (ExigenceDocumentaire e : champs) {
                ControleDgaChamp champ = new ControleDgaChamp(controle.getId(), ligne.getId(), e.getChamp(),
                        LIBELLES.getOrDefault(e.getChamp(), e.getLibelle()), valeurNumerique(adherent, e.getChamp()));
                champ.rattacherExigence(e.getId());
                champRepository.save(champ);
            }
        }
        return dto(controle, adherent);
    }

    // ------------------------------------------------------------------------------------------ Lecture

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:LIRE')")
    public ReponsePaginee<LigneFileControleDgaDto> file(List<StatutControle> statuts, UUID agentId, LocalDate du,
                                                        LocalDate au, boolean seulementAvecAnomalie, Pageable pageable,
                                                        Utilisateur demandeur) {
        List<StatutControle> filtreStatuts = statuts == null || statuts.isEmpty()
                ? List.of(StatutControle.EN_ATTENTE, StatutControle.EN_COURS) : statuts;
        List<Object> parametres = new ArrayList<>();
        StringBuilder where = new StringBuilder(" WHERE c.statut IN (");
        for (int i = 0; i < filtreStatuts.size(); i++) {
            where.append(i == 0 ? "?" : ", ?");
            parametres.add(filtreStatuts.get(i).name());
        }
        where.append(")");
        if (agentId != null) {
            where.append(" AND f.agent_id = ?");
            parametres.add(agentId);
        }
        if (du != null) {
            where.append(" AND c.soumis_le >= CAST(? AS date)");
            parametres.add(Date.valueOf(du));
        }
        if (au != null) {
            where.append(" AND c.soumis_le < CAST(? AS date) + 1");
            parametres.add(Date.valueOf(au));
        }
        String anomalies = "(SELECT COUNT(*) FROM controle_dga_champ ch WHERE ch.controle_id = c.id AND "
                + "ch.statut_correspondance IN ('NON_CORRESPOND','NON_LISIBLE','DOCUMENT_MANQUANT'))";
        if (seulementAvecAnomalie) {
            where.append(" AND ").append(anomalies).append(" > 0");
        }
        String depuis = " FROM controle_dga c JOIN adherent a ON a.id = c.adherent_id"
                + " LEFT JOIN frais_adhesion f ON f.adherent_id = a.id AND f.type_frais = 'ADHESION'"
                + " LEFT JOIN agent ag ON ag.id = f.agent_id LEFT JOIN utilisateur ua ON ua.id = a.active_par";

        Long total = jdbcTemplate.queryForObject("SELECT COUNT(*)" + depuis + where, Long.class, parametres.toArray());
        List<Object> parametresPage = new ArrayList<>(parametres);
        parametresPage.add(pageable.getPageSize());
        parametresPage.add(pageable.getOffset());
        List<LigneFileControleDgaDto> lignes = jdbcTemplate.query("""
                        SELECT c.id, c.reference, c.tour, c.statut, c.soumis_le, a.id AS adherent_id, a.matricule,
                               trim(a.nom || ' ' || COALESCE(a.prenoms, '')) AS nom, f.agent_id, ag.nom_complet AS agent_nom,
                               ua.identifiant AS gestionnaire, a.active_le,
                               (SELECT COUNT(*) FROM controle_dga_document d WHERE d.controle_id = c.id) AS nb_documents,
                               (SELECT COUNT(*) FROM controle_dga_document d WHERE d.controle_id = c.id
                                    AND d.statut <> 'A_VERIFIER') AS nb_verifies,
                        """ + anomalies + " AS nb_anomalies" + depuis + where
                        + " ORDER BY c.soumis_le ASC LIMIT ? OFFSET ?",
                (rs, i) -> new LigneFileControleDgaDto(rs.getObject("id", UUID.class), rs.getString("reference"),
                        rs.getInt("tour"), StatutControle.valueOf(rs.getString("statut")),
                        rs.getObject("adherent_id", UUID.class), rs.getString("matricule"), rs.getString("nom"),
                        rs.getObject("agent_id", UUID.class), rs.getString("agent_nom"), rs.getString("gestionnaire"),
                        instant(rs.getTimestamp("active_le")), instant(rs.getTimestamp("soumis_le")),
                        rs.getLong("nb_documents"), rs.getLong("nb_verifies"), rs.getLong("nb_anomalies")),
                parametresPage.toArray());
        return ReponsePaginee.depuis(new PageImpl<>(lignes, pageable, total == null ? 0 : total));
    }

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:LIRE')")
    public ControleDgaDto consulter(UUID controleId, Utilisateur demandeur) {
        ControleDga controle = charger(controleId);
        perimetre.verifierAccesAdherent(demandeur, controle.getAdherentId());
        return dto(controle, null);
    }

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:LIRE')")
    public ControleDgaDto courant(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        return controleRepository.findFirstByAdherentIdOrderByTourDesc(adherentId).map(c -> dto(c, null))
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("CONTROLE_DGA_INTROUVABLE",
                        "Cet adhérent n'a jamais été transmis au contrôle DGA."));
    }

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:LIRE')")
    public List<ControleDgaDto> historique(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        return controleRepository.findByAdherentIdOrderByTourDesc(adherentId).stream().map(c -> dto(c, null)).toList();
    }

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:LIRE')")
    public List<AuditLigneDto> journal(UUID controleId, Utilisateur demandeur) {
        ControleDga controle = charger(controleId);
        perimetre.verifierAccesAdherent(demandeur, controle.getAdherentId());
        Specification<JournalAudit> spec = (r, q, cb) -> cb.and(cb.equal(r.get("entite"), "controle_dga"),
                cb.equal(r.get("entiteId"), controleId));
        return journalAuditRepository.findAll(spec, Sort.by(Sort.Direction.ASC, "horodatage")).stream()
                .map(AuditLigneDto::depuis).toList();
    }

    // ------------------------------------------------------------------------------------------ Contrôle

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:EFFECTUER')")
    @Transactional
    public ControleDgaDto demarrer(UUID controleId, Utilisateur dga) {
        ControleDga controle = verrouiller(controleId);
        Adherent adherent = chargerAdherent(controle.getAdherentId());
        exigerControleurIndependant(controle, adherent, dga);
        if (controle.getStatut() == StatutControle.EN_COURS) {
            return dto(controle, adherent);
        }
        demarrerInterne(controle, adherent, dga);
        return dto(controle, adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:EFFECTUER')")
    @Transactional
    public ControleDgaDto verifierChamp(UUID controleId, UUID champId, VerifierChampDto dto, Utilisateur dga) {
        ControleDga controle = verrouiller(controleId);
        Adherent adherent = chargerAdherent(controle.getAdherentId());
        exigerControleurIndependant(controle, adherent, dga);
        exigerModifiable(controle);
        if (controle.getStatut() == StatutControle.EN_ATTENTE) {
            demarrerInterne(controle, adherent, dga);
        }
        ControleDgaChamp champ = champRepository.findById(champId)
                .filter(c -> c.getControleId().equals(controleId))
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("CONTROLE_DGA_CHAMP_INTROUVABLE",
                        "Information introuvable dans ce contrôle."));
        if (dto.version() != null && !dto.version().equals(champ.getVersion())) {
            throw new ExceptionConflit("CONTROLE_DGA_VERSION_OBSOLETE",
                    "Cette information a été vérifiée entre-temps. Rechargez le contrôle.");
        }
        String commentaire = texte(dto.commentaire());
        String valeurPhysique = texte(dto.valeurPhysique());
        StatutCorrespondance statut = dto.statutCorrespondance();
        if (statut.exigeCommentaire() && commentaire == null) {
            throw new ExceptionValidation("CONTROLE_DGA_MOTIF_REQUIS",
                    "Un commentaire est obligatoire lorsque l'information ne correspond pas, n'est pas vérifiable, est "
                            + "illisible ou que le document manque (§14).", "commentaire");
        }
        if (statut == StatutCorrespondance.NON_CORRESPOND && valeurPhysique == null) {
            throw new ExceptionValidation("CONTROLE_DGA_VALEUR_DOCUMENT_REQUISE",
                    "Indiquez la valeur lue sur le document physique.", "valeurPhysique");
        }
        if (statut == StatutCorrespondance.CORRESPOND && valeurPhysique == null) {
            valeurPhysique = champ.getValeurNumerique();
        }
        Map<String, Object> avant = etatChamp(champ);
        champ.verifier(statut, valeurPhysique, commentaire, dga.getId());
        champ = champRepository.saveAndFlush(champ);
        recalculerDocument(champ.getControleDocumentId());

        Map<String, Object> apres = etatChamp(champ);
        serviceAudit.tracer(TypeOperation.CONTROLE_DGA_CHAMP_VERIFIE, "controle_dga", controle.getId(), avant,
                ContexteAudit.avec(dga, Map.of("adherentId", adherent.getId(), "champ", apres)), commentaire);
        if (statut == StatutCorrespondance.NON_CORRESPOND) {
            serviceAudit.tracer(TypeOperation.CONTROLE_DGA_NON_CONCORDANCE, "controle_dga", controle.getId(), avant,
                    ContexteAudit.avec(dga, Map.of("adherentId", adherent.getId(), "champ", apres)), commentaire);
        }
        return dto(controle, adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:EFFECTUER')")
    @Transactional
    public ControleDgaDto verifierDocument(UUID controleId, UUID controleDocumentId, VerifierDocumentDto dto,
                                           Utilisateur dga) {
        if (dto.statut() != StatutCorrespondance.DOCUMENT_MANQUANT && dto.statut() != StatutCorrespondance.NON_LISIBLE) {
            throw new ExceptionValidation("CONTROLE_DGA_CONSTAT_INVALIDE",
                    "Un constat sur un document entier est DOCUMENT_MANQUANT ou NON_LISIBLE ; les autres résultats se "
                            + "donnent information par information.", "statut");
        }
        ControleDga controle = verrouiller(controleId);
        Adherent adherent = chargerAdherent(controle.getAdherentId());
        exigerControleurIndependant(controle, adherent, dga);
        exigerModifiable(controle);
        if (controle.getStatut() == StatutControle.EN_ATTENTE) {
            demarrerInterne(controle, adherent, dga);
        }
        ControleDgaDocument document = documentControleRepository.findById(controleDocumentId)
                .filter(d -> d.getControleId().equals(controleId))
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("CONTROLE_DGA_DOCUMENT_INTROUVABLE",
                        "Document introuvable dans ce contrôle."));
        String commentaire = dto.commentaire().trim();
        for (ControleDgaChamp champ : champRepository.findByControleDocumentId(document.getId())) {
            champ.verifier(dto.statut(), null, commentaire, dga.getId());
            champRepository.saveAndFlush(champ);
        }
        recalculerDocument(document.getId());
        serviceAudit.tracer(TypeOperation.CONTROLE_DGA_NON_CONCORDANCE, "controle_dga", controle.getId(), null,
                ContexteAudit.avec(dga, Map.of("adherentId", adherent.getId(), "document", document.getTypeDocument(),
                        "constat", dto.statut())), commentaire);
        return dto(controle, adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:EFFECTUER')")
    @Transactional
    public ControleDgaDto terminer(UUID controleId, DecisionControleDgaDto dto, Utilisateur dga) {
        String cle = dto.cleIdempotence() != null && !dto.cleIdempotence().isBlank() ? dto.cleIdempotence().trim()
                : ContexteAudit.cleIdempotenceEntete();
        ControleDga controle = verrouiller(controleId);
        Adherent adherent = chargerAdherent(controle.getAdherentId());
        if (!controle.getStatut().estOuvert()) {
            // Idempotence : un double envoi de la même décision renvoie le résultat déjà enregistré.
            if (cle != null && cle.equals(controle.getCleIdempotenceDecision())) {
                return dto(controle, adherent);
            }
            throw new ExceptionConflit("CONTROLE_DGA_DEJA_TERMINE",
                    "Ce contrôle est déjà terminé (" + controle.getStatut() + ").");
        }
        exigerControleurIndependant(controle, adherent, dga);
        String commentaire = texte(dto.commentaire());
        List<ControleDgaChamp> champs = champRepository.findByControleId(controleId);

        StatutControle cible;
        switch (dto.decision()) {
            case VALIDER -> {
                long nonVerifies = champs.stream().filter(c -> c.getStatutCorrespondance() == null).count();
                if (nonVerifies > 0) {
                    throw new ExceptionConflit("CONTROLE_DGA_CHAMPS_NON_VERIFIES",
                            nonVerifies + " information(s) restent à vérifier avant validation.");
                }
                long anomalies = champs.stream().filter(c -> c.getStatutCorrespondance().estAnomalie()).count();
                if (anomalies > 0) {
                    // §14 : une anomalie documentaire empêche la validation finale — demander une correction ou rejeter.
                    throw new ExceptionConflit("CONTROLE_DGA_ANOMALIES_NON_TRAITEES",
                            anomalies + " anomalie(s) documentaire(s) : demandez une correction ou rejetez le dossier.");
                }
                cible = StatutControle.VALIDE;
            }
            case DEMANDER_CORRECTION -> cible = StatutControle.CORRECTION_DEMANDEE;
            default -> cible = StatutControle.REJETE;
        }
        if (cible != StatutControle.VALIDE && commentaire == null) {
            throw new ExceptionValidation("CONTROLE_DGA_MOTIF_REQUIS",
                    "Le motif est obligatoire pour une demande de correction ou un rejet.", "commentaire");
        }
        if (controle.getStatut() == StatutControle.EN_ATTENTE) {
            demarrerInterne(controle, adherent, dga);
        }

        StatutControle avant = controle.getStatut();
        controle.terminer(cible, dga.getId(), commentaire, cle);
        controle = controleRepository.saveAndFlush(controle);
        appliquerAuDossier(adherent, cible);
        if (cible == StatutControle.VALIDE) {
            marquerDocumentsVerifies(controle, dga, commentaire);
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("adherentId", adherent.getId());
        details.put("matricule", adherent.getMatricule());
        details.put("decision", dto.decision());
        details.put("statutControle", cible);
        details.put("compteurs", compteurs(controleId, champs));
        serviceAudit.tracer(TypeOperation.CONTROLE_DGA_TERMINE, "controle_dga", controle.getId(), Map.of("statut", avant),
                ContexteAudit.avec(dga, details), commentaire);
        if (cible == StatutControle.CORRECTION_DEMANDEE) {
            serviceAudit.tracer(TypeOperation.CONTROLE_DGA_CORRECTION_DEMANDEE, "adherent", adherent.getId(), null,
                    ContexteAudit.avec(dga, details), commentaire);
        }
        notifierDecision(adherent, controle, dto.decision(), commentaire);
        return dto(controle, adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('CONTROLE_DGA:LIRE')")
    public SyntheseControleDgaDto synthese(LocalDate du, LocalDate au, Utilisateur demandeur) {
        List<Object> parametres = new ArrayList<>();
        StringBuilder periode = new StringBuilder();
        if (du != null) {
            periode.append(" AND premiere_soumission_dga_le >= CAST(? AS date)");
            parametres.add(Date.valueOf(du));
        }
        if (au != null) {
            periode.append(" AND premiere_soumission_dga_le < CAST(? AS date) + 1");
            parametres.add(Date.valueOf(au));
        }
        // Clé de comptage : l'adhérent (premiere_soumission_dga_le), jamais le nombre de tours (§7).
        Long distincts = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM adherent WHERE premiere_soumission_dga_le "
                + "IS NOT NULL" + periode, Long.class, parametres.toArray());
        Long resoumissions = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM controle_dga c JOIN adherent a ON "
                + "a.id = c.adherent_id WHERE c.tour > 1" + periode.toString().replace("premiere_soumission_dga_le",
                "a.premiere_soumission_dga_le"), Long.class, parametres.toArray());
        Map<String, Long> parStatut = new LinkedHashMap<>();
        for (StatutControleDga s : StatutControleDga.values()) {
            if (s != StatutControleDga.NON_SOUMIS) {
                parStatut.put(s.name(), 0L);
            }
        }
        jdbcTemplate.query("SELECT statut_controle_dga, COUNT(*) AS n FROM adherent WHERE premiere_soumission_dga_le "
                        + "IS NOT NULL" + periode + " GROUP BY statut_controle_dga",
                rs -> {
                    parStatut.put(rs.getString("statut_controle_dga"), rs.getLong("n"));
                }, parametres.toArray());
        Long anomalies = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM controle_dga_champ ch JOIN controle_dga c ON "
                        + "c.id = ch.controle_id JOIN adherent a ON a.id = c.adherent_id WHERE ch.statut_correspondance IN "
                        + "('NON_CORRESPOND','NON_LISIBLE','DOCUMENT_MANQUANT')"
                        + periode.toString().replace("premiere_soumission_dga_le", "a.premiere_soumission_dga_le"),
                Long.class, parametres.toArray());
        return new SyntheseControleDgaDto(du, au, distincts == null ? 0 : distincts,
                resoumissions == null ? 0 : resoumissions, parStatut, anomalies == null ? 0 : anomalies);
    }

    // ------------------------------------------------------------------------------------------ Interne

    private void demarrerInterne(ControleDga controle, Adherent adherent, Utilisateur dga) {
        controle.demarrer(dga.getId());
        controleRepository.saveAndFlush(controle);
        adherent.setStatutControleDga(StatutControleDga.EN_VERIFICATION);
        adherentRepository.saveAndFlush(adherent);
        serviceAudit.tracer(TypeOperation.CONTROLE_DGA_DEMARRAGE, "controle_dga", controle.getId(), null,
                ContexteAudit.avec(dga, Map.of("adherentId", adherent.getId(), "tour", controle.getTour())), null);
    }

    /**
     * §12 « Document vérifié ? » : à la validation, chaque pièce contrôlée et fournie est marquée vérifiée par la DGA
     * (auteur, date, commentaire) — la décision humaine est conservée sur le document lui-même.
     */
    private void marquerDocumentsVerifies(ControleDga controle, Utilisateur dga, String commentaire) {
        for (ControleDgaDocument ligne : documentControleRepository.findByControleIdOrderByTypeDocument(controle.getId())) {
            if (ligne.getDocumentId() == null) {
                continue;
            }
            documentRepository.findById(ligne.getDocumentId()).filter(Document::estVersionActive).ifPresent(document -> {
                StatutDocument avant = document.getStatut();
                document.marquerVerifie(dga.getId(), commentaire == null
                        ? "Conforme au contrôle documentaire " + controle.getReference() : commentaire);
                documentRepository.save(document);
                serviceAudit.tracer(TypeOperation.DOCUMENT_VERIFICATION_DGA, "document", document.getId(), avant,
                        ContexteAudit.avec(dga, Map.of("controle", controle.getReference(), "statut", StatutDocument.VERIFIE)),
                        null);
            });
        }
    }

    /** Répercute la décision sur l'adhérent : état du contrôle et, pour un dossier non encore officiel, sa validation. */
    private void appliquerAuDossier(Adherent adherent, StatutControle decision) {
        boolean dossierOfficielAnterieur = adherent.getStatutValidation() == StatutValidationEntite.VALIDE;
        switch (decision) {
            case VALIDE -> {
                adherent.setStatutControleDga(StatutControleDga.VALIDE);
                // Le contrôle documentaire DGA est la validation officielle d'un nouveau dossier : ses données ne se
                // modifient plus ensuite que par demande de modification (workflow V19).
                adherent.setStatutValidation(StatutValidationEntite.VALIDE);
            }
            case CORRECTION_DEMANDEE -> {
                adherent.setStatutControleDga(StatutControleDga.CORRECTION_DEMANDEE);
                if (!dossierOfficielAnterieur) {
                    adherent.setStatutValidation(StatutValidationEntite.CORRECTION_DEMANDEE);
                }
            }
            default -> {
                // Rejet : le compte reste dans son statut métier — le traitement d'un adhérent rejeté après paiement
                // n'est pas fixé par la COSITI (§25 point 3) et n'est donc pas inventé ici.
                adherent.setStatutControleDga(StatutControleDga.REJETE);
                if (!dossierOfficielAnterieur) {
                    adherent.setStatutValidation(StatutValidationEntite.REJETE);
                }
            }
        }
        adherentRepository.saveAndFlush(adherent);
    }

    private void notifierDecision(Adherent adherent, ControleDga controle, DecisionControleDga decision,
                                  String commentaire) {
        String libelle = "Adhérent " + adherent.getMatricule();
        AdhesionEvent evenement = switch (decision) {
            case VALIDER -> new AdhesionEvent("CONTROLE_DGA_VALIDE", adherent.getId(), "controle_dga", controle.getId(),
                    adherent.getActivePar(), List.of(), "Contrôle documentaire terminé",
                    libelle + " — résultat : VALIDÉ.");
            case DEMANDER_CORRECTION -> new AdhesionEvent("CONTROLE_DGA_CORRECTION", adherent.getId(), "controle_dga",
                    controle.getId(), adherent.getActivePar(), List.of("GESTIONNAIRE_COMPTE"),
                    "Correction documentaire demandée", libelle + " — motif : " + commentaire);
            case REJETER -> new AdhesionEvent("CONTROLE_DGA_REJETE", adherent.getId(), "controle_dga", controle.getId(),
                    adherent.getActivePar(), List.of("GESTIONNAIRE_COMPTE"), "Contrôle documentaire rejeté",
                    libelle + " — motif : " + commentaire);
        };
        evenements.publishEvent(evenement);
    }

    private void recalculerDocument(UUID controleDocumentId) {
        ControleDgaDocument document = documentControleRepository.findById(controleDocumentId).orElseThrow();
        List<ControleDgaChamp> champs = champRepository.findByControleDocumentId(controleDocumentId);
        String statut;
        if (champs.stream().anyMatch(c -> c.getStatutCorrespondance() != null && c.getStatutCorrespondance().estAnomalie())) {
            statut = ControleDgaDocument.ANOMALIE;
        } else if (champs.stream().allMatch(c -> c.getStatutCorrespondance() != null)) {
            statut = ControleDgaDocument.CONFORME;
        } else {
            statut = ControleDgaDocument.A_VERIFIER;
        }
        document.setStatut(statut);
        documentControleRepository.save(document);
    }

    /**
     * Séparation des tâches : la DGA ne contrôle jamais un dossier qu'elle a elle-même activé ou transmis (cas d'un
     * compte cumulant des rôles).
     */
    private static void exigerControleurIndependant(ControleDga controle, Adherent adherent, Utilisateur dga) {
        if (dga.getId().equals(adherent.getActivePar()) || dga.getId().equals(controle.getSoumisPar())) {
            throw new ExceptionMetier("CONTROLE_DGA_AUTO_CONTROLE_INTERDIT",
                    "Vous ne pouvez pas contrôler un dossier que vous avez activé ou transmis.", HttpStatus.FORBIDDEN);
        }
    }

    private static void exigerModifiable(ControleDga controle) {
        if (!controle.getStatut().estOuvert()) {
            throw new ExceptionConflit("CONTROLE_DGA_DEJA_TERMINE",
                    "Ce contrôle est terminé (" + controle.getStatut() + ") : ses vérifications ne se modifient plus.");
        }
    }

    static String valeurNumerique(Adherent a, String champ) {
        Object valeur = switch (champ) {
            case "nom" -> a.getNom();
            case "prenoms" -> a.getPrenoms();
            case "dateNaissance" -> a.getDateNaissance();
            case "sexe" -> a.getSexe();
            case "numeroCni" -> a.getNumeroCni();
            case "numeroCnps" -> a.getNumeroCnps();
            case "telephonePrincipal" -> a.getTelephonePrincipal();
            case "localisation" -> a.getLocalisation();
            case "telephoneSecondaire" -> a.getTelephoneSecondaire();
            case "quartier" -> a.getQuartier();
            case "ville" -> a.getVille();
            case CHAMP_PRESENCE -> ServiceFraisAdhesionImpl.nomComplet(a);
            default -> null;
        };
        return valeur == null ? null : valeur.toString();
    }

    private static Map<String, Object> etatChamp(ControleDgaChamp c) {
        Map<String, Object> etat = new LinkedHashMap<>();
        etat.put("champId", c.getId());
        etat.put("champ", c.getChamp());
        etat.put("valeurNumerique", c.getValeurNumerique());
        etat.put("valeurPhysique", c.getValeurPhysique());
        etat.put("statutCorrespondance", c.getStatutCorrespondance());
        etat.put("commentaire", c.getCommentaire());
        return etat;
    }

    private ControleDgaDto.Compteurs compteurs(UUID controleId, List<ControleDgaChamp> champs) {
        List<ControleDgaDocument> documents = documentControleRepository.findByControleIdOrderByTypeDocument(controleId);
        return new ControleDgaDto.Compteurs(documents.size(),
                (int) documents.stream().filter(d -> ControleDgaDocument.CONFORME.equals(d.getStatut())).count(),
                (int) documents.stream().filter(d -> ControleDgaDocument.ANOMALIE.equals(d.getStatut())).count(),
                champs.size(),
                (int) champs.stream().filter(c -> c.getStatutCorrespondance() != null).count(),
                (int) champs.stream().filter(c -> c.getStatutCorrespondance() == StatutCorrespondance.CORRESPOND).count(),
                (int) champs.stream().filter(c -> c.getStatutCorrespondance() != null
                        && c.getStatutCorrespondance().estAnomalie()).count(),
                (int) champs.stream().filter(c -> c.getStatutCorrespondance() == StatutCorrespondance.NON_VERIFIABLE).count());
    }

    private ControleDgaDto dto(ControleDga c, Adherent adherentConnu) {
        Adherent adherent = adherentConnu != null ? adherentConnu : adherentRepository.findById(c.getAdherentId()).orElse(null);
        List<ControleDgaChamp> champs = champRepository.findByControleId(c.getId());
        List<ControleDgaDto.Document> documents = documentControleRepository.findByControleIdOrderByTypeDocument(c.getId())
                .stream().map(d -> new ControleDgaDto.Document(d.getId(), d.getDocumentId(), d.getTypeDocument(),
                        d.isObligatoire(), d.getStatut(), champs.stream()
                        .filter(ch -> ch.getControleDocumentId().equals(d.getId()))
                        .map(ch -> new ControleDgaDto.Champ(ch.getId(), ch.getChamp(), ch.getLibelle(),
                                ch.getValeurNumerique(), ch.getValeurPhysique(), ch.getStatutCorrespondance(),
                                ch.getCommentaire(), ch.getVerifiePar(), ch.getVerifieLe(), ch.getVersion()))
                        .toList()))
                .toList();
        List<String> blocages = new ArrayList<>();
        if (!c.getStatut().estOuvert()) {
            blocages.add("Contrôle terminé (" + c.getStatut() + ").");
        }
        long nonVerifies = champs.stream().filter(ch -> ch.getStatutCorrespondance() == null).count();
        if (nonVerifies > 0) {
            blocages.add(nonVerifies + " information(s) restent à vérifier.");
        }
        long anomalies = champs.stream().filter(ch -> ch.getStatutCorrespondance() != null
                && ch.getStatutCorrespondance().estAnomalie()).count();
        if (anomalies > 0) {
            blocages.add(anomalies + " anomalie(s) documentaire(s) à traiter (correction ou rejet).");
        }
        return new ControleDgaDto(c.getId(), c.getReference(), c.getAdherentId(),
                adherent == null ? null : adherent.getMatricule(),
                adherent == null ? null : ServiceFraisAdhesionImpl.nomComplet(adherent), c.getTour(),
                c.getControlePrecedentId(), c.getStatut(), c.getSoumisPar(), c.getSoumisLe(), c.getDemarrePar(),
                c.getDemarreLe(), c.getTerminePar(), c.getTermineLe(), c.getCommentaireDecision(),
                compteurs(c.getId(), champs), documents, blocages.isEmpty(), blocages, c.getVersion());
    }

    private ControleDga verrouiller(UUID id) {
        return controleRepository.verrouiller(id).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("CONTROLE_DGA_INTROUVABLE", "Contrôle documentaire introuvable."));
    }

    private ControleDga charger(UUID id) {
        return controleRepository.findById(id).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("CONTROLE_DGA_INTROUVABLE", "Contrôle documentaire introuvable."));
    }

    private Adherent chargerAdherent(UUID id) {
        return adherentRepository.findById(id).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
    }

    private static java.time.Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }

    private static String texte(String valeur) {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
    }
}
