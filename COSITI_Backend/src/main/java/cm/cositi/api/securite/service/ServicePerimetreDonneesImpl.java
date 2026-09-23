package cm.cositi.api.securite.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class ServicePerimetreDonneesImpl implements ServicePerimetreDonnees {

    private static final Set<String> ROLES_PERIMETRE_GLOBAL =
            Set.of("PCA", "DG", "DGA", "DAF", "SUPER_ADMIN");

    /**
     * Décision d'implémentation J2 : faute de champ d'assignation organisationnelle pour ce rôle dans le
     * schéma actuel, GESTIONNAIRE_COMPTE est traité comme périmètre global sur les adhérents (voir
     * Javadoc de {@link ServicePerimetreDonnees}). À réviser si une notion de zone/portefeuille lui est
     * un jour attribuée.
     */
    private static final Set<String> ROLES_PERIMETRE_ADHERENT_GLOBAL_V1 = Set.of(
            "PCA", "DG", "DGA", "DAF", "SUPER_ADMIN", "GESTIONNAIRE_COMPTE");

    private final JdbcTemplate jdbcTemplate;

    public ServicePerimetreDonneesImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public boolean estPerimetreGlobal(Utilisateur utilisateur) {
        return utilisateur.getRoles().stream().anyMatch(r -> ROLES_PERIMETRE_GLOBAL.contains(r.getCode()));
    }

    @Override
    public Specification<Adherent> perimetreAdherent(Utilisateur utilisateur) {
        if (perimetreAdherentGlobal(utilisateur)) {
            return Specification.where(null);
        }
        if (utilisateur.getAgentId() == null) {
            // Rôle terrain sans agent lié : aucun portefeuille, donc aucun adhérent visible.
            return (root, query, cb) -> cb.disjunction();
        }
        List<UUID> idsAccessibles = adherentsDuPerimetreAgent(utilisateur);
        if (idsAccessibles.isEmpty()) {
            return (root, query, cb) -> cb.disjunction();
        }
        return (root, query, cb) -> root.get("id").in(idsAccessibles);
    }

    @Override
    public void verifierAccesAdherent(Utilisateur utilisateur, UUID adherentId) {
        if (perimetreAdherentGlobal(utilisateur)) {
            return;
        }
        if (utilisateur.getAgentId() == null || !adherentsDuPerimetreAgent(utilisateur).contains(adherentId)) {
            throw new ExceptionAutorisation("PERIMETRE_ADHERENT_REFUSE",
                    "Cet adhérent n'appartient pas à votre périmètre.");
        }
    }

    @Override
    public boolean peutAccederAdherent(Utilisateur utilisateur, UUID adherentId) {
        if (perimetreAdherentGlobal(utilisateur)) {
            return true;
        }
        return utilisateur.getAgentId() != null && adherentsDuPerimetreAgent(utilisateur).contains(adherentId);
    }

    @Override
    public Specification<Paiement> perimetrePaiement(Utilisateur utilisateur) {
        if (perimetreAdherentGlobal(utilisateur)) {
            return Specification.where(null);
        }
        if (utilisateur.getAgentId() == null) {
            return (root, query, cb) -> cb.disjunction();
        }
        List<UUID> idsAccessibles = adherentsDuPerimetreAgent(utilisateur);
        if (idsAccessibles.isEmpty()) {
            return (root, query, cb) -> cb.disjunction();
        }
        return (root, query, cb) -> root.get("adherentId").in(idsAccessibles);
    }

    @Override
    public void verifierAccesPaiement(Utilisateur utilisateur, UUID paiementId) {
        if (perimetreAdherentGlobal(utilisateur)) {
            return;
        }
        UUID adherentId;
        try {
            adherentId = jdbcTemplate.queryForObject("SELECT adherent_id FROM paiement WHERE id = ?", UUID.class, paiementId);
        } catch (EmptyResultDataAccessException e) {
            throw new ExceptionRessourceIntrouvable("PAIEMENT_INTROUVABLE", "Paiement introuvable.");
        }
        verifierAccesAdherent(utilisateur, adherentId);
    }

    private boolean perimetreAdherentGlobal(Utilisateur utilisateur) {
        return utilisateur.getRoles().stream().anyMatch(r -> ROLES_PERIMETRE_ADHERENT_GLOBAL_V1.contains(r.getCode()));
    }

    /**
     * Périmètre agent/chef : adhérents de son propre portefeuille ouvert, plus — pour un Chef des agents de
     * terrain — les portefeuilles ouverts de tous les agents dont il est {@code chef_agent_id}
     * (docs/02_CLASSES_ET_METHODES.md « ServicePerimetreDonnees »).
     */
    private List<UUID> adherentsDuPerimetreAgent(Utilisateur utilisateur) {
        boolean estChef = utilisateur.possedeRole("CHEF_AGENT_TERRAIN");
        String sql = estChef
                ? """
                  SELECT ap.adherent_id FROM affectation_portefeuille ap
                  JOIN agent a ON a.id = ap.agent_id
                  WHERE ap.date_fin IS NULL AND (ap.agent_id = ? OR a.chef_agent_id = ?)
                  """
                : """
                  SELECT ap.adherent_id FROM affectation_portefeuille ap
                  WHERE ap.date_fin IS NULL AND ap.agent_id = ?
                  """;
        UUID agentId = utilisateur.getAgentId();
        Object[] parametres = estChef ? new Object[]{agentId, agentId} : new Object[]{agentId};
        return jdbcTemplate.query(sql, parametres, (rs, rowNum) -> (UUID) rs.getObject("adherent_id"));
    }
}
