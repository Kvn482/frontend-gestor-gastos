import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { CuentasService } from '../../core/services/cuentas.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { PagarTarjetaModal } from '../components/pagar-tarjeta-modal/pagar-tarjeta-modal';

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
}

@Component({
  selector: 'app-cuenta-detalle',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, PercentPipe, RouterLink, PagarTarjetaModal],
  templateUrl: './cuenta-detalle.html',
  styleUrl: './cuenta-detalle.css',
})
export class CuentaDetalle implements OnInit {
  cuenta: CuentaDetalleModel | null = null;
  movimientos: MovimientoCuenta[] = [];
  cargando = true;
  modalPagoTarjetaAbierto = false;

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

  abrirModalPagoTarjeta(): void {
    if (!this.cuenta) return;

    this.modalPagoTarjetaAbierto = true;
  }

  cerrarModalPagoTarjeta(): void {
    this.modalPagoTarjetaAbierto = false;
    this.recargarDetalle();
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
}
