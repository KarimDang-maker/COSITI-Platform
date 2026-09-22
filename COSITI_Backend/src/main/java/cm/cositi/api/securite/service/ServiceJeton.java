package cm.cositi.api.securite.service;

import cm.cositi.api.securite.entite.Utilisateur;

import java.util.Optional;

public interface ServiceJeton {

    /** Génère le JWT d'accès (court, 15 min par défaut). Aucune donnée personnelle dans les claims. */
    String genererJetonAcces(Utilisateur utilisateur);

    /** Extrait l'identifiant (subject) d'un JWT d'accès valide, vide si invalide/expiré. */
    Optional<String> identifiantDepuisJetonAcces(String jetonAcces);

    /** Émet une nouvelle paire de jetons (nouvelle famille de rafraîchissement). */
    PaireJetons emettre(Utilisateur utilisateur, String adresseIp, String userAgent);

    /**
     * Fait tourner un jeton de rafraîchissement : le jeton présenté est révoqué et remplacé.
     * Toute réutilisation d'un jeton déjà révoqué révoque la famille entière (détection de vol).
     */
    PaireJetons rafraichir(String jetonRafraichissementBrut, String adresseIp, String userAgent);

    /** Révoque uniquement le jeton de rafraîchissement présenté (déconnexion). */
    void revoquer(String jetonRafraichissementBrut);

    /** Révoque toutes les familles de jetons actives d'un utilisateur (changement de mot de passe, sécurité). */
    void revoquerTout(java.util.UUID utilisateurId);
}
