import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrearPedidoRequest, PagarPedidoRequest, Pedido } from '../models/pedido.model';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private apiUrl = 'http://localhost:8080/api/pedidos';

  constructor(private http: HttpClient) {}

  checkout(request: CrearPedidoRequest): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/checkout`, request);
  }

  pagar(id: string, request: PagarPedidoRequest): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.apiUrl}/${id}/pagar`, request);
  }

  buscarPorId(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/${id}`);
  }

  listarPorEstudiante(estudianteId: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/estudiante/${estudianteId}`);
  }

  listarParticipantesPorCurso(cursoId: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/curso/${cursoId}/participantes`);
  }

  listarTodos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.apiUrl);
  }

  getComprobantePdfUrl(pedidoId: string): string {
    return `http://localhost:8080/api/comprobantes/${pedidoId}/descargar`;
  }
}
