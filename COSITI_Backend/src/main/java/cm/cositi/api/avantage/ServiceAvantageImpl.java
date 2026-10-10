package cm.cositi.api.avantage;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.avantage.AvantageDtos.AvantageAdherentDto;
import cm.cositi.api.avantage.AvantageDtos.AvantageDto;
import cm.cositi.api.avantage.AvantageDtos.BeneficiaireDto;
import cm.cositi.api.avantage.AvantageDtos.CritereDto;
import cm.cositi.api.avantage.AvantageDtos.PieceAvantageDto;
import cm.cositi.api.avantage.AvantageDtos.ResultatRecalculDto;
import cm.cositi.api.avantage.AvantageDtos.SaisieAvantageDto;
import cm.cositi.api.avantage.MoteurAvantages.AyantDroit;
import cm.cositi.api.avantage.MoteurAvantages.Contexte;
import cm.cositi.api.avantage.MoteurAvantages.Critere;
import cm.cositi.api.avantage.MoteurAvantages.ResultatCritere;
import cm.cositi.api.cnps.archivage.ServiceChecklistArchivage;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Avantages des adhérents : un catalogue de droits et de couvertures soumis à des critères paramétrables, évalué
 * pour chaque adhérent. Le résultat est enregistré ({@code adherent_avantage}) et historisé à chaque changement
 * de statut, pour savoir qui bénéficie de quoi, depuis quand, et ce qui manque aux autres.
 */
