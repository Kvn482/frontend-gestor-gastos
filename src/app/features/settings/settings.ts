import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';


interface Etiqueta {
  id: number;
  nombre: string;
  color: string;
  id_usuario: number | null;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  constructor(
    private authService: AuthService,
    private movimientosService: MovimientosService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  tabActivo: 'perfil' | 'etiquetas' = 'perfil';

  // Perfil
  perfil = { nombre: '', apellido: '', email: '' };
  cargandoPerfil = false;

  // Contraseña
  contrasena = { actual: '', nueva: '', confirmar: '' };
  cargandoContrasena = false;
  mostrarContrasenaActual = false;
  mostrarContrasenaNueva = false;
  mostrarContrasenaConfirmar = false;

  // Etiquetas
  etiquetas: Etiqueta[] = [];
  nuevaEtiqueta = { nombre: '', color: '#6366f1' };
  creandoEtiqueta = false;

  coloresPredefinidos = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#64748b', '#78716c',
  ];

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    this.perfil.nombre = currentUser?.nombre || '';
    this.perfil.apellido = currentUser?.apellido || '';
    this.perfil.email = currentUser?.email || '';
    this.cargarEtiquetas();
  }

  getTabClass(tab: string): string {
    const base = 'pb-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer';
    if (this.tabActivo === tab) {
      return `${base} border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400`;
    }
    return `${base} border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300`;
  }

  swatchShadow(color: string): string {
    if (this.nuevaEtiqueta.color === color) {
      return `0 0 0 2px white, 0 0 0 4px ${color}`;
    }
    return 'none';
  }

  // ----- Perfil -----
  guardarPerfil() {
    if (!this.perfil.nombre.trim() || !this.perfil.apellido.trim()) {
      this.toastService.show('El nombre y apellido son requeridos', 'error');
      return;
    }
    this.cargandoPerfil = true;
    this.authService
      .actualizarPerfil({ nombre: this.perfil.nombre, apellido: this.perfil.apellido })
      .subscribe({
        next: () => {
          this.authService.notificarActualizacionPerfil(this.perfil.nombre, this.perfil.apellido);
          this.cargandoPerfil = false;
          this.cdr.detectChanges();
          this.toastService.show('Perfil actualizado correctamente', 'success');
        },
        error: (err) => {
          this.cargandoPerfil = false;
          this.cdr.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al actualizar el perfil', 'error');
        },
      });
  }

  // ----- Contraseña -----
  cambiarContrasena() {
    if (!this.contrasena.actual) {
      this.toastService.show('Ingresa tu contraseña actual', 'error');
      return;
    }
    if (this.contrasena.nueva.length < 6) {
      this.toastService.show('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    if (this.contrasena.nueva !== this.contrasena.confirmar) {
      this.toastService.show('Las contraseñas nuevas no coinciden', 'error');
      return;
    }
    this.cargandoContrasena = true;
    this.authService
      .cambiarContrasena({
        contrasenaActual: this.contrasena.actual,
        nuevaContrasena: this.contrasena.nueva,
      })
      .subscribe({
        next: () => {
          this.contrasena = { actual: '', nueva: '', confirmar: '' };
          this.cargandoContrasena = false;
          this.cdr.detectChanges();
          this.toastService.show('Contraseña actualizada correctamente', 'success');
        },
        error: (err) => {
          this.cargandoContrasena = false;
          this.cdr.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al cambiar la contraseña', 'error');
        },
      });
  }

  // ----- Etiquetas -----
  cargarEtiquetas() {
    this.movimientosService.consultarEtiquetas().subscribe((res: any) => {
      this.etiquetas = res;
    });
  }

  crearEtiqueta() {
    if (!this.nuevaEtiqueta.nombre.trim()) {
      this.toastService.show('El nombre de la etiqueta es requerido', 'error');
      return;
    }
    this.creandoEtiqueta = true;
    this.movimientosService
      .crearEtiqueta(this.nuevaEtiqueta)
      .subscribe({
        next: () => {
          this.nuevaEtiqueta = { nombre: '', color: '#6366f1' };
          this.creandoEtiqueta = false;
          this.cdr.detectChanges();
          this.toastService.show('Etiqueta creada correctamente', 'success');
          this.cargarEtiquetas();
        },
        error: (err) => {
          this.creandoEtiqueta = false;
          this.cdr.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al crear la etiqueta', 'error');
        },
      });
  }

  eliminarEtiqueta(id: number) {
    this.movimientosService.eliminarEtiqueta(id).subscribe({
      next: () => {
        this.toastService.show('Etiqueta eliminada', 'success');
        this.etiquetas = this.etiquetas.filter((e) => e.id !== id);
      },
      error: (err) =>
        this.toastService.show(err?.error?.message || 'Error al eliminar la etiqueta', 'error'),
    });
  }
}
