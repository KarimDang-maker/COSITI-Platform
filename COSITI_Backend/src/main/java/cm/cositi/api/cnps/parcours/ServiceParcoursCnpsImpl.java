package cm.cositi.api.cnps.parcours;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.cnps.archivage.ServiceChecklistArchivage;
import cm.cositi.api.cnps.entite.DossierCnps;
import cm.cositi.api.cnps.entite.HistoriqueDossierCnps;
import cm.cositi.api.cnps.entite.StatutDossierCnps;
import cm.cositi.api.cnps.repository.DossierCnpsRepository;
import cm.cositi.api.cnps.repository.HistoriqueDossierCnpsRepository;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.notification.ServiceNotification;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Parcours CNPS d'un adhérent : préimmatriculation (vagues mensuelles) puis immatriculation définitive.
 *
 * <p>Le cumul de cotisations n'est jamais stocké : il est relu à chaque appel depuis {@code periode_droits},
 * donc un adhérent apparaît « à préimmatriculer » dès que le DAF a validé la cotisation qui lui fait franchir
 * le quota. Les quotas, le jour de coupure et le délai de dépôt viennent de la table {@code parametre}.</p>
 */
@Service
public class ServiceParcoursCnpsImpl implements ServiceParcoursCnps {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceParcoursCnpsImpl.class);

    static final String CLE_QUOTA_PREIMMAT = "PREIMMAT_QUOTA";
    static final String CLE_QUOTA_IMMAT = "IMMAT_QUOTA";
    static final String CLE_JOUR_COUPURE = "PREIMMAT_JOUR_COUPURE";
    static final String CLE_DELAI_DEPOT = "PREIMMAT_DELAI_DEPOT_JOURS";
    static final String CLE_ALERTES = "PREIMMAT_ALERTES_JOURS";

    private static final String SELECT_SITUATIONS = """
            SELECT a.id, a.matricule, a.nom, a.prenoms, a.zone_id, a.numero_cnps,
                   COALESCE((SELECT SUM(pd.montant_impute) FROM periode_droits pd
                              WHERE pd.adherent_id = a.id AND pd.statut <> 'ANNULEE'), 0) AS cumul,
                   pc.statut_parcours, pc.vague_mois, pc.nb_reports, pc.date_preimmatriculation,
                   pc.numero_temporaire, pc.date_limite_depot, pc.date_depot_cps, pc.depot_hors_delai, pc.cps,
                   pc.date_immatriculation,
                   d.id AS dossier_id, d.numero_immatriculation AS dossier_numero,
                   d.date_immatriculation AS dossier_date_immat
            FROM adherent a
            LEFT JOIN parcours_cnps pc ON pc.adherent_id = a.id
            LEFT JOIN dossier_cnps d ON d.adherent_id = a.id
            WHERE a.archive = false AND a.statut <> 'RADIE'
            """;

    private final JdbcTemplate jdbcTemplate;
    private final ServiceParametre serviceParametre;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;
    private final ServiceNotification serviceNotification;
    private final DossierCnpsRepository dossierRepository;
    private final HistoriqueDossierCnpsRepository historiqueRepository;
    private final ServiceChecklistArchivage checklistArchivage;

    public ServiceParcoursCnpsImpl(JdbcTemplate jdbcTemplate, ServiceParametre serviceParametre,
                                   ServicePerimetreDonnees perimetre, ServiceAudit serviceAudit,
                                   ServiceNotification serviceNotification, DossierCnpsRepository dossierRepository,
                                   HistoriqueDossierCnpsRepository historiqueRepository,
                                   ServiceChecklistArchivage checklistArchivage) {
        this.jdbcTemplate = jdbcTemplate;
        this.serviceParametre = serviceParametre;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.serviceNotification = serviceNotification;
        this.dossierRepository = dossierRepository;
        this.historiqueRepository = historiqueRepository;
        this.checklistArchivage = checklistArchivage;
    }

    // ------------------------------------------------------------------ Lecture

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<SituationParcoursDto> lister(FiltreParcours filtre, UUID zoneId, Utilisateur demandeur) {
        FiltreParcours effectif = filtre == null ? FiltreParcours.TOUS : filtre;
        return charger(null, zoneId, demandeur).stream()
                .filter(s -> correspond(s, effectif))
                .toList();
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public ResumeParcoursDto resume(UUID zoneId, Utilisateur demandeur) {
        List<SituationParcoursDto> toutes = charger(null, zoneId, demandeur);
        ParametresParcours p = lireParametres();
        return new ResumeParcoursDto(
                compter(toutes, FiltreParcours.A_PREIMMATRICULER),
                compter(toutes, FiltreParcours.EN_RETARD),
                compter(toutes, FiltreParcours.REPORTES),
                toutes.stream().filter(s -> s.etape() == EtapeParcours.PREIMMATRICULE && !s.horsDelaiDepot()).count(),
                compter(toutes, FiltreParcours.DEPOT_HORS_DELAI),
                toutes.stream().filter(s -> s.etape() == EtapeParcours.DOSSIER_DEPOSE).count(),
                compter(toutes, FiltreParcours.IMMAT_ELIGIBLES),
                compter(toutes, FiltreParcours.IMMAT_NON_ELIGIBLES),
                compter(toutes, FiltreParcours.IMMATRICULES),
                compter(toutes, FiltreParcours.PIECES_MANQUANTES),
                p.quotaPreimmat(), p.quotaImmat(), p.jourCoupure(), p.delaiDepotJours(),
                MoteurParcoursCnps.fenetre(LocalDate.now(), p.jourCoupure()));
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public SituationParcoursDto consulter(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        return chargerUn(adherentId);
    }

    // ----------------------------------------------------------------- Écriture

    @Override
    @PreAuthorize("hasAuthority('CNPS:GERER')")
    @Transactional
    public SituationParcoursDto preimmatriculer(UUID adherentId, PreimmatriculationDto dto, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, adherentId);
        SituationParcoursDto avant = chargerUn(adherentId);
        if (avant.etape() != EtapeParcours.ELIGIBLE_PREIMMAT) {
            throw new ExceptionConflit("CNPS_PREIMMAT_NON_ELIGIBLE",
                    "Cet adhérent ne peut pas être préimmatriculé : étape actuelle " + avant.etape()
                            + (avant.etape() == EtapeParcours.NON_ELIGIBLE
                            ? " (il manque " + avant.resteAvantPreimmat() + " FCFA de cotisations validées)." : "."));
        }
        LocalDate date = dto.datePreimmatriculation() == null ? LocalDate.now() : dto.datePreimmatriculation();
        if (date.isAfter(LocalDate.now())) {
            throw new ExceptionValidation("CNPS_DATE_FUTURE",
                    "La date de préimmatriculation ne peut pas être dans le futur.", "datePreimmatriculation");
        }
        LocalDate limite = date.plusDays(lireParametres().delaiDepotJours());

        jdbcTemplate.update("""
                INSERT INTO parcours_cnps (adherent_id, statut_parcours, date_preimmatriculation, numero_temporaire,
                                           recepisse_document_id, date_limite_depot, cree_par, modifie_par)
                VALUES (?, 'PREIMMATRICULE', ?, ?, ?, ?, ?, ?)
                ON CONFLICT (adherent_id) DO UPDATE SET
                    statut_parcours = 'PREIMMATRICULE', date_preimmatriculation = EXCLUDED.date_preimmatriculation,
                    numero_temporaire = EXCLUDED.numero_temporaire,
                    recepisse_document_id = EXCLUDED.recepisse_document_id,
                    date_limite_depot = EXCLUDED.date_limite_depot,
                    modifie_le = now(), modifie_par = EXCLUDED.modifie_par, version = parcours_cnps.version + 1
                """, adherentId, Date.valueOf(date), dto.numeroTemporaire().trim(), dto.recepisseDocumentId(),
                Date.valueOf(limite), auteur.getIdentifiant(), auteur.getIdentifiant());

        serviceAudit.tracer(TypeOperation.CNPS_PREIMMATRICULATION, "parcours_cnps", adherentId, avant.etape(),
                EtapeParcours.PREIMMATRICULE, "N° temporaire " + dto.numeroTemporaire().trim()
                        + ", dépôt du dossier avant le " + limite);
        return chargerUn(adherentId);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:GERER')")
    @Transactional
    public SituationParcoursDto deposerDossier(UUID adherentId, DepotDossierDto dto, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, adherentId);
        SituationParcoursDto avant = chargerUn(adherentId);
        if (avant.etape() != EtapeParcours.PREIMMATRICULE) {
            throw new ExceptionConflit("CNPS_DEPOT_ETAPE_INVALIDE",
                    "Le dépôt du dossier ne s'enregistre que pour un adhérent préimmatriculé (étape actuelle : "
                            + avant.etape() + ").");
        }
        LocalDate date = dto.dateDepot() == null ? LocalDate.now() : dto.dateDepot();
        if (date.isAfter(LocalDate.now())) {
            throw new ExceptionValidation("CNPS_DATE_FUTURE", "La date de dépôt ne peut pas être dans le futur.",
                    "dateDepot");
        }
        if (avant.datePreimmatriculation() != null && date.isBefore(avant.datePreimmatriculation())) {
            throw new ExceptionValidation("CNPS_DEPOT_AVANT_PREIMMAT",
                    "Le dépôt ne peut pas précéder la préimmatriculation.", "dateDepot");
        }
        boolean horsDelai = avant.dateLimiteDepot() != null && date.isAfter(avant.dateLimiteDepot());

        jdbcTemplate.update("""
                UPDATE parcours_cnps SET statut_parcours = 'DOSSIER_DEPOSE', date_depot_cps = ?, cps = ?,
                       depot_hors_delai = ?, modifie_le = now(), modifie_par = ?, version = version + 1
                WHERE adherent_id = ?
                """, Date.valueOf(date), dto.cps().trim(), horsDelai, auteur.getIdentifiant(), adherentId);

        serviceAudit.tracer(TypeOperation.CNPS_DEPOT_DOSSIER, "parcours_cnps", adherentId, avant.etape(),
                EtapeParcours.DOSSIER_DEPOSE, "Dépôt au " + dto.cps().trim() + " le " + date
                        + (horsDelai ? " — HORS DÉLAI (limite " + avant.dateLimiteDepot() + ")" : ""));
        return chargerUn(adherentId);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:GERER')")
    @Transactional
    public SituationParcoursDto immatriculer(UUID adherentId, ImmatriculationDto dto, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, adherentId);
        SituationParcoursDto avant = chargerUn(adherentId);
        if (avant.etape() != EtapeParcours.DOSSIER_DEPOSE) {
            throw new ExceptionConflit("CNPS_IMMAT_ETAPE_INVALIDE",
                    "L'immatriculation définitive suppose un dossier déposé au CPS (étape actuelle : "
                            + avant.etape() + ").");
        }
        if (!avant.eligibleImmat()) {
            throw new ExceptionConflit("CNPS_IMMAT_QUOTA_NON_ATTEINT",
                    "Le quota d'immatriculation n'est pas atteint : il manque " + avant.resteAvantImmat()
                            + " FCFA de cotisations validées.");
        }
        DossierCnps dossier = dossierRepository.findByAdherentId(adherentId)
                .orElseThrow(() -> new ExceptionConflit("CNPS_DOSSIER_REQUIS",
                        "Ouvrez d'abord le dossier CNPS de l'adhérent : l'immatriculation lui est rattachée."));
        List<String> piecesManquantes = checklistArchivage.piecesBloquantesManquantes(dossier.getId());
        if (!piecesManquantes.isEmpty()) {
            throw new ExceptionConflit("CNPS_ARCHIVAGE_INCOMPLET",
                    "La checklist d'archivage est incomplète : pièces à vérifier ou archiver avant "
                            + "l'immatriculation : " + String.join(", ", piecesManquantes) + ".");
        }
        String numero = dto.numeroImmatriculation().trim();
        Integer deja = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM dossier_cnps WHERE numero_immatriculation = ? AND adherent_id <> ?",
                Integer.class, numero, adherentId);
        if (deja != null && deja > 0) {
            throw new ExceptionConflit("CNPS_NUMERO_EXISTANT",
                    "Ce numéro d'immatriculation est déjà attribué à un autre adhérent.");
        }
        LocalDate date = dto.dateImmatriculation() == null ? LocalDate.now() : dto.dateImmatriculation();
        if (date.isAfter(LocalDate.now())) {
            throw new ExceptionValidation("CNPS_DATE_FUTURE",
                    "La date d'immatriculation ne peut pas être dans le futur.", "dateImmatriculation");
        }

        dossier.setNumeroImmatriculation(numero);
        dossier.setDateImmatriculation(date);
        StatutDossierCnps statutAvant = dossier.getStatut();
        if (statutAvant == StatutDossierCnps.TRANSMIS) {
            dossier.setStatut(StatutDossierCnps.TRAITE);
        }
        dossierRepository.save(dossier);
        if (statutAvant == StatutDossierCnps.TRANSMIS) {
            historiqueRepository.save(new HistoriqueDossierCnps(dossier.getId(), statutAvant,
                    StatutDossierCnps.TRAITE, auteur.getId(), "Immatriculation définitive " + numero));
        }
        jdbcTemplate.update("UPDATE adherent SET numero_cnps = ? WHERE id = ?", numero, adherentId);
        jdbcTemplate.update("""
                UPDATE parcours_cnps SET statut_parcours = 'IMMATRICULE', date_immatriculation = ?,
                       modifie_le = now(), modifie_par = ?, version = version + 1
                WHERE adherent_id = ?
                """, Date.valueOf(date), auteur.getIdentifiant(), adherentId);

        serviceAudit.tracer(TypeOperation.CNPS_IMMATRICULATION, "parcours_cnps", adherentId, avant.etape(),
                EtapeParcours.IMMATRICULE, "N° " + numero + " le " + date);
        return chargerUn(adherentId);
    }

    // --------------------------------------------------------------- Paramètres

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public ParametresParcoursDto parametres(Utilisateur demandeur) {
        ParametresParcours p = lireParametres();
        return new ParametresParcoursDto(p.quotaPreimmat(), p.quotaImmat(), p.jourCoupure(), p.delaiDepotJours(),
                null);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:PARAMETRER')")
    @Transactional
    public ParametresParcoursDto modifierParametres(ParametresParcoursDto dto, Utilisateur auteur) {
        if (dto.quotaPreimmat().signum() <= 0) {
            throw new ExceptionValidation("CNPS_QUOTA_INVALIDE", "Le quota de préimmatriculation doit être positif.",
                    "quotaPreimmat");
        }
        if (dto.quotaImmat().compareTo(dto.quotaPreimmat()) < 0) {
            throw new ExceptionValidation("CNPS_QUOTA_INVALIDE",
                    "Le quota d'immatriculation ne peut pas être inférieur à celui de la préimmatriculation.",
                    "quotaImmat");
        }
        if (dto.jourCoupure() < 1 || dto.jourCoupure() > 28) {
            throw new ExceptionValidation("CNPS_JOUR_COUPURE_INVALIDE",
                    "Le jour de coupure doit être compris entre 1 et 28.", "jourCoupure");
        }
        if (dto.delaiDepotJours() < 1 || dto.delaiDepotJours() > 365) {
            throw new ExceptionValidation("CNPS_DELAI_INVALIDE",
                    "Le délai de dépôt doit être compris entre 1 et 365 jours.", "delaiDepotJours");
        }
        ParametresParcours avant = lireParametres();
        String qui = auteur.getIdentifiant();
        serviceParametre.modifier(CLE_QUOTA_PREIMMAT, dto.quotaPreimmat().toPlainString(), dto.motif(), qui);
        serviceParametre.modifier(CLE_QUOTA_IMMAT, dto.quotaImmat().toPlainString(), dto.motif(), qui);
        serviceParametre.modifier(CLE_JOUR_COUPURE, dto.jourCoupure().toString(), dto.motif(), qui);
        serviceParametre.modifier(CLE_DELAI_DEPOT, dto.delaiDepotJours().toString(), dto.motif(), qui);

        serviceAudit.tracer(TypeOperation.CNPS_PARAMETRES_MODIFIES, "parametre", null, avant,
                Map.of("quotaPreimmat", dto.quotaPreimmat(), "quotaImmat", dto.quotaImmat(),
                        "jourCoupure", dto.jourCoupure(), "delaiDepotJours", dto.delaiDepotJours()), dto.motif());
        return new ParametresParcoursDto(dto.quotaPreimmat(), dto.quotaImmat(), dto.jourCoupure(),
                dto.delaiDepotJours(), null);
    }

    // ------------------------------------------------------------ Tâches système

    @Override
    @Transactional
    public int reporterVague(LocalDate aujourdhui) {
        LocalDate moisCourant = aujourdhui.withDayOfMonth(1);
        // Une ligne par adhérent actif, rattachée à la vague de son mois d'adhésion : un adhérent inscrit en octobre
        // et toujours sous le quota le 1er novembre est donc bien reconduit.
        jdbcTemplate.update("""
                INSERT INTO parcours_cnps (adherent_id, vague_mois, cree_par)
                SELECT a.id, LEAST(date_trunc('month', a.date_adhesion)::date, ?), 'PLANIFICATEUR_CNPS'
                FROM adherent a
                WHERE a.archive = false AND a.statut <> 'RADIE'
                ON CONFLICT (adherent_id) DO NOTHING
                """, Date.valueOf(moisCourant));
        ParametresParcours p = lireParametres();
        // Reconduction : toujours sous le quota alors que sa vague est terminée. Idempotent grâce à vague_mois.
        int reportes = jdbcTemplate.update("""
                UPDATE parcours_cnps pc SET nb_reports = pc.nb_reports + 1, vague_mois = ?,
                       modifie_le = now(), modifie_par = 'PLANIFICATEUR_CNPS', version = pc.version + 1
                WHERE pc.statut_parcours = 'EN_ATTENTE' AND pc.vague_mois < ?
                  AND COALESCE((SELECT SUM(pd.montant_impute) FROM periode_droits pd
                                 WHERE pd.adherent_id = pc.adherent_id AND pd.statut <> 'ANNULEE'), 0) < ?
                """, Date.valueOf(moisCourant), Date.valueOf(moisCourant), p.quotaPreimmat());
        JOURNAL.info("Vague de préimmatriculation {} : {} adhérent(s) reconduit(s).", moisCourant, reportes);
        return reportes;
    }

    @Override
    public int alerterEcheancesDepot(LocalDate aujourdhui) {
        Set<Integer> offsets = Arrays.stream(serviceParametre.texte(CLE_ALERTES).split(","))
                .map(String::trim).filter(s -> !s.isEmpty())
                .map(Integer::parseInt).collect(Collectors.toCollection(java.util.TreeSet::new));
        offsets.add(-1); // premier jour de dépassement
        int emises = 0;
        List<Map<String, Object>> lignes = jdbcTemplate.queryForList("""
                SELECT pc.adherent_id, a.matricule, a.nom, a.prenoms, pc.date_limite_depot
                FROM parcours_cnps pc JOIN adherent a ON a.id = pc.adherent_id
                WHERE pc.statut_parcours = 'PREIMMATRICULE' AND pc.date_limite_depot IS NOT NULL
                """);
        for (Map<String, Object> ligne : lignes) {
            LocalDate limite = ((Date) ligne.get("date_limite_depot")).toLocalDate();
            int jours = (int) java.time.temporal.ChronoUnit.DAYS.between(aujourdhui, limite);
            if (!offsets.contains(jours)) {
                continue;
            }
            UUID adherentId = (UUID) ligne.get("adherent_id");
            String nom = ligne.get("matricule") + " — " + ligne.get("nom");
            String titre = jours < 0 ? "Délai de dépôt dépassé" : "Dépôt du dossier à J-" + jours;
            String corps = jours < 0
                    ? nom + " : le dossier physique devait être déposé au CPS avant le " + limite + "."
                    : nom + " : le dossier physique doit être déposé au CPS avant le " + limite + ".";
            emises += serviceNotification.notifierRoles(List.of("GESTIONNAIRE_COMPTE"), "CNPS_DELAI_DEPOT", titre,
                    corps, "adherent", adherentId);
        }
        return emises;
    }

    // ------------------------------------------------------------------ Interne

    private ParametresParcours lireParametres() {
        return new ParametresParcours(serviceParametre.decimal(CLE_QUOTA_PREIMMAT),
                serviceParametre.decimal(CLE_QUOTA_IMMAT), serviceParametre.entier(CLE_JOUR_COUPURE),
                serviceParametre.entier(CLE_DELAI_DEPOT));
    }

    private SituationParcoursDto chargerUn(UUID adherentId) {
        List<SituationParcoursDto> r = chargerBrut(adherentId, null);
        if (r.isEmpty()) {
            throw new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE",
                    "Adhérent introuvable, archivé ou radié : il n'entre plus dans le parcours CNPS.");
        }
        return r.get(0);
    }

    private List<SituationParcoursDto> charger(UUID adherentId, UUID zoneId, Utilisateur demandeur) {
        return chargerBrut(adherentId, zoneId).stream()
                .filter(s -> perimetre.peutAccederAdherent(demandeur, s.adherentId()))
                .toList();
    }

    private List<SituationParcoursDto> chargerBrut(UUID adherentId, UUID zoneId) {
        ParametresParcours p = lireParametres();
        LocalDate aujourdhui = LocalDate.now();
        Map<UUID, Integer> manquantes = checklistArchivage.manquantesParAdherent();
        int totalBloquantes = checklistArchivage.nombrePiecesBloquantes();
        StringBuilder sql = new StringBuilder(SELECT_SITUATIONS);
        List<Object> args = new ArrayList<>();
        if (adherentId != null) {
            sql.append(" AND a.id = ?");
            args.add(adherentId);
        }
        if (zoneId != null) {
            sql.append(" AND a.zone_id = ?");
            args.add(zoneId);
        }
        sql.append(" ORDER BY a.nom, a.prenoms");

        return jdbcTemplate.query(sql.toString(), (rs, i) -> {
            BigDecimal cumul = rs.getBigDecimal("cumul");
            String persiste = rs.getString("statut_parcours");
            String numero = rs.getString("dossier_numero");
            if (numero == null) {
                numero = rs.getString("numero_cnps");
            }
            LocalDate limite = date(rs.getDate("date_limite_depot"));
            SituationParcours s = MoteurParcoursCnps.evaluer(cumul, persiste, rs.getInt("nb_reports"), limite,
                    numero != null, p, aujourdhui);
            String prenoms = rs.getString("prenoms");
            String nom = rs.getString("nom");
            return new SituationParcoursDto(UUID.fromString(rs.getString("id")), rs.getString("matricule"),
                    prenoms == null || prenoms.isBlank() ? nom : nom + " " + prenoms,
                    rs.getString("zone_id") == null ? null : UUID.fromString(rs.getString("zone_id")), cumul,
                    s.etape(), s.fenetre(), s.enRetard(), s.reporte(), rs.getInt("nb_reports"),
                    date(rs.getDate("vague_mois")), s.horsDelaiDepot(), s.joursRestantsDepot(), s.eligibleImmat(),
                    s.resteAvantPreimmat(), s.resteAvantImmat(), date(rs.getDate("date_preimmatriculation")),
                    rs.getString("numero_temporaire"), limite, date(rs.getDate("date_depot_cps")),
                    rs.getBoolean("depot_hors_delai"), rs.getString("cps"), numero,
                    date(rs.getDate("date_immatriculation")) != null ? date(rs.getDate("date_immatriculation"))
                            : date(rs.getDate("dossier_date_immat")),
                    rs.getString("dossier_id") == null ? null : UUID.fromString(rs.getString("dossier_id")),
                    manquantes.getOrDefault(UUID.fromString(rs.getString("id")), totalBloquantes), totalBloquantes);
        }, args.toArray());
    }

    private static LocalDate date(Date d) {
        return d == null ? null : d.toLocalDate();
    }

    private static long compter(List<SituationParcoursDto> toutes, FiltreParcours filtre) {
        return toutes.stream().filter(s -> correspond(s, filtre)).count();
    }

    static boolean correspond(SituationParcoursDto s, FiltreParcours filtre) {
        return switch (filtre) {
            case TOUS -> true;
            case A_PREIMMATRICULER -> s.etape() == EtapeParcours.ELIGIBLE_PREIMMAT;
            case EN_RETARD -> s.enRetard();
            case REPORTES -> s.reporte() && s.etape() != EtapeParcours.IMMATRICULE
                    && s.etape() != EtapeParcours.PREIMMATRICULE && s.etape() != EtapeParcours.DOSSIER_DEPOSE;
            case DELAI_DEPOT -> s.etape() == EtapeParcours.PREIMMATRICULE;
            case DEPOT_HORS_DELAI -> s.horsDelaiDepot();
            case IMMAT_ELIGIBLES -> s.eligibleImmat();
            case IMMAT_NON_ELIGIBLES -> s.etape() != EtapeParcours.IMMATRICULE && !s.eligibleImmat();
            case IMMATRICULES -> s.etape() == EtapeParcours.IMMATRICULE;
            case PIECES_MANQUANTES -> s.piecesManquantes() > 0 && (s.etape() == EtapeParcours.ELIGIBLE_PREIMMAT
                    || s.etape() == EtapeParcours.PREIMMATRICULE || s.etape() == EtapeParcours.DOSSIER_DEPOSE);
        };
    }
}
