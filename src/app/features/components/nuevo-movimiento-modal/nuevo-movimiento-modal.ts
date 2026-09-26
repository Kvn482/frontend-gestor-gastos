import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { finalize, takeUntil } from 'rxjs';
import { MovimientosService } from '../../../core/services/movimientos.service';
import { ToastService } from '../../../core/services/toast.service';
import { CuentasService } from '../../../core/services/cuentas.service';
import { AuthService } from '../../../core/services/auth.service';
import { MovimientosRapidosCacheService } from '../../../core/services/movimientos-rapidos-cache.service';
import { getCategoryIconName } from '../../../shared/utils/category-icons';
import { MontoSinComas } from '../../../shared/directives/monto-sin-comas';

export interface MovimientoRapido {
  id: string | number;
  nombre: string;
  tipoMovimiento: number; // 1 = ingreso, 2 = gasto
  monto: number;
  cuentaId: string | number;
  cuentaNombre: string;
  categoriaId: number;
  categoriaNombre: string;
  categoriaColor: string;
  categoriaIcono: string;
  etiquetas?: any[];
}

@Component({
  selector: 'app-nuevo-movimiento-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, CurrencyPipe, MontoSinComas],
  templateUrl: './nuevo-movimiento-modal.html',
  styleUrl: './nuevo-movimiento-modal.css',
})
export class NuevoMovimientoModal implements OnChanges {
  private authService = inject(AuthService);
  private movimientosRapidosCache = inject(MovimientosRapidosCacheService);
  private destroyRef = inject(DestroyRef);
  @Input() isOpen = false;
  @Input() movimientoEditar: any | null = null;
  @Input() cuentaInicialId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @ViewChild('montoInputRef') montoInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('modalCardRef') modalCardRef?: ElementRef<HTMLDivElement>;

  private transitionTimer?: any;

  // Estado de navegación móvil interna: 'menu' | 'rapidos' | 'formulario' | 'crear-frecuente'
  vistaActual = signal<'menu' | 'rapidos' | 'formulario' | 'crear-frecuente'>('menu');

  // Movimientos frecuentes
  movimientosRapidos = signal<MovimientoRapido[]>([]);

  // Estado para creación directa de movimiento frecuente
  seleccionandoCategoriaParaFrecuente = false;
  frecuenteEditandoId: string | number | null = null;
  nuevoFrecuente = {
    nombre: '',
    tipoMovimiento: 2, // 2 = Gasto, 1 = Ingreso
    monto: '' as number | string,
    cuenta: '',
    etiquetas: [] as any[],
    categoria: null as any,
  };

  // Listas del backend
  etiquetasDisponibles: any[] = [];
  cuentas: any[] = [];
  tiposMovimiento: any[] = [];

  // Categorías/Etiquetas seleccionadas actualmente para el movimiento
  etiquetasSeleccionadas: any[] = [];
  get categoriaSeleccionada(): any | null {
    return this.etiquetasSeleccionadas[0] ?? null;
  }
  set categoriaSeleccionada(cat: any | null) {
    this.etiquetasSeleccionadas = cat ? [cat] : [];
  }

  // Modales/Hojas secundarias dentro del flujo
  mostrarSelectorCategorias = false;
  busquedaCategoria = '';
  mostrarDetallesExtra = false;

  isloading = signal(false);

  // Modelo del movimiento
  movimiento = {
    tipoMovimiento: 2, // 2 = Gasto, 1 = Ingreso
    cuenta: '',
    etiquetas: [] as number[],
    monto: '' as number | string,
    descripcion: '',
    notas: '',
    fecha: '',
  };

  // Validaciones
  haIntentadoGuardar = signal(false);
  erroresValidacion = signal({
    monto: false,
    saldoInsuficiente: false,
    categoria: false,
    cuenta: false,
    descripcion: false,
  });

  isClosing = false;

