import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { CuentasService } from '../../core/services/cuentas.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { crearFechaLocal } from '../../shared/utils/fechas';
import { monetraSweetAlertClasses } from '../../shared/utils/sweet-alert';
import { MovimientoDetalleModal } from '../components/movimiento-detalle-modal/movimiento-detalle-modal';
import { NuevoMovimientoModal } from '../components/nuevo-movimiento-modal/nuevo-movimiento-modal';
import { TransferirSaldo } from '../components/transferir-saldo/transferir-saldo';
import Swal from 'sweetalert2';

type FiltroFecha =
  | 'todos'
  | 'ultimos_7_dias'
  | 'ultimos_30_dias'
  | 'este_mes'
  | 'mes_anterior'
  | 'personalizado';

type FiltroTipoMovimiento = 'todos' | 'ingresos' | 'gastos';
type GrupoFiltroActivo = 'fecha' | 'tipo' | 'cuenta' | 'transferencias' | 'etiquetas';
type OrdenMovimientoCampo = 'fecha' | 'cuenta' | 'descripcion' | 'etiquetas' | 'monto';
type OrdenMovimientoDireccion = 'asc' | 'desc';

interface CuentaMovimiento {
  id: number | string;
  nombre: string;
}

interface EtiquetaMovimiento {
  id: number | string;
  nombre: string;
  color: string;
}

interface MovimientoGlobal {
  id: number | string;
  fecha: string;
  descripcion: string;
  monto: number;
  id_tipo_movimiento: number;
  etiquetas: EtiquetaMovimiento[];
  notas?: string | null;
  cuenta?: string | null;
  tipo_cuenta?: string | null;
  id_cuenta?: number | string | null;
  id_cuenta_origen?: number | string | null;
  id_cuenta_destino?: number | string | null;
  cuenta_origen_id?: number | string | null;
  cuenta_destino_id?: number | string | null;
  cuenta_id?: number | string | null;
  id_transferencia?: number | string | null;
  id_transferencia_saldo?: number | string | null;
  transferencia_id?: number | string | null;
}

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, MovimientoDetalleModal, NuevoMovimientoModal, TransferirSaldo],
  templateUrl: './movimientos.html',
  styleUrl: './movimientos.css',
})
export class Movimientos implements OnInit {
  cargando = true;
  errorCarga = '';
  movimientos: MovimientoGlobal[] = [];
  cuentas: CuentaMovimiento[] = [];
  etiquetasDisponibles: EtiquetaMovimiento[] = [];

  filtrosAbiertos = false;
  grupoFiltroActivo: GrupoFiltroActivo = 'fecha';
  busquedaMovimiento = '';
  filtroFecha: FiltroFecha = 'ultimos_30_dias';
  filtroTipoMovimiento: FiltroTipoMovimiento = 'todos';
  cuentaSeleccionada = 'todas';
  mostrarMovimientosEntreCuentas = true;
  filtrosEtiquetas: string[] = [];
  categoriaSeleccionada = '';
  fechaDesde = '';
  fechaHasta = '';
  ordenCampo: OrdenMovimientoCampo = 'fecha';
  ordenDireccion: OrdenMovimientoDireccion = 'desc';
  rutaRegreso = '/cuentas';
  textoRegreso = 'Cuentas';
  modalMovimientoAbierto = false;
  modalEditarMovimientoAbierto = false;
  modalEditarTransferenciaAbierto = false;
  movimientoSeleccionado: MovimientoGlobal | null = null;
  eliminandoMovimiento = false;

  constructor(
    private route: ActivatedRoute,
    private cuentasService: CuentasService,
    private movimientosService: MovimientosService,
    private toastService: ToastService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.aplicarQueryParams();
    this.cargarDatos();
  }

