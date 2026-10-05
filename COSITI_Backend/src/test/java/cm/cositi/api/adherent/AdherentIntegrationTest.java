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

    private void insererDocumentVerifie(UUID adherentId, String typeDocument) {
        jdbcTemplate.update("""
                INSERT INTO document (id, type_document, nom_fichier_original, chemin_stockage, type_mime,
                                       taille_octets, empreinte_sha256, chiffre, adherent_id, statut, cree_par)
                VALUES (?, ?, 'piece.pdf', ?, 'application/pdf', 1000, ?, true, ?, 'VERIFIE', 'test')
                """, UUID.randomUUID(), typeDocument, "test/" + UUID.randomUUID(), "0".repeat(64), adherentId);
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

    @Test
    void changerPackClotLAdhesionOuverteEtEnOuvreUneNouvelle() {
        String jeton = creerUtilisateurEtSeConnecter("gest.test6", "GESTIONNAIRE_COMPTE", null);
        UUID adherentId = UUID.fromString(given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(corpsAdherent("Biya Samuel", "677111007"))
                .when().post("/adherents")
                .then().statusCode(201)
                .extract().path("id"));

        UUID pack1000Id = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_1000'", UUID.class);

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(Map.of("packId", pack1000Id.toString(), "effetLe", LocalDate.now().plusDays(1).toString()))
                .when().post("/adherents/" + adherentId + "/pack")
                .then().statusCode(200)
                .body("packId", equalTo(pack1000Id.toString()));

        Integer nbAdhesionsOuvertes = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM adhesion WHERE adherent_id = ? AND date_fin IS NULL",
                Integer.class, adherentId);
        org.assertj.core.api.Assertions.assertThat(nbAdhesionsOuvertes).isEqualTo(1);
    }

    // ------------------------------------------------------------------------------------------------
    // Fonctionnalités ajoutées (docs/COSITI_GESTIONNAIRE_MODULES_BACKEND_122_FONCTIONNALITES.md §1)
    // ------------------------------------------------------------------------------------------------

    @Test
    void consulterParMatriculeRenvoieLeMemeAdherentQueParId() {
        String jeton = creerUtilisateurEtSeConnecter("gest.matricule", "GESTIONNAIRE_COMPTE", null);
        var reponse = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Owona Marc", "677111010"))
                .when().post("/adherents")
                .then().statusCode(201).extract();
        String matricule = reponse.path("matricule");
        String id = reponse.path("id");

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/matricule/" + matricule)
                .then().statusCode(200)
                .body("id", equalTo(id));
    }

    @Test
    void completionEtChampsManquantsRefletentLesChampsRenseignesPuisCompletesParPatch() {
        String jeton = creerUtilisateurEtSeConnecter("gest.completion", "GESTIONNAIRE_COMPTE", null);
        String id = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Ela Christian", "677111011"))
                .when().post("/adherents")
                .then().statusCode(201).extract().path("id");

        int pourcentageInitial = given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/completion")
                .then().statusCode(200)
                .extract().path("pourcentage");

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/champs-manquants")
                .then().statusCode(200)
                .body("size()", greaterThanOrEqualTo(1));

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(Map.of("sexe", "M", "numeroCni", "CNI-12345", "quartier", "Akwa",
                        "ville", "Douala", "consentementDonnees", true))
                .when().patch("/adherents/" + id + "/profil")
                .then().statusCode(200)
                .body("numeroCni", equalTo("CNI-12345"));

        int pourcentageApres = given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/completion")
                .then().statusCode(200)
                .extract().path("pourcentage");

        org.assertj.core.api.Assertions.assertThat(pourcentageApres).isGreaterThan(pourcentageInitial);
    }

    @Test
    void dossierComposeStatutCompletionEtDocumentsManquants() {
        String jeton = creerUtilisateurEtSeConnecter("gest.dossier", "GESTIONNAIRE_COMPTE", null);
        String id = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Manga Rose", "677111012"))
                .when().post("/adherents")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/documents-manquants")
                .then().statusCode(200)
                // Matrice documentaire V21 : pièces de niveau OBLIGATOIRE (CNI, formulaire d'adhésion).
                .body("$", org.hamcrest.Matchers.hasItems("CNI", "FORMULAIRE_ADHESION"));

        insererDocumentVerifie(UUID.fromString(id), "CNI");

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/documents-manquants")
                .then().statusCode(200)
                .body("$", org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("CNI")))
                .body("$", org.hamcrest.Matchers.hasItem("FORMULAIRE_ADHESION"));

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/dossier")
                .then().statusCode(200)
                .body("statut", equalTo("PREINSCRIT"))
                .body("documentsManquants", org.hamcrest.Matchers.hasItem("FORMULAIRE_ADHESION"));
    }

    @Test
    void professionnelEtCoordonneesSeConsultentEtSeModifientIndependamment() {
        String jeton = creerUtilisateurEtSeConnecter("gest.profil", "GESTIONNAIRE_COMPTE", null);
        String id = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Talla Edwige", "677111013"))
                .when().post("/adherents")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/professionnel")
                .then().statusCode(200)
                .body("activiteId", equalTo(activiteId.toString()));

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(Map.of("activiteId", activiteId.toString(), "numeroCnps", "CNPS-999"))
                .when().put("/adherents/" + id + "/professionnel")
                .then().statusCode(200)
                .body("numeroCnps", equalTo("CNPS-999"))
                .body("telephonePrincipal", equalTo("677111013"));

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/coordonnees")
                .then().statusCode(200)
                .body("telephonePrincipal", equalTo("677111013"));

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(Map.of("telephonePrincipal", "677111099", "localisation", "Nouveau marché"))
                .when().put("/adherents/" + id + "/coordonnees")
                .then().statusCode(200)
                .body("telephonePrincipal", equalTo("677111099"))
                .body("numeroCnps", equalTo("CNPS-999"));
    }

    @Test
    void modifierProfessionnelRefusePourUnRoleSansPermission() {
        String jetonDaf = creerUtilisateurEtSeConnecter("daf.profil", "DAF", null);
        String jetonGest = creerUtilisateurEtSeConnecter("gest.profil2", "GESTIONNAIRE_COMPTE", null);
        String id = given().header("Authorization", "Bearer " + jetonGest).contentType(ContentType.JSON)
                .body(corpsAdherent("Sans Droit", "677111014"))
                .when().post("/adherents")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("activiteId", activiteId.toString(), "numeroCnps", "X"))
                .when().put("/adherents/" + id + "/professionnel")
                .then().statusCode(403);
    }

    @Test
    void agentResponsableEstAbsentPuisPresentApresAffectation() {
        String jeton = creerUtilisateurEtSeConnecter("gest.agent", "GESTIONNAIRE_COMPTE", null);
        String id = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Njoya Paul", "677111015"))
                .when().post("/adherents")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/agent")
                .then().statusCode(404)
                .body("code", equalTo("ADHERENT_SANS_AGENT"));

        UUID agentId = creerAgent("AG-RESP");
        ouvrirPortefeuille(UUID.fromString(id), agentId);

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/agent")
                .then().statusCode(200)
                .body("id", equalTo(agentId.toString()));
    }

    @Test
    void historiqueContientLaCreationDeLAdherent() {
        String jeton = creerUtilisateurEtSeConnecter("gest.historique", "GESTIONNAIRE_COMPTE", null);
        String id = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Historique Test", "677111016"))
                .when().post("/adherents")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/historique")
                .then().statusCode(200)
                .body("typeOperation", org.hamcrest.Matchers.hasItem("ADHERENT_CREATION"));
    }

    @Test
    void resumeCotisationsRenvoieUnMontantValideNulPourUnNouvelAdherent() {
        String jeton = creerUtilisateurEtSeConnecter("gest.resume", "GESTIONNAIRE_COMPTE", null);
        String id = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Resume Test", "677111017"))
                .when().post("/adherents")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + jeton)
                .when().get("/adherents/" + id + "/resume-cotisations")
                .then().statusCode(200)
                .body("adherentId", equalTo(id))
                .body("montantValide", equalTo(0));
    }

    @Test
    void listerFiltreParAgentEtTrieParMatriculeDescendant() {
        String jeton = creerUtilisateurEtSeConnecter("gest.filtre", "GESTIONNAIRE_COMPTE", null);
        String id1 = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(corpsAdherent("Filtre Un", "677111018"))
                .when().post("/adherents")
                .then().statusCode(201).extract().path("id");
        Map<String, Object> second = corpsAdherent("Filtre Deux", "677111019");
        second.put("confirmationDoublonIgnore", true); // nom proche de « Filtre Un » : doublon potentiel confirmé
        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body(second)
                .when().post("/adherents")
                .then().statusCode(201);

        UUID agentId = creerAgent("AG-FILTRE");
        ouvrirPortefeuille(UUID.fromString(id1), agentId);

        given().header("Authorization", "Bearer " + jeton)
                .queryParam("agentId", agentId.toString())
                .when().get("/adherents")
                .then().statusCode(200)
                .body("contenu.size()", equalTo(1))
                .body("contenu[0].id", equalTo(id1));

        given().header("Authorization", "Bearer " + jeton)
                .queryParam("tri", "MATRICULE").queryParam("direction", "DESC")
                .when().get("/adherents")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + jeton)
                .queryParam("tri", "INVALIDE")
                .when().get("/adherents")
                .then().statusCode(400)
                .body("code", equalTo("ADHERENT_TRI_INVALIDE"));
    }
}
