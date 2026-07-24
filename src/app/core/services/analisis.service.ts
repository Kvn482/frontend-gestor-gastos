import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { catchError, Observable, of } from 'rxjs'
import { environment } from '../../../environments/environment'
import { AnalisisResponse } from '../models/analisis.interface'

@Injectable({
  providedIn: 'root',
})
export class AnalisisService {
  private api = `${environment.apiUrl}/api/analisis`

  constructor(private http: HttpClient) {}

  consultarAnalisis(periodo: string, cuentaId = 'todas'): Observable<AnalisisResponse> {
    const params = new HttpParams()
      .set('periodo', periodo)
      .set('cuentaId', cuentaId)

    return this.http.get<AnalisisResponse>(this.api, { params }).pipe(
      catchError(() => of(this.obtenerAnalisisDemo(periodo)))
    )
  }

  private obtenerAnalisisDemo(periodo: string): AnalisisResponse {
    const factor = periodo === 'mes-anterior' ? 0.91 : periodo === 'ultimos-3-meses' ? 2.7 : 1
    const ingresos = Math.round(24500 * factor)
    const gastos = Math.round(16840 * factor)
    const balance = ingresos - gastos

    return {
      resumen: {
        ingresos,
        gastos,
        balance,
        tasaAhorro: Math.round((balance / ingresos) * 100),
        variacionGastos: 12,
        variacionIngresos: 4,
      },
      categorias: [
        { nombre: 'Comida', monto: Math.round(4850 * factor), porcentaje: 29, color: '#f97316', variacion: 18 },
        { nombre: 'Servicios', monto: Math.round(3260 * factor), porcentaje: 19, color: '#06b6d4', variacion: -6 },
        { nombre: 'Transporte', monto: Math.round(2410 * factor), porcentaje: 14, color: '#6366f1', variacion: 9 },
        { nombre: 'Hogar', monto: Math.round(2150 * factor), porcentaje: 13, color: '#10b981', variacion: -3 },
        { nombre: 'Entretenimiento', monto: Math.round(1680 * factor), porcentaje: 10, color: '#ec4899', variacion: 21 },
      ],
      tendencia: [
        { etiqueta: 'Sem 1', ingresos: Math.round(5800 * factor), gastos: Math.round(3900 * factor) },
        { etiqueta: 'Sem 2', ingresos: Math.round(6100 * factor), gastos: Math.round(4600 * factor) },
        { etiqueta: 'Sem 3', ingresos: Math.round(6200 * factor), gastos: Math.round(5200 * factor) },
        { etiqueta: 'Sem 4', ingresos: Math.round(6400 * factor), gastos: Math.round(3140 * factor) },
        { etiqueta: 'Sem 5', ingresos: Math.round(3600 * factor), gastos: Math.round(2100 * factor) },
        { etiqueta: 'Sem 6', ingresos: Math.round(4200 * factor), gastos: Math.round(2800 * factor) },
      ],
      insights: [
        {
          titulo: 'Buen margen de ahorro',
          detalle: `Conservas ${Math.round((balance / ingresos) * 100)}% de tus ingresos del periodo.`,
          tipo: 'success',
        },
        {
          titulo: 'Comida subio',
          detalle: 'Es la categoria con mayor gasto y crecio 18% contra el periodo anterior.',
          tipo: 'warning',
        },
        {
          titulo: 'Servicios bajo control',
          detalle: 'El gasto fijo bajo 6%, senal de mejor estabilidad mensual.',
          tipo: 'info',
        },
      ],
      comparativa: [
        { mes: 'Mayo', ingresos: 23100, gastos: 17320, balance: 5780 },
        { mes: 'Junio', ingresos: 23800, gastos: 18940, balance: 4860 },
        { mes: 'Julio', ingresos: 24500, gastos: 16840, balance: 7660 },
      ],
    }
  }
}
