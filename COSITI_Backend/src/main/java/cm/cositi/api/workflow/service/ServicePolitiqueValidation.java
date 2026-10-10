package cm.cositi.api.workflow.service;

import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.workflow.entite.DemandeValidation;
import cm.cositi.api.workflow.entite.TypeOperationWorkflow;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Autorité de décision (§7 {@code ValidationPolicyService}, §20). La politique combine opération, état, périmètre
 * et permission — jamais un test de rôle « supérieur ». Les permissions viennent de {@code role_permission} : la
 * matrice se règle en base, sans changer le code.
 */
@Service
public class ServicePolitiqueValidation {

    private final JdbcTemplate jdbcTemplate;

    public ServicePolitiqueValidation(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public static boolean possedePermission(Utilisateur utilisateur, String code) {
        return utilisateur.getAuthorities().stream().anyMatch(a -> code.equals(a.getAuthority()));
    }

    /** 403 si l'utilisateur ne porte aucune des permissions autorisant à demander l'opération. */
    public void verifierPeutDemander(Utilisateur utilisateur, TypeOperationWorkflow operation) {
        boolean autorise = operation.permissionsDemande().stream().anyMatch(p -> possedePermission(utilisateur, p));
        if (!autorise) {
            throw new ExceptionAutorisation("DEMANDE_PERMISSION_INSUFFISANTE",
                    "Vous n'êtes pas habilité à demander cette opération (" + operation + ").");
        }
    }

    /**
     * Contrôle complet d'un décideur (approbation, rejet, demande de correction) : permission de validation, rôle
     * fonctionnel exigé, séparation des tâches, périmètre. Lève 403 avec un code précis.
     */
    public void verifierPeutDecider(Utilisateur validateur, DemandeValidation demande, AdaptateurWorkflow adaptateur) {
        TypeOperationWorkflow operation = demande.getTypeOperation();
        if (validateur.getId().equals(demande.getDemandePar())) {
            // §19 : requestedBy != reviewedBy, vérifié dans le service et non dans le contrôleur.
            throw new ExceptionAutorisation("DEMANDE_AUTO_VALIDATION_INTERDITE",
                    "Vous ne pouvez pas décider d'une demande que vous avez vous-même déposée.");
        }
        if (!possedePermission(validateur, operation.permissionValidation())) {
            throw new ExceptionAutorisation(codeRefus(operation),
                    "Vous n'êtes pas habilité à valider cette opération (" + operation + ").");
        }
        if (operation.roleValidationRequis() != null && !validateur.possedeRole(operation.roleValidationRequis())) {
            throw new ExceptionAutorisation(codeRefus(operation),
                    "Cette validation est réservée au rôle " + operation.roleValidationRequis() + ".");
        }
        if (!adaptateur.peutAcceder(demande.getEntiteId(), validateur)) {
            throw new ExceptionAutorisation("DEMANDE_HORS_PERIMETRE",
                    "Cette demande concerne une donnée hors de votre périmètre.");
        }
    }

    /** Variante sans exception, pour filtrer une file de validation. */
    public boolean peutDecider(Utilisateur validateur, DemandeValidation demande, AdaptateurWorkflow adaptateur) {
        try {
            verifierPeutDecider(validateur, demande, adaptateur);
            return true;
        } catch (ExceptionAutorisation e) {
            return false;
        }
    }

    /**
     * Rôles des validateurs habilités pour une opération (§7 {@code resolveValidator}) — destinataires des
     * notifications de soumission.
     */
    public List<String> rolesValidateurs(TypeOperationWorkflow operation) {
        List<String> roles = jdbcTemplate.queryForList("""
                SELECT DISTINCT r.code FROM role r
                JOIN role_permission rp ON rp.role_id = r.id
                JOIN permission p ON p.id = rp.permission_id
                WHERE p.code = ?
                """, String.class, operation.permissionValidation());
        if (operation.roleValidationRequis() != null) {
            return roles.stream().filter(operation.roleValidationRequis()::equals).toList();
        }
        return roles;
    }

    private static String codeRefus(TypeOperationWorkflow operation) {
        return operation == TypeOperationWorkflow.PAIEMENT_CORRECTION
                ? "VALIDATION_FINANCIERE_NON_AUTORISEE" : "DEMANDE_VALIDATION_NON_AUTORISEE";
    }
}
