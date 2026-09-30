package cm.cositi.api.reporting.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Exports CSV (jalon J10).
 *
 * <p><b>Le périmètre est appliqué en SQL, pas après lecture</b> : pour un rôle terrain, la requête est
 * restreinte aux adhérents de son portefeuille ouvert. Filtrer après coup ferait transiter par la mémoire
 * du serveur des données que le demandeur n'a pas le droit de voir, et fausserait le compte de lignes
 * journalisé.</p>
 *
 * <p><b>Échappement CSV</b> : chaque valeur est entourée de guillemets et ses guillemets internes
 * doublés. Une valeur commençant par {@code =}, {@code +}, {@code -} ou {@code @} est préfixée d'une
 * apostrophe — sans quoi un tableur l'interpréterait comme une formule, ce qui est un vecteur d'injection
 * connu sur les exports (OWASP, « CSV injection »), et un adhérent peut parfaitement s'appeler « -Marie ».</p>
 */
@Service
public class ServiceExportImpl implements ServiceExport {

    static final String CLE_SEUIL = "EXPORT_SEUIL_LIGNES";

    private final JdbcTemplate jdbcTemplate;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;

    public ServiceExportImpl(JdbcTemplate jdbcTemplate, ServicePerimetreDonnees perimetre,
                              ServiceParametre serviceParametre, ServiceAudit serviceAudit) {
        this.jdbcTemplate = jdbcTemplate;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.serviceParametre = serviceParametre;
    }

    @Override
    @PreAuthorize("hasAuthority('EXPORT:ADHERENTS')")
    public FichierExport exporterAdherents(UUID zoneId, String statut, Utilisateur demandeur) {
        List<String> entetes = List.of("matricule", "nom", "prenoms", "telephone", "zone", "statut",
                "date_adhesion", "pack");

        StringBuilder sql = new StringBuilder("""
                SELECT a.matricule, a.nom, a.prenoms, a.telephone_principal, z.libelle AS zone, a.statut,
                       a.date_adhesion, p.code AS pack
                FROM adherent a
                JOIN zone z ON z.id = a.zone_id
                LEFT JOIN adhesion adh ON adh.adherent_id = a.id AND adh.date_fin IS NULL
                LEFT JOIN pack p ON p.id = adh.pack_id
                WHERE a.archive = false
                """);
        List<Object> parametres = new ArrayList<>();
        if (zoneId != null) {
            sql.append(" AND a.zone_id = ?");
            parametres.add(zoneId);
        }
        if (statut != null && !statut.isBlank()) {
            sql.append(" AND a.statut = ?");
            parametres.add(statut);
        }
        appliquerPerimetreAdherent(sql, parametres, demandeur, "a.id");
        sql.append(" ORDER BY a.nom, a.prenoms");

        Map<String, Object> filtres = new LinkedHashMap<>();
        filtres.put("zoneId", zoneId);
        filtres.put("statut", statut);

        return produire("adherents", entetes, sql.toString(), parametres, filtres);
    }

    @Override
    @PreAuthorize("hasAuthority('EXPORT:PAIEMENTS')")
    public FichierExport exporterPaiements(LocalDate du, LocalDate au, String statut, Utilisateur demandeur) {
        List<String> entetes = List.of("numero_recu", "date_paiement", "matricule", "adherent", "montant",
                "mode_paiement", "reference_transaction", "statut");

        StringBuilder sql = new StringBuilder("""
                SELECT p.numero_recu, p.date_paiement, a.matricule,
                       a.nom || ' ' || COALESCE(a.prenoms, '') AS adherent,
                       p.montant, p.mode_paiement, p.reference_transaction, p.statut
                FROM paiement p
                JOIN adherent a ON a.id = p.adherent_id
                WHERE 1 = 1
                """);
        List<Object> parametres = new ArrayList<>();
        if (du != null) {
            sql.append(" AND p.date_paiement >= ?");
            parametres.add(du);
        }
        if (au != null) {
            sql.append(" AND p.date_paiement <= ?");
            parametres.add(au);
        }
        if (statut != null && !statut.isBlank()) {
            sql.append(" AND p.statut = ?");
            parametres.add(statut);
        }
        appliquerPerimetreAdherent(sql, parametres, demandeur, "p.adherent_id");
        sql.append(" ORDER BY p.date_paiement DESC");

        Map<String, Object> filtres = new LinkedHashMap<>();
        filtres.put("du", du);
        filtres.put("au", au);
        filtres.put("statut", statut);

        return produire("paiements", entetes, sql.toString(), parametres, filtres);
    }

