import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CuentasService } from '../../../core/services/cuentas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Modal } from '../../../shared/modal/modal';
import { MovimientosService } from '../../../core/services/movimientos.service';

interface CuentaTransferencia {
  id: string;
  nombre: string;
  tipo: string;
  saldo_actual: number;
  limite_credito?: number | string | null;
  color?: string;
}

@Component({
  selector: 'app-transferir-saldo',
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './transferir-saldo.html',
  styleUrl: './transferir-saldo.css',
})
export class TransferirSaldo implements OnChanges {
  @Input() isOpen = false;
  @Input() cuentaOrigenId = '';
  @Input() transferenciaEditar: any | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  cuentas: CuentaTransferencia[] = [];
  cargandoCuentas = signal(false);
  isLoading = signal(false);

  transferencia = {
    cuentaOrigen: '',
    cuentaDestino: '',
    monto: 0,
    descripcion: '',
    notas: '',
    etiquetas: [],
  };

  erroresValidacion = signal({
    cuentaOrigen: false,
    cuentaDestino: false,
    cuentasIguales: false,
    monto: false,
    saldoInsuficiente: false,
  });

  constructor(
    private cuentasService: CuentasService,
    private toastService: ToastService,
    private cd: ChangeDetectorRef,
    private movimientosService: MovimientosService
  ) {}

  get editando(): boolean {
    return !!this.transferenciaEditar;
  }

  etiquetasDisponibles: { id: number; nombre: string; color: string }[] = [];
  etiquetasSeleccionadas: { id: number; nombre: string; color: string }[] = [];
  busquedaEtiqueta = '';
  mostrarDropdownEtiquetas = false;

  get etiquetasFiltradas() {
    return this.etiquetasDisponibles.filter(e =>
      !this.etiquetasSeleccionadas.find(s => s.id === e.id) &&
      e.nombre.toLowerCase().includes(this.busquedaEtiqueta.toLowerCase())
    );
  }

  agregarEtiqueta(etiqueta: { id: number; nombre: string; color: string }) {
    if (!this.etiquetasSeleccionadas.find(e => e.id === etiqueta.id)) {
      this.etiquetasSeleccionadas = [...this.etiquetasSeleccionadas, etiqueta];
    }
    this.busquedaEtiqueta = '';
  }

  quitarEtiqueta(etiqueta: { id: number; nombre: string; color: string }) {
    this.etiquetasSeleccionadas = this.etiquetasSeleccionadas.filter(e => e.id !== etiqueta.id);
  }

