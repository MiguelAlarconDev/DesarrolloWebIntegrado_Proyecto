package com.curso.pedidos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class PedidosServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PedidosServiceApplication.class, args);
    }
}
