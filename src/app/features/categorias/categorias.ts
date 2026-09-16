import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { NgIcon } from '@ng-icons/core';
import { getCategoryIconName, getCategoryIconPath } from '../../shared/utils/category-icons';

export interface Etiqueta {
  id: number;
  nombre: string;
  color: string;
  id_usuario: number | null;
  tipo?: 'gasto' | 'ingreso';
  icono?: string;
}

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [FormsModule, NgIcon],
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
  filtroActivo: 'todas' | 'gasto' | 'ingreso' = 'todas';
  busqueda = '';

  ngOnInit() {
    this.cargarEtiquetas();
  }

  get totalCategorias(): number {
    return this.etiquetas.length;
  }

  get totalEtiquetas(): number {
    return this.etiquetas.length;
  }

  get totalGastos(): number {
    return this.etiquetas.filter((e) => (e.tipo || 'gasto') === 'gasto').length;
  }

  get totalIngresos(): number {
    return this.etiquetas.filter((e) => e.tipo === 'ingreso').length;
  }

  cumpleFiltro(e: Etiqueta): boolean {
    const coincideTipo = this.filtroActivo === 'todas' || (e.tipo || 'gasto') === this.filtroActivo;
    if (!coincideTipo) return false;

    const query = this.busqueda.trim().toLowerCase();
    if (!query) return true;

    return (e.nombre || '').toLowerCase().includes(query);
  }

  get etiquetasUsuario(): Etiqueta[] {
    return this.etiquetas.filter((e) => Boolean(e.id_usuario));
  }

  get etiquetasPredeterminadas(): Etiqueta[] {
    return this.etiquetas.filter((e) => !e.id_usuario);
  }

  get etiquetasFiltradasUsuario(): Etiqueta[] {
    return this.etiquetasUsuario.filter((e) => this.cumpleFiltro(e));
  }

  get etiquetasFiltradasPredeterminadas(): Etiqueta[] {
    return this.etiquetasPredeterminadas.filter((e) => this.cumpleFiltro(e));
  }

  get totalFiltradas(): number {
    return this.etiquetasFiltradasUsuario.length + this.etiquetasFiltradasPredeterminadas.length;
  }

  getIconSvg(iconId?: string | null): string {
    return getCategoryIconPath(iconId);
  }

  getIconName(iconId?: string | null): string {
    return getCategoryIconName(iconId);
  }

  volver() {
    this.router.navigate(['/configuracion']);
  }

  irACrear() {
    this.router.navigate(['/configuracion/categorias/nueva']);
  }

  irADetalle(etiqueta: Etiqueta) {
    this.router.navigate(['/configuracion/categorias', etiqueta.id]);
  }

  cargarEtiquetas() {
    this.cargando = true;
    this.movimientosService
      .consultarEtiquetas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.etiquetas = Array.isArray(res)
            ? res.map((item) => ({
                id: item.id,
                nombre: item.nombre || item.categoria || '',
                color: item.color || '#6366f1',
                id_usuario: item.id_usuario ?? null,
                tipo: item.tipo === 'ingreso' ? 'ingreso' : 'gasto',
                icono: item.icono || 'tag',
              }))
            : [];
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
}