  get movimientosFiltrados(): MovimientoGlobal[] {
    const busqueda = this.normalizarTexto(this.busquedaMovimiento);
    const rango = this.obtenerRangoFecha();

    const filtrados = this.movimientos.filter((movimiento) => {
      const fechaMovimiento = this.normalizarFecha(crearFechaLocal(movimiento.fecha));
      const idCuenta = this.obtenerIdCuenta(movimiento);

      if (busqueda) {
        const texto = this.normalizarTexto(
          `${movimiento.descripcion ?? ''} ${movimiento.notas ?? ''} ${movimiento.cuenta ?? ''}`
        );

        if (!texto.includes(busqueda)) return false;
      }

      if (this.filtroTipoMovimiento === 'ingresos' && movimiento.id_tipo_movimiento !== 1) {
        return false;
      }

      if (this.filtroTipoMovimiento === 'gastos' && movimiento.id_tipo_movimiento === 1) {
        return false;
      }

      if (this.cuentaSeleccionada !== 'todas' && String(idCuenta) !== this.cuentaSeleccionada) {
        return false;
      }

      if (!this.mostrarMovimientosEntreCuentas && this.esMovimientoEntreCuentas(movimiento)) {
        return false;
      }

      if (this.filtrosEtiquetas.length > 0) {
        const tieneEtiqueta = movimiento.etiquetas?.some((etiqueta) =>
          this.filtrosEtiquetas.includes(String(etiqueta.id))
        );

        if (!tieneEtiqueta) return false;
      }

      if (this.categoriaSeleccionada) {
        const tieneCategoria = movimiento.etiquetas?.some(
          (etiqueta) => this.normalizarTexto(etiqueta.nombre) === this.categoriaSeleccionada
        );

        if (!tieneCategoria) return false;
      }

      if (rango.desde && fechaMovimiento < rango.desde) return false;
      if (rango.hasta && fechaMovimiento > rango.hasta) return false;

      return true;
    });

    return this.ordenarMovimientos(filtrados);
  }

  get totalEntradasFiltradas(): number {
    return this.movimientosFiltrados
      .filter((movimiento) => movimiento.id_tipo_movimiento === 1)
      .reduce((total, movimiento) => total + Math.abs(Number(movimiento.monto ?? 0)), 0);
  }

  get totalSalidasFiltradas(): number {
    return this.movimientosFiltrados
      .filter((movimiento) => movimiento.id_tipo_movimiento !== 1)
      .reduce((total, movimiento) => total + Math.abs(Number(movimiento.monto ?? 0)), 0);
  }

  get totalNetoFiltrado(): number {
    return this.totalEntradasFiltradas - this.totalSalidasFiltradas;
  }

  get hayFiltrosActivos(): boolean {
    return this.totalFiltrosActivos > 0;
  }

  get totalFiltrosActivos(): number {
    let total = 0;

    if (this.busquedaMovimiento.trim()) total++;
    if (this.filtroFecha !== 'todos') total++;
    if (this.filtroTipoMovimiento !== 'todos') total++;
    if (this.cuentaSeleccionada !== 'todas') total++;
    if (!this.mostrarMovimientosEntreCuentas) total++;
    if (this.filtrosEtiquetas.length > 0) total++;
    if (this.categoriaSeleccionada) total++;

    return total;
  }

  get resumenFiltros(): string {
    const filtros = [this.etiquetaFiltroFecha];

    if (this.filtroTipoMovimiento !== 'todos') {
      filtros.push(this.filtroTipoMovimiento === 'ingresos' ? 'Ingresos' : 'Gastos');
    }

    if (this.cuentaSeleccionada !== 'todas') {
      filtros.push(this.etiquetaFiltroCuenta);
    }

    if (!this.mostrarMovimientosEntreCuentas) {
      filtros.push('Sin transferencias');
    }

    if (this.filtrosEtiquetas.length > 0 || this.categoriaSeleccionada) {
      filtros.push(this.etiquetaFiltroEtiqueta);
    }

    return filtros.join(' / ');
  }

  get etiquetaFiltroTipo(): string {
    if (this.filtroTipoMovimiento === 'ingresos') return 'Ingresos';
    if (this.filtroTipoMovimiento === 'gastos') return 'Gastos';

    return 'Todos';
  }

  get etiquetaFiltroCuenta(): string {
    if (this.cuentaSeleccionada === 'todas') return 'Todas';

    const cuenta = this.cuentas.find((item) => String(item.id) === this.cuentaSeleccionada);

    return cuenta?.nombre ?? 'Cuenta';
  }

