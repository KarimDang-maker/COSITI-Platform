package cm.cositi.api.cotisation;

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
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Contrôle DAF (jalon J5) : confirmation hiérarchique du Chef (UC-CHEF-10), signalement d'incohérence par le
 * DAF, transition interdite (validation d'un paiement incohérent), résolution par correction, écran de triage
 * DAF (filtre générique déjà existant). Critère de passage : Conception/JALONS_PROJET_COSITI.md. Le
 * rapprochement mobile money reste explicitement hors périmètre (P1).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class ControleDafIntegrationTest extends ConfigurationTestsIntegration {

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
                zoneId, "Z-DAF-" + zoneId.toString().substring(0, 8), "Zone Controle DAF", "Douala", "Littoral");
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

    private UUID creerAgent(String codeAgent, UUID chefAgentId) {
        UUID agentId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id, chef_agent_id) VALUES (?, ?, ?, ?, ?, ?)",
                agentId, codeAgent, "Agent " + codeAgent, "690000098", zoneId, chefAgentId);
        return agentId;
    }

    private UUID creerAdherent(String jetonGestionnaire) {
        UUID activiteId = jdbcTemplate.queryForObject("SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        UUID packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
        String telephoneUnique = "6" + String.format("%08d", Math.abs(UUID.randomUUID().hashCode() % 100_000_000));
        String id = given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("nom", "Adherent DAF Test", "telephonePrincipal", telephoneUnique,
                        "activiteId", activiteId.toString(), "zoneId", zoneId.toString(),
                        "localisation", "loc", "dateAdhesion", LocalDate.now().minusMonths(3).toString(),
                        "packId", packId.toString(), "consentementDonnees", true))
                .when().post("/adherents")
                .then().statusCode(201)
                .extract().path("id");
        return UUID.fromString(id);
    }

    private void ouvrirPortefeuille(UUID adherentId, UUID agentId) {
        jdbcTemplate.update(
                "INSERT INTO affectation_portefeuille (id, adherent_id, agent_id, date_debut) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), adherentId, agentId, LocalDate.now());
    }

    private String creerPaiementACtrole(String jetonAgent, UUID adherentId, UUID agentEncaisseurId, int montant) {
        return given().header("Authorization", "Bearer " + jetonAgent)
                .header("Idempotency-Key", UUID.randomUUID().toString()).contentType(ContentType.JSON)
                .body(Map.of("adherentId", adherentId.toString(), "datePaiement", LocalDate.now().toString(),
                        "montant", montant, "modePaiement", "ESPECES", "typePaiement", "COTISATION",
                        "agentEncaisseurId", agentEncaisseurId.toString()))
                .when().post("/paiements")
                .then().statusCode(201)
                .extract().path("id");
    }

    @Test
    void chefConfirmeUneCollecteDansSonPerimetreEtLaudit() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.daf1", "GESTIONNAIRE_COMPTE", null);
        UUID adherentId = creerAdherent(jetonGestionnaire);

        UUID chefAgentId = creerAgent("AG-CHEF-1", null);
        UUID encaisseurId = creerAgent("AG-ENC-1", chefAgentId);
        ouvrirPortefeuille(adherentId, encaisseurId);

        String jetonAgent = creerUtilisateurEtSeConnecter("agent.daf1", "AGENT_TERRAIN", encaisseurId);
        String jetonChef = creerUtilisateurEtSeConnecter("chef.daf1", "CHEF_AGENT_TERRAIN", chefAgentId);

        String paiementId = creerPaiementACtrole(jetonAgent, adherentId, encaisseurId, 1000);

        given().header("Authorization", "Bearer " + jetonChef)
                .queryParam("motif", "Contrôle terrain effectué")
                .when().post("/paiements/" + paiementId + "/confirmer-chef")
                .then().statusCode(200)
                .body("confirmeParChefId", notNullValue())
                .body("statut", equalTo("A_CONTROLER"));

        // Deuxième confirmation : conflit.
        given().header("Authorization", "Bearer " + jetonChef)
                .when().post("/paiements/" + paiementId + "/confirmer-chef")
                .then().statusCode(409)
                .body("code", equalTo("PAIEMENT_DEJA_CONFIRME_CHEF"));

        long nbAudits = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM journal_audit WHERE type_operation = 'PAIEMENT_CONFIRMATION_CHEF' AND entite_id = ?::uuid",
                Long.class, paiementId);
        org.assertj.core.api.Assertions.assertThat(nbAudits).isGreaterThanOrEqualTo(1);
    }

    @Test
    void chefNePeutPasConfirmerHorsDeSonPerimetre() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.daf2", "GESTIONNAIRE_COMPTE", null);
        UUID adherentId = creerAdherent(jetonGestionnaire);

        UUID autreChefAgentId = creerAgent("AG-CHEF-2", null);
        UUID encaisseurNonSupervise = creerAgent("AG-ENC-2", null); // pas rattaché au chef ci-dessus
        ouvrirPortefeuille(adherentId, encaisseurNonSupervise);

        String jetonAgent = creerUtilisateurEtSeConnecter("agent.daf2", "AGENT_TERRAIN", encaisseurNonSupervise);
        String jetonChef = creerUtilisateurEtSeConnecter("chef.daf2", "CHEF_AGENT_TERRAIN", autreChefAgentId);

        String paiementId = creerPaiementACtrole(jetonAgent, adherentId, encaisseurNonSupervise, 1000);

        given().header("Authorization", "Bearer " + jetonChef)
                .when().post("/paiements/" + paiementId + "/confirmer-chef")
                .then().statusCode(403)
                .body("code", equalTo("PAIEMENT_HORS_PERIMETRE_CHEF"));
    }

    @Test
    void seulLeChefPeutConfirmerUnAutreRoleEstRefuse() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.daf3", "GESTIONNAIRE_COMPTE", null);
        UUID adherentId = creerAdherent(jetonGestionnaire);
        UUID agentId = creerAgent("AG-ENC-3", null);
        ouvrirPortefeuille(adherentId, agentId);
        String jetonAgent = creerUtilisateurEtSeConnecter("agent.daf3", "AGENT_TERRAIN", agentId);

        String paiementId = creerPaiementACtrole(jetonAgent, adherentId, agentId, 1000);

        // L'agent lui-même ne porte pas la permission PAIEMENT:CONFIRMER_CHEF.
        given().header("Authorization", "Bearer " + jetonAgent)
                .when().post("/paiements/" + paiementId + "/confirmer-chef")
                .then().statusCode(403);
    }

    @Test
    void dafSignaleUneIncoherenceBloqueLaValidationEtLaCorrectionLaResout() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.daf4", "GESTIONNAIRE_COMPTE", null);
        UUID adherentId = creerAdherent(jetonGestionnaire);
        UUID agentId = creerAgent("AG-ENC-4", null);
        ouvrirPortefeuille(adherentId, agentId);
        String jetonAgent = creerUtilisateurEtSeConnecter("agent.daf4", "AGENT_TERRAIN", agentId);
        String jetonDaf = creerUtilisateurEtSeConnecter("daf.daf4", "DAF", null);

        String paiementId = creerPaiementACtrole(jetonAgent, adherentId, agentId, 1000);

        // Motif obligatoire.
        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("motif", ""))
                .when().post("/paiements/" + paiementId + "/signaler-incoherence")
                .then().statusCode(400);

        // Un Chef ne peut pas signaler une incohérence (réservé DAF) — même sans le rôle DAF, la permission
        // PAIEMENT:SIGNALER_INCOHERENCE n'est accordée qu'au DAF (V8__permissions_j5_j6.sql).
        given().header("Authorization", "Bearer " + jetonAgent).contentType(ContentType.JSON)
                .body(Map.of("motif", "Tentative non autorisée"))
                .when().post("/paiements/" + paiementId + "/signaler-incoherence")
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("motif", "Montant ne correspond pas au justificatif"))
                .when().post("/paiements/" + paiementId + "/signaler-incoherence")
                .then().statusCode(200)
                .body("statut", equalTo("INCOHERENCE"));

        // Transition interdite : un paiement incohérent ne peut pas être validé.
        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(409)
                .body("code", equalTo("PAIEMENT_TRANSITION_INTERDITE"));

        // L'écran de triage DAF (filtre générique déjà existant depuis J4) retrouve le paiement à contrôler ;
        // ici il est en INCOHERENCE, donc absent du filtre A_CONTROLER...
        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/paiements?statut=INCOHERENCE")
                .then().statusCode(200)
                .body("totalElements", greaterThanOrEqualTo(1));

        // ... la correction résout l'incohérence et rouvre le paiement au contrôle.
        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("motif", "Justificatif reçu, montant confirmé"))
                .when().post("/paiements/" + paiementId + "/corriger")
                .then().statusCode(200)
                .body("statut", equalTo("A_CONTROLER"));

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/paiements?statut=A_CONTROLER")
                .then().statusCode(200)
                .body("totalElements", greaterThanOrEqualTo(1));

        // Désormais validable normalement.
        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(200)
                .body("statut", equalTo("VALIDE"));

        long nbAudits = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM journal_audit WHERE type_operation = 'PAIEMENT_SIGNALEMENT_INCOHERENCE' AND entite_id = ?::uuid",
                Long.class, paiementId);
        org.assertj.core.api.Assertions.assertThat(nbAudits).isGreaterThanOrEqualTo(1);
    }
}