@Service
public class ServiceAvantageImpl implements ServiceAvantage {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceAvantageImpl.class);
    private static final String SEPARATEUR = " | ";

    private final JdbcTemplate jdbcTemplate;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;
    private final ServiceChecklistArchivage checklistArchivage;

    public ServiceAvantageImpl(JdbcTemplate jdbcTemplate, ServicePerimetreDonnees perimetre,
                               ServiceAudit serviceAudit, ServiceChecklistArchivage checklistArchivage) {
        this.jdbcTemplate = jdbcTemplate;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.checklistArchivage = checklistArchivage;
    }

    private record Existant(StatutAvantage statut, LocalDate dateDebut, LocalDate dateFin, String manquants) {
    }

    private record AvantageCat(UUID id, String code, String libelle, String branche, String description,
                               boolean actif, String statutValidation, List<Critere> criteres,
                               List<PieceAvantageDto> pieces) {
    }

    private record Resultat(AvantageCat avantage, StatutAvantage statut, List<ResultatCritere> criteres,
                            LocalDate debut, LocalDate fin) {
    }

    // ---------------------------------------------------------------- Catalogue

    @Override
    @PreAuthorize("hasAuthority('AVANTAGE:LIRE')")
    public List<AvantageDto> catalogue(boolean inclureInactifs, Utilisateur demandeur) {
        return chargerCatalogue(inclureInactifs, null).stream().map(this::versDto).toList();
    }

    @Override
    @PreAuthorize("hasAuthority('AVANTAGE:LIRE')")
    public AvantageDto consulter(UUID avantageId, Utilisateur demandeur) {
        return versDto(charger(avantageId));
    }

    @Override
    @PreAuthorize("hasAuthority('AVANTAGE:GERER')")
    @Transactional
    public AvantageDto creer(SaisieAvantageDto dto, Utilisateur auteur) {
        validerSaisie(dto);
        Integer existe = jdbcTemplate.queryForObject("SELECT count(*) FROM avantage WHERE code = ?", Integer.class,
                dto.code());
        if (existe != null && existe > 0) {
            throw new ExceptionConflit("AVANTAGE_CODE_EXISTANT", "Un avantage porte déjà le code " + dto.code() + ".");
        }
        UUID id = jdbcTemplate.queryForObject("""
                INSERT INTO avantage (code, libelle, branche, description, actif, ordre, cree_par)
                VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(ordre), 0) + 10 FROM avantage), ?) RETURNING id
                """, UUID.class, dto.code(), dto.libelle().trim(), dto.branche(), dto.description(), dto.actif(),
                auteur.getIdentifiant());
        remplacerCriteresEtPieces(id, dto);
        serviceAudit.tracer(TypeOperation.AVANTAGE_CATALOGUE, "avantage", id, null, dto.code(), "Création");
        recalculerTous(LocalDate.now());
        return versDto(charger(id));
    }

    @Override
    @PreAuthorize("hasAuthority('AVANTAGE:GERER')")
    @Transactional
    public AvantageDto modifier(UUID avantageId, SaisieAvantageDto dto, Utilisateur auteur) {
        AvantageCat avant = charger(avantageId);
        if (!avant.code().equals(dto.code())) {
            throw new ExceptionValidation("AVANTAGE_CODE_IMMUABLE", "Le code d'un avantage ne se modifie pas.", "code");
        }
        validerSaisie(dto);
        jdbcTemplate.update("""
                UPDATE avantage SET libelle = ?, branche = ?, description = ?, actif = ?, modifie_le = now(),
                       modifie_par = ? WHERE id = ?
                """, dto.libelle().trim(), dto.branche(), dto.description(), dto.actif(), auteur.getIdentifiant(),
                avantageId);
        remplacerCriteresEtPieces(avantageId, dto);
        serviceAudit.tracer(TypeOperation.AVANTAGE_CATALOGUE, "avantage", avantageId, avant.libelle(),
                dto.libelle(), "Modification");
        recalculerTous(LocalDate.now());
        return versDto(charger(avantageId));
    }

    // -------------------------------------------------------------- Évaluation

    @Override
    @PreAuthorize("hasAuthority('AVANTAGE:LIRE')")
    @Transactional
    public List<AvantageAdherentDto> avantagesDeLAdherent(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        List<Contexte> contextes = chargerContextes(adherentId, LocalDate.now());
        if (contextes.isEmpty()) {
            throw new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE",
                    "Adhérent introuvable, archivé ou radié : aucun avantage ne lui est évalué.");
        }
        Map<UUID, List<Resultat>> resultats = new HashMap<>();
        evaluerEtEnregistrer(contextes, chargerCatalogue(false, null), LocalDate.now(), resultats);
        return resultats.getOrDefault(adherentId, List.of()).stream().map(r -> new AvantageAdherentDto(
                r.avantage().id(), r.avantage().code(), r.avantage().libelle(), r.avantage().branche(), r.statut(),
                r.avantage().statutValidation(),
                r.criteres().stream().filter(ResultatCritere::satisfait).map(ResultatCritere::libelle).toList(),
                r.criteres().stream().filter(c -> !c.satisfait()).map(ResultatCritere::libelle).toList(),
                r.debut(), r.fin(), r.avantage().pieces())).toList();
    }

    @Override
    @PreAuthorize("hasAuthority('AVANTAGE:LIRE')")
    public List<BeneficiaireDto> beneficiaires(UUID avantageId, StatutAvantage statut, UUID zoneId,
                                               Utilisateur demandeur) {
        charger(avantageId);
        StatutAvantage filtre = statut == null ? StatutAvantage.ACQUIS : statut;
        StringBuilder sql = new StringBuilder("""
                SELECT a.id, a.matricule, a.nom, a.prenoms, a.zone_id, aa.statut, aa.criteres_manquants,
                       aa.date_debut
                FROM adherent_avantage aa JOIN adherent a ON a.id = aa.adherent_id
                WHERE aa.avantage_id = ? AND aa.statut = ? AND a.archive = false AND a.statut <> 'RADIE'
                """);
        List<Object> args = new ArrayList<>(List.of(avantageId, filtre.name()));
        if (zoneId != null) {
            sql.append(" AND a.zone_id = ?");
            args.add(zoneId);
        }
        sql.append(" ORDER BY a.nom, a.prenoms");
        return jdbcTemplate.query(sql.toString(), (rs, i) -> {
            String prenoms = rs.getString("prenoms");
            String nom = rs.getString("nom");
            String manquants = rs.getString("criteres_manquants");
            return new BeneficiaireDto(UUID.fromString(rs.getString("id")), rs.getString("matricule"),
                    prenoms == null || prenoms.isBlank() ? nom : nom + " " + prenoms,
                    rs.getString("zone_id") == null ? null : UUID.fromString(rs.getString("zone_id")),
                    StatutAvantage.valueOf(rs.getString("statut")),
                    manquants == null || manquants.isBlank() ? List.of()
                            : Arrays.asList(manquants.split(java.util.regex.Pattern.quote(SEPARATEUR))),
                    date(rs.getDate("date_debut")));
        }, args.toArray()).stream()
                .filter(b -> perimetre.peutAccederAdherent(demandeur, b.adherentId()))
                .toList();
    }

    @Override
    @PreAuthorize("hasAuthority('AVANTAGE:RECALCULER')")
    @Transactional
    public ResultatRecalculDto recalculer(Utilisateur demandeur) {
        return recalculerTous(LocalDate.now());
    }

    @Override
    @Transactional
    public ResultatRecalculDto recalculerTous(LocalDate aujourdhui) {
        List<Contexte> contextes = chargerContextes(null, aujourdhui);
        List<AvantageCat> catalogue = chargerCatalogue(false, null);
        int changements = evaluerEtEnregistrer(contextes, catalogue, aujourdhui, new HashMap<>());
        JOURNAL.info("Évaluation des avantages : {} adhérent(s), {} avantage(s), {} changement(s).",
                contextes.size(), catalogue.size(), changements);
        return new ResultatRecalculDto(contextes.size(), catalogue.size(), changements);
    }

    // ------------------------------------------------------------------ Interne

    private int evaluerEtEnregistrer(List<Contexte> contextes, List<AvantageCat> catalogue, LocalDate aujourdhui,
                                     Map<UUID, List<Resultat>> sortie) {
        Map<String, Existant> existants = chargerExistants(contextes.size() == 1 ? contextes.get(0).adherentId() : null);
        int changements = 0;
        for (Contexte ctx : contextes) {
            List<Resultat> liste = new ArrayList<>();
            for (AvantageCat av : catalogue) {
                List<ResultatCritere> criteres = av.criteres().stream()
                        .map(c -> MoteurAvantages.evaluer(c, ctx, aujourdhui)).toList();
                long satisfaits = criteres.stream().filter(ResultatCritere::satisfait).count();
                Existant prev = existants.get(ctx.adherentId() + "/" + av.id());
                StatutAvantage statut = MoteurAvantages.statut(prev == null ? null : prev.statut(), satisfaits,
                        criteres.size());
                String manquants = String.join(SEPARATEUR, criteres.stream().filter(c -> !c.satisfait())
                        .map(ResultatCritere::libelle).toList());

                LocalDate debut = prev == null ? null : prev.dateDebut();
                LocalDate fin = prev == null ? null : prev.dateFin();
                if (statut == StatutAvantage.ACQUIS && (prev == null || prev.statut() != StatutAvantage.ACQUIS)) {
                    debut = aujourdhui;
                    fin = null;
                } else if (statut == StatutAvantage.SUSPENDU && prev != null
                        && prev.statut() == StatutAvantage.ACQUIS) {
                    fin = aujourdhui;
                }

                boolean statutChange = prev == null || prev.statut() != statut;
                boolean manquantsChangent = prev == null || !manquants.equals(prev.manquants() == null ? "" : prev.manquants());
                if (statutChange || manquantsChangent) {
                    jdbcTemplate.update("""
                            INSERT INTO adherent_avantage (adherent_id, avantage_id, statut, criteres_manquants,
                                                           date_debut, date_fin, evalue_le)
                            VALUES (?, ?, ?, ?, ?, ?, now())
                            ON CONFLICT (adherent_id, avantage_id) DO UPDATE SET statut = EXCLUDED.statut,
                                criteres_manquants = EXCLUDED.criteres_manquants, date_debut = EXCLUDED.date_debut,
                                date_fin = EXCLUDED.date_fin, evalue_le = now()
                            """, ctx.adherentId(), av.id(), statut.name(), manquants.isEmpty() ? null : manquants,
                            debut == null ? null : Date.valueOf(debut), fin == null ? null : Date.valueOf(fin));
                }
                if (statutChange) {
                    jdbcTemplate.update("""
                            INSERT INTO historique_adherent_avantage (adherent_id, avantage_id, statut_avant,
                                                                      statut_apres, motif)
                            VALUES (?, ?, ?, ?, ?)
                            """, ctx.adherentId(), av.id(), prev == null ? null : prev.statut().name(), statut.name(),
                            manquants.isEmpty() ? "Tous les critères sont remplis" : "Manque : " + manquants);
                    changements++;
                }
                liste.add(new Resultat(av, statut, criteres, debut, fin));
            }
            sortie.put(ctx.adherentId(), liste);
        }
        return changements;
    }

    private List<Contexte> chargerContextes(UUID adherentId, LocalDate aujourdhui) {
        Map<UUID, List<AyantDroit>> ayantsDroit = new HashMap<>();
        jdbcTemplate.query("SELECT adherent_id, type_lien, date_naissance FROM ayant_droit"
                + (adherentId == null ? "" : " WHERE adherent_id = ?"), rs -> {
            ayantsDroit.computeIfAbsent(UUID.fromString(rs.getString("adherent_id")), k -> new ArrayList<>())
                    .add(new AyantDroit(rs.getString("type_lien"), date(rs.getDate("date_naissance"))));
        }, adherentId == null ? new Object[0] : new Object[]{adherentId});
        Map<UUID, Integer> manquantesArchivage = checklistArchivage.manquantesParAdherent();

        String sql = """
                SELECT a.id, a.statut, a.date_adhesion, a.date_naissance, a.numero_cnps,
                       (SELECT p.code FROM adhesion adh JOIN pack p ON p.id = adh.pack_id
                         WHERE adh.adherent_id = a.id AND adh.date_fin IS NULL LIMIT 1) AS pack_code,
                       COALESCE((SELECT SUM(pd.montant_impute) FROM periode_droits pd
                                  WHERE pd.adherent_id = a.id AND pd.statut <> 'ANNULEE'), 0) AS cumul,
                       EXISTS (SELECT 1 FROM periode_droits pd WHERE pd.adherent_id = a.id AND pd.statut <> 'ANNULEE'
                                AND ? BETWEEN pd.date_debut AND pd.date_fin) AS couvert,
                       pc.statut_parcours, d.numero_immatriculation
                FROM adherent a
                LEFT JOIN parcours_cnps pc ON pc.adherent_id = a.id
                LEFT JOIN dossier_cnps d ON d.adherent_id = a.id
                WHERE a.archive = false AND a.statut <> 'RADIE'
                """ + (adherentId == null ? "" : " AND a.id = ?");
        Object[] args = adherentId == null ? new Object[]{Date.valueOf(aujourdhui)}
                : new Object[]{Date.valueOf(aujourdhui), adherentId};
        return jdbcTemplate.query(sql, (rs, i) -> {
            UUID id = UUID.fromString(rs.getString("id"));
            String parcours = rs.getString("statut_parcours");
            boolean immatricule = rs.getString("numero_cnps") != null
                    || rs.getString("numero_immatriculation") != null || "IMMATRICULE".equals(parcours);
            boolean preimmatricule = "PREIMMATRICULE".equals(parcours) || "DOSSIER_DEPOSE".equals(parcours);
            Integer manquantes = manquantesArchivage.get(id);
            return new Contexte(id, rs.getString("statut"), date(rs.getDate("date_adhesion")),
                    date(rs.getDate("date_naissance")), rs.getString("pack_code"), rs.getBigDecimal("cumul"),
                    immatricule, preimmatricule, rs.getBoolean("couvert"), manquantes != null && manquantes == 0,
                    ayantsDroit.getOrDefault(id, List.of()));
        }, args);
    }

    private Map<String, Existant> chargerExistants(UUID adherentId) {
        Map<String, Existant> map = new HashMap<>();
        jdbcTemplate.query("SELECT adherent_id, avantage_id, statut, date_debut, date_fin, criteres_manquants "
                + "FROM adherent_avantage" + (adherentId == null ? "" : " WHERE adherent_id = ?"), rs -> {
            map.put(rs.getString("adherent_id") + "/" + rs.getString("avantage_id"),
                    new Existant(StatutAvantage.valueOf(rs.getString("statut")), date(rs.getDate("date_debut")),
                            date(rs.getDate("date_fin")), rs.getString("criteres_manquants")));
        }, adherentId == null ? new Object[0] : new Object[]{adherentId});
        return map;
    }

    private List<AvantageCat> chargerCatalogue(boolean inclureInactifs, UUID avantageId) {
        Map<UUID, List<Critere>> criteres = new HashMap<>();
        Map<UUID, List<PieceAvantageDto>> pieces = new HashMap<>();
        jdbcTemplate.query("SELECT avantage_id, type_critere, valeur FROM critere_avantage ORDER BY ordre", rs -> {
            criteres.computeIfAbsent(UUID.fromString(rs.getString("avantage_id")), k -> new ArrayList<>())
                    .add(new Critere(TypeCritere.valueOf(rs.getString("type_critere")), rs.getString("valeur")));
        });
        jdbcTemplate.query("SELECT avantage_id, categorie, libelle FROM piece_avantage ORDER BY categorie, ordre",
                rs -> {
                    pieces.computeIfAbsent(UUID.fromString(rs.getString("avantage_id")), k -> new ArrayList<>())
                            .add(new PieceAvantageDto(rs.getString("categorie"), rs.getString("libelle")));
                });
        String sql = "SELECT id, code, libelle, branche, description, actif, statut_validation FROM avantage WHERE 1=1"
                + (inclureInactifs ? "" : " AND actif = true") + (avantageId == null ? "" : " AND id = ?")
                + " ORDER BY ordre, libelle";
        return jdbcTemplate.query(sql, (rs, i) -> {
            UUID id = UUID.fromString(rs.getString("id"));
            return new AvantageCat(id, rs.getString("code"), rs.getString("libelle"), rs.getString("branche"),
                    rs.getString("description"), rs.getBoolean("actif"), rs.getString("statut_validation"),
                    criteres.getOrDefault(id, List.of()), pieces.getOrDefault(id, List.of()));
        }, avantageId == null ? new Object[0] : new Object[]{avantageId});
    }

    private AvantageCat charger(UUID avantageId) {
        List<AvantageCat> r = chargerCatalogue(true, avantageId);
        if (r.isEmpty()) {
            throw new ExceptionRessourceIntrouvable("AVANTAGE_INTROUVABLE", "Avantage introuvable.");
        }
        return r.get(0);
    }

    private AvantageDto versDto(AvantageCat av) {
        Map<String, Long> effectifs = new LinkedHashMap<>();
        jdbcTemplate.query("""
                SELECT aa.statut, count(*) AS n FROM adherent_avantage aa JOIN adherent a ON a.id = aa.adherent_id
                WHERE aa.avantage_id = ? AND a.archive = false AND a.statut <> 'RADIE' GROUP BY aa.statut
                """, rs -> {
            effectifs.put(rs.getString("statut"), rs.getLong("n"));
        }, av.id());
        return new AvantageDto(av.id(), av.code(), av.libelle(), av.branche(), av.description(), av.actif(),
                av.statutValidation(),
                av.criteres().stream().map(c -> new CritereDto(c.type(), c.valeur(), MoteurAvantages.libelle(c)))
                        .toList(),
                av.pieces(), effectifs.getOrDefault("ACQUIS", 0L), effectifs.getOrDefault("EN_COURS", 0L),
                effectifs.getOrDefault("SUSPENDU", 0L));
    }

    private void validerSaisie(SaisieAvantageDto dto) {
        if (dto.actif() && dto.criteres().isEmpty()) {
            throw new ExceptionValidation("AVANTAGE_CRITERES_REQUIS",
                    "Un avantage actif doit avoir au moins un critère : sans critère, il n'ouvrirait aucun droit.",
                    "criteres");
        }
        for (AvantageDtos.SaisieCritereDto c : dto.criteres()) {
            if (c.type().exigeValeur() && (c.valeur() == null || c.valeur().isBlank())) {
                throw new ExceptionValidation("AVANTAGE_CRITERE_VALEUR_REQUISE",
                        "Le critère " + c.type() + " exige une valeur.", "criteres");
            }
        }
    }

    private void remplacerCriteresEtPieces(UUID avantageId, SaisieAvantageDto dto) {
        jdbcTemplate.update("DELETE FROM critere_avantage WHERE avantage_id = ?", avantageId);
        jdbcTemplate.update("DELETE FROM piece_avantage WHERE avantage_id = ?", avantageId);
        int ordre = 1;
        for (AvantageDtos.SaisieCritereDto c : dto.criteres()) {
            jdbcTemplate.update("INSERT INTO critere_avantage (avantage_id, type_critere, valeur, ordre) "
                    + "VALUES (?, ?, ?, ?)", avantageId, c.type().name(),
                    c.valeur() == null || c.valeur().isBlank() ? null : c.valeur().trim(), ordre++);
        }
        ordre = 1;
        if (dto.pieces() != null) {
            for (AvantageDtos.SaisiePieceDto p : dto.pieces()) {
                jdbcTemplate.update("INSERT INTO piece_avantage (avantage_id, categorie, libelle, ordre) "
                        + "VALUES (?, ?, ?, ?)", avantageId, p.categorie(), p.libelle().trim(), ordre++);
            }
        }
    }

    private static LocalDate date(Date d) {
        return d == null ? null : d.toLocalDate();
    }
}
