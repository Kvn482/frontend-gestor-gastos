import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { CuentasService } from '../../core/services/cuentas.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { PagarTarjetaModal } from '../components/pagar-tarjeta-modal/pagar-tarjeta-modal';
import { Modal } from '../../shared/modal/modal';
import { crearFechaLocal, formatearFechaLocal } from '../../shared/utils/fechas';

type TipoCuenta = 'DEBITO' | 'EFECTIVO' | 'CREDITO';

interface CuentaDetalleModel {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  saldo_actual: number;
  color: string;
  limite_credito?: number | string | null;
  dia_corte?: number | string | null;
  fecha_limite_pago?: number | string | null;
}

interface EtiquetaMovimiento {
  id: number | string;
  nombre: string;
  color: string;
}

interface MovimientoCuenta {
  id: number | string;
  fecha: string;
  descripcion: string;
  monto: number;
  id_tipo_movimiento: number;
  etiquetas: EtiquetaMovimiento[];
  notas?: string | null;
  cuenta?: string | null;
  tipo_cuenta?: string | null;
}

type FiltroFecha =
  | 'todos'
  | 'ultimos_7_dias'
  | 'ultimos_30_dias'
  | 'este_mes'
  | 'mes_anterior'
  | 'personalizado';

type FiltroTipoMovimiento = 'todos' | 'ingresos' | 'gastos';
type GrupoFiltroActivo = 'fecha' | 'tipo' | 'etiquetas';

@Component({
  selector: 'app-cuenta-detalle',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, PercentPipe, FormsModule, RouterLink, PagarTarjetaModal, Modal],
  templateUrl: './cuenta-detalle.html',
  styleUrl: './cuenta-detalle.css',
})
export class CuentaDetalle implements OnInit {
  cuenta: CuentaDetalleModel | null = null;
  movimientos: MovimientoCuenta[] = [];
  movimientoSeleccionado: MovimientoCuenta | null = null;
  cargando = true;
  modalPagoTarjetaAbierto = false;
  modalMovimientoAbierto = false;
  filtrosAbiertos = false;
  grupoFiltroActivo: GrupoFiltroActivo = 'fecha';
  busquedaMovimiento = '';
  filtroFecha: FiltroFecha = 'ultimos_30_dias';
  filtroTipoMovimiento: FiltroTipoMovimiento = 'todos';
  filtroEtiqueta = 'todas';
  fechaDesde = '';
  fechaHasta = '';
  etiquetasDisponibles: EtiquetaMovimiento[] = [];

  private idCuentaActual = '';

