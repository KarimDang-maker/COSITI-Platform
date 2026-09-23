package cm.cositi.api.reporting.service;

import cm.cositi.api.reporting.dto.Alerte;
import cm.cositi.api.reporting.dto.CritereTableauBord;
import cm.cositi.api.reporting.dto.IndicateurCle;
import cm.cositi.api.reporting.dto.LigneAgent;
import cm.cositi.api.reporting.dto.LigneZone;
import cm.cositi.api.reporting.dto.TableauBordDafDto;
import cm.cositi.api.reporting.dto.TableauBordDgDto;
import cm.cositi.api.reporting.dto.TableauBordDgaDto;
import cm.cositi.api.reporting.dto.TableauBordGestionnaireDto;
import cm.cositi.api.reporting.dto.TableauBordPcaDto;
import cm.cositi.api.reporting.dto.TableauBordSuperAdminDto;
import cm.cositi.api.securite.entite.Utilisateur;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Les six tableaux de bord de la V1 (jalon J9).
 *
 * <p><b>Indicateur central</b> : {@code tauxActivation = adhérents ayant cotisé au moins une fois /
 * adhérents enregistrés}. Sur 172 adhérents, 115 n'ont jamais cotisé — c'est le chiffre autour duquel tout
 * le projet est construit, et il apparaît sur les cinq dashboards métier.</p>
 *
 * <p><b>Source des chiffres</b> : les vues matérialisées {@code vue_situation_adherent} (V4) et
 * {@code vue_synthese_zone} (V11), jamais une agrégation à la volée sur l'ensemble des paiements
 * (docs/02_CLASSES_ET_METHODES.md §8). Conséquence assumée et rendue visible : un dashboard peut être en
 * retard sur la base. Chaque réponse porte un avertissement dès que le rafraîchissement date de plus d'une
 * heure, plutôt que d'afficher un chiffre périmé sans le dire.</p>
 *
 * <p><b>Ce que ces dashboards ne font pas</b> : aucun objectif terrain n'est calculé ({@code [A]} non
 * confirmé), aucune projection ni tendance n'est extrapolée, et le dashboard du Super Administrateur ne
 * contient aucune donnée nominative.</p>
 */
