package cm.cositi.api.cotisation;

import cm.cositi.api.ConfigurationTestsIntegration;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.repository.PaiementRepository;
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
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.matchesPattern;

/**
 * Cotisations (jalon J4) : enregistrement de paiement, référence obligatoire mobile money, idempotence,
 * séparation saisie/validation, affectation par défaut (COOPERATIVE, règle [V] non validée), remise de caisse.
 * Critère de passage : Conception/JALONS_PROJET_COSITI.md.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class CotisationIntegrationTest extends ConfigurationTestsIntegration {

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
    @Autowired
    private PaiementRepository paiementRepository;

    private static final String MOT_DE_PASSE = "MotDePasseValide123!";
    private UUID zoneId;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";

        zoneId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO zone (id, code, libelle, ville, region) VALUES (?, ?, ?, ?, ?)",
                zoneId, "Z-" + zoneId.toString().substring(0, 8), "Zone Cotis Test", "Douala", "Littoral");
    }

    private String creerUtilisateurEtSeConnecter(String identifiant, String codeRole) {
        return creerUtilisateurEtSeConnecter(identifiant, codeRole, null);
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

    private UUID creerAdherent(String jetonGestionnaire) {
        UUID activiteId = jdbcTemplate.queryForObject("SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        UUID packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
        // Téléphone unique par appel : chaque test method de cette classe partage la même base
        // (conteneur Testcontainers "singleton", pas de reset entre tests) — un numéro fixe déclencherait
        // la détection de doublon (jalon J2) dès le deuxième appel.
        String telephoneUnique = "6" + String.format("%08d", Math.abs(UUID.randomUUID().hashCode() % 100_000_000));
        String id = given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("nom", "Cotisant Test", "telephonePrincipal", telephoneUnique,
                        "activiteId", activiteId.toString(), "zoneId", zoneId.toString(),
                        "localisation", "loc", "dateAdhesion", LocalDate.now().minusMonths(3).toString(),
                        "packId", packId.toString(), "consentementDonnees", true))
                .when().post("/adherents")
                .then().statusCode(201)
                .extract().path("id");
        return UUID.fromString(id);
    }

    private UUID creerAgent(String codeAgent) {
        UUID agentId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id) VALUES (?, ?, ?, ?, ?)",
                agentId, codeAgent, "Agent " + codeAgent, "690000099", zoneId);
        return agentId;
    }

    private void ouvrirPortefeuille(UUID adherentId, UUID agentId) {
        jdbcTemplate.update(
                "INSERT INTO affectation_portefeuille (id, adherent_id, agent_id, date_debut) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), adherentId, agentId, LocalDate.now());
    }

    /**
     * Crée un adhérent puis l'affecte au portefeuille ouvert d'un agent de terrain fraîchement connecté :
     * le périmètre de données (jalon J2/J3) restreint AGENT_TERRAIN à son propre portefeuille, un paiement
     * ne peut donc être saisi que pour un adhérent qui y figure.
     */
    private FixtureCotisation creerFixture(String jetonGestionnaire, String suffixe) {
        UUID adherent = creerAdherent(jetonGestionnaire);
        UUID agentId = creerAgent("AG-COTIS-" + suffixe);
        ouvrirPortefeuille(adherent, agentId);
        String jetonAgent = creerUtilisateurEtSeConnecter("agent.cotis" + suffixe, "AGENT_TERRAIN", agentId);
        return new FixtureCotisation(adherent, agentId, jetonAgent);
    }

    private record FixtureCotisation(UUID adherentId, UUID agentId, String jetonAgent) {
    }

    @Test
    void enregistrementSansIdempotencyKeyEstRefuse() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.cotis1", "GESTIONNAIRE_COMPTE");
        FixtureCotisation f = creerFixture(jetonGestionnaire, "1");

        given().header("Authorization", "Bearer " + f.jetonAgent()).contentType(ContentType.JSON)
                .body(Map.of("adherentId", f.adherentId().toString(), "datePaiement", LocalDate.now().toString(),
                        "montant", 1000, "modePaiement", "ESPECES", "typePaiement", "COTISATION"))
                .when().post("/paiements")
                .then().statusCode(400)
                .body("code", equalTo("IDEMPOTENCY_KEY_MANQUANTE"));
    }

    @Test
    void enregistrementOrangeMoneySansReferenceEstRefuse() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.cotis2", "GESTIONNAIRE_COMPTE");
        FixtureCotisation f = creerFixture(jetonGestionnaire, "2");

        given().header("Authorization", "Bearer " + f.jetonAgent()).header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(ContentType.JSON)
                .body(Map.of("adherentId", f.adherentId().toString(), "datePaiement", LocalDate.now().toString(),
                        "montant", 1000, "modePaiement", "ORANGE_MONEY", "typePaiement", "COTISATION"))
                .when().post("/paiements")
                .then().statusCode(400)
                .body("code", equalTo("PAIEMENT_REFERENCE_MANQUANTE"));
    }

    @Test
    void memeClaIdempotenceRenvoieLeMemePaiementSansDoublon() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.cotis3", "GESTIONNAIRE_COMPTE");
        FixtureCotisation f = creerFixture(jetonGestionnaire, "3");
        String cle = UUID.randomUUID().toString();

        Map<String, Object> corps = Map.of("adherentId", f.adherentId().toString(), "datePaiement", LocalDate.now().toString(),
                "montant", 1500, "modePaiement", "ESPECES", "typePaiement", "COTISATION");

        String premierId = given().header("Authorization", "Bearer " + f.jetonAgent()).header("Idempotency-Key", cle)
                .contentType(ContentType.JSON).body(corps)
                .when().post("/paiements")
                .then().statusCode(201)
                .extract().path("id");

        given().header("Authorization", "Bearer " + f.jetonAgent()).header("Idempotency-Key", cle)
                .contentType(ContentType.JSON).body(corps)
                .when().post("/paiements")
                .then().statusCode(200)
                .body("id", equalTo(premierId));
    }

    @Test
    void creerPuisValiderAvecSeparationSaisieValidationEtAffectationParDefaut() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.cotis4", "GESTIONNAIRE_COMPTE");
        FixtureCotisation f = creerFixture(jetonGestionnaire, "4");
        String jetonDaf = creerUtilisateurEtSeConnecter("daf.cotis4", "DAF");

        String paiementId = given().header("Authorization", "Bearer " + f.jetonAgent())
                .header("Idempotency-Key", UUID.randomUUID().toString()).contentType(ContentType.JSON)
                .body(Map.of("adherentId", f.adherentId().toString(), "datePaiement", LocalDate.now().toString(),
                        "montant", 2000, "modePaiement", "ESPECES", "typePaiement", "COTISATION"))
                .when().post("/paiements")
                .then().statusCode(201)
                .body("numeroRecu", matchesPattern("REC-\\d{6,}"))
                .body("statut", equalTo("A_CONTROLER"))
                .extract().path("id");

        // Le créateur (agent) ne peut pas valider son propre paiement — il n'a d'ailleurs pas PAIEMENT:VALIDER.
        given().header("Authorization", "Bearer " + f.jetonAgent())
                .when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(200)
                .body("statut", equalTo("VALIDE"));

        // Un deuxième appel de validation est un conflit de transition.
        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(409)
                .body("code", equalTo("PAIEMENT_DEJA_VALIDE"));

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/paiements/" + paiementId + "/affectations")
                .then().statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].montant", equalTo(2000.0f))
                .body("[0].regleAppliquee", equalTo("PAR_DEFAUT_COOPERATIVE_NON_VALIDEE"));
    }

    @Test
    void annulerExigeUnMotifEtRendLePaiementDefinitivementFerme() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.cotis5", "GESTIONNAIRE_COMPTE");
        FixtureCotisation f = creerFixture(jetonGestionnaire, "5");
        String jetonDaf = creerUtilisateurEtSeConnecter("daf.cotis5", "DAF");

        String paiementId = given().header("Authorization", "Bearer " + f.jetonAgent())
                .header("Idempotency-Key", UUID.randomUUID().toString()).contentType(ContentType.JSON)
                .body(Map.of("adherentId", f.adherentId().toString(), "datePaiement", LocalDate.now().toString(),
                        "montant", 3000, "modePaiement", "ESPECES", "typePaiement", "COTISATION"))
                .when().post("/paiements")
                .then().statusCode(201)
                .extract().path("id");

        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("motif", ""))
                .when().post("/paiements/" + paiementId + "/annuler")
                .then().statusCode(400);

        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("motif", "Erreur de saisie, montant incorrect"))
                .when().post("/paiements/" + paiementId + "/annuler")
                .then().statusCode(204);

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/paiements/" + paiementId)
                .then().statusCode(200)
                .body("statut", equalTo("ANNULE"));
    }

    @Test
    void modificationConcurrenteDeclencheUnConflitDeVerrouOptimiste() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.cotis7", "GESTIONNAIRE_COMPTE");
        FixtureCotisation f = creerFixture(jetonGestionnaire, "7");

        String paiementId = given().header("Authorization", "Bearer " + f.jetonAgent())
                .header("Idempotency-Key", UUID.randomUUID().toString()).contentType(ContentType.JSON)
                .body(Map.of("adherentId", f.adherentId().toString(), "datePaiement", LocalDate.now().toString(),
                        "montant", 4000, "modePaiement", "ESPECES", "typePaiement", "COTISATION"))
                .when().post("/paiements")
                .then().statusCode(201)
                .extract().path("id");
        UUID id = UUID.fromString(paiementId);

        // Deux chargements indépendants (chacun sa propre transaction/persistance, cf. AGENTS.md §7 verrou optimiste).
        Paiement premierChargement = paiementRepository.findById(id).orElseThrow();
        Paiement deuxiemeChargement = paiementRepository.findById(id).orElseThrow();

        premierChargement.modifierMontant(BigDecimal.valueOf(4100));
        paiementRepository.save(premierChargement);

        deuxiemeChargement.modifierMontant(BigDecimal.valueOf(4200));
        assertThatThrownBy(() -> paiementRepository.save(deuxiemeChargement))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
    }

    @Test
    void remiseCaisseRefuseLAutoReceptionEtDetecteLEcart() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.cotis8", "GESTIONNAIRE_COMPTE");
        FixtureCotisation f = creerFixture(jetonGestionnaire, "8");
        String jetonDaf = creerUtilisateurEtSeConnecter("daf.cotis8", "DAF");

        String paiementId = given().header("Authorization", "Bearer " + f.jetonAgent())
                .header("Idempotency-Key", UUID.randomUUID().toString()).contentType(ContentType.JSON)
                .body(Map.of("adherentId", f.adherentId().toString(), "datePaiement", LocalDate.now().toString(),
                        "montant", 1000, "modePaiement", "ESPECES", "typePaiement", "COTISATION"))
                .when().post("/paiements")
                .then().statusCode(201)
                .extract().path("id");

        String remiseId = given().header("Authorization", "Bearer " + f.jetonAgent()).contentType(ContentType.JSON)
                .body(Map.of("agentId", f.agentId().toString(), "paiementIds", List.of(paiementId)))
                .when().post("/remises-caisse")
                .then().statusCode(201)
                .body("montantDeclare", equalTo(1000.0f))
                .extract().path("id");

        // L'agent ne peut pas réceptionner sa propre remise (ni d'ailleurs PAIEMENT:VALIDER).
        given().header("Authorization", "Bearer " + f.jetonAgent()).contentType(ContentType.JSON)
                .body(Map.of("montantRecu", 1000))
                .when().post("/remises-caisse/" + remiseId + "/receptionner")
                .then().statusCode(403);

        // Le DAF réceptionne avec un écart : montant reçu différent du montant déclaré.
        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("montantRecu", 900))
                .when().post("/remises-caisse/" + remiseId + "/receptionner")
                .then().statusCode(200)
                .body("statut", equalTo("EN_ECART"))
                .body("ecart", equalTo(-100.0f));
    }

    @Test
    void paiementRefusePourRoleSansPermission() {
        String jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.cotis6", "GESTIONNAIRE_COMPTE");
        UUID adherentId = creerAdherent(jetonGestionnaire);
        String jetonPca = creerUtilisateurEtSeConnecter("pca.cotis6", "PCA");

        given().header("Authorization", "Bearer " + jetonPca).header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(ContentType.JSON)
                .body(Map.of("adherentId", adherentId.toString(), "datePaiement", LocalDate.now().toString(),
                        "montant", 1000, "modePaiement", "ESPECES", "typePaiement", "COTISATION"))
                .when().post("/paiements")
                .then().statusCode(403);
    }
}
