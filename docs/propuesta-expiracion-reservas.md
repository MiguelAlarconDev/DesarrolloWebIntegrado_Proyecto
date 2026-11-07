# Propuesta: expiración segura de reservas (pedidos-service)

Estado: **propuesta, no implementada.** Activarla cancela pedidos en la base de datos, así que requiere autorización expresa.

## Situación actual

- `POST /api/pedidos/checkout` descuenta una vacante en cursos-service y guarda el pedido en `REGISTRADO` con `reserva_expira_en = ahora + 15 min`.
- **Ningún proceso revisa `reserva_expira_en`.** La vacante solo se libera si alguien llama a `PUT /api/pedidos/{id}/cancelar`.
- Consecuencia: un pedido abandonado ocupa la vacante para siempre. Al 2026-11-07 hay 3 pedidos `REGISTRADO` de prueba en ese caso: `ORD-1794062753328`, `ORD-1794062891000` y `ORD-1794063376929`.
- La confirmación de pago no considera la expiración. Si una reserva se liberara y el pago llegara después, se podría vender más vacantes de las que hay.

## Solución propuesta

1. **Límite de tiempo en Mercado Pago.** Al crear la preferencia se envían `expires = true` y `expiration_date_to = reserva_expira_en`, para que Mercado Pago deje de aceptar pagos cuando vence la reserva. Esto reduce la carrera entre un pago tardío y la expiración.

2. **Tarea programada en pedidos-service, desactivada por defecto.**
   - Se activa con `pedidos.reservas.expiracion.habilitada=false|true` (por defecto `false`).
   - Tiene un modo de simulación, `pedidos.reservas.expiracion.simular=true`, que solo registra en el log qué pedidos cancelaría.
   - Se ejecuta cada 60 s y procesa lotes pequeños, por ejemplo 20 pedidos.
   - Selecciona solo pedidos `estado = 'REGISTRADO' AND reserva_expira_en < now() - margen`, con un margen de 10 min por pagos en tránsito. Bloquea las filas con `SELECT … FOR UPDATE SKIP LOCKED`, de modo que no compite con un pago que se está confirmando sobre la misma fila.

3. **Antes de cancelar, preguntar a Mercado Pago.** Se consulta `GET /v1/payments/search?external_reference={pedido.id}`:
   - **Pago `approved` que valida** (monto, moneda, referencia): se confirma el pedido con la lógica ya probada de `confirmarConPagoConsultado`; no se cancela. Cubre el caso en que el usuario pagó pero se perdieron el retorno al sitio y el webhook.
   - **Pago `pending` o `in_process`:** no se toca; se revisa en la siguiente ejecución.
   - **Sin pagos, o solo rechazados o cancelados:** se pasa el pedido a `CANCELADO` y se libera la vacante con `cursoClient.liberarAforo`, en la misma transacción. Si la liberación remota falla, se revierte todo y se reintenta después.
   - **Mercado Pago no responde:** no se cancela nada.

4. **Garantías.**
   - Nunca toca pedidos `PAGADO`, `CONFIRMADO` ni `CANCELADO`: el estado se vuelve a comprobar con la fila bloqueada.
   - La vacante se libera una sola vez, porque solo se libera en la transición `REGISTRADO → CANCELADO`.
   - Si llega un pago aprobado para un pedido ya `CANCELADO`, la confirmación lo rechaza con 409, como hoy. Ese caso debe registrarse para **reembolso manual**, nunca reactivar el pedido sin comprobar que haya vacante.

5. **Despliegue sobre los datos existentes.**
   1. Desplegar con `habilitada=false`.
   2. Activar `simular=true` y revisar en el log qué pedidos se cancelarían; deberían ser exactamente los 3 pedidos de prueba.
   3. Con autorización expresa, activar `habilitada=true`.

## Pruebas requeridas antes de activarla

Con Mercado Pago simulado y repositorios falsos:
- pedido expirado sin pagos → `CANCELADO` y una sola liberación;
- pedido con pago aprobado → `PAGADO`, no se cancela;
- pago pendiente → sin cambios;
- Mercado Pago caído → sin cambios;
- pedido `PAGADO` con fecha vencida → no se toca;
- dos ejecuciones seguidas → no liberan dos veces;
- modo simulación → ninguna escritura.
