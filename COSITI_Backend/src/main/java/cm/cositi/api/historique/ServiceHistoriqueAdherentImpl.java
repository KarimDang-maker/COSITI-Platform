package cm.cositi.api.historique;

import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.historique.dto.CritereHistorique;
import cm.cositi.api.historique.dto.EvenementHistoriqueDto;
import cm.cositi.api.historique.dto.ModificationChampDto;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Predicate;

@Service
public class ServiceHistoriqueAdherentImpl implements ServiceHistoriqueAdherent {

    /** Permissions qui ouvrent l'historique financier (lecture des cotisations ou des frais d'adhésion). */
    static final Set<String> PERMISSIONS_FINANCIERES = Set.of("PAIEMENT:LIRE", "FRAIS_ADHESION:LIRE");

    /** Contexte repris des valeurs tracées : liste blanche, rien d'autre ne sort du journal. */
    static final List<String> CLES_DETAILS = List.of("numeroRecu", "reference", "montant", "montantSecuriteSociale",
            "montantEpargne", "origineRepartition", "statut", "modePaiement", "datePaiement", "typePaiement",
            "typeFrais", "typeDocument", "versionDocument", "decision", "typeOperation", "dateDebut", "dateFin",
            "joursCouverts", "montantImpute", "packId", "dateDebutPack", "matricule");

    /** Références métier, par ordre de préférence. */
    static final List<String> CLES_REFERENCE = List.of("numeroRecu", "reference", "matricule");

    /** Données personnelles sensibles : la modification est signalée, la valeur jamais restituée. */
    static final Set<String> CHAMPS_SENSIBLES = Set.of("numeroCni", "numeroCnps", "telephonePrincipal",
            "telephoneSecondaire", "whatsapp", "email", "dateNaissance", "latitude", "longitude");

    /** Champs techniques sans intérêt pour la lecture d'une modification. */
    static final Set<String> CHAMPS_IGNORES = Set.of("id", "version", "zoneLibelle", "creeLe", "modifieLe", "creePar",
            "modifiePar", "empreinteRequete");

    private static final int TAILLE_MAX = 200;

