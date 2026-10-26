package com.curso.pedidos.dto;

import com.curso.pedidos.entity.TipoComprobante;

public class PagarPedidoRequest {

    private String mpPaymentId;
    private TipoComprobante tipoComprobante = TipoComprobante.BOLETA;
    private String rucCliente;
    private String razonSocial;
    private String whatsapp;
    private String correo;
    private String clienteNombres;

    public String getMpPaymentId() {
        return mpPaymentId;
    }

    public void setMpPaymentId(String mpPaymentId) {
        this.mpPaymentId = mpPaymentId;
    }

    public TipoComprobante getTipoComprobante() {
        return tipoComprobante;
    }

    public void setTipoComprobante(TipoComprobante tipoComprobante) {
        this.tipoComprobante = tipoComprobante;
    }

    public String getRucCliente() {
        return rucCliente;
    }

    public void setRucCliente(String rucCliente) {
        this.rucCliente = rucCliente;
    }

    public String getRazonSocial() {
        return razonSocial;
    }

    public void setRazonSocial(String razonSocial) {
        this.razonSocial = razonSocial;
    }

    public String getWhatsapp() {
        return whatsapp;
    }

    public void setWhatsapp(String whatsapp) {
        this.whatsapp = whatsapp;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getClienteNombres() {
        return clienteNombres;
    }

    public void setClienteNombres(String clienteNombres) {
        this.clienteNombres = clienteNombres;
    }
}