  get etiquetaFiltroTransferencias(): string {
    return this.mostrarMovimientosEntreCuentas ? 'Mostrar' : 'Ocultar';
  }

  get etiquetaFiltroEtiqueta(): string {
    if (this.categoriaSeleccionada) return this.categoriaSeleccionada;
    if (this.filtrosEtiquetas.length === 0) return 'Todas';

    const etiquetasSeleccionadas = this.etiquetasDisponibles.filter((etiqueta) =>
      this.filtrosEtiquetas.includes(String(etiqueta.id))
    );

    if (etiquetasSeleccionadas.length === 1) {
      return etiquetasSeleccionadas[0].nombre;
    }

    return `${etiquetasSeleccionadas.length} etiquetas`;
  }

  get etiquetaFiltroFecha(): string {
    const etiquetas: Record<FiltroFecha, string> = {
      todos: 'Todos',
      ultimos_7_dias: 'Ultimos 7 dias',
      ultimos_30_dias: 'Ultimos 30 dias',
      este_mes: 'Este mes',
      mes_anterior: 'Mes anterior',
      personalizado: 'Personalizado',
    };

    return etiquetas[this.filtroFecha];
  }

  get mostrarFechasPersonalizadas(): boolean {
    return this.filtroFecha === 'personalizado';
  }

  get idCuentaMovimientoSeleccionado(): string {
    if (!this.movimientoSeleccionado) return '';

    return String(this.obtenerIdCuenta(this.movimientoSeleccionado) ?? '');
  }

  cargarDatos(): void {
    this.cargando = true;
    this.errorCarga = '';

    forkJoin({
      cuentas: this.cuentasService.consultarCuentas(),
      movimientos: this.movimientosService.consultarMovimientos(),
    }).subscribe({
      next: ({ cuentas, movimientos }) => {
        this.cuentas = Array.isArray(cuentas) ? cuentas as CuentaMovimiento[] : [];
        this.movimientos = this.normalizarMovimientos(movimientos);
        this.etiquetasDisponibles = this.obtenerEtiquetasDisponibles(this.movimientos);
        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorCarga = err?.error?.message ?? 'No pudimos cargar los movimientos.';
        this.cargando = false;
        this.cd.detectChanges();
      },
    });
  }

  limpiarFiltros(): void {
    this.busquedaMovimiento = '';
    this.filtroFecha = 'ultimos_30_dias';
    this.filtroTipoMovimiento = 'todos';
    this.cuentaSeleccionada = 'todas';
    this.mostrarMovimientosEntreCuentas = true;
    this.filtrosEtiquetas = [];
    this.categoriaSeleccionada = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
  }

  seleccionarGrupoFiltro(grupo: GrupoFiltroActivo): void {
    this.grupoFiltroActivo = grupo;
  }

  toggleMovimientosEntreCuentas(): void {
    this.mostrarMovimientosEntreCuentas = !this.mostrarMovimientosEntreCuentas;
  }

  limpiarFiltroEtiquetas(): void {
    this.filtrosEtiquetas = [];
    this.categoriaSeleccionada = '';
  }

  toggleFiltroEtiqueta(idEtiqueta: number | string): void {
    const id = String(idEtiqueta);

    if (this.filtrosEtiquetas.includes(id)) {
      this.filtrosEtiquetas = this.filtrosEtiquetas.filter((item) => item !== id);
      return;
    }

    this.filtrosEtiquetas = [...this.filtrosEtiquetas, id];
  }

  etiquetaSeleccionada(idEtiqueta: number | string): boolean {
    return this.filtrosEtiquetas.includes(String(idEtiqueta));
  }

