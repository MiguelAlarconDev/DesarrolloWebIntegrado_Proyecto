package com.curso.gateway.security;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.ByteArrayOutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El Gateway debe reenviar la subida multipart del aula (hasta 10 MiB) intacta hacia
 * cursos-service, sin parsearla ni aplicar el limite de 1 MB por defecto de Spring.
 * Todos los destinos apuntan a servidores locales de prueba.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"server.address=127.0.0.1", "debug=false", "logging.level.root=WARN",
                "logging.level.org.springframework=WARN", "security.jwt.secret=test-secret-change-me-please-32-chars"})
class AulaMultipartGatewayTest {
    private static final AtomicReference<String> recibido = new AtomicReference<>();
    private static final HttpServer cursos = startCursosStub();
    private static final HttpServer otros = startRejectingStub();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    @LocalServerPort private int port;

    private static HttpServer startCursosStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                byte[] body = exchange.getRequestBody().readAllBytes();
                try {
                    recibido.set(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath() + " "
                            + body.length + " " + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body))
                            + " " + exchange.getRequestHeaders().getFirst("Content-Type"));
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
                exchange.sendResponseHeaders(201, -1);
                exchange.close();
            });
            server.start();
            return server;
        } catch (Exception e) { throw new IllegalStateException(e); }
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

    @DynamicPropertySource
    static void destinos(DynamicPropertyRegistry registry) {
        java.util.Properties config = new java.util.Properties();
        try (var input = AulaMultipartGatewayTest.class.getResourceAsStream("/application.properties")) {
            config.load(input);
        } catch (Exception e) { throw new IllegalStateException(e); }
        config.stringPropertyNames().stream()
                .filter(key -> key.startsWith("spring.cloud.gateway.mvc.routes["))
                .filter(key -> !key.endsWith(".uri"))
                .forEach(key -> registry.add(key, () -> config.getProperty(key)));
        for (int i = 0; i <= 6; i++) {
            final int index = i;
            registry.add("spring.cloud.gateway.mvc.routes[" + i + "].uri",
                    () -> "http://127.0.0.1:" + (index == 1 ? cursos : otros).getAddress().getPort());
        }
        registry.add("security.blocked-ips", () -> "");
    }

    @AfterAll static void stop() { cursos.stop(0); otros.stop(0); }

    @Test
    void reenviaMultipartDe10MiBSinAlterarlo() throws Exception {
        byte[] archivo = new byte[10 * 1024 * 1024];
        Arrays.fill(archivo, (byte) 'a');
        String limite = "----aula-test-boundary";
        ByteArrayOutputStream cuerpo = new ByteArrayOutputStream();
        cuerpo.write(("--" + limite + "\r\nContent-Disposition: form-data; name=\"archivo\"; filename=\"guia.pdf\"\r\n"
                + "Content-Type: application/pdf\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
        cuerpo.write(archivo);
        cuerpo.write(("\r\n--" + limite + "--\r\n").getBytes(StandardCharsets.US_ASCII));
        byte[] enviado = cuerpo.toByteArray();
        String ruta = "/api/cursos/11111111-1111-1111-1111-111111111111/aula/modulos/22222222-2222-2222-2222-222222222222/materiales";

        var respuesta = http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + ruta))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "multipart/form-data; boundary=" + limite)
                .header("Authorization", "Bearer token-reenviado-sin-validar-en-gateway")
                .POST(HttpRequest.BodyPublishers.ofByteArray(enviado)).build(), HttpResponse.BodyHandlers.ofString());

        assertThat(respuesta.statusCode()).isEqualTo(201);
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(enviado));
        // Cuerpo identico byte a byte; el Gateway normaliza la cabecera pero conserva el boundary.
        assertThat(recibido.get()).startsWith("POST " + ruta + " " + enviado.length + " " + sha + " multipart/form-data");
        assertThat(recibido.get().replace(" ", "")).contains("boundary=" + limite);
    }
}
