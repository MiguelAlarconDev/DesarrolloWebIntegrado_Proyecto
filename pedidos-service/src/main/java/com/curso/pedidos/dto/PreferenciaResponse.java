package com.curso.pedidos.dto;

public class PreferenciaResponse {

    private String id;
    private String initPoint;

    public PreferenciaResponse() {
    }

    public PreferenciaResponse(String id, String initPoint) {
        this.id = id;
        this.initPoint = initPoint;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getInitPoint() {
        return initPoint;
    }

    public void setInitPoint(String initPoint) {
        this.initPoint = initPoint;
    }
}
