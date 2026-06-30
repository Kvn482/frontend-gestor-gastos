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

interface CuentaPago {
  id: string;
  nombre: string;
  tipo: string;
  saldo_actual: number;
}

@Component({
  selector: 'app-pagar-tarjeta-modal',
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './pagar-tarjeta-modal.html',
})
export class PagarTarjetaModal implements OnChanges {
  @Input() isOpen = false;
  @Input() cuentaDestinoId = '';
  @Output() closed = new EventEmitter<void>();

  cuentas: CuentaPago[] = [];
  cargandoCuentas = signal(false);
  isLoading = signal(false);

  pago = {
    cuentaOrigen: '',
    monto: 0,
  };

  erroresValidacion = signal({
    cuentaOrigen: false,
    monto: false,
    saldoInsuficiente: false,
    excedeSaldoAPagar: false,
  });

  constructor(
    private cuentasService: CuentasService,
    private toastService: ToastService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetFormulario();
      this.cargarCuentas();
    }
  }

  get cuentaDestino(): CuentaPago | undefined {
    return this.cuentas.find((cuenta) => cuenta.id === this.cuentaDestinoId);
  }

  get cuentasOrigen(): CuentaPago[] {
    return this.cuentas.filter(
      (cuenta) => cuenta.id !== this.cuentaDestinoId && cuenta.tipo !== 'CREDITO',
    );
  }

  get cuentaOrigenSeleccionada(): CuentaPago | undefined {
    return this.cuentas.find((cuenta) => cuenta.id === this.pago.cuentaOrigen);
  }

  get saldoDisponible(): number {
    return Number(this.cuentaOrigenSeleccionada?.saldo_actual ?? 0);
  }

  get saldoAPagar(): number {
    return Math.max(Math.abs(Math.min(Number(this.cuentaDestino?.saldo_actual ?? 0), 0)), 0);
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
    this.pago.monto = Number(valor);
    this.validarErrores('monto');
  }

  validarErrores(campo?: 'cuentaOrigen' | 'monto'): boolean {
    const monto = Number(this.pago.monto);
    const errores = {
      cuentaOrigen: !this.pago.cuentaOrigen,
      monto: !Number.isFinite(monto) || monto <= 0,
      saldoInsuficiente:
        !!this.pago.cuentaOrigen && Number.isFinite(monto) && monto > this.saldoDisponible,
      excedeSaldoAPagar: Number.isFinite(monto) && monto > this.saldoAPagar,
    };

    if (campo) {
      this.erroresValidacion.update((actuales) => ({
        ...actuales,
        [campo]: errores[campo],
        saldoInsuficiente: errores.saldoInsuficiente,
        excedeSaldoAPagar: errores.excedeSaldoAPagar,
      }));
    } else {
      this.erroresValidacion.set(errores);
    }

    return Object.values(errores).some(Boolean);
  }

  pagar(): void {
    if (this.isLoading() || this.validarErrores() || !this.cuentaDestino) return;

    this.isLoading.set(true);

    const payload = {
      id_cuenta_origen: this.pago.cuentaOrigen,
      id_cuenta_destino: this.cuentaDestino.id,
      monto: Number(this.pago.monto),
      descripcion: `Pago de cuenta ${this.cuentaDestino.nombre}`,
      notas: '',
    };

    this.cuentasService
      .transferirSaldo(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message ?? 'Pago realizado correctamente.', 'success');
          this.closed.emit();
        },
        error: (err) => {
          this.toastService.show(err?.error?.message ?? 'No se pudo realizar el pago.', 'error');
        },
      });
  }

  private resetFormulario(): void {
    this.pago = {
      cuentaOrigen: '',
      monto: 0,
    };

    this.erroresValidacion.set({
      cuentaOrigen: false,
      monto: false,
      saldoInsuficiente: false,
      excedeSaldoAPagar: false,
    });
  }
}
