package cm.cositi.api.avantage;

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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;

/** Avantages et couvertures : évaluation par adhérent, bénéficiaires, gestion du catalogue, droits d'accès. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class AvantageIntegrationTest extends ConfigurationTestsIntegration {

    private static final String MOT_DE_PASSE = "MotDePasseValide123!";

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

    private String suffixe;
    private UUID zoneId;
    private UUID packId;
    private UUID adherentId;
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
                zoneId, "Z-AVT-" + suffixe, "Zone avantages", "Douala", "Littoral");
        packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
        jetonGestionnaire = connecter("gest.avt." + suffixe, "GESTIONNAIRE_COMPTE", null);
        jetonDaf = connecter("daf.avt." + suffixe, "DAF", null);
        UUID agentId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id) VALUES (?, ?, ?, ?, ?)",
                agentId, "AG-AVT-" + suffixe, "Agent avantages " + suffixe, "690000044", zoneId);
        jetonAgent = connecter("agent.avt." + suffixe, "AGENT_TERRAIN", agentId);
        adherentId = creerAdherent();
    }

    @Test
    void un_adherent_immatricule_aux_droits_couverts_beneficie_des_risques_professionnels() {
        immatriculer("IMM-" + suffixe);
        couvrir();

        avantages().body("find { it.code == 'RISQUES_PROFESSIONNELS' }.statut", equalTo("ACQUIS"))
                .body("find { it.code == 'RISQUES_PROFESSIONNELS' }.criteresManquants.size()", equalTo(0))
                // Pas de pièces inventées : celles de la liste CNPS sont jointes à l'avantage.
                .body("find { it.code == 'RISQUES_PROFESSIONNELS' }.pieces.size()", equalTo(8));

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("zoneId", zoneId.toString())
                .when().get("/avantages/" + idAvantage("RISQUES_PROFESSIONNELS") + "/beneficiaires")
                .then().statusCode(200).body("adherentId", hasItem(adherentId.toString()));
    }

    @Test
    void les_criteres_manquants_sont_indiques_et_un_enfant_ouvre_les_allocations_familiales() {
        immatriculer("IMM-" + suffixe);
        couvrir();

        avantages().body("find { it.code == 'PF_ALLOCATIONS_FAMILIALES' }.statut", equalTo("EN_COURS"))
                .body("find { it.code == 'PF_ALLOCATIONS_FAMILIALES' }.criteresManquants[0]",
                        equalTo("Avoir un enfant de 21 ans ou moins"));

        jdbcTemplate.update("INSERT INTO ayant_droit (adherent_id, type_lien, nom, date_naissance) "
                + "VALUES (?, 'ENFANT', 'Enfant test', ?)", adherentId, LocalDate.now().minusYears(8));

        avantages().body("find { it.code == 'PF_ALLOCATIONS_FAMILIALES' }.statut", equalTo("ACQUIS"));
    }

    @Test
    void un_adherent_non_immatricule_n_a_aucun_avantage_acquis() {
        couvrir();
        avantages().body("statut", not(hasItem("ACQUIS")));
    }

    @Test
    void un_avantage_acquis_devient_suspendu_quand_les_droits_expirent() {
        immatriculer("IMM-" + suffixe);
        couvrir();
        avantages().body("find { it.code == 'RISQUES_PROFESSIONNELS' }.statut", equalTo("ACQUIS"));

        jdbcTemplate.update("UPDATE periode_droits SET date_fin = ? WHERE adherent_id = ?",
                LocalDate.now().minusDays(1), adherentId);

        avantages().body("find { it.code == 'RISQUES_PROFESSIONNELS' }.statut", equalTo("SUSPENDU"))
                .body("find { it.code == 'RISQUES_PROFESSIONNELS' }.dateFin", equalTo(LocalDate.now().toString()));
        // Le changement est historisé.
        Integer n = jdbcTemplate.queryForObject("SELECT count(*) FROM historique_adherent_avantage "
                + "WHERE adherent_id = ? AND statut_apres = 'SUSPENDU'", Integer.class, adherentId);
        org.assertj.core.api.Assertions.assertThat(n).isGreaterThanOrEqualTo(1);
    }

    @Test
    void la_liste_des_adherents_en_cours_montre_ceux_qui_s_en_approchent() {
        immatriculer("IMM-" + suffixe);
        couvrir();
        avantages();
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("statut", "EN_COURS").queryParam("zoneId", zoneId.toString())
                .when().get("/avantages/" + idAvantage("PF_ALLOCATIONS_FAMILIALES") + "/beneficiaires")
                .then().statusCode(200).body("adherentId", hasItem(adherentId.toString()))
                .body("find { it.adherentId == '" + adherentId + "' }.criteresManquants[0]",
                        equalTo("Avoir un enfant de 21 ans ou moins"));
    }

    @Test
    void le_daf_gere_le_catalogue_et_la_gestionnaire_ne_le_peut_pas() {
        Map<String, Object> corps = Map.of("code", "AVT_" + suffixe.toUpperCase(), "libelle", "Avantage de test",
                "branche", "COSITI", "actif", true,
                "criteres", List.of(Map.of("type", "COTISATION_MINIMUM", "valeur", "10500")),
                "pieces", List.of(Map.of("categorie", "CONSTITUTION", "libelle", "Pièce de test")));

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON).body(corps)
                .when().post("/avantages").then().statusCode(403);
        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON).body(corps)
                .when().post("/avantages").then().statusCode(201)
                .body("criteres[0].libelle", equalTo("Avoir cotisé au moins 10500 FCFA (cotisations validées)"));
        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON).body(corps)
                .when().post("/avantages").then().statusCode(409).body("code", equalTo("AVANTAGE_CODE_EXISTANT"));

        // Un avantage actif sans critère n'ouvrirait aucun droit : refusé.
        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("code", "VIDE_" + suffixe.toUpperCase(), "libelle", "Sans critère", "branche", "COSITI",
                        "actif", true, "criteres", List.of()))
                .when().post("/avantages").then().statusCode(400).body("code", equalTo("AVANTAGE_CRITERES_REQUIS"));
        // Un critère qui exige une valeur sans la fournir est refusé.
        given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                .body(Map.of("code", "SANSVAL_" + suffixe.toUpperCase(), "libelle", "Sans valeur", "branche", "COSITI",
                        "actif", true, "criteres", List.of(Map.of("type", "AGE_MIN"))))
                .when().post("/avantages").then().statusCode(400)
                .body("code", equalTo("AVANTAGE_CRITERE_VALEUR_REQUISE"));
    }

    @Test
    void un_agent_de_terrain_n_a_pas_acces_aux_avantages() {
        given().header("Authorization", "Bearer " + jetonAgent).when().get("/avantages").then().statusCode(403);
        given().header("Authorization", "Bearer " + jetonAgent)
                .when().get("/adherents/" + adherentId + "/avantages").then().statusCode(403);
    }

    @Test
    void le_recalcul_global_evalue_les_adherents() {
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().post("/avantages/recalculer").then().statusCode(200)
                .body("adherentsEvalues", org.hamcrest.Matchers.greaterThanOrEqualTo(1))
                .body("avantagesEvalues", org.hamcrest.Matchers.greaterThanOrEqualTo(4));
    }

    // ----------------------------------------------------------------- Fixtures

    private io.restassured.response.ValidatableResponse avantages() {
        return given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/adherents/" + adherentId + "/avantages").then().statusCode(200);
    }

    private String idAvantage(String code) {
        return jdbcTemplate.queryForObject("SELECT id::text FROM avantage WHERE code = ?", String.class, code);
    }

    private void immatriculer(String numero) {
        jdbcTemplate.update("UPDATE adherent SET numero_cnps = ? WHERE id = ?", numero, adherentId);
    }

    private void couvrir() {
        jdbcTemplate.update("""
                INSERT INTO periode_droits (id, adherent_id, date_debut, date_fin, jours_couverts, montant_impute,
                                            pack_id, statut, cree_par)
                VALUES (?, ?, ?, ?, 30, ?, ?, 'COUVERTE', 'test')
                """, UUID.randomUUID(), adherentId, LocalDate.now().minusDays(5), LocalDate.now().plusDays(25),
                new BigDecimal("10500"), packId);
    }

    private UUID creerAdherent() {
        UUID activiteId = jdbcTemplate.queryForObject(
                "SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        String telephone = "6" + String.format("%08d", Math.abs(UUID.randomUUID().hashCode() % 100_000_000));
        String id = given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("nom", "Adherent Avantages " + suffixe, "telephonePrincipal", telephone,
                        "activiteId", activiteId.toString(), "zoneId", zoneId.toString(),
                        "localisation", "Marché central", "dateAdhesion", LocalDate.of(2026, 1, 1).toString(),
                        "packId", packId.toString(), "consentementDonnees", true,
                        "confirmationDoublonIgnore", true))
                .when().post("/adherents").then().statusCode(201).extract().path("id");
        UUID nouvelId = UUID.fromString(id);
        jdbcTemplate.update("INSERT INTO adhesion (id, adherent_id, pack_id, date_debut, motif_changement) "
                + "SELECT ?, a.id, ?, a.date_adhesion, 'Pack (test)' FROM adherent a WHERE a.id = ?",
                UUID.randomUUID(), packId, nouvelId);
        return nouvelId;
    }

    private String connecter(String identifiant, String codeRole, UUID agentId) {
        Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "Test " + identifiant);
        u.setDoitChangerMotDePasse(false);
        u.setAgentId(agentId);
        roleRepository.findByCode(codeRole).ifPresent(u::ajouterRole);
        utilisateurRepository.save(u);
        return given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion").then().statusCode(200).extract().path("jetonAcces");
    }
}
