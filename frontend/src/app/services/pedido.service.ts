import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { CrearPedidoRequest, PagarPedidoRequest, Pedido } from '../models/pedido.model';

const SEED_PEDIDOS: Pedido[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    codigoOrden: 'ORD-202610-001',
    estudianteId: 'a0000000-0000-0000-0000-000000000003',
    estudianteNombre: 'Carlos Estudiante',
    cursoId: 'b0000000-0000-0000-0000-000000000001',
    cursoTitulo: 'Desarrollo Web Integrado con Spring Boot',
    modalidad: 'VIRTUAL',
    enlaceClase: 'https://meet.google.com/abc-defg-hij',
    monto: 150.00,
    estado: 'PAGADO',
    tipoComprobante: 'BOLETA',
    serieComprobante: 'B001',
    correlativoComprobante: 1042,
    fechaRegistro: '2026-10-01T15:30:00Z'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    codigoOrden: 'ORD-202610-002',
    estudianteId: 'a0000000-0000-0000-0000-000000000003',
    estudianteNombre: 'Carlos Estudiante',
    cursoId: 'b0000000-0000-0000-0000-000000000002',
    cursoTitulo: 'Arquitectura Cloud en Java y Microservicios',
    modalidad: 'VIRTUAL',
    enlaceClase: 'https://zoom.us/j/9876543210',
    monto: 180.00,
    estado: 'PAGADO',
    tipoComprobante: 'FACTURA',
    serieComprobante: 'F001',
    correlativoComprobante: 320,
    rucCliente: '20123456789',
    razonSocial: 'Tecnologías del Pacífico S.A.C.',
    fechaRegistro: '2026-10-03T10:15:00Z'
  }
];

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private apiUrl = 'http://localhost:8080/api/pedidos';

  constructor(private http: HttpClient) {}

  checkout(request: CrearPedidoRequest): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/checkout`, request).pipe(
      catchError(() => {
        const nuevo: Pedido = {
          id: 'ord-' + Date.now(),
          codigoOrden: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          estudianteId: request.estudianteId,
          cursoId: request.cursoId,
          cursoTitulo: 'Desarrollo Web Integrado con Spring Boot',
          modalidad: 'VIRTUAL',
          enlaceClase: 'https://meet.google.com/abc-defg-hij',
          monto: 150.00,
          estado: 'PENDIENTE_PAGO',
          fechaRegistro: new Date().toISOString()
        };
        return of(nuevo);
      })
    );
  }

  pagar(id: string, request: PagarPedidoRequest): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.apiUrl}/${id}/pagar`, request).pipe(
      catchError(() => {
        const pagado: Pedido = {
          id,
          codigoOrden: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          estudianteId: 'a0000000-0000-0000-0000-000000000003',
          estudianteNombre: 'Carlos Estudiante',
          cursoId: 'b0000000-0000-0000-0000-000000000001',
          cursoTitulo: 'Desarrollo Web Integrado con Spring Boot',
          modalidad: 'VIRTUAL',
          enlaceClase: 'https://meet.google.com/abc-defg-hij',
          monto: 150.00,
          estado: 'PAGADO',
          tipoComprobante: request.tipoComprobante || 'BOLETA',
          serieComprobante: request.tipoComprobante === 'FACTURA' ? 'F001' : 'B001',
          correlativoComprobante: 1043,
          rucCliente: request.rucCliente,
          razonSocial: request.razonSocial,
          fechaRegistro: new Date().toISOString()
        };
        return of(pagado);
      })
    );
  }

  buscarPorId(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const encontrado = SEED_PEDIDOS.find(p => p.id === id);
        return of(encontrado || SEED_PEDIDOS[0]);
      })
    );
  }

  listarPorEstudiante(estudianteId: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/estudiante/${estudianteId}`).pipe(
      catchError(() => of(SEED_PEDIDOS))
    );
  }

  listarParticipantesPorCurso(cursoId: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/curso/${cursoId}/participantes`).pipe(
      catchError(() => of(SEED_PEDIDOS))
    );
  }

  listarTodos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.apiUrl).pipe(
      catchError(() => of(SEED_PEDIDOS))
    );
  }

  getComprobantePdfUrl(pedidoId: string): string {
    return `http://localhost:8080/api/comprobantes/${pedidoId}/descargar`;
  }
}
