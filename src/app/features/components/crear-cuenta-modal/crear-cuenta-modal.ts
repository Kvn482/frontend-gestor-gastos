import { Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/modal/modal';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { CuentasService } from '../../../core/services/cuentas.service';
import { finalize } from 'rxjs';

interface CuentaFormulario {
  nombre: string;
  tipo: 'DEBITO' | 'EFECTIVO' | 'CREDITO' | 'INVERSION';
  saldo_inicial: number;
  color: string;
  limite_credito: number | null;
  dia_corte: number | null;
  dia_limite_pago: number | null;
}

@Component({
  selector: 'app-crear-cuenta-modal',
  imports: [Modal, FormsModule, CommonModule],
  templateUrl: './crear-cuenta-modal.html',
  styleUrl: './crear-cuenta-modal.css',
})
export class CrearCuentaModal implements OnChanges {
  @Input() isOpen: boolean = false;
  @Output() closed = new EventEmitter<void>();

  constructor(
    private toastService: ToastService,
    private cuentasService: CuentasService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetFormulario();
    }
  }

  // Objeto principal vinculado al ngModel
  cuenta: CuentaFormulario = {
    nombre: '',
    tipo: 'DEBITO',
    saldo_inicial: 0,
    color: '#a855f7', // Morado Monetra por defecto
    limite_credito: null,
    dia_corte: null,
    dia_limite_pago: null
  };

  // Signal para los errores (ajusta según lo que uses en tu proyecto)
  erroresValidacion = signal({
    nombre: false,
    limiteCredito: false,
    diaCorte: false,
    diaLimitePago: false
  });

  coloresDisponibles: string[] = [
    '#a855f7', '#3b82f6', '#22c55e', '#eab308',
    '#ef4444', '#f97316', '#06b6d4', '#ec4899'
  ];

  private resetFormulario() {
    // Reiniciamos el objeto directamente
    this.cuenta = {
      nombre: '',
      tipo: 'DEBITO',
      saldo_inicial: 0,
      color: '#a855f7', // Morado Monetra por defecto
      limite_credito: null,
      dia_corte: null,
      dia_limite_pago: null
    };

    // Reiniciamos los errores visuales
    this.erroresValidacion.set({
      nombre: false,
      limiteCredito: false,
      diaCorte: false,
      diaLimitePago: false
    });
  }

  validarErrores(campo: string) {
    const errores = this.obtenerErroresFormulario();

    this.erroresValidacion.update(prev => ({
      ...prev,
      ...(campo === 'nombre' ? { nombre: errores.nombre } : {}),
      ...(campo === 'limiteCredito' ? { limiteCredito: errores.limiteCredito } : {}),
      ...(campo === 'diaCorte' ? { diaCorte: errores.diaCorte } : {}),
      ...(campo === 'diaLimitePago' ? { diaLimitePago: errores.diaLimitePago } : {})
    }));
  }

  onTipoCuentaChange() {
    if (this.cuenta.tipo === 'CREDITO') {
      this.cuenta.saldo_inicial = 0;
    } else {
      this.cuenta.limite_credito = null;
      this.cuenta.dia_corte = null;
      this.cuenta.dia_limite_pago = null;
    }

    this.erroresValidacion.update(prev => ({
      ...prev,
      limiteCredito: false,
      diaCorte: false,
      diaLimitePago: false
    }));
  }

  private obtenerErroresFormulario() {
    const esCredito = this.cuenta.tipo === 'CREDITO';
    const limiteCredito = Number(this.cuenta.limite_credito ?? 0);
    const diaCorte = Number(this.cuenta.dia_corte);
    const diaLimitePago = Number(this.cuenta.dia_limite_pago);

    return {
      nombre: this.cuenta.nombre.trim().length === 0,
      limiteCredito: esCredito && (!Number.isFinite(limiteCredito) || limiteCredito < 0),
      diaCorte: esCredito && (!Number.isInteger(diaCorte) || diaCorte < 1 || diaCorte > 31),
      diaLimitePago: esCredito && (!Number.isInteger(diaLimitePago) || diaLimitePago < 1 || diaLimitePago > 31)
    };
  }

  private validarFormulario(): boolean {
    const errores = this.obtenerErroresFormulario();
    this.erroresValidacion.set(errores);

    return Object.values(errores).some(Boolean);
  }

  isloading = signal(false);

  crearCuenta() {

    if (this.isloading()) return;

    this.isloading.set(true);

    const tieneErrores = this.validarFormulario();
    if (tieneErrores) this.isloading.set(false);

    if (!tieneErrores) {
      const saldoInicial = Number(this.cuenta.saldo_inicial);
      const cuentaPayload = {
        nombre: this.cuenta.nombre,
        tipo: this.cuenta.tipo,
        color: this.cuenta.color,
        saldo_inicial: Math.abs(saldoInicial),
        id_tipo_movimiento: saldoInicial < 0 ? 2 : 1,
        limite_credito: this.cuenta.tipo === 'CREDITO' ? Number(this.cuenta.limite_credito ?? 0) : null,
        dia_corte: this.cuenta.tipo === 'CREDITO' ? Number(this.cuenta.dia_corte) : null,
        dia_limite_pago: this.cuenta.tipo === 'CREDITO' ? Number(this.cuenta.dia_limite_pago) : null
      };

      this.cuentasService.crearCuenta(cuentaPayload)
        .pipe(
          finalize(() => {
            this.isloading.set(false);
          })
        ).subscribe({
          next: (res: any) => {

            this.toastService.show(res.message, 'success');
            this.closed.emit();

          },
          error: (err) => {
            this.toastService.show(err.error.message, 'error');
          }
        });

    } else {
      console.log('Faltan campos por llenar');
    }
  }
}
