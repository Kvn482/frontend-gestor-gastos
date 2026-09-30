import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { CuentasService } from '../../core/services/cuentas.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { getCategoryIconName } from '../../shared/utils/category-icons';
import { monetraSweetAlertClasses } from '../../shared/utils/sweet-alert';
import Swal from 'sweetalert2';

export interface MovimientoFrecuenteItem {
  id: number | string;
  nombre: string;
  tipoMovimiento: number; // 1: ingreso, 2: gasto
  monto: number;
  cuentaId?: number | string;
  cuentaNombre?: string;
  categoriaId?: number | string;
  categoriaNombre?: string;
  categoriaColor?: string;
  categoriaIcono?: string;
  color?: string;
  icono?: string;
  etiquetas?: any[];
}

@Component({
  selector: 'app-movimientos-frecuentes',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './movimientos-frecuentes.html',
  styleUrl: './movimientos-frecuentes.css',
})
export class MovimientosFrecuentes implements OnInit {
  private movimientosService = inject(MovimientosService);
  private cuentasService = inject(CuentasService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  // Estados principales
  movimientosFrecuentes: MovimientoFrecuenteItem[] = [];
  cuentas: any[] = [];
  etiquetas: any[] = [];
  cargando = true;
  guardando = false;

  // Filtros de lista
  busqueda = '';
  filtroActivo: 'todos' | 'gasto' | 'ingreso' = 'todos';

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;

    // Cargar movimientos frecuentes
    this.movimientosService.consultarMovimientosRapidos().subscribe({
      next: (res: any) => {
        this.movimientosFrecuentes = Array.isArray(res) ? res : [];
        this.cargando = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.toastService.show('Error al cargar movimientos frecuentes', 'error');
        this.cd.detectChanges();
      },
    });

    // Cargar catálogos
    this.cuentasService.consultarCuentasActivas().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) this.cuentas = res;
        this.cd.detectChanges();
      },
      error: () => {},
    });

    this.movimientosService.consultarEtiquetas().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) this.etiquetas = res;
        this.cd.detectChanges();
      },
      error: () => {},
    });
  }

  // --- Getters calculados ---
  get totalFrecuentes(): number {
    return this.movimientosFrecuentes.length;
  }

  get totalGastos(): number {
    return this.movimientosFrecuentes.filter((m) => Number(m.tipoMovimiento) === 2).length;
  }

  get totalIngresos(): number {
    return this.movimientosFrecuentes.filter((m) => Number(m.tipoMovimiento) === 1).length;
  }

  get frecuentesFiltrados(): MovimientoFrecuenteItem[] {
    const q = this.normalizarTexto(this.busqueda);

    return this.movimientosFrecuentes.filter((m) => {
      // Filtro de tipo
      if (this.filtroActivo === 'gasto' && Number(m.tipoMovimiento) !== 2) return false;
      if (this.filtroActivo === 'ingreso' && Number(m.tipoMovimiento) !== 1) return false;

      // Filtro de búsqueda
      if (q) {
        const nombresEtiquetas = Array.isArray(m.etiquetas)
          ? m.etiquetas
              .map((e: any) => (typeof e === 'object' && e !== null ? (e.nombre || e.categoria) : ''))
              .filter(Boolean)
              .join(' ')
          : '';
        const texto = this.normalizarTexto(
          `${m.nombre ?? ''} ${m.cuentaNombre ?? ''} ${m.categoriaNombre ?? ''} ${nombresEtiquetas}`
        );
        if (!texto.includes(q)) return false;
      }

      return true;
    });
  }

  conteoEtiquetasExtra(item: MovimientoFrecuenteItem): number {
    if (Array.isArray(item.etiquetas) && item.etiquetas.length > 1) {
      return item.etiquetas.length - 1;
    }
    return 0;
  }

  obtenerNombreEtiquetaPrincipal(item: MovimientoFrecuenteItem): string {
    if (Array.isArray(item.etiquetas) && item.etiquetas.length > 0) {
      const primera = item.etiquetas[0];
      const nombre = typeof primera === 'object' && primera !== null ? (primera.nombre || primera.categoria) : null;
      if (nombre) return nombre;
      if (typeof primera === 'number' || typeof primera === 'string') {
        const encontrada = this.etiquetas.find((e) => String(e.id) === String(primera));
        if (encontrada) return encontrada.nombre || encontrada.categoria || 'General';
      }
    }
    return item.categoriaNombre || 'General';
  }

  obtenerTextoEtiquetasExtra(item: MovimientoFrecuenteItem): string {
    if (Array.isArray(item.etiquetas) && item.etiquetas.length > 1) {
      return item.etiquetas
        .slice(1)
        .map((e: any) => {
          if (typeof e === 'object' && e !== null) return e.nombre || e.categoria;
          const encontrada = this.etiquetas.find((et) => String(et.id) === String(e));
          return encontrada ? (encontrada.nombre || encontrada.categoria) : '';
        })
        .filter(Boolean)
        .join(', ');
    }
    return '';
  }

  obtenerColorPrincipal(item: MovimientoFrecuenteItem): string {
    if (Array.isArray(item.etiquetas) && item.etiquetas.length > 0) {
      const primera = item.etiquetas[0];
      if (typeof primera === 'object' && primera?.color) return primera.color;
    }
    return item.categoriaColor || (item as any).color || '#6366f1';
  }

  obtenerIconoPrincipal(item: MovimientoFrecuenteItem): string {
    if (Array.isArray(item.etiquetas) && item.etiquetas.length > 0) {
      const primera = item.etiquetas[0];
      if (typeof primera === 'object' && primera?.icono) return primera.icono;
    }
    return item.categoriaIcono || (item as any).icono || 'tag';
  }

  obtenerNombreCuenta(item: MovimientoFrecuenteItem): string {
    if (item.cuentaNombre) return item.cuentaNombre;
    if (item.cuentaId && this.cuentas.length > 0) {
      const c = this.cuentas.find((cuenta) => String(cuenta.id) === String(item.cuentaId));
      if (c) return c.nombre;
    }
    return 'Sin cuenta fija';
  }

  obtenerMontoAbsoluto(monto: number | string): number {
    return Math.abs(Number(monto) || 0);
  }

  getIconName(iconName?: string): string {
    return getCategoryIconName(iconName || 'tag');
  }

  // --- Navegación ---
  volver(): void {
    this.router.navigate(['/configuracion']);
  }

  irACrear(): void {
    this.router.navigate(['/configuracion/movimientos-frecuentes/nuevo']);
  }

  irADetalle(item: MovimientoFrecuenteItem): void {
    this.router.navigate(['/configuracion/movimientos-frecuentes', item.id], {
      state: { frecuente: item },
    });
  }

  // Alias para compatibilidad
  abrirCrear(): void {
    this.irACrear();
  }

  abrirEditar(item: MovimientoFrecuenteItem): void {
    this.irADetalle(item);
  }

  // --- Eliminar ---
  async eliminar(id: number | string, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const result = await Swal.fire({
      title: '¿Eliminar atajo frecuente?',
      text: 'Este atajo se eliminará de tu cuenta. No afectará tus transacciones ya registradas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: monetraSweetAlertClasses,
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

    this.movimientosService.eliminarMovimientoRapido(id).subscribe({
      next: () => {
        this.movimientosFrecuentes = this.movimientosFrecuentes.filter((m) => String(m.id) !== String(id));
        this.toastService.show('Atajo frecuente eliminado', 'warning');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Error al eliminar', 'error');
      },
    });
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
