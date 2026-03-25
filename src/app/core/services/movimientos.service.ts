import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BalanceResponse } from '../models/balance-response.interface';
import { CategoriasResponse } from '../models/categorias.interface';
import { Subject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MovimientosService {

  private api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Subject para notificar cambios
  private refreshBalance$ = new Subject<void>();

  // Observable público
  refreshBalanceObservable$ = this.refreshBalance$.asObservable();

  // Método para emitir evento
  private notificarCambioBalance() {
    this.refreshBalance$.next();
  }


  crearMovimiento(data: any) {
    return this.http.post(`${this.api}/movimientos`, data).pipe(
      tap(() => {
        this.notificarCambioBalance();
      })
    );
  }

  consultarBalanceGeneral() {
    return this.http.get<BalanceResponse>(`${this.api}/movimientos/balance-general`);
  }

  consultarCategorias() {
    return this.http.get<CategoriasResponse[]>(`${this.api}/movimientos/categorias`);
  }

  consultarTiposMovimiento() {
    return this.http.get(`${this.api}/movimientos/tipos-movimiento`);
  }
}
