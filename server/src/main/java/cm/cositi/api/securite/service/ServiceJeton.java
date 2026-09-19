package cm.cositi.api.securite.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.function.Function;

@Service
public class ServiceJeton {

    @Value("${cositi.securite.jwt.secret}")
    private String secret;

    @Value("${cositi.securite.jwt.expiration-minutes:15}")
    private long expirationMinutes;

    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String genererJetonAcces(UserDetails userDetails, List<String> roles) {
        long maintenant = System.currentTimeMillis();
        long expirationMs = maintenant + (expirationMinutes * 60 * 1000);

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("roles", roles)
                .claim("authorities", userDetails.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList())
                .issuedAt(new Date(maintenant))
                .expiration(new Date(expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String genererJetonRafraichissement(UserDetails userDetails) {
        long maintenant = System.currentTimeMillis();
        long expirationMs = maintenant + (7L * 24 * 60 * 60 * 1000); // 7 jours

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .issuedAt(new Date(maintenant))
                .expiration(new Date(expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String extraireIdentifiant(String token) {
        return extraireClaim(token, Claims::getSubject);
    }

    public <T> T extraireClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extraireTousLesClaims(token);
        return claimsResolver.apply(claims);
    }

    public boolean estJetonValide(String token, UserDetails userDetails) {
        final String identifiant = extraireIdentifiant(token);
        return (identifiant.equals(userDetails.getUsername()) && !estJetonExpire(token));
    }

    private boolean estJetonExpire(String token) {
        return extraireExpiration(token).before(new Date());
    }

    private Date extraireExpiration(String token) {
        return extraireClaim(token, Claims::getExpiration);
    }

    private Claims extraireTousLesClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
