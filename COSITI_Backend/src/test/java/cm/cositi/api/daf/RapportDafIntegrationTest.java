package cm.cositi.api.daf;

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

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Flux DAF → PCA (jalon J10), bout en bout via l'API réelle.
 *
 * <p>Couvre les cas de recette {@code REC-H10} (le DAF produit un rapport, qui est historisé),
 * {@code REC-H11} (le PCA le consulte) et {@code REC-H12} (un utilisateur non autorisé est refusé), plus
 * la règle qui les sous-tend : un rapport non transmis n'est pas un rapport consultable.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class RapportDafIntegrationTest extends ConfigurationTestsIntegration {

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
    private String jetonDaf;
    private String jetonPca;
    private String jetonGestionnaire;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
        suffixe = UUID.randomUUID().toString().substring(0, 8);

        jetonDaf = jetonPour("DAF");
        jetonPca = jetonPour("PCA");
        jetonGestionnaire = jetonPour("GESTIONNAIRE_COMPTE");
    }

    // ------------------------------------------------------------------ REC-H10

    @Test
    void le_daf_produit_un_rapport_dont_les_chiffres_sont_constates_par_le_serveur() {
        String id = produireRapport("Rapport de septembre");

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/daf/rapports/" + id)
                .then().statusCode(200)
                .body("statut", equalTo("PRODUIT"))
                .body("produitLe", notNullValue())
                .body("produitPar", equalTo("daf.rd." + suffixe))
                .body("montantValide", notNullValue())
                .body("nbPaiementsValides", notNullValue())
                // Le rappel métier fait partie du rapport lui-même.
                .body("contenuJson", containsString("n'exécute aucun mouvement de fonds"));

        // REC-H10 : la production est historisée au journal d'audit.
        Integer traces = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM journal_audit
                WHERE type_operation = 'RAPPORT_DAF_PRODUCTION' AND entite_id = ?
                """, Integer.class, UUID.fromString(id));
        assertThat(traces).isEqualTo(1);
    }

    @Test
    void refuse_un_rapport_sur_une_periode_incoherente() {
        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("titre", "Période à l'envers",
                        "periodeDebut", LocalDate.now().minusDays(1).toString(),
                        "periodeFin", LocalDate.now().minusDays(10).toString()))
                .when().post("/daf/rapports")
                .then().statusCode(400)
                .body("code", equalTo("RAPPORT_PERIODE_INVALIDE"));
    }

    // ------------------------------------------------------------ REC-H11 / H12

    @Test
    void le_pca_consulte_un_rapport_une_fois_transmis_et_pas_avant() {
        String id = produireRapport("Rapport à transmettre");

        // Avant transmission, le rapport n'existe pas pour le PCA : ce n'est pas encore un rapport.
        given().header("Authorization", "Bearer " + jetonPca)
                .when().get("/daf/rapports/" + id)
                .then().statusCode(403)
                .body("code", equalTo("RAPPORT_NON_TRANSMIS"));

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/daf/rapports/" + id + "/transmettre")
                .then().statusCode(200)
                .body("statut", equalTo("TRANSMIS"))
                .body("transmisLe", notNullValue());

        // REC-H11 : une fois transmis, le PCA y accède.
        given().header("Authorization", "Bearer " + jetonPca)
                .when().get("/daf/rapports/" + id)
                .then().statusCode(200)
                .body("titre", equalTo("Rapport à transmettre"));

        // Et il en est informé.
        UUID idPca = jdbcTemplate.queryForObject("SELECT id FROM utilisateur WHERE identifiant = ?", UUID.class,
                "pca.rd." + suffixe);
        Integer notifications = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM notification
                WHERE destinataire_utilisateur_id = ? AND type = 'RAPPORT_DAF_TRANSMIS'
                """, Integer.class, idPca);
        assertThat(notifications).isEqualTo(1);
    }

    @Test
    void un_utilisateur_non_autorise_ne_consulte_aucun_rapport() {
        // REC-H12 : RAPPORT_DAF:LIRE n'est accordé qu'à PCA, DAF, DG et DGA (V12).
        String id = produireRapport("Rapport confidentiel");
        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/daf/rapports/" + id + "/transmettre").then().statusCode(200);

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/daf/rapports/" + id)
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/daf/rapports")
                .then().statusCode(403);
    }

    @Test
    void seul_le_daf_produit_et_transmet_un_rapport() {
        given().header("Authorization", "Bearer " + jetonPca).contentType(ContentType.JSON)
                .body(Map.of("titre", "Rapport du PCA", "periodeDebut", LocalDate.now().minusMonths(1).toString(),
                        "periodeFin", LocalDate.now().toString()))
                .when().post("/daf/rapports")
                .then().statusCode(403);

        String id = produireRapport("Rapport du DAF");
        given().header("Authorization", "Bearer " + jetonPca)
                .when().post("/daf/rapports/" + id + "/transmettre")
                .then().statusCode(403);
    }

    @Test
    void un_rapport_transmis_ne_se_transmet_pas_deux_fois() {
        String id = produireRapport("Rapport unique");
        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/daf/rapports/" + id + "/transmettre").then().statusCode(200);

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/daf/rapports/" + id + "/transmettre")
                .then().statusCode(409)
                .body("code", equalTo("RAPPORT_DEJA_TRANSMIS"));
    }

    @Test
    void la_liste_du_pca_ne_contient_que_les_rapports_transmis() {
        produireRapport("Brouillon invisible");
        String transmis = produireRapport("Rapport publié");
        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/daf/rapports/" + transmis + "/transmettre").then().statusCode(200);

        var titres = given().header("Authorization", "Bearer " + jetonPca)
                .when().get("/daf/rapports")
                .then().statusCode(200)
                .extract().jsonPath().getList("contenu.titre", String.class);

        assertThat(titres).contains("Rapport publié").doesNotContain("Brouillon invisible");
    }

    // ------------------------------------------------------------------ Fixtures

    private String produireRapport(String titre) {
        return given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("titre", titre,
                        "periodeDebut", LocalDate.now().minusMonths(1).toString(),
                        "periodeFin", LocalDate.now().toString()))
                .when().post("/daf/rapports")
                .then().statusCode(201)
                .extract().path("id");
    }

    private String jetonPour(String codeRole) {
        String identifiant = switch (codeRole) {
            case "DAF" -> "daf.rd." + suffixe;
            case "PCA" -> "pca.rd." + suffixe;
            default -> "gest.rd." + suffixe;
        };
        Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "RD " + codeRole);
        u.setDoitChangerMotDePasse(false);
        roleRepository.findByCode(codeRole).ifPresent(u::ajouterRole);
        utilisateurRepository.save(u);

        return given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(200)
                .extract().path("jetonAcces");
    }
}
