package com.curso.pedidos.dto;

import com.curso.pedidos.entity.TipoComprobante;

public class PagarPedidoRequest {

    private String mpPaymentId;
    private TipoComprobante tipoComprobante = TipoComprobante.BOLETA;

    public String getMpPaymentId() { return mpPaymentId; }
    public void setMpPaymentId(String mpPaymentId) { this.mpPaymentId = mpPaymentId; }
    public TipoComprobante getTipoComprobante() { return tipoComprobante; }
    public void setTipoComprobante(TipoComprobante tipoComprobante) { this.tipoComprobante = tipoComprobante; }
}
