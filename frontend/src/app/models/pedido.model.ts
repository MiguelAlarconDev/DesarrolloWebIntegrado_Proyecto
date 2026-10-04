export interface Pedido {
  id: string;
  codigoOrden: string;
  estudianteId: string;
  cursoId: string;
  monto: number;
  estado: 'REGISTRADO' | 'PENDIENTE_PAGO' | 'PAGADO' | 'CONFIRMADO' | 'CANCELADO';
  mpPreferenceId?: string;
  mpPaymentId?: string;
  reservaExpiraEn?: string;
  fechaRegistro?: string;
  
  // Enriched fields from backend
  estudianteNombre?: string;
  cursoTitulo?: string;
  horario?: string;
  modalidad?: string;
  enlaceClase?: string;
  direccionClase?: string;
  aula?: string;
}

export interface CrearPedidoRequest {
  estudianteId: string;
  cursoId: string;
}

export interface PagarPedidoRequest {
  mpPaymentId?: string;
  tipoComprobante?: 'BOLETA' | 'FACTURA';
  rucCliente?: string;
  razonSocial?: string;
}

export interface Comprobante {
  id: string;
  pedidoId: string;
  serie: string;
  numeroCorrelativo: number;
  tipoComprobante: 'BOLETA' | 'FACTURA';
  montoSubtotal: number;
  montoIgv: number;
  montoTotal: number;
  rucCliente?: string;
  razonSocial?: string;
  pdfUrl?: string;
  estadoEmail?: string;
  createdAt?: string;
}
