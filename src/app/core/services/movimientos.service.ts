import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class MovimientosService {

  private api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  crearMovimiento(data: any) {
    return this.http.post(`${this.api}/movimientos`, data);
  }
}
