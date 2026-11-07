import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { APP_CONFIG } from './config.data';

export interface ApiRequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  noCache?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private inflightGet = new Map<string, Promise<any>>();
  private getCache = new Map<string, { data: any; ts: number }>();
  private readonly CACHE_TTL_MS = 3000;

  clearCache(): void {
    this.getCache.clear();
  }

  /**
   * Cliente HTTP Angular centralizado con HttpClient, inyección JWT,
   * deduplicación de peticiones GET simultáneas, caché rápido y fallback directo a microservicios.
   */
  async request<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();

    if (method !== 'GET') {
      this.clearCache();
    } else if (!options.noCache) {
      const cached = this.getCache.get(endpoint);
      if (cached && Date.now() - cached.ts < this.CACHE_TTL_MS) {
        return cached.data as T;
      }
      const inflight = this.inflightGet.get(endpoint);
      if (inflight) {
        return inflight as Promise<T>;
      }
    }

    const execPromise = this.executeRequest<T>(endpoint, options, method);

    if (method === 'GET' && !options.noCache) {
      this.inflightGet.set(endpoint, execPromise);
      execPromise.finally(() => {
        this.inflightGet.delete(endpoint);
      });
    }

    return execPromise;
  }

  private async executeRequest<T>(endpoint: string, options: ApiRequestOptions, method: string): Promise<T> {
    const token = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
    const isRealJwt = token && token.includes('.');

    const headerMap: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (isRealJwt) {
      headerMap['Authorization'] = `Bearer ${token}`;
    }

    const headers = new HttpHeaders(headerMap);
    const bodyObj = typeof options.body === 'string'
      ? JSON.parse(options.body)
      : options.body;

    const gatewayUrl = endpoint.startsWith('http')
      ? endpoint
      : `${APP_CONFIG.API_BASE_URL}${endpoint}`;

    try {
      const data = await this.callHttpClient<T>(method, gatewayUrl, bodyObj, headers);
      if (method === 'GET') {
        this.getCache.set(endpoint, { data, ts: Date.now() });
      }
      return data;
    } catch (gatewayError: any) {
      const status = gatewayError?.status || 0;
      const isGatewayRoutingError =
        status === 0 ||
        [404, 502, 503, 504].includes(status) ||
        (status === 401 && endpoint.startsWith('/auth/usuarios'));

      if (status && !isGatewayRoutingError) {
        throw gatewayError;
      }

      const directUrl = this.resolveDirectUrl(endpoint);
      if (directUrl && directUrl !== gatewayUrl) {
        const data = await this.callHttpClient<T>(method, directUrl, bodyObj, headers);
        if (method === 'GET') {
          this.getCache.set(endpoint, { data, ts: Date.now() });
        }
        return data;
      }
      throw gatewayError;
    }
  }

  private async callHttpClient<T>(method: string, url: string, body: any, headers: HttpHeaders): Promise<T> {
    try {
      const obs$ = this.http.request<T>(method, url, {
        body: method !== 'GET' && method !== 'DELETE' ? body : undefined,
        headers
      }).pipe(timeout(4500));

      return await firstValueFrom(obs$);
    } catch (err: any) {
      if (err instanceof HttpErrorResponse) {
        const payload = err.error;
        const msg =
          (payload && (payload.message || payload.error || payload.mensaje)) ||
          err.message ||
          `Error HTTP ${err.status}`;
        const customError: any = new Error(msg);
        customError.status = err.status;
        customError.data = payload;
        throw customError;
      }
      throw err;
    }
  }

  private resolveDirectUrl(endpoint: string): string | null {
    if (endpoint.startsWith('/auth')) {
      return `http://127.0.0.1:8081/api${endpoint}`;
    }
    if (endpoint.startsWith('/cursos')) {
      return `http://127.0.0.1:8082/api${endpoint}`;
    }
    if (endpoint.startsWith('/pedidos') || endpoint.startsWith('/pagos') || endpoint.startsWith('/comprobantes')) {
      return `http://127.0.0.1:8083/api${endpoint}`;
    }
    return null;
  }
}
