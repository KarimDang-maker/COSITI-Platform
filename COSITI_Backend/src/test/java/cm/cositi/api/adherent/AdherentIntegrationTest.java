package cm.cositi.api.adherent;

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
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Parcours adhérent (jalon J2) : création + matricule séquentiel, détection de doublon (téléphone et
 * similarité de nom pg_trgm), recherche filtrée, RBAC positif/négatif, périmètre de portefeuille agent.
 * Critère de passage : Conception/JALONS_PROJET_COSITI.md.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class AdherentIntegrationTest extends ConfigurationTestsIntegration {

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
    private UUID activiteId;
    private UUID packId;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";

        zoneId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO zone (id, code, libelle, ville, region) VALUES (?, ?, ?, ?, ?)",
                zoneId, "Z-" + zoneId.toString().substring(0, 8), "Zone Test", "Douala", "Littoral");

        activiteId = jdbcTemplate.queryForObject("SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
    }

    private String creerUtilisateurEtSeConnecter(String identifiant, String codeRole, UUID agentId) {
        Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "Test " + identifiant);
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

    private UUID creerAgent(String codeAgent) {
        UUID agentId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id) VALUES (?, ?, ?, ?, ?)",
                agentId, codeAgent, "Agent " + codeAgent, "690000000", zoneId);
        return agentId;
    }

    private void ouvrirPortefeuille(UUID adherentId, UUID agentId) {
        jdbcTemplate.update(
                "INSERT INTO affectation_portefeuille (id, adherent_id, agent_id, date_debut) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), adherentId, agentId, LocalDate.now());
    }

    private Map<String, Object> corpsAdherent(String nom, String telephone) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("nom", nom);
        corps.put("telephonePrincipal", telephone);
        corps.put("activiteId", activiteId.toString());
        corps.put("zoneId", zoneId.toString());
        corps.put("localisation", "Marché central");
        corps.put("dateAdhesion", LocalDate.now().toString());
        corps.put("packId", packId.toString());
        corps.put("consentementDonnees", true);
        corps.put("confirmationDoublonIgnore", false);
        return corps;
    }

    @Test
    void creerAdherentReussitEtRenvoieUnMatriculeAuFormatAttendu() {
        String jeton = creerUtilisateurEtSeConnecter("gest.test1", "GESTIONNAIRE_COMPTE", null);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Mbarga Jean", "677111001"))
                .when().post("/adherents")
                .then().statusCode(201)
                .body("matricule", org.hamcrest.Matchers.matchesPattern("COSITI-\\d{5,}"))
                .body("statut", equalTo("PREINSCRIT"));
    }

    @Test
    void creerAdherentRefuseParUnRoleSansPermission() {
        String jeton = creerUtilisateurEtSeConnecter("daf.test1", "DAF", null);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Sans Permission", "677111002"))
                .when().post("/adherents")
                .then().statusCode(403);
    }

    @Test
    void creerAdherentDetecteDoublonParTelephoneEtBloqueSansConfirmation() {
        String jeton = creerUtilisateurEtSeConnecter("gest.test2", "GESTIONNAIRE_COMPTE", null);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Premier Adherent", "677111003"))
                .when().post("/adherents")
                .then().statusCode(201);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Deuxieme Homonyme", "677111003"))
                .when().post("/adherents")
                .then().statusCode(409)
                .body("code", equalTo("ADHERENT_DOUBLON_POTENTIEL"))
                .body("candidats.size()", greaterThanOrEqualTo(1));

        Map<String, Object> corpsConfirme = corpsAdherent("Deuxieme Homonyme", "677111003");
        corpsConfirme.put("confirmationDoublonIgnore", true);
        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsConfirme)
                .when().post("/adherents")
                .then().statusCode(201);
    }

    @Test
    void verifierDoublonDetecteLaSimilariteDeNomDansLaMemeZone() {
        String jeton = creerUtilisateurEtSeConnecter("gest.test3", "GESTIONNAIRE_COMPTE", null);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Atangana Bertrand", "677111004"))
                .when().post("/adherents")
                .then().statusCode(201);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(Map.of("nomComplet", "Atangana Bertrand", "zoneId", zoneId.toString()))
                .when().post("/adherents/verifier-doublon")
                .then().statusCode(200)
                .body("candidats.size()", greaterThanOrEqualTo(1));
    }

    @Test
    void agentNeVoitQueLesAdherentsDeSonPortefeuilleOuvert() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.test4", "GESTIONNAIRE_COMPTE", null);
        UUID adherentId = UUID.fromString(given().header("Authorization", "Bearer " + jetonGestionnaire)
                .contentType(ContentType.JSON)
                .body(corpsAdherent("Fotso Divine", "677111005"))
                .when().post("/adherents")
                .then().statusCode(201)
                .extract().path("id"));

        UUID agentTitulaireId = creerAgent("AG-TITULAIRE");
        UUID agentAutreId = creerAgent("AG-AUTRE");
        ouvrirPortefeuille(adherentId, agentTitulaireId);

        String jetonAgentTitulaire = creerUtilisateurEtSeConnecter("agent.titulaire", "AGENT_TERRAIN", agentTitulaireId);
        String jetonAgentAutre = creerUtilisateurEtSeConnecter("agent.autre", "AGENT_TERRAIN", agentAutreId);

        given().header("Authorization", "Bearer " + jetonAgentTitulaire)
                .when().get("/adherents/" + adherentId)
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + jetonAgentAutre)
                .when().get("/adherents/" + adherentId)
                .then().statusCode(403);
    }

    @Test
    void changerStatutExigeUnMotifEtRefuseDepuisRadie() {
        String jeton = creerUtilisateurEtSeConnecter("gest.test5", "GESTIONNAIRE_COMPTE", null);
        UUID adherentId = UUID.fromString(given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(corpsAdherent("Ngo Marie", "677111006"))
                .when().post("/adherents")
                .then().statusCode(201)
                .extract().path("id"));

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(Map.of("statut", "RADIE", "motif", ""))
                .when().post("/adherents/" + adherentId + "/statut")
                .then().statusCode(400);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(Map.of("statut", "RADIE", "motif", "Décès signalé par la famille"))
                .when().post("/adherents/" + adherentId + "/statut")
                .then().statusCode(204);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(Map.of("statut", "ACTIF", "motif", "Tentative de réactivation"))
                .when().post("/adherents/" + adherentId + "/statut")
                .then().statusCode(409)
                .body("code", equalTo("ADHERENT_STATUT_TERMINAL"));
    }

    /**
     * RAPORT_V1.md §6.3/§7.2 : un changement de pack/allocation après création n'est plus appliqué
     * directement par la Gestionnaire — elle propose, le DAF valide et l'application se produit alors
     * seulement (séparation des tâches).
     */
    @Test
    void changementAllocationEstApplqueSeulementApresValidationDuDaf() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.test6", "GESTIONNAIRE_COMPTE", null);
        String jetonDaf = creerUtilisateurEtSeConnecter("daf.test6", "DAF", null);
        UUID adherentId = UUID.fromString(given().header("Authorization", "Bearer " + jetonGestionnaire)
                .contentType(ContentType.JSON)
                .body(corpsAdherent("Biya Samuel", "677111007"))
                .when().post("/adherents")
                .then().statusCode(201)
                .extract().path("id"));

        UUID pack1000Id = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_1000'", UUID.class);

        // La Gestionnaire propose : rien n'est encore appliqué.
        UUID demandeId = UUID.fromString(given().header("Authorization", "Bearer " + jetonGestionnaire)
                .contentType(ContentType.JSON)
                .body(Map.of("packId", pack1000Id.toString(), "montantReference", 1000,
                        "allocationSecuriteSociale", 700, "allocationEpargne", 300))
                .when().post("/adherents/" + adherentId + "/allocation-changes")
                .then().statusCode(201)
                .body("statut", equalTo("EN_ATTENTE"))
                .extract().path("id"));

        // La Gestionnaire n'a pas la permission de valider (réservée au DAF).
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("approuver", true))
                .when().post("/adherents/" + adherentId + "/allocation-changes/" + demandeId + "/validate")
                .then().statusCode(403);

        // Le DAF valide : le pack est désormais appliqué.
        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("approuver", true, "motif", "Conforme à la demande de l'adhérent"))
                .when().post("/adherents/" + adherentId + "/allocation-changes/" + demandeId + "/validate")
                .then().statusCode(200)
                .body("statut", equalTo("VALIDEE"));

        Integer nbAdhesionsOuvertes = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM adhesion WHERE adherent_id = ? AND date_fin IS NULL AND pack_id = ?",
                Integer.class, adherentId, pack1000Id);
        org.assertj.core.api.Assertions.assertThat(nbAdhesionsOuvertes).isEqualTo(1);
    }
}
