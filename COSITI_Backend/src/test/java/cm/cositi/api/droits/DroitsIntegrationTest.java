package cm.cositi.api.droits;

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

/**
 * Droits et régularité (jalon J6) — module le plus critique du projet, couverture de tests la plus forte.
 * Vérifie bout en bout, via l'API réelle (imputation déclenchée automatiquement par
 * {@code ServicePaiementImpl.valider}) : calcul multi-versements consécutifs (départ à la fin de la dernière
 * période, jamais la date du paiement), arrondi vers le bas, non-chevauchement, changement de statut de retard
 * au seuil exact de {@code DELAI_RETARD_JOURS}, recalcul réservé DAF/SUPER_ADMIN, éligibilité CNPS par pack de
 * l'adhérent. Critère de passage : Conception/JALONS_PROJET_COSITI.md.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class DroitsIntegrationTest extends ConfigurationTestsIntegration {

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
    private String jetonGestionnaire;
    private String jetonDaf;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
        zoneId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO zone (id, code, libelle, ville, region) VALUES (?, ?, ?, ?, ?)",
                zoneId, "Z-DRT-" + zoneId.toString().substring(0, 8), "Zone Droits Test", "Douala", "Littoral");
        jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.droits" + zoneId.toString().substring(0, 4), "GESTIONNAIRE_COMPTE", null);
        jetonDaf = creerUtilisateurEtSeConnecter("daf.droits" + zoneId.toString().substring(0, 4), "DAF", null);
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
                agentId, codeAgent, "Agent " + codeAgent, "690000097", zoneId);
        return agentId;
    }

    private void ouvrirPortefeuille(UUID adherentId, UUID agentId) {
        jdbcTemplate.update(
                "INSERT INTO affectation_portefeuille (id, adherent_id, agent_id, date_debut) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), adherentId, agentId, LocalDate.now());
    }

    /**
     * Crée un adhérent puis l'affecte au portefeuille ouvert d'un agent de terrain fraîchement connecté —
     * seul {@code AGENT_TERRAIN} porte {@code PAIEMENT:CREER} (V5__catalogue_permissions.sql), et le périmètre
     * de données restreint sa saisie à son propre portefeuille (même schéma que {@code CotisationIntegrationTest}).
     */
    private record FixtureAdherent(UUID adherentId, String jetonAgent) {
    }

    private FixtureAdherent creerAdherentAvecPortefeuille(String codePack, LocalDate dateAdhesion, String suffixe) {
        UUID activiteId = jdbcTemplate.queryForObject("SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        UUID packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = ?", UUID.class, codePack);
        String telephoneUnique = "6" + String.format("%08d", Math.abs(UUID.randomUUID().hashCode() % 100_000_000));
        String id = given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("nom", "Adherent Droits Test " + suffixe, "telephonePrincipal", telephoneUnique,
                        "activiteId", activiteId.toString(), "zoneId", zoneId.toString(),
                        "localisation", "loc", "dateAdhesion", dateAdhesion.toString(),
                        "packId", packId.toString(), "consentementDonnees", true,
                        // Plusieurs adhérents de ce fichier de test partagent la même zone avec un nom très
                        // proche ("Adherent Droits Test <suffixe>") : similarité de nom (pg_trgm, jalon J2)
                        // potentiellement détectée comme doublon — confirmation explicite, comme le ferait un
                        // opérateur réel face à un faux positif.
                        "confirmationDoublonIgnore", true))
                .when().post("/adherents")
                .then().statusCode(201)
                .extract().path("id");
        UUID adherentId = UUID.fromString(id);

        UUID agentId = creerAgent("AG-DRT-" + suffixe);
        ouvrirPortefeuille(adherentId, agentId);
        String jetonAgent = creerUtilisateurEtSeConnecter("agent.droits" + suffixe + zoneId.toString().substring(0, 4),
                "AGENT_TERRAIN", agentId);
        return new FixtureAdherent(adherentId, jetonAgent);
    }

    /** Enregistre puis valide un paiement (déclenche l'imputation automatique J6) — renvoie l'id du paiement. */
    private UUID payerEtValider(FixtureAdherent fixture, int montant, LocalDate datePaiement) {
        String paiementId = given().header("Authorization", "Bearer " + fixture.jetonAgent())
                .header("Idempotency-Key", UUID.randomUUID().toString()).contentType(ContentType.JSON)
                .body(Map.of("adherentId", fixture.adherentId().toString(), "datePaiement", datePaiement.toString(),
                        "montant", montant, "modePaiement", "ESPECES", "typePaiement", "COTISATION"))
                .when().post("/paiements")
                .then().statusCode(201)
                .extract().path("id");

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(200);
        return UUID.fromString(paiementId);
    }

    @Test
    void imputationMultiVersementsConsecutifsPartantDeLaFinDeLaDernierePeriodeEtArrondieVersLeBas() {
        LocalDate dateAdhesion = LocalDate.now().minusYears(2);
        FixtureAdherent fixture = creerAdherentAvecPortefeuille("PACK_700", dateAdhesion, "multi");
        UUID adherentId = fixture.adherentId();

        payerEtValider(fixture, 2150, LocalDate.now()); // 700*3=2100 -> 3 jours, reliquat 50 non imputé.

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + adherentId + "/periodes")
                .then().statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].joursCouverts", equalTo(3))
                .body("[0].dateDebut", equalTo(dateAdhesion.toString()))
                .body("[0].dateFin", equalTo(dateAdhesion.plusDays(2).toString()));

        // Deuxième versement : part de la fin de la première période (dateAdhesion+3), pas de la date du
        // paiement (aujourd'hui, potentiellement très différente de dateAdhesion+3).
        payerEtValider(fixture, 1400, LocalDate.now()); // 700*2 exact, aucun reliquat.

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + adherentId + "/periodes")
                .then().statusCode(200)
                .body("size()", equalTo(2))
                .body("[1].dateDebut", equalTo(dateAdhesion.plusDays(3).toString()))
                .body("[1].dateFin", equalTo(dateAdhesion.plusDays(4).toString()))
                .body("[1].joursCouverts", equalTo(2));

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + adherentId)
                .then().statusCode(200)
                .body("joursCouvertsTotal", equalTo(5))
                .body("cumulCotise", equalTo(3550.0f))
                .body("couvertJusquAu", equalTo(dateAdhesion.plusDays(4).toString()));
    }

    @Test
    void eligibiliteCnpsCalculeeParRapportAuSeuilDuPackDeLAdherentPasUnSeuilGlobal() {
        LocalDate dateAdhesion = LocalDate.now().minusYears(1);
        FixtureAdherent fixturePack700 = creerAdherentAvecPortefeuille("PACK_700", dateAdhesion, "cnps700"); // seuil 10500
        FixtureAdherent fixturePack1000 = creerAdherentAvecPortefeuille("PACK_1000", dateAdhesion, "cnps1000"); // seuil 15000

        payerEtValider(fixturePack700, 10500, LocalDate.now()); // exactement le seuil de son pack.
        payerEtValider(fixturePack1000, 10500, LocalDate.now()); // même montant, seuil de pack différent.

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + fixturePack700.adherentId())
                .then().statusCode(200)
                .body("eligibleCnps", equalTo(true));

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + fixturePack1000.adherentId())
                .then().statusCode(200)
                .body("eligibleCnps", equalTo(false))
                .body("soldeAvantSeuil", equalTo(4500.0f));
    }

    @Test
    void recalculReserveDafEtSuperAdminMotifObligatoireEtNonDestructif() {
        LocalDate dateAdhesion = LocalDate.now().minusYears(1);
        FixtureAdherent fixture = creerAdherentAvecPortefeuille("PACK_700", dateAdhesion, "recalc");
        UUID adherentId = fixture.adherentId();
        payerEtValider(fixture, 2100, LocalDate.now());

        float cumulAvant = given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + adherentId)
                .then().statusCode(200)
                .extract().jsonPath().getFloat("cumulCotise");

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("motif", "Tentative non autorisée"))
                .when().post("/droits/adherents/" + adherentId + "/recalculer")
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("motif", ""))
                .when().post("/droits/adherents/" + adherentId + "/recalculer")
                .then().statusCode(400);

        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("motif", "Contrôle de cohérence périodique"))
                .when().post("/droits/adherents/" + adherentId + "/recalculer")
                .then().statusCode(204);

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + adherentId)
                .then().statusCode(200)
                .body("cumulCotise", equalTo(cumulAvant));

        String jetonSuperAdmin = creerUtilisateurEtSeConnecter("superadmin.droits" + zoneId.toString().substring(0, 4),
                "SUPER_ADMIN", null);
        given().header("Authorization", "Bearer " + jetonSuperAdmin).contentType(ContentType.JSON)
                .body(Map.of("motif", "Recalcul par le Super Administrateur"))
                .when().post("/droits/adherents/" + adherentId + "/recalculer")
                .then().statusCode(204);
    }

    @Test
    void bascculeDeStatutDeRetardExactementAuSeuilDuParametreDelaiRetardJours() {
        int seuil = Integer.parseInt(jdbcTemplate.queryForObject(
                "SELECT valeur FROM parametre WHERE cle = 'DELAI_RETARD_JOURS'", String.class));

        LocalDate dateAdhesion = LocalDate.now().minusYears(1);
        FixtureAdherent fixture = creerAdherentAvecPortefeuille("PACK_700", dateAdhesion, "retard");
        UUID adherentId = fixture.adherentId();
        payerEtValider(fixture, 700, LocalDate.now()); // 1 jour couvert -> couvertJusquAu = dateAdhesion.

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + adherentId + "?au=" + dateAdhesion)
                .then().statusCode(200)
                .body("statut", equalTo("A_JOUR"));

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + adherentId + "?au=" + dateAdhesion.plusDays(seuil))
                .then().statusCode(200)
                .body("statut", equalTo("PARTIELLEMENT_A_JOUR"));

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/adherents/" + adherentId + "?au=" + dateAdhesion.plusDays(seuil + 1))
                .then().statusCode(200)
                .body("statut", equalTo("EN_RETARD"));
    }

    @Test
    void listeDesRetardatairesRespectePerimetreEtEstAccessibleSeulementAvecDroitsLire() {
        LocalDate dateAdhesionAncienne = LocalDate.now().minusDays(400); // très en retard réellement, sans "au".
        FixtureAdherent fixture = creerAdherentAvecPortefeuille("PACK_700", dateAdhesionAncienne, "listeretard");
        UUID adherentEnRetard = fixture.adherentId();
        payerEtValider(fixture, 700, LocalDate.now().minusDays(390));

        given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/droits/retardataires?zoneId=" + zoneId + "&joursRetardMin=1")
                .then().statusCode(200)
                .body("totalElements", greaterThanOrEqualTo(1))
                .body("contenu.adherentId", org.hamcrest.Matchers.hasItem(adherentEnRetard.toString()));

        // SUPER_ADMIN n'a pas d'accès métier courant (Roles des acteurs.md §10) : DROITS:LIRE ne lui est
        // jamais accordé (V8__permissions_j5_j6.sql) — mais DROITS:RECALCULER si, ce sont deux permissions
        // distinctes.
        String jetonSuperAdmin = creerUtilisateurEtSeConnecter("superadmin.retard" + zoneId.toString().substring(0, 4),
                "SUPER_ADMIN", null);
        given().header("Authorization", "Bearer " + jetonSuperAdmin)
                .when().get("/droits/retardataires")
                .then().statusCode(403);
    }

    @Test
    void situationRefuseeHorsDuPerimetreDUnAgentDeTerrain() {
        LocalDate dateAdhesion = LocalDate.now().minusYears(1);
        // L'adhérent appartient au portefeuille de SON propre agent (fixture), pas de celui créé ci-dessous.
        UUID adherentHorsPortefeuille = creerAdherentAvecPortefeuille("PACK_700", dateAdhesion, "horsperim").adherentId();

        UUID agentId = creerAgent("AG-DRT-HP");
        String jetonAgent = creerUtilisateurEtSeConnecter("agent.horsperim" + zoneId.toString().substring(0, 4),
                "AGENT_TERRAIN", agentId);
        // Aucun portefeuille ouvert pour CET agent : l'adhérent, quel qu'il soit, est hors de son périmètre.

        given().header("Authorization", "Bearer " + jetonAgent)
                .when().get("/droits/adherents/" + adherentHorsPortefeuille)
                .then().statusCode(403);
    }
}
