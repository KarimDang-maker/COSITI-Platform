package cm.cositi.api.securite.dto;

import java.util.List;

public record ConnexionReponseDto(
    String jetonAcces,
    String jetonRafraichissement,
    String typeJeton,
    long expirationSecondes,
    boolean doitChangerMotDePasse,
    String identifiant,
    String nomComplet,
    List<String> roles,
    List<String> permissions
) {}