    @Override
    @PreAuthorize("hasAuthority('EXPORT:CNPS')")
    public FichierExport exporterDossiersCnps(String statut, Utilisateur demandeur) {
        List<String> entetes = List.of("matricule", "adherent", "numero_immatriculation",
                "date_immatriculation", "statut_dossier", "pieces_fournies", "pieces_total");

        StringBuilder sql = new StringBuilder("""
                SELECT a.matricule, a.nom || ' ' || COALESCE(a.prenoms, '') AS adherent,
                       d.numero_immatriculation, d.date_immatriculation, d.statut AS statut_dossier,
                       COUNT(pc.id) FILTER (WHERE pc.statut IN ('FOURNIE', 'VALIDEE')) AS pieces_fournies,
                       COUNT(pc.id) AS pieces_total
                FROM dossier_cnps d
                JOIN adherent a ON a.id = d.adherent_id
                LEFT JOIN piece_dossier_cnps pc ON pc.dossier_id = d.id
                WHERE a.archive = false
                """);
        List<Object> parametres = new ArrayList<>();
        if (statut != null && !statut.isBlank()) {
            sql.append(" AND d.statut = ?");
            parametres.add(statut);
        }
        appliquerPerimetreAdherent(sql, parametres, demandeur, "d.adherent_id");
        sql.append("""
                 GROUP BY a.matricule, a.nom, a.prenoms, d.numero_immatriculation, d.date_immatriculation,
                          d.statut
                 ORDER BY a.nom
                """);

        Map<String, Object> filtres = new LinkedHashMap<>();
        filtres.put("statut", statut);

        return produire("dossiers-cnps", entetes, sql.toString(), parametres, filtres);
    }

    // ------------------------------------------------------------------ Interne

    /**
     * Restreint la requête au périmètre du demandeur. Pour un rôle à périmètre global, rien n'est ajouté.
     * Pour un rôle terrain sans agent lié, la clause exclut tout — un compte mal configuré n'exporte rien
     * plutôt que d'exporter la base entière.
     */
    private void appliquerPerimetreAdherent(StringBuilder sql, List<Object> parametres, Utilisateur demandeur,
                                             String colonneAdherentId) {
        if (perimetre.estPerimetreGlobal(demandeur) || demandeur.possedeRole("GESTIONNAIRE_COMPTE")) {
            return;
        }
        if (demandeur.getAgentId() == null) {
            sql.append(" AND false");
            return;
        }
        boolean estChef = demandeur.possedeRole("CHEF_AGENT_TERRAIN");
        sql.append(" AND ").append(colonneAdherentId).append(" IN (")
                .append("SELECT ap.adherent_id FROM affectation_portefeuille ap ")
                .append(estChef ? "JOIN agent ag ON ag.id = ap.agent_id " : "")
                .append("WHERE ap.date_fin IS NULL AND (")
                .append(estChef ? "ap.agent_id = ? OR ag.chef_agent_id = ?" : "ap.agent_id = ?")
                .append("))");
        parametres.add(demandeur.getAgentId());
        if (estChef) {
            parametres.add(demandeur.getAgentId());
        }
    }

    private FichierExport produire(String typeExport, List<String> entetes, String sql, List<Object> parametres,
                                    Map<String, Object> filtres) {
        int seuil = serviceParametre.entier(CLE_SEUIL);

        List<List<String>> lignes = jdbcTemplate.query(sql, (rs, numero) -> {
            List<String> ligne = new ArrayList<>(entetes.size());
            for (int colonne = 1; colonne <= entetes.size(); colonne++) {
                Object valeur = rs.getObject(colonne);
                ligne.add(valeur == null ? "" : String.valueOf(valeur));
            }
            return ligne;
        }, parametres.toArray());

        if (lignes.size() > seuil) {
            throw new ExceptionValidation("EXPORT_TROP_VOLUMINEUX",
                    "Cet export produirait " + lignes.size() + " lignes, au-delà de la limite de " + seuil
                            + ". Restreignez la période ou les filtres.");
        }

        StringBuilder csv = new StringBuilder();
        csv.append(String.join(";", entetes)).append("\n");
        for (List<String> ligne : lignes) {
            csv.append(ligne.stream().map(ServiceExportImpl::echapper).reduce((a, b) -> a + ";" + b).orElse(""))
                    .append("\n");
        }

        // Journalisation obligatoire : type, filtres, nombre de lignes (docs/04_SECURITE.md §4).
        serviceAudit.tracerExport(typeExport, filtres, lignes.size());

        String nomFichier = "cositi-" + typeExport + "-" + LocalDate.now() + ".csv";
        return new FichierExport(nomFichier, csv.toString(), lignes.size());
    }

    /**
     * Échappe une valeur CSV et neutralise les préfixes interprétés comme des formules par un tableur.
     * Un nom commençant par un tiret est parfaitement légitime ; exécuté comme formule, il ne l'est plus.
     */
    private static String echapper(String valeur) {
        String sortie = valeur == null ? "" : valeur;
        if (!sortie.isEmpty() && "=+-@".indexOf(sortie.charAt(0)) >= 0) {
            sortie = "'" + sortie;
        }
        return "\"" + sortie.replace("\"", "\"\"") + "\"";
    }
}
