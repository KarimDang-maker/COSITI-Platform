package cm.cositi.api.securite.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

/**
 * Centralise le filtrage par périmètre de données (docs/02_CLASSES_ET_METHODES.md, docs/04_SECURITE.md §3).
 * Squelette posé au jalon J1 (rôles globaux vs. rôles à périmètre restreint) ; complété au jalon J2 (adhérents,
 * ci-dessous) puis aux jalons J3 (portefeuilles/agents) et J4 (paiements) au fur et à mesure que les entités
 * concernées existent.
 *
 * <p><b>Décision d'implémentation J2</b> (documentée ici faute de règle organisationnelle validée pour
 * {@code GESTIONNAIRE_COMPTE}, voir {@code Conception/SUIVI_EXECUTION.md} « Décisions [A]/[V] en attente ») :
 * le périmètre de {@code GESTIONNAIRE_COMPTE} est traité comme global sur les adhérents en V1, faute de champ
 * d'assignation organisationnelle (zone/portefeuille) pour ce rôle dans le schéma actuel. Le périmètre de
 * {@code AGENT_TERRAIN} est son portefeuille ouvert ({@code affectation_portefeuille}) ; celui de
 * {@code CHEF_AGENT_TERRAIN} s'y ajoute pour tous les agents dont il est le {@code chef_agent_id}.</p>
 */
public interface ServicePerimetreDonnees {

    /**
     * {@code true} pour les rôles à accès global : {@code PCA, DG, DGA, DAF, SUPER_ADMIN}.
     * L'accès de {@code SUPER_ADMIN} aux données nominatives reste exceptionnel et journalisé
     * (docs/04_SECURITE.md §3) — ce indicateur ne dispense pas les services métier de tracer cet accès.
     */
    boolean estPerimetreGlobal(Utilisateur utilisateur);

    /** Filtre de liste des adhérents visibles par l'utilisateur. */
    Specification<Adherent> perimetreAdherent(Utilisateur utilisateur);

    /** Lève {@link cm.cositi.api.commun.exception.ExceptionAutorisation} si l'adhérent est hors périmètre. */
    void verifierAccesAdherent(Utilisateur utilisateur, UUID adherentId);

    /**
     * Même règle que {@link #verifierAccesAdherent}, en prédicat : {@code true} si l'adhérent est dans le
     * périmètre, {@code false} sinon, sans lever d'exception (ajouté au jalon J7).
     *
     * <p>Réservé au <b>filtrage d'une liste</b>, où une ligne hors périmètre doit disparaître et non faire
     * échouer la requête entière. Pour un accès unitaire, c'est toujours {@link #verifierAccesAdherent} qui
     * s'applique : un 403 explicite vaut mieux qu'un 404 trompeur, et masquer la différence reviendrait à
     * traiter un refus d'accès comme une absence de donnée.</p>
     */
    boolean peutAccederAdherent(Utilisateur utilisateur, UUID adherentId);

    /** Périmètre paiement = périmètre de l'adhérent auquel le paiement est rattaché (jalon J4). */
    Specification<Paiement> perimetrePaiement(Utilisateur utilisateur);

    void verifierAccesPaiement(Utilisateur utilisateur, UUID paiementId);
}
