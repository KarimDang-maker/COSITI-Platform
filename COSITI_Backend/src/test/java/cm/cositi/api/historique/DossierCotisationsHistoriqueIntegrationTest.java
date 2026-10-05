package cm.cositi.api.historique;

import cm.cositi.api.ConfigurationTestsIntegration;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Prompt « nouvelles spécificités » de bout en bout, sur une vraie base migrée par Flyway (V22 comprise) : création
 * sans pack, identification par matricule, cotisation répartie, idempotence (simple, conflit, concurrence), comptes
 * calculés par le serveur, deux historiques filtrés et paginés, permissions.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class DossierCotisationsHistoriqueIntegrationTest extends ConfigurationTestsIntegration {

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

    private UUID zoneId;
    private UUID packId;
    private String suffixe;
    private String gestionnaire;
    private String daf;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
        suffixe = UUID.randomUUID().toString().substring(0, 8);
        zoneId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO zone (id, code, libelle, ville, region) VALUES (?, ?, ?, ?, ?)",
                zoneId, "ZH-" + suffixe, "Zone Historique " + suffixe, "Douala", "Littoral");
        packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
        gestionnaire = connecter("gest.h." + suffixe, "GESTIONNAIRE_COMPTE", null);
        daf = connecter("daf.h." + suffixe, "DAF", null);
    }

    // ------------------------------------------------------------------------------------------------ Fixtures

    private String connecter(String identifiant, String role, UUID agentId) {
        Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "Test " + identifiant);
        u.setDoitChangerMotDePasse(false);
        u.setAgentId(agentId);
        roleRepository.findByCode(role).ifPresent(u::ajouterRole);
        utilisateurRepository.save(u);
        return given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion").then().statusCode(200).extract().path("jetonAcces");
    }

    private record AdherentCree(UUID id, String matricule) {
    }

    private AdherentCree creerAdherentSansPack() {
        UUID activiteId = jdbcTemplate.queryForObject("SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        String telephone = "6" + String.format("%08d", Math.abs(UUID.randomUUID().hashCode() % 100_000_000));
        Map<String, Object> corps = new HashMap<>();
        corps.put("nom", "Historique " + suffixe);
        corps.put("telephonePrincipal", telephone);
        corps.put("whatsapp", telephone);
        corps.put("email", "Adherent." + suffixe + "@Exemple.cm");
        corps.put("activiteId", activiteId.toString());
        corps.put("zoneId", zoneId.toString());
        corps.put("localisation", "Marché central");
        corps.put("dateAdhesion", LocalDate.now().minusMonths(2).toString());
        corps.put("consentementDonnees", true);
        corps.put("confirmationDoublonIgnore", true);
        Response r = given().header("Authorization", "Bearer " + gestionnaire).contentType(ContentType.JSON).body(corps)
                .when().post("/adherents")
                .then().statusCode(201).extract().response();
        return new AdherentCree(UUID.fromString(r.path("id")), r.path("matricule"));
    }

    private Map<String, Object> cotisation(UUID adherentId, int montant, Integer ss, Integer ep, UUID pack) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("adherentId", adherentId.toString());
        corps.put("datePaiement", LocalDate.now().toString());
        corps.put("montant", montant);
        corps.put("modePaiement", "ESPECES");
        corps.put("typePaiement", "COTISATION");
        if (ss != null) {
            corps.put("montantSecuriteSociale", ss);
        }
        if (ep != null) {
            corps.put("montantEpargne", ep);
        }
        if (pack != null) {
            corps.put("packId", pack.toString());
        }
        return corps;
    }

    private Response poster(String jeton, String cle, Map<String, Object> corps) {
        return given().header("Authorization", "Bearer " + jeton).header("Idempotency-Key", cle)
                .contentType(ContentType.JSON).body(corps).when().post("/paiements");
    }

    // ------------------------------------------------------------------------------------------------ Scénarios

    @Test
    void creationSansPackPuisPremiereCotisationRepartieAvecChoixDuPack() {
        AdherentCree a = creerAdherentSansPack();

        Integer adhesions = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM adhesion WHERE adherent_id = ?",
                Integer.class, a.id());
        assertThat(adhesions).isZero();
        given().header("Authorization", "Bearer " + gestionnaire).when().get("/adherents/" + a.id())
                .then().statusCode(200).body("email", equalTo("adherent." + suffixe + "@exemple.cm"))
                .body("whatsapp", notNullValue());

        // Identification par matricule (saisie en minuscules) : pack à choisir, seuils servis par le backend.
        given().header("Authorization", "Bearer " + gestionnaire)
                .queryParam("matricule", a.matricule().toLowerCase())
                .when().get("/paiements/contexte-adherent")
                .then().statusCode(200)
                .body("adherentId", equalTo(a.id().toString()))
                .body("packRequis", equalTo(true))
                .body("minimumSecuriteSociale", equalTo(700))
                .body("minimumEpargne", equalTo(300))
                .body("cotisable", equalTo(true));
        given().header("Authorization", "Bearer " + gestionnaire).queryParam("matricule", "ABC")
                .when().get("/paiements/contexte-adherent").then().statusCode(400)
                .body("code", equalTo("ADHERENT_MATRICULE_INVALIDE"));
        given().header("Authorization", "Bearer " + gestionnaire).queryParam("matricule", "COSITI-99999999")
                .when().get("/paiements/contexte-adherent").then().statusCode(404);

        // Première cotisation sans pack : refusée. Avec pack : acceptée, adhésion ouverte, répartition enregistrée.
        poster(gestionnaire, UUID.randomUUID().toString(), cotisation(a.id(), 1500, 700, 800, null))
                .then().statusCode(400).body("code", equalTo("COTISATION_PACK_REQUIS"));
        poster(gestionnaire, UUID.randomUUID().toString(), cotisation(a.id(), 1000, 600, 400, packId))
                .then().statusCode(400).body("code", equalTo("COTISATION_SECURITE_SOCIALE_INSUFFISANTE"));
        poster(gestionnaire, UUID.randomUUID().toString(), cotisation(a.id(), 1000, 700, 400, packId))
                .then().statusCode(400).body("code", equalTo("COTISATION_REPARTITION_INCOHERENTE"));
        poster(gestionnaire, UUID.randomUUID().toString(), cotisation(a.id(), 900, 700, 200, packId))
                .then().statusCode(400).body("code", equalTo("COTISATION_EPARGNE_INSUFFISANTE"));

        String paiementId = poster(gestionnaire, UUID.randomUUID().toString(), cotisation(a.id(), 1500, 700, 800, packId))
                .then().statusCode(201)
                .body("statut", equalTo("A_CONTROLER"))
                .body("montantSecuriteSociale", equalTo(700))
                .body("montantEpargne", equalTo(800))
                .body("origineRepartition", equalTo("SAISIE"))
                .extract().path("id");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT pack_id FROM adhesion WHERE adherent_id = ? AND date_fin IS NULL", UUID.class, a.id()))
                .isEqualTo(packId);

        // En attente de contrôle : rien n'est encore crédité sur les comptes.
        given().header("Authorization", "Bearer " + gestionnaire).when().get("/adherents/" + a.id() + "/synthese-cotisations")
                .then().statusCode(200)
                .body("compteSecuriteSociale.soldeValide", equalTo(0))
                .body("compteSecuriteSociale.montantEnAttente", equalTo(700.0f))
                .body("compteEpargne.montantEnAttente", equalTo(800.0f))
                .body("montantValide", equalTo(0))
                .body("montantEnAttente", equalTo(1500.0f))
                .body("packRequisALaProchaineCotisation", equalTo(false));

        // Le Gestionnaire ne valide pas (action DAF) ; la DAF valide.
        given().header("Authorization", "Bearer " + gestionnaire).when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(403);
        given().header("Authorization", "Bearer " + daf).when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(200).body("statut", equalTo("VALIDE"));

        given().header("Authorization", "Bearer " + gestionnaire).when().get("/adherents/" + a.id() + "/synthese-cotisations")
                .then().statusCode(200)
                .body("compteSecuriteSociale.soldeValide", equalTo(700.0f))
                .body("compteEpargne.soldeValide", equalTo(800.0f))
                .body("montantValide", equalTo(1500.0f))
                .body("montantEnAttente", equalTo(0))
                .body("cumulImpute", equalTo(1500.0f))
                .body("tauxProgression", notNullValue());
        List<Map<String, Object>> affectations = given().header("Authorization", "Bearer " + daf)
                .when().get("/paiements/" + paiementId + "/affectations").then().statusCode(200).extract().path("$");
        assertThat(affectations).extracting(l -> l.get("composanteCode") + "=" + new BigDecimal(l.get("montant").toString())
                .stripTrailingZeros().toPlainString()).containsExactlyInAnyOrder("CNPS=700", "EPARGNE=800");
    }

    @Test
    void idempotenceRepetitionConflitEtConcurrence() throws Exception {
        AdherentCree a = creerAdherentSansPack();
        String cle = UUID.randomUUID().toString();
        Map<String, Object> corps = cotisation(a.id(), 1000, 700, 300, packId);

        String premier = poster(gestionnaire, cle, corps).then().statusCode(201).extract().path("id");
        // Retry après timeout : même clé, même requête -> même cotisation, 200.
        poster(gestionnaire, cle, corps).then().statusCode(200).body("id", equalTo(premier));
        // Même clé, autre requête -> conflit explicite.
        poster(gestionnaire, cle, cotisation(a.id(), 1500, 700, 800, packId))
                .then().statusCode(409).body("code", equalTo("IDEMPOTENCY_KEY_CONFLIT"));

        // Double soumission concurrente d'une nouvelle clé : une seule cotisation créée.
        String cleConcurrente = UUID.randomUUID().toString();
        Map<String, Object> corps2 = cotisation(a.id(), 2000, 700, 1300, null);
        int fils = 4;
        ExecutorService executeur = Executors.newFixedThreadPool(fils);
        CountDownLatch depart = new CountDownLatch(1);
        List<Future<Integer>> resultats = new ArrayList<>();
        for (int i = 0; i < fils; i++) {
            Callable<Integer> appel = () -> {
                depart.await();
                return poster(gestionnaire, cleConcurrente, corps2).statusCode();
            };
            resultats.add(executeur.submit(appel));
        }
        depart.countDown();
        List<Integer> statuts = new ArrayList<>();
        for (Future<Integer> f : resultats) {
            statuts.add(f.get());
        }
        executeur.shutdown();

        assertThat(statuts).containsOnly(201, 200);
        assertThat(statuts).filteredOn(s -> s == 201).hasSize(1);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM paiement WHERE cle_idempotence = ?",
                Integer.class, cleConcurrente)).isEqualTo(1);
    }

    @Test
    void deuxHistoriquesDistinctsFiltresEtPagines() {
        AdherentCree a = creerAdherentSansPack();
        given().header("Authorization", "Bearer " + gestionnaire).contentType(ContentType.JSON)
                .body(Map.of("telephonePrincipal", "690" + suffixe.replaceAll("[^0-9]", "1").substring(0, 6),
                        "localisation", "Nouvelle adresse", "quartier", "Essos"))
                .when().put("/adherents/" + a.id() + "/coordonnees").then().statusCode(200);
        String paiementId = poster(gestionnaire, UUID.randomUUID().toString(), cotisation(a.id(), 1000, 700, 300, packId))
                .then().statusCode(201).extract().path("id");
        given().header("Authorization", "Bearer " + daf).when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(200);

        String base = "/adherents/" + a.id();
        given().header("Authorization", "Bearer " + gestionnaire).when().get(base + "/historique-general")
                .then().statusCode(200)
                .body("contenu.typeEvenement", hasItems("ADHERENT_CREATION", "ADHERENT_MODIFICATION_CONTACT",
                        "ADHERENT_CHANGEMENT_PACK"))
                .body("contenu.typeEvenement", not(hasItem("PAIEMENT_CREATION")))
                .body("contenu.categorie", everyItem(equalTo("GENERAL")))
                .body("contenu.find { it.typeEvenement == 'ADHERENT_MODIFICATION_CONTACT' }.modifications.champ",
                        hasItems("telephonePrincipal", "quartier"))
                .body("contenu.find { it.typeEvenement == 'ADHERENT_MODIFICATION_CONTACT' }"
                        + ".modifications.find { it.champ == 'telephonePrincipal' }.apres", equalTo("***"));

        given().header("Authorization", "Bearer " + gestionnaire).when().get(base + "/historique-financier")
                .then().statusCode(200)
                .body("contenu.typeEvenement", hasItems("PAIEMENT_CREATION", "PAIEMENT_VALIDATION",
                        "AFFECTATION_CREATION"))
                .body("contenu.typeEvenement", not(hasItem("ADHERENT_CREATION")))
                .body("contenu.find { it.typeEvenement == 'PAIEMENT_CREATION' }.details.montantEpargne", equalTo(300))
                .body("contenu.find { it.typeEvenement == 'PAIEMENT_CREATION' }.referenceMetier", notNullValue())
                .body("contenu.find { it.typeEvenement == 'PAIEMENT_VALIDATION' }.acteurRoles", hasItem("DAF"));

        // Pagination backend.
        Response page = given().header("Authorization", "Bearer " + gestionnaire).queryParam("taille", 1)
                .when().get(base + "/historique-financier").then().statusCode(200).extract().response();
        assertThat(page.<List<?>>path("contenu")).hasSize(1);
        assertThat(page.<Integer>path("totalPages")).isGreaterThanOrEqualTo(3);

        // Filtres temporels : aujourd'hui (jour) contient tout ; une année passée ne contient rien.
        given().header("Authorization", "Bearer " + gestionnaire).queryParam("periode", "JOUR")
                .when().get(base + "/historique-financier").then().statusCode(200)
                .body("contenu.typeEvenement", hasItem("PAIEMENT_VALIDATION"));
        given().header("Authorization", "Bearer " + gestionnaire).queryParam("periode", "ANNEE")
                .queryParam("date", "2020-06-01")
                .when().get(base + "/historique-financier").then().statusCode(200).body("totalElements", equalTo(0));
        given().header("Authorization", "Bearer " + gestionnaire).queryParam("du", LocalDate.now().plusDays(1).toString())
                .queryParam("au", LocalDate.now().toString())
                .when().get(base + "/historique-general").then().statusCode(400)
                .body("code", equalTo("HISTORIQUE_PERIODE_INVALIDE"));
        given().header("Authorization", "Bearer " + gestionnaire).queryParam("type", "PAIEMENT_VALIDATION")
                .when().get(base + "/historique-financier").then().statusCode(200)
                .body("contenu.typeEvenement", everyItem(equalTo("PAIEMENT_VALIDATION")));

        // Vue dossier complète.
        given().header("Authorization", "Bearer " + gestionnaire).when().get(base + "/dossier-complet")
                .then().statusCode(200)
                .body("identite.nom", equalTo("Historique " + suffixe))
                .body("coordonnees.quartier", equalTo("Essos"))
                .body("cotisations.compteSecuriteSociale.soldeValide", equalTo(700.0f))
                .body("cotisations.compteEpargne.soldeValide", equalTo(300.0f))
                .body("historique.nombreEvenementsFinanciers", notNullValue());
    }

    @Test
    void permissionsSurDossierHistoriqueEtCotisations() {
        AdherentCree a = creerAdherentSansPack();
        String paiementId = poster(gestionnaire, UUID.randomUUID().toString(), cotisation(a.id(), 1000, 700, 300, packId))
                .then().statusCode(201).extract().path("id");
        given().header("Authorization", "Bearer " + daf).when().post("/paiements/" + paiementId + "/valider")
                .then().statusCode(200);
        // Travail interne DAF : recalcul des droits.
        given().header("Authorization", "Bearer " + daf).contentType(ContentType.JSON)
                .body(Map.of("motif", "Contrôle de cohérence")).when().post("/droits/adherents/" + a.id() + "/recalculer")
                .then().statusCode(204);

        String base = "/adherents/" + a.id();
        given().header("Authorization", "Bearer " + daf).when().get(base + "/historique-financier")
                .then().statusCode(200).body("contenu.typeEvenement", hasItem("DROITS_RECALCUL"));
        given().header("Authorization", "Bearer " + gestionnaire).when().get(base + "/historique-financier")
                .then().statusCode(200)
                .body("contenu.typeEvenement", not(hasItem("DROITS_RECALCUL")))
                .body("avertissements", hasItem(org.hamcrest.Matchers.containsString("internes")));

        // Agent hors portefeuille : ni dossier, ni historique, ni modification de cotisation.
        UUID agentId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id) VALUES (?, ?, ?, ?, ?)",
                agentId, "AG-H-" + suffixe, "Agent " + suffixe, "690000077", zoneId);
        String agent = connecter("agent.h." + suffixe, "AGENT_TERRAIN", agentId);
        given().header("Authorization", "Bearer " + agent).when().get(base + "/dossier-complet").then().statusCode(403);
        given().header("Authorization", "Bearer " + agent).when().get(base + "/historique-general").then().statusCode(403);
        given().header("Authorization", "Bearer " + agent).when().get(base + "/historique-financier").then().statusCode(403);
        given().header("Authorization", "Bearer " + agent).contentType(ContentType.JSON)
                .body(Map.of("montant", 2000, "motif", "x")).when().post("/paiements/" + paiementId + "/corriger")
                .then().statusCode(403);

        // Super administrateur : aucun accès aux données nominatives du dossier.
        String superAdmin = connecter("sa.h." + suffixe, "SUPER_ADMIN", null);
        given().header("Authorization", "Bearer " + superAdmin).when().get(base + "/historique-general").then().statusCode(403);

        // Gestionnaire : aucune action DGA.
        given().header("Authorization", "Bearer " + gestionnaire).when()
                .post("/controles-dga/" + UUID.randomUUID() + "/demarrer").then().statusCode(403);
    }
}
