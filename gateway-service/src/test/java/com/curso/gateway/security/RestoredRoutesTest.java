package com.curso.gateway.security;

import org.junit.jupiter.api.Test;
import java.util.Properties;
import static org.assertj.core.api.Assertions.assertThat;

class RestoredRoutesTest {
    @Test
    void independentServicesPrecedeFrontendAndExistingSecurityIsPreserved() throws Exception {
        Properties config = new Properties();
        try (var input = getClass().getResourceAsStream("/application.properties")) {
            config.load(input);
        }
        assertThat(config.getProperty("spring.cloud.gateway.mvc.routes[4].predicates[0]"))
                .isEqualTo("Path=/api/comprobantes/**");
        assertThat(config.getProperty("spring.cloud.gateway.mvc.routes[4].uri")).contains(":8084");
        assertThat(config.getProperty("spring.cloud.gateway.mvc.routes[5].predicates[0]"))
                .isEqualTo("Path=/api/whatsapp/**");
        assertThat(config.getProperty("spring.cloud.gateway.mvc.routes[5].uri")).contains(":8085");
        assertThat(config.getProperty("spring.cloud.gateway.mvc.routes[6].predicates[0]"))
                .isEqualTo("Path=/**");
        assertThat(config.getProperty("security.jwt.protected-paths")).contains("/api/auth/usuarios");
        assertThat(config.getProperty("security.cors.allowed-origins")).doesNotContain("*");
        assertThat(config.getProperty("security.blocked-ips")).isNotNull();
    }
}
