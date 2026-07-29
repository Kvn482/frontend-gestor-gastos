import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Modal } from '../../../shared/modal/modal';

@Component({
  selector: 'app-movimiento-detalle-modal',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, Modal],
  templateUrl: './movimiento-detalle-modal.html',
})
export class MovimientoDetalleModal {
  @Input() isOpen = false;
  @Input() movimiento: any | null = null;
  @Input() eliminandoMovimiento = false;
  @Input() cuentaFallback: any | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();

  get esIngreso(): boolean {
    return this.movimiento?.id_tipo_movimiento === 1;
  }

  get nombreCuenta(): string {
    return this.movimiento?.cuenta || this.cuentaFallback?.nombre || 'Sin cuenta';
  }

  get tipoCuenta(): string {
    return this.movimiento?.tipo_cuenta || this.cuentaFallback?.tipo || '';
  }
}
