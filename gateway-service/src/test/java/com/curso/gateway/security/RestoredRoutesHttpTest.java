package com.curso.gateway.security;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"server.address=127.0.0.1", "debug=false", "logging.level.root=WARN",
                "logging.level.org.springframework=WARN", "security.jwt.secret=test-secret-change-me-please-32-chars"})
class RestoredRoutesHttpTest {
    private static final AtomicReference<String> received = new AtomicReference<>();
    private static final HttpServer upstream = startStub();
    private static final HttpServer otherRoutes = startRejectingStub();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    @LocalServerPort private int port;

    private static HttpServer startStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                String path = exchange.getRequestURI().getPath();
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                received.set(exchange.getRequestMethod() + " " + path + " " + body);
                int status = path.contains("missing") ? 404 : body.contains("offline") ? 503 : 200;
                String result = status == 404 ? "{\"detail\":\"Comprobante no encontrado\"}"
                        : status == 503 ? "{\"success\":false}" : "{\"success\":true,\"estado\":\"ENVIADO\"}";
                byte[] bytes = result.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(status, bytes.length);
                exchange.getResponseBody().write(bytes);
                exchange.close();
            });
            server.start();
            return server;
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    @DynamicPropertySource
    static void isolateAllDestinations(DynamicPropertyRegistry registry) {
        java.util.Properties config = new java.util.Properties();
        try (var input = RestoredRoutesHttpTest.class.getResourceAsStream("/application.properties")) {
            config.load(input);
        } catch (Exception e) { throw new IllegalStateException(e); }
        // Spring replaces lists across property sources; retain the actual predicates and IDs.
        config.stringPropertyNames().stream()
                .filter(key -> key.startsWith("spring.cloud.gateway.mvc.routes["))
                .filter(key -> !key.endsWith(".uri"))
                .forEach(key -> registry.add(key, () -> config.getProperty(key)));
        // Override every destination, including catch-all: no production/local services can be contacted.
        for (int i = 0; i <= 6; i++) {
            final int index = i;
            registry.add("spring.cloud.gateway.mvc.routes[" + i + "].uri",
                    () -> "http://127.0.0.1:" + ((index == 4 || index == 5)
                            ? upstream : otherRoutes).getAddress().getPort());
        }
        registry.add("security.blocked-ips", () -> "");
    }

    private static HttpServer startRejectingStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                exchange.sendResponseHeaders(418, -1);
                exchange.close();
            });
            server.start();
            return server;
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    @AfterAll static void stopStub() { upstream.stop(0); otherRoutes.stop(0); }

    private HttpResponse<String> post(String path, String body) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(10)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void forwardsWhatsAppBodyAndMethod() throws Exception {
        String body = "{\"phone\":\"51999999999\",\"message\":\"test-only\"}";
        var response = post("/api/whatsapp/send", body);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(received.get()).isEqualTo("POST /api/whatsapp/send " + body);
        assertThat(response.body()).contains("\"success\":true");
    }

    @Test void preservesWhatsAppUnavailableStatus() throws Exception {
        var response = post("/api/whatsapp/send", "{\"phone\":\"offline\",\"message\":\"test-only\"}");
        assertThat(response.statusCode()).isEqualTo(503);
        assertThat(response.body()).contains("\"success\":false");
    }

    @Test void forwardsComprobanteJsonWithoutRewriting() throws Exception {
        String body = "{\"pedidoId\":\"11111111-1111-1111-1111-111111111111\",\"monto\":118.00}";
        var response = post("/api/comprobantes/enviar", body);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(received.get()).isEqualTo("POST /api/comprobantes/enviar " + body);
    }

    @Test void preservesDownloadNotFoundInsteadOfServingFrontend() throws Exception {
        var response = http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port
                + "/api/comprobantes/missing/descargar")).timeout(Duration.ofSeconds(10)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(response.body()).contains("Comprobante no encontrado");
        assertThat(received.get()).startsWith("GET /api/comprobantes/missing/descargar");
    }
}
