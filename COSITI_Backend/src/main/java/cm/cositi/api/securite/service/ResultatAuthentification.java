package cm.cositi.api.securite.service;

/**
 * Résultat interne d'une connexion/rafraîchissement, entre le service et {@code ControleurAuthentification}.
 * Porte le jeton de rafraîchissement en clair — contrairement à {@code JetonReponseDto} (réponse JSON publique),
 * qui ne l'expose jamais. Le contrôleur seul décide de le poser en cookie {@code HttpOnly} et ne le renvoie
 * jamais dans le corps de la réponse (`docs/04_SECURITE.md §2`).
 */
public record ResultatAuthentification(
        String jetonAcces,
        String jetonRafraichissement,
        long expirationAccesSecondes,
        boolean doitChangerMotDePasse
) {
}
