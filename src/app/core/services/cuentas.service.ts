import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CuentasService {

  private api = `${environment.apiUrl}/api`;

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
    return this.http.post(`${this.api}/cuentas`, data).pipe(
      tap(() => {
        this.notificarCambioBalance();
      })
    );
  }
}
