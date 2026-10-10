package cm.cositi.api.securite;

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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Parcours bout en bout de l'authentification (jalon J1) : connexion, verrouillage après 5 échecs,
 * rotation du jeton de rafraîchissement, détection de réutilisation, et RBAC positif/négatif sur
 * l'endpoint /audit (AUDIT:CONSULTER) — critère de passage J1 (Conception/JALONS_PROJET_COSITI.md).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class AuthentificationIntegrationTest extends ConfigurationTestsIntegration {

    @LocalServerPort
    private int port;

    @Autowired
    private UtilisateurRepository utilisateurRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PasswordEncoder encodeurMotDePasse;

    private static final String MOT_DE_PASSE = "MotDePasseValide123!";

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
    }

    private Utilisateur creerUtilisateur(String identifiant, String codeRole) {
        Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "Utilisateur Test " + identifiant);
        u.setDoitChangerMotDePasse(false);
        roleRepository.findByCode(codeRole).ifPresent(u::ajouterRole);
        return utilisateurRepository.save(u);
    }

    private String seConnecter(String identifiant, String motDePasse) {
        return given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "motDePasse", motDePasse))
                .when().post("/auth/connexion")
                .then().statusCode(200)
                .extract().path("jetonAcces");
    }

    @Test
    void connexionAvecIdentifiantsValidesRenvoieUnJetonDAccesEtUnCookieDeRafraichissement() {
        creerUtilisateur("agent.test1", "AGENT_TERRAIN");

        given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", "agent.test1", "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(200)
                .body("jetonAcces", notNullValue())
                // Jamais dans le corps JSON (docs/04_SECURITE.md §2) : uniquement en cookie HttpOnly.
                .body("$", not(hasKey("jetonRafraichissement")))
                .cookie("jetonRafraichissement", notNullValue())
                .header("Set-Cookie", org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("HttpOnly"),
                        org.hamcrest.Matchers.containsString("Secure"),
                        org.hamcrest.Matchers.containsString("SameSite=Strict")));
    }

    @Test
    void connexionAvecMauvaisMotDePasseRenvoie401() {
        creerUtilisateur("agent.test2", "AGENT_TERRAIN");

        given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", "agent.test2", "motDePasse", "mauvais-mot-de-passe"))
                .when().post("/auth/connexion")
                .then().statusCode(401)
                .body("code", equalTo("IDENTIFIANTS_INVALIDES"));
    }

    @Test
    void cinqEchecsVerrouillentLeCompte() {
        creerUtilisateur("agent.test3", "AGENT_TERRAIN");

        for (int i = 0; i < 5; i++) {
            given().contentType(ContentType.JSON)
                    .body(Map.of("identifiant", "agent.test3", "motDePasse", "faux"))
                    .when().post("/auth/connexion")
                    .then().statusCode(401);
        }

        // Même avec le bon mot de passe, le compte reste verrouillé.
        given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", "agent.test3", "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(401)
                .body("code", equalTo("COMPTE_VERROUILLE"));
    }

    @Test
    void rafraichissementFaitTournerLeCookieEtLAncienDevientInutilisable() {
        creerUtilisateur("agent.test4", "AGENT_TERRAIN");

        // Le jeton de rafraîchissement ne transite jamais dans le corps JSON : on le récupère depuis le
        // cookie Set-Cookie de la réponse, exactement comme le fait le navigateur (`credentials: "include"`).
        String jetonRafraichissementInitial = given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", "agent.test4", "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(200)
                .extract().cookie("jetonRafraichissement");

        String nouveauJetonRafraichissement = given()
                .cookie("jetonRafraichissement", jetonRafraichissementInitial)
                .when().post("/auth/rafraichir")
                .then().statusCode(200)
                .extract().cookie("jetonRafraichissement");

        assertThat(nouveauJetonRafraichissement).isNotEqualTo(jetonRafraichissementInitial);

        // Réutilisation de l'ancien jeton (déjà consommé) : refusé, toute la famille est révoquée.
        given().cookie("jetonRafraichissement", jetonRafraichissementInitial)
                .when().post("/auth/rafraichir")
                .then().statusCode(403);

        // La famille entière est révoquée : le jeton pourtant valide émis juste avant est lui aussi coupé.
        given().cookie("jetonRafraichissement", nouveauJetonRafraichissement)
                .when().post("/auth/rafraichir")
                .then().statusCode(403);
    }

    @Test
    void rafraichirSansCookieRenvoie401() {
        given().when().post("/auth/rafraichir").then().statusCode(401)
                .body("code", equalTo("JETON_RAFRAICHISSEMENT_ABSENT"));
    }

    @Test
    void auditEstAccessibleAuSuperAdminEtRefuseALAgentDeTerrain() {
        creerUtilisateur("superadmin.test1", "SUPER_ADMIN");
        creerUtilisateur("agent.test5", "AGENT_TERRAIN");

        String jetonSuperAdmin = seConnecter("superadmin.test1", MOT_DE_PASSE);
        String jetonAgent = seConnecter("agent.test5", MOT_DE_PASSE);

        given().header("Authorization", "Bearer " + jetonSuperAdmin)
                .when().get("/audit")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + jetonAgent)
                .when().get("/audit")
                .then().statusCode(403);
    }

    @Test
    void routeProtegeeSansJetonRenvoie401() {
        given().when().get("/audit").then().statusCode(401);
    }

    @Test
    void profilMoiRenvoieLesRolesEtPermissionsEffectives() {
        creerUtilisateur("superadmin.test2", "SUPER_ADMIN");
        String jeton = seConnecter("superadmin.test2", MOT_DE_PASSE);

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/auth/moi")
                .then().statusCode(200)
                .body("identifiant", equalTo("superadmin.test2"))
                .body("roles", org.hamcrest.Matchers.hasItem("SUPER_ADMIN"))
                .body("permissions", org.hamcrest.Matchers.hasItem("AUDIT:CONSULTER"));
    }
}
