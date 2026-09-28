package cm.cositi.api.compterendu;

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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Chaîne hiérarchique terrain, bout en bout via l'API réelle (jalon J8).
 *
 * <p>Couvre les cas de recette de {@code Roles des acteurs.md §15} : {@code REC-H04} (l'agent produit, le
 * Gestionnaire reçoit), {@code REC-H05} (contrôle), {@code REC-H06} (consolidation et transmission à la
 * DGA), {@code REC-H07} (le Chef ne voit que son périmètre), plus le RBAC négatif du domaine.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class CompteRenduIntegrationTest extends ConfigurationTestsIntegration {

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
    private UUID agentId;
    private UUID autreAgentId;
    private String jetonAgent;
    private String jetonAutreAgent;
    private String jetonGestionnaire;
    private String jetonDga;
    private UUID idGestionnaire;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";

        suffixe = UUID.randomUUID().toString().substring(0, 8);
        zoneId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO zone (id, code, libelle, ville, region) VALUES (?, ?, ?, ?, ?)",
                zoneId, "Z-CR-" + suffixe, "Zone Comptes Rendus", "Douala", "Littoral");

        agentId = creerAgent("AG-CR-" + suffixe, null);
        autreAgentId = creerAgent("AG-CR2-" + suffixe, null);

        jetonAgent = creerUtilisateur("agent.cr." + suffixe, "AGENT_TERRAIN", agentId);
        jetonAutreAgent = creerUtilisateur("agent2.cr." + suffixe, "AGENT_TERRAIN", autreAgentId);
        jetonGestionnaire = creerUtilisateur("gest.cr." + suffixe, "GESTIONNAIRE_COMPTE", null);
        jetonDga = creerUtilisateur("dga.cr." + suffixe, "DGA", null);

        idGestionnaire = jdbcTemplate.queryForObject(
                "SELECT id FROM utilisateur WHERE identifiant = ?", UUID.class, "gest.cr." + suffixe);
    }

    // ------------------------------------------------------- REC-H04 / REC-H05

    @Test
    void un_agent_produit_un_compte_rendu_et_le_gestionnaire_le_recoit() {
        UUID compteRenduId = produireCompteRendu(jetonAgent, 12, 9, 2, 5, "35000", "Tournée du marché");

        // Encore en brouillon : l'agent peut le relire avant de l'envoyer.
        given().header("Authorization", "Bearer " + jetonAgent)
                .when().get("/comptes-rendus/" + compteRenduId)
                .then().statusCode(200)
                .body("statut", equalTo("BROUILLON"))
                .body("agentId", equalTo(agentId.toString()))
                .body("zoneId", equalTo(zoneId.toString()));

        given().header("Authorization", "Bearer " + jetonAgent)
                .when().post("/comptes-rendus/" + compteRenduId + "/transmettre")
                .then().statusCode(200)
                .body("statut", equalTo("TRANSMIS"))
                .body("transmisLe", notNullValue());

        // REC-H04 : le Gestionnaire des comptes est notifié.
        Integer notifications = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM notification
                WHERE destinataire_utilisateur_id = ? AND type = 'COMPTE_RENDU_TERRAIN' AND entite_id = ?
                """, Integer.class, idGestionnaire, compteRenduId);
        assertThat(notifications).isEqualTo(1);

        // REC-H05 : il le contrôle, et l'agent en est informé en retour.
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("observation", "Chiffres cohérents avec les paiements enregistrés"))
                .when().post("/comptes-rendus/" + compteRenduId + "/controler")
                .then().statusCode(200)
                .body("statut", equalTo("CONTROLE"))
                .body("observationControle", equalTo("Chiffres cohérents avec les paiements enregistrés"))
                .body("controlePar", equalTo("gest.cr." + suffixe));
    }

    @Test
    void un_compte_rendu_transmis_n_est_plus_modifiable_par_son_auteur() {
        UUID compteRenduId = produireCompteRendu(jetonAgent, 3, 3, 0, 1, "7000", "Courte tournée");
        transmettre(jetonAgent, compteRenduId);

        given().header("Authorization", "Bearer " + jetonAgent).contentType(ContentType.JSON)
                .body(corpsCompteRendu(99, 99, 99, 99, "999999", "Version réécrite"))
                .when().put("/comptes-rendus/" + compteRenduId)
                .then().statusCode(409)
                .body("code", equalTo("COMPTE_RENDU_NON_MODIFIABLE"));
    }

    @Test
    void un_agent_ne_peut_pas_controler_un_compte_rendu() {
        UUID compteRenduId = produireCompteRendu(jetonAgent, 1, 1, 0, 0, "1000", null);
        transmettre(jetonAgent, compteRenduId);

        // COMPTE_RENDU:CONTROLER n'est accordé qu'au Gestionnaire des comptes (V10).
        given().header("Authorization", "Bearer " + jetonAutreAgent).contentType(ContentType.JSON)
                .body(Map.of("observation", "Je valide"))
                .when().post("/comptes-rendus/" + compteRenduId + "/controler")
                .then().statusCode(403);
    }

    @Test
    void un_agent_ne_peut_pas_transmettre_le_compte_rendu_d_un_autre() {
        UUID compteRenduId = produireCompteRendu(jetonAgent, 1, 1, 0, 0, "1000", null);

        given().header("Authorization", "Bearer " + jetonAutreAgent)
                .when().post("/comptes-rendus/" + compteRenduId + "/transmettre")
                .then().statusCode(403)
                .body("code", equalTo("COMPTE_RENDU_ETRANGER"));
    }

    // ------------------------------------------------------------------ REC-H06

    @Test
    void le_gestionnaire_consolide_puis_transmet_a_la_dga_avec_la_trace_des_sources() {
        UUID premier = produireCompteRendu(jetonAgent, 10, 8, 1, 4, "20000", "Pluie deux jours");
        UUID second = produireCompteRendu(jetonAutreAgent, 5, 5, 2, 3, "15000", "Route coupée");
        transmettre(jetonAgent, premier);
        transmettre(jetonAutreAgent, second);
        controler(premier);
        controler(second);

        String consolideId = given().header("Authorization", "Bearer " + jetonGestionnaire)
                .contentType(ContentType.JSON)
                .body(Map.of("compteRenduIds", List.of(premier.toString(), second.toString()),
                        "synthese", "Semaine correcte malgré la météo"))
                .when().post("/comptes-rendus/consolider")
                .then().statusCode(201)
                .body("type", equalTo("CONSOLIDE"))
                // Somme exacte des sources : une addition, jamais une règle inventée.
                .body("nbVisites", equalTo(15))
                .body("nbAdherentsRencontres", equalTo(13))
                .body("nbAdherentsCrees", equalTo(3))
                .body("nbPaiementsEnregistres", equalTo(7))
                .body("montantCollecte", equalTo(35000.0f))
                .body("sourceIds", hasSize(2))
                // Les difficultés du terrain sont conservées, pas résumées à la place des agents.
                .body("difficultes", org.hamcrest.Matchers.containsString("Pluie"))
                .body("difficultes", org.hamcrest.Matchers.containsString("Route coupée"))
                .extract().path("id");

        // Les sources passent à CONSOLIDE : elles ne peuvent plus être consolidées deux fois.
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/comptes-rendus/" + premier)
                .then().statusCode(200).body("statut", equalTo("CONSOLIDE"));

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().post("/comptes-rendus/" + consolideId + "/transmettre")
                .then().statusCode(200).body("statut", equalTo("TRANSMIS"));

        // REC-H06 : la DGA est informée, et peut remonter aux sources.
        UUID idDga = jdbcTemplate.queryForObject("SELECT id FROM utilisateur WHERE identifiant = ?", UUID.class,
                "dga.cr." + suffixe);
        Integer notifications = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM notification
                WHERE destinataire_utilisateur_id = ? AND type = 'COMPTE_RENDU_CONSOLIDE'
                """, Integer.class, idDga);
        assertThat(notifications).isEqualTo(1);

        given().header("Authorization", "Bearer " + jetonDga)
                .when().get("/comptes-rendus/" + consolideId)
                .then().statusCode(200)
                .body("sourceIds", hasItem(premier.toString()))
                .body("sourceIds", hasItem(second.toString()));
    }

    @Test
    void refuse_de_consolider_un_compte_rendu_non_controle() {
        UUID compteRenduId = produireCompteRendu(jetonAgent, 2, 2, 0, 1, "5000", null);
        transmettre(jetonAgent, compteRenduId);

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("compteRenduIds", List.of(compteRenduId.toString())))
                .when().post("/comptes-rendus/consolider")
                .then().statusCode(409)
                .body("code", equalTo("COMPTE_RENDU_NON_CONTROLE"));
    }

    @Test
    void personne_ne_controle_son_propre_compte_rendu() {
        // Le Gestionnaire porte aussi AGENT_TERRAIN dans ce scénario : il pourrait produire puis contrôler.
        UUID agentDuGestionnaire = creerAgent("AG-GEST-" + suffixe, null);
        jdbcTemplate.update("UPDATE utilisateur SET agent_id = ? WHERE identifiant = ?",
                agentDuGestionnaire, "gest.cr." + suffixe);
        jdbcTemplate.update("""
                INSERT INTO utilisateur_role (utilisateur_id, role_id)
                SELECT ?, id FROM role WHERE code = 'AGENT_TERRAIN'
                ON CONFLICT DO NOTHING
                """, idGestionnaire);

        String jeton = seConnecter("gest.cr." + suffixe);
        UUID compteRenduId = produireCompteRendu(jeton, 1, 1, 0, 0, "1000", null);
        transmettre(jeton, compteRenduId);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(Map.of("observation", "Je me contrôle moi-même"))
                .when().post("/comptes-rendus/" + compteRenduId + "/controler")
                .then().statusCode(403)
                .body("code", equalTo("COMPTE_RENDU_AUTO_CONTROLE"));
    }

    // ------------------------------------------------------------------ REC-H07

    @Test
    void un_agent_ne_voit_pas_le_compte_rendu_d_un_agent_qu_il_ne_supervise_pas() {
        UUID compteRenduId = produireCompteRendu(jetonAgent, 4, 4, 0, 2, "9000", null);

        given().header("Authorization", "Bearer " + jetonAutreAgent)
                .when().get("/comptes-rendus/" + compteRenduId)
                .then().statusCode(403)
                .body("code", equalTo("COMPTE_RENDU_HORS_PERIMETRE"));
    }

    @Test
    void le_chef_voit_les_comptes_rendus_des_agents_de_son_equipe() {
        // Le Chef est un Agent de terrain désigné ; l'agent testé lui est rattaché par `chef_agent_id`.
        UUID chefAgentId = creerAgent("AG-CHEF-" + suffixe, null);
        jdbcTemplate.update("UPDATE agent SET chef_agent_id = ? WHERE id = ?", chefAgentId, agentId);
        String jetonChef = creerUtilisateur("chef.cr." + suffixe, "CHEF_AGENT_TERRAIN", chefAgentId);

        UUID compteRenduId = produireCompteRendu(jetonAgent, 6, 6, 1, 3, "12000", null);

        given().header("Authorization", "Bearer " + jetonChef)
                .when().get("/comptes-rendus/" + compteRenduId)
                .then().statusCode(200)
                .body("agentId", equalTo(agentId.toString()));
    }

    // ------------------------------------------------------------------ Fixtures

    private Map<String, Object> corpsCompteRendu(int visites, int rencontres, int crees, int paiements,
                                                  String montant, String synthese) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("periodeDebut", LocalDate.now().minusDays(7).toString());
        corps.put("periodeFin", LocalDate.now().minusDays(1).toString());
        corps.put("nbVisites", visites);
        corps.put("nbAdherentsRencontres", rencontres);
        corps.put("nbAdherentsCrees", crees);
        corps.put("nbPaiementsEnregistres", paiements);
        corps.put("montantCollecte", montant);
        corps.put("synthese", synthese);
        corps.put("difficultes", synthese);
        return corps;
    }

    private UUID produireCompteRendu(String jeton, int visites, int rencontres, int crees, int paiements,
                                      String montant, String synthese) {
        String id = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsCompteRendu(visites, rencontres, crees, paiements, montant, synthese))
                .when().post("/comptes-rendus")
                .then().statusCode(201)
                .extract().path("id");
        return UUID.fromString(id);
    }

    private void transmettre(String jeton, UUID compteRenduId) {
        given().header("Authorization", "Bearer " + jeton)
                .when().post("/comptes-rendus/" + compteRenduId + "/transmettre")
                .then().statusCode(200);
    }

    private void controler(UUID compteRenduId) {
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("observation", "Contrôlé"))
                .when().post("/comptes-rendus/" + compteRenduId + "/controler")
                .then().statusCode(200);
    }

    private UUID creerAgent(String codeAgent, UUID chefAgentId) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id, chef_agent_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """, id, codeAgent, "Agent " + codeAgent, "690000055", zoneId, chefAgentId);
        return id;
    }

    private String creerUtilisateur(String identifiant, String codeRole, UUID agentId) {
        Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "Test " + identifiant);
        u.setDoitChangerMotDePasse(false);
        u.setAgentId(agentId);
        roleRepository.findByCode(codeRole).ifPresent(u::ajouterRole);
        // Un Chef des agents de terrain porte aussi AGENT_TERRAIN (V5, rôle additionnel superposé).
        if ("CHEF_AGENT_TERRAIN".equals(codeRole)) {
            roleRepository.findByCode("AGENT_TERRAIN").ifPresent(u::ajouterRole);
        }
        utilisateurRepository.save(u);
        return seConnecter(identifiant);
    }

    private String seConnecter(String identifiant) {
        return given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(200)
                .extract().path("jetonAcces");
    }
}
