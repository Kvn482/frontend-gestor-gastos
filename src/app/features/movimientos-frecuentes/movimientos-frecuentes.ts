import { CommonModule, Location } from '@angular/common';
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
  private location = inject(Location);
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

  // Modal / Formulario Bottom Sheet
  modalFormularioAbierto = false;
  isClosingFormulario = false;
  editandoId: number | string | null = null;

  form = {
    nombre: '',
    tipoMovimiento: 2, // 2: gasto por defecto
    monto: '',
    cuentaId: '',
    categoria: null as any,
  };

  // Selector de etiquetas
  mostrarSelectorCategorias = false;
  busquedaCategoria = '';

  ngOnInit(): void {
    this.cargarDatos();
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.mostrarSelectorCategorias) {
      this.cerrarSelectorCategorias();
    } else if (this.modalFormularioAbierto && !this.isClosingFormulario) {
      this.cerrarFormulario();
    }
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
        const texto = this.normalizarTexto(
          `${m.nombre ?? ''} ${m.cuentaNombre ?? ''} ${m.categoriaNombre ?? ''}`
        );
        if (!texto.includes(q)) return false;
      }

      return true;
    });
  }

  get etiquetasFiltradas(): any[] {
    const q = this.normalizarTexto(this.busquedaCategoria);
    const tipoTarget = this.form.tipoMovimiento === 1 ? 'ingreso' : 'gasto';

    return this.etiquetas.filter((et) => {
      // Filtrar por tipo si la etiqueta lo especifica
      if (et.tipo && et.tipo !== tipoTarget) return false;

      if (q) {
        return this.normalizarTexto(et.nombre).includes(q);
      }
      return true;
    });
  }

  get categoriasFiltradas(): any[] {
    return this.etiquetasFiltradas;
  }

  permitirSoloDigitosYPunto(event: KeyboardEvent): void {
    const teclasPermitidas = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];

    if (teclasPermitidas.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      return;
    }

    const input = event.target as HTMLInputElement;
    if (event.key === '.' && !input.value.includes('.')) {
      return;
    }

    event.preventDefault();
  }

  get cuentaSeleccionadaNombre(): string {
    const cuenta = this.cuentas.find((c) => String(c.id) === String(this.form.cuentaId));
    return cuenta ? cuenta.nombre : 'Sin cuenta fija';
  }

  getIconName(iconName?: string): string {
    return getCategoryIconName(iconName || 'tag');
  }

  // --- Navegación ---
  volver(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/configuracion']);
    }
  }

  // --- Modal Formulario Crear / Editar ---
  abrirCrear(): void {
    this.editandoId = null;
    this.form = {
      nombre: '',
      tipoMovimiento: 2,
      monto: '',
      cuentaId: this.cuentas.length > 0 ? String(this.cuentas[0].id) : '',
      categoria: null,
    };
    this.mostrarSelectorCategorias = false;
    this.busquedaCategoria = '';
    this.modalFormularioAbierto = true;
    this.isClosingFormulario = false;
    this.cd.detectChanges();
  }

  abrirEditar(item: MovimientoFrecuenteItem, event?: Event): void {
    if (event) event.stopPropagation();

    this.editandoId = item.id;
    const cat = this.etiquetas.find((c) => String(c.id) === String(item.categoriaId)) || {
      id: item.categoriaId,
      nombre: item.categoriaNombre,
      color: item.categoriaColor,
      icono: item.categoriaIcono,
    };

    this.form = {
      nombre: item.nombre,
      tipoMovimiento: Number(item.tipoMovimiento) || 2,
      monto: String(Math.abs(Number(item.monto))),
      cuentaId: String(item.cuentaId || (this.cuentas.length > 0 ? this.cuentas[0].id : '')),
      categoria: cat,
    };

    this.mostrarSelectorCategorias = false;
    this.busquedaCategoria = '';
    this.modalFormularioAbierto = true;
    this.isClosingFormulario = false;
    this.cd.detectChanges();
  }

  cerrarFormulario(): void {
    this.modalFormularioAbierto = false;
    this.isClosingFormulario = false;
    this.mostrarSelectorCategorias = false;
    this.editandoId = null;
    this.cd.detectChanges();
  }

  // --- Selector de Categorías ---
  abrirSelectorCategorias(): void {
    this.mostrarSelectorCategorias = true;
    this.busquedaCategoria = '';
  }

  cerrarSelectorCategorias(): void {
    this.mostrarSelectorCategorias = false;
    this.busquedaCategoria = '';
  }

  seleccionarCategoria(cat: any): void {
    this.form.categoria = cat;
    this.mostrarSelectorCategorias = false;
    this.busquedaCategoria = '';
    this.cd.detectChanges();
  }

  cambiarTipoMovimiento(tipo: number): void {
    this.form.tipoMovimiento = tipo;
    // Si la categoría actual no coincide con el nuevo tipo, la reseteamos
    if (this.form.categoria?.tipo && this.form.categoria.tipo !== (tipo === 1 ? 'ingreso' : 'gasto')) {
      this.form.categoria = null;
    }
    this.cd.detectChanges();
  }

  soloNumeros(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/[^0-9.]/g, '');
    const partes = valor.split('.');
    if (partes.length > 2) {
      valor = `${partes.shift()}.${partes.join('')}`;
    }
    if (valor.includes('.')) {
      const [entero, decimales] = valor.split('.');
      valor = `${entero}.${decimales.slice(0, 2)}`;
    }
    input.value = valor;
    this.form.monto = valor;
  }

  // --- Guardar ---
  guardar(): void {
    const nombre = this.form.nombre.trim();
    const monto = Number(this.form.monto);

    if (!nombre) {
      this.toastService.show('Ingresa un nombre para el atajo frecuente', 'warning');
      return;
    }
    if (!monto || monto <= 0) {
      this.toastService.show('Ingresa un monto válido mayor a 0', 'warning');
      return;
    }
    if (!this.form.categoria?.id) {
      this.toastService.show('Selecciona una etiqueta para el atajo frecuente', 'warning');
      return;
    }
    if (!this.form.cuentaId) {
      this.toastService.show('Selecciona una cuenta asociada', 'warning');
      return;
    }

    this.guardando = true;
    const payload = {
      nombre,
      tipoMovimiento: Number(this.form.tipoMovimiento),
      monto,
      cuentaId: Number(this.form.cuentaId),
      categoriaId: Number(this.form.categoria.id),
      icono: this.form.categoria?.icono || 'tag',
      color: this.form.categoria?.color || '#6366f1',
    };

    if (this.editandoId) {
      this.movimientosService.actualizarMovimientoRapido(this.editandoId, payload).subscribe({
        next: () => {
          this.guardando = false;
          this.toastService.show('✓ Atajo frecuente actualizado', 'success');
          this.cerrarFormulario();
          this.cargarDatos();
        },
        error: (err) => {
          this.guardando = false;
          this.toastService.show(err?.error?.message || 'Error al actualizar atajo', 'error');
          this.cd.detectChanges();
        },
      });
    } else {
      this.movimientosService.crearMovimientoRapido(payload).subscribe({
        next: () => {
          this.guardando = false;
          this.toastService.show('✓ Atajo frecuente guardado', 'success');
          this.cerrarFormulario();
          this.cargarDatos();
        },
        error: (err) => {
          this.guardando = false;
          this.toastService.show(err?.error?.message || 'Error al guardar atajo', 'error');
          this.cd.detectChanges();
        },
      });
    }
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
