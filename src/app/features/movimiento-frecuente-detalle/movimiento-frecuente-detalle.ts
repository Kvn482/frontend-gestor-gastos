import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import Swal from 'sweetalert2';
import { CuentasService } from '../../core/services/cuentas.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { Modal } from '../../shared/modal/modal';
import { getCategoryIconName } from '../../shared/utils/category-icons';
import { monetraSweetAlertClasses } from '../../shared/utils/sweet-alert';

@Component({
  selector: 'app-movimiento-frecuente-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, Modal],
  templateUrl: './movimiento-frecuente-detalle.html',
  styleUrl: './movimiento-frecuente-detalle.css',
})
export class MovimientoFrecuenteDetalle implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private movimientosService = inject(MovimientosService);
  private cuentasService = inject(CuentasService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private cd = inject(ChangeDetectorRef);

  esNuevo = true;
  cargando = false;
  guardando = false;
  eliminando = false;

  idFrecuente: number | string | null = null;
  cuentas: any[] = [];
  etiquetas: any[] = [];

  // Modal selector de categorías
  modalCategoriaAbierto = false;
  busquedaCategoria = '';

  form = {
    id: null as number | string | null,
    nombre: '',
    tipoMovimiento: 2, // 2: gasto, 1: ingreso
    monto: '',
    cuentaId: '',
    categoria: null as any,
  };

  formOriginal = {
    nombre: '',
    tipoMovimiento: 2,
    monto: '',
    cuentaId: '',
    categoriaId: null as number | string | null,
  };

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const idParam = params.get('id');
      if (!idParam || idParam === 'nuevo' || idParam === 'nueva') {
        this.esNuevo = true;
        this.idFrecuente = null;
        this.cargando = false;
        this.form = {
          id: null,
          nombre: '',
          tipoMovimiento: 2,
          monto: '',
          cuentaId: '',
          categoria: null,
        };
        this.formOriginal = {
          nombre: '',
          tipoMovimiento: 2,
          monto: '',
          cuentaId: '',
          categoriaId: null,
        };
        this.cargarCatalogos();
      } else {
        this.esNuevo = false;
        this.idFrecuente = idParam;

        const stateFrecuente = history.state?.frecuente;
        if (stateFrecuente && String(stateFrecuente.id) === String(this.idFrecuente)) {
          this.aplicarDatosFrecuente(stateFrecuente);
          this.cargando = false;
          this.cargarCatalogos(true);
        } else {
          this.cargando = true;
          this.cargarCatalogos(false);
          this.cargarFrecuentePorId(this.idFrecuente);
        }
      }
    });
  }

  cargarCatalogos(silencioso = false): void {
    // Cargar cuentas activas
    this.cuentasService
      .consultarCuentasActivas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          if (Array.isArray(res)) {
            this.cuentas = res;
            if (this.esNuevo && !this.form.cuentaId && this.cuentas.length > 0) {
              this.form.cuentaId = String(this.cuentas[0].id);
              this.formOriginal.cuentaId = this.form.cuentaId;
            } else if (!this.esNuevo && this.form.cuentaId) {
              this.resolverCuentaSeleccionada();
            }
          }
          this.cd.detectChanges();
        },
        error: () => {},
      });

    // Cargar etiquetas
    this.movimientosService
      .consultarEtiquetas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          if (Array.isArray(res)) {
            this.etiquetas = res;
            if (this.form.categoria?.id) {
              const encontrada = this.etiquetas.find(
                (e) => String(e.id) === String(this.form.categoria.id)
              );
              if (encontrada) {
                this.form.categoria = encontrada;
              }
            }
          }
          this.cd.detectChanges();
        },
        error: () => {},
      });
  }

  cargarFrecuentePorId(id: string | number): void {
    this.movimientosService
      .consultarMovimientosRapidos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (frecuentes: any[]) => {
          const encontrado = Array.isArray(frecuentes)
            ? frecuentes.find((f) => String(f.id) === String(id))
            : null;

          if (encontrado) {
            this.aplicarDatosFrecuente(encontrado);
          } else {
            this.toastService.show('Movimiento frecuente no encontrado', 'error');
            this.router.navigate(['/configuracion/movimientos-frecuentes']);
          }
          this.cargando = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.cargando = false;
          this.toastService.show('Error al cargar movimiento frecuente', 'error');
          this.router.navigate(['/configuracion/movimientos-frecuentes']);
          this.cd.detectChanges();
        },
      });
  }

  private aplicarDatosFrecuente(item: any): void {
    const rawCuentaId = item.cuentaId ?? item.id_cuenta ?? item.cuenta_id ?? item.cuenta;
    let cuentaId = '';
    if (rawCuentaId !== undefined && rawCuentaId !== null && String(rawCuentaId).trim() !== '') {
      cuentaId = String(rawCuentaId).trim();
    }

    const cat = {
      id: item.categoriaId ?? item.id_etiqueta,
      nombre: item.categoriaNombre || item.nombreCategoria || 'General',
      color: item.categoriaColor || item.color || '#6366f1',
      icono: item.categoriaIcono || item.icono || 'tag',
    };

    const montoLimpio = String(Math.abs(Number(item.monto) || 0));

    this.form = {
      id: item.id,
      nombre: item.nombre || '',
      tipoMovimiento: Number(item.tipoMovimiento) === 1 ? 1 : 2,
      monto: montoLimpio,
      cuentaId,
      categoria: cat,
    };

    if (item.cuentaNombre && !cuentaId) {
      this.resolverCuentaPorNombre(item.cuentaNombre);
    } else {
      this.resolverCuentaSeleccionada();
    }

    this.formOriginal = {
      nombre: this.form.nombre,
      tipoMovimiento: this.form.tipoMovimiento,
      monto: this.form.monto,
      cuentaId: this.form.cuentaId,
      categoriaId: this.form.categoria?.id,
    };
  }

  private resolverCuentaSeleccionada(): void {
    if (!this.form.cuentaId || this.cuentas.length === 0) return;
    const match = this.cuentas.find(
      (c) => String(c.id).toLowerCase().trim() === String(this.form.cuentaId).toLowerCase().trim()
    );
    if (match) {
      this.form.cuentaId = String(match.id);
    }
  }

  private resolverCuentaPorNombre(nombreCuenta: string): void {
    if (!nombreCuenta || this.cuentas.length === 0) return;
    const match = this.cuentas.find(
      (c) => c.nombre?.toLowerCase().trim() === nombreCuenta.toLowerCase().trim()
    );
    if (match) {
      this.form.cuentaId = String(match.id);
    }
  }

  get cuentaSeleccionadaNombre(): string {
    if (!this.form.cuentaId) return 'Seleccionar cuenta';
    const match = this.cuentas.find((c) => String(c.id) === String(this.form.cuentaId));
    return match ? match.nombre : 'Cuenta seleccionada';
  }

  get hayCambios(): boolean {
    if (this.esNuevo) {
      return Boolean(
        this.form.nombre.trim() ||
        Number(this.form.monto) > 0 ||
        this.form.categoria !== null
      );
    }
    return (
      this.form.nombre.trim() !== this.formOriginal.nombre.trim() ||
      this.form.tipoMovimiento !== this.formOriginal.tipoMovimiento ||
      String(this.form.monto).trim() !== String(this.formOriginal.monto).trim() ||
      String(this.form.cuentaId).trim() !== String(this.formOriginal.cuentaId).trim() ||
      String(this.form.categoria?.id ?? '') !== String(this.formOriginal.categoriaId ?? '')
    );
  }

  get formValido(): boolean {
    const nombre = this.form.nombre.trim();
    const monto = Number(this.form.monto);
    return Boolean(
      nombre &&
      monto > 0 &&
      this.form.categoria?.id &&
      this.form.cuentaId
    );
  }

  get etiquetasFiltradas(): any[] {
    const tipoFiltro = this.form.tipoMovimiento === 1 ? 'ingreso' : 'gasto';
    const query = this.busquedaCategoria.trim().toLowerCase();

    return this.etiquetas.filter((e) => {
      // Filtrar por tipo si la etiqueta lo especifica
      const coincideTipo = !e.tipo || e.tipo === tipoFiltro;
      if (!coincideTipo) return false;

      if (!query) return true;
      const nombre = (e.nombre || e.categoria || '').toLowerCase();
      return nombre.includes(query);
    });
  }

  cambiarTipoMovimiento(tipo: number): void {
    this.form.tipoMovimiento = tipo;
    // Si la categoría seleccionada tiene un tipo incompatible, la limpiamos
    if (this.form.categoria?.tipo) {
      const tipoRequerido = tipo === 1 ? 'ingreso' : 'gasto';
      if (this.form.categoria.tipo !== tipoRequerido) {
        this.form.categoria = null;
      }
    }
    this.cd.detectChanges();
  }

  abrirModalCategoria(): void {
    this.busquedaCategoria = '';
    this.modalCategoriaAbierto = true;
  }

  cerrarModalCategoria(): void {
    this.modalCategoriaAbierto = false;
    this.busquedaCategoria = '';
  }

  seleccionarCategoria(cat: any): void {
    this.form.categoria = cat;
    this.modalCategoriaAbierto = false;
    this.busquedaCategoria = '';
    this.cd.detectChanges();
  }

  getIconName(iconId?: string | null): string {
    return getCategoryIconName(iconId);
  }

  permitirSoloDigitosYPunto(event: KeyboardEvent): void {
    const teclasPermitidas = [
      'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter', 'Home', 'End'
    ];
    if (teclasPermitidas.includes(event.key)) return;
    if (event.ctrlKey || event.metaKey) return;
    if (event.key === '.' && !(event.target as HTMLInputElement).value.includes('.')) return;
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
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

  async volver(): Promise<void> {
    if (this.hayCambios) {
      const result = await Swal.fire({
        title: '¿Descartar cambios?',
        text: 'Tienes modificaciones sin guardar que se perderán.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Descartar',
        cancelButtonText: 'Seguir editando',
        reverseButtons: true,
        customClass: monetraSweetAlertClasses,
        buttonsStyling: false,
      });

      if (!result.isConfirmed) return;
    }
    this.router.navigate(['/configuracion/movimientos-frecuentes']);
  }

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
      cuentaId: String(this.form.cuentaId).trim(),
      categoriaId: Number(this.form.categoria.id),
      icono: this.form.categoria?.icono || 'tag',
      color: this.form.categoria?.color || '#6366f1',
    };

    if (this.esNuevo) {
      this.movimientosService
        .crearMovimientoRapido(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.toastService.show('✓ Atajo frecuente guardado', 'success');
            this.router.navigate(['/configuracion/movimientos-frecuentes']);
          },
          error: (err) => {
            this.guardando = false;
            this.cd.detectChanges();
            this.toastService.show(err?.error?.message || 'Error al guardar atajo', 'error');
          },
        });
    } else {
      this.movimientosService
        .actualizarMovimientoRapido(this.idFrecuente!, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.toastService.show('✓ Atajo frecuente actualizado', 'success');
            this.router.navigate(['/configuracion/movimientos-frecuentes']);
          },
          error: (err) => {
            this.guardando = false;
            this.cd.detectChanges();
            this.toastService.show(err?.error?.message || 'Error al actualizar atajo', 'error');
          },
        });
    }
  }

  async eliminar(): Promise<void> {
    if (this.esNuevo || !this.idFrecuente) return;

    const result = await Swal.fire({
      title: '¿Eliminar atajo frecuente?',
      text: `El atajo "${this.form.nombre}" se eliminará de tu lista.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: monetraSweetAlertClasses,
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

    this.eliminando = true;
    this.movimientosService
      .eliminarMovimientoRapido(this.idFrecuente)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.eliminando = false;
          this.toastService.show('✓ Atajo frecuente eliminado', 'success');
          this.router.navigate(['/configuracion/movimientos-frecuentes']);
        },
        error: (err) => {
          this.eliminando = false;
          this.cd.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al eliminar atajo', 'error');
        },
      });
  }
}

