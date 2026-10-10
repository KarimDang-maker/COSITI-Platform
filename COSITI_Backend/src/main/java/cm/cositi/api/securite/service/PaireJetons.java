package cm.cositi.api.securite.service;

/** Paire jeton d'accès (JWT, court) + jeton de rafraîchissement (opaque, rotatif). */
public record PaireJetons(String jetonAcces, String jetonRafraichissement, long expirationAccesSecondes) {
}
