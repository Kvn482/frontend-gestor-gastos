import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { monetraSweetAlertClasses } from '../../shared/utils/sweet-alert';

export interface Etiqueta {
  id: number;
  nombre: string;
  color: string;
  id_usuario: number | null;
}

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
})
export class Categorias implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private movimientosService = inject(MovimientosService);
  private toastService = inject(ToastService);
  private cd = inject(ChangeDetectorRef);

  etiquetas: Etiqueta[] = [];
  cargando = false;
  creandoEtiqueta = false;

  nuevaEtiqueta = {
    nombre: '',
    color: '#6366f1',
  };

  coloresPredefinidos: string[] = [
    '#6366f1', '#4f46e5', '#8b5cf6', '#a855f7',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#64748b',
  ];

  ngOnInit() {
    this.cargarEtiquetas();
  }

  get totalCategorias(): number {
    return this.etiquetas.length;
  }

  get etiquetasPredeterminadas(): Etiqueta[] {
    return this.etiquetas.filter((etiqueta) => !etiqueta.id_usuario);
  }

  get etiquetasUsuario(): Etiqueta[] {
    return this.etiquetas.filter((etiqueta) => etiqueta.id_usuario);
  }

  swatchShadow(color: string): string {
    if (this.nuevaEtiqueta.color === color) {
      return `0 0 0 2px #0f172a, 0 0 0 4px ${color}`;
    }
    return 'none';
  }

  volver() {
    this.router.navigate(['/configuracion']);
  }

  cargarEtiquetas() {
    this.cargando = true;
    this.movimientosService
      .consultarEtiquetas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.etiquetas = Array.isArray(res) ? res : [];
          this.cargando = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.etiquetas = [];
          this.cargando = false;
          this.toastService.show('Error al cargar las categorías', 'error');
          this.cd.detectChanges();
        },
      });
  }

  crearEtiqueta() {
    const nombre = this.nuevaEtiqueta.nombre.trim();
    if (!nombre) {
      this.toastService.show('El nombre de la categoría es requerido', 'error');
      return;
    }

    this.creandoEtiqueta = true;
    this.movimientosService
      .crearEtiqueta({
        nombre,
        color: this.nuevaEtiqueta.color,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (etiquetaCreada: any) => {
          this.etiquetas = [...this.etiquetas, etiquetaCreada];
          this.nuevaEtiqueta = { nombre: '', color: '#6366f1' };
          this.creandoEtiqueta = false;
          this.cd.detectChanges();
          this.toastService.show('Categoría creada correctamente', 'success');
        },
        error: (err) => {
          this.creandoEtiqueta = false;
          this.cd.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al crear la categoría', 'error');
        },
      });
  }

  async eliminarEtiqueta(etiqueta: Etiqueta): Promise<void> {
    const result = await Swal.fire({
      title: '¿Eliminar categoría?',
      text: `La categoría "${etiqueta.nombre}" se eliminará de tus opciones personalizadas.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: monetraSweetAlertClasses,
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

    this.movimientosService
      .eliminarEtiqueta(etiqueta.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.etiquetas = this.etiquetas.filter((e) => e.id !== etiqueta.id);
          this.toastService.show('Categoría eliminada', 'success');
          this.cd.detectChanges();
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'Error al eliminar la categoría', 'error');
        },
      });
  }
}
