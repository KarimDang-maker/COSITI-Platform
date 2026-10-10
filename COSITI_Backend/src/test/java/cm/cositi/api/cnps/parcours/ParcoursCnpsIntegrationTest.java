package cm.cositi.api.cnps.parcours;

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
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;

/** Parcours CNPS (préimmatriculation, dépôt, immatriculation), bout en bout via l'API réelle. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class ParcoursCnpsIntegrationTest extends ConfigurationTestsIntegration {

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
    @Autowired
    private ServiceParcoursCnps serviceParcours;

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
                zoneId, "Z-PAR-" + suffixe, "Zone parcours", "Douala", "Littoral");
        packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);

        jetonGestionnaire = connecter("gest.par." + suffixe, "GESTIONNAIRE_COMPTE", null);
        jetonDaf = connecter("daf.par." + suffixe, "DAF", null);
        UUID agentId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id) VALUES (?, ?, ?, ?, ?)",
                agentId, "AG-PAR-" + suffixe, "Agent parcours " + suffixe, "690000043", zoneId);
        jetonAgent = connecter("agent.par." + suffixe, "AGENT_TERRAIN", agentId);

        adherentId = creerAdherent();
        jdbcTemplate.update(
                "INSERT INTO affectation_portefeuille (id, adherent_id, agent_id, date_debut) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), adherentId, agentId, LocalDate.now());
    }

    @Test
    void un_adherent_apparait_a_preimmatriculer_des_que_le_quota_est_valide() {
        assertThat(etape()).isEqualTo("NON_ELIGIBLE");
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("filtre", "A_PREIMMATRICULER").queryParam("zoneId", zoneId.toString())
                .when().get("/cnps/parcours")
                .then().statusCode(200).body("adherentId", not(hasItem(adherentId.toString())));

        cotiser("10500");

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("filtre", "A_PREIMMATRICULER").queryParam("zoneId", zoneId.toString())
                .when().get("/cnps/parcours")
                .then().statusCode(200).body("adherentId", hasItem(adherentId.toString()));
        assertThat(etape()).isEqualTo("ELIGIBLE_PREIMMAT");
    }

    @Test
    void refuse_de_preimmatriculer_un_adherent_sous_le_quota() {
        cotiser("10499");
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("numeroTemporaire", "TMP-" + suffixe))
                .when().post("/cnps/parcours/adherents/" + adherentId + "/preimmatriculer")
                .then().statusCode(409).body("code", equalTo("CNPS_PREIMMAT_NON_ELIGIBLE"));
    }

    @Test
    void un_agent_de_terrain_ne_peut_pas_preimmatriculer() {
        cotiser("10500");
        given().header("Authorization", "Bearer " + jetonAgent).contentType(ContentType.JSON)
                .body(Map.of("numeroTemporaire", "TMP-" + suffixe))
                .when().post("/cnps/parcours/adherents/" + adherentId + "/preimmatriculer")
                .then().statusCode(403);
    }

    @Test
    void parcours_complet_preimmatriculation_depot_puis_immatriculation() {
        cotiser("10500");
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("numeroTemporaire", "TMP-" + suffixe))
                .when().post("/cnps/parcours/adherents/" + adherentId + "/preimmatriculer")
                .then().statusCode(200)
                .body("etape", equalTo("PREIMMATRICULE"))
                .body("joursRestantsDepot", equalTo(30));

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("cps", "CPS Douala Akwa"))
                .when().post("/cnps/parcours/adherents/" + adherentId + "/depot-dossier")
                .then().statusCode(200)
                .body("etape", equalTo("DOSSIER_DEPOSE"))
                .body("depotHorsDelai", equalTo(false));

        // Quota d'immatriculation (21 000) pas encore atteint.
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("numeroImmatriculation", "IMM-" + suffixe))
                .when().post("/cnps/parcours/adherents/" + adherentId + "/immatriculer")
                .then().statusCode(409).body("code", equalTo("CNPS_IMMAT_QUOTA_NON_ATTEINT"));

        cotiser("10500");
        // Quota atteint, mais le dossier CNPS n'est pas ouvert.
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("numeroImmatriculation", "IMM-" + suffixe))
                .when().post("/cnps/parcours/adherents/" + adherentId + "/immatriculer")
                .then().statusCode(409).body("code", equalTo("CNPS_DOSSIER_REQUIS"));

        String dossierId = given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("adherentId", adherentId.toString())
                .when().post("/cnps/dossiers").then().statusCode(201).extract().path("id");

        // Checklist d'archivage incomplète : l'immatriculation est bloquée.
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("numeroImmatriculation", "IMM-" + suffixe))
                .when().post("/cnps/parcours/adherents/" + adherentId + "/immatriculer")
                .then().statusCode(409).body("code", equalTo("CNPS_ARCHIVAGE_INCOMPLET"));

        completerChecklist(dossierId);

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("numeroImmatriculation", "IMM-" + suffixe))
                .when().post("/cnps/parcours/adherents/" + adherentId + "/immatriculer")
                .then().statusCode(200)
                .body("etape", equalTo("IMMATRICULE"))
                .body("numeroImmatriculation", equalTo("IMM-" + suffixe));

        assertThat(jdbcTemplate.queryForObject("SELECT numero_cnps FROM adherent WHERE id = ?", String.class,
                adherentId)).isEqualTo("IMM-" + suffixe);
    }

    @Test
    void le_daf_modifie_les_parametres_et_la_gestionnaire_ne_le_peut_pas() {
        Map<String, Object> actuels = given().header("Authorization", "Bearer " + jetonDaf)
                .when().get("/cnps/parametres").then().statusCode(200).extract().path("$");
        Map<String, Object> corps = Map.of("quotaPreimmat", 12000, "quotaImmat", 24000, "jourCoupure", 10,
                "delaiDepotJours", 45, "motif", "Test");

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON).body(corps)
                .when().put("/cnps/parametres").then().statusCode(403);
        try {
            given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON).body(corps)
                    .when().put("/cnps/parametres").then().statusCode(200).body("jourCoupure", equalTo(10));
            given().header("Authorization", "Bearer " + jetonGestionnaire)
                    .when().get("/cnps/parcours/resume").then().statusCode(200)
                    .body("jourCoupure", equalTo(10)).body("delaiDepotJours", equalTo(45));
            given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON)
                    .body(Map.of("quotaPreimmat", 5000, "quotaImmat", 4000, "jourCoupure", 10,
                            "delaiDepotJours", 45, "motif", "Test"))
                    .when().put("/cnps/parametres").then().statusCode(400)
                    .body("code", equalTo("CNPS_QUOTA_INVALIDE"));
        } finally {
            Map<String, Object> restaure = new HashMap<>(actuels);
            restaure.put("motif", "Restauration après test");
            given().header("Authorization", "Bearer " + jetonDaf).contentType(ContentType.JSON).body(restaure)
                    .when().put("/cnps/parametres").then().statusCode(200);
        }
    }

    @Test
    void la_reconduction_mensuelle_marque_en_retard_et_reporte_les_adherents_sous_le_quota() {
        cotiser("3000");
        int reportes = serviceParcours.reporterVague(LocalDate.now().plusMonths(1));
        assertThat(reportes).isGreaterThanOrEqualTo(1);

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("filtre", "REPORTES").queryParam("zoneId", zoneId.toString())
                .when().get("/cnps/parcours")
                .then().statusCode(200).body("adherentId", hasItem(adherentId.toString()));
        // Idempotent : un second passage le même mois ne reporte plus rien.
        assertThat(serviceParcours.reporterVague(LocalDate.now().plusMonths(1))).isZero();
    }

    @Test
    void l_alerte_de_delai_de_depot_est_envoyee_a_j_moins_3() {
        cotiser("10500");
        jdbcTemplate.update("""
                INSERT INTO parcours_cnps (adherent_id, statut_parcours, date_preimmatriculation, numero_temporaire,
                                           date_limite_depot)
                VALUES (?, 'PREIMMATRICULE', ?, 'TMP-A', ?)
                ON CONFLICT (adherent_id) DO UPDATE SET statut_parcours = 'PREIMMATRICULE',
                       date_limite_depot = EXCLUDED.date_limite_depot
                """, adherentId, LocalDate.now().minusDays(27), LocalDate.now().plusDays(3));

        assertThat(serviceParcours.alerterEcheancesDepot(LocalDate.now())).isGreaterThanOrEqualTo(1);
        Integer n = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM notification WHERE type = 'CNPS_DELAI_DEPOT' AND entite_id = ?",
                Integer.class, adherentId);
        assertThat(n).isGreaterThanOrEqualTo(1);
    }

    @Test
    void la_checklist_d_archivage_rattache_un_document_et_impose_ses_regles() {
        cotiser("10500");
        String dossierId = given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("adherentId", adherentId.toString())
                .when().post("/cnps/dossiers").then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/cnps/dossiers/" + dossierId + "/checklist-archivage")
                .then().statusCode(200)
                .body("lignes.size()", equalTo(8))
                .body("piecesBloquantes", equalTo(7))
                .body("complete", equalTo(false));

        // Une pièce ne passe pas de NON_FOURNIE à VERIFIEE sans être fournie.
        patch(dossierId, "CNI_RECTO", Map.of("statut", "VERIFIEE")).then().statusCode(409)
                .body("code", equalTo("ARCHIVAGE_TRANSITION_INTERDITE"));
        // Fournir exige un document ou une référence physique.
        patch(dossierId, "CNI_RECTO", Map.of("statut", "FOURNIE")).then().statusCode(400)
                .body("code", equalTo("ARCHIVAGE_RATTACHEMENT_REQUIS"));

        String documentId = televerserPng();
        patch(dossierId, "CNI_RECTO", Map.of("statut", "FOURNIE", "documentId", documentId)).then()
                .statusCode(200)
                .body("lignes.find { it.codePiece == 'CNI_RECTO' }.documentId", equalTo(documentId));

        // Archiver exige une référence physique.
        patch(dossierId, "CNI_RECTO", Map.of("statut", "VERIFIEE")).then().statusCode(200);
        patch(dossierId, "CNI_RECTO", Map.of("statut", "ARCHIVEE")).then().statusCode(400)
                .body("code", equalTo("ARCHIVAGE_REFERENCE_REQUISE"));
        patch(dossierId, "CNI_RECTO", Map.of("statut", "ARCHIVEE", "referencePhysique", "Classeur 3 / casier 12"))
                .then().statusCode(200);

        // Retirer une pièce exige un motif.
        patch(dossierId, "CNI_RECTO", Map.of("statut", "NON_FOURNIE")).then().statusCode(400)
                .body("code", equalTo("ARCHIVAGE_MOTIF_REQUIS"));

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/cnps/archivage/dossiers-incomplets")
                .then().statusCode(200).body("dossierId", hasItem(dossierId));
        // L'agent de terrain n'a pas accès à l'archivage.
        given().header("Authorization", "Bearer " + jetonAgent)
                .when().get("/cnps/dossiers/" + dossierId + "/checklist-archivage").then().statusCode(403);
    }

    // ----------------------------------------------------------------- Fixtures

    private io.restassured.response.Response patch(String dossierId, String code, Map<String, ?> corps) {
        return given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(corps).when().patch("/cnps/dossiers/" + dossierId + "/checklist-archivage/" + code);
    }

    private void completerChecklist(String dossierId) {
        for (String code : java.util.List.of("CNI_RECTO", "CNI_VERSO", "ACTE_NAISSANCE", "PHOTO_IDENTITE",
                "FORMULAIRE_SIGNE", "RECEPISSE_PREIMMAT", "ACCUSE_DEPOT_CPS")) {
            patch(dossierId, code, Map.of("statut", "FOURNIE", "referencePhysique", "Classeur test")).then()
                    .statusCode(200);
            patch(dossierId, code, Map.of("statut", "VERIFIEE")).then().statusCode(200);
        }
    }

    private String televerserPng() {
        byte[] png = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x11, 0x22, 0x33};
        byte[] suffixeOctets = UUID.randomUUID().toString().getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        byte[] contenu = java.util.Arrays.copyOf(png, png.length + suffixeOctets.length);
        System.arraycopy(suffixeOctets, 0, contenu, png.length, suffixeOctets.length);
        return given().header("Authorization", "Bearer " + jetonGestionnaire)
                .multiPart("fichier", "piece.png", contenu, "image/png")
                .queryParam("type", "CNI").queryParam("adherentId", adherentId.toString())
                .when().post("/documents").then().statusCode(201).extract().path("id");
    }

    private String etape() {
        return given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/cnps/parcours/adherents/" + adherentId)
                .then().statusCode(200).extract().path("etape");
    }

    private void cotiser(String montant) {
        jdbcTemplate.update("""
                INSERT INTO periode_droits (id, adherent_id, date_debut, date_fin, jours_couverts, montant_impute,
                                            pack_id, statut, cree_par)
                VALUES (?, ?, ?, ?, 30, ?, ?, 'COUVERTE', 'test')
                """, UUID.randomUUID(), adherentId, LocalDate.now(), LocalDate.now().plusDays(29),
                new BigDecimal(montant), packId);
    }

    private UUID creerAdherent() {
        UUID activiteId = jdbcTemplate.queryForObject(
                "SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        String telephone = "6" + String.format("%08d", Math.abs(UUID.randomUUID().hashCode() % 100_000_000));
        String id = given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("nom", "Adherent Parcours " + suffixe, "telephonePrincipal", telephone,
                        "activiteId", activiteId.toString(), "zoneId", zoneId.toString(),
                        "localisation", "Marché central", "dateAdhesion", LocalDate.of(2026, 1, 1).toString(),
                        "packId", packId.toString(), "consentementDonnees", true,
                        "confirmationDoublonIgnore", true))
                .when().post("/adherents")
                .then().statusCode(201).extract().path("id");
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
