package com.curso.pedidos.exception;

/** El pago consultado al proveedor no corresponde o no esta aprobado: el pedido no se marca PAGADO. */
public class PagoRechazadoException extends RuntimeException {
    public PagoRechazadoException(String message) { super(message); }
}
