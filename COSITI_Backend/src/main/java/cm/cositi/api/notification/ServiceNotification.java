package cm.cositi.api.notification;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Notifications internes (jalon J8).
 *
 * <p>Les méthodes de <b>dépôt</b> ({@code notifier}, {@code notifierRole}) sont appelées par les autres
 * services métier, jamais exposées telles quelles par un endpoint : une notification n'est pas une donnée
 * qu'un utilisateur crée, c'est la conséquence d'une opération. Seules la lecture et le marquage « lue »
 * sont accessibles par l'API, et uniquement sur ses propres notifications.</p>
 */
public interface ServiceNotification {

    /** Dépose une notification pour un utilisateur donné. Sans effet si {@code destinataireId} est nul. */
    void notifier(UUID destinataireId, String type, String titre, String corps, String entite, UUID entiteId);

    /**
     * Dépose la même notification à tous les utilisateurs actifs portant l'un des rôles donnés.
     *
     * <p>Utilisé quand le destinataire est une fonction et non une personne — « le DAF » pour un écart de
     * caisse, « la DGA » pour un compte rendu consolidé. Renvoie le nombre de destinataires servis, pour que
     * l'appelant puisse journaliser le cas « personne n'a été prévenu ».</p>
     */
    int notifierRoles(List<String> codesRoles, String type, String titre, String corps, String entite, UUID entiteId);

    ReponsePaginee<NotificationDto> mesNotifications(boolean seulementNonLues, Pageable pageable,
                                                     Utilisateur demandeur);

    long compterNonLues(Utilisateur demandeur);

    /** Lève {@code ExceptionAutorisation} si la notification appartient à quelqu'un d'autre. */
    NotificationDto marquerLue(UUID notificationId, Utilisateur demandeur);
}
