import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private api = 'http://localhost:3000/api/auth';

  private _perfilActualizado$ = new Subject<{ nombre: string; apellido: string }>();
  readonly perfilActualizado$ = this._perfilActualizado$.asObservable();

  notificarActualizacionPerfil(nombre: string, apellido: string) {
    localStorage.setItem('perfilOverride', JSON.stringify({ nombre, apellido }));
    this._perfilActualizado$.next({ nombre, apellido });
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('perfilOverride');
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  actualizarPerfil(data: { nombre: string; apellido: string }) {
    return this.http.patch(`${this.api}/perfil`, data);
  }

  cambiarContrasena(data: { contrasenaActual: string; nuevaContrasena: string }) {
    return this.http.patch(`${this.api}/cambiar-contrasena`, data);
  }
}
