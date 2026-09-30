package cm.cositi.api.commun.transaction;

import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Exécute une action dans une transaction indépendante ({@code PROPAGATION_REQUIRES_NEW}) qui commit
 * immédiatement, y compris quand la méthode appelante se termine ensuite par une exception.
 *
 * <p>Nécessaire pour les écritures qui doivent survivre à l'échec de l'opération qui les a déclenchées :
 * compteur d'échecs de connexion + verrouillage de compte, révocation d'une famille de jetons de
 * rafraîchissement en cas de réutilisation détectée, journal d'audit d'un refus. Sans cela, {@code @Transactional}
 * annule silencieusement ces écritures avec le reste de la transaction lorsque la méthode se termine par
 * une {@link RuntimeException} (comportement de rollback par défaut de Spring) — ce qui viderait de son sens
 * la détection de vol de jeton et le verrouillage de compte.</p>
 */
@Component
public class ExecuteurTransactionIndependante {

    private final TransactionTemplate gabarit;

    public ExecuteurTransactionIndependante(PlatformTransactionManager gestionnaireTransactions) {
        this.gabarit = new TransactionTemplate(gestionnaireTransactions);
        this.gabarit.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void executer(Runnable action) {
        gabarit.executeWithoutResult(statut -> action.run());
    }
}