@Service
public class ServiceTableauBordImpl implements ServiceTableauBord {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceTableauBordImpl.class);

    /** Au-delà, la fraîcheur des vues est signalée à l'utilisateur. */
    private static final long MINUTES_AVANT_AVERTISSEMENT_FRAICHEUR = 60;

    private final JdbcTemplate jdbcTemplate;

    /**
     * Horodatage du dernier rafraîchissement réussi. En mémoire et non en base : c'est une information
     * d'exploitation de l'instance, et la perdre au redémarrage n'a pas de conséquence — le premier
     * rafraîchissement planifié la rétablit.
     */
    private volatile java.time.Instant dernierRafraichissement;

    public ServiceTableauBordImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ------------------------------------------------------------------ Dashboards

    @Override
    @PreAuthorize("hasAuthority('TABLEAU_BORD:PCA')")
    public TableauBordPcaDto pca(CritereTableauBord critere, Utilisateur demandeur) {
        List<IndicateurCle> indicateurs = indicateursGlobaux(critere);
        // Rapports réellement mis à disposition du PCA. Seuls les rapports TRANSMIS comptent : un rapport
        // produit mais non transmis n'existe pas pour lui (voir ServiceRapportDafImpl). Compteur branché
        // au jalon J10, quand la table `rapport_daf` a été créée.
        long rapports = compter("SELECT COUNT(*) FROM rapport_daf WHERE statut = 'TRANSMIS'", 0L);
        return new TableauBordPcaDto(indicateurs, zones(critere), alertesGlobales(), rapports, avertissements());
    }

    @Override
    @PreAuthorize("hasAuthority('TABLEAU_BORD:DG')")
    public TableauBordDgDto dg(CritereTableauBord critere, Utilisateur demandeur) {
        return new TableauBordDgDto(indicateursGlobaux(critere), zones(critere), alertesGlobales(),
                adherentsEnRetard(), avertissements());
    }

    @Override
    @PreAuthorize("hasAuthority('TABLEAU_BORD:DGA')")
    public TableauBordDgaDto dga(CritereTableauBord critere, Utilisateur demandeur) {
        List<IndicateurCle> indicateurs = new ArrayList<>(indicateursGlobaux(critere));
        indicateurs.add(IndicateurCle.nombre("agentsActifs", "Agents de terrain actifs",
                compter("SELECT COUNT(*) FROM agent WHERE actif = true AND archive = false", 0L)));

        long consolidesRecus = compter("""
                SELECT COUNT(*) FROM compte_rendu
                WHERE type = 'CONSOLIDE' AND statut = 'TRANSMIS' AND archive = false
                """, 0L);

        return new TableauBordDgaDto(indicateurs, zones(critere), agents(critere), alertesGlobales(),
                consolidesRecus,
                // Objectifs terrain : `[A]` non confirmé (Roles des acteurs.md §14). Rien n'est calculé
                // tant que le besoin n'est pas validé — une liste vide, pas un objectif inventé.
                List.of(), avertissements());
    }

    @Override
    @PreAuthorize("hasAuthority('TABLEAU_BORD:DAF')")
    public TableauBordDafDto daf(CritereTableauBord critere, Utilisateur demandeur) {
        LocalDate debut = critere.debutEffectif();
        LocalDate fin = critere.finEffective();

        long aControler = compter("SELECT COUNT(*) FROM paiement WHERE statut = 'A_CONTROLER'", 0L);
        long incoherences = compter("SELECT COUNT(*) FROM paiement WHERE statut = 'INCOHERENCE'", 0L);
        long remisesEnEcart = compter("SELECT COUNT(*) FROM remise_caisse WHERE statut = 'EN_ECART'", 0L);

        BigDecimal montantAControler = montant(
                "SELECT COALESCE(SUM(montant), 0) FROM paiement WHERE statut = 'A_CONTROLER'");
        BigDecimal montantValide = montant("""
                SELECT COALESCE(SUM(montant), 0) FROM paiement
                WHERE statut IN ('VALIDE', 'RAPPROCHE') AND date_paiement BETWEEN ? AND ?
                """, debut, fin);

        List<IndicateurCle> indicateurs = List.of(
                IndicateurCle.montant("montantValide", "Encaissements validés sur la période", montantValide),
                IndicateurCle.montant("montantAControler", "En attente de contrôle", montantAControler),
                IndicateurCle.nombre("paiementsAControler", "Paiements à contrôler", aControler),
                IndicateurCle.nombre("incoherences", "Incohérences signalées", incoherences));

        List<Alerte> alertes = new ArrayList<>();
        if (aControler > 0) {
            alertes.add(new Alerte("PAIEMENTS_A_CONTROLER", aControler > 20 ? "ATTENTION" : "INFO",
                    "Paiements en attente de votre contrôle", aControler, "/daf"));
        }
        if (remisesEnEcart > 0) {
            alertes.add(new Alerte("REMISES_EN_ECART", "CRITIQUE",
                    "Remises de caisse présentant un écart", remisesEnEcart, null));
        }

        return new TableauBordDafDto(indicateurs, aControler, incoherences, remisesEnEcart, montantAControler,
                montantValide, alertes, avertissements());
    }

    @Override
    @PreAuthorize("hasAuthority('TABLEAU_BORD:GESTIONNAIRE')")
    public TableauBordGestionnaireDto gestionnaire(CritereTableauBord critere, Utilisateur demandeur) {
        long dossiersIncomplets = compter(
                "SELECT COUNT(*) FROM dossier_cnps WHERE statut IN ('BROUILLON', 'INCOMPLET')", 0L);

        // Éligibles non immatriculés : même règle qu'au jalon J7 — seuil du pack DE L'ADHÉRENT, jamais global.
        long eligibles = compter("""
                SELECT COUNT(*) FROM (
                    SELECT a.id
                    FROM adherent a
                    JOIN adhesion adh ON adh.adherent_id = a.id AND adh.date_fin IS NULL
                    JOIN pack p ON p.id = adh.pack_id
                    LEFT JOIN periode_droits pd ON pd.adherent_id = a.id AND pd.statut <> 'ANNULEE'
                    LEFT JOIN dossier_cnps d ON d.adherent_id = a.id
                    WHERE a.archive = false AND a.numero_cnps IS NULL AND d.numero_immatriculation IS NULL
                    GROUP BY a.id, p.seuil_eligibilite_cnps
                    HAVING COALESCE(SUM(pd.montant_impute), 0) >= p.seuil_eligibilite_cnps
                ) AS eligibles
                """, 0L);

        long declarations = compter(
                "SELECT COUNT(*) FROM declaration_cnps WHERE statut = 'A_PRODUIRE'", 0L);
        long comptesRendus = compter("""
                SELECT COUNT(*) FROM compte_rendu
                WHERE type = 'TERRAIN' AND statut = 'TRANSMIS' AND archive = false
                """, 0L);
        long enRetard = adherentsEnRetard();

        List<IndicateurCle> indicateurs = new ArrayList<>(indicateursGlobaux(critere));
        indicateurs.add(IndicateurCle.nombre("dossiersCnpsIncomplets", "Dossiers CNPS incomplets",
                dossiersIncomplets));

        List<Alerte> alertes = new ArrayList<>();
        if (comptesRendus > 0) {
            alertes.add(new Alerte("COMPTES_RENDUS_A_CONTROLER", "ATTENTION",
                    "Comptes rendus terrain en attente de contrôle", comptesRendus, "/comptes-rendus"));
        }
        if (eligibles > 0) {
            alertes.add(new Alerte("ELIGIBLES_NON_IMMATRICULES", "INFO",
                    "Adhérents éligibles CNPS sans dossier", eligibles, "/cnps?onglet=eligibles"));
        }
        if (declarations > 0) {
            alertes.add(new Alerte("DECLARATIONS_A_PRODUIRE", "INFO",
                    "Déclarations CNPS à transmettre", declarations, "/cnps"));
        }

        return new TableauBordGestionnaireDto(indicateurs, dossiersIncomplets, eligibles, declarations,
                comptesRendus, enRetard, alertes, avertissements());
    }

    @Override
    @PreAuthorize("hasAuthority('TABLEAU_BORD:SUPER_ADMIN')")
    public TableauBordSuperAdminDto superAdmin(CritereTableauBord critere, Utilisateur demandeur) {
        long actifs = compter("SELECT COUNT(*) FROM utilisateur WHERE actif = true", 0L);
        long verrouilles = compter(
                "SELECT COUNT(*) FROM utilisateur WHERE verrouille_jusqu_a IS NOT NULL AND verrouille_jusqu_a > now()",
                0L);
        long echecs = compter("""
                SELECT COUNT(*) FROM journal_audit
                WHERE type_operation = 'CONNEXION_ECHEC' AND horodatage > now() - INTERVAL '24 hours'
                """, 0L);
        long parametresNonValides = compter("SELECT COUNT(*) FROM parametre WHERE statut_validation = 'V'", 0L);
        long evenements = compter(
                "SELECT COUNT(*) FROM journal_audit WHERE horodatage > now() - INTERVAL '24 hours'", 0L);

        List<IndicateurCle> indicateurs = List.of(
                IndicateurCle.nombre("utilisateursActifs", "Comptes actifs", actifs),
                IndicateurCle.nombre("utilisateursVerrouilles", "Comptes verrouillés", verrouilles),
                IndicateurCle.nombre("connexionsEchouees24h", "Échecs de connexion (24 h)", echecs),
                IndicateurCle.nombre("evenementsAudit24h", "Événements d'audit (24 h)", evenements));

        List<Alerte> alertes = new ArrayList<>();
        if (verrouilles > 0) {
            alertes.add(new Alerte("COMPTES_VERROUILLES", "ATTENTION", "Comptes actuellement verrouillés",
                    verrouilles, null));
        }
        if (parametresNonValides > 0) {
            // Dette fonctionnelle rendue visible là où elle peut être traitée : chaque règle `[V]` est une
            // valeur provisoire qui produit aujourd'hui des résultats à ne pas considérer comme définitifs.
            alertes.add(new Alerte("PARAMETRES_NON_VALIDES", "ATTENTION",
                    "Règles métier non validées par la COSITI", parametresNonValides, null));
        }

        return new TableauBordSuperAdminDto(indicateurs, actifs, verrouilles, echecs, parametresNonValides,
                evenements, alertes, List.of());
    }

    // ------------------------------------------------------------------ Vues matérialisées

    @Override
    @Scheduled(cron = "${cositi.reporting.cron-rafraichissement:0 */15 * * * *}")
    @Transactional
    public void rafraichirVuesSyntheses() {
        try {
            // CONCURRENTLY : le rafraîchissement ne bloque pas les lectures des dashboards. Possible parce
            // que les deux vues portent un index unique (V4 et V11).
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY vue_situation_adherent");
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY vue_synthese_zone");
            dernierRafraichissement = java.time.Instant.now();
            JOURNAL.debug("Vues de synthèse rafraîchies.");
        } catch (RuntimeException e) {
            // Un échec de rafraîchissement ne doit jamais empêcher l'application de servir : les dashboards
            // afficheront des chiffres plus anciens, avec leur avertissement de fraîcheur.
            JOURNAL.warn("Échec du rafraîchissement des vues de synthèse : les dashboards afficheront des "
                    + "chiffres antérieurs.", e);
        }
    }

    // ------------------------------------------------------------------ Interne

    /** Indicateurs communs aux dashboards métier, dont le taux d'activation. */
    private List<IndicateurCle> indicateursGlobaux(CritereTableauBord critere) {
        long nbAdherents = compter("SELECT COUNT(*) FROM vue_situation_adherent", 0L);
        long nbActifs = compter("SELECT COUNT(*) FROM vue_situation_adherent WHERE cumul_cotise > 0", 0L);
        BigDecimal collecte = montant("""
                SELECT COALESCE(SUM(montant), 0) FROM paiement
                WHERE statut IN ('VALIDE', 'RAPPROCHE') AND date_paiement BETWEEN ? AND ?
                """, critere.debutEffectif(), critere.finEffective());

        BigDecimal tauxActivation = nbAdherents == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(nbActifs).divide(BigDecimal.valueOf(nbAdherents), 4, RoundingMode.HALF_UP);

        return List.of(
                IndicateurCle.nombre("adherents", "Adhérents enregistrés", nbAdherents),
                IndicateurCle.nombre("adherentsActifs", "Adhérents ayant déjà cotisé", nbActifs),
                IndicateurCle.pourcentage("tauxActivation", "Taux d'activation", tauxActivation),
                IndicateurCle.montant("collectePeriode", "Collecte validée sur la période", collecte));
    }

    private List<LigneZone> zones(CritereTableauBord critere) {
        String sql = """
                SELECT zone_id, zone_code, zone_libelle, nb_adherents, nb_actifs, nb_en_retard,
                       cumul_collecte, nb_agents
                FROM vue_synthese_zone
                WHERE (CAST(? AS uuid) IS NULL OR zone_id = CAST(? AS uuid))
                ORDER BY nb_adherents DESC
                """;
        String zone = critere.zoneId() == null ? null : critere.zoneId().toString();
        return jdbcTemplate.query(sql, (rs, ligne) -> new LigneZone(
                (UUID) rs.getObject("zone_id"),
                rs.getString("zone_code"),
                rs.getString("zone_libelle"),
                rs.getLong("nb_adherents"),
                rs.getLong("nb_actifs"),
                rs.getLong("nb_en_retard"),
                rs.getBigDecimal("cumul_collecte"),
                rs.getLong("nb_agents")), zone, zone);
    }

    private List<LigneAgent> agents(CritereTableauBord critere) {
        String sql = """
                SELECT ag.id, ag.code_agent, ag.nom_complet, z.libelle AS zone_libelle,
                       COUNT(DISTINCT ap.adherent_id) AS nb_portefeuille,
                       COUNT(DISTINCT p.id) AS nb_paiements,
                       COALESCE(SUM(p.montant), 0) AS montant_collecte
                FROM agent ag
                LEFT JOIN zone z ON z.id = ag.zone_id
                LEFT JOIN affectation_portefeuille ap ON ap.agent_id = ag.id AND ap.date_fin IS NULL
                LEFT JOIN paiement p ON p.agent_encaisseur_id = ag.id
                     AND p.statut IN ('VALIDE', 'RAPPROCHE')
                     AND p.date_paiement BETWEEN ? AND ?
                WHERE ag.archive = false AND ag.actif = true
                  AND (CAST(? AS uuid) IS NULL OR ag.zone_id = CAST(? AS uuid))
                GROUP BY ag.id, ag.code_agent, ag.nom_complet, z.libelle
                ORDER BY montant_collecte DESC
                """;
        String zone = critere.zoneId() == null ? null : critere.zoneId().toString();
        return jdbcTemplate.query(sql, (rs, ligne) -> new LigneAgent(
                (UUID) rs.getObject("id"),
                rs.getString("code_agent"),
                rs.getString("nom_complet"),
                rs.getString("zone_libelle"),
                rs.getLong("nb_portefeuille"),
                rs.getLong("nb_paiements"),
                rs.getBigDecimal("montant_collecte")),
                critere.debutEffectif(), critere.finEffective(), zone, zone);
    }

    private long adherentsEnRetard() {
        return compter("SELECT COUNT(*) FROM adherent WHERE statut = 'EN_RETARD' AND archive = false", 0L);
    }

    private List<Alerte> alertesGlobales() {
        List<Alerte> alertes = new ArrayList<>();

        long jamaisCotise = compter("SELECT COUNT(*) FROM vue_situation_adherent WHERE cumul_cotise = 0", 0L);
        if (jamaisCotise > 0) {
            // L'indicateur central du projet : il ne se fond pas dans le reste.
            alertes.add(new Alerte("JAMAIS_COTISE", "CRITIQUE",
                    "Adhérents n'ayant jamais cotisé", jamaisCotise, "/droits"));
        }

        long enRetard = adherentsEnRetard();
        if (enRetard > 0) {
            alertes.add(new Alerte("ADHERENTS_EN_RETARD", "ATTENTION", "Adhérents en retard de cotisation",
                    enRetard, "/droits"));
        }
        return alertes;
    }

    /**
     * Avertissements portés par la réponse. La fraîcheur des vues en fait partie : un dashboard qui affiche
     * des chiffres d'il y a deux heures sans le dire fait prendre des décisions sur du passé.
     */
    private List<String> avertissements() {
        List<String> avertissements = new ArrayList<>();
        if (dernierRafraichissement == null) {
            avertissements.add("Les vues de synthèse n'ont pas encore été rafraîchies depuis le démarrage : "
                    + "les chiffres peuvent dater de la dernière exécution planifiée.");
        } else {
            long minutes = java.time.Duration.between(dernierRafraichissement, java.time.Instant.now()).toMinutes();
            if (minutes > MINUTES_AVANT_AVERTISSEMENT_FRAICHEUR) {
                avertissements.add("Les chiffres de synthèse datent de " + minutes + " minutes.");
            }
        }
        return avertissements;
    }

    private long compter(String sql, long defaut) {
        Long valeur = jdbcTemplate.queryForObject(sql, Long.class);
        return valeur != null ? valeur : defaut;
    }

    private BigDecimal montant(String sql, Object... parametres) {
        BigDecimal valeur = jdbcTemplate.queryForObject(sql, BigDecimal.class, parametres);
        return valeur != null ? valeur : BigDecimal.ZERO;
    }
}