  constructor(
    private route: ActivatedRoute,
    private cuentasService: CuentasService,
    private movimientosService: MovimientosService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        switchMap((idCuenta) => {
          this.idCuentaActual = idCuenta;
          return this.consultarDetalle(idCuenta);
        })
      )
      .subscribe(({ idCuenta, cuentas, movimientos }) => {
        const cuentasLista = cuentas as CuentaDetalleModel[];
        const movimientosLista = movimientos as MovimientoCuenta[];

        this.cuenta =
            cuentasLista.find((cuenta) => String(cuenta.id) === String(idCuenta)) ??
            this.crearCuentaDemo(idCuenta);

        this.movimientos = movimientosLista;
        this.etiquetasDisponibles = this.obtenerEtiquetasDisponibles(movimientosLista);
        this.cargando = false;
        this.cd.detectChanges();
      });
  }

  get esCredito(): boolean {
    return this.cuenta?.tipo === 'CREDITO';
  }

  get limiteCredito(): number {
    return Number(this.cuenta?.limite_credito ?? 0);
  }

  get creditoDisponible(): number {
    return Math.max(this.limiteCredito + Number(this.cuenta?.saldo_actual ?? 0), 0);
  }

  get creditoUtilizado(): number {
    return Math.max(Math.abs(Math.min(Number(this.cuenta?.saldo_actual ?? 0), 0)), 0);
  }

  get porcentajeCreditoUtilizado(): number {
    if (!this.limiteCredito) return 0;

    return Math.min(this.creditoUtilizado / this.limiteCredito, 1);
  }

  get barraCreditoWidth(): string {
    return `${this.porcentajeCreditoUtilizado * 100}%`;
  }

  get saldoMostrado(): number {
    if (!this.cuenta) return 0;

    return this.esCredito ? this.creditoDisponible : Number(this.cuenta.saldo_actual ?? 0);
  }

  get fechaMovimientoSeleccionado(): string {
    const fecha = this.movimientoSeleccionado?.fecha;
    if (!fecha) return '';

    return formatearFechaLocal(fecha);
  }

  get movimientosFiltrados(): MovimientoCuenta[] {
    const busqueda = this.normalizarTexto(this.busquedaMovimiento);
    const rango = this.obtenerRangoFecha();

    return this.movimientos.filter((movimiento) => {
      const fechaMovimiento = this.normalizarFecha(crearFechaLocal(movimiento.fecha));

      if (busqueda) {
        const textoMovimiento = this.normalizarTexto(
          `${movimiento.descripcion ?? ''} ${movimiento.notas ?? ''}`
        );

        if (!textoMovimiento.includes(busqueda)) return false;
      }

      if (this.filtroTipoMovimiento === 'ingresos' && movimiento.id_tipo_movimiento !== 1) {
        return false;
      }

      if (this.filtroTipoMovimiento === 'gastos' && movimiento.id_tipo_movimiento === 1) {
        return false;
      }

      if (this.filtroEtiqueta !== 'todas') {
        const tieneEtiqueta = movimiento.etiquetas?.some(
          (etiqueta) => String(etiqueta.id) === this.filtroEtiqueta
        );

        if (!tieneEtiqueta) return false;
      }

      if (rango.desde && fechaMovimiento < rango.desde) return false;
      if (rango.hasta && fechaMovimiento > rango.hasta) return false;

      return true;
    });
  }

  get hayFiltrosActivos(): boolean {
    return this.totalFiltrosActivos > 0;
  }

  get totalFiltrosActivos(): number {
    let total = 0;

    if (this.busquedaMovimiento.trim()) total++;
    if (this.filtroFecha !== 'todos') total++;
    if (this.filtroTipoMovimiento !== 'todos') total++;
    if (this.filtroEtiqueta !== 'todas') total++;

    return total;
  }

  get resumenFiltros(): string {
    const filtros = [this.etiquetaFiltroFecha];

    if (this.filtroTipoMovimiento !== 'todos') {
      filtros.push(this.filtroTipoMovimiento === 'ingresos' ? 'Ingresos' : 'Gastos');
    }

    if (this.filtroEtiqueta !== 'todas') {
      const etiqueta = this.etiquetasDisponibles.find(
        (item) => String(item.id) === this.filtroEtiqueta
      );

      if (etiqueta) filtros.push(etiqueta.nombre);
    }

    return filtros.join(' / ');
  }

  get etiquetaFiltroTipo(): string {
    if (this.filtroTipoMovimiento === 'ingresos') return 'Ingresos';
    if (this.filtroTipoMovimiento === 'gastos') return 'Gastos';

    return 'Todos';
  }

  get etiquetaFiltroEtiqueta(): string {
    if (this.filtroEtiqueta === 'todas') return 'Todas';

    return (
      this.etiquetasDisponibles.find((etiqueta) => String(etiqueta.id) === this.filtroEtiqueta)
        ?.nombre ?? 'Etiqueta'
    );
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

  abrirDetalleMovimiento(movimiento: MovimientoCuenta): void {
    this.movimientoSeleccionado = movimiento;
    this.modalMovimientoAbierto = true;
  }

  cerrarDetalleMovimiento(): void {
    this.modalMovimientoAbierto = false;
    this.movimientoSeleccionado = null;
  }

  abrirModalPagoTarjeta(): void {
    if (!this.cuenta) return;

    this.modalPagoTarjetaAbierto = true;
  }

  cerrarModalPagoTarjeta(): void {
    this.modalPagoTarjetaAbierto = false;
    this.recargarDetalle();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
  }

  cerrarFiltros(): void {
    this.filtrosAbiertos = false;
  }

  seleccionarGrupoFiltro(grupo: GrupoFiltroActivo): void {
    this.grupoFiltroActivo = grupo;
  }

  limpiarFiltros(): void {
    this.busquedaMovimiento = '';
    this.filtroFecha = 'ultimos_30_dias';
    this.filtroTipoMovimiento = 'todos';
    this.filtroEtiqueta = 'todas';
    this.fechaDesde = '';
    this.fechaHasta = '';
  }

  private recargarDetalle(): void {
    if (!this.idCuentaActual) return;

    this.cargando = true;

    this.consultarDetalle(this.idCuentaActual).subscribe(({ idCuenta, cuentas, movimientos }) => {
      const cuentasLista = cuentas as CuentaDetalleModel[];
      const movimientosLista = movimientos as MovimientoCuenta[];

      this.cuenta =
          cuentasLista.find((cuenta) => String(cuenta.id) === String(idCuenta)) ??
          this.crearCuentaDemo(idCuenta);

      this.movimientos = movimientosLista;
      this.etiquetasDisponibles = this.obtenerEtiquetasDisponibles(movimientosLista);
      this.cargando = false;
      this.cd.detectChanges();
    });
  }

  private consultarDetalle(idCuenta: string) {
    return forkJoin({
      cuentas: this.cuentasService.consultarCuentas().pipe(catchError(() => of([]))),
      movimientos: this.movimientosService
        .consultarMovimientosPorCuenta(idCuenta)
        .pipe(catchError(() => of([]))),
    }).pipe(map(({ cuentas, movimientos }) => ({ idCuenta, cuentas, movimientos })));
  }

  private crearCuentaDemo(idCuenta: string): CuentaDetalleModel {
    return {
      id: idCuenta || '2',
      nombre: 'Tarjeta Monetra',
      tipo: 'CREDITO',
      saldo_actual: -12840,
      color: '#4f46e5',
      limite_credito: 35000,
      dia_corte: 12,
      fecha_limite_pago: 28,
    };
  }

  private obtenerEtiquetasDisponibles(movimientos: MovimientoCuenta[]): EtiquetaMovimiento[] {
    const etiquetas = new Map<string, EtiquetaMovimiento>();

    movimientos.forEach((movimiento) => {
      movimiento.etiquetas?.forEach((etiqueta) => {
        etiquetas.set(String(etiqueta.id), etiqueta);
      });
    });

    return Array.from(etiquetas.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private obtenerRangoFecha(): { desde: Date | null; hasta: Date | null } {
    const hoy = this.normalizarFecha(new Date());

    if (this.filtroFecha === 'todos') {
      return { desde: null, hasta: null };
    }

    if (this.filtroFecha === 'ultimos_7_dias') {
      return { desde: this.sumarDias(hoy, -6), hasta: hoy };
    }

    if (this.filtroFecha === 'ultimos_30_dias') {
      return { desde: this.sumarDias(hoy, -29), hasta: hoy };
    }

    if (this.filtroFecha === 'este_mes') {
      return {
        desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
        hasta: hoy,
      };
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

  private normalizarFecha(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }

  private sumarDias(fecha: Date, dias: number): Date {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);

    return nuevaFecha;
  }

  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
