package com.curso.pedidos.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/** Clientes HTTP con timeouts. El cliente interno agrega la clave X-Internal-Key. */
@Configuration
public class HttpClientsConfig {

    @Bean
    public RestClient.Builder internalRestClientBuilder(
            @Value("${security.internal-key:${INTERNAL_API_KEY:}}") String internalKey) {
        RestClient.Builder builder = RestClient.builder().requestFactory(factory(5, 30));
        if (internalKey != null && !internalKey.isBlank()) {
            builder.defaultHeader(InternalKeyFilter.HEADER, internalKey);
        }
        return builder;
    }

    static SimpleClientHttpRequestFactory factory(int connectSeconds, int readSeconds) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(connectSeconds));
        factory.setReadTimeout(Duration.ofSeconds(readSeconds));
        return factory;
    }

    public static SimpleClientHttpRequestFactory externalFactory() {
        return factory(5, 20);
    }
}
