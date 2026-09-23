package cm.cositi.api.cnps;

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
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
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
 * CNPS et documents (jalon J7), bout en bout via l'API réelle.
 *
 * <p>Couvre le critère de passage du jalon : transitions de statut du dossier (nominal et refus), pièces
 * manquantes, téléversement contrôlé par signature binaire, consultation journalisée, RBAC positif et
 * négatif, et calcul d'une déclaration à partir des droits réellement imputés.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class CnpsIntegrationTest extends ConfigurationTestsIntegration {

    /** PNG minimal valide : signature de 8 octets suivie de quelques octets de charge. */
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x11, 0x22, 0x33};

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
    private String jetonGestionnaire;
    private String jetonAgent;
    private UUID adherentId;
    private UUID agentId;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";

        suffixe = UUID.randomUUID().toString().substring(0, 8);
        zoneId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO zone (id, code, libelle, ville, region) VALUES (?, ?, ?, ?, ?)",
                zoneId, "Z-CNPS-" + suffixe, "Zone CNPS Test", "Douala", "Littoral");

        jetonGestionnaire = creerUtilisateurEtSeConnecter("gest.cnps." + suffixe, "GESTIONNAIRE_COMPTE", null);

        agentId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id) VALUES (?, ?, ?, ?, ?)",
                agentId, "AG-CNPS-" + suffixe, "Agent CNPS " + suffixe, "690000042", zoneId);
        jetonAgent = creerUtilisateurEtSeConnecter("agent.cnps." + suffixe, "AGENT_TERRAIN", agentId);

        adherentId = creerAdherent();
        jdbcTemplate.update(
                "INSERT INTO affectation_portefeuille (id, adherent_id, agent_id, date_debut) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), adherentId, agentId, LocalDate.now());
    }

    // ------------------------------------------------------------------ Dossiers

    @Test
    void le_gestionnaire_ouvre_un_dossier_avec_ses_pieces_attendues() {
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("adherentId", adherentId.toString())
                .when().post("/cnps/dossiers")
                .then().statusCode(201)
                .body("statut", equalTo("BROUILLON"))
                .body("adherentId", equalTo(adherentId.toString()))
                // Les cinq pièces du paramètre PIECES_CNPS_OBLIGATOIRES (V9) sont créées dès l'ouverture.
                .body("pieces", hasSize(5))
                .body("piecesManquantes", hasSize(5))
                // La composition du dossier n'est pas validée par la COSITI : l'avertissement doit remonter.
                .body("avertissements", hasItem(org.hamcrest.Matchers.containsString("PIECES_CNPS_OBLIGATOIRES")));
    }

    @Test
    void un_agent_de_terrain_ne_peut_pas_ouvrir_de_dossier_cnps() {
        // CNPS:GERER n'est accordé qu'au Gestionnaire des comptes (V9__permissions_j7_cnps_documents.sql).
        given().header("Authorization", "Bearer " + jetonAgent)
                .queryParam("adherentId", adherentId.toString())
                .when().post("/cnps/dossiers")
                .then().statusCode(403);
    }

    @Test
    void refuse_un_second_dossier_pour_le_meme_adherent() {
        ouvrirDossier();

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("adherentId", adherentId.toString())
                .when().post("/cnps/dossiers")
                .then().statusCode(409)
                .body("code", equalTo("CNPS_DOSSIER_EXISTANT"));
    }

    @Test
    void refuse_de_declarer_pret_un_dossier_dont_les_pieces_manquent() {
        UUID dossierId = ouvrirDossier();

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("statut", "PRET"))
                .when().post("/cnps/dossiers/" + dossierId + "/statut")
                .then().statusCode(409)
                .body("code", equalTo("CNPS_PIECES_MANQUANTES"));
    }

    @Test
    void accepte_pret_puis_transmis_une_fois_toutes_les_pieces_rattachees() {
        UUID dossierId = ouvrirDossier();

        for (String typePiece : List.of("CNI_RECTO", "CNI_VERSO", "ACTE_NAISSANCE", "PHOTO_IDENTITE",
                "FORMULAIRE_SIGNE")) {
            UUID documentId = televerserPng("piece-" + typePiece + ".png");
            given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                    .body(Map.of("documentId", documentId.toString(), "typePiece", typePiece))
                    .when().post("/cnps/dossiers/" + dossierId + "/pieces")
                    .then().statusCode(200);
        }

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/cnps/dossiers/" + dossierId + "/pieces-manquantes")
                .then().statusCode(200).body("$", hasSize(0));

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("statut", "PRET", "commentaire", "Dossier complet"))
                .when().post("/cnps/dossiers/" + dossierId + "/statut")
                .then().statusCode(200).body("statut", equalTo("PRET"));

        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("statut", "TRANSMIS", "commentaire", "Déposé à la CNPS"))
                .when().post("/cnps/dossiers/" + dossierId + "/statut")
                .then().statusCode(200).body("statut", equalTo("TRANSMIS"));

        // Un dossier transmis est figé : ses pièces ne bougent plus, même avec un type parfaitement valide.
        UUID documentTardif = televerserPng("tardif.png");
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("documentId", documentTardif.toString(), "typePiece", "CNI_RECTO"))
                .when().post("/cnps/dossiers/" + dossierId + "/pieces")
                .then().statusCode(409)
                .body("code", equalTo("CNPS_DOSSIER_FIGE"));
    }

    @Test
    void repond_400_et_non_500_sur_un_type_de_piece_inexistant() {
        UUID dossierId = ouvrirDossier();
        UUID documentId = televerserPng("piece.png");

        // Défaut trouvé au jalon J7 : une valeur d'énumération inconnue remontait jusqu'au filet générique
        // et renvoyait 500. Le gestionnaire d'exceptions traduit désormais ce cas en 400 explicite.
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("documentId", documentId.toString(), "typePiece", "TYPE_QUI_NEXISTE_PAS"))
                .when().post("/cnps/dossiers/" + dossierId + "/pieces")
                .then().statusCode(400)
                .body("code", equalTo("CORPS_REQUETE_INVALIDE"))
                .body("champ", equalTo("typePiece"))
                // Le message guide l'appelant sans exposer de nom de classe Java.
                .body("message", org.hamcrest.Matchers.containsString("CNI_RECTO"));
    }

    @Test
    void historise_chaque_changement_de_statut_du_dossier() {
        UUID dossierId = ouvrirDossier();
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("statut", "INCOMPLET", "commentaire", "En attente des pièces"))
                .when().post("/cnps/dossiers/" + dossierId + "/statut")
                .then().statusCode(200);

        Integer lignes = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM historique_dossier_cnps WHERE dossier_id = ?", Integer.class, dossierId);

        // Ouverture + passage à INCOMPLET.
        assertThat(lignes).isEqualTo(2);
    }

    // ----------------------------------------------------------------- Documents

    @Test
    void televerse_un_document_puis_le_telecharge_et_journalise_la_consultation() {
        byte[] envoye = pngUnique();
        UUID documentId = televerser("cni-recto.png", envoye);

        byte[] recu = given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/documents/" + documentId)
                .then().statusCode(200)
                .header("Cache-Control", "no-store")
                .extract().asByteArray();

        // Le fichier fait l'aller-retour chiffrement/déchiffrement sans perdre un octet.
        assertThat(recu).isEqualTo(envoye);

        Integer consultations = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM journal_audit WHERE type_operation = 'DOCUMENT_CONSULTATION' AND entite_id = ?",
                Integer.class, documentId);
        assertThat(consultations).isEqualTo(1);
    }

    @Test
    void refuse_un_executable_deguise_en_pdf() {
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .multiPart("fichier", "contrat.pdf", new byte[]{0x4D, 0x5A, (byte) 0x90, 0x00}, "application/pdf")
                .queryParam("type", "AUTRE")
                .queryParam("adherentId", adherentId.toString())
                .when().post("/documents")
                .then().statusCode(400)
                .body("code", equalTo("DOCUMENT_TYPE_NON_AUTORISE"));
    }

    @Test
    void refuse_un_fichier_signale_par_l_analyse_antivirus() {
        // Chaîne de test EICAR : le standard pour vérifier qu'une chaîne antivirale est bien câblée.
        String eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .multiPart("fichier", "test.png", eicar.getBytes(StandardCharsets.US_ASCII), "image/png")
                .queryParam("type", "AUTRE")
                .queryParam("adherentId", adherentId.toString())
                .when().post("/documents")
                .then().statusCode(400);
    }

    @Test
    void le_contenu_est_chiffre_sur_disque_jamais_en_clair() {
        byte[] envoye = pngUnique();
        UUID documentId = televerser("a-chiffrer.png", envoye);

        String cheminStockage = jdbcTemplate.queryForObject(
                "SELECT chemin_stockage FROM document WHERE id = ?", String.class, documentId);
        Boolean chiffre = jdbcTemplate.queryForObject(
                "SELECT chiffre FROM document WHERE id = ?", Boolean.class, documentId);

        assertThat(chiffre).isTrue();
        assertThat(cheminStockage).endsWith(".chiffre");

        java.nio.file.Path fichier = java.nio.file.Paths.get("./uploads/documents", cheminStockage);
        assertThat(fichier).exists();
        try {
            byte[] surDisque = java.nio.file.Files.readAllBytes(fichier);
            assertThat(surDisque).isNotEqualTo(envoye);
            // Le chiffré porte en tête son vecteur d'initialisation (12 octets) et en queue le tag GCM (16).
            assertThat(surDisque.length).isEqualTo(envoye.length + 28);
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void un_agent_ne_peut_pas_telecharger_le_document_d_un_adherent_hors_de_son_portefeuille() {
        UUID documentId = televerserPng("prive.png");

        // Agent d'une autre zone, sans portefeuille sur cet adhérent.
        UUID autreAgentId = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO agent (id, code_agent, nom_complet, telephone, zone_id) VALUES (?, ?, ?, ?, ?)",
                autreAgentId, "AG-AUTRE-" + suffixe, "Agent Autre " + suffixe, "690000043", zoneId);
        String jetonAutreAgent = creerUtilisateurEtSeConnecter("agent.autre." + suffixe, "AGENT_TERRAIN", autreAgentId);

        given().header("Authorization", "Bearer " + jetonAutreAgent)
                .when().get("/documents/" + documentId)
                .then().statusCode(403);
    }

    // -------------------------------------------------------------- Déclarations

    @Test
    void prepare_une_declaration_a_partir_des_droits_imputes_du_mois() {
        UUID dossierId = ouvrirDossier();
        UUID packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);

        // Deux périodes de droits en septembre 2026, entièrement comprises dans le mois.
        insererPeriodeDroits(packId, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 10), 10, "7000");
        insererPeriodeDroits(packId, LocalDate.of(2026, 9, 11), LocalDate.of(2026, 9, 20), 10, "7000");
        // Une période d'octobre, qui ne doit pas être comptée dans la déclaration de septembre.
        insererPeriodeDroits(packId, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10), 10, "7000");

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("dossierId", dossierId.toString())
                .queryParam("periode", "2026-09")
                .when().post("/cnps/declarations")
                .then().statusCode(201)
                .body("montantDeclare", equalTo(14000.0f))
                .body("statut", equalTo("A_PRODUIRE"))
                .body("avertissements", hasItem(org.hamcrest.Matchers.containsString("ASSIETTE_CNPS")));
    }

    @Test
    void marque_une_declaration_transmise_puis_refuse_une_seconde_transmission() {
        UUID dossierId = ouvrirDossier();
        UUID packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
        insererPeriodeDroits(packId, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 10), 10, "7000");

        String declarationId = given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("dossierId", dossierId.toString())
                .queryParam("periode", "2026-09")
                .when().post("/cnps/declarations")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().post("/cnps/declarations/" + declarationId + "/transmettre")
                .then().statusCode(200)
                .body("statut", equalTo("TRANSMISE"))
                .body("dateTransmission", notNullValue());

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().post("/cnps/declarations/" + declarationId + "/transmettre")
                .then().statusCode(409)
                .body("code", equalTo("CNPS_DECLARATION_TRANSITION_INTERDITE"));
    }

    @Test
    void liste_les_adherents_eligibles_non_encore_immatricules() {
        UUID packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
        BigDecimal seuil = jdbcTemplate.queryForObject(
                "SELECT seuil_eligibilite_cnps FROM pack WHERE id = ?", BigDecimal.class, packId);

        // Cumul imputé strictement supérieur au seuil du pack de l'adhérent.
        insererPeriodeDroits(packId, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 30), 180,
                seuil.add(new BigDecimal("500")).toPlainString());

        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("zoneId", zoneId.toString())
                .when().get("/cnps/eligibles-non-immatricules")
                .then().statusCode(200)
                .body("adherentId", hasItem(adherentId.toString()))
                .body("find { it.adherentId == '" + adherentId + "' }.dossierOuvert", equalTo(false));
    }

    // ------------------------------------------------------------------ Fixtures

    private UUID ouvrirDossier() {
        String id = given().header("Authorization", "Bearer " + jetonGestionnaire)
                .queryParam("adherentId", adherentId.toString())
                .when().post("/cnps/dossiers")
                .then().statusCode(201)
                .extract().path("id");
        return UUID.fromString(id);
    }

    /**
     * Chaque appel produit un contenu <b>différent</b> : le service refuse deux fois le même fichier sur le
     * même adhérent (empreinte SHA-256 identique), ce qui est le comportement voulu — deux pièces réelles ne
     * sont jamais octet pour octet identiques. Une fixture qui réutiliserait le même PNG testerait la
     * détection de doublon au lieu du scénario visé.
     */
    private UUID televerserPng(String nom) {
        return televerser(nom, pngUnique());
    }

    private UUID televerser(String nom, byte[] contenu) {
        String id = given().header("Authorization", "Bearer " + jetonGestionnaire)
                .multiPart("fichier", nom, contenu, "image/png")
                .queryParam("type", "CNI")
                .queryParam("adherentId", adherentId.toString())
                .when().post("/documents")
                .then().statusCode(201)
                .extract().path("id");
        return UUID.fromString(id);
    }

    /**
     * PNG valide au contenu <b>différent</b> à chaque appel : le service refuse deux fois le même fichier sur
     * le même adhérent (empreinte SHA-256 identique), ce qui est le comportement voulu — deux pièces réelles
     * ne sont jamais octet pour octet identiques. Une fixture qui réutiliserait le même PNG testerait la
     * détection de doublon au lieu du scénario visé.
     */
    private static byte[] pngUnique() {
        byte[] suffixe = UUID.randomUUID().toString().getBytes(StandardCharsets.US_ASCII);
        byte[] contenu = java.util.Arrays.copyOf(PNG, PNG.length + suffixe.length);
        System.arraycopy(suffixe, 0, contenu, PNG.length, suffixe.length);
        return contenu;
    }

    private void insererPeriodeDroits(UUID packId, LocalDate debut, LocalDate fin, int jours, String montant) {
        jdbcTemplate.update("""
                INSERT INTO periode_droits (id, adherent_id, date_debut, date_fin, jours_couverts, montant_impute,
                                            pack_id, statut, cree_par)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'COUVERTE', 'test')
                """, UUID.randomUUID(), adherentId, debut, fin, jours, new BigDecimal(montant), packId);
    }

    private UUID creerAdherent() {
        UUID activiteId = jdbcTemplate.queryForObject(
                "SELECT id FROM activite WHERE code = 'PETIT_COMMERCE'", UUID.class);
        UUID packId = jdbcTemplate.queryForObject("SELECT id FROM pack WHERE code = 'PACK_700'", UUID.class);
        String telephone = "6" + String.format("%08d", Math.abs(UUID.randomUUID().hashCode() % 100_000_000));

        String id = given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("nom", "Adherent CNPS " + suffixe, "telephonePrincipal", telephone,
                        "activiteId", activiteId.toString(), "zoneId", zoneId.toString(),
                        "localisation", "Marché central", "dateAdhesion", LocalDate.of(2026, 1, 1).toString(),
                        "packId", packId.toString(), "consentementDonnees", true,
                        "confirmationDoublonIgnore", true))
                .when().post("/adherents")
                .then().statusCode(201)
                .extract().path("id");
        return UUID.fromString(id);
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
}
