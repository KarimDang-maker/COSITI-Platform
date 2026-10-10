package cm.cositi.api.administration;

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
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Administration et durcissement (jalon J11), bout en bout via l'API réelle.
 *
 * <p>Couvre {@code REC-H14} (« Super Admin administre un compte → action auditée ») et les garde-fous qui
 * rendent l'administration sûre : rôles fermés, impossibilité de se désactiver soi-même, journal d'audit
 * réellement non modifiable jusque dans la base.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class AdministrationIntegrationTest extends ConfigurationTestsIntegration {

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

    /**
     * Fragment du message levé par le déclencheur `trg_journal_audit_immuable` (V13). Vérifié par
     * inclusion et non par égalité : PostgreSQL préfixe selon la locale du serveur (`ERROR`/`ERREUR`) et
     * ajoute une ligne de contexte `PL/pgSQL function...`.
     */
    private static final String MESSAGE_AUDIT_IMMUABLE =
            "Le journal d'audit est append-only : %s interdit sur journal_audit.";

    private String suffixe;
    private String jetonAdmin;
    private String jetonGestionnaire;
    private UUID idAdmin;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
        suffixe = UUID.randomUUID().toString().substring(0, 8);

        // Deux administrateurs : le second garantit que le premier n'est jamais « le dernier ».
        jetonAdmin = creerUtilisateur("admin.adm." + suffixe, "SUPER_ADMIN");
        creerUtilisateur("admin2.adm." + suffixe, "SUPER_ADMIN");
        jetonGestionnaire = creerUtilisateur("gest.adm." + suffixe, "GESTIONNAIRE_COMPTE");

        idAdmin = jdbcTemplate.queryForObject("SELECT id FROM utilisateur WHERE identifiant = ?", UUID.class,
                "admin.adm." + suffixe);
    }

    // ------------------------------------------------------------------ REC-H14

    @Test
    void le_super_admin_cree_un_compte_dont_le_mot_de_passe_est_revele_une_seule_fois_et_audite() {
        var reponse = given().header("Authorization", "Bearer " + jetonAdmin).contentType(ContentType.JSON)
                .body(Map.of("identifiant", "nouveau." + suffixe, "nomComplet", "Compte Nouveau",
                        "email", "nouveau@example.org", "roles", List.of("AGENT_TERRAIN")))
                .when().post("/administration/utilisateurs")
                .then().statusCode(201)
                .body("motDePasseInitial", notNullValue())
                .body("utilisateur.identifiant", equalTo("nouveau." + suffixe))
                // Un mot de passe initial est transitoire par construction.
                .body("utilisateur.doitChangerMotDePasse", equalTo(true))
                .body("utilisateur.roles", hasItem("AGENT_TERRAIN"))
                .extract().jsonPath();

        String id = reponse.getString("utilisateur.id");
        String motDePasse = reponse.getString("motDePasseInitial");

        // Le compte est utilisable immédiatement avec ce mot de passe...
        given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", "nouveau." + suffixe, "motDePasse", motDePasse))
                .when().post("/auth/connexion")
                .then().statusCode(200);

        // ...mais il n'est relisible nulle part ensuite.
        given().header("Authorization", "Bearer " + jetonAdmin)
                .when().get("/administration/utilisateurs/" + id)
                .then().statusCode(200)
                .body("motDePasseInitial", org.hamcrest.Matchers.nullValue())
                .body("motDePasseHash", org.hamcrest.Matchers.nullValue());

        // REC-H14 : l'action est auditée.
        Integer traces = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM journal_audit
                WHERE type_operation = 'UTILISATEUR_CREATION' AND entite_id = ?
                """, Integer.class, UUID.fromString(id));
        assertThat(traces).isEqualTo(1);

        // Et le mot de passe n'apparaît nulle part dans le journal (docs/04_SECURITE.md §8).
        Integer fuites = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM journal_audit WHERE valeurs_apres::text LIKE ?", Integer.class,
                "%" + motDePasse + "%");
        assertThat(fuites).isZero();
    }

    @Test
    void un_changement_de_role_est_historise_avec_son_motif() {
        String id = creerCompte("role." + suffixe, "AGENT_TERRAIN");

        given().header("Authorization", "Bearer " + jetonAdmin).contentType(ContentType.JSON)
                .body(Map.of("roles", List.of("GESTIONNAIRE_COMPTE"),
                        "motif", "Mutation au service des comptes"))
                .when().post("/administration/utilisateurs/" + id + "/roles")
                .then().statusCode(200)
                .body("roles", hasItem("GESTIONNAIRE_COMPTE"))
                .body("roles", org.hamcrest.Matchers.not(hasItem("AGENT_TERRAIN")));

        // Un retrait et une attribution, chacun avec le motif : l'historique garde la raison, pas seulement
        // la trace (Roles des acteurs.md §14, « historique des changements de responsabilité »).
        var lignes = jdbcTemplate.queryForList("""
                SELECT role_code, action, motif FROM historique_role_utilisateur
                WHERE utilisateur_id = ? ORDER BY horodatage
                """, UUID.fromString(id));

        assertThat(lignes).hasSize(3); // création + retrait + attribution
        assertThat(lignes).anySatisfy(l -> {
            assertThat(l.get("action")).isEqualTo("RETRAIT");
            assertThat(l.get("role_code")).isEqualTo("AGENT_TERRAIN");
            assertThat(l.get("motif")).isEqualTo("Mutation au service des comptes");
        });
    }

    @Test
    void refuse_un_role_qui_n_existe_pas_plutot_que_de_le_creer() {
        String id = creerCompte("inconnu." + suffixe, "AGENT_TERRAIN");

        // Les huit rôles V1 sont fermés (Roles des acteurs.md §16) : pas de Téléconseiller, jamais.
        given().header("Authorization", "Bearer " + jetonAdmin).contentType(ContentType.JSON)
                .body(Map.of("roles", List.of("TELECONSEILLER"), "motif", "Test"))
                .when().post("/administration/utilisateurs/" + id + "/roles")
                .then().statusCode(400)
                .body("code", equalTo("ROLE_INCONNU"));
    }

    @Test
    void un_administrateur_ne_peut_pas_desactiver_son_propre_compte() {
        given().header("Authorization", "Bearer " + jetonAdmin).contentType(ContentType.JSON)
                .body(Map.of("actif", false, "motif", "Erreur de manipulation"))
                .when().post("/administration/utilisateurs/" + idAdmin + "/activation")
                .then().statusCode(400)
                .body("code", equalTo("ADMINISTRATION_AUTO_DESACTIVATION"));
    }

    @Test
    void un_administrateur_ne_peut_pas_retirer_son_propre_role_d_administration() {
        given().header("Authorization", "Bearer " + jetonAdmin).contentType(ContentType.JSON)
                .body(Map.of("roles", List.of("AGENT_TERRAIN"), "motif", "Changement de poste"))
                .when().post("/administration/utilisateurs/" + idAdmin + "/roles")
                .then().statusCode(400)
                .body("code", equalTo("ADMINISTRATION_AUTO_RETRAIT"));
    }

    @Test
    void desactive_un_compte_avec_motif_et_l_empeche_de_se_connecter() {
        String id = creerCompte("adesactiver." + suffixe, "AGENT_TERRAIN");

        given().header("Authorization", "Bearer " + jetonAdmin).contentType(ContentType.JSON)
                .body(Map.of("actif", false, "motif", "Fin de contrat"))
                .when().post("/administration/utilisateurs/" + id + "/activation")
                .then().statusCode(200)
                .body("actif", equalTo(false));

        given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", "adesactiver." + suffixe, "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(401);
    }

    @Test
    void aucune_route_ne_permet_de_supprimer_un_compte() {
        String id = creerCompte("jamais.supprime." + suffixe, "AGENT_TERRAIN");

        // AGENTS.md règle absolue n°3 : aucune suppression physique. Un compte se désactive.
        given().header("Authorization", "Bearer " + jetonAdmin)
                .when().delete("/administration/utilisateurs/" + id)
                .then().statusCode(org.hamcrest.Matchers.anyOf(equalTo(403), equalTo(405), equalTo(404)));

        assertThat(utilisateurRepository.findById(UUID.fromString(id))).isPresent();
    }

    // ------------------------------------------------------------------ Paramètres

    @Test
    void modifie_un_parametre_avec_motif_et_trace_la_valeur_avant_et_apres() {
        given().header("Authorization", "Bearer " + jetonAdmin).contentType(ContentType.JSON)
                .body(Map.of("valeur", "45", "motif", "Arbitrage du DAF du 23/09"))
                .when().put("/administration/parametres/DELAI_RETARD_JOURS")
                .then().statusCode(200)
                .body("valeur", equalTo("45"))
                .body("modifiePar", equalTo("admin.adm." + suffixe));

        var trace = jdbcTemplate.queryForMap("""
                SELECT valeurs_avant::text AS avant, valeurs_apres::text AS apres, motif
                FROM journal_audit WHERE type_operation = 'PARAMETRE_MODIFICATION'
                ORDER BY horodatage DESC LIMIT 1
                """);
        assertThat(String.valueOf(trace.get("avant"))).contains("30");
        assertThat(String.valueOf(trace.get("apres"))).contains("45");
        assertThat(trace.get("motif")).isEqualTo("Arbitrage du DAF du 23/09");

        jdbcTemplate.update("UPDATE parametre SET valeur = '30' WHERE cle = 'DELAI_RETARD_JOURS'");
    }

    @Test
    void refuse_une_valeur_de_parametre_incompatible_avec_son_type() {
        // `DELAI_RETARD_JOURS` est un ENTIER : « trente » ferait échouer le calcul de régularité en pleine
        // nuit, loin de l'écran qui l'a saisi.
        given().header("Authorization", "Bearer " + jetonAdmin).contentType(ContentType.JSON)
                .body(Map.of("valeur", "trente", "motif", "Test"))
                .when().put("/administration/parametres/DELAI_RETARD_JOURS")
                .then().statusCode(400)
                .body("code", equalTo("PARAMETRE_VALEUR_INVALIDE"));
    }

    @Test
    void expose_les_huit_roles_fermes_avec_leurs_permissions() {
        var codes = given().header("Authorization", "Bearer " + jetonAdmin)
                .when().get("/administration/roles")
                .then().statusCode(200)
                .extract().jsonPath().getList("code", String.class);

        assertThat(codes).containsExactlyInAnyOrder("PCA", "DG", "DGA", "DAF", "GESTIONNAIRE_COMPTE",
                "CHEF_AGENT_TERRAIN", "AGENT_TERRAIN", "SUPER_ADMIN");
    }

    // ------------------------------------------------------------------ RBAC

    @Test
    void un_gestionnaire_n_accede_a_aucune_route_d_administration() {
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/administration/utilisateurs").then().statusCode(403);
        given().header("Authorization", "Bearer " + jetonGestionnaire)
                .when().get("/administration/parametres").then().statusCode(403);
        given().header("Authorization", "Bearer " + jetonGestionnaire).contentType(ContentType.JSON)
                .body(Map.of("valeur", "1", "motif", "Tentative"))
                .when().put("/administration/parametres/DELAI_RETARD_JOURS").then().statusCode(403);
    }

    // ------------------------------------------------------- Journal immuable

    @Test
    void le_journal_d_audit_refuse_toute_modification_jusque_dans_la_base() {
        // docs/04_SECURITE.md §11 : « journal d'audit non modifiable ». Une protection applicative seule
        // céderait à la première requête SQL directe — le déclencheur de V13 tient même depuis psql.
        // Spring enveloppe l'erreur PostgreSQL : le message du déclencheur est dans la cause racine.
        assertThatThrownBy(() -> jdbcTemplate.update("UPDATE journal_audit SET motif = 'réécrit'"))
                .isInstanceOf(DataAccessException.class)
                .rootCause().hasMessageContaining(MESSAGE_AUDIT_IMMUABLE.formatted("UPDATE"));

        assertThatThrownBy(() -> jdbcTemplate.update("DELETE FROM journal_audit"))
                .isInstanceOf(DataAccessException.class)
                .rootCause().hasMessageContaining(MESSAGE_AUDIT_IMMUABLE.formatted("DELETE"));
    }

    // ------------------------------------------------------------------ Fixtures

    private String creerCompte(String identifiant, String role) {
        return given().header("Authorization", "Bearer " + jetonAdmin).contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "nomComplet", "Compte " + identifiant,
                        "roles", List.of(role)))
                .when().post("/administration/utilisateurs")
                .then().statusCode(201)
                .extract().path("utilisateur.id");
    }

    private String creerUtilisateur(String identifiant, String codeRole) {
        Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "Adm " + identifiant);
        u.setDoitChangerMotDePasse(false);
        roleRepository.findByCode(codeRole).ifPresent(u::ajouterRole);
        utilisateurRepository.save(u);

        return given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(200)
                .extract().path("jetonAcces");
    }
}
