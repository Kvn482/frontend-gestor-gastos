import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
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

    return this.http.get<AnalisisResponse>(this.api, { params })
  }
}