  constructor(
    private movimientosService: MovimientosService,
    private toastService: ToastService,
    private cuentasService: CuentasService,
    private cd: ChangeDetectorRef
  ) {
    this.authService.sesionCerrada$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.movimientosRapidos.set([]);
    });
  }

  @HostListener('document:keydown.escape')
  onEscKey() {
    if (this.isOpen && !this.isClosing) {
      if (this.mostrarSelectorFecha) {
        this.mostrarSelectorFecha = false;
        return;
      }
      if (this.mostrarSelectorCategorias) {
        this.mostrarSelectorCategorias = false;
        return;
      }
      if (this.vistaActual() !== 'menu' && !this.editando) {
        this.cambiarVistaConTransicion(() => {
          this.vistaActual.set('menu');
        });
        return;
      }
      this.cerrarModal();
    }
  }

  get editando(): boolean {
    return !!this.movimientoEditar;
  }

  get esEgreso(): boolean {
    return Number(this.movimiento.tipoMovimiento) === 2;
  }

  get cuentaSeleccionadaObj() {
    return this.cuentas.find((c) => String(c.id) === String(this.movimiento.cuenta));
  }

  getIconName(iconId?: string | null): string {
    return getCategoryIconName(iconId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.isClosing = false;
      this.inicializarModal();
    }
  }

  private inicializarModal() {
    this.cargarMovimientosRapidos();

    // Si viene en modo edición, entra directo al formulario
    if (this.editando) {
      this.vistaActual.set('formulario');
    } else {
      this.vistaActual.set('menu');
    }

    this.resetFormulario();

    // Cargar catálogos
    this.movimientosService.consultarEtiquetas().subscribe({
      next: (res: any) => {
        this.etiquetasDisponibles = Array.isArray(res) ? res : [];
        if (this.editando) {
          this.precargarEtiquetasEdicion();
        } else {
          this.categoriaSeleccionada = null;
        }
        this.cd.detectChanges();
      },
    });

    this.movimientosService.consultarTiposMovimiento().subscribe({
      next: (res: any) => {
        this.tiposMovimiento = Array.isArray(res) ? res : [];
      },
    });

    this.cuentasService.consultarCuentasActivas().subscribe({
      next: (res: any) => {
        this.cuentas = (Array.isArray(res) ? res : []).map((cuenta) => ({
          ...cuenta,
          saldo_actual: Number(cuenta.saldo_actual),
        }));

        if (this.editando) {
          this.movimiento.cuenta = String(
            this.movimientoEditar.id_cuenta ??
            this.movimientoEditar.cuenta_id ??
            this.cuentaInicialId ??
            ''
          );
        } else if (this.cuentaInicialId) {
          this.movimiento.cuenta = this.cuentaInicialId;
        } else {
          this.movimiento.cuenta = '';
        }

        this.cd.detectChanges();
      },
    });

    if (this.editando) {
      this.precargarMovimientoEdicion();
    }
  }

  // ==========================================
  // NAVEGACIÓN DE VISTAS (MENÚ, RÁPIDOS, FORM)
  // ==========================================
  irAFormulario(tipo: 'gasto' | 'ingreso', plantillaPrevia?: MovimientoRapido) {
    this.movimiento.tipoMovimiento = tipo === 'gasto' ? 2 : 1;

    if (plantillaPrevia) {
      this.movimiento.monto = Math.abs(plantillaPrevia.monto);
      this.movimiento.descripcion = plantillaPrevia.nombre;
      if (plantillaPrevia.cuentaId) {
        this.movimiento.cuenta = String(plantillaPrevia.cuentaId);
      }
      if (Array.isArray(plantillaPrevia.etiquetas) && plantillaPrevia.etiquetas.length > 0) {
        this.etiquetasSeleccionadas = plantillaPrevia.etiquetas.map((t: any) => {
          const encontrada = this.etiquetasDisponibles.find((e) => Number(e.id) === Number(t.id));
          return encontrada || t;
        });
      } else if (plantillaPrevia.categoriaId) {
        const cat = this.etiquetasDisponibles.find((e) => e.id === plantillaPrevia.categoriaId);
        if (cat) this.categoriaSeleccionada = cat;
      }
    } else {
      this.categoriaSeleccionada = null;
      if (!this.cuentaInicialId && !this.editando) {
        this.movimiento.cuenta = '';
      }
    }

    this.haIntentadoGuardar.set(false);
    this.erroresValidacion.set({
      monto: false,
      saldoInsuficiente: false,
      categoria: false,
      cuenta: false,
      descripcion: false,
    });

    if (plantillaPrevia) {
      this.validarErrores();
    }

    this.cambiarVistaConTransicion(() => {
      this.vistaActual.set('formulario');
    });

    setTimeout(() => {
      // Auto-enfocar sólo en pantallas grandes (desktop) para prevenir que el teclado virtual
      // de teléfonos móviles interrumpa la animación o force recálculos bruscos de viewport
      if (typeof window !== 'undefined' && window.innerWidth >= 640) {
        this.montoInputRef?.nativeElement?.focus();
        this.montoInputRef?.nativeElement?.select();
      }
    }, 280);
  }

  cambiarVistaConTransicion(cambio: () => void) {
    cambio();
    this.cd.detectChanges();
  }

  irAMovimientosRapidos() {
    this.cargarMovimientosRapidos();
    this.cambiarVistaConTransicion(() => {
      this.vistaActual.set('rapidos');
    });
  }

  volverAlMenu() {
    this.cambiarVistaConTransicion(() => {
      this.vistaActual.set('menu');
    });
  }

  irACrearFrecuente() {
    this.frecuenteEditandoId = null;
    this.nuevoFrecuente = {
      nombre: '',
      tipoMovimiento: 2,
      monto: '',
      cuenta: '',
      etiquetas: [],
      categoria: null,
    };
    this.cambiarVistaConTransicion(() => {
      this.vistaActual.set('crear-frecuente');
    });
  }

  cancelarCrearFrecuente() {
    this.frecuenteEditandoId = null;
    this.cambiarVistaConTransicion(() => {
      this.vistaActual.set('rapidos');
    });
  }

  cambiarTipoFrecuente(tipo: number) {
    if (this.nuevoFrecuente.tipoMovimiento === tipo) return;
    this.nuevoFrecuente.tipoMovimiento = tipo;
    const tipoRequerido = tipo === 1 ? 'ingreso' : 'gasto';
    this.nuevoFrecuente.etiquetas = this.nuevoFrecuente.etiquetas.filter((e) => {
      const eTipo = (e.tipo || '').toLowerCase();
      return !eTipo || eTipo === tipoRequerido;
    });
    this.nuevoFrecuente.categoria = this.nuevoFrecuente.etiquetas[0] || null;
    this.cd.detectChanges();
  }

  abrirSelectorCategoriasFrecuente() {
    this.seleccionandoCategoriaParaFrecuente = true;
    this.abrirSelectorCategorias();
  }

  quitarEtiquetaFrecuente(cat: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.nuevoFrecuente.etiquetas = this.nuevoFrecuente.etiquetas.filter(
      (e) => String(e.id) !== String(cat.id)
    );
    this.nuevoFrecuente.categoria = this.nuevoFrecuente.etiquetas[0] || null;
    this.cd.detectChanges();
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

  soloNumerosFrecuente(event: any) {
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
    this.nuevoFrecuente.monto = valor;
  }

  guardarNuevoFrecuente() {
    if (this.isloading()) return;

    const nombre = this.nuevoFrecuente.nombre.trim();
    const monto = Math.abs(Number(this.nuevoFrecuente.monto));

    if (!nombre) {
      this.toastService.show('Ingresa un nombre para el movimiento frecuente', 'warning');
      return;
    }
    if (!monto || monto <= 0) {
      this.toastService.show('Ingresa un monto válido mayor a 0', 'warning');
      return;
    }
    if (!this.nuevoFrecuente.etiquetas || this.nuevoFrecuente.etiquetas.length === 0) {
      this.toastService.show('Selecciona al menos una etiqueta para el movimiento frecuente', 'warning');
      return;
    }
    if (!this.nuevoFrecuente.cuenta) {
      this.toastService.show('Selecciona una cuenta asociada', 'warning');
      return;
    }

    this.isloading.set(true);

    const primera = this.nuevoFrecuente.etiquetas[0];
    const payload = {
      nombre,
      tipoMovimiento: Number(this.nuevoFrecuente.tipoMovimiento),
      monto,
      cuentaId: this.nuevoFrecuente.cuenta ? String(this.nuevoFrecuente.cuenta) : null,
      categoriaId: Number(primera.id),
      etiquetas: this.nuevoFrecuente.etiquetas.map((e) => Number(e.id)),
      icono: primera?.icono || 'tag',
      color: primera?.color || '#6366f1',
    };

    const peticion$ = this.frecuenteEditandoId
      ? this.movimientosService.actualizarMovimientoRapido(this.frecuenteEditandoId, payload)
      : this.movimientosService.crearMovimientoRapido(payload);

    peticion$
      .pipe(finalize(() => this.isloading.set(false)))
      .subscribe({
        next: () => {
          this.toastService.show(
            this.frecuenteEditandoId ? '✓ Movimiento frecuente actualizado' : '✓ Movimiento frecuente creado',
            'success'
          );
          this.frecuenteEditandoId = null;
          this.cargarMovimientosRapidos();
          this.cambiarVistaConTransicion(() => {
            this.vistaActual.set('rapidos');
          });
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Error al guardar movimiento frecuente', 'error');
        },
      });
  }

  cerrarModal() {
    if (this.isClosing) return;
    this.isClosing = true;
    this.haIntentadoGuardar.set(false);
    this.mostrarSelectorCategorias = false;
    this.mostrarSelectorFecha = false;
    this.frecuenteEditandoId = null;

    setTimeout(() => {
      this.isClosing = false;
      this.closed.emit();
    }, 200);
  }

  // ==========================================
  // GESTIÓN DE MOVIMIENTOS RÁPIDOS
  // ==========================================
  private get usuarioActualId(): string | null {
    const id = this.authService.getDecodedToken()?.id;
    return (typeof id === 'string' || typeof id === 'number') && String(id).trim()
      ? String(id)
      : null;
  }

  cargarMovimientosRapidos() {
    const usuarioId = this.usuarioActualId;
    this.movimientosRapidos.set([]);
    if (!usuarioId) return;

    // 1. Cargar desde el backend
    this.movimientosService.consultarMovimientosRapidos().pipe(
      takeUntil(this.authService.sesionCerrada$),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res: any[]) => {
        if (this.usuarioActualId !== usuarioId) return;
        const lista = Array.isArray(res) ? res : [];
        // Filtrar cualquier residuo de prueba
        const limpios = lista.filter((item) => !String(item.id).startsWith('rapido_'));
        this.movimientosRapidos.set(limpios);
        this.movimientosRapidosCache.guardar(usuarioId, limpios);
        this.cd.detectChanges();
      },
      error: () => {
        if (this.usuarioActualId !== usuarioId) return;
        // Fallback local si el backend aún no responde o está offline
        this.cargarDesdeLocalStorage(usuarioId);
        this.cd.detectChanges();
      },
    });
  }

  private cargarDesdeLocalStorage(usuarioId: string) {
    const guardados = this.movimientosRapidosCache.leer<MovimientoRapido>(usuarioId);
    const limpios = guardados.filter((item) => item && !String(item.id).startsWith('rapido_'));
    this.movimientosRapidos.set(limpios);
  }

  private guardarMovimientosRapidosEnStorage(lista: MovimientoRapido[]) {
    const usuarioId = this.usuarioActualId;
    if (usuarioId) {
      this.movimientosRapidosCache.guardar(usuarioId, lista);
    }
  }

  ejecutarMovimientoRapido(rapido: MovimientoRapido) {
    if (this.isloading() || this.isClosing) return;

    const cuentaId = rapido.cuentaId || this.movimiento.cuenta || (this.cuentas[0]?.id ?? '1');
    const tipo = Number(rapido.tipoMovimiento);
    const montoCalculado = tipo === 2 ? Math.abs(Number(rapido.monto)) * -1 : Math.abs(Number(rapido.monto));

    // Validar saldo suficiente para egresos
    if (tipo === 2) {
      const cuentaObj = this.cuentas.find((c) => String(c.id) === String(cuentaId));
      if (cuentaObj) {
        const saldoDisponible = this.saldoMostradoCuenta(cuentaObj);
        const montoGasto = Math.abs(Number(rapido.monto));
        if (montoGasto > saldoDisponible) {
          this.toastService.show(
            `Saldo insuficiente en ${cuentaObj.nombre} (Disponible: $${saldoDisponible.toFixed(2)})`,
            'error'
          );
          return;
        }
      }
    }

    this.isloading.set(true);

    // Determinar etiquetas válidas
    let etiquetasIds: number[] = [];
    if (Array.isArray(rapido.etiquetas) && rapido.etiquetas.length > 0) {
      etiquetasIds = rapido.etiquetas.map((e: any) => Number(e.id || e)).filter((id) => !isNaN(id) && id > 0);
    } else if (rapido.categoriaId) {
      etiquetasIds = [Number(rapido.categoriaId)];
    } else {
      const encontrada = this.etiquetasDisponibles.find(
        (e) => e.nombre?.toLowerCase() === rapido.categoriaNombre?.toLowerCase()
      );
      if (encontrada) {
        etiquetasIds = [encontrada.id];
      } else {
        etiquetasIds = tipo === 1 ? [27] : [26];
      }
    }

    const payload = {
      tipoMovimiento: tipo,
      cuenta: cuentaId,
      monto: montoCalculado,
      descripcion: rapido.nombre,
      notas: '',
      fecha: this.obtenerFechaHoy(),
      etiquetas: etiquetasIds,
    };

    this.movimientosService
      .crearMovimiento(payload)
      .pipe(finalize(() => this.isloading.set(false)))
      .subscribe({
        next: (res: any) => {
          const idCreado = res?.id || res?.data?.id;
          this.saved.emit();
          this.cerrarModal();

          // Toast con botón "Deshacer"
          this.toastService.show(
            `✓ ${rapido.nombre} registrado (${tipo === 2 ? '-' : '+'}$${Math.abs(rapido.monto).toFixed(2)})`,
            'success',
            5000,
            idCreado
              ? {
                  label: 'Deshacer',
                  callback: () => {
                    this.movimientosService.eliminarMovimiento(idCreado).subscribe({
                      next: () => {
                        this.toastService.show('Movimiento deshecho con éxito', 'warning');
                        this.saved.emit();
                      },
                    });
                  },
                }
              : undefined
          );
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Error al registrar movimiento rápido', 'error');
        },
      });
  }

  editarMovimientoRapido(rapido: MovimientoRapido, event: Event) {
    event.stopPropagation();
    this.frecuenteEditandoId = rapido.id;

    let tags: any[] = [];
    if (Array.isArray(rapido.etiquetas) && rapido.etiquetas.length > 0) {
      tags = rapido.etiquetas.map((t: any) => {
        const encontrada = this.etiquetasDisponibles.find((e) => Number(e.id) === Number(t.id));
        return encontrada || t;
      });
    } else if (rapido.categoriaId) {
      const cat = this.etiquetasDisponibles.find((e) => Number(e.id) === Number(rapido.categoriaId)) || {
        id: rapido.categoriaId,
        nombre: rapido.categoriaNombre || 'General',
        color: rapido.categoriaColor || '#6366f1',
        icono: rapido.categoriaIcono || 'tag',
        tipo: Number(rapido.tipoMovimiento) === 1 ? 'ingreso' : 'gasto',
      };
      tags = [cat];
    }

    this.nuevoFrecuente = {
      nombre: rapido.nombre,
      tipoMovimiento: Number(rapido.tipoMovimiento),
      monto: String(Math.abs(rapido.monto)),
      cuenta: rapido.cuentaId ? String(rapido.cuentaId) : '',
      etiquetas: tags,
      categoria: tags[0] || null,
    };

    this.cambiarVistaConTransicion(() => {
      this.vistaActual.set('crear-frecuente');
    });
  }

  eliminarMovimientoRapido(id: string | number, event: Event) {
    event.stopPropagation();
    const actualizados = this.movimientosRapidos().filter((item) => String(item.id) !== String(id));
    this.movimientosRapidos.set(actualizados);
    this.guardarMovimientosRapidosEnStorage(actualizados);

    // Si tiene id numérico o persistido en backend, eliminarlo también de la BD
    if (typeof id === 'number' || (!isNaN(Number(id)) && !String(id).startsWith('rapido_'))) {
      this.movimientosService.eliminarMovimientoRapido(id).subscribe({
        error: (err) => console.warn('Error al eliminar movimiento rápido de BD:', err),
      });
    }

    this.toastService.show('Movimiento rápido eliminado', 'warning');
  }

  conteoEtiquetasExtraRapido(rapido: MovimientoRapido): number {
    if (Array.isArray(rapido.etiquetas) && rapido.etiquetas.length > 1) {
      return rapido.etiquetas.length - 1;
    }
    return 0;
  }

  obtenerNombreEtiquetaPrincipalRapido(rapido: MovimientoRapido): string {
    if (Array.isArray(rapido.etiquetas) && rapido.etiquetas.length > 0) {
      const primera = rapido.etiquetas[0];
      return (typeof primera === 'object' ? primera.nombre : null) || rapido.categoriaNombre || 'General';
    }
    return rapido.categoriaNombre || 'General';
  }

  obtenerTextoEtiquetasExtraRapido(rapido: MovimientoRapido): string {
    if (Array.isArray(rapido.etiquetas) && rapido.etiquetas.length > 1) {
      return rapido.etiquetas
        .slice(1)
        .map((e: any) => (typeof e === 'object' ? e.nombre : e))
        .filter(Boolean)
        .join(', ');
    }
    return '';
  }

  // ==========================================
  // GESTIÓN DE CATEGORÍAS
  // ==========================================
  get esSeleccionFrecuente(): boolean {
    return this.seleccionandoCategoriaParaFrecuente || this.vistaActual() === 'crear-frecuente';
  }

  get categoriasFiltradas(): any[] {
    const esIngreso = this.esSeleccionFrecuente
      ? Number(this.nuevoFrecuente.tipoMovimiento) === 1
      : Number(this.movimiento.tipoMovimiento) === 1;
    const tipoRequerido = esIngreso ? 'ingreso' : 'gasto';
    const query = this.busquedaCategoria.trim().toLowerCase();

    return this.etiquetasDisponibles.filter((cat) => {
      const catTipo = (cat.tipo || '').toLowerCase();
      const coincideTipo = catTipo ? catTipo === tipoRequerido : true;
      if (!coincideTipo) return false;

      if (!query) return true;
      return (cat.nombre || cat.categoria || '').toLowerCase().includes(query);
    });
  }

  abrirSelectorCategorias() {
    this.busquedaCategoria = '';
    this.mostrarSelectorCategorias = true;
  }

  cerrarSelectorCategorias() {
    this.mostrarSelectorCategorias = false;
    this.seleccionandoCategoriaParaFrecuente = false;
    this.validarErrores();
  }

  seleccionarCategoria(cat: any) {
    if (this.esSeleccionFrecuente) {
      const idx = this.nuevoFrecuente.etiquetas.findIndex((e) => String(e.id) === String(cat.id));
      if (idx >= 0) {
        this.nuevoFrecuente.etiquetas.splice(idx, 1);
      } else {
        this.nuevoFrecuente.etiquetas.push(cat);
      }
      this.nuevoFrecuente.categoria = this.nuevoFrecuente.etiquetas[0] || null;
      this.cd.detectChanges();
      return;
    }

    const idx = this.etiquetasSeleccionadas.findIndex((e) => String(e.id) === String(cat.id));
    if (idx >= 0) {
      this.etiquetasSeleccionadas.splice(idx, 1);
    } else {
      this.etiquetasSeleccionadas.push(cat);
    }

    this.validarErrores();
    this.cd.detectChanges();
  }

  estaEtiquetaSeleccionada(cat: any): boolean {
    if (this.esSeleccionFrecuente) {
      return this.nuevoFrecuente.etiquetas.some((e) => String(e.id) === String(cat.id));
    }
    return this.etiquetasSeleccionadas.some((e) => String(e.id) === String(cat.id));
  }

  quitarEtiqueta(cat: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.etiquetasSeleccionadas = this.etiquetasSeleccionadas.filter(
      (e) => String(e.id) !== String(cat.id)
    );
    this.validarErrores();
    this.cd.detectChanges();
  }

  obtenerIconoCategoria(): string {
    return this.getIconName(this.categoriaSeleccionada?.icono || 'tag');
  }

  obtenerColorCategoria(): string {
    return this.categoriaSeleccionada?.color || (this.esEgreso ? '#f43f5e' : '#10b981');
  }

  obtenerNombreCategoria(): string {
    return this.categoriaSeleccionada?.nombre || this.categoriaSeleccionada?.categoria || '';
  }

  // ==========================================
  // GESTIÓN DE FECHAS (CALENDARIO PERSONALIZADO MONETRA)
  // ==========================================
  mostrarSelectorFecha = false;
  mesVisual = new Date().getMonth();
  anioVisual = new Date().getFullYear();
  fechaTempSeleccionada = '';

  readonly mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  establecerFechaRapida(opcion: 'hoy' | 'ayer') {
    const d = new Date();
    if (opcion === 'ayer') {
      d.setDate(d.getDate() - 1);
    }
    this.movimiento.fecha = this.formatearDateAString(d);
  }

  abrirSelectorFecha() {
    this.mostrarSelectorFecha = true;
    const fechaActual = this.movimiento.fecha || this.obtenerFechaHoy();
    this.fechaTempSeleccionada = fechaActual;
    const partes = fechaActual.split('/');
    if (partes.length === 3) {
      this.anioVisual = Number(partes[0]);
      this.mesVisual = Number(partes[1]) - 1;
    } else {
      const hoy = new Date();
      this.anioVisual = hoy.getFullYear();
      this.mesVisual = hoy.getMonth();
    }
  }

  cerrarSelectorFecha() {
    this.mostrarSelectorFecha = false;
  }

  get nombreMesVisual(): string {
    return this.mesesNombres[this.mesVisual] || '';
  }

  mesAnterior() {
    if (this.mesVisual === 0) {
      this.mesVisual = 11;
      this.anioVisual--;
    } else {
      this.mesVisual--;
    }
  }

  mesSiguiente() {
    if (this.mesVisual === 11) {
      this.mesVisual = 0;
      this.anioVisual++;
    } else {
      this.mesVisual++;
    }
  }

  seleccionarDiaCalendario(item: { dia: number; mes: number; anio: number; fechaStr: string; esMesActual: boolean }) {
    this.fechaTempSeleccionada = item.fechaStr;
    if (!item.esMesActual) {
      this.mesVisual = item.mes;
      this.anioVisual = item.anio;
    }
  }

  aplicarFechaCalendario() {
    if (this.fechaTempSeleccionada) {
      this.movimiento.fecha = this.fechaTempSeleccionada;
      this.validarErrores();
    }
    this.mostrarSelectorFecha = false;
  }

  seleccionarFechaRapidaCalendario(opcion: 'hoy' | 'ayer' | 'antier' | 'primero') {
    const d = new Date();
    if (opcion === 'ayer') {
      d.setDate(d.getDate() - 1);
    } else if (opcion === 'antier') {
      d.setDate(d.getDate() - 2);
    } else if (opcion === 'primero') {
      d.setDate(1);
    }
    this.fechaTempSeleccionada = this.formatearDateAString(d);
    this.mesVisual = d.getMonth();
    this.anioVisual = d.getFullYear();
  }

  get fechaAyerDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  get textoFechaTempFormateada(): string {
    if (!this.fechaTempSeleccionada) return '';
    const partes = this.fechaTempSeleccionada.split('/');
    if (partes.length === 3) {
      const anio = Number(partes[0]);
      const mes = Number(partes[1]) - 1;
      const dia = Number(partes[2]);
      const fecha = new Date(anio, mes, dia);
      const diaSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][fecha.getDay()];
      return `${diaSemana}, ${dia} de ${this.mesesNombres[mes]} de ${anio}`;
    }
    return this.fechaTempSeleccionada;
  }

  get diasMatrizCalendario() {
    const primerDiaMes = new Date(this.anioVisual, this.mesVisual, 1);
    let primerDiaSemana = primerDiaMes.getDay() - 1;
    if (primerDiaSemana === -1) primerDiaSemana = 6;

    const diasEnMesActual = new Date(this.anioVisual, this.mesVisual + 1, 0).getDate();
    const diasEnMesAnterior = new Date(this.anioVisual, this.mesVisual, 0).getDate();

    const hoyStr = this.obtenerFechaHoy();
    const seleccionadaStr = this.fechaTempSeleccionada;

    const matriz: Array<{
      dia: number;
      mes: number;
      anio: number;
      fechaStr: string;
      esMesActual: boolean;
      esHoy: boolean;
      esSeleccionada: boolean;
    }> = [];

    // Días del mes anterior
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const dia = diasEnMesAnterior - i;
      const mes = this.mesVisual === 0 ? 11 : this.mesVisual - 1;
      const anio = this.mesVisual === 0 ? this.anioVisual - 1 : this.anioVisual;
      const fechaStr = `${anio}/${String(mes + 1).padStart(2, '0')}/${String(dia).padStart(2, '0')}`;
      matriz.push({
        dia,
        mes,
        anio,
        fechaStr,
        esMesActual: false,
        esHoy: fechaStr === hoyStr,
        esSeleccionada: fechaStr === seleccionadaStr,
      });
    }

    // Días del mes actual
    for (let dia = 1; dia <= diasEnMesActual; dia++) {
      const fechaStr = `${this.anioVisual}/${String(this.mesVisual + 1).padStart(2, '0')}/${String(dia).padStart(2, '0')}`;
      matriz.push({
        dia,
        mes: this.mesVisual,
        anio: this.anioVisual,
        fechaStr,
        esMesActual: true,
        esHoy: fechaStr === hoyStr,
        esSeleccionada: fechaStr === seleccionadaStr,
      });
    }

    // Días del mes siguiente
    const resto = matriz.length % 7;
    const diasFaltantes = resto === 0 ? 0 : 7 - resto;
    for (let dia = 1; dia <= diasFaltantes; dia++) {
      const mes = this.mesVisual === 11 ? 0 : this.mesVisual + 1;
      const anio = this.mesVisual === 11 ? this.anioVisual + 1 : this.anioVisual;
      const fechaStr = `${anio}/${String(mes + 1).padStart(2, '0')}/${String(dia).padStart(2, '0')}`;
      matriz.push({
        dia,
        mes,
        anio,
        fechaStr,
        esMesActual: false,
        esHoy: fechaStr === hoyStr,
        esSeleccionada: fechaStr === seleccionadaStr,
      });
    }

    return matriz;
  }

  get fechaEsHoy(): boolean {
    return this.movimiento.fecha === this.obtenerFechaHoy();
  }

  get fechaEsAyer(): boolean {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.movimiento.fecha === this.formatearDateAString(d);
  }

  get textoFechaFormateada(): string {
    if (this.fechaEsHoy) return 'Hoy';
    if (this.fechaEsAyer) return 'Ayer';
    if (!this.movimiento.fecha) return 'Seleccionar';

    const partes = this.movimiento.fecha.split('/');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return this.movimiento.fecha;
  }

  obtenerFechaHoy(): string {
    return this.formatearDateAString(new Date());
  }

  formatearDateAString(d: Date): string {
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }

  // ==========================================
  // MANEJO DEL MONTO Y CUENTAS
  // ==========================================
  soloNumeros(event: any) {
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
    this.movimiento.monto = valor;
    this.validarErrores();
  }

  saldoMostradoCuenta(cuenta: any): number {
    return this.calcularSaldoDisponible(cuenta, Number(cuenta.saldo_actual ?? 0));
  }

  private calcularSaldoDisponible(cuenta: any, saldoActual: number): number {
    if (cuenta.tipo === 'CREDITO') {
      const limiteCredito = Number(cuenta.limite_credito ?? 0);
      return Math.max(limiteCredito + Math.min(saldoActual, 0), 0);
    }
    return saldoActual;
  }

  private saldoDisponibleParaValidar(cuenta: any): number {
    let saldoAntesDelMovimiento = Number(cuenta.saldo_actual ?? 0);
    const cuentaOriginalId = this.movimientoEditar?.id_cuenta ?? this.movimientoEditar?.cuenta_id;

    if (this.editando && String(cuenta.id) === String(cuentaOriginalId)) {
      const montoOriginal = Math.abs(Number(this.movimientoEditar?.monto ?? 0));
      const tipoOriginal = Number(
        this.movimientoEditar?.id_tipo_movimiento ?? this.movimientoEditar?.tipoMovimiento
      );
      const montoOriginalFirmado = tipoOriginal === 2 ? -montoOriginal : montoOriginal;

      // El saldo actual ya incluye el movimiento editado. Lo revertimos para validar
      // el nuevo importe contra el saldo que había antes de registrarlo.
      saldoAntesDelMovimiento -= montoOriginalFirmado;
    }

    return this.calcularSaldoDisponible(cuenta, saldoAntesDelMovimiento);
  }

  etiquetaSaldoCuenta(cuenta: any): string {
    return cuenta.tipo === 'CREDITO' ? 'Disponible' : 'Saldo';
  }

  validarErrores(forzarMostrar: boolean = false): boolean {
    const montoNum = Number(this.movimiento.monto);
    const saldoDisponible = this.cuentaSeleccionadaObj
      ? this.saldoDisponibleParaValidar(this.cuentaSeleccionadaObj)
      : 0;

    const montoInvalido = !Number.isFinite(montoNum) || montoNum <= 0;
    const saldoInsuficiente =
      this.esEgreso &&
      !!this.cuentaSeleccionadaObj &&
      Number.isFinite(montoNum) &&
      montoNum > saldoDisponible;

    const categoriaInvalida = !this.categoriaSeleccionada || !this.categoriaSeleccionada.id;
    const cuentaInvalida = !this.movimiento.cuenta || String(this.movimiento.cuenta).trim() === '' || String(this.movimiento.cuenta) === '0';
    const descripcionInvalida = !this.movimiento.descripcion || this.movimiento.descripcion.trim() === '';

    const hayErrores = montoInvalido || saldoInsuficiente || categoriaInvalida || cuentaInvalida || descripcionInvalida;

    if (forzarMostrar) {
      this.haIntentadoGuardar.set(true);
    }

    if (this.haIntentadoGuardar()) {
      this.erroresValidacion.set({
        monto: montoInvalido,
        saldoInsuficiente,
        categoria: categoriaInvalida,
        cuenta: cuentaInvalida,
        descripcion: descripcionInvalida,
      });
    } else {
      this.erroresValidacion.set({
        monto: false,
        saldoInsuficiente,
        categoria: false,
        cuenta: false,
        descripcion: false,
      });
    }

    return hayErrores;
  }

  // ==========================================
  // GUARDAR FORMULARIO
  // ==========================================
  guardar() {
    if (this.isloading() || this.isClosing) return;

    if (this.validarErrores(true)) {
      this.toastService.show('Completa los campos obligatorios en rojo', 'error');
      return;
    }

    this.isloading.set(true);

    const tipo = Number(this.movimiento.tipoMovimiento);
    const etiquetasIds = this.etiquetasSeleccionadas
      .map((e) => Number(e.id ?? e))
      .filter((id) => !isNaN(id) && id > 0);
    const descripcionFinal = this.movimiento.descripcion.trim();

    const payload = {
      tipoMovimiento: tipo,
      cuenta: this.movimiento.cuenta,
      monto: tipo === 2 ? Math.abs(Number(this.movimiento.monto)) * -1 : Math.abs(Number(this.movimiento.monto)),
      descripcion: descripcionFinal,
      notas: this.movimiento.notas.trim(),
      fecha: this.movimiento.fecha || this.obtenerFechaHoy(),
      etiquetas: etiquetasIds,
    };

    const req$ = this.editando
      ? this.movimientosService.actualizarMovimiento(this.movimientoEditar.id, payload)
      : this.movimientosService.crearMovimiento(payload);

    req$.pipe(finalize(() => this.isloading.set(false))).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || (this.editando ? 'Movimiento actualizado' : 'Movimiento guardado'), 'success');
        this.saved.emit();
        this.cerrarModal();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Error al guardar el movimiento', 'error');
      },
    });
  }

  // ==========================================
  // RESET Y PRECARGA
  // ==========================================
  private resetFormulario() {
    const hoy = this.obtenerFechaHoy();
    this.movimiento = {
      tipoMovimiento: 2,
      cuenta: this.cuentaInicialId || '',
      etiquetas: [],
      monto: '',
      descripcion: '',
      notas: '',
      fecha: hoy,
    };
    this.categoriaSeleccionada = null;
    this.haIntentadoGuardar.set(false);

    this.erroresValidacion.set({
      monto: false,
      saldoInsuficiente: false,
      categoria: false,
      cuenta: false,
      descripcion: false,
    });

    this.mostrarDetallesExtra = false;
  }

  private precargarMovimientoEdicion() {
    if (!this.movimientoEditar) return;

    this.movimiento = {
      tipoMovimiento: Number(
        this.movimientoEditar.id_tipo_movimiento ?? this.movimientoEditar.tipoMovimiento ?? 2
      ),
      cuenta: String(
        this.movimientoEditar.id_cuenta ??
        this.movimientoEditar.cuenta_id ??
        this.movimientoEditar.cuenta ??
        this.cuentaInicialId ??
        ''
      ),
      etiquetas: [],
      monto: Math.abs(Number(this.movimientoEditar.monto ?? 0)),
      descripcion: this.movimientoEditar.descripcion ?? '',
      notas: this.movimientoEditar.notas ?? '',
      fecha: this.formatearFechaBase(this.movimientoEditar.fecha),
    };

    this.precargarEtiquetasEdicion();
  }

  private precargarEtiquetasEdicion() {
    if (this.movimientoEditar?.etiquetas?.length) {
      this.etiquetasSeleccionadas = this.movimientoEditar.etiquetas.map((tag: any) => {
        const id = tag.id ?? tag;
        const found = this.etiquetasDisponibles.find((item) => String(item.id) === String(id));
        return (
          found ?? (typeof tag === 'object' ? tag : { id, nombre: 'Etiqueta ' + id, icono: 'tag' })
        );
      });
    } else if (this.movimientoEditar?.categoriaId || this.movimientoEditar?.id_categoria) {
      const catId = this.movimientoEditar.categoriaId ?? this.movimientoEditar.id_categoria;
      const found = this.etiquetasDisponibles.find((item) => String(item.id) === String(catId));
      this.etiquetasSeleccionadas = [
        found ?? { id: catId, nombre: this.movimientoEditar.categoria ?? 'General', icono: 'tag' },
      ];
    } else {
      this.etiquetasSeleccionadas = [];
    }
  }

  private formatearFechaBase(fecha: string | null | undefined): string {
    if (!fecha) return this.obtenerFechaHoy();
    const [base] = fecha.split('T');
    const partes = base.includes('-') ? base.split('-') : base.split('/');
    if (partes.length !== 3) return fecha;
    return `${partes[0]}/${partes[1].padStart(2, '0')}/${partes[2].padStart(2, '0')}`;
  }
}
