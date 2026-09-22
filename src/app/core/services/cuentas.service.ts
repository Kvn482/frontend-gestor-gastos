import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertaCredito } from '../models/alerta-credito.interface';

@Injectable({
  providedIn: 'root'
})
export class CuentasService {

  private api = `${environment.apiUrl}/api/cuentas`;
  private cuentasActivasCache: any[] | null = null;
  private cuentasCache: any[] | null = null;

  constructor(private http: HttpClient) { }

  // Subject para notificar cambios
  private refreshBalance$ = new Subject<void>();

  // Observable público
  refreshBalanceObservable$ = this.refreshBalance$.asObservable();

  // Método para emitir evento
  private notificarCambioBalance() {
    this.invalidarCache();
    this.refreshBalance$.next();
  }

  invalidarCache(): void {
    this.cuentasActivasCache = null;
    this.cuentasCache = null;
  }

  crearCuenta(data: any) {
    return this.http.post(`${this.api}`, data).pipe(
      tap(() => {
        this.notificarCambioBalance();
      })
    );
  }

  actualizarCuenta(id: string, data: any) {
    return this.http.patch(`${this.api}/edit/${id}`, data).pipe(
      tap(() => {
        this.notificarCambioBalance();
      })
    );
  }

  consultarCuentas() {
    if (this.cuentasCache) {
      return of(this.cuentasCache);
    }
    return this.http.get<any[]>(`${this.api}`).pipe(
      tap((res) => {
        if (Array.isArray(res)) this.cuentasCache = res;
      })
    );
  }

  consultarCuentasActivas() {
    if (this.cuentasActivasCache) {
      return of(this.cuentasActivasCache);
    }
    return this.http.get<any[]>(`${this.api}/activas`).pipe(
      tap((res) => {
        if (Array.isArray(res)) this.cuentasActivasCache = res;
      })
    );
  }

  consultarAlertasCreditos() {
    return this.http.get<AlertaCredito[]>(`${environment.apiUrl}/api/alertas-creditos`);
  }

  updateStatus(id: string, status: number) {
    return this.http.patch(`${this.api}/update-status`, { id_cuenta: id, status });
  }

  transferirSaldo(data: {
    id_cuenta_origen: string;
    id_cuenta_destino: string;
    monto: number;
    descripcion: string;
    notas?: string;
    etiquetas?: number[];
  }) {
    return this.http.post(`${this.api}/transferir-saldo`, data).pipe(
      tap(() => {
        this.notificarCambioBalance();
      })
    );
  }

  actualizarTransferenciaSaldo(id: number | string, data: {
    id_cuenta_origen: string;
    id_cuenta_destino: string;
    monto: number;
    descripcion: string;
    notas?: string;
    etiquetas?: number[];
  }) {
    return this.http.patch(`${this.api}/transferir-saldo/edit/${id}`, data).pipe(
      tap(() => {
        this.notificarCambioBalance();
      })
    );
  }
}
