package cm.cositi.api.securite.dto;

public record JetonReponseDto(
        String jetonAcces,
        String jetonRafraichissement,
        long expirationAccesSecondes,
        boolean doitChangerMotDePasse
) {
}
