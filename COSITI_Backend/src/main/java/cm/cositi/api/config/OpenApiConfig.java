package cm.cositi.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SCHEMA_JWT = "jwtBearer";

    @Bean
    public OpenAPI openApiCositi() {
        return new OpenAPI()
                .info(new Info()
                        .title("API COSITI COOP-CA")
                        .version("v1")
                        .description("API REST et moteur métier de la plateforme COSITI (Cameroun)."))
                .addSecurityItem(new SecurityRequirement().addList(SCHEMA_JWT))
                .components(new Components().addSecuritySchemes(SCHEMA_JWT,
                        new SecurityScheme()
                                .name(SCHEMA_JWT)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
