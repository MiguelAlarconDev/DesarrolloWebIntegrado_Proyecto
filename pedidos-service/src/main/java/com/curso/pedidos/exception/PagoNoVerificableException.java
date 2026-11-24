package com.curso.pedidos.exception;

/** No fue posible consultar al proveedor (sin credenciales o error de red): no se confirma nada. */
public class PagoNoVerificableException extends RuntimeException {
    public PagoNoVerificableException(String message) { super(message); }
}
