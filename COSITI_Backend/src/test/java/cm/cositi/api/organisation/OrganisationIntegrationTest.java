package cm.cositi.api.organisation;

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
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Organisation terrain (jalon J3) : ajout d'un Agent par la DGA, désignation/remplacement du Chef
 * (historisés), RBAC DGA-only, transfert de portefeuille. Critère de passage :
 * Conception/JALONS_PROJET_COSITI.md.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class OrganisationIntegrationTest extends ConfigurationTestsIntegration {

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
    private UUID zoneId;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
        zoneId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO zone (id, code, libelle, ville, region) VALUES (?, ?, ?, ?, ?)",
                zoneId, "Z-" + zoneId.toString().substring(0, 8), "Zone Org Test", "Douala", "Littoral");
    }

    private String creerUtilisateurEtSeConnecter(String identifiant, String codeRole) {
        Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "Test " + identifiant);
        u.setDoitChangerMotDePasse(false);
        roleRepository.findByCode(codeRole).ifPresent(u::ajouterRole);
        utilisateurRepository.save(u);

        return given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(200)
                .extract().path("jetonAcces");
    }

    private String creerAgentViaApi(String jetonDga, String identifiant) {
        return given().header("Authorization", "Bearer " + jetonDga).contentType(ContentType.JSON)
                .body(Map.of("identifiantConnexion", identifiant, "nomComplet", "Agent " + identifiant,
                        "telephone", "690000000", "zoneId", zoneId.toString()))
                .when().post("/agents")
                .then().statusCode(201)
                .body("motDePasseInitial", notNullValue())
                .extract().path("id");
    }

    @Test
    void dgaAjouteUnAgentEtLeCompteEstCreeAvecLeRoleAgentTerrain() {
        String jetonDga = creerUtilisateurEtSeConnecter("dga.test1", "DGA");

        String agentId = creerAgentViaApi(jetonDga, "nouvel.agent1");

        given().header("Authorization", "Bearer " + jetonDga)
                .when().get("/agents/" + agentId)
                .then().statusCode(200)
                .body("codeAgent", org.hamcrest.Matchers.matchesPattern("AG-\\d{5,}"));

        Utilisateur compte = utilisateurRepository.findByIdentifiant("nouvel.agent1").orElseThrow();
        org.assertj.core.api.Assertions.assertThat(compte.possedeRole("AGENT_TERRAIN")).isTrue();
        org.assertj.core.api.Assertions.assertThat(compte.isDoitChangerMotDePasse()).isTrue();
    }

    @Test
    void ajoutAgentRefusePourUnRoleAutreQueDga() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.org1", "GESTIONNAIRE_COMPTE");

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("identifiantConnexion", "refuse1", "nomComplet", "Refuse", "telephone", "690000001",
                        "zoneId", zoneId.toString()))
                .when().post("/agents")
                .then().statusCode(403);
    }

    @Test
    void designationDuChefEstReserveeALaDgaEtHistorisee() {
        String jetonDga = creerUtilisateurEtSeConnecter("dga.test2", "DGA");
        String agentId = creerAgentViaApi(jetonDga, "candidat.chef1");

        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.org2", "GESTIONNAIRE_COMPTE");
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("motif", "Tentative non autorisée"))
                .when().post("/agents/" + agentId + "/designer-chef")
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + jetonDga).contentType(ContentType.JSON)
                .body(Map.of("motif", "Ancienneté et performance"))
                .when().post("/agents/" + agentId + "/designer-chef")
                .then().statusCode(200);

        Utilisateur compte = utilisateurRepository.findByIdentifiant("candidat.chef1").orElseThrow();
        org.assertj.core.api.Assertions.assertThat(compte.possedeRole("CHEF_AGENT_TERRAIN")).isTrue();

        given().header("Authorization", "Bearer " + jetonDga)
                .when().get("/agents/" + agentId + "/historique-chef")
                .then().statusCode(200)
                .body("size()", equalTo(1));

        // Deuxième désignation sur la même zone : conflit, il faut passer par le remplacement.
        given().header("Authorization", "Bearer " + jetonDga).contentType(ContentType.JSON)
                .body(Map.of("motif", "Nouvelle tentative"))
                .when().post("/agents/" + agentId + "/designer-chef")
                .then().statusCode(409)
                .body("code", equalTo("ORGANISATION_CHEF_DEJA_DESIGNE"));
    }

    @Test
    void remplacementDuChefConserveLHistoriqueEtRetireLAncienRole() {
        String jetonDga = creerUtilisateurEtSeConnecter("dga.test3", "DGA");
        String ancienChefId = creerAgentViaApi(jetonDga, "ancien.chef1");
        String nouveauChefId = creerAgentViaApi(jetonDga, "nouveau.chef1");

        given().header("Authorization", "Bearer " + jetonDga).contentType(ContentType.JSON)
                .body(Map.of("motif", "Désignation initiale"))
                .when().post("/agents/" + ancienChefId + "/designer-chef")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + jetonDga).contentType(ContentType.JSON)
                .body(Map.of("motif", "Remplacement pour réorganisation"))
                .when().post("/agents/" + nouveauChefId + "/remplacer-chef")
                .then().statusCode(200);

        Utilisateur ancien = utilisateurRepository.findByIdentifiant("ancien.chef1").orElseThrow();
        Utilisateur nouveau = utilisateurRepository.findByIdentifiant("nouveau.chef1").orElseThrow();
        org.assertj.core.api.Assertions.assertThat(ancien.possedeRole("CHEF_AGENT_TERRAIN")).isFalse();
        org.assertj.core.api.Assertions.assertThat(nouveau.possedeRole("CHEF_AGENT_TERRAIN")).isTrue();

        given().header("Authorization", "Bearer " + jetonDga)
                .when().get("/agents/" + nouveauChefId + "/historique-chef")
                .then().statusCode(200)
                .body("size()", equalTo(2));

        given().header("Authorization", "Bearer " + jetonDga)
                .when().get("/agents/chef?zoneId=" + zoneId)
                .then().statusCode(200)
                .body("id", equalTo(nouveauChefId));
    }

    @Test
    void transfertDePortefeuilleClotLAffectationOuverteEtEnOuvreUneNouvelle() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.org3", "GESTIONNAIRE_COMPTE");
        String jetonDga = creerUtilisateurEtSeConnecter("dga.test4", "DGA");
        String agent1Id = creerAgentViaApi(jetonDga, "agent.portef1");
        String agent2Id = creerAgentViaApi(jetonDga, "agent.portef2");

        UUID activiteId = jdbcTemplate.queryForObject("SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        UUID packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
        String adherentId = given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("nom", "Portefeuille Test", "telephonePrincipal", "677222001",
                        "activiteId", activiteId.toString(), "zoneId", zoneId.toString(),
                        "localisation", "loc", "dateAdhesion", LocalDate.now().toString(),
                        "packId", packId.toString(), "consentementDonnees", true))
                .when().post("/adherents")
                .then().statusCode(201)
                .extract().path("id");

        given().header("Authorization", "Bearer " + jetonDga).contentType(ContentType.JSON)
                .body(Map.of("adherentId", adherentId, "agentId", agent1Id, "motif", "Affectation initiale"))
                .when().post("/portefeuilles/affecter")
                .then().statusCode(204);

        given().header("Authorization", "Bearer " + jetonDga).contentType(ContentType.JSON)
                .body(Map.of("adherentIds", java.util.List.of(adherentId), "nouvelAgentId", agent2Id,
                        "motif", "Réorganisation de zone"))
                .when().post("/portefeuilles/transferer")
                .then().statusCode(204);

        given().header("Authorization", "Bearer " + jetonDga)
                .when().get("/agents/" + agent2Id + "/portefeuille")
                .then().statusCode(200)
                .body("size()", equalTo(1));

        given().header("Authorization", "Bearer " + jetonDga)
                .when().get("/agents/" + agent1Id + "/portefeuille")
                .then().statusCode(200)
                .body("size()", equalTo(0));
    }
}
