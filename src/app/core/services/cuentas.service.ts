import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CuentasService {

  private api = `${environment.apiUrl}/api/cuentas`;

  constructor(private http: HttpClient) { }

  // Subject para notificar cambios
  private refreshBalance$ = new Subject<void>();

  // Observable público
  refreshBalanceObservable$ = this.refreshBalance$.asObservable();

  // Método para emitir evento
  private notificarCambioBalance() {
    this.refreshBalance$.next();
  }


  crearCuenta(data: any) {
    return this.http.post(`${this.api}`, data).pipe(
      tap(() => {
        this.notificarCambioBalance();
      })
    );
  }

  consultarCuentas() {
    return this.http.get(`${this.api}`);
  }

  consultarCuentasActivas() {
    return this.http.get(`${this.api}/activas`);
  }

  updateStatus(id: string, status: number) {
    return this.http.patch(`${this.api}/update-status`, { id_cuenta: id, status });
  }
}
