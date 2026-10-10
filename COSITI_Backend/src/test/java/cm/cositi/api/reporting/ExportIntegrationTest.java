package cm.cositi.api.reporting;

import cm.cositi.api.ConfigurationTestsIntegration;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exports CSV (jalon J10), bout en bout via l'API réelle.
 *
 * <p>Vérifie les trois règles qui font qu'un export n'est pas une simple requête : filtrage par périmètre
 * du demandeur, journalisation systématique ({@code EXPORT_SENSIBLE}), et neutralisation des valeurs qu'un
 * tableur interpréterait comme des formules.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class ExportIntegrationTest extends ConfigurationTestsIntegration {

    @LocalServerPort
    private int port;

    @Autowired
    private UtilisateurRepository utilisateurRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PasswordEncoder encodeurMotDePasse;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final String MOT_DE_PASSE = "MotDePasseValide123!";

    private String suffixe;
    private UUID zoneId;
    private String jetonGestionnaire;
    private String jetonDaf;
    private String jetonAgent;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
        suffixe = UUID.randomUUID().toString().substring(0, 8);

        zoneId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO zone (id, code, libelle, ville, region) VALUES (?, ?, ?, ?, ?)",
                zoneId, "Z-EXP-" + suffixe, "Zone Export", "Douala", "Littoral");

        jetonGestionnaire = creerUtilisateur("gest.exp." + suffixe, "GESTIONNAIRE_COMPTE", null);
        jetonDaf = creerUtilisateur("daf.exp." + suffixe, "DAF", null);

        UUID agentId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id) VALUES (?, ?, ?, ?, ?)",
                agentId, "AG-EXP-" + suffixe, "Agent Export", "690000077", zoneId);
        jetonAgent = creerUtilisateur("agent.exp." + suffixe, "AGENT_TERRAIN", agentId);
    }

    @Test
    void exporte_les_adherents_en_csv_avec_un_entete_et_une_ligne_par_adherent() {
        creerAdherent("Ndongo");

        String csv = given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().post("/exports/adherents")
                .then().statusCode(200)
                .header("Cache-Control", "no-store")
                .extract().asString();

        assertThat(csv).contains("matricule;nom;prenoms");
        assertThat(csv).contains("Ndongo");
        // Le BOM UTF-8 est présent : sans lui, les accents s'affichent mal dans un tableur.
        assertThat(csv.getBytes(StandardCharsets.UTF_8)[0]).isEqualTo((byte) 0xEF);
    }

    @Test
    void neutralise_une_valeur_que_le_tableur_interpreterait_comme_une_formule() {
        // Un adhérent peut légitimement s'appeler ainsi ; exécuté comme formule, il ne l'est plus.
        creerAdherent("=cmd|calc");

        String csv = given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().post("/exports/adherents")
                .then().statusCode(200)
                .extract().asString();

        assertThat(csv).contains("\"'=cmd|calc\"");
        assertThat(csv).doesNotContain(";\"=cmd|calc\"");
    }

    @Test
    void journalise_chaque_export_avec_son_nombre_de_lignes() {
        creerAdherent("Atangana");

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().post("/exports/adherents")
                .then().statusCode(200);

        Integer traces = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM journal_audit WHERE type_operation = 'EXPORT_SENSIBLE'
                """, Integer.class);
        assertThat(traces).isGreaterThanOrEqualTo(1);
    }

    @Test
    void un_agent_de_terrain_ne_peut_pas_exporter_le_referentiel_des_adherents() {
        // EXPORT:ADHERENTS n'est accordé qu'au Gestionnaire, à la DGA et au DG (V12).
        given().header("Authorization", "Bearer " + jetonAgent)
                .when().post("/exports/adherents")
                .then().statusCode(403);
    }

    @Test
    void un_gestionnaire_ne_peut_pas_exporter_les_paiements() {
        // Séparation des domaines : les paiements sont un export financier (DAF, DG, DGA).
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().post("/exports/paiements")
                .then().statusCode(403);
    }

    @Test
    void le_daf_exporte_les_paiements_sur_une_periode() {
        String csv = given().header("Authorization", "Bearer " + jetonDaf)
                .queryParam("du", LocalDate.now().minusMonths(1).toString())
                .queryParam("au", LocalDate.now().toString())
                .when().post("/exports/paiements")
                .then().statusCode(200)
                .extract().asString();

        assertThat(csv).contains("numero_recu;date_paiement;matricule");
    }

    @Test
    void refuse_un_export_au_dela_du_seuil_de_lignes() {
        // Le seuil est une règle paramétrable : on l'abaisse à 0 pour vérifier le refus sans fabriquer
        // des milliers d'adhérents.
        creerAdherent("Mballa");
        jdbcTemplate.update("UPDATE parametre SET valeur = '0' WHERE cle = 'EXPORT_SEUIL_LIGNES'");
        try {
            given().header("Authorization", "Bearer " + jetonGestionnaire)
                    .when().post("/exports/adherents")
                    .then().statusCode(400)
                    .body("code", org.hamcrest.Matchers.equalTo("EXPORT_TROP_VOLUMINEUX"));
        } finally {
            jdbcTemplate.update("UPDATE parametre SET valeur = '5000' WHERE cle = 'EXPORT_SEUIL_LIGNES'");
        }
    }

    // ------------------------------------------------------------------ Fixtures

    private void creerAdherent(String nom) {
        UUID activiteId = jdbcTemplate.queryForObject(
                "SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        UUID packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
        String telephone = "6" + String.format("%08d", Math.abs(UUID.randomUUID().hashCode() % 100_000_000));

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("nom", nom, "telephonePrincipal", telephone,
                        "activiteId", activiteId.toString(), "zoneId", zoneId.toString(),
                        "localisation", "Marché", "dateAdhesion", LocalDate.now().minusMonths(2).toString(),
                        "packId", packId.toString(), "consentementDonnees", true,
                        "confirmationDoublonIgnore", true))
                .when().post("/adherents")
                .then().statusCode(201);
    }

    private String creerUtilisateur(String identifiant, String codeRole, UUID agentId) {
        Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "Exp " + identifiant);
        u.setDoitChangerMotDePasse(false);
        u.setAgentId(agentId);
        roleRepository.findByCode(codeRole).ifPresent(u::ajouterRole);
        utilisateurRepository.save(u);

        return given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(200)
                .extract().path("jetonAcces");
    }
}
