import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { finalize } from 'rxjs';
import { MovimientosService } from '../../../core/services/movimientos.service';
import { ToastService } from '../../../core/services/toast.service';
import { CuentasService } from '../../../core/services/cuentas.service';
import { getCategoryIconName } from '../../../shared/utils/category-icons';

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
}

@Component({
  selector: 'app-nuevo-movimiento-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, CurrencyPipe],
  templateUrl: './nuevo-movimiento-modal.html',
  styleUrl: './nuevo-movimiento-modal.css',
})
export class NuevoMovimientoModal implements OnChanges {
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
  nuevoFrecuente = {
    nombre: '',
    tipoMovimiento: 2, // 2 = Gasto, 1 = Ingreso
    monto: '' as number | string,
    cuenta: '',
    categoria: null as any,
  };

  // Listas del backend
  etiquetasDisponibles: any[] = [];
  cuentas: any[] = [];
  tiposMovimiento: any[] = [];

  // Categoría seleccionada actualmente para el movimiento
  categoriaSeleccionada: any | null = null;

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
  ) {}

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
      if (plantillaPrevia.categoriaId) {
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

    this.cambiarVistaConTransicion(() => {
      this.vistaActual.set('formulario');
    });

    setTimeout(() => {
      this.montoInputRef?.nativeElement?.focus();
      this.montoInputRef?.nativeElement?.select();
    }, 150);
  }

  cambiarVistaConTransicion(cambio: () => void) {
    const card = this.modalCardRef?.nativeElement;
    if (!card) {
      cambio();
      return;
    }

    const alturaInicial = card.offsetHeight;
    card.style.height = `${alturaInicial}px`;
    card.style.transition = 'none';

    cambio();
    this.cd.detectChanges();

    requestAnimationFrame(() => {
      if (!this.modalCardRef?.nativeElement) return;
      const targetCard = this.modalCardRef.nativeElement;

      targetCard.style.height = 'auto';
      const alturaFinal = targetCard.offsetHeight;

      targetCard.style.height = `${alturaInicial}px`;
      void targetCard.offsetHeight;

      targetCard.style.transition = 'height 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
      targetCard.style.height = `${alturaFinal}px`;

      if (this.transitionTimer) clearTimeout(this.transitionTimer);
      this.transitionTimer = setTimeout(() => {
        if (this.modalCardRef?.nativeElement) {
          this.modalCardRef.nativeElement.style.height = '';
          this.modalCardRef.nativeElement.style.transition = '';
        }
      }, 340);
    });
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
    this.nuevoFrecuente = {
      nombre: '',
      tipoMovimiento: 2,
      monto: '',
      cuenta: '',
      categoria: null,
    };
    this.cambiarVistaConTransicion(() => {
      this.vistaActual.set('crear-frecuente');
    });
  }

  cancelarCrearFrecuente() {
    this.cambiarVistaConTransicion(() => {
      this.vistaActual.set('rapidos');
    });
  }

  abrirSelectorCategoriasFrecuente() {
    this.seleccionandoCategoriaParaFrecuente = true;
    this.abrirSelectorCategorias();
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
    if (!this.nuevoFrecuente.categoria?.id) {
      this.toastService.show('Selecciona una etiqueta para el movimiento frecuente', 'warning');
      return;
    }
    if (!this.nuevoFrecuente.cuenta) {
      this.toastService.show('Selecciona una cuenta asociada', 'warning');
      return;
    }

    this.isloading.set(true);

    const payload = {
      nombre,
      tipoMovimiento: Number(this.nuevoFrecuente.tipoMovimiento),
      monto,
      cuentaId: Number(this.nuevoFrecuente.cuenta),
      categoriaId: Number(this.nuevoFrecuente.categoria.id),
      icono: this.nuevoFrecuente.categoria?.icono || 'tag',
      color: this.nuevoFrecuente.categoria?.color || '#6366f1',
    };

    this.movimientosService
      .crearMovimientoRapido(payload)
      .pipe(finalize(() => this.isloading.set(false)))
      .subscribe({
        next: () => {
          this.toastService.show('✓ Movimiento frecuente creado', 'success');
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

    setTimeout(() => {
      this.isClosing = false;
      this.closed.emit();
    }, 200);
  }

  // ==========================================
  // GESTIÓN DE MOVIMIENTOS RÁPIDOS
  // ==========================================
  private readonly STORAGE_KEY = 'monetra_movimientos_rapidos';

  cargarMovimientosRapidos() {
    // 1. Cargar desde el backend
    this.movimientosService.consultarMovimientosRapidos().subscribe({
      next: (res: any[]) => {
        const lista = Array.isArray(res) ? res : [];
        // Filtrar cualquier residuo de prueba
        const limpios = lista.filter((item) => !String(item.id).startsWith('rapido_'));
        this.movimientosRapidos.set(limpios);
        this.guardarMovimientosRapidosEnStorage(limpios);
        this.cd.detectChanges();
      },
      error: () => {
        // Fallback local si el backend aún no responde o está offline
        this.cargarDesdeLocalStorage();
        this.cd.detectChanges();
      },
    });
  }

  private cargarDesdeLocalStorage() {
    try {
      const guardados = localStorage.getItem(this.STORAGE_KEY);
      if (guardados) {
        const parsed = JSON.parse(guardados);
        if (Array.isArray(parsed)) {
          // Filtrar cualquier plantilla de prueba previa
          const limpios = parsed.filter((item) => !String(item.id).startsWith('rapido_'));
          this.movimientosRapidos.set(limpios);
          return;
        }
      }
    } catch {
      // Ignorar error de parsing
    }

    this.movimientosRapidos.set([]);
  }

  private guardarMovimientosRapidosEnStorage(lista: MovimientoRapido[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lista));
    } catch {
      // Ignorar quota
    }
  }

  ejecutarMovimientoRapido(rapido: MovimientoRapido) {
    if (this.isloading()) return;
    this.isloading.set(true);

    const cuentaId = rapido.cuentaId || this.movimiento.cuenta || (this.cuentas[0]?.id ?? '1');
    const tipo = Number(rapido.tipoMovimiento);
    const montoCalculado = tipo === 2 ? Math.abs(Number(rapido.monto)) * -1 : Math.abs(Number(rapido.monto));

    // Determinar etiqueta válida
    let etiquetasIds: number[] = [];
    if (rapido.categoriaId) {
      etiquetasIds = [rapido.categoriaId];
    } else {
      const encontrada = this.etiquetasDisponibles.find(
        (e) => e.nombre?.toLowerCase() === rapido.categoriaNombre.toLowerCase()
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
    this.irAFormulario(rapido.tipoMovimiento === 2 ? 'gasto' : 'ingreso', rapido);
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

  // ==========================================
  // GESTIÓN DE CATEGORÍAS
  // ==========================================
  get categoriasFiltradas(): any[] {
    const esIngreso = Number(this.movimiento.tipoMovimiento) === 1;
    const query = this.busquedaCategoria.trim().toLowerCase();

    return this.etiquetasDisponibles.filter((cat) => {
      // Coincidencia con tipo si está presente
      const coincideTipo = cat.tipo ? (esIngreso ? cat.tipo === 'ingreso' : cat.tipo === 'gasto') : true;
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
  }

  seleccionarCategoria(cat: any) {
    if (this.seleccionandoCategoriaParaFrecuente) {
      this.nuevoFrecuente.categoria = cat;
      this.seleccionandoCategoriaParaFrecuente = false;
    } else {
      this.categoriaSeleccionada = cat;
      this.validarErrores();
    }
    this.mostrarSelectorCategorias = false;
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
    const saldoActual = Number(cuenta.saldo_actual ?? 0);
    if (cuenta.tipo === 'CREDITO') {
      const limiteCredito = Number(cuenta.limite_credito ?? 0);
      return Math.max(limiteCredito + Math.min(saldoActual, 0), 0);
    }
    return saldoActual;
  }

  etiquetaSaldoCuenta(cuenta: any): string {
    return cuenta.tipo === 'CREDITO' ? 'Disponible' : 'Saldo';
  }

  validarErrores(forzarMostrar: boolean = false): boolean {
    const montoNum = Number(this.movimiento.monto);
    const saldoDisponible = this.cuentaSeleccionadaObj ? this.saldoMostradoCuenta(this.cuentaSeleccionadaObj) : 0;

    const montoInvalido = !Number.isFinite(montoNum) || montoNum <= 0;
    const saldoInsuficiente =
      !this.editando &&
      this.esEgreso &&
      !!this.cuentaSeleccionadaObj &&
      Number.isFinite(montoNum) &&
      montoNum > saldoDisponible &&
      this.cuentaSeleccionadaObj?.tipo !== 'CREDITO';

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
    if (this.isloading()) return;

    if (this.validarErrores(true)) {
      this.toastService.show('Completa los campos obligatorios en rojo', 'error');
      return;
    }

    this.isloading.set(true);

    const tipo = Number(this.movimiento.tipoMovimiento);
    const categoriaId = this.categoriaSeleccionada?.id;
    const descripcionFinal = this.movimiento.descripcion.trim();

    const payload = {
      tipoMovimiento: tipo,
      cuenta: this.movimiento.cuenta,
      monto: tipo === 2 ? Math.abs(Number(this.movimiento.monto)) * -1 : Math.abs(Number(this.movimiento.monto)),
      descripcion: descripcionFinal,
      notas: this.movimiento.notas.trim(),
      fecha: this.movimiento.fecha || this.obtenerFechaHoy(),
      etiquetas: categoriaId ? [categoriaId] : [],
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
      tipoMovimiento: Number(this.movimientoEditar.id_tipo_movimiento ?? 2),
      cuenta: String(
        this.movimientoEditar.id_cuenta ??
        this.movimientoEditar.cuenta_id ??
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
      const firstTag = this.movimientoEditar.etiquetas[0];
      const found = this.etiquetasDisponibles.find((item) => String(item.id) === String(firstTag.id ?? firstTag));
      if (found) {
        this.categoriaSeleccionada = found;
      }
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