  ordenarPor(campo: OrdenMovimientoCampo): void {
    if (this.ordenCampo === campo) {
      this.ordenDireccion = this.ordenDireccion === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.ordenCampo = campo;
    this.ordenDireccion = campo === 'fecha' || campo === 'monto' ? 'desc' : 'asc';
  }

  abrirDetalleMovimiento(movimiento: MovimientoGlobal): void {
    this.movimientoSeleccionado = movimiento;
    this.modalMovimientoAbierto = true;
  }

  cerrarDetalleMovimiento(): void {
    this.modalMovimientoAbierto = false;
    this.movimientoSeleccionado = null;
  }

  abrirEditarMovimiento(): void {
    if (!this.movimientoSeleccionado) return;

    this.modalMovimientoAbierto = false;

    if (this.esMovimientoEntreCuentas(this.movimientoSeleccionado)) {
      this.modalEditarTransferenciaAbierto = true;
      return;
    }

    this.modalEditarMovimientoAbierto = true;
  }

  cerrarEditarMovimiento(): void {
    this.modalEditarMovimientoAbierto = false;
    this.modalEditarTransferenciaAbierto = false;
    this.movimientoSeleccionado = null;
  }

  movimientoEditado(): void {
    this.modalEditarMovimientoAbierto = false;
    this.modalEditarTransferenciaAbierto = false;
    this.movimientoSeleccionado = null;
    this.cargarDatos();
  }

  async eliminarMovimiento(): Promise<void> {
    if (!this.movimientoSeleccionado || this.eliminandoMovimiento) return;

    const esTransferencia = this.esMovimientoEntreCuentas(this.movimientoSeleccionado);
    const result = await Swal.fire({
      title: esTransferencia ? 'Eliminar transferencia' : 'Eliminar movimiento',
      text: esTransferencia
        ? 'Esto eliminara la transferencia completa y ajustara ambas cuentas.'
        : 'Este movimiento se eliminara y se ajustara el saldo de la cuenta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false,
      customClass: monetraSweetAlertClasses,
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    this.eliminandoMovimiento = true;

    this.movimientosService
      .eliminarMovimiento(this.movimientoSeleccionado.id)
      .pipe(finalize(() => (this.eliminandoMovimiento = false)))
      .subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message ?? 'Movimiento eliminado correctamente.', 'success');
          this.modalMovimientoAbierto = false;
          this.movimientoSeleccionado = null;
          this.cargarDatos();
        },
        error: (err) => {
          this.toastService.show(err?.error?.message ?? 'No se pudo eliminar el movimiento.', 'error');
        },
      });
  }

  private aplicarQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const tipo = params.get('tipo');
    const cuentaId = params.get('cuentaId');
    const etiqueta = params.get('etiqueta');
    const categoria = params.get('categoria');
    const desde = params.get('desde');
    const hasta = params.get('hasta');
    const mes = params.get('mes');
    const busqueda = params.get('q');
    const transferencias = params.get('transferencias');
    const origen = params.get('origen');

    if (origen === 'analisis') {
      this.rutaRegreso = '/analisis';
      this.textoRegreso = 'Analisis';
    }

    if (tipo === 'ingresos' || tipo === 'gastos') {
      this.filtroTipoMovimiento = tipo;
    }

    if (cuentaId) {
      this.cuentaSeleccionada = cuentaId;
    }

    if (etiqueta) {
      this.filtrosEtiquetas = [etiqueta];
    }

    if (categoria) {
      this.categoriaSeleccionada = this.normalizarTexto(categoria);
    }

    if (busqueda) {
      this.busquedaMovimiento = busqueda;
    }

    if (transferencias === 'false' || transferencias === '0') {
      this.mostrarMovimientosEntreCuentas = false;
    }

    if (mes && /^\d{4}-\d{2}$/.test(mes)) {
      const [year, month] = mes.split('-').map(Number);
      const desdeMes = new Date(year, month - 1, 1);
      const hastaMes = new Date(year, month, 0);

      this.filtroFecha = 'personalizado';
      this.fechaDesde = this.formatearInputDate(desdeMes);
      this.fechaHasta = this.formatearInputDate(hastaMes);
      return;
    }

    if (desde || hasta) {
      this.filtroFecha = 'personalizado';
      this.fechaDesde = desde ?? '';
      this.fechaHasta = hasta ?? '';
    }
  }

  private normalizarMovimientos(res: unknown): MovimientoGlobal[] {
    if (!Array.isArray(res)) return [];

    return res.map((movimiento: any) => ({
      ...movimiento,
      monto: Number(movimiento.monto ?? 0),
      etiquetas: Array.isArray(movimiento.etiquetas) ? movimiento.etiquetas : [],
    }));
  }

  private obtenerEtiquetasDisponibles(movimientos: MovimientoGlobal[]): EtiquetaMovimiento[] {
    const etiquetas = new Map<string, EtiquetaMovimiento>();

    movimientos.forEach((movimiento) => {
      movimiento.etiquetas?.forEach((etiqueta) => {
        etiquetas.set(String(etiqueta.id), etiqueta);
      });
    });

    return Array.from(etiquetas.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private ordenarMovimientos(movimientos: MovimientoGlobal[]): MovimientoGlobal[] {
    return [...movimientos].sort((a, b) => {
      const comparacion = this.compararMovimientos(a, b, this.ordenCampo);
      const comparacionOrdenada = this.ordenDireccion === 'asc' ? comparacion : comparacion * -1;

      if (comparacionOrdenada !== 0) return comparacionOrdenada;

      return this.compararMovimientos(a, b, 'fecha') * -1;
    });
  }

  private compararMovimientos(
    a: MovimientoGlobal,
    b: MovimientoGlobal,
    campo: OrdenMovimientoCampo
  ): number {
    if (campo === 'fecha') {
      return crearFechaLocal(a.fecha).getTime() - crearFechaLocal(b.fecha).getTime();
    }

    if (campo === 'monto') {
      return Math.abs(Number(a.monto ?? 0)) - Math.abs(Number(b.monto ?? 0));
    }

    if (campo === 'cuenta') {
      return (a.cuenta ?? '').localeCompare(b.cuenta ?? '');
    }

    if (campo === 'etiquetas') {
      return this.obtenerTextoEtiquetas(a).localeCompare(this.obtenerTextoEtiquetas(b));
    }

    return (a.descripcion ?? '').localeCompare(b.descripcion ?? '');
  }

  private obtenerTextoEtiquetas(movimiento: MovimientoGlobal): string {
    return (movimiento.etiquetas ?? [])
      .map((etiqueta) => etiqueta.nombre)
      .sort((a, b) => a.localeCompare(b))
      .join(', ');
  }

  private obtenerRangoFecha(): { desde: Date | null; hasta: Date | null } {
    const hoy = this.normalizarFecha(new Date());

    if (this.filtroFecha === 'todos') return { desde: null, hasta: null };
    if (this.filtroFecha === 'ultimos_7_dias') return { desde: this.sumarDias(hoy, -6), hasta: hoy };
    if (this.filtroFecha === 'ultimos_30_dias') return { desde: this.sumarDias(hoy, -29), hasta: hoy };

    if (this.filtroFecha === 'este_mes') {
      return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: hoy };
    }

    if (this.filtroFecha === 'mes_anterior') {
      return {
        desde: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
        hasta: new Date(hoy.getFullYear(), hoy.getMonth(), 0),
      };
    }

    return {
      desde: this.fechaDesde ? this.normalizarFecha(new Date(`${this.fechaDesde}T00:00:00`)) : null,
      hasta: this.fechaHasta ? this.normalizarFecha(new Date(`${this.fechaHasta}T00:00:00`)) : null,
    };
  }

  private obtenerIdCuenta(movimiento: MovimientoGlobal): number | string | null | undefined {
    return movimiento.id_cuenta ?? movimiento.cuenta_id;
  }

  private esMovimientoEntreCuentas(movimiento: MovimientoGlobal): boolean {
    const tieneRelacionTransferencia = [
      movimiento.id_transferencia,
      movimiento.id_transferencia_saldo,
      movimiento.transferencia_id,
      movimiento.id_cuenta_origen,
      movimiento.id_cuenta_destino,
      movimiento.cuenta_origen_id,
      movimiento.cuenta_destino_id,
    ].some((valor) => valor !== null && valor !== undefined && valor !== '');

    if (tieneRelacionTransferencia) return true;

    return movimiento.etiquetas?.some((etiqueta) => {
      const nombre = this.normalizarTexto(etiqueta.nombre ?? '');

      return String(etiqueta.id) === '6' || nombre.includes('transfer');
    }) ?? false;
  }

  private normalizarFecha(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }

  private sumarDias(fecha: Date, dias: number): Date {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    return nuevaFecha;
  }

  private formatearInputDate(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
