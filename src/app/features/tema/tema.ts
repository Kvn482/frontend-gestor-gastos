import { Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';

export type TemaOpcion = 'oscuro' | 'claro' | 'sistema';

@Component({
  selector: 'app-tema',
  standalone: true,
  templateUrl: './tema.html',
  styleUrl: './tema.css',
})
export class Tema {
  private router = inject(Router);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private mediaQuery: MediaQueryList | null = null;

  temaActual: TemaOpcion = 'sistema';

  constructor() {
    this.cargarTema();
    this.escucharTemaDelSistema();
  }

  volver(): void {
    this.router.navigate(['/configuracion']);
  }

  seleccionarTema(tema: TemaOpcion): void {
    this.temaActual = tema;
    localStorage.setItem('theme', this.valorStorage(tema));
    this.aplicarTema();
    this.toastService.show(`Tema cambiado a ${this.temaActualLabel}`, 'info');
  }

  get temaActualLabel(): string {
    switch (this.temaActual) {
      case 'oscuro': return 'Oscuro';
      case 'claro': return 'Claro';
      default: return 'Sistema';
    }
  }

  private cargarTema(): void {
    const guardado = localStorage.getItem('theme');
    this.temaActual = guardado === 'dark' ? 'oscuro' : guardado === 'light' ? 'claro' : 'sistema';
    this.aplicarTema();
  }

  private aplicarTema(): void {
    const usarOscuro = this.temaActual === 'oscuro' ||
      (this.temaActual === 'sistema' && this.prefiereOscuro());
    document.documentElement.classList.toggle('dark', usarOscuro);
  }

  private escucharTemaDelSistema(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (this.temaActual === 'sistema') this.aplicarTema();
    };
    this.mediaQuery.addEventListener('change', listener);
    this.destroyRef.onDestroy(() => this.mediaQuery?.removeEventListener('change', listener));
  }

  private prefiereOscuro(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private valorStorage(tema: TemaOpcion): string {
    return tema === 'oscuro' ? 'dark' : tema === 'claro' ? 'light' : 'system';
  }
}
