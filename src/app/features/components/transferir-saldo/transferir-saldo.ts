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
  @Output() closed = new EventEmitter<void>();

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

    this.cuentasService
      .transferirSaldo(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message ?? 'Transferencia realizada correctamente.', 'success');
          this.closed.emit();
        },
        error: (err) => {
          this.toastService.show(
            err?.error?.message ?? 'No se pudo realizar la transferencia.',
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
  }

  private toNumber(valor: number | string | null | undefined): number {
    const numero = Number(valor ?? 0);

    return Number.isFinite(numero) ? numero : 0;
  }
}
