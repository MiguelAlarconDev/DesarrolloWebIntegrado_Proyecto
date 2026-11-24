package com.curso.auth.client;

import com.curso.auth.exception.ServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class WhatsappOtpClientTest {
    @Test
    void acceptsConfirmedSendWithExistingJsonContract() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        WhatsappOtpClient client = new WhatsappOtpClient(builder.baseUrl("http://whatsapp.invalid").build());
        server.expect(requestTo("http://whatsapp.invalid/api/whatsapp/send"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.phone").value("51999999999"))
                .andExpect(jsonPath("$.message").value("Tu codigo de verificacion es: 123456. Expira en 5 minutos."))
                .andRespond(withSuccess("{\"success\":true}", MediaType.APPLICATION_JSON));
        client.sendOtp("51999999999", "123456");
        server.verify();
    }

    @Test
    void propagatesUnavailableWithoutProviderBody() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        WhatsappOtpClient client = new WhatsappOtpClient(builder.baseUrl("http://whatsapp.invalid").build());
        server.expect(requestTo("http://whatsapp.invalid/api/whatsapp/send"))
                .andRespond(withStatus(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE)
                        .body("sensitive provider body 123456"));
        assertThatThrownBy(() -> client.sendOtp("51999999999", "123456"))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessageNotContaining("123456").hasMessageNotContaining("sensitive").hasNoCause();
        server.verify();
    }

    @Test
    void requiresExplicitSuccessWithoutLeakingOtp() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        WhatsappOtpClient client = new WhatsappOtpClient(builder.baseUrl("http://whatsapp.invalid").build());
        server.expect(requestTo("http://whatsapp.invalid/api/whatsapp/send"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.phone").value("51999999999"))
                .andRespond(withSuccess("{\"success\":false}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.sendOtp("51999999999", "123456"))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessageNotContaining("123456");
        server.verify();
    }
}
