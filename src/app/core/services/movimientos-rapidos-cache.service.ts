import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MovimientosRapidosCacheService {
  private readonly claveAnterior = 'monetra_movimientos_rapidos';
  private readonly prefijo = `${this.claveAnterior}:`;

  constructor() {
    // El respaldo anterior no identifica a su dueño y no se puede migrar.
    try {
      localStorage.removeItem(this.claveAnterior);
    } catch {
      // El almacenamiento local puede estar deshabilitado.
    }
  }

  leer<T>(usuarioId: string): T[] {
    try {
      const datos = JSON.parse(localStorage.getItem(this.prefijo + usuarioId) ?? '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  guardar(usuarioId: string, movimientos: unknown[]): void {
    try {
      localStorage.setItem(this.prefijo + usuarioId, JSON.stringify(movimientos));
    } catch {
      // Un fallo del respaldo no debe impedir usar los datos del servidor.
    }
  }

  limpiar(): void {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const clave = localStorage.key(i);
        if (clave && (clave === this.claveAnterior || clave.startsWith(this.prefijo))) {
          localStorage.removeItem(clave);
        }
      }
    } catch {
      // El cierre de sesión debe continuar aunque falle el almacenamiento.
    }
  }
}
