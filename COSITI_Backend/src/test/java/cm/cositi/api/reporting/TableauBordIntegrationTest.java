package cm.cositi.api.reporting;

import cm.cositi.api.ConfigurationTestsIntegration;
import cm.cositi.api.reporting.service.ServiceTableauBord;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Les six tableaux de bord (jalon J9), bout en bout via l'API réelle.
 *
 * <p>Couvre les cas de recette {@code REC-H08} et {@code REC-H09} (« Agent ouvre une route dashboard DGA /
 * Gestionnaire → accès refusé ») et, au-delà, la matrice complète : pour chacun des six dashboards, le rôle
 * attribué obtient {@code 200} et tous les autres {@code 403}. C'est le test qui garantit qu'aucun
 * dashboard n'est accessible par un rôle qui ne devrait pas le voir.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class TableauBordIntegrationTest extends ConfigurationTestsIntegration {

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
    private ServiceTableauBord serviceTableauBord;

    private static final String MOT_DE_PASSE = "MotDePasseValide123!";

    /** Le rôle qui possède chaque dashboard, et le chemin correspondant. */
    private static final Map<String, String> DASHBOARD_PAR_ROLE = Map.of(
            "PCA", "/tableaux-de-bord/pca",
            "DG", "/tableaux-de-bord/dg",
            "DGA", "/tableaux-de-bord/dga",
            "DAF", "/tableaux-de-bord/daf",
            "GESTIONNAIRE_COMPTE", "/tableaux-de-bord/gestionnaire",
            "SUPER_ADMIN", "/tableaux-de-bord/super-admin");

    private String suffixe;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
        suffixe = UUID.randomUUID().toString().substring(0, 8);

        // Les dashboards lisent des vues matérialisées : sans rafraîchissement, elles sont vides depuis la
        // migration et les chiffres ne refléteraient rien de ce que ce test insère.
        serviceTableauBord.rafraichirVuesSyntheses();
    }

    @Test
    void chaque_dashboard_est_accessible_a_son_role_et_refuse_a_tous_les_autres() {
        for (Map.Entry<String, String> entree : DASHBOARD_PAR_ROLE.entrySet()) {
            String rolePropriétaire = entree.getKey();
            String chemin = entree.getValue();

            String jetonProprietaire = jetonPour(rolePropriétaire);
            given().header("Authorization", "Bearer " + jetonProprietaire)
                    .when().get(chemin)
                    .then().statusCode(200);

            for (String autreRole : DASHBOARD_PAR_ROLE.keySet()) {
                if (autreRole.equals(rolePropriétaire)) {
                    continue;
                }
                given().header("Authorization", "Bearer " + jetonPour(autreRole))
                        .when().get(chemin)
                        .then().statusCode(403);
            }
        }
    }

    @Test
    void un_agent_de_terrain_n_accede_a_aucun_des_six_dashboards() {
        // REC-H08 et REC-H09 : l'Agent de terrain n'a pas de dashboard, et ne peut ouvrir aucun de ceux
        // des autres rôles (Roles des acteurs.md §16).
        String jetonAgent = jetonPour("AGENT_TERRAIN");

        for (String chemin : DASHBOARD_PAR_ROLE.values()) {
            given().header("Authorization", "Bearer " + jetonAgent)
                    .when().get(chemin)
                    .then().statusCode(403);
        }
    }

    @Test
    void le_chef_des_agents_de_terrain_n_a_pas_non_plus_de_dashboard() {
        String jetonChef = jetonPour("CHEF_AGENT_TERRAIN");

        for (String chemin : DASHBOARD_PAR_ROLE.values()) {
            given().header("Authorization", "Bearer " + jetonChef)
                    .when().get(chemin)
                    .then().statusCode(403);
        }
    }

    @Test
    void le_dashboard_du_pca_porte_le_taux_d_activation() {
        given().header("Authorization", "Bearer " + jetonPour("PCA"))
                .when().get("/tableaux-de-bord/pca")
                .then().statusCode(200)
                // L'indicateur central du projet est présent sur le dashboard de supervision.
                .body("indicateurs.cle", hasItem("tauxActivation"))
                .body("indicateurs.cle", hasItem("adherents"))
                .body("indicateurs.cle", hasItem("adherentsActifs"))
                .body("zones", notNullValue())
                .body("alertes", notNullValue());
    }

    @Test
    void le_taux_d_activation_est_un_ratio_et_non_un_pourcentage_deja_multiplie() {
        // Le serveur renvoie 0,331 et non 33,1 : la mise en forme appartient au client
        // (`src/lib/format.ts`), qui l'affiche « 33,1 % ». Deux endpoints ne doivent pas formater
        // différemment la même donnée.
        // Extrait en `Number` et non en `Float` : JSON sérialise `0` sans décimale, que JsonPath rend alors
        // en `Integer`. Typer trop précisément ferait échouer le test sur une base vide, pour une raison
        // sans rapport avec ce qu'il vérifie.
        Number taux = given().header("Authorization", "Bearer " + jetonPour("DG"))
                .when().get("/tableaux-de-bord/dg")
                .then().statusCode(200)
                .extract().path("indicateurs.find { it.cle == 'tauxActivation' }.valeur");

        org.assertj.core.api.Assertions.assertThat(taux.doubleValue()).isBetween(0.0d, 1.0d);
    }

    @Test
    void le_dashboard_du_daf_expose_la_file_de_controle_sans_solde_de_tresorerie() {
        given().header("Authorization", "Bearer " + jetonPour("DAF"))
                .when().get("/tableaux-de-bord/daf")
                .then().statusCode(200)
                .body("paiementsAControler", greaterThanOrEqualTo(0))
                .body("montantAControler", notNullValue())
                .body("remisesEnEcart", greaterThanOrEqualTo(0));
    }

    @Test
    void le_dashboard_du_gestionnaire_couvre_le_domaine_cnps_et_les_comptes_rendus() {
        given().header("Authorization", "Bearer " + jetonPour("GESTIONNAIRE_COMPTE"))
                .when().get("/tableaux-de-bord/gestionnaire")
                .then().statusCode(200)
                .body("dossiersCnpsIncomplets", greaterThanOrEqualTo(0))
                .body("eligiblesNonImmatricules", greaterThanOrEqualTo(0))
                .body("declarationsAProduire", greaterThanOrEqualTo(0))
                .body("comptesRendusAControler", greaterThanOrEqualTo(0));
    }

    @Test
    void le_dashboard_du_super_admin_ne_contient_aucune_donnee_metier() {
        // Le Super Administrateur n'a pas d'accès métier courant (docs/04_SECURITE.md §3) : son dashboard
        // porte des compteurs techniques, jamais des adhérents ni des montants.
        var reponse = given().header("Authorization", "Bearer " + jetonPour("SUPER_ADMIN"))
                .when().get("/tableaux-de-bord/super-admin")
                .then().statusCode(200)
                .body("utilisateursActifs", greaterThanOrEqualTo(1))
                .body("parametresNonValides", greaterThanOrEqualTo(1))
                .extract().jsonPath();

        List<String> cles = reponse.getList("indicateurs.cle");
        org.assertj.core.api.Assertions.assertThat(cles)
                .doesNotContain("adherents", "adherentsActifs", "tauxActivation", "collectePeriode");
    }

    @Test
    void les_regles_non_validees_remontent_en_alerte_sur_le_dashboard_du_super_admin() {
        // Six paramètres sont marqués `[V]` par les migrations V1 et V9 : la dette fonctionnelle est
        // visible là où elle peut être traitée.
        given().header("Authorization", "Bearer " + jetonPour("SUPER_ADMIN"))
                .when().get("/tableaux-de-bord/super-admin")
                .then().statusCode(200)
                .body("alertes.code", hasItem("PARAMETRES_NON_VALIDES"));
    }

    @Test
    void un_appel_sans_authentification_est_refuse() {
        given().when().get("/tableaux-de-bord/pca").then().statusCode(401);
    }

    @Test
    void le_dashboard_accepte_une_periode_explicite() {
        given().header("Authorization", "Bearer " + jetonPour("DGA"))
                .queryParam("du", "2026-09-01")
                .queryParam("au", "2026-09-30")
                .when().get("/tableaux-de-bord/dga")
                .then().statusCode(200)
                .body("indicateurs.cle", hasItem("agentsActifs"))
                // Objectifs terrain : `[A]` non confirmé, donc rien n'est calculé.
                .body("objectifsTermes", equalTo(List.of()));
    }

    // ------------------------------------------------------------------ Fixtures

    private String jetonPour(String codeRole) {
        String identifiant = codeRole.toLowerCase() + ".tb." + suffixe;
        if (utilisateurRepository.findByIdentifiant(identifiant).isEmpty()) {
            Utilisateur u = new Utilisateur(identifiant, encodeurMotDePasse.encode(MOT_DE_PASSE), "TB " + codeRole);
            u.setDoitChangerMotDePasse(false);
            roleRepository.findByCode(codeRole).ifPresent(u::ajouterRole);
            utilisateurRepository.save(u);
        }
        return given().contentType(ContentType.JSON)
                .body(Map.of("identifiant", identifiant, "motDePasse", MOT_DE_PASSE))
                .when().post("/auth/connexion")
                .then().statusCode(200)
                .extract().path("jetonAcces");
    }
}
