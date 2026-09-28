package cm.cositi.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "cositi.securite.jwt")
public class JwtProperties {

    /** Secret HS256, fourni exclusivement par variable d'environnement en production (voir docs/04_SECURITE.md §2). */
    private String secret;
    private int expirationMinutes = 15;
    private int refreshExpirationDays = 7;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public int getExpirationMinutes() {
        return expirationMinutes;
    }

    public void setExpirationMinutes(int expirationMinutes) {
        this.expirationMinutes = expirationMinutes;
    }

    public int getRefreshExpirationDays() {
        return refreshExpirationDays;
    }

    public void setRefreshExpirationDays(int refreshExpirationDays) {
        this.refreshExpirationDays = refreshExpirationDays;
    }
}
