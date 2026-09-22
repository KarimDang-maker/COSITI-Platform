package cm.cositi.api.securite.dto;

/**
 * Réponse de connexion/rafraîchissement exposée au client. Ne porte JAMAIS le jeton de rafraîchissement :
 * il ne quitte le serveur que via un cookie {@code HttpOnly} (voir {@code ControleurAuthentification}),
 * jamais dans un corps JSON lisible par JavaScript (`docs/04_SECURITE.md §2`).
 */
public record JetonReponseDto(
        String jetonAcces,
        long expirationAccesSecondes,
        boolean doitChangerMotDePasse
) {
}