    private static final String CIBLES = """
            WITH cibles(entite, entite_id, categorie) AS (
                SELECT 'adherent', CAST(:adherentId AS uuid), 'MIXTE'
                UNION ALL SELECT 'paiement', id, 'FINANCIER' FROM paiement WHERE adherent_id = :adherentId
                UNION ALL SELECT 'affectation_paiement', ap.id, 'FINANCIER' FROM affectation_paiement ap
                    JOIN paiement p ON p.id = ap.paiement_id WHERE p.adherent_id = :adherentId
                UNION ALL SELECT 'frais_adhesion', id, 'FINANCIER' FROM frais_adhesion WHERE adherent_id = :adherentId
                UNION ALL SELECT 'periode_droits', id, 'FINANCIER' FROM periode_droits WHERE adherent_id = :adherentId
                UNION ALL SELECT 'document', id, 'GENERAL' FROM document WHERE adherent_id = :adherentId
                    OR paiement_id IN (SELECT id FROM paiement WHERE adherent_id = :adherentId)
                UNION ALL SELECT 'controle_dga', id, 'GENERAL' FROM controle_dga WHERE adherent_id = :adherentId
                UNION ALL SELECT 'dossier_cnps', id, 'GENERAL' FROM dossier_cnps WHERE adherent_id = :adherentId
                UNION ALL SELECT 'dossier_prestation_cnps', id, 'GENERAL' FROM dossier_prestation_cnps
                    WHERE adherent_id = :adherentId
                UNION ALL SELECT 'piece_dossier_cnps', pc.id, 'GENERAL' FROM piece_dossier_cnps pc
                    JOIN dossier_cnps d ON d.id = pc.dossier_id WHERE d.adherent_id = :adherentId
                UNION ALL SELECT 'affectation_portefeuille', id, 'GENERAL' FROM affectation_portefeuille
                    WHERE adherent_id = :adherentId
                UNION ALL SELECT 'relance', id, 'GENERAL' FROM relance WHERE adherent_id = :adherentId
                UNION ALL SELECT 'demande_validation', id,
                        CASE WHEN type_entite = 'PAIEMENT' THEN 'FINANCIER' ELSE 'GENERAL' END
                    FROM demande_validation
                    WHERE (type_entite = 'ADHERENT' AND entite_id = :adherentId)
                       OR (type_entite = 'PAIEMENT'
                           AND entite_id IN (SELECT id FROM paiement WHERE adherent_id = :adherentId))
            )
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final AdherentRepository adherentRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ObjectMapper objectMapper;
    private final ZoneId fuseau;
    private final Clock horloge;

    public ServiceHistoriqueAdherentImpl(JdbcTemplate jdbcTemplate, AdherentRepository adherentRepository,
                                         ServicePerimetreDonnees perimetre, ObjectMapper objectMapper,
                                         @Value("${cositi.fuseau-horaire:Africa/Douala}") String fuseau) {
        this.jdbc = new NamedParameterJdbcTemplate(jdbcTemplate);
        this.adherentRepository = adherentRepository;
        this.perimetre = perimetre;
        this.objectMapper = objectMapper;
        this.fuseau = ZoneId.of(fuseau);
        this.horloge = Clock.system(this.fuseau);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    @Transactional(readOnly = true)
    public ReponsePaginee<EvenementHistoriqueDto> historique(UUID adherentId, CategorieHistorique categorie,
                                                             CritereHistorique critere, int page, int taille,
                                                             Sort.Direction direction, Utilisateur demandeur) {
        verifierAcces(adherentId, categorie, demandeur);
        PeriodeHistorique.Fenetre fenetre = PeriodeHistorique.fenetre(critere.periode(), critere.date(), critere.du(),
                critere.au(), fuseau, LocalDate.now(horloge));
        if (critere.module() != null && !CatalogueEvenementsHistorique.modules(categorie).contains(critere.module())) {
            throw new ExceptionValidation("HISTORIQUE_MODULE_INCONNU", "Module inconnu pour cet historique : "
                    + critere.module() + ". Valeurs : " + CatalogueEvenementsHistorique.modules(categorie), "module");
        }
        Predicate<String> permission = permissions(demandeur);
        int tailleBornee = Math.max(1, Math.min(taille, TAILLE_MAX));
        int pageBornee = Math.max(page, 0);

        MapSqlParameterSource parametres = new MapSqlParameterSource("adherentId", adherentId);
        String filtre = filtre(categorie, critere, fenetre, permission, parametres);

        Long total = jdbc.queryForObject(CIBLES + """
                SELECT COUNT(*) FROM journal_audit j
                JOIN cibles c ON c.entite = j.entite AND c.entite_id = j.entite_id
                WHERE """ + filtre, parametres, Long.class);

        parametres.addValue("limite", tailleBornee).addValue("decalage", (long) pageBornee * tailleBornee);
        String ordre = direction == Sort.Direction.ASC ? "ASC" : "DESC";
        List<EvenementHistoriqueDto> contenu = jdbc.query(CIBLES + """
                SELECT j.id, j.horodatage, j.utilisateur_identifiant, j.type_operation, j.entite, j.entite_id,
                       j.valeurs_avant::text AS avant, j.valeurs_apres::text AS apres, j.motif, j.resultat,
                       j.correlation_id, c.categorie,
                       (SELECT string_agg(r.code, ',' ORDER BY r.code) FROM utilisateur_role ur
                            JOIN role r ON r.id = ur.role_id WHERE ur.utilisateur_id = j.utilisateur_id) AS roles
                FROM journal_audit j
                JOIN cibles c ON c.entite = j.entite AND c.entite_id = j.entite_id
                WHERE """ + filtre + " ORDER BY j.horodatage " + ordre + ", j.id " + ordre
                        + " LIMIT :limite OFFSET :decalage",
                parametres, (rs, i) -> ligne(rs, adherentId, categorie));

        long totalElements = total == null ? 0 : total;
        int totalPages = (int) ((totalElements + tailleBornee - 1) / tailleBornee);
        List<String> avertissements = new ArrayList<>();
        avertissements.add("Les rôles affichés sont les rôles actuels de l'auteur, pas nécessairement ceux qu'il "
                + "détenait au moment de l'action.");
        if (CatalogueEvenementsHistorique.contientMasques(categorie, permission)) {
            avertissements.add("Certaines opérations internes (contrôle DGA détaillé, dossier CNPS ou travail interne "
                    + "de la DAF) ne sont pas visibles avec vos permissions.");
        }
        return new ReponsePaginee<>(contenu, pageBornee, tailleBornee, totalElements, totalPages, avertissements);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    @Transactional(readOnly = true)
    public long compter(UUID adherentId, CategorieHistorique categorie, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        Predicate<String> permission = permissions(demandeur);
        if (categorie == CategorieHistorique.FINANCIER && PERMISSIONS_FINANCIERES.stream().noneMatch(permission)) {
            return -1;
        }
        MapSqlParameterSource parametres = new MapSqlParameterSource("adherentId", adherentId);
        String filtre = filtre(categorie, new CritereHistorique(null, null, null, null, null, null),
                PeriodeHistorique.Fenetre.TOUT, permission, parametres);
        Long total = jdbc.queryForObject(CIBLES + """
                SELECT COUNT(*) FROM journal_audit j
                JOIN cibles c ON c.entite = j.entite AND c.entite_id = j.entite_id
                WHERE """ + filtre, parametres, Long.class);
        return total == null ? 0 : total;
    }

    // ------------------------------------------------------------------
    // Interne
    // ------------------------------------------------------------------

    private void verifierAcces(UUID adherentId, CategorieHistorique categorie, Utilisateur demandeur) {
        if (!adherentRepository.existsById(adherentId)) {
            throw new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable.");
        }
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        if (categorie == CategorieHistorique.FINANCIER
                && PERMISSIONS_FINANCIERES.stream().noneMatch(permissions(demandeur))) {
            throw new ExceptionAutorisation("HISTORIQUE_FINANCIER_INACCESSIBLE",
                    "Vos permissions ne donnent pas accès à l'historique financier de cet adhérent.");
        }
    }

    private static Predicate<String> permissions(Utilisateur utilisateur) {
        Set<String> codes = new java.util.HashSet<>();
        utilisateur.getAuthorities().forEach(a -> codes.add(a.getAuthority()));
        return codes::contains;
    }

    /** Condition SQL : types visibles de la catégorie, filtres de type / module, fenêtre temporelle. */
    private static String filtre(CategorieHistorique categorie, CritereHistorique critere,
                                 PeriodeHistorique.Fenetre fenetre, Predicate<String> permission,
                                 MapSqlParameterSource parametres) {
        List<String> typesLibres = new ArrayList<>();
        List<String> typesParEntite = new ArrayList<>();
        for (CatalogueEvenementsHistorique.Regle r : CatalogueEvenementsHistorique.reglesVisibles(categorie, permission)) {
            if (critere.module() != null && !critere.module().equals(r.module())) {
                continue;
            }
            if (critere.types() != null && !critere.types().isEmpty() && !critere.types().contains(r.type())) {
                continue;
            }
            (r.entite() == null ? typesLibres : typesParEntite).add(r.cle());
        }
        List<String> typesDemandes = new ArrayList<>();
        if (critere.module() == null || "VALIDATION".equals(critere.module())) {
            for (TypeOperation t : CatalogueEvenementsHistorique.TYPES_DEMANDES) {
                if (critere.types() == null || critere.types().isEmpty() || critere.types().contains(t)) {
                    typesDemandes.add(t.name());
                }
            }
        }
        // Une liste vide dans IN () est invalide en SQL : une valeur inatteignable la remplace.
        parametres.addValue("typesLibres", nonVide(typesLibres));
        parametres.addValue("typesParEntite", nonVide(typesParEntite));
        parametres.addValue("typesDemandes", nonVide(typesDemandes));
        parametres.addValue("categorie", categorie.name());

        StringBuilder sql = new StringBuilder("""
                (j.type_operation IN (:typesLibres)
                 OR (j.type_operation || '@' || j.entite) IN (:typesParEntite)
                 OR (c.entite = 'demande_validation' AND c.categorie = :categorie
                     AND j.type_operation IN (:typesDemandes)))""");
        if (fenetre.debut() != null) {
            sql.append(" AND j.horodatage >= :debut");
            parametres.addValue("debut", Timestamp.from(fenetre.debut()));
        }
        if (fenetre.fin() != null) {
            sql.append(" AND j.horodatage < :fin");
            parametres.addValue("fin", Timestamp.from(fenetre.fin()));
        }
        return sql.toString();
    }

    private static List<String> nonVide(List<String> valeurs) {
        return valeurs.isEmpty() ? List.of("__AUCUN__") : valeurs;
    }

    private EvenementHistoriqueDto ligne(ResultSet rs, UUID adherentId, CategorieHistorique categorie)
            throws SQLException {
        TypeOperation type = TypeOperation.valueOf(rs.getString("type_operation"));
        String entite = rs.getString("entite");
        CategorieHistorique categorieCible = "FINANCIER".equals(rs.getString("categorie"))
                ? CategorieHistorique.FINANCIER : "GENERAL".equals(rs.getString("categorie"))
                ? CategorieHistorique.GENERAL : categorie;
        var regle = CatalogueEvenementsHistorique.regle(type, entite, categorieCible);
        JsonNode avant = lireJson(rs.getString("avant"));
        JsonNode apres = lireJson(rs.getString("apres"));
        String roles = rs.getString("roles");
        return new EvenementHistoriqueDto(
                rs.getObject("id", UUID.class),
                adherentId,
                rs.getObject("horodatage", Timestamp.class).toInstant(),
                rs.getString("utilisateur_identifiant"),
                roles == null ? List.of() : Arrays.asList(roles.split(",")),
                type,
                regle.map(CatalogueEvenementsHistorique.Regle::categorie).orElse(categorie),
                regle.map(CatalogueEvenementsHistorique.Regle::module).orElse(null),
                regle.map(CatalogueEvenementsHistorique.Regle::libelle).orElse(type.name()),
                rs.getString("resultat"),
                reference(apres, avant),
                entite,
                rs.getObject("entite_id", UUID.class),
                rs.getString("motif"),
                details(avant, apres),
                modifications(avant, apres),
                rs.getString("correlation_id"));
    }

    private JsonNode lireJson(String texte) {
        if (texte == null) {
            return null;
        }
        try {
            return objectMapper.readTree(texte);
        } catch (Exception e) {
            return null;
        }
    }

    /** Valeur d'une clé au premier niveau, ou dans un objet imbriqué d'un niveau ({@code {"frais": {...}}}). */
    static JsonNode valeur(JsonNode noeud, String cle) {
        if (noeud == null || !noeud.isObject()) {
            return null;
        }
        if (noeud.has(cle) && !noeud.get(cle).isNull()) {
            return noeud.get(cle);
        }
        for (Iterator<JsonNode> it = noeud.elements(); it.hasNext(); ) {
            JsonNode enfant = it.next();
            if (enfant.isObject() && enfant.has(cle) && !enfant.get(cle).isNull()) {
                return enfant.get(cle);
            }
        }
        return null;
    }

    static String reference(JsonNode apres, JsonNode avant) {
        for (String cle : CLES_REFERENCE) {
            JsonNode v = valeur(apres, cle);
            if (v == null) {
                v = valeur(avant, cle);
            }
            if (v != null && v.isValueNode()) {
                return v.asText();
            }
        }
        return null;
    }

    static Map<String, Object> details(JsonNode avant, JsonNode apres) {
        Map<String, Object> details = new LinkedHashMap<>();
        if (apres != null && apres.isValueNode() && avant != null && avant.isValueNode()) {
            // Changement de statut tracé en valeurs simples : « PREINSCRIT » -> « ACTIF ».
            details.put("valeurAvant", avant.asText());
            details.put("valeurApres", apres.asText());
            return details;
        }
        for (String cle : CLES_DETAILS) {
            JsonNode v = valeur(apres, cle);
            if (v != null && v.isValueNode()) {
                details.put(cle, scalaire(v));
            }
        }
        JsonNode statutAvant = valeur(avant, "statut");
        if (statutAvant != null && statutAvant.isValueNode()
                && !statutAvant.asText().equals(String.valueOf(details.get("statut")))) {
            details.put("statutAvant", statutAvant.asText());
        }
        return details;
    }

    static List<ModificationChampDto> modifications(JsonNode avant, JsonNode apres) {
        if (avant == null || apres == null || !avant.isObject() || !apres.isObject()) {
            return List.of();
        }
        List<ModificationChampDto> modifications = new ArrayList<>();
        for (Iterator<String> it = apres.fieldNames(); it.hasNext(); ) {
            String champ = it.next();
            if (CHAMPS_IGNORES.contains(champ)) {
                continue;
            }
            JsonNode a = avant.get(champ);
            JsonNode b = apres.get(champ);
            boolean scalaires = (a == null || a.isValueNode()) && b.isValueNode();
            if (!scalaires || (a != null && a.equals(b)) || (a == null && b.isNull())
                    || (a != null && a.isNull() && b.isNull())) {
                continue;
            }
            if (CHAMPS_SENSIBLES.contains(champ)) {
                modifications.add(new ModificationChampDto(champ, "***", "***", true));
            } else {
                modifications.add(new ModificationChampDto(champ, a == null ? null : scalaire(a), scalaire(b), false));
            }
        }
        return modifications;
    }

    private static Object scalaire(JsonNode v) {
        if (v == null || v.isNull()) {
            return null;
        }
        if (v.isNumber()) {
            return v.decimalValue();
        }
        if (v.isBoolean()) {
            return v.booleanValue();
        }
        return v.asText();
    }
}