  onBlurEtiqueta() {
    setTimeout(() => {
      this.mostrarDropdownEtiquetas = false;
      this.busquedaEtiqueta = '';
    }, 150);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetFormulario();
      this.cargarCuentas();

      this.movimientosService.consultarEtiquetas().subscribe((res: any) => {
        this.etiquetasDisponibles = res;
        this.precargarEtiquetasEdicion();
      });
    }
  }

  get cuentasDestino(): CuentaTransferencia[] {
    return this.cuentas.filter((cuenta) => cuenta.id !== this.transferencia.cuentaOrigen);
  }

  get cuentaOrigenSeleccionada(): CuentaTransferencia | undefined {
    return this.cuentas.find((cuenta) => cuenta.id === this.transferencia.cuentaOrigen);
  }

  get cuentaDestinoSeleccionada(): CuentaTransferencia | undefined {
    return this.cuentas.find((cuenta) => cuenta.id === this.transferencia.cuentaDestino);
  }

  get saldoDisponible(): number {
    if (!this.cuentaOrigenSeleccionada) return 0;

    return this.saldoMostradoCuenta(this.cuentaOrigenSeleccionada);
  }

  saldoMostradoCuenta(cuenta: CuentaTransferencia): number {
    const saldoActual = this.toNumber(cuenta.saldo_actual);

    if (cuenta.tipo === 'CREDITO') {
      const limiteCredito = this.toNumber(cuenta.limite_credito);

      return Math.max(limiteCredito + Math.min(saldoActual, 0), 0);
    }

    return saldoActual;
  }

  etiquetaSaldoCuenta(cuenta: CuentaTransferencia): string {
    return cuenta.tipo === 'CREDITO' ? 'Disponible' : 'Saldo';
  }

  cargarCuentas(): void {
    this.cargandoCuentas.set(true);

    this.cuentasService
      .consultarCuentasActivas()
      .pipe(finalize(() => this.cargandoCuentas.set(false)))
      .subscribe({
        next: (res: any) => {
          this.cuentas = (Array.isArray(res) ? res : []).map((cuenta) => ({
            ...cuenta,
            saldo_actual: Number(cuenta.saldo_actual),
          }));

          this.cd.detectChanges();
        },
        error: () => {
          this.toastService.show('No se pudieron cargar las cuentas.', 'error');
        },
      });
  }

  seleccionarCuentaOrigen(): void {
    if (this.transferencia.cuentaOrigen === this.transferencia.cuentaDestino) {
      this.transferencia.cuentaDestino = '';
    }

    this.validarErrores();
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
    this.transferencia.monto = Number(valor);
    this.validarErrores('monto');
  }

  validarErrores(
    campo?: 'cuentaOrigen' | 'cuentaDestino' | 'monto',
  ): boolean {
    const monto = Number(this.transferencia.monto);
    const errores = {
      cuentaOrigen: !this.transferencia.cuentaOrigen,
      cuentaDestino: !this.transferencia.cuentaDestino,
      cuentasIguales:
        !!this.transferencia.cuentaOrigen &&
        this.transferencia.cuentaOrigen === this.transferencia.cuentaDestino,
      monto: !Number.isFinite(monto) || monto <= 0,
      saldoInsuficiente:
        !this.editando &&
        !!this.transferencia.cuentaOrigen &&
        Number.isFinite(monto) &&
        monto > this.saldoDisponible,
    };

    if (campo) {
      this.erroresValidacion.update((actuales) => ({
        ...actuales,
        [campo]: errores[campo],
        cuentasIguales: errores.cuentasIguales,
        saldoInsuficiente: errores.saldoInsuficiente,
      }));
    } else {
      this.erroresValidacion.set(errores);
    }

    return Object.values(errores).some(Boolean);
  }

  transferir(): void {
    if (this.isLoading() || this.validarErrores()) return;

    this.isLoading.set(true);

    const etiquetaTransferenciaId = 6;
    const etiquetas = [
      ...new Set([
        etiquetaTransferenciaId,
        ...this.etiquetasSeleccionadas.map((etiqueta) => etiqueta.id),
      ]),
    ];

    const payload = {
      id_cuenta_origen: this.transferencia.cuentaOrigen,
      id_cuenta_destino: this.transferencia.cuentaDestino,
      monto: Number(this.transferencia.monto),
      descripcion: this.transferencia.descripcion.trim() || 'Transferencia entre cuentas',
      notas: this.transferencia.notas.trim(),
      etiquetas,
    };

    const request$ = this.editando
      ? this.cuentasService.actualizarTransferenciaSaldo(this.obtenerIdTransferenciaEdicion(), payload)
      : this.cuentasService.transferirSaldo(payload);

    request$
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res: any) => {
          this.toastService.show(
            res?.message ?? (this.editando ? 'Transferencia actualizada correctamente.' : 'Transferencia realizada correctamente.'),
            'success'
          );
          this.saved.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.toastService.show(
            err?.error?.message ?? (this.editando ? 'No se pudo actualizar la transferencia.' : 'No se pudo realizar la transferencia.'),
            'error',
          );
        },
      });
  }

  private resetFormulario(): void {
    this.transferencia = {
      cuentaOrigen: this.cuentaOrigenId,
      cuentaDestino: '',
      monto: 0,
      descripcion: '',
      notas: '',
      etiquetas: [],
    };

    this.erroresValidacion.set({
      cuentaOrigen: false,
      cuentaDestino: false,
      cuentasIguales: false,
      monto: false,
      saldoInsuficiente: false,
    });

    this.etiquetasSeleccionadas = [];
    this.busquedaEtiqueta = '';
    this.mostrarDropdownEtiquetas = false;

    if (this.editando) {
      this.precargarTransferenciaEdicion();
    }
  }

  private precargarTransferenciaEdicion(): void {
    if (!this.transferenciaEditar) return;

    const idCuentaMovimiento = String(
      this.transferenciaEditar.id_cuenta ??
      this.transferenciaEditar.cuenta_id ??
      this.cuentaOrigenId ??
      ''
    );
    const esEntrada = Number(this.transferenciaEditar.id_tipo_movimiento) === 1;
    const idOrigenApi = this.obtenerPrimerValor(
      this.transferenciaEditar.id_cuenta_origen,
      this.transferenciaEditar.cuenta_origen_id,
      this.transferenciaEditar.cuentaOrigen,
    );
    const idDestinoApi = this.obtenerPrimerValor(
      this.transferenciaEditar.id_cuenta_destino,
      this.transferenciaEditar.cuenta_destino_id,
      this.transferenciaEditar.cuentaDestino,
    );
    const cuentasPrecargadas = this.resolverCuentasTransferenciaEdicion(
      idCuentaMovimiento,
      idOrigenApi,
      idDestinoApi,
      esEntrada,
    );

    this.transferencia = {
      cuentaOrigen: cuentasPrecargadas.cuentaOrigen,
      cuentaDestino: cuentasPrecargadas.cuentaDestino,
      monto: Math.abs(Number(this.transferenciaEditar.monto ?? 0)),
      descripcion: this.transferenciaEditar.descripcion ?? '',
      notas: this.transferenciaEditar.notas ?? '',
      etiquetas: [],
    };

    this.precargarEtiquetasEdicion();
  }

  private resolverCuentasTransferenciaEdicion(
    idCuentaMovimiento: string,
    idOrigenApi: string,
    idDestinoApi: string,
    esEntrada: boolean,
  ): { cuentaOrigen: string; cuentaDestino: string } {
    let cuentaOrigen = idOrigenApi;
    let cuentaDestino = idDestinoApi;

    if (esEntrada) {
      if (idCuentaMovimiento) {
        if (idOrigenApi === idCuentaMovimiento && idDestinoApi) {
          cuentaOrigen = idDestinoApi;
          cuentaDestino = idOrigenApi;
        } else if (idDestinoApi !== idCuentaMovimiento) {
          cuentaOrigen = idOrigenApi || idDestinoApi;
          cuentaDestino = idCuentaMovimiento;
        }
      }
    } else if (idCuentaMovimiento) {
      if (idDestinoApi === idCuentaMovimiento && idOrigenApi) {
        cuentaOrigen = idDestinoApi;
        cuentaDestino = idOrigenApi;
      } else if (idOrigenApi !== idCuentaMovimiento) {
        cuentaOrigen = idCuentaMovimiento;
        cuentaDestino = idDestinoApi || idOrigenApi;
      }
    }

    return { cuentaOrigen, cuentaDestino };
  }

  private obtenerPrimerValor(...valores: unknown[]): string {
    const valor = valores.find((item) => item !== null && item !== undefined && item !== '');

    return valor === undefined ? '' : String(valor);
  }

  private precargarEtiquetasEdicion(): void {
    if (!this.transferenciaEditar?.etiquetas?.length) return;

    this.etiquetasSeleccionadas = this.transferenciaEditar.etiquetas.map((etiqueta: any) => {
      const etiquetaDisponible = this.etiquetasDisponibles.find(
        (item) => String(item.id) === String(etiqueta.id)
      );

      return etiquetaDisponible ?? etiqueta;
    });
  }

  private obtenerIdTransferenciaEdicion(): string | number {
    return (
      this.transferenciaEditar?.id_transferencia ??
      this.transferenciaEditar?.id_transferencia_saldo ??
      this.transferenciaEditar?.transferencia_id ??
      this.transferenciaEditar?.id
    );
  }

  private toNumber(valor: number | string | null | undefined): number {
    const numero = Number(valor ?? 0);

    return Number.isFinite(numero) ? numero : 0;
  }
}
