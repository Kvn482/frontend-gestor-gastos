import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { Observable, Subject, finalize, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MovimientosRapidosCacheService } from './movimientos-rapidos-cache.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private api = `${environment.apiUrl}/api/auth`;
  private perfilInFlight$?: Observable<any> | null = null;
  private movimientosRapidosCache = inject(MovimientosRapidosCacheService);
  private cierreSesion$ = new Subject<void>();
  readonly sesionCerrada$ = this.cierreSesion$.asObservable();

  private _perfilActualizado$ = new Subject<{ nombre: string; apellido: string }>();
  readonly perfilActualizado$ = this._perfilActualizado$.asObservable();

  private _avatarActualizado$ = new Subject<string>();
  readonly avatarActualizado$ = this._avatarActualizado$.asObservable();

  notificarActualizacionPerfil(nombre: string, apellido: string) {
    localStorage.setItem('perfilOverride', JSON.stringify({ nombre, apellido }));
    this._perfilActualizado$.next({ nombre, apellido });
  }

  notificarActualizacionAvatar(avatarUrl: string) {
    localStorage.setItem('avatarOverride', avatarUrl);
    this._avatarActualizado$.next(avatarUrl);
  }

  constructor(private http: HttpClient) { }

  login(data: any) {
    return this.http.post(`${this.api}/login`, data);
  }

  register(data: any) {
    return this.http.post(`${this.api}/register`, data);
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.api}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string) {
    return this.http.post(`${this.api}/reset-password`, { token, password });
  }

  resendActivationMail(email: string) {
    return this.http.post(`${this.api}/resend-activation`, { email });
  }

  saveSession(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();

    if (!token) return false;

    try {
      const decoded: any = jwtDecode(token);

      // exp viene en segundos, Date.now() en milisegundos
      const isExpired = decoded.exp * 1000 < Date.now();

      if (isExpired) {
        return false;
      }

      return true;

    } catch (error) {
      // Token inválido
      this.logout();
      return false;
    }
  }

  getDecodedToken(): any | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }

  refreshToken() {
    return this.http.post<any>(
      `${this.api}/refresh`,
      { refreshToken: this.getRefreshToken() }
    );
  }

  getCurrentUser() {
    const decoded = this.getDecodedToken();
    if (!decoded) return null;
    const override = localStorage.getItem('perfilOverride');
    if (override) {
      return { ...decoded, ...JSON.parse(override) };
    }
    return decoded;
  }

  logout() {
    this.cierreSesion$.next();
    this.perfilInFlight$ = null;
    this.movimientosRapidosCache.limpiar();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('perfilOverride');
    localStorage.removeItem('avatarOverride');
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  actualizarPerfil(data: { nombre: string; apellido: string }) {
    this.perfilInFlight$ = null;
    return this.http.patch(`${this.api}/perfil`, data);
  }

  actualizarAvatar(formData: FormData) {
    this.perfilInFlight$ = null;
    return this.http.patch(`${this.api}/perfil/avatar`, formData);
  }

  cambiarContrasena(data: { contrasenaActual: string; nuevaContrasena: string }) {
    return this.http.patch(`${this.api}/cambiar-contrasena`, data);
  }

  getPerfil(): Observable<any> {
    if (!this.perfilInFlight$) {
      this.perfilInFlight$ = this.http.get<any>(`${this.api}/perfil`).pipe(
        tap((perfil) => {
          if (perfil?.nombre) {
            const apellido = perfil.apellido || '';
            this.notificarActualizacionPerfil(perfil.nombre, apellido);
          }
          if (perfil?.avatar_url) {
            this.notificarActualizacionAvatar(perfil.avatar_url);
          }
        }),
        shareReplay(1),
        finalize(() => {
          this.perfilInFlight$ = null;
        })
      );
    }
    return this.perfilInFlight$;
  }
}
